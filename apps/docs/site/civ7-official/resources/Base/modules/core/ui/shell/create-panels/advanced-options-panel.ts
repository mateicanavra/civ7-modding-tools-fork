/**
 * @file advanced-options-panel.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Displays advanced game options and player setup
 */

import { DropdownItem, DropdownSelectionChangeEvent, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { type CivData, GetCivilizationData } from '/core/ui/shell/create-panels/age-civ-select-model.js';
import { CreateGameModel } from '/core/ui/shell/create-panels/create-game-model.js';
import { GameCreationPanelBase } from '/core/ui/shell/create-panels/game-creation-panel-base.js';
import { getLeaderData, LeaderData } from '/core/ui/shell/create-panels/leader-select-model.js';
import LeaderSelectModelManager from '/core/ui/shell/leader-select/leader-select-model-manager.js';
import { IconDropdown, IconDropdownItem } from '/core/ui/shell/shell-components/icon-dropdown.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

const strPlayerLeader = GameSetup.makeString("PlayerLeader");
const strPlayerCivilization = GameSetup.makeString("PlayerCivilization");
const strAge = GameSetup.makeString("Age");
const strMapSize = GameSetup.makeString("MapSize");
const strCategory = GameSetup.makeString('Category');


let cachedDatabaseChanges: number = -1;
let cachedCivData: CivData[] = [];
let cachedLeaderData: LeaderData[] = [];
const civilizationTooltips = new Map<string, string>();
const leaderTooltips = new Map<string, string>();

const booleanSelectorActionsList: DropdownItem[] = [{ label: "LOC_UI_DISABLED" }, { label: "LOC_UI_ENABLED" }];

const cachedHiddenContainerIDS = new Set<string>;

// A quick note on the database cache for civ data and leader data.
// The underlying methods this is calling is doing way too much work yet at the same time is not comprehensive to handle all setup situations.
// The cache should ideally only depend on database changes and should be fast lookup storage of the civ and leader data.
// The actual `CivData`/`LeaderData` structures and tooltips should be generated on an as-needed basis using both their type string and origin domain.
function checkDatabaseCache() {
	const changes = Database.changes('config');
	if (changes != cachedDatabaseChanges) {
		cachedCivData = GetCivilizationData();
		cachedLeaderData = getLeaderData();
		civilizationTooltips.clear();
		leaderTooltips.clear();

		cachedDatabaseChanges = changes;
	}
}

function getCachedCivData(): CivData[] {
	checkDatabaseCache();
	return cachedCivData;
}

function getCachedLeaderData(): LeaderData[] {
	checkDatabaseCache();
	return cachedLeaderData;
}

function GetCivilizationTooltip(civType: string) {
	checkDatabaseCache();
	let tooltip = civilizationTooltips.get(civType);
	if (tooltip == null) {
		const civilization = cachedCivData.find(d => d.civID == civType);
		if (civilization) {
			const useExperimentalStyle = false;
			if (!useExperimentalStyle) {
				// This older, more verbose format would cause overlaps when larger font sizes were used.
				// This also is just a giant wall of text.  Switching to a reduced version.
				tooltip = `[STYLE:text-secondary][STYLE:font-title-lg]${Locale.compose(civilization.name)}[/S][/S][N]
				${civilization.tags ? `[N][B]${Locale.compose(civilization.tags.join(", "))}[/B]` : ""}
				${civilization.abilityText ? `[N]${Locale.compose(civilization.abilityText)}` : ""}
				${civilization.bonuses ? `[N][STYLE:text-secondary][STYLE:font-title-base]${Locale.compose("LOC_CREATE_CIV_UNIQUE_BONUSES_SUBTITLE")}[/S][/S]
					[N]${civilization.bonuses.map((bonus) => `[B]${Locale.compose(bonus.title)}[/B] ${Locale.compose(bonus.description)}`).join("[N]")}` : ""}`;
			}
			else {
				tooltip = `[STYLE:text-secondary][STYLE:font-title-lg]${Locale.compose(civilization.name)}[/S][/S][N]
				${civilization.tags ? `[N][B]${Locale.compose(civilization.tags.join(", "))}[/B]` : ""}
				${civilization.abilityText ? `[N]${Locale.compose(civilization.abilityText)}` : ""}
				${civilization.bonuses ? `[N][STYLE:text-secondary][STYLE:font-title-base]${Locale.compose("LOC_CREATE_CIV_UNIQUE_BONUSES_SUBTITLE")}[/S][/S]
					[BLIST]${civilization.bonuses.map((bonus) => `[LI] ${bonus.title}`).join("")}[/BLIST]` : ""}`;
			}

			civilizationTooltips.set(civilization.civID, tooltip);
		}
	}

	return tooltip;
}

function GetLeaderTooltip(leaderType: string) {
	checkDatabaseCache();
	let tooltip = leaderTooltips.get(leaderType);
	if (tooltip == null) {
		const leader = cachedLeaderData.find(l => l.leaderID == leaderType);
		if (leader) {
			const tooltip = `[STYLE:text-secondary][STYLE:font-title-lg]${Locale.compose(leader.name)}[/S][/S]
				${leader.tags ? `[N]${leader.tags.map(tag => `[B]${Locale.compose(tag)}[/B]`).join(', ')}` : ""}
				${leader.abilityText ? `[N]${Locale.compose(leader.abilityText)}` : ""}`;

			leaderTooltips.set(leader.leaderID, tooltip);
		}
	}

	return tooltip;
}

function createSettingsHeader(name: string) {
	const settingsHeader = document.createElement("div");
	settingsHeader.classList.add("my-1", "h-12", "flex", "relative");

	const settingsBGContainer = document.createElement("div");
	settingsBGContainer.classList.add("absolute", "size-full", "flex", "group-focus\\:opacity-0", "group-hover\\:opacity-0");
	settingsHeader.appendChild(settingsBGContainer);

	const settingsBGLeft = document.createElement("div");
	settingsBGLeft.classList.add("advanced-options__dropdown-bg", "flex-auto", "-ml-1");
	settingsBGContainer.appendChild(settingsBGLeft);

	const settingsBGRight = document.createElement("div");
	settingsBGRight.classList.add("advanced-options__dropdown-bg", "flex-auto", "-mr-1", "-scale-x-100");
	settingsBGContainer.appendChild(settingsBGRight);

	const settingsBGHighlightContainer = document.createElement("div");
	settingsBGHighlightContainer.classList.add("absolute", "size-full", "flex", "opacity-0", "group-focus\\:opacity-100", "group-hover\\:opacity-100");
	settingsHeader.appendChild(settingsBGHighlightContainer);

	const settingsBGHighlightLeft = document.createElement("div");
	settingsBGHighlightLeft.classList.add("advanced-options__dropdown-bg-highlight", "flex-auto", "-ml-1");
	settingsBGHighlightContainer.appendChild(settingsBGHighlightLeft);

	const settingsBGHighlightRight = document.createElement("div");
	settingsBGHighlightRight.classList.add("advanced-options__dropdown-bg-highlight", "flex-auto", "-mr-1", "-scale-x-100");
	settingsBGHighlightContainer.appendChild(settingsBGHighlightRight);

	const settingsHeaderContent = document.createElement("div");
	settingsHeaderContent.classList.add("advanced-options__settings-header-content", "flex", "items-center", "justify-center", "size-full", "relative");
	settingsHeader.appendChild(settingsHeaderContent);

	const settingsHeaderLeftDecor = document.createElement("div");
	settingsHeaderLeftDecor.classList.add("advanced-options__header-decor", "w-5", "h-7", "rotate-90");
	settingsHeaderContent.appendChild(settingsHeaderLeftDecor);

	const settingsHeaderText = document.createElement("div");
	settingsHeaderText.setAttribute("data-l10n-id", name ?? '');
	settingsHeaderText.classList.add("font-title", "my-1", "uppercase", "mx-4", "tracking-150");
	settingsHeaderContent.appendChild(settingsHeaderText);

	const settingsHeaderRightDecor = document.createElement("div");
	settingsHeaderRightDecor.classList.add("advanced-options__header-decor", "w-5", "h-7", "-rotate-90");
	settingsHeaderContent.appendChild(settingsHeaderRightDecor);

	return settingsHeader;
}

function createSettingsDropDown(name: string, dropDownContent: HTMLElement, id: string) {
	const headerActivatable = document.createElement("fxs-activatable");
	headerActivatable.setAttribute("tabindex", "-1");
	headerActivatable.id = `${id}-header`;
	dropDownContent.id = `${id}-container`;
	headerActivatable.classList.add("advanced-options__group-option-header", "group");
	const settingsHeader = createSettingsHeader(name);

	const settingsHeaderArrow = document.createElement("div");
	settingsHeaderArrow.classList.add("img-arrow", "h-10", "w-16", "absolute", "right-1");
	if (cachedHiddenContainerIDS.has(dropDownContent.id)) {
		settingsHeaderArrow.classList.add("-rotate-90");
	}
	else {
		settingsHeaderArrow.classList.add("rotate-90");
	}
	MustGetElement(".advanced-options__settings-header-content", settingsHeader).appendChild(settingsHeaderArrow);

	dropDownContent.classList.add("overflow-hidden", 'ease-out', "advanced-options__group-option-container");

	const resizeObserver = new ResizeObserver((_entries: ResizeObserverEntry[]) => {
		onInitialHeightSet(dropDownContent, dropDownContent.clientHeight, resizeObserver);
		if (cachedHiddenContainerIDS.has(dropDownContent.id)) {
			collapseOptionsSection(dropDownContent, settingsHeaderArrow);
		}
		waitForLayout(() => {
			dropDownContent.classList.add("transition-height");
			settingsHeaderArrow.classList.add("transition-transform");
		});
	});

	resizeObserver.observe(dropDownContent);

	headerActivatable.addEventListener("action-activate", () => {
		collapseOptionsSection(dropDownContent, settingsHeaderArrow);
	});

	headerActivatable.appendChild(settingsHeader);

	return headerActivatable;
}

function onInitialHeightSet(dropdownContent: HTMLElement, height: number, observer: ResizeObserver) {
	dropdownContent.attributeStyleMap.set('height', CSS.px(height));
	dropdownContent.setAttribute("original-height", height.toString());
	observer.unobserve(dropdownContent);
}

function collapseOptionsSection(container: HTMLElement, collapsibleArrow: HTMLElement) {
	const curHeight: number = container.clientHeight;
	const originalHeight: number = Number(container.getAttribute("original-height"));
	if (curHeight == originalHeight) {
		container.attributeStyleMap.set('height', CSS.px(0));
		Audio.playSound("data-audio-dropdown-close", "audio-base");

		const optionRows: NodeListOf<HTMLElement> = container.querySelectorAll<HTMLElement>(".advanced-options-setting-row");
		for (const row of optionRows) {
			row.removeAttribute("tabindex");
		}

		const optionElements: NodeListOf<HTMLElement> = container.querySelectorAll<HTMLElement>(".advanced-options__option");
		for (const element of optionElements) {
			element.removeAttribute("tabindex");
		}
		container.setAttribute("hidden-toggled", "true");
		cachedHiddenContainerIDS.add(container.id);
		collapsibleArrow.classList.remove("rotate-90");
		collapsibleArrow.classList.add("-rotate-90");
	}
	else {
		container.attributeStyleMap.set('height', CSS.px(originalHeight));
		Audio.playSound("data-audio-dropdown-open", "audio-base");

		const optionRows: NodeListOf<HTMLElement> = container.querySelectorAll<HTMLElement>(".advanced-options-setting-row");
		for (const row of optionRows) {
			row.setAttribute("tabindex", "-1");
		}

		const optionElements: NodeListOf<HTMLElement> = container.querySelectorAll<HTMLElement>(".advanced-options__option");
		for (const element of optionElements) {
			element.setAttribute("tabindex", "-1");
		}
		container.setAttribute("hidden-toggled", "false");
		cachedHiddenContainerIDS.delete(container.id);
		collapsibleArrow.classList.remove("-rotate-90");
		collapsibleArrow.classList.add("rotate-90");
	}

}

abstract class OptionsBase {

	abstract create(_setupParam: GameSetupParameter): HTMLElement;

	getParameterValueName(setupParam: GameSetupParameter) {

		if (setupParam.value == null || setupParam.value.value == null) {
			return '<null>';
		}
		else {
			return (setupParam.value.name
				? GameSetup.resolveString(setupParam.value.name)
				: setupParam.value.value.toString()
			) as string;
		}
	}

	setParameterCommonInfo(setupParam: GameSetupParameter, paramEle: HTMLElement, defaultValue: GameSetupDomainValue | null) {
		const description = GameSetup.resolveString(setupParam.description);
		let tooltip: string = "";

		if (description) {
			tooltip = Locale.compose(description);
		}

		if (defaultValue) {
			const defName = GameSetup.resolveString(defaultValue.name);
			const defDescription = GameSetup.resolveString(defaultValue.description);

			if (defName) {
				tooltip = tooltip + "[N]" + Locale.compose(defName);
			}
			if (defDescription) {
				tooltip = tooltip + "[N]" + Locale.compose(defDescription);
			}
		}

		paramEle.setAttribute('data-tooltip-content', tooltip);

		const parameterID = GameSetup.resolveString(setupParam.ID);
		if (parameterID) {
			paramEle.setAttribute('data-parameter-id', parameterID);
		}

		paramEle.classList.add("w-96");
	}

	abstract processChange(setupParam: GameSetupParameter, change: GameSetupParameterChange): void;
}

class BooleanOption extends OptionsBase {

	private component: HTMLElement | null = null;
	create(setupParam: GameSetupParameter) {

		const optionEle = document.createElement('fxs-selector');
		const parameterID = GameSetup.resolveString(setupParam.ID)!;

		optionEle.classList.add("advanced-options__option", "font-body-base", "w-96", "mr-4");
		optionEle.setAttribute('dropdown-items', JSON.stringify(booleanSelectorActionsList));
		optionEle.setAttribute("selected-item-index", (this.castToBoolean(setupParam.value.value) ? 1 : 0).toString());

		optionEle.addEventListener(DropdownSelectionChangeEventName, (event: DropdownSelectionChangeEvent) => {
			const p = UI.beginProfiling('Boolean-Component-ValueChanged');
			const newValue = event.detail.selectedIndex;
			const booleanValue = (newValue) ? true : false;
			GameSetup.setGameParameterValue(parameterID, booleanValue);
			UI.endProfiling(p);
		});

		this.setParameterCommonInfo(setupParam, optionEle, null);
		this.component = optionEle;
		return optionEle;
	}

	processChange(setupParam: GameSetupParameter, change: GameSetupParameterChange) {

		if (change.readOnlyStatusChanged) {
			if (setupParam.readOnly) {
				this.component?.setAttribute('disabled', 'true');
			}
			else {
				this.component?.removeAttribute('disabled');
			}
		}
		if (change.valueChanged) {
			const index = this.castToBoolean(setupParam.value.value) ? 1 : 0;
			this.component?.setAttribute('selected-item-index', index.toString());
		}
	}

	private castToBoolean(value: GameSetupParameterValue) {
		const t = typeof (value);
		switch (t) {
			case 'boolean':
				return value;

			case 'number':
				return value != 0;

			// TODO - Handle string [tTfF]?
			default:
				return false;
		}
	}
}

class LabelOption extends OptionsBase {

	private root: HTMLElement | null = null;

	create(setupParam: GameSetupParameter) {
		const optionEle = document.createElement('div');

		optionEle.classList.add("font-body-base", "flex", "justify-center", "items-center");
		optionEle.setAttribute('data-l10n-id', this.getParameterValueName(setupParam));

		const name = GameSetup.resolveString(setupParam.name);
		const description = GameSetup.resolveString(setupParam.description);
		let tooltip: string = "";
		if (name) {
			tooltip = Locale.compose(name);
		}
		if (description) {
			tooltip = tooltip + "[N]" + Locale.compose(description);
		}
		optionEle.setAttribute('data-tooltip-content', tooltip);
		this.setParameterCommonInfo(setupParam, optionEle, null);
		this.root = optionEle;
		return optionEle;
	}

	processChange(setupParam: GameSetupParameter, change: GameSetupParameterChange) {
		if (change.valueChanged) {
			this.root?.setAttribute('value', this.getParameterValueName(setupParam));
		}
	}
}

class NumericOption extends OptionsBase {
	private root: HTMLElement | null = null;

	create(setupParam: GameSetupParameter) {
		const optionEle = document.createElement('fxs-textbox');
		const parameterID = GameSetup.resolveString(setupParam.ID)!;

		optionEle.classList.add("advanced-options__option", "font-body-base", "max-w-96", "mr-4");
		optionEle.setAttribute('value', this.getParameterValueName(setupParam));
		optionEle.addEventListener("component-value-changed", (event: CustomEvent) => {
			const p = UI.beginProfiling('NumericOption-Component-ValueChanged');
			const newValue = event.detail.value.toString();
			if (newValue) {
				const numericValue = Number.parseInt(newValue);
				if (numericValue) {
					GameSetup.setGameParameterValue(parameterID, numericValue);
				}
			}
			UI.endProfiling(p);
		});

		this.setParameterCommonInfo(setupParam, optionEle, null);
		this.root = optionEle;
		return optionEle;
	}

	processChange(setupParam: GameSetupParameter, change: GameSetupParameterChange) {
		if (change.readOnlyStatusChanged) {
			if (setupParam.readOnly) {
				this.root?.setAttribute('disabled', 'true');
			}
			else {
				this.root?.removeAttribute('disabled');
			}
		}

		if (change.valueChanged) {
			this.root?.setAttribute('value', this.getParameterValueName(setupParam));
		}
	}
}

class SelectorOption extends OptionsBase {

	private root: HTMLElement | null = null;

	create(setupParam: GameSetupParameter) {
		const selector = document.createElement('fxs-selector');
		const paramName = GameSetup.resolveString(setupParam.name);

		selector.classList.add("advanced-options__option", "text-base", "mr-4");
		selector.setAttribute('label', paramName ?? "");
		selector.setAttribute("enable-shell-nav", "false");
		selector.setAttribute("direct-edit", "true");

		const shouldDisable = setupParam.readOnly || setupParam.domain.possibleValues?.length == 1;
		if (shouldDisable) {
			selector.setAttribute('disabled', 'true');
		}
		else {
			selector.removeAttribute('disabled');
		}

		selector.addEventListener(DropdownSelectionChangeEventName, (event: DropdownSelectionChangeEvent) => {
			const p = UI.beginProfiling('SelectOption-DropdownSelectionChanged');
			const targetElement = event.target as HTMLElement;
			const parameterID = targetElement.getAttribute('data-parameter-id');
			if (parameterID) {
				const index = event.detail.selectedIndex;
				const parameter = GameSetup.findGameParameter(parameterID);
				if (parameter && parameter.domain.possibleValues && parameter.domain.possibleValues.length > index) {
					const value = parameter.domain.possibleValues[index];
					GameSetup.setGameParameterValue(parameterID, value.value);
					this.setParameterCommonInfo(setupParam, selector, value);
				}
			}
			UI.endProfiling(p);
		});

		const actionsList: DropdownItem[] = [];
		if (setupParam.domain.possibleValues) {
			for (const [index, pv] of setupParam.domain.possibleValues.entries()) {
				const valueName = GameSetup.resolveString(pv.name);
				if (!valueName) {
					console.error(`game-setup.ts - Failed to resolve string for game option: ${pv.name}`);
					continue;
				}

				if (setupParam.value?.value == pv.value) {
					selector.setAttribute('selected-item-index', index.toString());
					this.setParameterCommonInfo(setupParam, selector, pv);
				}

				actionsList.push({ label: Locale.compose(valueName) });
			}
		}

		selector.setAttribute('dropdown-items', JSON.stringify(actionsList));
		this.root = selector;
		return selector;
	}

	processChange(setupParam: GameSetupParameter, change: GameSetupParameterChange) {
		if (change.readOnlyStatusChanged) {
			const shouldDisable = setupParam.readOnly || setupParam.domain.possibleValues?.length == 1;
			if (shouldDisable) {
				this.root?.setAttribute('disabled', 'true');
			}
			else {
				this.root?.removeAttribute('disabled');
			}
		}

		if (change.possibleValuesChanged) {
			if (this.root && setupParam.domain.possibleValues) {
				const actionsList: DropdownItem[] = [];
				for (const [index, pv] of setupParam.domain.possibleValues.entries()) {
					const valueName = GameSetup.resolveString(pv.name);
					if (!valueName) {
						console.error(`game-setup.ts - Failed to resolve string for game option: ${pv.name}`);
						continue;
					}

					if (setupParam.value?.value == pv.value) {
						this.root.setAttribute('selected-item-index', index.toString());
						this.setParameterCommonInfo(setupParam, this.root, pv);
					}

					actionsList.push({ label: Locale.compose(valueName) });
				}

				const shouldDisable = setupParam.readOnly || setupParam.domain.possibleValues?.length == 1;
				if (shouldDisable) {
					this.root?.setAttribute('disabled', 'true');
				}
				else {
					this.root?.removeAttribute('disabled');
				}

				this.root.setAttribute('dropdown-items', JSON.stringify(actionsList));
			}
		}
		else if (change.valueChanged) {
			if (this.root && setupParam.domain.possibleValues) {
				for (const [index, pv] of setupParam.domain.possibleValues.entries()) {

					if (setupParam.value?.value == pv.value) {
						this.setParameterCommonInfo(setupParam, this.root, pv);
						this.root.setAttribute('selected-item-index', index.toString());
						break;
					}
				}
			}
		}
	}
}

class MultiSelectorOption extends OptionsBase {

	private root: HTMLElement | null = null;
	private possibleValueElements = new Map<GameSetupParameterValue, HTMLElement[]>();
	private strInvertSelection = GameSetup.makeString('InvertSelection');

	create(setupParam: GameSetupParameter) {

		const optionEle = document.createElement('div');
		this.root = optionEle;

		optionEle.classList.add('flex', "font-body-base", "flex-col", "flex-auto");

		if (!setupParam.domain.possibleValues) {
			console.warn(`advanced-options-panel: createMultiSelectorOption - setupParam ${setupParam.ID} had no possible values. Is this intentional?`);
			return optionEle;
		}
		this.rebuildPossibleValues(optionEle, setupParam);

		return optionEle;
	}

	processChange(setupParam: GameSetupParameter, change: GameSetupParameterChange) {

		if (change.readOnlyStatusChanged) {
			const readOnly = setupParam.readOnly;

			if (readOnly) {
				for (const [_value, els] of this.possibleValueElements) {
					for (const el of els) {
						el.setAttribute("disabled", "true");
					}
				}
			}
			else {
				for (const [_value, els] of this.possibleValueElements) {
					for (const el of els) {
						el.removeAttribute("disabled");
					}
				}
			}
		}

		if (change.possibleValuesChanged) {

			// Rebuild all elements.
			if (this.root) {
				this.root.innerHTML = '';
				this.possibleValueElements.clear();
				this.rebuildPossibleValues(this.root, setupParam);
			}

		}
		else if (change.valueChanged) {

			const invertSelection = setupParam.uxHint == this.strInvertSelection;

			for (const [value, els] of this.possibleValueElements) {
				let hasValue = setupParam.values.some(pv => pv.value == value);
				if (invertSelection) {
					hasValue = !hasValue;
				}

				for (const el of els) {
					el.setAttribute("selected-item-index", (hasValue ? 1 : 0).toString());
				}
			}
		}
	}

	onPossibleValueToggled(event: DropdownSelectionChangeEvent, context: { parameterID: GameSetupStringHandle, PlayerID?: PlayerId, TeamID?: TeamId }, pv: GameSetupDomainValue) {
		let newValue = event.detail.selectedIndex;

		const parameter = this.findParameter(context.parameterID, context.PlayerID, context.TeamID);
		if (parameter) {
			const index = parameter.values?.findIndex(v => v.value == pv.value);
			if (newValue == 0) {
				if (index == -1) {
					const newValues = parameter.values.concat(pv).map(v => v.value as string);
					GameSetup.setGameParameterValue(parameter.ID, newValues);
				}
			}
			else {
				if (index != -1) {
					const valuesArray = parameter.values.map(v => v);
					valuesArray.splice(index, 1);
					const newValues = valuesArray.map(v => v.value as string);
					GameSetup.setGameParameterValue(parameter.ID, newValues);
				}
			}
		}
	}

	private findParameter(parameterID: GameSetupStringHandle, playerId?: PlayerId, teamId?: TeamId) {
		if (teamId != null) {
			return GameSetup.findTeamParameter(teamId, parameterID);
		}
		else if (playerId != null) {
			return GameSetup.findPlayerParameter(playerId, parameterID);
		}
		else {
			return GameSetup.findGameParameter(parameterID);
		}
	}

	private rebuildPossibleValues(root: HTMLElement, setupParam: GameSetupParameter) {
		this.possibleValueElements.clear();

		const invertSelection = setupParam.uxHint == this.strInvertSelection;

		// TODO - Rename this to 'Description' or something to be more general purpose.
		const strLegacyClassType = GameSetup.makeString('LegacyPathClassType');

		const readOnly = setupParam.readOnly;

		if (setupParam.domain.possibleValues) {
			const categoryParamMap: Map<string, GameSetupDomainValue[]> = new Map<string, GameSetupDomainValue[]>();
			for (const pv of setupParam.domain.possibleValues) {
				const additionalPropsValue = pv.additionalProperties?.find(ap => ap.name == strCategory)?.value;
				const category: string = (typeof additionalPropsValue === 'string') ? additionalPropsValue : '';
				if (!categoryParamMap.get(category)) {
					categoryParamMap.set(category, [pv]);
				}
				else {
					categoryParamMap.get(category)!.push(pv);
				}
			}

			const parameterContext = {
				parameterID: setupParam.ID,
				playerID: setupParam.playerID,
				teamID: setupParam.teamID
			}

			let pvIndex = 0;
			for (const [key, value] of categoryParamMap) {

				const pvContainer = document.createElement("div");
				const pvHeader = createSettingsDropDown(key, pvContainer, key);

				root.appendChild(pvHeader);
				root.appendChild(pvContainer);

				for (const pv of value) {
					const pvRow = document.createElement('fxs-hslot');
					const pvLabelContainer = document.createElement("div");
					const pvLabel = document.createElement('div');
					const pvName = Locale.compose(GameSetup.resolveString(pv.name) ?? '');
					const pvDesc = Locale.compose(GameSetup.resolveString(pv.description) ?? '');
					const pvControl = document.createElement('fxs-selector');

					pvRow.id = `${setupParam.ID}-${pv.name}`;
					pvRow.classList.add("advanced-options-setting-row", "items-center", "justify-between", (pvContainer.children.length % 2 == 0 ? "bg-primary-5" : "bg-primary-4"));

					pvLabelContainer.classList.add("flex", "items-center", "ml-4");

					pvControl.setAttribute('data-tooltip-content', Locale.stylize(`[B]${pvName}[/B][N]${pvDesc}`));
					pvControl.classList.add("advanced-options__option", "mr-4", "w-96");
					pvControl.setAttribute('dropdown-items', JSON.stringify(booleanSelectorActionsList));

					const legacyClassName: string | undefined = pv.additionalProperties?.find(ap => ap.name == strLegacyClassType)?.value?.toString();
					if (legacyClassName) {
						const pvIcon = document.createElement("fxs-icon");
						pvIcon.classList.add("size-10", "mr-2");
						pvIcon.setAttribute("data-icon-context", "DEFAULT");
						pvIcon.setAttribute("data-icon-id", legacyClassName);
						pvLabelContainer.appendChild(pvIcon);
					}

					pvLabel.setAttribute('data-l10n-id', pvName);
					pvLabel.setAttribute('data-tooltip-content', Locale.stylize(`[B]${pvName}[/B][N]${pvDesc}`));
					pvLabelContainer.appendChild(pvLabel);

					pvRow.appendChild(pvLabelContainer);
					pvRow.appendChild(pvControl);
					pvContainer.appendChild(pvRow);

					let hasValue = setupParam.values.some(v => v.value == pv.value);
					if (invertSelection) {
						hasValue = !hasValue;
					}

					pvControl.setAttribute("selected-item-index", (hasValue ? 1 : 0).toString());

					if (readOnly) {
						pvControl.setAttribute("disabled", "true");
					}

					let els = this.possibleValueElements.get(pv.value);
					if (els == null) {
						els = [];
						this.possibleValueElements.set(pv.value, els);
					}
					els.push(pvControl);

					pvControl.addEventListener(DropdownSelectionChangeEventName, (event: DropdownSelectionChangeEvent) => {
						this.onPossibleValueToggled(event, parameterContext, pv);
					});
					pvIndex++;
				}
			}
		}
	}
}

class PlayerLeaderOrCivOption extends OptionsBase {
	private playerID?: PlayerId;
	private parameterID: GameSetupStringHandle = GAMESETUP_INVALID_STRING;
	private possibleValues: (IconDropdownItem & { id: string })[] = [];
	private root: ComponentRoot<IconDropdown> | null = null;

	create(setupParam: GameSetupParameter) {
		this.parameterID = setupParam.ID;
		this.playerID = setupParam.playerID;
		this.rebuildPossibleValues(setupParam);

		const component = document.createElement("icon-dropdown");
		component.classList.add("advanced-options__player-select", "mx-2", "w-1\\/2");
		component.setAttribute("show-label-on-selected-item", "true");
		component.setAttribute("show-icon-on-list-item", "true");
		component.whenComponentCreated((dropdown) => dropdown.updateDropdownItems(this.possibleValues));
		component.setAttribute("selected-item-index", this.possibleValues.findIndex(l => l.id == setupParam.value.value).toString());
		component.addEventListener("dropdown-selection-change", (event) => {
			this.handleSelection(event);
		});

		this.root = component;
		return component;
	}

	processChange(setupParam: GameSetupParameter, change: GameSetupParameterChange): void {
		if (change.readOnlyStatusChanged) {
			const shouldDisable = setupParam.readOnly || setupParam.domain.possibleValues?.length == 1;
			if (shouldDisable) {
				this.root?.setAttribute('disabled', 'true');
			}
			else {
				this.root?.removeAttribute('disabled');
			}
		}

		if (change.possibleValuesChanged) {
			this.rebuildPossibleValues(setupParam);
			this.root?.whenComponentCreated((dropdown) => {
				dropdown.updateDropdownItems(this.possibleValues);
				let selectedIndex = this.possibleValues.findIndex(l => l.id == setupParam.value.value);
				if (selectedIndex == -1) {
					console.error(`Selected Value - ${setupParam.value.value} not found in list of possible values for parameter - ${GameSetup.resolveString(setupParam.ID)}.`);
					selectedIndex = 0;
				}
				dropdown.Root.setAttribute("selected-item-index", selectedIndex.toString());
			});
		}
		else if (change.valueChanged) {
			let selectedIndex = this.possibleValues.findIndex(l => l.id == setupParam.value.value);
			if (selectedIndex == -1) {
				console.error(`Selected Value - ${setupParam.value.value} not found in list of possible values for parameter - ${GameSetup.resolveString(setupParam.ID)}.`);
				selectedIndex = 0;
			}
			this.root?.setAttribute("selected-item-index", selectedIndex.toString());
		}
	}

	private handleSelection(event: DropdownSelectionChangeEvent) {
		const pv = this.possibleValues[event.detail.selectedIndex];
		if (this.playerID != null && pv) {
			GameSetup.setPlayerParameterValue(this.playerID, this.parameterID, pv.id);
		}
	}

	private rebuildPossibleValues(setupParam: GameSetupParameter) {
		this.possibleValues = [];
		if (setupParam.domain.possibleValues) {
			for (const pv of setupParam.domain.possibleValues) {


				let iconURL = '';
				if (pv.icon != GAMESETUP_INVALID_STRING) {
					let icon = GameSetup.resolveString(pv.icon);
					if (icon) {
						iconURL = UI.getIconURL(icon);
					}
				}

				if (!iconURL) {
					iconURL = UI.getIconURL(pv.value as string);
				}

				// KLUDGE - Workaround the fact that the `icon` field in Civilizations did not initially have icon entries but rather image urls.
				if (!iconURL && setupParam.ID == strPlayerCivilization && pv.icon != GAMESETUP_INVALID_STRING) {
					let s = GameSetup.resolveString(pv.icon);
					if (s) {
						iconURL = s;
					}
				}

				let tooltip = '';
				if (setupParam.ID == strPlayerCivilization) {
					tooltip = GetCivilizationTooltip(pv.value as string) ?? '';
				}
				else if (setupParam.ID == strPlayerLeader) {
					tooltip = GetLeaderTooltip(pv.value as string) ?? '';
				}

				this.possibleValues.push({
					id: pv.value as string,
					label: GameSetup.resolveString(pv.name) ?? pv.value as string,
					iconURL: iconURL,
					tooltip: tooltip
				});
			}
		}
	}
}

class AdvancedOptionsParameter {
	private option: OptionsBase;
	private rootElement: HTMLElement;

	constructor(setupParameter: GameSetupParameter) {

		if (setupParameter.ID == strPlayerCivilization) {
			this.option = new PlayerLeaderOrCivOption();
			this.rootElement = this.option.create(setupParameter);
		}
		else if (setupParameter.ID == strPlayerLeader) {
			this.option = new PlayerLeaderOrCivOption();
			this.rootElement = this.option.create(setupParameter);
		}
		else {
			switch (setupParameter.domain.type) {
				case GameSetupDomainType.Select:
					this.option = setupParameter.array ? new MultiSelectorOption() : new SelectorOption();
					break;

				case GameSetupDomainType.Boolean:
					this.option = new BooleanOption();
					break;

				case GameSetupDomainType.Integer:
				case GameSetupDomainType.UnsignedInteger:
					this.option = new NumericOption();
					break;

				default:
					this.option = new LabelOption();
					break;
			}

			this.rootElement = this.option.create(setupParameter);
		}
	}

	render() {
		return this.rootElement;
	}

	processChange(change: GameSetupParameterChange) {
		let setupParameter: GameSetupParameter | null = null;
		if (change.teamID != null) {
			setupParameter = GameSetup.findTeamParameter(change.teamID, change.parameterID);
		}
		else if (change.playerID != null) {
			setupParameter = GameSetup.findPlayerParameter(change.playerID, change.parameterID);
		}
		else {
			setupParameter = GameSetup.findGameParameter(change.parameterID);
		}

		if (setupParameter) {
			if (change.detailsChanged ||
				change.hiddenStatusChanged ||
				change.invalidReasonChanged ||
				change.possibleValuesChanged ||
				change.readOnlyStatusChanged ||
				change.valueChanged) {
				this.option.processChange(setupParameter, change);
			}
		}
	}
}


/**
 * AdvancedOptionsPanel displays advanced game options and player setup.
 * 
 * @fires CreatePanelAcceptedEvent - When the start game button is pressed
 */
class AdvancedOptionsPanel extends GameCreationPanelBase {
	private gameSetupRevision: number = 0;

	private startGameListener = CreateGameModel.startGame.bind(this);
	private showSaveScreenListener = this.showSaveScreen.bind(this);
	private showLoadScreenListener = this.showLoadScreen.bind(this);
	private addPlayerListener = this.addPlayer.bind(this);

	private centerArea = document.createElement("fxs-frame");
	private playerConfigContainer = document.createElement("fxs-spatial-slot");

	private readonly setupSlotGroup = document.createElement('fxs-slot-group');
	private gameSetupPanel = document.createElement("fxs-vslot");
	private legacyPathSetupPanel = document.createElement("fxs-vslot");
	private playerSetupPanel = document.createElement("fxs-vslot");

	private legacyPathsDisabledWarning: HTMLElement = document.createElement("div");
	private LegacyPathsParameterID: GameSetupStringHandle;

	private currentSlotIndex = 0;
	private slotIDs = [
		"advanced-setup__game",
		"advanced-setup__legacy",
		"advanced-setup__player"
	];

	private activePanel = this.gameSetupPanel;

	private gameParamEles: HTMLElement[] = [];
	private gameOptionsHeaders: HTMLElement[] = [];

	private leaderOptions: (IconDropdownItem & { id: string })[] = [];
	private civilizationOptions: (IconDropdownItem & { id: string })[] = [];

	private groupContainers: Map<GameSetupStringHandle, HTMLElement> = new Map<GameSetupStringHandle, HTMLElement>();
	private groupNames: Map<string, string> = new Map();
	private groupNamesConfigChanges: number = -1;

	private activeGameParameters = new Map<GameSetupStringHandle, AdvancedOptionsParameter[]>();
	private activePlayerParameters = new Map<PlayerId, Map<GameSetupStringHandle, AdvancedOptionsParameter[]>>();

	constructor(root: ComponentRoot) {
		super(root);

		this.LegacyPathsParameterID = GameSetup.makeString('LegacyPaths');
	}

	onInitialize() {
		super.onInitialize();

		const fragment = document.createDocumentFragment();

		this.centerArea.setAttribute("override-styling", "advanced-options_frame flex-auto relative pt-14 px-10 pb-4");
		this.centerArea.setAttribute("content-class", "mx-4");
		this.centerArea.setAttribute("outside-safezone-mode", "vertical");
		fragment.appendChild(this.centerArea);

		const header = document.createElement("fxs-header");
		header.classList.add("font-title", "text-lg", "text-center", "uppercase");
		header.setAttribute("title", "LOC_ADVANCED_OPTIONS_ADVANCED");
		header.setAttribute("filigree-style", "none");
		this.centerArea.appendChild(header);

		this.centerArea.appendChild(this.createTopNav());

		this.createGameSetupPanel();
		this.createLegacyPathSetupPanel();
		this.createPlayerSetupPanel();
		this.setupSlotGroup.appendChild(this.gameSetupPanel);
		this.setupSlotGroup.appendChild(this.legacyPathSetupPanel);
		this.setupSlotGroup.appendChild(this.playerSetupPanel);
		this.setupSlotGroup.setAttribute('selected-slot', this.slotIDs[0]);
		this.setupSlotGroup.classList.add("flex-auto");
		this.centerArea.appendChild(this.setupSlotGroup);

		this.centerArea.appendChild(this.createBottomNav());

		this.Root.appendChild(fragment);
		//enableOpenSound is kept false intentionally
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-advanced-options");

		this.legacyPathsDisabledWarning.classList.add("w-full", "bg-primary-3", "border-2", "border-primary", "flex", "items-center", "my-2");

		const legacyPathsWarningIcon = document.createElement("div");
		legacyPathsWarningIcon.classList.add("advanced-options__warning-icon", "bg-no-repeat", "bg-contain", "size-14", "mx-2");
		this.legacyPathsDisabledWarning.appendChild(legacyPathsWarningIcon);

		const legacyPathsWarningText = document.createElement("div");
		legacyPathsWarningText.setAttribute("data-l10n-id", "LOC_ADVANCED_OPTIONS_LEGACY_PATHS_DISABLED_WARNING");
		legacyPathsWarningText.classList.add("flex-auto", "my-2");
		this.legacyPathsDisabledWarning.appendChild(legacyPathsWarningText);

		this.Root.listenForEngineEvent('UpdateFrame', this.onUpdate, this);
	}

	onAttach() {
		super.onAttach();
	}

	onDetach(): void {
		super.onDetach();
	}

	onUpdate() {
		if (GameSetup.currentRevision != this.gameSetupRevision) {

			const configChanges = Database.changes('config');
			if (this.groupNamesConfigChanges != configChanges) {
				this.groupNames.clear();
				const q = Database.query('config', 'SELECT GroupID, Name from ParameterGroups');
				if (q) {
					for (const r of q) {
						if (typeof r.GroupID == 'string' && typeof r.Name == 'string') {
							this.groupNames.set(r.GroupID, r.Name);
						}
					}
				}
				this.groupNamesConfigChanges = configChanges;
			}

			// Cached database data for civs currently depends on the civ and leader player parameter.
			// Therefore if either of those parameters have changes, we need to invalidate the cache.
			// In the future, this cache shuold be comprehensive enough to only depend on database changes, which will only happen on mod changes.
			let shouldRefreshCachedData = false;

			let shouldRefreshGameOptions = false;
			let shouldRefreshPlayerOptions = false;

			const changes = GameSetup.getParameterChanges(this.gameSetupRevision);
			if (changes) {
				for (const c of changes) {
					if (c.created || c.destroyed) {
						if (c.playerID !== null && c.playerID !== undefined) {
							shouldRefreshCachedData = true;
							shouldRefreshPlayerOptions = true;
							break;
						}
						else {
							shouldRefreshGameOptions = true;
						}
					}
					if (c.parameterID == strMapSize) {
						// Refresh all options for now.
						shouldRefreshPlayerOptions = true;
					}
				}
			}
			else {
				// Indeterminate list of changes == refresh everything!
				shouldRefreshCachedData = true;
				shouldRefreshGameOptions = true;
				shouldRefreshPlayerOptions = true;
			}


			if (shouldRefreshGameOptions) {
				const lastChangedParameter = FocusManager.getFocus().id;

				this.refreshGameOptions();

				if (lastChangedParameter != '') {
					const newFocus = this.Root.querySelector(`#${lastChangedParameter}`);
					if (newFocus) {
						FocusManager.setFocus(newFocus);
					}
				}
				else {
					this.updateFocus();
				}
			}
			else {
				// Syncronize the instantiated parameters w/ the changes
				if (changes) {
					for (const c of changes) {
						if (c.playerID == null) {
							const options = this.activeGameParameters.get(c.parameterID);
							if (options) {
								for (const option of options) {
									option.processChange(c);
								}
							}
						}
					}
				}
			}

			if (shouldRefreshPlayerOptions) {
				this.refreshPlayerOptions();
			}
			else {
				// Syncronize the instantiated parameters w/ the changes
				if (changes) {
					for (const c of changes) {
						if (c.playerID != null) {
							const playerParameters = this.activePlayerParameters.get(c.playerID);
							if (playerParameters) {

								// If the local player's civ or leader parameters have domain changes, then refresh the cached data.
								if (c.playerID == GameContext.localPlayerID && (c.parameterID == strPlayerCivilization || c.parameterID == strPlayerLeader)) {
									if (c.detailsChanged || c.possibleValuesChanged) {
										shouldRefreshCachedData = true;
									}
								}

								const options = playerParameters.get(c.parameterID);
								if (options) {
									for (const option of options) {
										option.processChange(c);
									}
								}
							}
						}
					}
				}
			}

			// Refresh the CreateGameModel state, if necessary.  
			// TODO This should probably be handled *inside* the model and not part of this screen.
			let shouldRefreshAgeSelection = false;
			let shouldRefreshLeaderSelection = false;
			let shouldRefreshCivilizationSelection = false;
			if (changes) {
				const localPlayerId = GameContext.localPlayerID;
				for (const c of changes) {
					if (c.playerID != null) {
						if (c.playerID == localPlayerId) {
							if (c.parameterID == strPlayerLeader) {
								shouldRefreshLeaderSelection = true;
							}
							else if (c.parameterID == strPlayerCivilization) {
								shouldRefreshCivilizationSelection = true;
							}
						}
					}
					else if (c.parameterID == strAge) {
						shouldRefreshAgeSelection = true;
					}
				}
			}
			else {
				// Indeterminate list of changes == refresh everything!
				shouldRefreshAgeSelection = true;
				shouldRefreshLeaderSelection = true;
				shouldRefreshCivilizationSelection = true;
			}

			if (shouldRefreshCachedData) {
				cachedDatabaseChanges = -1;
			}

			if (shouldRefreshAgeSelection) {
				const ageParam = GameSetup.findGameParameter(strAge);
				if (ageParam && ageParam.value.value) {
					const value = ageParam.value;
					const ageType = value.value as string;
					const name = GameSetup.resolveString(ageParam.value.name);
					const domain = GameSetup.resolveString(ageParam.value.originDomain);
					if (ageType && name && domain) {
						const ageData = {
							type: ageType,
							name: name,
							domain: domain
						};

						CreateGameModel.selectedAge = ageData;
					}
				}
			}

			if (shouldRefreshLeaderSelection) {
				const playerLeaderParam = GameSetup.findPlayerParameter(GameContext.localPlayerID, strPlayerLeader);
				if (playerLeaderParam && playerLeaderParam.value.value) {
					const leaderId = playerLeaderParam.value.value as string;
					LeaderSelectModelManager.showLeaderModels(leaderId);

					const leaderData = getCachedLeaderData();
					const selectedLeader = leaderData.find(ld => ld.leaderID == leaderId);
					if (selectedLeader) {
						CreateGameModel.selectedLeader = selectedLeader;
					}
					else {
						CreateGameModel.selectedLeader = leaderData[0];
					}
				}
			}
			if (shouldRefreshCivilizationSelection) {
				const playerCivParam = GameSetup.findPlayerParameter(GameContext.localPlayerID, strPlayerCivilization);
				if (playerCivParam && playerCivParam.value.value) {
					const civId = playerCivParam.value.value as string;
					const civData = getCachedCivData();
					const selectedCiv = civData.find(ld => ld.civID == civId);
					if (selectedCiv) {
						CreateGameModel.selectedCiv = selectedCiv;
					}
					else {
						CreateGameModel.selectedCiv = civData[0];
					}
				}
			}

			this.gameSetupRevision = GameSetup.currentRevision;
		}
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		// Wait for controls to be initialized before attempting focus
		waitForLayout(() => this.updateFocus());

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		NavTray.addOrUpdateNavShellPrevious("LOC_UI_SAVE_CONFIG");
		NavTray.addOrUpdateNavShellNext("LOC_UI_LOAD_CONFIG");
		NavTray.addOrUpdateShellAction2("LOC_OPTIONS_RESET_TO_DEFAULTS");
		NavTray.addOrUpdateShellAction1(CreateGameModel.nextActionStartsGame ? "LOC_UI_SETUP_START_GAME" : "LOC_GENERIC_CONTINUE");
	}

	onLoseFocus() {
		NavTray.clear();
		super.onLoseFocus();
	}

	override onNavigateInput(navigationEvent: NavigateInputEvent) {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (navigationEvent.getDirection()) {
			case InputNavigationAction.PREVIOUS:

				this.navControlTabs[this.currentSlotIndex].classList.remove("game-creator-nav-button-selected");
				this.currentSlotIndex = (this.currentSlotIndex - 1) % this.slotIDs.length;
				if (this.currentSlotIndex < 0) {
					this.currentSlotIndex = this.slotIDs.length - 1;
				}
				this.setupSlotGroup.setAttribute("selected-slot", this.slotIDs[this.currentSlotIndex]);
				this.navControlTabs[this.currentSlotIndex].classList.add("game-creator-nav-button-selected");

				this.activePanel = MustGetElement(`#${this.slotIDs[this.currentSlotIndex]}`, this.Root);

				navigationEvent.preventDefault();
				navigationEvent.stopImmediatePropagation();
				Audio.playSound("data-audio-activate", "game-creator");

				this.updateFocus();

				break;

			case InputNavigationAction.NEXT:

				this.navControlTabs[this.currentSlotIndex].classList.remove("game-creator-nav-button-selected");
				this.currentSlotIndex = (this.currentSlotIndex + 1) % this.slotIDs.length;
				this.setupSlotGroup.setAttribute("selected-slot", this.slotIDs[this.currentSlotIndex]);
				this.navControlTabs[this.currentSlotIndex].classList.add("game-creator-nav-button-selected");

				this.activePanel = MustGetElement(`#${this.slotIDs[this.currentSlotIndex]}`, this.Root);

				navigationEvent.preventDefault();
				navigationEvent.stopImmediatePropagation();
				Audio.playSound("data-audio-activate", "game-creator");

				this.updateFocus();

				break;

			case InputNavigationAction.SHELL_NEXT:
				this.showLoadScreen();
				navigationEvent.preventDefault();
				navigationEvent.stopImmediatePropagation();
				break;

			case InputNavigationAction.SHELL_PREVIOUS:
				this.showSaveScreen();
				navigationEvent.preventDefault();
				navigationEvent.stopImmediatePropagation();
				break;
		}
	}

	override onEngineInput(event: InputEngineEvent) {
		super.onEngineInput(event);

		if (event.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (event.detail.name === "shell-action-1") {
			CreateGameModel.showNextPanel();
			event.stopPropagation();
			event.preventDefault();
		}

		if (event.detail.name === "shell-action-2") {
			this.resetToDefaults();
			event.stopPropagation();
			event.preventDefault();
		}
	}

	override onActiveDeviceTypeChanged() {
		super.onActiveDeviceTypeChanged();

		MustGetElement(".advanced-options__footer", this.Root).classList.toggle("hidden", ActionHandler.isGamepadActive);
	}

	private resetToDefaults() {
		Configuration.editGame()?.reset(GameModeTypes.SINGLEPLAYER);
		waitForLayout(() => {
			this.refreshGameOptions();
			this.refreshPlayerOptions();
		});
	}

	private removePlayer(playerId: number) {
		const playerConfig = Configuration.editPlayer(playerId);

		if (playerConfig) {
			playerConfig.setSlotStatus(SlotStatus.SS_CLOSED);
			this.refreshPlayerOptions();
			waitForLayout(() => this.updateFocus());
		}
	}

	private addPlayer() {
		const maxPlayers = Configuration.getMap().maxMajorPlayers;
		let unusedId = -1;

		for (let playerId: number = 0; playerId < maxPlayers; ++playerId) {
			const playerConfig = Configuration.getPlayer(playerId);
			if (playerConfig.slotStatus === SlotStatus.SS_CLOSED) {
				unusedId = playerId;
				break;
			}
		}

		if (unusedId !== -1) {
			const newPlayer = Configuration.editPlayer(unusedId);
			if (newPlayer) {
				newPlayer.setSlotStatus(SlotStatus.SS_COMPUTER);
				newPlayer.setAsMajorCiv();
			}
			this.refreshPlayerOptions();
		}
		waitForLayout(() => this.updateFocus());
	}

	private showGameSetupPanel() {
		this.navControlTabs[this.currentSlotIndex].classList.remove("game-creator-nav-button-selected");
		this.currentSlotIndex = 0;
		this.setupSlotGroup.setAttribute("selected-slot", this.slotIDs[this.currentSlotIndex]);
		this.navControlTabs[this.currentSlotIndex].classList.add("game-creator-nav-button-selected");
		this.activePanel = this.gameSetupPanel;
		this.updateFocus();
	}

	private showLegacyPathSetupPanel() {
		this.navControlTabs[this.currentSlotIndex].classList.remove("game-creator-nav-button-selected");
		this.currentSlotIndex = 1;
		this.setupSlotGroup.setAttribute("selected-slot", this.slotIDs[this.currentSlotIndex]);
		this.navControlTabs[this.currentSlotIndex].classList.add("game-creator-nav-button-selected");
		this.activePanel = this.legacyPathSetupPanel;
		this.updateFocus();
	}

	private showPlayerSetupPanel() {
		this.navControlTabs[this.currentSlotIndex].classList.remove("game-creator-nav-button-selected");
		this.currentSlotIndex = 2;
		this.setupSlotGroup.setAttribute("selected-slot", this.slotIDs[this.currentSlotIndex]);
		this.navControlTabs[this.currentSlotIndex].classList.add("game-creator-nav-button-selected");
		this.activePanel = this.playerSetupPanel;
		this.updateFocus();
	}

	private updateFocus() {
		if (this.activePanel == this.gameSetupPanel && this.gameParamEles.length > 0) {
			FocusManager.setFocus(this.gameParamEles[0]);
		} else if (this.activePanel == this.legacyPathSetupPanel) {
			FocusManager.setFocus(this.activePanel);
		} else if (this.activePanel == this.playerSetupPanel) {
			FocusManager.setFocus(this.activePanel);
		}
	}

	private showSaveScreen() {
		const opts = { "menu-type": "save_config", "save-type": SaveTypes.SINGLE_PLAYER };
		ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: opts });
	}

	private showLoadScreen() {
		const opts = { "menu-type": "load_config", "save-type": SaveTypes.SINGLE_PLAYER };
		ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: opts })
	}

	private createTopNav() {
		const navControls = [
			{
				category: "LOC_ADVANCED_OPTIONS_GAME_SETTINGS",
				isActive: true,
				eventHandler: this.showGameSetupPanel.bind(this)
			},
			{
				category: "LOC_ADVANCED_OPTIONS_LEGACY_PATH_SETTINGS",
				isActive: false,
				eventHandler: this.showLegacyPathSetupPanel.bind(this)
			},
			{
				category: "LOC_ADVANCED_OPTIONS_PLAYER_SETTINGS",
				isActive: false,
				eventHandler: this.showPlayerSetupPanel.bind(this)
			}
		];

		const navControlEle = this.createNavControls(navControls);
		navControlEle.classList.remove("flex-auto", "my-8");
		navControlEle.classList.add("my-4");
		return navControlEle;
	}

	private createBottomNav() {
		const footerContainer = document.createElement("div");
		footerContainer.classList.add("h-20", "mx-8");

		const footerContent = document.createElement("fxs-hslot");
		footerContent.classList.add("advanced-options__footer", "justify-center");
		footerContent.classList.toggle("hidden", ActionHandler.isGamepadActive);
		footerContainer.appendChild(footerContent);

		const backButton = document.createElement("fxs-activatable");

		backButton.classList.add("advanced-options__back-button", "mx-2", "mb-2", "mt-6", "size-12", "bg-contain", "bg-no-repeat");
		backButton.addEventListener("action-activate", () => CreateGameModel.showPreviousPanel());
		footerContent.appendChild(backButton);

		const resetDefaultsButton = document.createElement("fxs-button");
		resetDefaultsButton.classList.add("mx-2", "mb-2", "mt-6");
		resetDefaultsButton.setAttribute("caption", "LOC_OPTIONS_RESET_TO_DEFAULTS");
		resetDefaultsButton.addEventListener("action-activate", this.resetToDefaults.bind(this));
		footerContent.appendChild(resetDefaultsButton);

		const startGameButton = document.createElement("fxs-hero-button");
		startGameButton.classList.add("mx-2", "mb-2", "grow");
		startGameButton.setAttribute("caption", "LOC_UI_SETUP_START_GAME");
		startGameButton.addEventListener("action-activate", this.startGameListener);
		footerContent.appendChild(startGameButton);

		const saveConfigButton = document.createElement("fxs-activatable");
		saveConfigButton.classList.add("advanced-options__save-config", "mx-2", "mb-2", "mt-6", "size-12", "bg-primary-1", "bg-no-repeat", "bg-contain");
		saveConfigButton.setAttribute("data-tooltip-content", "LOC_UI_SAVE_CONFIG");
		saveConfigButton.addEventListener("action-activate", this.showSaveScreenListener);
		footerContent.appendChild(saveConfigButton);

		const loadConfigButton = document.createElement("fxs-activatable");
		loadConfigButton.classList.add("advanced-options__load-config", "mx-2", "mb-2", "mt-6", "size-12", "bg-primary-1", "bg-no-repeat", "bg-contain");
		loadConfigButton.setAttribute("data-tooltip-content", "LOC_UI_LOAD_CONFIG");
		loadConfigButton.addEventListener("action-activate", this.showLoadScreenListener);
		footerContent.appendChild(loadConfigButton);

		return footerContainer;
	}

	private generateLeaderInfo() {
		this.leaderOptions.length = 0;
		const leaderData = getCachedLeaderData();
		for (const leader of leaderData) {
			if (!leader.isLocked && leader.isOwned) {
				const tooltip = GetLeaderTooltip(leader.leaderID);
				this.leaderOptions.push({
					id: leader.leaderID,
					label: leader.name,
					iconURL: UI.getIconURL(leader.icon),
					tooltip: tooltip
				});
			}
		}
	}

	private generateCivInfo() {
		this.civilizationOptions.length = 0;
		const civData = getCachedCivData();
		for (const civilization of civData) {
			if (!civilization.isLocked && civilization.isOwned) {
				const tooltip = GetCivilizationTooltip(civilization.civID);
				this.civilizationOptions.push({
					id: civilization.civID,
					label: civilization.name,
					iconURL: civilization.icon,
					tooltip: tooltip
				})
			}
		}
	}

	private refreshPlayerOptions() {
		this.generateCivInfo();

		while (this.playerConfigContainer.hasChildNodes()) {
			this.playerConfigContainer.removeChild(this.playerConfigContainer.childNodes[0]);
		}

		const playerSettingsSubheader = document.createElement("div");
		playerSettingsSubheader.setAttribute("data-l10n-id", "LOC_ADVANCED_OPTIONS_PLAYER_SETTINGS_SUBHEADER");
		playerSettingsSubheader.classList.add("font-title", "my-1", "uppercase", "tracking-150", "self-center");
		this.playerConfigContainer.appendChild(playerSettingsSubheader);

		const columnHeaders = document.createElement("div");
		columnHeaders.classList.add("flex", "mt-3", "ml-18", "mr-10");
		this.playerConfigContainer.appendChild(columnHeaders);

		const leftHeader = document.createElement("div");
		leftHeader.setAttribute("data-l10n-id", "LOC_GENERIC_LEADER");
		leftHeader.classList.add("font-title", "uppercase", "tracking-150", "w-1\\/2");
		columnHeaders.appendChild(leftHeader);

		const rightHeader = document.createElement("div");
		rightHeader.setAttribute("data-l10n-id", "LOC_GENERIC_CIVILIZATION");
		rightHeader.classList.add("font-title", "uppercase", "tracking-150", "w-1\\/2");
		columnHeaders.appendChild(rightHeader);

		const maxPlayers = Configuration.getMap().maxMajorPlayers;
		const activePlayers: ConfigurationPlayerAccessor[] = [];

		for (let playerId: number = 0; playerId < maxPlayers; ++playerId) {
			const playerConfig = Configuration.getPlayer(playerId);

			if (playerConfig.slotStatus !== SlotStatus.SS_CLOSED) {
				activePlayers.push(playerConfig);
			}
		}

		for (const [_index, playerConfig] of activePlayers.entries()) {
			const playerOptions = this.createPlayerOptions(playerConfig, activePlayers.length > 2, _index);
			this.playerConfigContainer.appendChild(playerOptions);
		}

		const addPlayerButton = document.createElement("fxs-chooser-item");
		addPlayerButton.setAttribute("disabled", (activePlayers.length == maxPlayers).toString());

		addPlayerButton.classList.add("my-4", "w-full", "self-center");
		addPlayerButton.addEventListener("action-activate", this.addPlayerListener);
		this.playerConfigContainer.appendChild(addPlayerButton);

		const addPlayerButtonContent = document.createElement("div");
		addPlayerButtonContent.classList.add("size-full", "flex", "items-center");
		addPlayerButton.appendChild(addPlayerButtonContent);

		const addPlayerButtonImage = document.createElement("div");
		addPlayerButtonImage.classList.add("advanced-options_add-player-plus", "relative", "bg-no-repeat", "bg-contain", "size-24", "m-3");
		addPlayerButtonContent.appendChild(addPlayerButtonImage);

		const addPlayerButtonText = document.createElement("div");
		addPlayerButtonText.setAttribute("data-l10n-id", "LOC_ADVANCED_OPTIONS_ADD_PLAYER");
		addPlayerButtonText.classList.add("self-center", "relative");
		addPlayerButtonContent.appendChild(addPlayerButtonText);
	}

	private createPlayerOptions(playerConfig: ConfigurationPlayerAccessor, includeDeleteButton: boolean, playerIndex: number) {
		const playerOptions = document.createElement("div");
		playerOptions.setAttribute("ignore-prior-focus", "true");
		playerOptions.classList.add("items-center", "my-1", "py-2", "bg-primary-5", "flex", "relative", "pointer-events-none", "flex-nowrap");

		const playerId = document.createElement("div");
		playerId.innerHTML = Locale.toNumber(playerIndex + 1);
		playerId.classList.add("w-12", "m-2", "text-center", "text-base", "font-title");
		playerOptions.appendChild(playerId);

		const selections = document.createElement("div");
		selections.classList.add("flex", "flex-row", "flex-auto");
		playerOptions.appendChild(selections);

		const playerLeaderParameter = GameSetup.findPlayerParameter(playerConfig.id, 'PlayerLeader');
		if (playerLeaderParameter) {
			const option = new AdvancedOptionsParameter(playerLeaderParameter);
			let activeParameters = this.activePlayerParameters.get(playerConfig.id);
			if (activeParameters == null) {
				activeParameters = new Map<number, AdvancedOptionsParameter[]>();
				this.activePlayerParameters.set(playerConfig.id, activeParameters);
			}

			const activeParameterOptions = activeParameters.get(playerLeaderParameter.ID);
			if (activeParameterOptions) {
				activeParameterOptions.push(option);
			}
			else {
				activeParameters.set(playerLeaderParameter.ID, [option]);
			}

			selections.appendChild(option.render());
		}

		const playerCivParameter = GameSetup.findPlayerParameter(playerConfig.id, 'PlayerCivilization');
		if (playerCivParameter) {
			const option = new AdvancedOptionsParameter(playerCivParameter);
			let activeParameters = this.activePlayerParameters.get(playerConfig.id);
			if (activeParameters == null) {
				activeParameters = new Map<number, AdvancedOptionsParameter[]>();
				this.activePlayerParameters.set(playerConfig.id, activeParameters);
			}

			const activeParameterOptions = activeParameters.get(playerCivParameter.ID);
			if (activeParameterOptions) {
				activeParameterOptions.push(option);
			}
			else {
				activeParameters.set(playerCivParameter.ID, [option]);
			}

			selections.appendChild(option.render());
		}

		const deleteIcon = document.createElement("fxs-activatable");
		deleteIcon.setAttribute("tabindex", "-1");
		deleteIcon.classList.add("close-button__bg", "group", "relative", "m-2", "w-8", "h-8");
		deleteIcon.classList.toggle("invisible", playerConfig.id === GameContext.localPlayerID || !includeDeleteButton);
		deleteIcon.addEventListener("action-activate", () => this.removePlayer(playerConfig.id));
		playerOptions.appendChild(deleteIcon);

		const border = document.createElement("div");
		border.classList.add("absolute", "inset-0\\.5", "img-dropdown-box-focus", "opacity-0", "transition-opacity", "group-hover\\:opacity-100", "group-focus\\:opacity-100");
		deleteIcon.appendChild(border);

		return playerOptions;
	}

	private createGameSetupPanel() {
		this.gameSetupPanel.classList.add("game-setup", "flex", "flex-col");
		this.gameSetupPanel.id = this.slotIDs[0];

		const scrollableContent = document.createElement("fxs-scrollable");
		scrollableContent.classList.add("flex-auto");
		this.gameSetupPanel.appendChild(scrollableContent);

		const scrollableContentContainer = document.createElement("div");
		scrollableContentContainer.classList.add("advanced-setup__game-options-container", "flex-auto", "mx-8");
		scrollableContent.appendChild(scrollableContentContainer);
	}

	private createLegacyPathSetupPanel() {
		this.legacyPathSetupPanel.classList.add("legacy-setup", "flex", "flex-col");
		this.legacyPathSetupPanel.id = this.slotIDs[1];

		const scrollableContent = document.createElement("fxs-scrollable");
		scrollableContent.classList.add("flex-auto");
		this.legacyPathSetupPanel.appendChild(scrollableContent);

		const scrollableContentContainer = document.createElement("div");
		scrollableContentContainer.classList.add("advanced-setup__legacy-options-container", "flex-auto", "mx-8");
		scrollableContent.appendChild(scrollableContentContainer);
	}

	private createPlayerSetupPanel() {
		this.playerSetupPanel.classList.add("player-setup", "flex", "flex-col", "items-center");
		this.playerSetupPanel.id = this.slotIDs[2];

		this.playerConfigContainer.classList.add("mx-6");

		const scrollableContent = document.createElement("fxs-scrollable");
		scrollableContent.classList.add("flex-auto");
		this.playerSetupPanel.appendChild(scrollableContent);

		scrollableContent.appendChild(this.playerConfigContainer);
		this.generateLeaderInfo();
		this.refreshPlayerOptions();

	}

	private refreshGameOptions() {

		const refreshGameOptionsProfilingHandle = UI.beginProfiling('refreshGameOptions');

		// Remove old options
		for (const element of this.gameParamEles) {
			element.remove();
		}

		for (const optionsHeader of this.gameOptionsHeaders) {
			optionsHeader.remove();
		}
		this.gameOptionsHeaders = [];

		for (const groups of this.groupContainers) {
			groups[1].remove();
		}
		this.groupContainers.clear();

		this.gameParamEles.length = 0;

		this.activeGameParameters = new Map<GameSetupStringHandle, AdvancedOptionsParameter[]>();

		const parameters: GameSetupParameter[] = GameSetup.getGameParameters();
		for (const param of parameters) {
			if (!param.hidden && param.invalidReason == GameSetupParameterInvalidReason.Valid) {
				let addToContainer: HTMLElement | undefined = undefined;
				if (param.array) {
					const groupID: string = GameSetup.resolveString(param.group)!;
					const isLegacyOption: boolean = groupID == "LegacyOptions";
					addToContainer = MustGetElement(isLegacyOption ? ".advanced-setup__legacy-options-container" : ".advanced-setup__game-options-container", this.Root);

				}
				else {
					addToContainer = this.groupContainers.get(param.group);
					if (!addToContainer) {
						const groupID: string = GameSetup.resolveString(param.group)!;
						const groupOptionContainer = document.createElement("div");
						this.groupContainers.set(param.group, groupOptionContainer);
						addToContainer = groupOptionContainer;
						const isLegacyOption: boolean = groupID == "LegacyOptions";
						const optionTabContainer = MustGetElement(isLegacyOption ? ".advanced-setup__legacy-options-container" : ".advanced-setup__game-options-container", this.Root);
						optionTabContainer.appendChild(groupOptionContainer);
						if (!isLegacyOption) {
							const groupName: string = this.groupNames.get(groupID) ?? "";
							const groupOptionHeader = createSettingsDropDown(groupName, groupOptionContainer, `${param.group}`);
							this.gameOptionsHeaders.push(groupOptionHeader);
							optionTabContainer.insertBefore(groupOptionHeader, groupOptionContainer);
						}
					}
				}

				if (param.ID == this.LegacyPathsParameterID) {
					addToContainer.appendChild(this.legacyPathsDisabledWarning);
				}

				const option = new AdvancedOptionsParameter(param);
				let options = this.activeGameParameters.get(param.ID);
				if (options == null) {
					options = [];
					this.activeGameParameters.set(param.ID, options);
				}
				options.push(option);

				const paramEle = option.render();
				paramEle.id = param.ID.toString();
				addToContainer.appendChild(paramEle);
				if (!param.array) {
					const newLabel: HTMLElement = this.createParamEleLabel(param, paramEle, addToContainer);
					newLabel.classList.add(addToContainer.children.length % 2 == 0 ? "bg-primary-4" : "bg-primary-5");
				}
				else {
					this.gameParamEles.push(paramEle);
				}
			}
		}

		UI.endProfiling(refreshGameOptionsProfilingHandle);
	}

	private createParamEleLabel(setupParam: GameSetupParameter, paramEle: HTMLElement, fragment: HTMLElement) {

		const container = document.createElement(setupParam.array ? 'fxs-spatial-slot' : 'fxs-hslot');
		container.classList.add('advanced-options-setting-row', 'items-center', "my-0\\.5");

		if (!setupParam.array) {
			container.classList.add("h-14");
			const paramName = GameSetup.resolveString(setupParam.name);
			const label = document.createElement('div');
			label.classList.add('flex', "flex-auto", 'justify-start', "font-body-base", "ml-4");
			label.setAttribute('data-l10n-id', `{${paramName}}`);
			container.appendChild(label);
		}

		container.appendChild(paramEle);

		this.gameParamEles.push(container);
		fragment.appendChild(container);
		return container;
	}
}

Controls.define('advanced-options-panel', {
	createInstance: AdvancedOptionsPanel,
	description: 'Displays advanced game options and player setup',
	styles: ['fs://game/core/ui/shell/create-panels/advanced-options-panel.css'],
	images: [
		'blp:shell_advanced-options_subheader',
		'blp:hud_unit-panel_divider-center',
		'blp:set_save_config',
		'blp:set_save_config-focus',
		'blp:set_load_config',
		'blp:set_load_config-focus'
	],
	classNames: ["fullscreen", "flex", "justify-center"],
	tabIndex: -1
});
/**
 * @file panel-sub-system-dock.ts
 * @copyright 2020-2025, Firaxis Games
 * @description A dock of sub-system launchers.
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import FxsRingMeter from '/core/ui/components/fxs-ring-meter.js';
import FxsActivatable, { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js'
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js'
import PopupSequencer, { PopupSequencerData } from '/base-standard/ui/popup-sequencer/popup-sequencer.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';

import { CrisisMeter } from '/base-standard/ui/crisis-meter/crisis-meter.js';

/**
 * What needs to be defined for each button
 */
type ButtonData = {
	tooltip: string,

	/** Function to call when "activated" via press/click/or gamepad */
	callback: () => void,

	/** CSS class to add to button subelements */
	modifierClass: string,

	/** CSS class to tag button (for tutorial, etc...) */
	class: string | string[],

	ringClass?: string,

	/** Audio to fire when clicked, appended to "sub-system-dock-" */
	audio?: string,

	/** Audio to fire when focused/hovered, appended to "sub-system-dock-" */
	focusedAudio?: string
}


type RingButtonData = ButtonData & {
	useCrisisMeter?: boolean
}

/**
 * Area for sub system button icons.
 */
class PanelSubSystemDock extends Panel {

	private readonly buttonContainer = document.createElement("fxs-hslot");

	private ageRing: ComponentRoot<CrisisMeter> | null = null;
	private ageTurnCounter: HTMLDivElement | null = null;

	private cultureButton: ComponentRoot<FxsActivatable> | null = null;
	private cultureRing: ComponentRoot<FxsRingMeter> | null = null;
	private cultureTurnCounter: HTMLDivElement | null = null;

	private techButton: ComponentRoot<FxsActivatable> | null = null;
	private techRing: ComponentRoot<FxsRingMeter> | null = null;
	private techTurnCounter: HTMLDivElement | null = null;

	private goldenAgeCrown!: HTMLDivElement;
	private goldenAgeTurns!: HTMLDivElement;

	private policiesButton: ComponentRoot<FxsActivatable> | null = null;

	private resourcesButton: ComponentRoot<FxsActivatable> | null = null;

	private focusSubsystemListener = this.onFocusSubsystem.bind(this);

	onInitialize() {
		super.onInitialize();

		const fragment = document.createDocumentFragment();

		this.buttonContainer.setAttribute("focus-rule", "last");
		this.buttonContainer.setAttribute("ignore-prior-focus", "");
		this.buttonContainer.classList.add("flow-row", "sub-system-dock--button-container");
		fragment.appendChild(this.buttonContainer);
		this.animateInType = this.animateOutType = AnchorType.Fade;

		if (this.ageNeverEnds) {
			const ageElements = this.addRingButton({
				useCrisisMeter: false,
				tooltip: "LOC_UI_VICTORY_PROGRESS",
				callback: this.openRankings,
				class: ["ring-age", "tut-age"],
				ringClass: "ssb__texture-ring",
				modifierClass: 'ageextended',
				audio: "age-progress",
				focusedAudio: "data-audio-focus-large"
			});

			this.ageRing = ageElements.ring;
			this.ageTurnCounter = ageElements.turnCounter;
		}
		else {
			const ageElements = this.addRingButton({
				useCrisisMeter: true,
				tooltip: "LOC_UI_VICTORY_PROGRESS",
				callback: this.openRankings,
				class: ["ring-age", "tut-age"],
				ringClass: "ssb__texture-ring",
				modifierClass: 'agetimer',
				audio: "age-progress",
				focusedAudio: "data-audio-focus-large"
			});

			this.ageRing = ageElements.ring;
			this.ageTurnCounter = ageElements.turnCounter;
		}


		const techElements = this.addRingButton({
			tooltip: "LOC_UI_VIEW_TECH_TREE",
			callback: this.openTechChooser,
			class: ["ring-tech", "tut-tech"],
			ringClass: "ssb__texture-ring",
			modifierClass: 'tech',
			audio: "tech-tree",
			focusedAudio: "data-audio-focus-large"
		});

		this.techButton = techElements.button;
		this.techRing = techElements.ring;
		this.techTurnCounter = techElements.turnCounter;

		const cultureElements = this.addRingButton({
			tooltip: "LOC_UI_VIEW_CIVIC_TREE",
			callback: this.openCultureChooser,
			class: ['ring-culture', "tut-culture"],
			ringClass: "ssb__texture-ring",
			modifierClass: 'civic',
			audio: "culture-tree",
			focusedAudio: "data-audio-focus-large"
		});
		this.cultureButton = cultureElements.button;
		this.cultureRing = cultureElements.ring;
		this.cultureTurnCounter = cultureElements.turnCounter;

		this.policiesButton = this.addButton({ tooltip: "LOC_UI_VIEW_TRADITIONS", modifierClass: 'gov', callback: this.onOpenPolicies.bind(this), class: "tut-traditions", audio: "government", focusedAudio: "data-audio-focus-small" });
		this.goldenAgeCrown = document.createElement("div");
		this.goldenAgeCrown.classList.add("sub-system-dock--golden-age-ring", "absolute", "-inset-4", "bg-no-repeat", "bg-cover", "hidden");

		const turnsBG = document.createElement("div");
		turnsBG.classList.add("sub-system-dock--golden-age-timer-bg", "relative", "w-7", "self-center");

		this.goldenAgeTurns = document.createElement("div");
		this.goldenAgeTurns.classList.add("sub-system-dock--golden-age-timer", "relative", "font-title-base", "text-shadow", "self-center");

		turnsBG.appendChild(this.goldenAgeTurns);
		this.goldenAgeCrown.appendChild(turnsBG);
		this.policiesButton.appendChild(this.goldenAgeCrown);

		this.resourcesButton = this.addButton({ tooltip: "LOC_UI_VIEW_RESOURCE_ALLOCATION", modifierClass: 'resources', callback: this.onOpenResourceAllocation.bind(this), class: "tut-trade", audio: "resources", focusedAudio: "data-audio-focus-small" });
		this.addButton({ tooltip: "LOC_UI_VIEW_GREAT_WORKS", modifierClass: 'greatworks', callback: this.onOpenGreatWorks.bind(this), class: "tut-great-works", audio: "great-works", focusedAudio: "data-audio-focus-small" });
		if (Game.age != Database.makeHash("AGE_MODERN")) {
			this.addButton({ tooltip: "LOC_UI_VIEW_RELIGION", modifierClass: 'religion', callback: this.openReligionViewer.bind(this), class: "tut-religion", audio: "religion", focusedAudio: "data-audio-focus-small" });
		}
		this.addButton({ tooltip: "LOC_UI_VIEW_UNLOCKS", modifierClass: 'unlocks', callback: this.onOpenUnlocks.bind(this), class: "tut-unlocks", audio: "unlocks", focusedAudio: "data-audio-focus-small" });

		this.attachAdditionalInfo(this.resourcesButton, null);

		this.updateButtonTimers();

		this.Root.appendChild(fragment);
	}

	onAttach() {
		super.onAttach();

		this.Root.listenForEngineEvent('PlayerTurnActivated', this.onPlayerTurnBegin, this);
		this.Root.listenForEngineEvent('PlayerTurnDeactivated', this.onPlayerTurnEnd, this);
		this.Root.listenForEngineEvent('ScienceYieldChanged', this.onTechsUpdated, this);
		this.Root.listenForEngineEvent('TechTreeChanged', this.onTechsUpdated, this);
		this.Root.listenForEngineEvent('TechTargetChanged', this.onTechTargetUpdated, this);
		this.Root.listenForEngineEvent('TechNodeCompleted', this.onTechsUpdated, this);
		this.Root.listenForEngineEvent('PlayerYieldChanged', this.onPlayerYieldUpdated, this);
		this.Root.listenForEngineEvent('PlayerYieldGranted', this.onPlayerYieldGranted, this);
		this.Root.listenForEngineEvent('CultureYieldChanged', this.onCultureUpdated, this);
		this.Root.listenForEngineEvent('CultureTreeChanged', this.onCultureUpdated, this);
		this.Root.listenForEngineEvent('CultureTargetChanged', this.onCultureTargetUpdated, this);
		this.Root.listenForEngineEvent('CultureNodeCompleted', this.onCultureUpdated, this);
		this.Root.listenForEngineEvent('AgeProgressionChanged', this.updateAgeProgression, this);
		this.Root.listenForEngineEvent('PlayerGoldenAgeChanged', this.onGoldenAgeChanged, this);

		this.Root.listenForEngineEvent('ResourceAssigned', this.updateResourcesButton, this);
		this.Root.listenForEngineEvent('PlotOwnershipChanged', this.updateResourcesButton, this);

		this.Root.listenForEngineEvent('GameExtended', this.onGameExtended, this);
		this.Root.listenForWindowEvent('focus-sub-system', this.focusSubsystemListener);
	}

	onDetach() {
		super.onDetach();
	}

	override generateOpenCallbacks(callbacks: Record<string, OptionalOpenCallback>): void {
		callbacks['screen-culture-tree-chooser'] = this.openCultureChooser;
		callbacks['screen-victory-progress'] = this.openRankings;
		callbacks['screen-tech-tree-chooser'] = this.openTechChooser;
		callbacks['screen-policies'] = this.onOpenPolicies;
		callbacks['screen-great-works'] = this.onOpenGreatWorks;
		callbacks['screen-resource-allocation'] = this.onOpenResourceAllocation;
		callbacks['screen-unlocks'] = this.onOpenUnlocks;

		const religionScreen = this.getReligionScreenName()

		callbacks['screen-pantheon-chooser'] = religionScreen == 'screen-pantheon-chooser' ? this.openReligionViewer : undefined;
		callbacks['panel-pantheon-complete'] = religionScreen == 'panel-pantheon-complete' ? this.openReligionViewer : undefined;
		callbacks['panel-religion-picker'] = religionScreen == 'panel-religion-picker' ? this.openReligionViewer : undefined;
		callbacks['panel-belief-picker'] = religionScreen == 'panel-belief-picker' ? this.openReligionViewer : undefined;
	}

	private addRingButton(buttonData: RingButtonData, index?: number) {
		const turnCounter = document.createElement("div");
		turnCounter.classList.add("ssb-button__turn-counter");
		turnCounter.setAttribute("data-tut-highlight", "founderHighlight");

		const turnCounterContent = document.createElement("div");
		turnCounterContent.classList.add("ssb-button__turn-counter-content", "font-title-base");
		turnCounter.appendChild(turnCounterContent);

		const ringAndButton = {
			button: this.createButton(buttonData),
			ring: this.createRing(buttonData),
			turnCounter
		};

		ringAndButton.button.setAttribute("data-audio-group-ref", "audio-panel-sub-system-dock");
		ringAndButton.button.setAttribute("data-audio-press-ref", "data-audio-press-large");
		ringAndButton.button.setAttribute("data-audio-activate-ref", "none");

		if (index == null) {
			this.buttonContainer.appendChild(ringAndButton.ring);
		}
		else {
			const beforeNode = this.buttonContainer.childNodes[index];
			if (beforeNode) {
				this.buttonContainer.insertBefore(ringAndButton.ring, beforeNode);
			}
			else {
				this.buttonContainer.appendChild(ringAndButton.ring);
			}
		}
		ringAndButton.ring.appendChild(ringAndButton.button);
		ringAndButton.ring.appendChild(ringAndButton.turnCounter);

		if (buttonData.ringClass) {
			ringAndButton.ring.setAttribute("ring-class", buttonData.ringClass);
		}

		const highlightObj = document.createElement("div");
		highlightObj.classList.add("ssb-button__highlight", "absolute");
		highlightObj.setAttribute("data-tut-highlight", "founderHighlight");
		ringAndButton.button.appendChild(highlightObj);

		ringAndButton.ring.classList.add("ssb__element");
		return ringAndButton;
	}

	private addButton(buttonData: ButtonData) {
		const button = this.createButton(buttonData);
		button.classList.add("ssb__element");
		this.buttonContainer.appendChild(button);

		return button;
	}

	private createRing(buttonData: RingButtonData) {
		const tag = buttonData.useCrisisMeter ? "crisis-meter" : "fxs-ring-meter";
		const ring = document.createElement(tag);

		if (buttonData.class) {
			Array.isArray(buttonData.class) ? ring.classList.add(...buttonData.class) : ring.classList.add(buttonData.class);
		}

		ring.classList.add(buttonData.modifierClass)
		return ring;
	}

	private createButton(buttonData: ButtonData) {
		const button = document.createElement("fxs-activatable");
		{
			button.classList.add("ssb__button", buttonData.modifierClass);
			button.setAttribute("data-tut-highlight", "founderHighlight");

			Array.isArray(buttonData.class) ? button.classList.add(...buttonData.class) : button.classList.add(buttonData.class);

			button.setAttribute("data-tooltip-content", Locale.compose(buttonData.tooltip));
			button.setAttribute("data-audio-group-ref", "audio-panel-sub-system-dock");

			button.setAttribute("data-audio-focus-ref", buttonData.focusedAudio ?? 'data-audio-focus');
			button.setAttribute("data-audio-activate-ref", "none");

			if (buttonData.audio) {
				button.setAttribute("data-audio-press-ref", "data-audio-press-small");
			}

			button.addEventListener('action-activate', (_event: ActionActivateEvent) => {
				buttonData.callback();
				FocusManager.clearFocus(button);
			});

			const buttonIconBg = document.createElement("div");
			{
				buttonIconBg.classList.add("ssb__button-iconbg", buttonData.modifierClass);
			}
			button.appendChild(buttonIconBg);

			const buttonIconBgHover = buttonIconBg.cloneNode() as HTMLDivElement;
			{
				buttonIconBgHover.classList.add("ssb__button-iconbg--hover");
			}
			button.appendChild(buttonIconBgHover);

			const buttonIconBgActive = buttonIconBg.cloneNode() as HTMLDivElement;
			{
				buttonIconBgActive.classList.add("ssb__button-iconbg--active");
			}
			button.appendChild(buttonIconBgActive);

			const buttonIconBgDisabled = buttonIconBg.cloneNode() as HTMLDivElement;
			{
				buttonIconBgDisabled.classList.add("ssb__button-iconbg--disabled");
			}
			button.appendChild(buttonIconBgDisabled);

			const buttonIcon = document.createElement("div");
			{
				buttonIcon.classList.add("ssb__button-icon", buttonData.modifierClass);
			}
			button.appendChild(buttonIcon);
		}

		return button;
	}

	private attachAdditionalInfo(button: HTMLElement, iconClass: string | null) {
		const progressMeter = document.createElement("div");
		progressMeter.classList.add("progress-meter");
		button.appendChild(progressMeter);

		const infoContainer = document.createElement('div');
		infoContainer.classList.add('ssb__info-container');

		const nameText = document.createElement('div');
		nameText.classList.add('ssb__info-name');
		infoContainer.appendChild(nameText);

		const textContainer = document.createElement("div");
		textContainer.classList.add("ssb__turn");

		if (iconClass) {
			const timerIcon = document.createElement("div");
			timerIcon.classList.add(iconClass);
			textContainer.appendChild(timerIcon);
		}

		const text = document.createElement("div");
		text.classList.add("ssb__turn-number");
		textContainer.appendChild(text);

		infoContainer.appendChild(textContainer);

		button.appendChild(infoContainer);
	}

	private updateTurnCounter(element: HTMLDivElement | null, turns: number | string) {
		if (!element) {
			console.error("panel-sub-system-dock: Unable to find turn counter element, skipping update of turn counter");
			return;
		}
		const content = element.querySelector(".ssb-button__turn-counter-content");
		if (content) {
			content.textContent = turns.toString();
		}
		element.classList.toggle('ssb-button__turn-counter--hidden', turns == 0 || turns == "");
	}

	private updateButtonIcon(element: HTMLElement, icon: string) {
		const iconElement = element.querySelector(".ssb__button-icon") as HTMLElement;
		if (iconElement) {
			if (icon === "") {
				iconElement.style.removeProperty("background-image");
			} else {
				iconElement.style.backgroundImage = `url('${icon}')`;
			}
		}
	}

	private updateButtonTimers() {
		this.updateAgeButtonTimer();
		this.updateCultureButtonTimer();
		this.updateTechButtonTimer();
		this.updateResourcesButton();
		this.updatePoliciesTooltip();
	}

	private updateCultureButtonTimer() {
		if (!this.cultureButton) {
			console.error("panel-sub-system-dock: Unable to find culture button, skipping update of turn timer");
			return;
		}

		const localPlayerID = GameContext.localPlayerID;
		const localPlayer: PlayerLibrary | null = Players.getEverAlive()[GameContext.localPlayerID];
		if (localPlayer == null) {
			return;		// autoplaying
		}

		let cultureTimer = 0;
		let cultureTooltipString = "";
		let cultureIcon = "";
		let cultureProgressRatio = 100;
		let cultureNameString = "";
		const culture = localPlayer.Culture;
		if (culture) {
			const activeCultureTreeType: ProgressionTreeType = culture.getActiveTree();
			const treeObject: ProgressionTree | null = Game.ProgressionTrees.getTree(localPlayerID, activeCultureTreeType);
			if (treeObject && treeObject.activeNodeIndex >= 0) {

				const activeNode: ProgressionTreeNode = treeObject.nodes[treeObject.activeNodeIndex];
				const nodeData: ProgressionTreeNode | null = Game.ProgressionTrees.getNode(localPlayerID, activeNode.nodeType);
				if (nodeData) {
					const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(nodeData.nodeType);
					if (nodeInfo) {
						cultureNameString = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
						if (nodeData.depthUnlocked >= 1) {
							let depthNumeral: string = Locale.toRomanNumeral(nodeData.depthUnlocked + 1);
							if (depthNumeral) {
								cultureNameString += " " + depthNumeral;
							}
						}

						const cost = culture.getNodeCost(culture.getResearching().type);

						cultureIcon = Icon.getCultureIconFromProgressionTreeNodeDefinition(nodeInfo);
						cultureTimer = culture.getTurnsLeft();
						cultureTooltipString = Locale.compose("LOC_SUB_SYSTEM_CULTURE_CURRENT_RESEARCH", cultureNameString, cultureTimer);
						cultureProgressRatio = 1 - (nodeData.progress / cost);
					}
				}
			}
		} else {
			console.error("panel-sub-system-dock: unable to find local player culture, skipping update of culture button timer.");
		}

		this.updateTurnCounter(this.cultureTurnCounter, cultureTimer.toString());
		this.updateButtonIcon(this.cultureButton, cultureIcon);

		if (cultureTooltipString != "") {
			this.cultureButton.setAttribute("data-tooltip-content", cultureTooltipString);
		} else {
			this.cultureButton.setAttribute("data-tooltip-content", "LOC_SUB_SYSTEM_CULTURE_NO_RESEARCH");
		}

		this.cultureRing?.setAttribute('value', (100 - cultureProgressRatio * 100).toString());
	}

	private updateAgeButtonTimer() {
		if (!this.ageRing) {
			console.error("panel-sub-system-dock: Unable to find age ring, skipping update of turn timers");
			return;
		}

		const ageName = GameInfo.Ages.lookup(Game.age)?.Name ?? "";
		const ageProgress = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
		const maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();

		if (this.ageNeverEnds) {
			this.ageRing.removeAttribute('data-tooltip-content');
		} else {
			const ageCountdownStarted: boolean = Game.AgeProgressManager.ageCountdownStarted;
			let tooltipString: string = Locale.compose("LOC_ACTION_PANEL_CURRENT_AGE_PROGRESS", ageName, ageProgress, maxAgeProgress);
			if (ageCountdownStarted) {
				const curAgeProgress: number = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
				const maxAgeProgress: number = Game.AgeProgressManager.getMaxAgeProgressionPoints();

				const ageProgressLeft: number = maxAgeProgress - curAgeProgress;

				if (ageProgressLeft == 0) {
					tooltipString += `[n]${Locale.compose("LOC_UI_GAME_FINAL_TURN_OF_AGE")}`;
				}
				else {
					tooltipString += `[n]${Locale.compose("LOC_UI_X_TURNS_LEFT_UNTIL_AGE_END", ageProgressLeft)}`;
				}
			}
			this.ageRing.setAttribute('data-tooltip-content', tooltipString);
		}

		this.updateVictoryMeter(ageProgress);
	}

	private updateVictoryMeter(victoryProgression: number) {
		if (this.ageNeverEnds) {
			this.ageRing?.setAttribute('min-value', '0');
			this.ageRing?.setAttribute('max-value', '0');
			this.ageRing?.setAttribute('value', '0');
			this.updateTurnCounter(this.ageTurnCounter, '∞');
		}
		else {
			const maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();

			this.ageRing?.setAttribute('min-value', '0');
			this.ageRing?.setAttribute('max-value', maxAgeProgress.toString());
			this.ageRing?.setAttribute('value', victoryProgression.toString());

			const ageProgressPercent = Locale.toPercent(victoryProgression / maxAgeProgress);

			this.updateTurnCounter(this.ageTurnCounter, ageProgressPercent);
		}
	}

	private updateAgeProgression(data: AgeProgressionChanged_EventData) {
		this.updateVictoryMeter(data.progressionTotal);

		if (Players.isValid(GameContext.localPlayerID)) {
			if (data.ageIsEnding != undefined && data.ageIsEnding) {
				const popupBody = Locale.stylize("LOC_UI_GAME_ENDING_SOON_SUMMARY");
				DialogManager.createDialog_Confirm({
					body: popupBody,
					title: "LOC_UI_GAME_ENDING_SOON_TITLE",
				});
			}
		}
	}

	private updateTechButtonTimer() {
		if (!this.techButton) {
			console.error("panel-sub-system-dock: Unable to find tech button, skipping update of turn timers");
			return;
		}

		const localPlayerID = GameContext.localPlayerID;
		const localPlayer = Players.getEverAlive()[GameContext.localPlayerID];
		if (localPlayer == null) {
			return;		// autoplaying
		}

		let techTimer = 0;
		let techTooltipString = "";
		let techIcon = "";
		let techProgressRatio = 100;
		let techNameString = "";
		const techs = localPlayer.Techs;
		if (techs) {
			const techTreeType = techs.getTreeType();
			const treeObject = Game.ProgressionTrees.getTree(localPlayerID, techTreeType);
			if (treeObject && treeObject.activeNodeIndex >= 0) {

				const activeNode = treeObject.nodes[treeObject.activeNodeIndex];
				const nodeData = Game.ProgressionTrees.getNode(localPlayerID, activeNode.nodeType);
				if (nodeData) {
					const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(activeNode.nodeType);
					if (nodeInfo) {
						techNameString = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
						if (nodeData.depthUnlocked >= 1) {
							let depthNumeral = Locale.toRomanNumeral(nodeData.depthUnlocked + 1);
							if (depthNumeral) {
								techNameString += " " + depthNumeral;
							}
						}

						const cost = techs.getNodeCost(techs.getResearching().type);

						techIcon = Icon.getTechIconFromProgressionTreeNodeDefinition(nodeInfo);
						techTimer = techs.getTurnsLeft();
						techTooltipString = Locale.compose("LOC_SUB_SYSTEM_TECH_CURRENT_RESEARCH", techNameString, techTimer);
						techProgressRatio = 1 - (nodeData.progress / cost);
					}
				}
			}
		}

		this.updateTurnCounter(this.techTurnCounter, techTimer.toString());
		this.updateButtonIcon(this.techButton, techIcon);

		if (techTooltipString != "") {
			this.techButton.setAttribute("data-tooltip-content", techTooltipString);
		} else {
			this.techButton.setAttribute("data-tooltip-content", "LOC_SUB_SYSTEM_TECH_NO_RESEARCH");
		}

		this.techRing?.setAttribute('value', (100 - techProgressRatio * 100).toString());
	}

	private updatePoliciesTooltip() {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error("panel-sub-system-dock: createTraditionsTooltip() - No local player!");
			return;
		}

		const localPlayerHappiness: PlayerHappiness | undefined = localPlayer.Happiness;
		if (localPlayerHappiness == undefined) {
			console.error("panel-sub-system-dock: createTraditionsTooltip() - No local player happiness!");
			return;
		}

		const localPlayerStats: PlayerStats | undefined = localPlayer?.Stats;
		if (localPlayerStats === undefined) {
			console.error("panel-sub-system-dock: createTraditionsTooltip() - Local player stats is undefined!");
			return;
		}

		if (localPlayerHappiness.isInGoldenAge()) {
			const goldenAgeTurnsLeft: number = localPlayerHappiness.getGoldenAgeTurnsLeft();
			const goldenAgeType = localPlayerHappiness.getCurrentGoldenAge();
			const celebrationItemDef: GoldenAgeDefinition | null = GameInfo.GoldenAges.lookup(goldenAgeType);

			if (celebrationItemDef) {
				const description = Locale.compose(celebrationItemDef.Description, goldenAgeTurnsLeft);
				const tooltipContent = Locale.stylize("LOC_SUB_SYSTEM_TRADITIONS_DURING_CELEBRATION", celebrationItemDef.Name, goldenAgeTurnsLeft, description);
				this.policiesButton?.setAttribute("data-tooltip-content", tooltipContent);
			} else {
				this.policiesButton?.setAttribute("data-tooltip-content", Locale.compose("LOC_SUB_SYSTEM_TRADITIONS_TURNS_UNTIL_CELEBRATION_END", goldenAgeTurnsLeft));
			}
			this.goldenAgeTurns.innerHTML = goldenAgeTurnsLeft.toString();
			this.goldenAgeCrown.classList.remove("hidden");
		}
		else {
			const happinessPerTurn: number = localPlayerStats.getNetYield(YieldTypes.YIELD_HAPPINESS) ?? -1;
			const nextGoldenAgeThreshold: number = localPlayerHappiness.nextGoldenAgeThreshold;
			const happinessTotal: number = Math.ceil(localPlayerStats.getLifetimeYield(YieldTypes.YIELD_HAPPINESS)) ?? -1;
			const turnsToNextGoldenAge: number = Math.ceil((nextGoldenAgeThreshold - happinessTotal) / happinessPerTurn);
			this.policiesButton?.setAttribute("data-tooltip-content", Locale.compose("LOC_SUB_SYSTEM_TRADITIONS_TURNS_UNTIL_CELEBRATION_START", turnsToNextGoldenAge));
			this.goldenAgeCrown.classList.add("hidden");
		}
	}

	private updateResourcesButton() {
		if (!this.resourcesButton) {
			console.error("panel-sub-system-dock: Unable to find resources button, skipping update of turn timers");
			return;
		}

		const localPlayer: PlayerLibrary = Players.getEverAlive()[GameContext.localPlayerID];
		if (localPlayer == null) {
			return;		// autoplaying
		}

		const playerResources: PlayerResources | undefined = localPlayer.Resources;
		if (!playerResources) {
			console.error(`panel-sub-system-dock: updateResourcesButton - Failed to retrieve Resources for Player ${GameContext.localPlayerID}`);
			return;
		}

		let availableCount: number = 0;
		availableCount = playerResources.getCountResourcesToAssign();

		const resourcesTimerElement: HTMLElement | null = this.resourcesButton.querySelector<HTMLElement>(".ssb__turn-number");
		if (resourcesTimerElement) {
			resourcesTimerElement.style.display = availableCount > 0 ? 'flex' : 'none';
			resourcesTimerElement.innerHTML = availableCount.toString();
		} else {
			console.error("panel-sub-system-dock: updateResourcesButton(): Missing resourcesTimerElement with '.ssb__turn-number'");
		}
	}

	private onPlayerYieldUpdated(data: PlayerYieldChanged_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}
		if (data.yield == YieldTypes.YIELD_CULTURE) {
			this.updateCultureButtonTimer();
		}
		else if (data.yield == YieldTypes.YIELD_SCIENCE) {
			this.updateTechButtonTimer();
		}
	}

	private onPlayerYieldGranted(data: PlayerYieldGranted_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}
		if (data.yield == YieldTypes.YIELD_CULTURE) {
			this.updateCultureButtonTimer();
		}
		else if (data.yield == YieldTypes.YIELD_SCIENCE) {
			this.updateTechButtonTimer();
		}
	}

	private onTechsUpdated(data: ResearchYieldChanged_EventData | PlayerProgressionTree_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}
		this.updateTechButtonTimer();
	}

	private onTechTargetUpdated(data: PlayerProgressionTarget_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			return;
		}

		this.updateTechButtonTimer();
	}

	private onCultureUpdated(data: CultureYieldChanged_EventData | PlayerProgressionTree_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}
		this.updateCultureButtonTimer();
	}

	private onCultureTargetUpdated(data: PlayerProgressionTarget_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			return;
		}

		this.updateCultureButtonTimer();
	}

	private onPlayerTurnEnd(data: PlayerTurnDeactivated_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}
	}

	private onPlayerTurnBegin(data: PlayerTurnActivated_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}
		this.updateButtonTimers();
	}

	private onGameExtended(_data: GameExtended_EventData) {
		// Swap out the age progress button w/ an Extended age button.
		const ring = this.ageRing;
		if (ring) {
			ring.remove();
			this.ageRing = null;
			this.ageTurnCounter = null;
		}

		const ageElements = this.addRingButton({
			useCrisisMeter: false,
			tooltip: "LOC_UI_VICTORY_PROGRESS",
			callback: this.openRankings,
			class: ["ring-age", "tut-age"],
			ringClass: "ssb__texture-ring",
			modifierClass: 'ageextended',
			audio: "age-progress",
			focusedAudio: "data-audio-focus-large"
		}, 0);

		this.ageRing = ageElements.ring;
		this.ageTurnCounter = ageElements.turnCounter;

		this.updateAgeButtonTimer();
	}

	private onFocusSubsystem() {
		if (this.techButton) {
			const focus: HTMLElement | null = this.Root.querySelector<HTMLElement>(':focus');
			if (focus) {
				FocusManager.clearFocus(focus);
			} else {
				FocusManager.setFocus(this.techButton);
			}
		}
	}

	private openCultureChooser() {
		ContextManager.push("screen-culture-tree-chooser", { singleton: true });
	}

	private openTechChooser() {
		ContextManager.push("screen-tech-tree-chooser", { singleton: true });
	}

	private onOpenPolicies() {
		ContextManager.push("screen-policies", { singleton: true, createMouseGuard: true });
	}

	private openRankings() {
		ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true });
	}

	private onOpenGreatWorks() {
		ContextManager.push("screen-great-works", { singleton: true, createMouseGuard: true });
	}

	private onOpenResourceAllocation() {
		ContextManager.push("screen-resource-allocation", { singleton: true, createMouseGuard: true });
	}

	private onOpenUnlocks() {
		const unlocksData: PopupSequencerData = {
			category: PopupSequencer.getCategory(),
			screenId: "screen-unlocks",
			properties: { singleton: true, createMouseGuard: true },
		};

		PopupSequencer.addDisplayRequest(unlocksData);
	}

	private onGoldenAgeChanged() {
		this.updatePoliciesTooltip();
	}

	private getReligionScreenName(): string | undefined {
		const curAge: AgeType = Game.age;
		if (curAge == Database.makeHash("AGE_ANTIQUITY")) {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (!player) {
				console.error("panel-sub-system-dock: openReligionViewer() - no local player found!");
				return;
			}

			const playerCulture: PlayerCulture | undefined = player.Culture;
			if (!playerCulture) {
				console.error("panel-sub-system-dock: openReligionViewer() - no player culture found!");
				return;
			}

			const playerReligion: PlayerReligion | undefined = player.Religion;
			if (!playerReligion) {
				console.error("panel-sub-system-dock: openReligionViewer() - no player religion found!");
				return;
			}
			const numPantheonsToAdd: number = playerReligion.getNumPantheonsUnlocked();
			const mustAddPantheons: boolean = playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_MYSTICISM") && numPantheonsToAdd > 0;
			if (mustAddPantheons) {
				return "screen-pantheon-chooser";
			}
			else {
				return "panel-pantheon-complete";
			}
		}
		else if (curAge == Database.makeHash("AGE_EXPLORATION")) {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (!player) {
				console.error("panel-sub-system-dock: openReligionViewer() - No player object found!");
				return;
			}
			if (!player.Religion) {
				console.error("panel-sub-system-dock: openReligionViewer() - No player religion object found!");
				return;
			}
			if (player.Religion.canCreateReligion() && !player.Religion.hasCreatedReligion()) {
				return "panel-religion-picker";
			}
			else {
				return "panel-belief-picker";
			}
		}

		return;
	}

	private openReligionViewer() {
		const screen: string | undefined = this.getReligionScreenName();

		if (screen) {
			if (Game.age == Database.makeHash("AGE_MODERN")) {
				console.error("panel-sub-system-dock: openReligionViewer() - religion button pressed during an age that is neither Exploration nor Antiquity!");
			}

			ContextManager.push(screen, { singleton: true });
		}
	}

	private get ageNeverEnds() {
		return Game.AgeProgressManager.isExtendedGame || Game.AgeProgressManager.getMaxAgeProgressionPoints() <= 0;
	}
}

Controls.define('panel-sub-system-dock', {
	createInstance: PanelSubSystemDock,
	description: 'Area for sub system button icons.',
	opens: [
		'screen-culture-tree-chooser',
		'screen-victory-progress',
		'screen-tech-tree-chooser',
		'screen-policies',
		'screen-great-works',
		'screen-resource-allocation',
		'screen-unlocks',
		'screen-pantheon-chooser',
		'panel-pantheon-complete',
		'panel-religion-picker',
		'panel-belief-picker',
	],
	classNames: ['sub-system-dock', 'allowCameraMovement'],
	styles: ["fs://game/base-standard/ui/sub-system-dock/panel-sub-system-dock.css"],
	images: [
		'blp:sub_agetimer',
		'blp:hud_omt_infinity',
		'blp:sub_tech',
		'blp:sub_civics',
		'blp:sub_govt',
		'blp:sub_resource',
		'blp:sub_greatworks',
		'blp:sub_religion',
		'blp:sub_greatworks',
		'blp:hud_age_circle_bk',
		'blp:hud_tech_circle_bk',
		'blp:hud_civic_circle_bk',
		'blp:hud_sub_circle_bk'
	],
});
/**
 * @file panel-belief-picker.ts
 * @copyright 2024, Firaxis Games
 * @description Belief Picker
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import { TabItem, TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import { BeliefPickerChooserItem } from '/base-standard/ui/belief-picker-chooser-item/belief-picker-chooser-item.js';
import { BeliefPickerChooserNode } from "/base-standard/ui/belief-picker-chooser-item/model-belief-picker-chooser-item.js";
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { PantheonChooserNode } from '/base-standard/ui/pantheon-chooser-item/model-pantheon-chooser-item.js';
import { PantheonChooserItem } from '/base-standard/ui/pantheon-chooser-item/pantheon-chooser-item.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import DialogBoxManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { formatStringArrayAsNewLineText } from "/core/ui/utilities/utilities-core-textprovider.js";

enum BeliefPickerSlotState {
	LOCKED,
	OPEN,
	FILLEDSWAPPABLE,
	FILLEDUNSWAPPABLE
}

interface BeliefPickerSlot {
	state: BeliefPickerSlotState,
	beliefDef?: BeliefDefinition;
	toAddIndex?: number;
}

class PanelBeliefPicker extends Panel {

	private onBackButtonListener = this.onBackButton.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private onReligionTabSelectedListener = this.onReligionTabSelected.bind(this);
	private beliefConfirmButtonListener = this.onConfirm.bind(this);
	private beliefChoiceMenuCloseListener = this.onCloseBeliefChoiceMenu.bind(this);

	private beliefConfirmButton!: HTMLElement;

	private backButton!: HTMLElement;
	private allPlayerReligions: PlayerReligion[] = [];
	private playerReligion!: PlayerReligion;
	private viewingReligion!: PlayerReligion;
	private beliefsToAdd: BeliefType[] = [];
	private currentlySelectedBeliefSlot: HTMLElement | null = null;
	private mustCreateReligion: boolean = false;
	private beliefChoiceMenuClose!: HTMLElement;

	private religionFollowingPercentages: Map<PlayerReligion, string> = new Map<PlayerReligion, string>();

	private beliefChoiceMenu!: HTMLElement;

	private playerObject!: PlayerLibrary;

	private customReligionName: string = "";
	private selectedReligionType: string = "";

	private canConfirm: boolean = false;

	onInitialize(): void {
		this.beliefConfirmButton = MustGetElement('.belief-picker_confirm', this.Root);
		this.beliefChoiceMenu = MustGetElement('.belief-choice-menu', this.Root);
		this.backButton = MustGetElement('.belief-picker_back', this.Root);
		this.beliefChoiceMenuClose = MustGetElement('.belief-choice-menu_close', this.beliefChoiceMenu);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
	}

	onAttach() {
		super.onAttach();
		this.playAnimateInSound();

		const beliefSubsystemFrame: HTMLElement = MustGetElement(".belief-picker_subsystem-frame", this.Root);
		beliefSubsystemFrame.addEventListener('subsystem-frame-close', () => { this.close(); });

		this.beliefConfirmButton.addEventListener('action-activate', this.beliefConfirmButtonListener);
		this.beliefConfirmButton.setAttribute("data-audio-group-ref", "audio-panel-belief-picker");
		this.beliefConfirmButton.setAttribute("data-audio-activate-ref", "data-audio-confirm");
		this.backButton.addEventListener('action-activate', this.onBackButtonListener);
		this.beliefChoiceMenuClose.addEventListener('action-activate', this.beliefChoiceMenuCloseListener);

		const religionTypeAttribute: string | null = this.Root.getAttribute("selectedReligionType");
		const customNameAttribute: string | null = this.Root.getAttribute("customReligionName");
		if (religionTypeAttribute) {
			this.selectedReligionType = religionTypeAttribute;
			this.customReligionName = customNameAttribute ?? '';
			this.mustCreateReligion = true;
		}

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!player) {
			console.error("panel-belief-picker: onAttach() - No player object found!");
			return;
		}
		this.playerObject = player;
		const pReligion: PlayerReligion | undefined = player.Religion;
		if (!pReligion) {
			console.error("panel-belief-picker: onAttach() - Player object had no religion!");
			return;
		}
		this.playerReligion = pReligion;

		this.constructAllPlayerReligionInfo();

		this.buildBeliefTabs();

		const bottomContainer: HTMLElement = MustGetElement('.belief-picker_bottom-container', this.Root);
		Databind.classToggle(bottomContainer, 'hidden', `g_NavTray.isTrayRequired`);

		if (!this.mustCreateReligion || !this.allPlayerReligions.includes(this.playerReligion)) {
			this.backButton.classList.add("hidden");
		}
	}

	onDetach() {
		this.beliefConfirmButton.removeEventListener('action-activate', this.beliefConfirmButtonListener);
		this.backButton.removeEventListener('action-activate', this.onBackButtonListener);
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.beliefChoiceMenuClose.removeEventListener('action-activate', this.beliefChoiceMenuCloseListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		const focusElement: HTMLElement = MustGetElement('.belief-picker_belief-choices', this.Root);
		FocusManager.setFocus(focusElement);
	}

	private getHolyCityName(): string {
		if (!this.playerObject.Cities) {
			console.error("panel-belief-picker: getHolyCityName() - playerObject.Cities is undefined!");
			return "";
		}
		const foundCity: City | undefined = this.playerObject.Cities.getCities().find((city) => {
			return (city.Constructibles?.hasConstructible("BUILDING_TEMPLE", false) || city.Constructibles?.hasConstructible("BUILDING_MOSQUE", false));
		});
		return foundCity?.name ?? "";
	}

	private onBackButton() {
		ContextManager.push("panel-religion-picker", { singleton: true });
		this.close();
	}

	private onConfirm() {
		if (this.mustCreateReligion) {
			this.foundReligion();
		}
		else {
			this.addAllBeliefs();
		}
	}

	private onCloseBeliefChoiceMenu() {
		this.beliefChoiceMenu.classList.add("hidden");
		this.currentlySelectedBeliefSlot?.setAttribute("selected", "false");
		const focusElement: HTMLElement | null = this.Root.querySelector<HTMLElement>('.belief-picker_belief-choices');
		if (focusElement) {
			FocusManager.setFocus(focusElement);
		}
	}

	private buildBeliefWindow() {
		this.buildBeliefIdentity(this.viewingReligion);
		this.buildBeliefSlots(this.viewingReligion);
	}

	private buildBeliefSlots(viewingReligion: PlayerReligion) {
		const enhancerContainer = MustGetElement(".belief-picker_belief-enhancer-container", this.Root);
		while (enhancerContainer.hasChildNodes()) {
			enhancerContainer.removeChild(enhancerContainer.lastChild!);
		}
		const founderContainer = MustGetElement(".belief-picker_belief-founder-container", this.Root);
		while (founderContainer.hasChildNodes()) {
			founderContainer.removeChild(founderContainer.lastChild!);
		}
		const relicContainer = MustGetElement(".belief-picker_belief-relic-container", this.Root);
		while (relicContainer.hasChildNodes()) {
			relicContainer.removeChild(relicContainer.lastChild!);
		}

		const slotsToShow: BeliefPickerSlot[] = [];
		for (let i = 0; i < 5; i++) {
			slotsToShow.push({ state: BeliefPickerSlotState.LOCKED });
		}
		let currentFounderIndex = 1;

		//display beliefs we already have
		if ((!this.mustCreateReligion || viewingReligion != this.playerReligion) && viewingReligion.hasCreatedReligion()) {
			const playerBeliefs: BeliefType[] | null = viewingReligion.getBeliefs();
			if (playerBeliefs) {
				for (const belief of playerBeliefs) {
					const beliefDef: BeliefDefinition | null = GameInfo.Beliefs.lookup(belief);
					if (beliefDef == null) {
						console.error(`panel-belief-picker: buildBeliefContainer() - No belief definition found for belieftype ${belief}`);
						return;
					}

					const beliefSlotToAdd = { state: BeliefPickerSlotState.FILLEDUNSWAPPABLE, beliefDef: beliefDef };
					switch (beliefDef.BeliefClassType) {
						case "BELIEF_CLASS_ENHANCER":
							slotsToShow[4] = beliefSlotToAdd;
							break;
						case "BELIEF_CLASS_RELIQUARY":
							slotsToShow[0] = beliefSlotToAdd;
							break;
						case "BELIEF_CLASS_FOUNDER":
							slotsToShow[currentFounderIndex++] = beliefSlotToAdd;
							break;
					}
				}
			}
		}
		//display beliefs we've selected
		if (this.playerReligion == viewingReligion) {
			for (const [index, belief] of this.beliefsToAdd.entries()) {
				const beliefDef: BeliefDefinition | null = GameInfo.Beliefs.lookup(belief);
				if (beliefDef == null) {
					console.error(`panel-belief-picker: buildBeliefContainer() - No belief definition found for belieftype to add ${belief}`);
					return;
				}

				const beliefSlotToAdd = { state: BeliefPickerSlotState.FILLEDSWAPPABLE, beliefDef: beliefDef, toAddIndex: index };
				switch (beliefDef.BeliefClassType) {
					case "BELIEF_CLASS_ENHANCER":
						slotsToShow[4] = beliefSlotToAdd;
						break;
					case "BELIEF_CLASS_RELIQUARY":
						slotsToShow[0] = beliefSlotToAdd;
						break;
					case "BELIEF_CLASS_FOUNDER":
						slotsToShow[currentFounderIndex++] = beliefSlotToAdd;
						break;
				}
			}
		}
		if (this.viewingReligion == this.playerReligion) {
			//create open slots
			if (this.mustCreateReligion && (slotsToShow[0].state != BeliefPickerSlotState.FILLEDSWAPPABLE && slotsToShow[0].state != BeliefPickerSlotState.FILLEDUNSWAPPABLE)) {
				slotsToShow[0].state = BeliefPickerSlotState.OPEN;
			}
			else if (viewingReligion.hasCreatedReligion() && (slotsToShow[0].state != BeliefPickerSlotState.FILLEDSWAPPABLE && slotsToShow[0].state != BeliefPickerSlotState.FILLEDUNSWAPPABLE)) {
				slotsToShow[0].state = BeliefPickerSlotState.OPEN;
			}
			if (viewingReligion.getNumBeliefsEarned() >= 3 && (slotsToShow[4].state != BeliefPickerSlotState.FILLEDSWAPPABLE && slotsToShow[4].state != BeliefPickerSlotState.FILLEDUNSWAPPABLE)) {
				slotsToShow[4].state = BeliefPickerSlotState.OPEN;
			}
			for (let i = 0; i < this.getNumFounderSlots(viewingReligion) - currentFounderIndex + 1; i++) {
				if (slotsToShow[currentFounderIndex].state != BeliefPickerSlotState.FILLEDSWAPPABLE && slotsToShow[currentFounderIndex].state != BeliefPickerSlotState.FILLEDUNSWAPPABLE) {
					slotsToShow[currentFounderIndex].state = BeliefPickerSlotState.OPEN;
				}
			}
		}

		let hasOpenSlot: boolean = false;
		for (const [index, slot] of slotsToShow.entries()) {
			let container: HTMLElement | null = null;
			let beliefClass: string = "";
			if (index == 4) {
				container = enhancerContainer;
				beliefClass = "BELIEF_CLASS_ENHANCER";
			}
			else if (index == 0) {
				container = relicContainer;
				beliefClass = "BELIEF_CLASS_RELIQUARY";
			}
			else {
				container = founderContainer;
				beliefClass = "BELIEF_CLASS_FOUNDER";
			}

			switch (slot.state) {
				case BeliefPickerSlotState.LOCKED:
					container.appendChild(this.createLockedSlotElement(beliefClass));
					break;
				case BeliefPickerSlotState.OPEN:
					container.appendChild(this.createOpenSlotElement(beliefClass));
					hasOpenSlot = true;
					break;
				case BeliefPickerSlotState.FILLEDSWAPPABLE:
					if (!slot.beliefDef) {
						console.error(`panel-belief-picker: buildBeliefContainer() - No belief definition found for swappable slot`);
						return;
					}
					if (slot.toAddIndex === undefined) {
						console.error(`panel-belief-picker: buildBeliefContainer() - Slot toAddIndex was undefined!`);
						return;
					}
					const newReplaceableSlot: HTMLElement = this.createFilledSlotElement(slot.beliefDef);
					newReplaceableSlot.setAttribute("replacingIndex", slot.toAddIndex.toString());
					newReplaceableSlot.addEventListener('action-activate', () => {
						this.currentlySelectedBeliefSlot = newReplaceableSlot;
						this.openBeliefChooser(beliefClass);
						newReplaceableSlot.setAttribute("selected", "true");
					});
					container.appendChild(newReplaceableSlot);
					break;
				case BeliefPickerSlotState.FILLEDUNSWAPPABLE:
					if (!slot.beliefDef) {
						console.error(`panel-belief-picker: buildBeliefContainer() - No belief definition found for unswappable slot`);
						return;
					}
					const newUnreplacableSlot: HTMLElement = this.createFilledSlotElement(slot.beliefDef);
					container.appendChild(newUnreplacableSlot);
					break;
				default:
					break;
			}
		}

		this.canConfirm = !hasOpenSlot && this.beliefsToAdd.length > 0 && this.playerReligion == this.viewingReligion;
		if (this.canConfirm) {
			NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
		}
		else {
			NavTray.removeShellAction1();
		}
		this.beliefConfirmButton.setAttribute("disabled", (!this.canConfirm).toString());
		this.beliefConfirmButton.classList.toggle("hidden", this.playerReligion != this.viewingReligion || (!hasOpenSlot && this.beliefsToAdd.length == 0));
		const focusElement: HTMLElement = MustGetElement('.belief-picker_belief-choices', this.Root);
		FocusManager.setFocus(focusElement);
	}

	private buildBeliefIdentity(viewingReligion: PlayerReligion) {
		const beliefReligionName = MustGetElement(".belief-picker_belief-info-religion-name", this.Root);
		const beliefReligionIcon = MustGetElement(".belief-picker_belief-info-icon-image", this.Root);
		const beliefReligionFounder = MustGetElement(".belief-picker_belief-info-founder-name", this.Root);
		const beliefReligionHolyCity = MustGetElement(".belief-picker_belief-info-city-name", this.Root);
		const beliefReligionPercentFollowing = MustGetElement(".belief-picker_belief-info-percent-following", this.Root);

		beliefReligionPercentFollowing.setAttribute("data-l10n-id", Locale.compose("LOC_UI_ESTABLISH_BELIEFS_PERCENT_FOLLOWING", this.religionFollowingPercentages.get(viewingReligion)!));

		if (this.mustCreateReligion && viewingReligion == this.playerObject.Religion) {
			const religionDef = GameInfo.Religions.lookup(this.selectedReligionType);
			const baseReligionName = religionDef ? religionDef.Name : 'LOC_RELIGION_CUSTOM_NAME';

			if (this.customReligionName && this.customReligionName != baseReligionName) {
				beliefReligionName.setAttribute('data-l10n-id', Locale.fromUGC(baseReligionName, this.customReligionName));
			}
			else {
				beliefReligionName.setAttribute('data-l10n-id', baseReligionName);
			}

			beliefReligionIcon.style.backgroundImage = UI.getIconCSS(this.selectedReligionType, "RELIGION_DECO");
			beliefReligionFounder.setAttribute("data-l10n-id", Locale.compose("LOC_UI_ESTABLISH_RELIGION_FOUNDER", this.playerObject.name));
			beliefReligionHolyCity.setAttribute("data-l10n-id", Locale.compose("LOC_UI_ESTABLISH_RELIGION_HOLY_CITY", this.getHolyCityName()));
		}
		else if (viewingReligion.hasCreatedReligion()) {
			const religionDef: ReligionDefinition | null = GameInfo.Religions.lookup(viewingReligion.getReligionType());
			if (religionDef) {
				beliefReligionIcon.style.backgroundImage = UI.getIconCSS(religionDef.ReligionType, "RELIGION_DECO");
			}
			beliefReligionName.setAttribute('data-l10n-id', viewingReligion.getReligionName());

			const religionFounderName = Players.get(Game.Religion.getPlayerFromReligion(viewingReligion.getReligionType()))?.name
			if (!religionFounderName) {
				console.error(`panel-belief-picker: buildBeliefIdentity() - no leader name found for religion type ${viewingReligion.getReligionType()}!`);
				return;
			}

			beliefReligionFounder.setAttribute("data-l10n-id", Locale.compose("LOC_UI_ESTABLISH_RELIGION_FOUNDER", religionFounderName));
			beliefReligionHolyCity.setAttribute("data-l10n-id", Locale.compose("LOC_UI_ESTABLISH_RELIGION_HOLY_CITY", viewingReligion.getHolyCityName()));
		}
	}

	private createFilledBeliefPickerNode(beliefDef: BeliefDefinition): BeliefPickerChooserNode {
		let nodeIcon: string = "";
		switch (beliefDef.BeliefClassType) {
			case "BELIEF_CLASS_ENHANCER":
				nodeIcon = "fs://game/rel_bel_enhancer.png";
				break;
			case "BELIEF_CLASS_RELIQUARY":
				nodeIcon = "fs://game/rel_bel_reliquary.png";
				break;
			case "BELIEF_CLASS_FOUNDER":
				nodeIcon = "fs://game/rel_bel_founder.png";
				break;
		}

		const isSwappable = Game.Religion.isBeliefClaimable(beliefDef.BeliefType);
		return {
			name: beliefDef.Name,
			primaryIcon: nodeIcon,
			description: beliefDef.Description,
			isSwappable: isSwappable,
			isLocked: false
		}
	}

	private createFilledSlotElement(beliefDef: BeliefDefinition) {
		const filledSlot = document.createElement("belief-picker-chooser-item") as ComponentRoot<BeliefPickerChooserItem>;

		filledSlot.componentCreatedEvent.on((chooser) => {
			chooser.beliefPickerChooserNode = this.createFilledBeliefPickerNode(beliefDef);
		});


		return filledSlot;
	}

	private createOpenBeliefPickerNode(): BeliefPickerChooserNode {
		return {
			name: "",
			primaryIcon: "",
			description: "LOC_UI_ESTABLISH_BELIEFS_ADD_NEW_BELIEF",
			isLocked: false
		}
	}

	private createOpenSlotElement(beliefClass: string): HTMLElement {
		const openSlot = document.createElement("belief-picker-chooser-item") as ComponentRoot<BeliefPickerChooserItem>;
		openSlot.setAttribute("data-audio-group-ref", "audio-panel-belief-picker");
		openSlot.componentCreatedEvent.on((chooser) => {
			chooser.beliefPickerChooserNode = this.createOpenBeliefPickerNode();
		});

		openSlot.addEventListener('action-activate', () => {
			this.currentlySelectedBeliefSlot = openSlot;
			this.openBeliefChooser(beliefClass);
			openSlot.setAttribute("selected", "true");
		});

		return openSlot;
	}

	private createLockedBeliefPickerNode(beliefClass: string): BeliefPickerChooserNode {
		let lockedNodeDesc: string = "";
		let lockedNodeIcon: string = "";
		switch (beliefClass) {
			case "BELIEF_CLASS_ENHANCER":
				lockedNodeDesc = "LOC_UI_ESTABLISH_BELIEFS_ENHANCER_SLOT_LOCKED";
				lockedNodeIcon = "fs://game/rel_bel_enhancer.png";
				break;
			case "BELIEF_CLASS_RELIQUARY":
				lockedNodeDesc = "LOC_UI_ESTABLISH_BELIEFS_RELIC_SLOT_LOCKED";
				lockedNodeIcon = "fs://game/rel_bel_reliquary.png";
				break;
			case "BELIEF_CLASS_FOUNDER":
				lockedNodeDesc = "LOC_UI_ESTABLISH_BELIEFS_FOUNDER_SLOT_LOCKED";
				lockedNodeIcon = "fs://game/rel_bel_founder.png";
				break;
		}

		return {
			name: "",
			primaryIcon: lockedNodeIcon,
			description: lockedNodeDesc,
			isLocked: true
		}
	}

	private createLockedSlotElement(beliefClass: string): HTMLElement {

		const lockedSlot = document.createElement("belief-picker-chooser-item") as ComponentRoot<BeliefPickerChooserItem>;

		lockedSlot.componentCreatedEvent.on((chooser) => {
			chooser.beliefPickerChooserNode = this.createLockedBeliefPickerNode(beliefClass);
		});

		return lockedSlot;
	}

	private openBeliefChooser(beliefClass: string) {
		this.beliefChoiceMenu.classList.remove("hidden");

		const menuTitle: HTMLElement = MustGetElement(".belief-choice-menu_title", this.beliefChoiceMenu);
		const menuSubtitle: HTMLElement = MustGetElement(".belief-choice-menu_subtitle", this.beliefChoiceMenu);
		const menuList: HTMLElement = MustGetElement(".belief-choice-menu_list", this.beliefChoiceMenu);

		switch (beliefClass) {
			case "BELIEF_CLASS_ENHANCER":
				menuTitle.setAttribute("title", "LOC_UI_ESTABLISH_BELIEFS_CHOOSE_ENHANCER_BELIEF");
				menuSubtitle.setAttribute("data-l10n-id", "LOC_UI_ESTABLISH_BELIEFS_CHOOSE_ENHANCER_BELIEF_DESC");
				break;
			case "BELIEF_CLASS_RELIQUARY":
				menuTitle.setAttribute("title", "LOC_UI_ESTABLISH_BELIEFS_CHOOSE_RELIQUARY_BELIEF");
				menuSubtitle.setAttribute("data-l10n-id", "LOC_UI_ESTABLISH_BELIEFS_CHOOSE_RELIQUARY_BELIEF_DESC");
				break;
			case "BELIEF_CLASS_FOUNDER":
				menuTitle.setAttribute("title", "LOC_UI_ESTABLISH_BELIEFS_CHOOSE_FOUNDER_BELIEF");
				menuSubtitle.setAttribute("data-l10n-id", "LOC_UI_ESTABLISH_BELIEFS_CHOOSE_FOUNDER_BELIEF_DESC");
				break;
		}

		while (menuList.hasChildNodes()) {
			menuList.removeChild(menuList.lastChild!);
		}

		for (const belief of GameInfo.Beliefs) {
			if (belief.BeliefClassType == beliefClass) {
				menuList.appendChild(this.createBeliefChoice(belief));
			}
		}

		FocusManager.setFocus(menuList);
	}

	private createBeliefChoiceNode(belief: BeliefDefinition): PantheonChooserNode {
		let primaryIcon: string = "";
		switch (belief.BeliefClassType) {
			case "BELIEF_CLASS_ENHANCER":
				primaryIcon = "fs://game/rel_bel_enhancer.png";
				break;
			case "BELIEF_CLASS_RELIQUARY":
				primaryIcon = "fs://game/rel_bel_reliquary.png";
				break;
			case "BELIEF_CLASS_FOUNDER":
				primaryIcon = "fs://game/rel_bel_founder.png";
				break;
		}
		const isLocked: boolean = !Game.Religion.isBeliefClaimable(belief.$index) || this.beliefsToAdd.includes(belief.BeliefType);
		return {
			name: Locale.compose(belief.Name), primaryIcon: primaryIcon,
			description: Locale.stylize(belief.Description), isLocked: isLocked
		}
	}

	private createBeliefChoice(belief: BeliefDefinition): HTMLElement {
		const beliefChoice = document.createElement("pantheon-chooser-item") as ComponentRoot<PantheonChooserItem>;
		beliefChoice.setAttribute("data-audio-group-ref", "audio-panel-belief-picker");
		beliefChoice.setAttribute("data-audio-activate-ref", "data-audio-choose-belief");
		beliefChoice.classList.add("belief-choice");
		beliefChoice.setAttribute("tabIndex", "-1");
		beliefChoice.componentCreatedEvent.on((chooser) => {
			chooser.pantheonChooserNode = this.createBeliefChoiceNode(belief);
			if (!Game.Religion.isBeliefClaimable(belief.BeliefType) || this.beliefsToAdd.includes(belief.BeliefType)) {
				chooser.addLockStyling();
			}
		});
		if (Game.Religion.isBeliefClaimable(belief.$index) && !this.beliefsToAdd.includes(belief.BeliefType)) {
			beliefChoice.addEventListener("action-activate", () => {
				this.onBeliefChoiceMade(belief);
			});
		}
		return beliefChoice;
	}

	private calculateReligionPercentage(rType: ReligionType): string {
		let numSettlementsFollowingReligion = 0;
		let numSettlementsInWorld = 0;
		const playerList: PlayerLibrary[] = Players.getAlive();
		for (const player of playerList) {
			const playerCities: PlayerCities | undefined = player.Cities;
			if (!playerCities) {
				console.error(`panel-belief-picker: calculateReligionPercentage() - playerCities for player ${player.name} was undefined!`);
				continue;
			}
			const playerStats: PlayerStats | undefined = player.Stats;
			if (!playerStats) {
				console.error(`panel-belief-picker: calculateReligionPercentage() - playerStats for player ${player.name} was undefined!`);
				continue;
			}
			numSettlementsInWorld += playerCities.getCities().length;
			numSettlementsFollowingReligion += playerStats.getNumMyCitiesFollowingSpecificReligion(rType);
		}
		const religionPercent: number = Math.round((numSettlementsFollowingReligion / numSettlementsInWorld) * 100);
		const religionPercentString: string = Locale.compose("LOC_METAPROGRESSION_PERCENT", religionPercent.toString());
		return religionPercentString.toString();
	}

	private buildBeliefTabs() {
		const tabsContainer = MustGetElement(".belief-picker_belief-tabs", this.Root);

		let tabItems: TabItem[] = [];

		for (const pRel of this.allPlayerReligions) {

			const religionLabel: string = this.religionFollowingPercentages.get(pRel)!;
			let religionIcon: string = "";
			if (this.mustCreateReligion && pRel == this.playerReligion) {
				religionIcon = UI.getIconURL(this.selectedReligionType, "RELIGION_DECO");
			}
			else {
				const religionStringType = GameInfo.Religions.lookup(pRel.getReligionType())?.ReligionType;
				if (!religionStringType) {
					console.error("panel-belief-picker: buildBeliefTabs() - no religion string type for " + pRel.getReligionType);
				}
				else {
					religionIcon = UI.getIconURL(religionStringType, "RELIGION_DECO");
				}
			}
			tabItems.push({
				icon: religionIcon,
				id: "belief-picker-religions",
				label: religionLabel,
				className: "max-w-32",
				iconClass: "size-10 mr-2"
			});
		}
		tabsContainer.setAttribute("tab-items", JSON.stringify(tabItems));

		tabsContainer.addEventListener("tab-selected", this.onReligionTabSelectedListener);
	}

	private getNumFounderSlots(viewingReligion: PlayerReligion): number {
		if (this.mustCreateReligion) {
			return 1;
		}
		const numBeliefsEarned: number = viewingReligion.getNumBeliefsEarned();
		//beliefs unlocked in this order: reliquary -> founder -> enhancer -> founder -> founder
		switch (numBeliefsEarned) {
			case 1:
			case 2:
			case 3:
				return 1;
			case 4:
				return 2;
			case 5:
				return 3;
			default:
				return 0;
		}
	}

	private onBeliefChoiceMade(belief: BeliefDefinition) {
		let replacingIndex: number = -1;
		if (this.currentlySelectedBeliefSlot) {
			const replacingIndexString: string | null = this.currentlySelectedBeliefSlot.getAttribute("replacingIndex");
			if (replacingIndexString) {
				replacingIndex = Number(replacingIndexString);
			}
		}

		if (replacingIndex == -1) {
			this.beliefsToAdd.push(belief.BeliefType);
		}
		else {
			this.beliefsToAdd[replacingIndex] = belief.BeliefType;
		}
		this.beliefChoiceMenu.classList.add("hidden");
		this.buildBeliefWindow();

		const focusElement: HTMLElement | null = this.Root.querySelector<HTMLElement>('.belief-picker_belief-choices');
		if (focusElement) {
			FocusManager.setFocus(focusElement);
		}
	}

	private constructAllPlayerReligionInfo() {
		this.mustCreateReligion = this.playerReligion.canCreateReligion();

		if (this.mustCreateReligion) {
			//player religion library still exists even if we haven't created a religion. push this to create a tab in the beliefs window
			this.allPlayerReligions.push(this.playerReligion);
			this.religionFollowingPercentages.set(this.playerReligion, "0%");
		}

		for (const religion of GameInfo.Religions) {
			if (Game.Religion.hasBeenFounded(religion.ReligionType)) {
				const pLib: PlayerLibrary | null = Players.get(Game.Religion.getPlayerFromReligion(religion.ReligionType));
				if (!pLib) {
					console.error(`panel-belief-picker: constructAllPlayerReligionInfo() - Player library for religion ${religion.ReligionType} was null!`)
					continue;
				}
				const pRel: PlayerReligion | undefined = pLib.Religion;
				if (!pRel) {
					console.error(`panel-belief-picker: constructAllPlayerReligionInfo() - Player id ${pLib.id} had no religion!`);
					continue;
				}
				if (pRel == this.playerReligion) {
					this.allPlayerReligions.unshift(pRel);
				}
				else {
					this.allPlayerReligions.push(pRel);
				}
				this.religionFollowingPercentages.set(pRel, this.calculateReligionPercentage(pRel.getReligionType()));
			}
		}
	}

	private addAllBeliefs() {
		//sort beliefs to add. Reliquary beliefs must be added first
		for (let i = 0; i < this.beliefsToAdd.length; i++) {
			const bDef: BeliefDefinition | null = GameInfo.Beliefs.lookup(this.beliefsToAdd[i]);
			if (bDef?.BeliefClassType == "BELIEF_CLASS_RELIQUARY") {
				const t = this.beliefsToAdd[this.beliefsToAdd.length - 1];
				this.beliefsToAdd[this.beliefsToAdd.length - 1] = this.beliefsToAdd[i];
				this.beliefsToAdd[i] = t;
				break;
			}
		}
		this.addNextBelief();
	}

	private addNextBelief() {
		const beliefToAdd: BeliefType | undefined = this.beliefsToAdd.pop();
		if (!beliefToAdd) {
			this.close();
			return;
		}
		let args: any = {
			BeliefType: Database.makeHash(beliefToAdd.toString())
		};
		const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.ADD_BELIEF, args, false);
		if (result.Success) {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.ADD_BELIEF, args);
			const eventHandle: EventHandle = engine.on('BeliefAdded', () => {
				this.addNextBelief();
				eventHandle.clear();
			});
		}
		else {
			const beliefDef: BeliefDefinition | null = GameInfo.Beliefs.lookup(beliefToAdd);
			if (result.FailureReasons) {
				DialogBoxManager.createDialog_Confirm({
					title: formatStringArrayAsNewLineText(result.FailureReasons),
					body: beliefDef?.Name ?? ""
				});
			}
			else {
				console.error(`panel-belief-picker: addNextBelief() - Couldn't add belieftype ${Locale.compose(beliefDef?.Name ?? '')}`);
			}
			this.beliefsToAdd = [];
			this.buildBeliefWindow();
		}
	}

	private foundReligion() {
		const hashNum = Database.makeHash(this.selectedReligionType);
		let args: any = {
			ReligionType: hashNum
		};
		if (this.customReligionName) {
			args.ReligionCustomName = this.customReligionName;
		}
		const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.FOUND_RELIGION, args, false);
		if (result.Success) {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.FOUND_RELIGION, args);
			const eventHandle: EventHandle = engine.on("ReligionFounded", () => {
				this.backButton.classList.add("hidden");
				this.mustCreateReligion = false;
				this.addAllBeliefs();
				eventHandle.clear();
			});
		}
		else if (result.FailureReasons) {
			DialogBoxManager.createDialog_Confirm({
				title: formatStringArrayAsNewLineText(result.FailureReasons)
			});
		}
		else {
			console.error(`panel-belief-picker: foundReligion() - Couldn't add found religion of type ${args.ReligionType}!`);
		}
	}

	protected onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			if (!this.beliefChoiceMenu.classList.contains("hidden")) {
				this.onCloseBeliefChoiceMenu();
			}
			else if (this.mustCreateReligion && !this.playerReligion.hasCreatedReligion()) {
				this.onBackButton();
			}
			else {
				this.close();
			}
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
		if (inputEvent.detail.name == 'shell-action-1') {
			if (this.canConfirm) {
				this.onConfirm();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				Audio.playSound("data-audio-confirm", "audio-panel-belief-picker");
			}
		}
	}

	private onReligionTabSelected(e: TabSelectedEvent) {
		this.viewingReligion = this.allPlayerReligions[e.detail.index];
		this.buildBeliefWindow();
		if (!(this.beliefChoiceMenu.classList.contains("hidden"))) {
			this.onCloseBeliefChoiceMenu();
		}
	}
}

Controls.define('panel-belief-picker', {
	createInstance: PanelBeliefPicker,
	description: 'Belief picker',
	classNames: ['panel-belief-picker', 'fullscreen', 'pointer-events-auto', 'flex'],
	styles: ["fs://game/base-standard/ui/panel-belief-picker/panel-belief-picker.css"],
	content: ['fs://game/base-standard/ui/panel-belief-picker/panel-belief-picker.html'],
	attributes: []
});
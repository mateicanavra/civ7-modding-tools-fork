/**
 * @file mp-game-rules.ts		
 * @copyright 2023, Firaxis Games
 * @description Multiplayer Lobby Player Options  
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import MPLobbyModel from '/core/ui/shell/mp-staging/model-mp-staging-new.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';

class PanelMPPlayerOptions extends Panel {
	private rules: HTMLElement[] = [];
	private rulesContainer!: HTMLElement;
	private hostElement!: HTMLElement;
	private scrollableMods!: HTMLElement;
	private modsContainer!: HTMLElement;
	private engineInputListener = this.onEngineInput.bind(this);
	private closeButtonListener = this.onClose.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
	}

	onAttach() {
		super.onAttach();

		this.modsContainer = MustGetElement(".mods-container", this.Root);
		this.scrollableMods = MustGetElement(".mp-game-rules__mods-scrollable", this.Root);
		this.rulesContainer = MustGetElement(".mp-game-rules__rules", this.Root);
		this.hostElement = MustGetElement(".mp-game-rules__host", this.Root);
		const mods: HTMLElement = MustGetElement(".mp-game-rules__mods", this.Root);
		const closeButton: HTMLElement = MustGetElement("fxs-close-button", this.Root);

		this.modsContainer.classList.toggle("hidden", !UI.supportsDLC());

		this.Root.addEventListener('engine-input', this.engineInputListener);

		closeButton.addEventListener('action-activate', this.closeButtonListener);

		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();

		// --- Rules ---

		const hostPlayerID: number = Network.getHostPlayerId();
		const hostPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(hostPlayerID);

		const localPlatform: HostingType = Network.getLocalHostingPlatform();
		let curPlatform: HostingType = Network.getPlayerHostingPlatform(hostPlayerID);
		if (localPlatform != curPlatform) {
			curPlatform = HostingType.HOSTING_TYPE_UNKNOWN;
		}

		let platformIcon: string = "none";
		const tempIcon: string | undefined = NetworkUtilities.getHostingTypeURL(curPlatform);
		if (tempIcon) {
			platformIcon = tempIcon;
		}

		const hostGamertag: string = Locale.compose(hostPlayerConfig.slotName);
		const hostGamertagRule = this.addRule(this.hostElement, Locale.compose("LOC_UI_MP_GAME_RULE_HOST"), hostGamertag, platformIcon == "none" ? undefined : `url('${platformIcon}')`);
		hostGamertagRule?.classList.remove("max-w-96");

		const playerCountRule = this.addRule(this.rulesContainer, Locale.compose("LOC_UI_MP_GAME_RULE_HUMAN_PLAYER_COUNT"), `${gameConfig.humanPlayerCount}/${gameConfig.maxJoinablePlayerCount}`);
		if (playerCountRule) { this.rules.push(playerCountRule); }

		const aiPlayerCount: number = gameConfig.maxJoinablePlayerCount - gameConfig.humanPlayerCount;
		const aiPlayerCountRule = this.addRule(this.rulesContainer, Locale.compose("LOC_UI_MP_GAME_RULE_AI_PLAYER_COUNT"), aiPlayerCount.toString());
		if (aiPlayerCountRule) { this.rules.push(aiPlayerCountRule); }

		const isPrivate: boolean = gameConfig.isPrivateGame;
		const isPrivateRule = this.addRule(this.rulesContainer, "LOC_UI_MP_GAME_RULE_PRIVATE_GAME", isPrivate ? "LOC_GENERIC_YES" : "LOC_GENERIC_NO");
		if (isPrivateRule) { this.rules.push(isPrivateRule); }

		const difficultyNameRule = this.addRule(this.rulesContainer, "LOC_UI_MP_LOBBY_DIFFICULTY", MPLobbyModel.difficulty ?? "?");
		if (difficultyNameRule) { this.rules.push(difficultyNameRule); }

		const mapRuleSet = this.addRule(this.rulesContainer, "LOC_UI_MP_LOBBY_RULE_SET", MPLobbyModel.summaryMapRuleSet ?? "?");
		if (mapRuleSet) { this.rules.push(mapRuleSet); }

		const mapType = this.addRule(this.rulesContainer, "LOC_UI_MP_LOBBY_MAP_TYPE", MPLobbyModel.summaryMapType ?? "?");
		if (mapType) { this.rules.push(mapType); }

		const mapSize = this.addRule(this.rulesContainer, "LOC_UI_MP_LOBBY_MAP_SIZE", MPLobbyModel.summaryMapSize ?? "?");
		if (mapSize) { this.rules.push(mapSize); }

		const gameSpeed = this.addRule(this.rulesContainer, "LOC_UI_MP_LOBBY_GAME_SPEED", MPLobbyModel.summarySpeed ?? "?");
		if (gameSpeed) { this.rules.push(gameSpeed); }

		const turnTimerType: TurnTimerType = gameConfig.turnTimerType;
		let ruleTurnTimerText: string = "DBG Invalid Turn Timer enum value";
		switch (turnTimerType) {
			case TurnTimerType.TURNTIMER_NONE:
				ruleTurnTimerText = "LOC_UI_MP_GAME_RULE_TURN_TIMER_NONE";
				break;

			case TurnTimerType.TURNTIMER_STANDARD:
				ruleTurnTimerText = "LOC_UI_MP_GAME_RULE_TURN_TIMER_STANDARD";
				break;

			case TurnTimerType.TURNTIMER_DYNAMIC:
				ruleTurnTimerText = "LOC_UI_MP_GAME_RULE_TURN_TIMER_DYNAMIC";
				break;

			default:
				console.error("mp-game-rules: onAttach(): Invalid Turn Timer enum value (" + turnTimerType + ")");
				ruleTurnTimerText += " (" + turnTimerType + ")";
				break;
		}

		const ruleTurnTimerRule = this.addRule(this.rulesContainer, Locale.compose("LOC_UI_MP_GAME_RULE_TURN_TIMER"), Locale.compose(ruleTurnTimerText));
		if (ruleTurnTimerRule) { this.rules.push(ruleTurnTimerRule); }

		const turnTimerTime: number = gameConfig.turnTimerTime;
		if (turnTimerType == TurnTimerType.TURNTIMER_STANDARD) {
			const ruleTurnTime = this.addRule(this.rulesContainer, Locale.compose("LOC_UI_MP_GAME_RULE_TURN_TIME"), `${turnTimerTime}`);
			if (ruleTurnTime) {
				this.rules.push(ruleTurnTime);
			}
		}

		const turnPhaseType: TurnPhaseType = gameConfig.turnPhaseType;
		let ruleTurnPhaseText: string = "DBG Invalid Turn Phase enum value";
		switch (turnPhaseType) {
			case TurnPhaseType.NO_TURN_PHASE:
				ruleTurnPhaseText = "LOC_UI_MP_GAME_RULE_TURN_MODE_NONE";
				break;
			case TurnPhaseType.TURNPHASE_SINGLEPLAYER:
				ruleTurnPhaseText = "LOC_UI_MP_GAME_RULE_TURN_MODE_SINGLEPLAYER";
				break;
			case TurnPhaseType.TURNPHASE_SIMULTANEOUS:
				ruleTurnPhaseText = "LOC_UI_MP_GAME_RULE_TURN_MODE_SIMULTANEOUS";
				break;
			default:
				console.error("mp-game-rules: onAttach(): Invalid Turn Phase enum value (" + turnPhaseType + ")");
				ruleTurnPhaseText += " (" + turnPhaseType + ")";
				break;
		}

		const ruleTurnPhaseRule = this.addRule(this.rulesContainer, Locale.compose("LOC_UI_MP_GAME_RULE_TURN_MODE"), Locale.compose(ruleTurnPhaseText));
		if (ruleTurnPhaseRule) { this.rules.push(ruleTurnPhaseRule); }

		const startAgeName: string | null = gameConfig.startAgeName;
		if (startAgeName == null) {
			console.error("mp-game-rules: onAttach(): Missing start age name");
		}
		const startAgeNameRule = this.addRule(this.rulesContainer, Locale.compose("LOC_UI_MP_GAME_RULE_STARTING_AGE"), startAgeName ?? "DBG Missing start age name");
		if (startAgeNameRule) { this.rules.push(startAgeNameRule); }

		const isKickVoting: boolean = gameConfig.isKickVoting;
		const isKickVotingRule = this.addRule(this.rulesContainer, "LOC_UI_MP_GAME_RULE_KICK_VOTING", isKickVoting ? "LOC_GENERIC_YES" : "LOC_GENERIC_NO");
		if (isKickVotingRule) { this.rules.push(isKickVotingRule); }

		// --- Mods ---
		const modsFragment: DocumentFragment = document.createDocumentFragment();
		const modsToExclude = new Set<string>(Modding.getModulesToExclude());
		const modTitlesToList: string[] = [];
		const enabledModCount: number = gameConfig.enabledModCount;
		for (let modIndex = 0; modIndex < enabledModCount; ++modIndex) {
			const modId = gameConfig.getEnabledModId(modIndex);
			if (modId && !modsToExclude.has(modId)) {
				let bundle = gameConfig.getEnabledModTitle(modIndex);
				if (bundle) {
					modTitlesToList.push(Locale.unpack(bundle));
				}
			}
		}
		modTitlesToList.sort((a, b) => Locale.compare(a, b));

		for (const title of modTitlesToList) {
			const mod: HTMLElement = document.createElement("div");
			mod.classList.add("font-body-base", "text-accent-2");
			mod.innerHTML = title;
			modsFragment.appendChild(mod);
		}

		mods.appendChild(modsFragment);

		waitForLayout(() => this.updateRules());
	}

	private addRule(parent: HTMLElement, ruleLabelTxt: string, ruleValueTxt: string, ruleIcon: string | undefined = undefined) {
		if (!parent) {
			console.error("mp-game-rules: addRule(): Invalid parent");
			return;
		}

		const ruleRow: HTMLElement = document.createElement("div");
		ruleRow.classList.add("flex", "flow-row", "items-center", "min-w-60", "max-w-96", "px-2");

		const ruleLabel: HTMLElement = document.createElement("div");
		ruleLabel.classList.add("font-bold", "font-body-base", "mr-2");

		ruleLabel.setAttribute('data-l10n-id', ruleLabelTxt);

		ruleRow.appendChild(ruleLabel);

		if (ruleIcon) {
			const icon: HTMLElement = document.createElement("div");
			icon.classList.add("w-7", "h-7", "mb-2", "mr-2", "bg-cover", "bg-no-repeat");
			icon.style.backgroundImage = ruleIcon;
			ruleRow.appendChild(icon);
		}

		const ruleValue: HTMLElement = document.createElement("div");
		ruleValue.classList.add("font-body-base", "text-accent-3", "flex-auto", "font-fit-shrink", "whitespace-nowrap");

		ruleValue.setAttribute('data-l10n-id', ruleValueTxt);

		ruleRow.appendChild(ruleValue);

		parent.appendChild(ruleRow);
		return ruleRow;
	}

	private updateRules() {
		const maxWidth = this.rules.reduce((prevRule, currRule) => currRule.getBoundingClientRect().width > prevRule.getBoundingClientRect().width ? currRule : prevRule).getBoundingClientRect().width;
		this.rules.forEach(rule => rule.style.setProperty("width", `${maxWidth}px`));
		this.rulesContainer.style.setProperty("width", `${maxWidth * 2}px`);
		this.hostElement.style.setProperty("width", `${maxWidth * 2}px`);
	}

	onDetach(): void {
		this.Root.removeEventListener('engine-input', this.engineInputListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		FocusManager.setFocus(this.scrollableMods);
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private handleEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return false;
		}

		switch (inputEvent.detail.name) {
			case 'cancel':
			case 'keyboard-escape':
				this.onClose();
				return true;
		}

		return false
	}

	private onClose() {
		this.close();
	}
}

Controls.define('screen-mp-game-rules', {
	createInstance: PanelMPPlayerOptions,
	description: 'Create popup for Multiplayer Lobby Player Options.',
	classNames: ['mp-game-rules', 'fullscreen', 'flow-row', 'justify-center', 'items-center'],
	content: ['fs://game/core/ui/shell/mp-staging/mp-game-rules.html'],
	attributes: [],
	tabIndex: -1
});
/**
 * @file send-to-panel.ts
 * @copyright 2023, Firaxis Games
 * @description Multiplayer Chat SendTo panel
 */

import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { mapChatTargetTypeToImageClass, PrivateSelectEvent } from '/core/ui/mp-chat/screen-mp-chat.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';

export class SendToPanel extends Panel {
	readonly globalChatIndex: number = 0;

	private targetsContainer!: HTMLElement;
	private targetElements: HTMLElement[] = [];
	private targetProfileIcons: HTMLElement[] = [];
	private targetMuteIcons: HTMLElement[] = [];
	private targets: ChatTargetEntry[] = [];
	private scrollableContainer!: HTMLElement;

	private currentFocusIndex: number = 0;

	private engineInputListener = this.onEngineInput.bind(this);
	private targetActivateListener = this.onTargetActivate.bind(this);
	private targetFocusListener = this.onTargetFocusListener.bind(this);
	private windowEngineInputListener = this.onWindowEngineInput.bind(this);
	private targetProfileActivateListener = this.onTargetProfileActivate.bind(this);
	private targetMuteActivateListener = this.onTargetMuteActivate.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
	}

	onInitialize() {
		super.onInitialize();

		this.targets = Network.getChatTargets();

		this.Root.innerHTML = this.getContent();

		this.targetsContainer = MustGetElement(".send-to-panel__targets-container", this.Root);
		this.targetElements = Array.from(this.targetsContainer.querySelectorAll<HTMLElement>(".send-to-panel__targets-item"));
		this.targetProfileIcons = Array.from(this.targetsContainer.querySelectorAll<HTMLElement>(".send-to-panel__targets-profile"));
		this.targetMuteIcons = Array.from(this.targetsContainer.querySelectorAll<HTMLElement>(".send-to-panel__targets-mute"));
		this.scrollableContainer = MustGetElement(".send-to-panel__container", this.Root);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "chat-target-panel");
	}

	onAttach() {
		super.onAttach();
		window.addEventListener("engine-input", this.windowEngineInputListener, true);
		engine.on('MultiplayerPlayerConnected', this.onPlayerConnected, this);
		engine.on('MultiplayerPostPlayerDisconnected', this.onPlayerDisconnected, this);
		engine.on('PlayersSwapped', this.onPlayersSwapped, this);

		this.Root.addEventListener('engine-input', this.engineInputListener);

		this.targetElements.forEach(elem => {
			elem.addEventListener("action-activate", this.targetActivateListener);
			elem.addEventListener("focus", this.targetFocusListener);
			elem.addEventListener("mouseenter", this.targetFocusListener);
		});

		this.targetProfileIcons.forEach(element => {
			element.addEventListener('action-activate', this.targetProfileActivateListener);
		});

		this.targetMuteIcons.forEach(element => {
			element.addEventListener('action-activate', this.targetMuteActivateListener);
		});

		this.updateTargetProfileIcons();
		this.updateTargetMuteIcons();
	}

	onDetach() {
		window.removeEventListener("engine-input", this.windowEngineInputListener, true);
		engine.off('MultiplayerPlayerConnected', this.onPlayerConnected, this);
		engine.off('MultiplayerPostPlayerDisconnected', this.onPlayerDisconnected, this);
		engine.off('PlayersSwapped', this.onPlayersSwapped, this);
	}

	onReceiveFocus() {
		super.onReceiveFocus();
		FocusManager.setFocus(this.scrollableContainer);
		NavTray.clear();
	}

	private getContent() {
		return `
			<div class="bg-primary-5 pt-2 px-2 flow-column flex-1 pointer-events-auto">
				<div class="font-title-sm font-fit-shrink whitespace-nowrap text-secondary mb-1 mr-7" data-l10n-id="LOC_UI_CHAT_SEND_TO"></div>
				<fxs-vslot class="send-to-panel__container flex-auto pr-2" data-navrule-up="stop" data-navrule-down="stop" data-navrule-left="stop" data-navrule-right="stop">
					<fxs-scrollable class="send-to-panel__scrollable" handle-gamepad-pan="true">
						<div class="send-to-panel__targets-container pb-1">
							${this.targets.map(({ targetType, targetID, targetName }, index) => `
								<fxs-hslot class="flex-auto flow-row items-center p-1 pr-2" ignore-prior-focus="true">
									<fxs-activatable class="send-to-panel__targets-item shrink flow-row items-center group" tabindex="-1" index="${index}">
										<div class="tint-bg-accent-3 group-hover\\:tint-bg-accent-1 group-focus\\:tint-bg-accent-1 w-6 h-6 mr-1 ${mapChatTargetTypeToImageClass[targetType]}"></div>
										<div class="font-fit-shrink whitespace-nowrap font-body-sm text-accent-3 group-hover\\:text-accent-1 group-focus\\:text-accent-1" data-l10n-id="${targetName}"></div>
									</fxs-activatable>
									<fxs-activatable class="send-to-panel__targets-profile flow-row items-center ml-2 relative group" tabindex="-1" data-tooltip-alignment="top-right" data-tooltip-content="LOC_UI_MP_PLAYER_OPTIONS_VIEW_PROFILE" index="${index}">
										<div class="send-to-panel__profile w-6 h-6 bg-contain bg-center bg-no-repeat tint-bg-accent-3 group-hover\\:tint-bg-accent-1 group-focus\\:tint-bg-accent-1" style="background-image:url('${NetworkUtilities.getHostingTypeURL(HostingType.HOSTING_TYPE_XBOX)}')"></div>
									</fxs-activatable>
									<fxs-activatable class="send-to-panel__targets-mute flow-row items-center ml-2 relative group" tabindex="-1" data-tooltip-alignment="top-right" data-tooltip-content="${this.getMuteLocString(targetID)}" index="${index}">
										<div class="send-to-panel__mute w-6 h-6 bg-contain bg-center bg-no-repeat tint-bg-accent-3 group-hover\\:tint-bg-accent-1 group-focus\\:tint-bg-accent-1" style="background-image:url('${this.getShowMutedIcon(targetID)}')"></div>
									</fxs-activatable>
								</fxs-hslot>
							`).join("")}
						</div>
					</fxs-scrollable>
				</fxs-vslot>
			</div>
			<fxs-nav-help class="absolute -top-3 -right-5" action-key="inline-cancel"></fxs-nav-help>
		`;
	}

	private getMuteLocString(playerId: number): string {
		return Network.isPlayerMuted(playerId) ? "LOC_UI_MP_PLAYER_OPTIONS_UNMUTE" : "LOC_UI_MP_PLAYER_OPTIONS_MUTE";
	}

	private isTargetSendToPanelTrayHidden(index: number): boolean {
		return this.currentFocusIndex != index || index == this.globalChatIndex;
	}

	private isTargetProfileHidden(index: number) {
		return !Online.Social.canViewProfileWithLobbyPlayerId(this.targets[index].targetID) || this.isTargetSendToPanelTrayHidden(index);
	}

	private updateTargetProfileIcons() {
		this.targetProfileIcons.forEach(element => {
			const index: number = parseInt((element as HTMLElement).getAttribute("index") ?? `${this.globalChatIndex}`);
			element.classList.toggle("hidden", this.isTargetProfileHidden(index));
		});
	}

	private updateTargetMuteIcons(): void {
		this.targetMuteIcons.forEach(element => {
			const index: number = parseInt((element as HTMLElement).getAttribute('index') ?? `${this.globalChatIndex}`);
			element.classList.toggle("hidden", this.isTargetSendToPanelTrayHidden(index));

			const isTeamTarget = this.targets[index].targetType == ChatTargetTypes.CHATTARGET_TEAM;
			if (isTeamTarget) {
				this.updateTeamMutedIcon(element, this.targets[index].targetID);
			}
			else {
				this.updatePlayerOrGlobalMutedIcon(element, this.targets[index].targetID);
			}
		});
	}

	private getShowMutedIcon(playerId: number): string {
		return `fs://game/${Network.isPlayerMuted(playerId) ? 'mpicon_unmute' : 'mpicon_mute'}.png`;
	}

	private onTargetActivate({ target }: ActionActivateEvent) {
		const index = parseInt((target as HTMLElement).getAttribute("index") ?? `${this.globalChatIndex}`);
		this.selectTargetByIndex(index);
	}

	private selectTargetByIndex(index: number) {
		this.Root.dispatchEvent(new PrivateSelectEvent(this.targets[index]));
		this.close();
	}

	private onTargetFocusListener({ target }: FocusEvent) {
		this.currentFocusIndex = parseInt((target as HTMLElement).getAttribute("index") ?? `${this.globalChatIndex}`);
		this.updateTargetProfileIcons();
		this.updateTargetMuteIcons();
	}

	private onTargetProfileActivate({ target }: ActionActivateEvent) {
		const index: number = parseInt((target as HTMLElement).getAttribute("index") ?? `${this.globalChatIndex}`);
		const playerId: number = this.targets[index].targetID;
		Online.Social.viewProfile(Online.Social.getPlayerFriendID_Network(playerId), Online.Social.getPlayerFriendID_T2GP(playerId));
		this.close();
	}

	private onTargetMuteActivate({ target }: ActionActivateEvent) {
		const element: HTMLElement = target as HTMLElement;
		const index: number = parseInt(element.getAttribute("index") ?? `${this.globalChatIndex}`);
		const targetID: number = this.targets[index].targetID;
		const isTeamChat: boolean = this.targets[index].targetType == ChatTargetTypes.CHATTARGET_TEAM;
		if (isTeamChat) {
			for (let i = 0; i < this.targets.length; ++i) {
				if (this.targets[i].targetType == ChatTargetTypes.CHATTARGET_PLAYER) {
					const playerId = this.targets[i].targetID;
					const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(playerId)
					if (playerConfig.team == targetID) {
						this.handleMuteButtonClicked(this.targets[i].targetID, element);
					}
				}
			}
			this.updateTeamMutedIcon(element, targetID);
		}
		else {
			this.handleMuteButtonClicked(targetID, element);
		}
	}

	private updatePlayerOrGlobalMutedIcon(element: HTMLElement, playerId: number) {
		this.updateMutedIcon(element, Network.isPlayerMuted(playerId));
	}

	private updateTeamMutedIcon(element: HTMLElement, teamID: number) {
		const chatData: any = { isTeamChatAvailable: false };
		const isChatMuted: boolean = this.isTeamChatMuted(teamID, chatData);
		this.updateMutedIcon(element, isChatMuted, chatData.isTeamChatAvailable);
	}

	private updateMutedIcon(element: HTMLElement, isMuted: boolean, isChatAvailable: boolean = true) {
		const iconElement: HTMLElement = MustGetElement(".send-to-panel__mute", element);
		iconElement.style.backgroundImage = `url("${`fs://game/${isMuted ? 'mpicon_unmute' : 'mpicon_mute'}.png`}")`;
		element.setAttribute("data-tooltip-content", isChatAvailable ? isMuted ?
			"LOC_UI_MP_PLAYER_OPTIONS_UNMUTE" : "LOC_UI_MP_PLAYER_OPTIONS_MUTE" : "LOC_UI_MP_PLAYER_OPTIONS_CHAT_UNAVAILABLE");
	}

	private handleMuteButtonClicked(playerId: number, element: HTMLElement) {
		const isMuted: boolean = Network.isPlayerMuted(playerId);
		Network.setPlayerMuted(playerId, !isMuted);
		this.updatePlayerOrGlobalMutedIcon(element, playerId);
	}

	private isTeamChatMuted(teamID: number, outData: { isTeamChatAvailable: boolean }): boolean {
		let chatIsMuted: boolean = true;
		let teammateCount: number = 0;
		for (let i = 0; i < this.targets.length; ++i) {
			if (this.targets[i].targetType == ChatTargetTypes.CHATTARGET_PLAYER) {
				const playerId = this.targets[i].targetID;
				const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(playerId)
				if (playerConfig.team == teamID) {
					++teammateCount;

					if (chatIsMuted && !Network.isPlayerMuted(playerId)) {
						chatIsMuted = false;
					}
				}
			}
		}

		outData.isTeamChatAvailable = teammateCount > 0;
		return chatIsMuted;
	}

	private onPlayerConnected() {
		this.close();
	}

	private onPlayerDisconnected() {
		this.close();
	}

	private onPlayersSwapped() {
		// Players swapping player slots invalidates the send to panel's data.
		this.close();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (!this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private handleEngineInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		if (inputEvent.isCancelInput()) {
			this.close();
			return false;
		}

		return true;
	}

	private onWindowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}
		switch (inputEvent.detail.name) {
			case 'mousebutton-left':
			case 'touch-tap':
				const target = inputEvent.target as HTMLElement;
				if (
					!this.Root.contains(target) &&
					target?.tagName != "SEND-TO-PANEL"
				) {
					this.close();
				}
				if (!this.Root.contains(target)) {
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
		}
	}
}

Controls.define('send-to-panel', {
	createInstance: SendToPanel,
	description: 'Multiplayer Chat SendTo panel.',
	classNames: ['send-to-panel', 'trigger-nav-help', 'absolute', 'bottom-0', '-left-3', 'max-w-full', 'min-w-32', 'max-h-60', 'flow-column'],
	attributes: [],
});

declare global {
	interface HTMLElementTagNameMap {
		'send-to-panel': ComponentRoot<SendToPanel>
	}
}
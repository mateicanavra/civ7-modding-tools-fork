/**
 * @file panel-action
 * @copyright 2019-2025, Firaxis Games
 * @description The panel which hosts the main action button for progressing to the next turn and activating turn blocking notifications.
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import { NotificationModel, NotificationType } from '/base-standard/ui/notification-train/model-notification-train.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { SpriteSheetAnimation } from '/core/ui/utilities/animations.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js'
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';

const TURN_BLOCKING_NOTIFICATION_ICON_COUNT = 8;

interface NotificationInfo {
	id: ComponentID,
	type: NotificationType,
	severity: number;
}

interface NotificationSlotInfo {
	notificationId: ComponentID | null;
	notificationType: NotificationType | null;
	parentEle: HTMLElement;
	bgEle: HTMLElement;
	iconEle: HTMLElement;
}

/**
 * Area for sub system button icons.
 */
export class PanelAction extends Panel {
	private actionButton = document.createElement("fxs-activatable");
	private notificationIcon = document.createElement("div");
	private actionText = document.createElement("p");
	private lastPlayerMessageContainer: HTMLElement | null = null;
	private navHelpContainer: HTMLElement | null = null;
	private lastPlayerMessageVisibility = false;
	private pleaseWaitAnimation = new SpriteSheetAnimation(this.notificationIcon, { imageName: "blp:ntf_pleasewait_anim", rows: 4, cols: 4, frames: 10 }, 1000);

	private static actionIconCache = new ImageCache();
	private updateGate = new UpdateGate(this.onUpdate.bind(this));
	private engineInputListener = this.onEngineInput.bind(this);
	private activeDeviceChangedEventListener = this.onActiveDeviceChanged.bind(this);
	private nextActionHotKeyListener = this.tryEndTurn.bind(this);
	private centerButtonAnimListener = this.centerButtonAnimEnd.bind(this);

	private notificationSlots: NotificationSlotInfo[] = new Array<NotificationSlotInfo>(TURN_BLOCKING_NOTIFICATION_ICON_COUNT);

	onInitialize() {
		this.animateInType = this.animateOutType = AnchorType.RelativeToBottom;
		const frag = document.createDocumentFragment();

		const actionPanelContainer = document.createElement("div");
		actionPanelContainer.classList.add("action-panel__button", "primary-action-button", "tut-action-button");

		const actionButtonBk = document.createElement("div");
		actionButtonBk.classList.add("action-panel__button-bk");
		actionPanelContainer.appendChild(actionButtonBk);

		const actionButtonGear = document.createElement("div");
		actionButtonGear.classList.add("action-panel__button-gear", "absolute", "pointer-events-none");
		actionPanelContainer.appendChild(actionButtonGear);

		const actionButtonMain = document.createElement("div");
		actionButtonMain.classList.add("action-panel__button-main");
		actionPanelContainer.appendChild(actionButtonMain);

		const actionButtonDecor = document.createElement("div");
		actionButtonDecor.classList.add("action-panel__button-decor");
		actionPanelContainer.appendChild(actionButtonDecor);

		const actionButtonUnitBracket = document.createElement("div");
		actionButtonUnitBracket.classList.add("action-panel__unit-bracket");
		actionPanelContainer.appendChild(actionButtonUnitBracket);

		const actionButtonTextPlateContainer = document.createElement("div");
		actionButtonTextPlateContainer.classList.add("action-panel__button-txt-plate-container", "flex", "flex-col", "absolute", "items-end");
		actionPanelContainer.appendChild(actionButtonTextPlateContainer);

		if (Configuration.getGame().isAnyMultiplayer) {
			this.lastPlayerMessageContainer = document.createElement("div");
			this.lastPlayerMessageContainer.classList.add("action-panel__last-player-message", "mb-4", "-mr-4", "px-2", "text-shadow", "hidden");
			actionButtonTextPlateContainer.appendChild(this.lastPlayerMessageContainer);

			const lastPlayerMessageBackground = document.createElement("div");
			lastPlayerMessageBackground.classList.add("action-panel__last-player-message-background");
			this.lastPlayerMessageContainer.appendChild(lastPlayerMessageBackground);

			const lastPlayerMessageText = document.createElement("div");
			lastPlayerMessageText.classList.add("action-panel__last-player-message-text");
			lastPlayerMessageText.setAttribute('data-l10n-id', "LOC_ACTION_PANEL_LAST_PLAYER_MESSAGE");
			lastPlayerMessageBackground.appendChild(lastPlayerMessageText);

			if (this.isLastPlayerInMPTurn()) {
				this.lastPlayerMessageShow();
			}
		}


		const actionButtonTextPlate = document.createElement("div");
		actionButtonTextPlate.classList.add("action-panel__button-txt-plate", "relative");
		actionButtonTextPlateContainer.appendChild(actionButtonTextPlate);

		const actionButtonTxtPlateBk = document.createElement("div");
		actionButtonTxtPlateBk.classList.add("action-panel__button-txt-plate__bk");
		actionButtonTextPlate.appendChild(actionButtonTxtPlateBk);

		this.navHelpContainer = document.createElement('div');
		this.navHelpContainer.classList.add('action-panel__nav-help-container');
		this.navHelpContainer.classList.toggle('gamepad-active', ActionHandler.isGamepadActive);

		actionButtonTextPlate.appendChild(this.navHelpContainer);

		const navHelp = document.createElement('fxs-nav-help');
		navHelp.setAttribute("action-key", 'inline-next-action');
		navHelp.setAttribute("decoration-mode", 'border');
		this.navHelpContainer.appendChild(navHelp);

		const navHelpExt = document.createElement('div');
		navHelpExt.classList.add('action-panel__nav-help-ext');
		this.navHelpContainer.appendChild(navHelpExt);


		this.actionText.classList.add("action-panel__button-txt-plate__text", 'text-right', 'relative', "font-title", "text-xs", "tut-action-panel", "tut-action-text", "uppercase", "font-fit-shrink");
		this.actionText.setAttribute('data-tooltip-content', "LOC_ACTION_PANEL_TAKE_THE_NEXT_ACTION");
		actionButtonTextPlate.appendChild(this.actionText);

		this.actionButton.classList.add("action-panel__button-next-action");
		this.actionButton.setAttribute('data-tooltip-content', Locale.compose("LOC_ACTION_PANEL_TAKE_THE_NEXT_ACTION"));
		this.actionButton.setAttribute("data-audio-group-ref", "turn-action");
		this.actionButton.setAttribute("data-audio-activate-ref", "data-audio-activate");

		actionPanelContainer.appendChild(this.actionButton);

		const actionButtonNotificationContainer = document.createElement("div");
		actionButtonNotificationContainer.classList.add('absolute', 'inset-0', 'pointer-events-none');

		// Turn blocking notification icons
		for (let i = 1; i <= TURN_BLOCKING_NOTIFICATION_ICON_COUNT; i++) {
			const actionButtonNotification = document.createElement("fxs-activatable");
			actionButtonNotification.classList.add("action-panel__button-notification");
			actionButtonNotification.setAttribute("data-audio-group-ref", "turn-action");
			actionButtonNotification.setAttribute("data-audio-press-ref", "none");
			actionButtonNotification.setAttribute("data-audio-activate-ref", "none");
			actionButtonNotification.setAttribute("data-audio-focus-ref", "none");

			actionButtonNotificationContainer.appendChild(actionButtonNotification);

			const actionButtonBk = document.createElement("div");
			actionButtonBk.classList.add("action-panel__button-notification__bk");
			actionButtonNotification.appendChild(actionButtonBk);

			const actionButtonNotificationIcon = document.createElement("div");
			actionButtonNotificationIcon.classList.add("action-panel__button-notification__icon");
			actionButtonBk.appendChild(actionButtonNotificationIcon);

			actionButtonNotification.addEventListener('action-activate', this.onActionPanelBlockerActivated);

			this.notificationSlots[i - 1] = {
				notificationId: null,
				notificationType: null,
				parentEle: actionButtonNotification,
				bgEle: actionButtonBk,
				iconEle: actionButtonNotificationIcon
			};
		}

		actionPanelContainer.appendChild(actionButtonNotificationContainer);

		this.actionButton.setAttribute("data-tut-highlight", "founderHighlight");

		this.notificationIcon.classList.add("action-panel__button-next-action__icon");
		this.actionButton.appendChild(this.notificationIcon);

		const notificationIconHover = this.notificationIcon.cloneNode() as HTMLElement;
		notificationIconHover.classList.add("action-panel__button-next-action__icon--hover");
		this.actionButton.appendChild(notificationIconHover);

		const notificationIconActive = this.notificationIcon.cloneNode() as HTMLElement;
		notificationIconActive.classList.add("action-panel__button-next-action__icon--active");
		this.actionButton.appendChild(notificationIconActive);

		this.actionButton.addEventListener('action-activate', this.onActionButton.bind(this));

		frag.appendChild(actionPanelContainer);
		this.Root.appendChild(frag);
		this.updateGate.call('onInitialize');
	}

	onAttach() {
		super.onAttach();

		engine.on('AutoplayEnded', this.onAutoplayEnd, this);
		engine.on('AutoplayStarted', this.onAutoplayStarted, this);
		engine.on('GameStarted', this.onGameStarted, this);
		engine.on('LocalPlayerChanged', this.onLocalPlayerChanged, this);
		engine.on('LocalPlayerTurnBegin', this.onLocalPlayerTurnBegin, this);
		engine.on('LocalPlayerTurnEnd', this.onLocalPlayerTurnEnd, this);
		engine.on('NotificationAdded', this.onNotificationAdded, this);
		engine.on('NotificationDismissed', this.onNotificationDismissed, this);
		engine.on('PlayerTurnActivated', this.onPlayerTurnActivated, this);
		engine.on('PlayerTurnDeactivated', this.onPlayerTurnDeactivated, this);
		engine.on('RemotePlayerTurnBegin', this.remotePlayerTurnChanged, this);
		engine.on('RemotePlayerTurnEnd', this.remotePlayerTurnChanged, this);
		engine.on('UnitMoved', this.onUnitMoved, this);
		engine.on('UnitBermudaTeleported', this.onUnitBermudaTeleported, this);
		engine.on('UnitOperationStarted', this.onUnitOperationStart, this);
		engine.on('UnitAddedToMap', this.onUnitNumModified, this);
		engine.on('UnitRemovedFromMap', this.onUnitNumModified, this);

		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedEventListener);
		window.addEventListener('engine-input', this.engineInputListener);
		window.addEventListener('hotkey-next-action', this.nextActionHotKeyListener);
	}

	private onActiveDeviceChanged() {
		this.navHelpContainer?.classList.toggle('gamepad-active', ActionHandler.isGamepadActive);
	}

	onDetach() {
		engine.off('AutoplayEnded', this.onAutoplayEnd, this);
		engine.off('AutoplayStarted', this.onAutoplayStarted, this);
		engine.off('GameStarted', this.onGameStarted, this);
		engine.off('LocalPlayerChanged', this.onLocalPlayerChanged, this);
		engine.off('LocalPlayerTurnBegin', this.onLocalPlayerTurnBegin, this);
		engine.off('LocalPlayerTurnEnd', this.onLocalPlayerTurnEnd, this);
		engine.off('NotificationAdded', this.onNotificationAdded, this);
		engine.off('NotificationDismissed', this.onNotificationDismissed, this);
		engine.off('PlayerTurnActivated', this.onPlayerTurnActivated, this);
		engine.off('PlayerTurnDeactivated', this.onPlayerTurnDeactivated, this);
		engine.off('RemotePlayerTurnBegin', this.remotePlayerTurnChanged, this);
		engine.off('RemotePlayerTurnEnd', this.remotePlayerTurnChanged, this);
		engine.off('UnitMoved', this.onUnitMoved, this);
		engine.off('UnitBermudaTeleported', this.onUnitBermudaTeleported, this);
		engine.off('UnitOperationStarted', this.onUnitOperationStart, this);
		engine.off('UnitAddedToMap', this.onUnitNumModified, this);
		engine.off('UnitRemovedFromMap', this.onUnitNumModified, this);

		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedEventListener);
		window.removeEventListener('engine-input', this.engineInputListener);
		window.removeEventListener('hotkey-next-action', this.nextActionHotKeyListener);

		super.onDetach();
	}

	private onGameStarted() {
		this.updatePlayerFocus(GameContext.localPlayerID);
	}

	private onActionPanelBlockerActivated = (event: ActionActivateEvent) => {
		if (!(event.target instanceof HTMLElement)) return;

		const notificationId = this.notificationSlots.find(slot => slot.parentEle === event.target)?.notificationId;

		if (notificationId) {
			Game.Notifications.activate(notificationId);
		}
	}

	private disableButton() {
		this.Root.classList.add("disabled", "action-panel--disabled");
		this.actionButton?.classList.add("disabled");
	}

	private enableButton() {
		this.Root.classList.remove("disabled", "action-panel--disabled");
		this.actionButton?.classList.remove("disabled");
	}

	disableActionButton() {
		this.disableButton();
	}

	enableActionButton() {
		if (!Autoplay.isActive) {
			this.enableButton();
		}
	}

	/**
	 * Engine callback - autoplay ended
	 */
	private onAutoplayEnd() {
		this.enableButton();
		this.notificationIcon?.classList.remove('hidden');
	}

	/**
	 * Engine callback - autoplay started
	 */
	private onAutoplayStarted() {
		this.disableButton();
	}

	private onLocalPlayerTurnBegin() {
		this.enableButton();
	}

	private onLocalPlayerTurnEnd() {
		PanelAction.actionIconCache.unloadAllImages();

		// In multiplayer, players can unready their turn so the button should not be disabled.
		if (!Configuration.getGame().isAnyMultiplayer) {
			this.disableButton();
		}

		// Trigger an update so the button can change state to Please Wait.
		this.updateGate.call('onLocalPlayerTurnEnd');
	}

	private remotePlayerTurnChanged(data: RemotePlayerTurnState_EventData) {

		// In multiplayer, a remote human player changing their turn status affects the Please Wait tooltip for the local player.
		if (Configuration.getGame().isAnyMultiplayer) {
			const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(data.turnPlayer);
			if (playerConfig.isHuman) {
				// Trigger an update as this might affect the Please Wait tooltip.
				this.updateGate.call('remotePlayerTurnChanged');
			}
		}
	}

	private updatePlayerFocus(playerId: PlayerId) {
		if (UI.getOption("user", "Interface", "NotificationCameraPan") == 0) {
			return;
		}

		// If there is an end turn blocking notification we should focus the camera on it
		const endTurnBlockingType = Game.Notifications.getEndTurnBlockingType(playerId);
		if (endTurnBlockingType != EndTurnBlockingTypes.NONE) {
			// If the focus happens to be a unit we should also select that unit
			if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DEFAULT") && endTurnBlockingType == EndTurnBlockingTypes.UNITS) {
				const selectedUnitID = UI.Player.getHeadSelectedUnit();
				if (!selectedUnitID) {
					const nextReadyUnitID = UI.Player.getFirstReadyUnit();
					if (nextReadyUnitID) {
						UI.Player.lookAtID(nextReadyUnitID);
						UI.Player.selectUnit(nextReadyUnitID);
						return;
					}
				}
			}
			else {
				// We only want to update camera lookat position if the player is not working with a unit
				if (!ComponentID.isValid(UI.Player.getHeadSelectedUnit())) {
					const endTurnBlockingNotificationId = Game.Notifications.findEndTurnBlocking(playerId, endTurnBlockingType);
					if (endTurnBlockingNotificationId) {
						NotificationModel.manager.lookAt(endTurnBlockingNotificationId);
						return;
					}
				}
			}
		}

	}

	private onUpdate() {
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		this.refreshActionButton(localPlayerID);
		this.updatePlayerFocus(localPlayerID);
	}

	private playNextActionAnimation(iconElement: HTMLElement, animation: string, iconURL: string) {
		iconElement.style.backgroundImage = "none";
		iconElement.classList.remove("animate-in", "animate-out", "animate-swap");
		requestAnimationFrame(() => {
			iconElement.style.backgroundImage = `url(${iconURL})`;
			iconElement.classList.add(animation);
		});
	}

	private playBlockerAnimation(slot: NotificationSlotInfo, animation: string) {
		slot.bgEle.classList.remove("animate-in", "animate-out", "animate-swap");
		requestAnimationFrame(() => {
			slot.bgEle.classList.add(animation);
		});
	}

	private showBlockerIcon(slot: NotificationSlotInfo, notification: NotificationInfo) {
		const notificationId = notification.id;

		if (!notificationId) {
			console.error("showBlockerIcon called without notificationId set");
			return;
		}

		slot.parentEle.classList.remove("pointer-events-none", "opacity-0");
		const iconName = Icon.getNotificationIconFromID(notificationId);
		const iconUrl = notificationId ? `url(${iconName})` : "";
		slot.iconEle.style.backgroundImage = iconUrl;
		const message = Game.Notifications.getMessage(notificationId);

		if (message) {
			slot.parentEle.setAttribute('data-tooltip-content', Locale.compose(message));
		} else {
			slot.parentEle.removeAttribute('data-tooltip-content');
		}

		if (slot.notificationType === null) {
			UI.sendAudioEvent(Audio.getSoundTag('data-audio-turn-action-appear', 'turn-action'));
			this.playBlockerAnimation(slot, "animate-in");
		} else {
			// TODO: Change to animate-shift, if a shift animation gets defined
			this.playBlockerAnimation(slot, "animate-in");
		}

		slot.notificationType = notification.type;
		slot.notificationId = notification.id;
	}

	private hideBlockerIcon(slot: NotificationSlotInfo) {
		slot.parentEle.classList.add("pointer-events-none");
		slot.parentEle.removeAttribute('data-tooltip-content');

		if (slot.notificationType !== null) {
			this.playBlockerAnimation(slot, "animate-out");
		} else {
			slot.parentEle.classList.add("opacity-0");
		}

		slot.notificationType = null;
		slot.notificationId = null;
	}

	private getNotificationInfo(notificationId: ComponentID) {
		const type = Game.Notifications.getType(notificationId);

		if (type) {
			return {
				id: notificationId,
				type: type,
				severity: Game.Notifications.getSeverity(notificationId) ?? 0
			} as NotificationInfo;
		}

		return null;
	}

	private refreshActionButton(playerID: PlayerId) {
		this.navHelpContainer?.classList.remove('action-available');

		if (Players.isValid(playerID)) {
			const player = Players.get(playerID);
			if (!player) {
				console.error("panel-action: local player has valid id #" + playerID + ", but could not obtain a valid player object.");
				return;
			}

			// TODO: Use the NotificationModel to get the blocking notifications.
			const endTurnBlockingType: EndTurnBlockingType = Game.Notifications.getEndTurnBlockingType(playerID);
			const endTurnBlockingNotificationId = Game.Notifications.findEndTurnBlocking(playerID, endTurnBlockingType);
			const notificationIds = Game.Notifications.getIdsForPlayer(playerID) ?? [];

			// Get valid, blocking notification info, sorted by severity, filtering out actions which match the primary action
			// Note: This needs to stay matched to the sorting order of getEndTurnBlockingType
			const notificationInfos = notificationIds
				.map(id => this.getNotificationInfo(id))
				.filter(n => n != null && Game.Notifications.getBlocksTurnAdvancement(n.id) && !ComponentID.isMatch(n.id, endTurnBlockingNotificationId))
				.sort((a, b) => b!.severity - a!.severity) as NotificationInfo[];

			if (notificationIds) {
				let requiresRearrange = false;
				let validNotifications: NotificationInfo[] = [];

				for (const notificationInfo of notificationInfos) {
					const iconSrc = Icon.getNotificationIconFromID(notificationInfo.id);
					PanelAction.actionIconCache.loadImage(iconSrc);
				}

				// Search for the first notification of each type and check if we need to rearrange
				for (let i = 0; i < notificationInfos.length && validNotifications.length < TURN_BLOCKING_NOTIFICATION_ICON_COUNT; ++i) {
					const info = notificationInfos[i];

					if (!validNotifications.some(n => n.type == info.type)) {
						validNotifications.push(info);

						if (!this.notificationSlots.some(s => s.notificationType === info.type)) {
							requiresRearrange = true;
						}
					}
				}

				// running count of the number of notification icons we are adding. Used to space out the sound of them appearing
				let radialNotifCount = 0

				// Update slots from front to back
				for (let i = 0; i < TURN_BLOCKING_NOTIFICATION_ICON_COUNT; ++i) {
					const slot = this.notificationSlots[i];

					// If we are re-arranging use notifications in order. Otherwise, find the ones that match current slots.
					const notification = requiresRearrange
						? validNotifications[i]
						: validNotifications.find(n => n.type === slot.notificationType);

					if (!notification) {
						// No notification - hide the slot if its not currently empty
						slot.parentEle.setAttribute("data-audio-press-ref", "none");
						slot.parentEle.setAttribute("data-audio-activate-ref", "none");
						this.hideBlockerIcon(slot);
					} else if (slot.notificationType != notification.type) {
						// Notification Type changed - shift or show the slot
						radialNotifCount++;
						slot.parentEle.setAttribute("data-audio-press-ref", "data-audio-notif-press");
						slot.parentEle.setAttribute("data-audio-activate-ref", "data-audio-notif-release");
						slot.parentEle.setAttribute("data-audio-focus-ref", "data-audio-notif-focus");
						Audio.playSound("data-audio-notif-" + radialNotifCount, "turn-action");
						this.showBlockerIcon(slot, notification);
					} else {
						// Notification type did not change - only update the id
						slot.notificationId = notification.id;
					}
				}
			}

			// Show that we're waiting on the turn if we are not turn active or have sent turn complete and are waiting for our 
			// turn to complete.  We need to check hasSentTurnComplete() because a UI update can occur between
			// sending turn complete (PlayerTurnComplete netmessage) and that message being processed.
			if (player.isTurnActive == false || GameContext.hasSentTurnComplete()) {
				this.setEndTurnWaiting();
				return;
			}

			this.navHelpContainer?.classList.add('action-available');

			let foundNotification: boolean = false;
			if (endTurnBlockingType != EndTurnBlockingTypes.NONE) {
				// Yes, get the Id of the notification
				if (endTurnBlockingNotificationId) {
					// Get the instance of the notification
					const endTurnBlockingNotification = Game.Notifications.find(endTurnBlockingNotificationId);
					if (endTurnBlockingNotification) {
						let message = Game.Notifications.getMessage(endTurnBlockingNotificationId);
						if (message) {
							this.pleaseWaitAnimation.stop();
							const iconSrc = Icon.getNotificationIconFromID(endTurnBlockingNotificationId, "BUBBLE");

							this.playNextActionAnimation(this.notificationIcon, "animate-in", iconSrc);
							this.notificationIcon.addEventListener("animationend", this.centerButtonAnimListener);

							const notificationTypeName = Game.Notifications.getTypeName(endTurnBlockingNotification.Type);
							switch (notificationTypeName) {
								case "NOTIFICATION_CHOOSE_CITY_PRODUCTION":
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-city-production-ready', 'city-actions'));
									break;

								case "NOTIFICATION_NEW_POPULATION":
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-city-growth-ready', 'city-growth'));
									break;

								case "NOTIFICATION_CHOOSE_TECH":
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-tech-tree-ready', 'audio-screen-tech-tree-chooser'));
									break;

								case "NOTIFICATION_CHOOSE_CULTURE_NODE":
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-culture-tree-chooser-ready', 'audio-screen-culture-tree-chooser'));
									break;

								case "NOTIFICATION_CHOOSE_GOVERNMENT":
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-policy-chooser-ready', 'audio-policy-chooser'));
									break;

								case "NOTIFICATION_CHOOSE_GOLDEN_AGE":
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-golden-age-chooser-ready', 'golden-age-chooser'));
									break;
							}

							this.actionButton.setAttribute('data-tooltip-content', Locale.compose(message));
							this.actionText.textContent = Locale.compose(message);
							this.Root.classList.add("new-notification");
							foundNotification = true;
						}
					}
				}
			}
			else if (this.showRemainingMovesState()) {
				// This is a UI only state.
				const message: string = "LOC_ACTION_PANEL_UNIT_MOVES_REMAINING";
				const tooltip: string = "LOC_ACTION_PANEL_UNIT_MOVES_REMAINING_TT";
				const iconSrc: string = UI.getIconURL("NOTIFICATION_COMMAND_UNITS", "BUBBLE");
				this.pleaseWaitAnimation.stop();
				this.notificationIcon.style.backgroundImage = `url(${iconSrc})`;
				this.actionButton.setAttribute('data-tooltip-content', Locale.compose(tooltip));
				this.actionText.textContent = Locale.compose(message);
				this.Root.classList.add("new-notification");
				foundNotification = true;
			}
			else if (Configuration.getUser().isAutoEndTurn == true
				&& !GameContext.hasSentTurnUnreadyThisTurn()) { // Don't auto end turn if the player has unreadied their turn during this game turn.
				this.sendEndTurn();
			}

			if (!foundNotification) {
				this.actionText.textContent = Locale.compose("LOC_ACTION_PANEL_NEXT_TURN");
				this.actionButton.setAttribute('data-tooltip-content', Locale.compose("LOC_ACTION_PANEL_NEXT_TURN"));
				this.pleaseWaitAnimation.stop();
				const iconSrc: string = UI.getIconURL("NEXT_TURN", "NOTIFICATION");
				this.notificationIcon.style.backgroundImage = `url(${iconSrc})`;
				this.Root.classList.remove("new-notification");
			}
		}
		else {
			this.notificationIcon?.classList.add('hidden');

			if (Autoplay.isActive) {
				this.actionButton.setAttribute('data-tooltip-content', Locale.compose("LOC_ACTION_PANEL_AUTO_PLAYING"));
				this.actionText.textContent = Locale.compose("LOC_ACTION_PANEL_AUTO_PLAYING");
			}
			else {
				this.actionButton.setAttribute('data-tooltip-content', Locale.compose("LOC_ACTION_PANEL_PLEASE_WAIT"));
				this.actionText.textContent = Locale.compose("LOC_ACTION_PANEL_PLEASE_WAIT");
				this.pleaseWaitAnimation.start();
			}
		}
	}

	private centerButtonAnimEnd(event: AnimationEvent) {
		if (event.animationName == "turnActionScale") {

			const endTurnBlockingType: EndTurnBlockingType = Game.Notifications.getEndTurnBlockingType(GameContext.localPlayerID);
			const endTurnBlockingNotificationId = Game.Notifications.findEndTurnBlocking(GameContext.localPlayerID, endTurnBlockingType);
			if (endTurnBlockingNotificationId) {
				NotificationModel.manager.playAudio(endTurnBlockingNotificationId, "Add");
			}

			event.target?.removeEventListener("animationend", this.centerButtonAnimListener);
		}
	}

	// Set the end turn button to the approprate "Please Wait" state.
	private setEndTurnWaiting() {
		if (!this.actionButton) {
			console.error("panel-action: unable to find the action button element during setEndTurnWaiting!");
			return;
		}

		if (!this.actionText) {
			console.error("panel-action: unable to find the action text element during setEndTurnWaiting!");
			return;
		}

		if (!this.notificationIcon) {
			console.error("panel-action: unable to find the notification icon element during setEndTurnWaiting!");
			return;
		}

		let activePlayersList = "";
		let buttonText = "";
		let tooltip = "";

		if (Configuration.getGame().isAnyMultiplayer) {
			const playerList: PlayerLibrary[] = Players.getAlive();
			for (const player of playerList) {
				if (player.isHuman && player.isTurnActive) {
					const playerName = player.name.replace(new RegExp(' ', 'g'), '&nbsp;');
					activePlayersList += `[N]${playerName}`;
				}
			}
		}

		// If there are no more active players the AI turn is happening and the player has no more control
		if (activePlayersList == "") {
			buttonText = Locale.compose("LOC_ACTION_PANEL_PLEASE_WAIT");
			tooltip = Locale.compose("LOC_ACTION_PANEL_PLEASE_WAIT");
			this.navHelpContainer?.classList.remove('action-available');
		} else {
			// If the local player is waiting on other players, they can still unend there turn
			buttonText = Locale.compose("LOC_ACTION_PANEL_WAITING_FOR_PLAYERS");
			tooltip = Locale.compose("LOC_ACTION_PANEL_WAITING_FOR_PLAYERS_TT");
			tooltip += activePlayersList;
			this.navHelpContainer?.classList.add('action-available');
		}

		this.actionButton.setAttribute('data-tooltip-content', tooltip);
		this.actionText.textContent = buttonText;
		this.pleaseWaitAnimation.start();
	}

	canEndTurn(): boolean {
		const endTurnBlockingType: EndTurnBlockingType = Game.Notifications.getEndTurnBlockingType(GameContext.localPlayerID);
		if (endTurnBlockingType != EndTurnBlockingTypes.NONE) {
			return false;
		}

		if (this.showRemainingMovesState()) {
			return false;
		}

		return true;
	}

	canUnreadyTurn(): boolean {
		if (!Players.isValid(GameContext.localPlayerID)) {
			return false;
		}

		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (localPlayer) {
			return localPlayer.canUnreadyTurn;
		}

		return false;
	}

	showRemainingMovesState(): boolean {
		// Check to see if there is a "ready" unit and then check to see if it has already moved
		// this respects the options while also preventing turn ending with units that have not moved at all
		const firstReadyID: ComponentID | null = UI.Player.getFirstReadyUnit();
		if (firstReadyID && !Configuration.getUser().isUnitCycle_RemainingMoves) {
			const unit = Units.get(firstReadyID);
			return (unit != null && unit.canMove && !unit.hasMoved)
		}

		if (!Configuration.getUser().isUnitCycle_RemainingMoves) {
			return false;
		}
		// Check to see if there is a "ready" unit (unit with movement remaining).
		if (!firstReadyID) {
			return false;
		}

		return true;
	}

	private queueUpdateIfLocalPlayer(player: PlayerId | null) {
		if (player != null) {
			const localPlayerID: PlayerId = GameContext.localPlayerID;
			if (player == localPlayerID) {
				this.updateGate.call('queueUpdateIfLocalPlayer');
			}
			if (Configuration.getGame().isAnyMultiplayer) {
				const playerList: PlayerLibrary[] = Players.getAlive();
				for (const player of playerList) {
					if (player.isHuman && player.isTurnActive) {
					}
				}
			}
		}
	}

	private tryEndTurn() {
		if (this.canUnreadyTurn()) {
			this.sendUnreadyTurn();
		}
		else if (!GameContext.hasSentTurnComplete()) {
			if (this.canEndTurn()) {
				this.sendEndTurn();
			} else {
				this.activateBlockingNotification();
			}
		}
	}

	// Sends turn complete if we haven't already and sets the end turn button to Please Wait.
	private sendEndTurn() {
		if (!GameContext.hasSentTurnComplete()) {
			this.setEndTurnWaiting();
			UI.Player.deselectAllUnits();
			GameContext.sendTurnComplete();
			UI.sendAudioEvent(Audio.getSoundTag('data-audio-turn-action-complete', 'turn-action'));
		}
	}

	private sendUnreadyTurn() {
		GameContext.sendUnreadyTurn();
	}

	private activateBlockingNotification() {
		let endTurnBlockingType = Game.Notifications.getEndTurnBlockingType(GameContext.localPlayerID);
		if (endTurnBlockingType != EndTurnBlockingTypes.NONE) {
			let endTurnBlockingNotificationId = Game.Notifications.findEndTurnBlocking(GameContext.localPlayerID, endTurnBlockingType);
			if (endTurnBlockingNotificationId) {
				Game.Notifications.activate(endTurnBlockingNotificationId);
				return;
			}
		}

		if (this.showRemainingMovesState()) {
			// Use the CommandUnits notification handler to be consistent in our unit cycle behavior.
			const commandUnitType: number = Game.getHash("NOTIFICATION_COMMAND_UNITS");
			let commandUnitHandler: NotificationModel.Handler | null = NotificationModel.manager.findHandler(commandUnitType);
			if (commandUnitHandler) {
				const dummyCompID: ComponentID = ComponentID.make(-1, -1, -1);
				commandUnitHandler.activate(dummyCompID);
				return;
			}
		}
	}

	onPlayerTurnActivated(data: PlayerTurnActivated_EventData) {
		this.queueUpdateIfLocalPlayer(data.player);

		const localPlayerID: PlayerId = GameContext.localPlayerID;
		if (data.player == localPlayerID) {
			this.updatePlayerFocus(data.player);
		}
	}

	onLocalPlayerChanged() {
		this.updateGate.call('onLocalPlayerChanged');
	}

	onNotificationAdded(data: Notification_EventData) {
		this.queueUpdateIfLocalPlayer(data.id?.owner);
	}

	onNotificationDismissed(data: Notification_EventData) {
		this.queueUpdateIfLocalPlayer(data.id?.owner);
	}

	private onActionButton(_event: ActionActivateEvent) {
		// Completely ignore clicks if on auto-play or disabled.
		if (Autoplay.isActive || this.actionButton?.classList.contains("disabled")) {
			return;
		}

		// only play the click sound if clicking the button will do something
		if (!GameContext.hasSentTurnComplete()
			|| this.canUnreadyTurn()) {

			this.actionButton?.classList.add("action-panel__button--activate");

			setTimeout(() => {
				this.actionButton?.classList.remove("action-panel__button--activate");
			}, 125);
		}
		this.tryEndTurn();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			// Ensure we only process FINISH events to avoid double triggering because we're listening at the 'window' level
			return;
		}

		if (inputEvent.detail.name == 'force-end-turn') {
			this.sendEndTurn();
		}
	}

	onActionNextAction(event: Event) {
		this.tryEndTurn();
		event.preventDefault();
		event.stopPropagation();
	}

	private onPlayerTurnDeactivated(_data: PlayerTurnDeactivated_EventData) {
		if (this.isLastPlayerInMPTurn()) {
			this.lastPlayerMessageShow();
		}
		else {
			this.lastPlayerMessageHide();
		}
	}

	private isLastPlayerInMPTurn(): boolean {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error(`panel-action: isLastPlayerInMPTurn - no local player found with id ${GameContext.localPlayerID}`);
			return false;
		}
		if (!Players.isValid(localPlayer.id)) {
			console.error(`panel-action: isLastPlayerInMPTurn - local player somehow isn't valid?!`);
			return false;
		}
		if (!localPlayer.isTurnActive) {
			return false;
		}
		if (Configuration.getGame().isAnyMultiplayer) {
			const playerList: PlayerLibrary[] = Players.getAlive();
			for (const player of playerList) {
				//if another player who isn't me still has an active turn, then the game isn't waiting on me exclusively
				if (player.isHuman && player.isTurnActive && player.id != localPlayer.id) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	private lastPlayerMessageShow() {
		if (this.lastPlayerMessageContainer && !this.lastPlayerMessageVisibility) {
			this.lastPlayerMessageContainer.classList.remove('hidden');
			this.lastPlayerMessageContainer.classList.add('show');
			this.lastPlayerMessageVisibility = true;
		}
		Audio.playSound("data-audio-mp-waiting-on-you", "turn-action");
	}

	private lastPlayerMessageHide() {
		if (this.lastPlayerMessageContainer && this.lastPlayerMessageVisibility) {
			this.lastPlayerMessageContainer.classList.remove('show');
			this.lastPlayerMessageContainer.classList.add('hidden');
			this.lastPlayerMessageVisibility = false;
		}
	}

	private onUnitOperationStart(data: UnitOperation_EventData) {
		if (data.unit.owner == GameContext.localPlayerID) {
			this.updateGate.call('onUnitOperationStart');
		}
	}

	private onUnitNumModified(data: UnitAddedToMap_EventData) {
		if (data.unit.owner !== GameContext.localPlayerID) {
			return;
		}

		this.refreshActionButton(GameContext.localPlayerID);
	}

	private onUnitMoved(data: UnitMoved_EventData) {
		const selectedUnitID = UI.Player.getHeadSelectedUnit();
		if (!ComponentID.isMatch(data.unit, selectedUnitID)) {
			// Not relevant to our selected unit
			return;
		}

		if (ComponentID.isValid(selectedUnitID)) {
			const selectedUnit: Unit | null = Units.get(selectedUnitID);
			if (selectedUnit) {
				const currentUnitMovesRemaining = selectedUnit.Movement?.movementMovesRemaining ?? 0;
				if (currentUnitMovesRemaining > 0) {
					// Current unit still has moves so no need to update anything
					return;
				}
			}
		}

		this.tryAutoUnitCycle();

		this.updateGate.call('onUnitMoved');
	}

	private onUnitBermudaTeleported(data: UnitAndPosition_EventData) {
		// Specific to Bermuda event, TDB exact visuals
		if (data.unit.owner == GameContext.localPlayerID) {
			delayByFrame(() => {
				UI.Player.lookAtID(data.unit);
				Audio.playSound("data-audio-unit-bermuda-teleported-reappear", "audio-unit")
			}, 200);
		}
	}

	private tryAutoUnitCycle() {
		if (!Configuration.getUser().isAutoUnitCycle) {
			// Setting is disabled so ignore
			return;
		}

		const nextReadyUnitID = UI.Player.selectNextReadyUnit();
		if (ComponentID.isValid(nextReadyUnitID)) {
			UI.Player.lookAtID(nextReadyUnitID);
			const unitLocation: float2 | undefined = Units.get(nextReadyUnitID)?.location;
			if (unitLocation) {
				PlotCursor.plotCursorCoords = unitLocation;
			}
		}
	}
}

Controls.define('panel-action', {
	createInstance: PanelAction,
	description: 'Area for sub system button icons.',
	classNames: ['action-panel', 'allowCameraMovement'],
	styles: ["fs://game/base-standard/ui/action/panel-action.css"],
	images: [
		'fs://game/hud_notif_bk.png',
		'fs://game/hud_turn_txt_plate.png',
		'fs://game/hud_turn_decor.png',
		'fs://game/hud_turn_bk.png',
		'fs://game/hud_turn_gear.png',
		'fs://game/hud_turn_main.png',
		'blp:ntf_next_turn'
	]
});

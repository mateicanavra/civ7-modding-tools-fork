/**
 * @file panel-notification-train.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Show a "train" of notifications resulting from the previous turn.
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import { NotificationID, NotificationModel } from '/base-standard/ui/notification-train/model-notification-train.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js'
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Navigation } from '/core/ui/input/navigation-support.js';
import ViewManager from '/core/ui/views/view-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

const DEBUG_dummy_notifications: number = 0; // How many dummy notifications should we add in onAttach()?

namespace NotificationView {
	type NotificationViewButton = {
		id: ComponentID;
		element: HTMLElement | null;
	}

	export class ViewItem extends NotificationModel.TypeEntry {
		root: HTMLElement | null = null;
		button: NotificationViewButton = { id: ComponentID.getInvalidID(), element: null };
		needsUpdate: boolean = false;
	}

	export interface ViewItemMap {
		[index: number]: ViewItem | null;
	}

	export type NotificationContainerInfo = {
		viewItem: ViewItem;
		notificationContainer: HTMLElement;
		typeContainer: HTMLElement;
	};
}

// The View class for the Notifications.
// This gets events from the model and presents the notifications to the user.
// This currently assumes the notifications are grouped by type, and each type group
// has one or more instance IDs inside.
// TODO: Put this in the NotificationView namespace and just call it Panel?
class PanelNotificationTrain extends Panel {

	private needUpdate: boolean = false;
	private needRebuild: boolean = false;
	private toRemoveIds: NotificationID[] = [];
	private toAddIds: NotificationID[] = [];

	private notificationList = document.createElement("fxs-vslot");

	private viewItems: NotificationView.ViewItemMap = {};

	private readonly focusNotificationsListener = this.onFocusNotifications.bind(this);
	private readonly notificationEngineInputListener = this.onNotificationEngineInput.bind(this);
	private readonly notificationActivatedListener = this.onNotificationActivated.bind(this);
	private readonly actionActivateNotificationListener = this.onActionActivateNotification.bind(this);

	private readonly notificationAddedEventListener = this.onNotificationAdded.bind(this);
	private readonly notificationRemovedEventListener = this.onNotificationRemoved.bind(this);
	private readonly notificationHighlightEventListener = this.onNotificationHighlight.bind(this);
	private readonly notificationUnHighlightEventListener = this.onNotificationUnHighlight.bind(this);
	private readonly notificationRebuildEventListener = this.onNotificationRebuild.bind(this);
	private readonly notificationUpdateEventListener = this.onNotificationUpdate.bind(this);
	private readonly notificationHideEventListener = this.onNotificationHide.bind(this);

	private dummyNotificationId = 0; // Internally used to avoid id conflicts on the dummy notifications

	private navHelpContainer: HTMLElement | null = null;

	private numAnimatingNotifs: number = 0;

	private activeDeviceChangedListener = this.onActiveDeviceChanged.bind(this);

	onInitialize(): void {
		super.onInitialize();

		this.animateInType = this.animateOutType = AnchorType.Fade;

		const notificationTrainDecor = document.createElement("div");
		notificationTrainDecor.classList.add("notification-train__decor");

		this.navHelpContainer = document.createElement("div");
		this.navHelpContainer.classList.add('notification-train__nav-help-container');
		this.navHelpContainer.classList.toggle('gamepad-active', ActionHandler.isGamepadActive);
		notificationTrainDecor.appendChild(this.navHelpContainer)

		const navHelp = document.createElement("fxs-nav-help");
		navHelp.setAttribute('action-key', 'inline-notification');
		navHelp.setAttribute('decoration-mode', 'border');
		this.navHelpContainer.appendChild(navHelp);

		const navHelpExt = document.createElement('div');
		navHelpExt.classList.add('notification-train__nav-help-ext');
		this.navHelpContainer.appendChild(navHelpExt);

		this.Root.appendChild(notificationTrainDecor);
		this.notificationList.classList.add("flex-col", 'notification-train__list');
		this.notificationList.setAttribute('data-navrule-up', 'stop');
		this.notificationList.setAttribute('data-navrule-down', 'stop');
		this.notificationList.setAttribute('data-navrule-left', 'stop');
		this.notificationList.setAttribute('data-navrule-right', 'stop');
		this.Root.appendChild(this.notificationList);

		this.rebuild();
	}

	onAttach() {
		super.onAttach();

		NotificationModel.manager.eventNotificationAdd.on(this.notificationAddedEventListener);
		NotificationModel.manager.eventNotificationRemove.on(this.notificationRemovedEventListener);
		NotificationModel.manager.eventNotificationHighlight.on(this.notificationHighlightEventListener);
		NotificationModel.manager.eventNotificationUnHighlight.on(this.notificationUnHighlightEventListener);
		NotificationModel.manager.eventNotificationRebuild.on(this.notificationRebuildEventListener);
		NotificationModel.manager.eventNotificationUpdate.on(this.notificationUpdateEventListener);
		NotificationModel.manager.eventNotificationHide.on(this.notificationHideEventListener);

		window.addEventListener('focus-notifications', this.focusNotificationsListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);

		for (let i = 0; i < DEBUG_dummy_notifications; i++) {
			this.createDebugViewItem(i);
		}
	}

	onDetach() {
		NotificationModel.manager.eventNotificationAdd.off(this.notificationAddedEventListener);
		NotificationModel.manager.eventNotificationRemove.off(this.notificationRemovedEventListener);
		NotificationModel.manager.eventNotificationHighlight.off(this.notificationHighlightEventListener);
		NotificationModel.manager.eventNotificationUnHighlight.off(this.notificationUnHighlightEventListener);
		NotificationModel.manager.eventNotificationRebuild.off(this.notificationRebuildEventListener);
		NotificationModel.manager.eventNotificationUpdate.off(this.notificationUpdateEventListener);
		NotificationModel.manager.eventNotificationHide.off(this.notificationHideEventListener);

		window.removeEventListener('focus-notifications', this.focusNotificationsListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);

		super.onDetach();
	}

	private onActiveDeviceChanged() {
		this.navHelpContainer?.classList.toggle('gamepad-active', ActionHandler.isGamepadActive);
	}

	private onNotificationHighlight(notificationID: ComponentID) {
		const viewItem: NotificationView.ViewItem | null = this.findViewItemByID(notificationID);
		if (!viewItem) {
			console.error(`panel-notification-train: Couldn't find ViewItem for notification ${ComponentID.toLogString(notificationID)}`);
			return;
		}

		if (viewItem.button.element) {
			viewItem.button.element.classList.add("notif__highlight");
		}
	}

	private onNotificationUnHighlight(notificationID: ComponentID) {
		const viewItem: NotificationView.ViewItem | null = this.findViewItemByID(notificationID);
		if (!viewItem) {
			console.error(`panel-notification-train: Couldn't find ViewItem for notification ${ComponentID.toLogString(notificationID)}`);
			return;
		}

		if (viewItem.button.element) {
			viewItem.button.element.classList.remove("notif__highlight");
		}
	}

	private onNotificationHide() {
	}

	private onNotificationActivated(event: CustomEvent): void {
		// Pass through the component ID to the engine and then handle it.
		this.onActionActivateNotification(event);
		this.playSound('data-audio-activate', 'data-audio-activate-ref');
	}

	private createDebugNotificationItem(id: ComponentID, notificationContainer: HTMLElement, viewItem: NotificationView.ViewItem | null): HTMLElement {
		let myViewItem: NotificationView.ViewItem | null = viewItem;
		return this.createNotificationItem(id, notificationContainer, (_: CustomEvent) => {
			// When the dummy notification is clicked...
			// Delete the old view item that contained this notification item
			if (myViewItem) {
				this.removeNotificationItem(myViewItem);
				myViewItem = null;
			}
			// After a delay of 1 second create a new notification to allow any notification activation animations to play and to show that the notification 
			// was activated.
			// (If it's "respawned" instantly, it's hard to tell if it worked or if there was another problem)
			setTimeout(() => {
				myViewItem = this.createDebugViewItem(this.dummyNotificationId++);
			}, 1000);
		}, 1);
	}

	private createNotificationItem(id: ComponentID, notificationContainer: HTMLElement, activationCallback: (event: ActionActivateEvent) => void, _numInstances: number): HTMLElement {
		const index = notificationContainer.childElementCount;

		const button = document.createElement("fxs-activatable");
		button.classList.add("notice", "notif__button");
		button.setAttribute('index', `${index}`);
		button.setAttribute('tabindex', '-1');
		button.setAttribute('notificationID', `${id.id}`);
		button.setAttribute("data-audio-group-ref", "audio-panel-notification-train");


		const buttonBk = document.createElement("div");
		buttonBk.classList.add("notif__button-bk");
		button.appendChild(buttonBk);

		const icon = document.createElement("div");
		icon.classList.add("notif__button-icon");
		icon.setAttribute('notificationID', `${id.id}`);
		icon.style.backgroundImage = `url("${Icon.getNotificationIconFromID(id)}")`;
		button.appendChild(icon);

		button.addEventListener(InputEngineEventName, this.notificationEngineInputListener);
		button.addEventListener('action-activate', activationCallback);

		// add an overlay with the number of instances of this notification if there's more than one
		if (_numInstances > 1) {
			const number = document.createElement("div");
			number.classList.value = "notif__button-number bg-contain bg-no-repeat bg-center text-sm font-body size-6 top-0 right-2 absolute flex items-center justify-center pointer-events-none";
			number.innerHTML = _numInstances.toString();
			button.appendChild(number);
		}

		const summary = Game.Notifications.getSummary(id);
		if (summary) {
			button.setAttribute("data-tooltip-content", Locale.compose(summary));
		} else {
			const type = Game.Notifications.getType(id);
			if (type) {
				const typeName = Game.Notifications.getTypeName(type);

				if (typeName) {
					button.setAttribute("data-tooltip-content", typeName);
				} else {
					button.setAttribute("data-tooltip-content", `Notification with type ${type} has no typeName`);
				}
			} else {
				button.setAttribute("data-tooltip-content", `Notification ${ComponentID.toLogString(id)} has no type`);
			}
		}

		notificationContainer.appendChild(button);

		// Check for notifications we want to auto-activate
		const type: number | null = Game.Notifications.getType(id);
		if (type) {
			const typeName: string | null = Game.Notifications.getTypeName(type);
			if (typeName) {
				if ((typeName == "NOTIFICATION_AGE_TRANSITION") || (typeName == "NOTIFICATION_ADVANCED_START")) {
					const notifications: ComponentID[] | null = Game.Notifications.getIdsForPlayer(GameContext.localPlayerID);
					if (notifications) {
						notifications.forEach((notification) => {
							if (notification.id == id.id) {
								// the notification train will refresh at least twice at the start of each turn, so
								// don't double-trigger the auto-activation.
								if (NotificationModel.manager.lastAnimationTurn != Game.turn) {
									NotificationModel.manager.lastAnimationTurn = Game.turn;

									this.focusWorld();
									Game.Notifications.activate(notification);
								}
							}
						})
					}
				}
			}
		}

		return button;
	}

	private focusWorld() {
		ViewManager.getHarness()?.classList.add("trigger-nav-help");
		Input.setActiveContext(InputContext.World);
		FocusManager.SetWorldFocused();
	}

	private onNotificationEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		let live = true;

		switch (inputEvent.detail.name) {
			case 'mousebutton-right':
				this.onDismissNotification(inputEvent);
				live = false;
				break;
			case 'cancel':
				this.focusWorld();
				live = false;
				break;
		}

		if (!live) {
			inputEvent.preventDefault();
			inputEvent.stopPropagation();
		}
	}

	private createNotificationContainerDom(notificationType: number): NotificationView.NotificationContainerInfo {
		const viewItem = new NotificationView.ViewItem(notificationType);
		const typeContainer = document.createElement("div");
		typeContainer.classList.add("notif__container");
		typeContainer.classList.add("notification-item-" + (this.notificationList.childElementCount));

		const upArrow = document.createElement("fxs-activatable");
		upArrow.classList.add("up-arrow");
		upArrow.addEventListener("action-activate", () => { this.onClickUpArrow(viewItem, notificationContainer) });
		typeContainer.appendChild(upArrow);

		const notificationContainer = document.createElement("fxs-vslot");
		notificationContainer.setAttribute('reverse-navigation', '');
		notificationContainer.setAttribute('ignore-prior-focus', '');
		notificationContainer.classList.add("notification-container");
		typeContainer.appendChild(notificationContainer);

		const downArrow = document.createElement("fxs-activatable");
		downArrow.classList.add("down-arrow");
		downArrow.addEventListener("action-activate", () => { this.onClickDownArrow(viewItem, notificationContainer) });
		typeContainer.appendChild(downArrow);

		viewItem.root = typeContainer;
		this.notificationList.insertBefore(typeContainer, this.notificationList.firstChild);

		return {
			notificationContainer,
			viewItem,
			typeContainer
		};
	}

	// Create a dummy debug item with a single notification in it
	private createDebugViewItem(dummyId: number): NotificationView.ViewItem {
		const notificationContainerInfo: NotificationView.NotificationContainerInfo = this.createNotificationContainerDom(dummyId);

		this.createDebugNotificationItem(ComponentID.make(GameContext.localPlayerID, 30, dummyId), notificationContainerInfo.notificationContainer, notificationContainerInfo.viewItem);

		return notificationContainerInfo.viewItem;
	}

	// Create a notification item
	private createViewItem(notificationType: number): NotificationView.ViewItem {
		const notificationContainerInfo: NotificationView.NotificationContainerInfo = this.createNotificationContainerDom(notificationType);

		if (notificationContainerInfo.viewItem.notifications.length > 0) {
			const notificationID: ComponentID = notificationContainerInfo.viewItem.notifications[0];
			const notificationButton: HTMLElement | null = this.createNotificationItem(notificationID, notificationContainerInfo.notificationContainer, this.notificationActivatedListener, notificationContainerInfo.viewItem.notifications.length);
			notificationContainerInfo.viewItem.button = { id: notificationID, element: notificationButton };
		}

		return notificationContainerInfo.viewItem;
	}



	// Remove a notification item by the view item instance
	private removeNotificationItem(item: NotificationView.ViewItem) {
		if (item.root) {
			// Determine item's location in DOM and modify all elements past it
			let pastRemovedItem: boolean = false;
			for (let childIndex = 0; childIndex < this.notificationList.children.length; childIndex++) {
				const element: HTMLElement = this.notificationList.children[childIndex] as HTMLElement;

				if (element) {
					if (element === item.root) {
						pastRemovedItem = true;
					}
					else {
						if (pastRemovedItem) {
							element.classList.add("notification-slide-left");
							element.addEventListener("animationend", (event: AnimationEvent) => {
								if (event.animationName == "itemSlideLeft") {
									element.classList.remove("notification-offset");
								}
							});
						}
					}
				}
			}


			this.notificationList.removeChild(item.root);
		}
		for (const key in this.viewItems) {
			if (this.viewItems[key] == item) {
				this.viewItems[key] = null;
			}
		}
	}

	// Handle adding a new notification ID to the notification item, creating a token if needed
	private doAddIDToViewItem(item: NotificationView.ViewItem, id: ComponentID, instances: number) {
		if (!item.root) {
			console.error("panel-notification-train: unable to find ViewItem root while attempting _doAddIDToItem");
			return;
		}

		if (!item.hasID(id)) {
			item.add(id);
			if (!item.button.element) {
				const notificationContainer: HTMLElement | null = item.root.querySelector<HTMLElement>(".notification-container");
				if (notificationContainer && notificationContainer.childElementCount == 0) {
					// only add one button
					const button: HTMLElement | null = this.createNotificationItem(id, notificationContainer, this.actionActivateNotificationListener, instances);
					if (button) {
						item.button = { id: id, element: button };
					}
				}
			}

			const notificationType: number | null = Game.Notifications.getType(id);
			if (notificationType) {
				//TODO: Add debug only const to show: console.log(`doAddIDToViewItem: ${Game.Notifications.getTypeName(notificationType)} instances ${instances}`);
			}
		}
	}

	// Handle removing a notification ID from the notification item
	private doRemoveIDFromViewItem(item: NotificationView.ViewItem, id: ComponentID) {
		if (item.hasID(id) && item.root) {
			if (item.button.id == id) {
				if (item.button.element) {
					item.root.removeChild(item.button.element);
				}
				item.button = { id: ComponentID.getInvalidID(), element: null };
			}
			item.remove(id);
		}
	}


	private findViewItemByType(type: number): NotificationView.ViewItem | null {
		return this.viewItems[type];
	}

	private findViewItemByID(id: ComponentID): NotificationView.ViewItem | null {
		for (const key in this.viewItems) {
			const item = this.viewItems[key];
			if (item) {
				if (item.hasID(id)) {
					return item;
				}
			}
		}
		return null;
	}

	private removeIDFromViewItem(id: ComponentID) {
		const item = this.findViewItemByID(id);
		if (item) {
			this.doRemoveIDFromViewItem(item, id);
			this.updateNotificationItem(item);
		}
	}

	private updateNotificationItem(item: NotificationView.ViewItem) {
		if (item.isEmpty) {
			this.removeNotificationItem(item);
			return;
		}

		const itemButtonElement: HTMLElement | null = item.button.element;

		if (!itemButtonElement) {
			console.error("panel-notification-train: updateNotificationItem - item had no button element!");
			return;
		}
		itemButtonElement.setAttribute("notificationID", `${item.notifications[0].id}`);
		const summary = Game.Notifications.getSummary(item.notifications[0]);
		if (summary) {
			itemButtonElement.setAttribute("data-tooltip-content", summary);
		}
		MustGetElement('.notif__button-icon', itemButtonElement).setAttribute("notificationID", `${item.notifications[0].id}`);
		const buttonNumber = itemButtonElement.querySelector('.notif__button-number');
		if (buttonNumber) {
			const numNotifs: number = item.notifications.length;
			if (numNotifs <= 1) {
				buttonNumber.classList.add("hidden");
			}
			else {
				buttonNumber.innerHTML = numNotifs.toString();
			}
		}
	}

	// Add a type entry node.  This contains all the notifications of the same type
	private addViewItemByType(entry: NotificationModel.TypeEntry): NotificationView.ViewItem | null {
		if (entry == null || entry == undefined) {
			console.warn("Null entry in notification train.");
			return null;
		}
		let item = this.findViewItemByType(entry.type);
		if (item == null) {
			if (!entry.isEmpty) {
				item = this.createViewItem(entry.type);
				this.viewItems[entry.type] = item;
			}
		}
		return item;
	}

	private addIDToViewItem(id: ComponentID) {
		const typeEntry = NotificationModel.manager.findTypeEntry(id);
		if (typeEntry) {
			const item = this.addViewItemByType(typeEntry);
			if (item) {
				const notifications = Game.Notifications.getIdsForPlayer(GameContext.localPlayerID);
				const currentNotification = Game.Notifications.find(id);

				let instances: number = 0;
				if (notifications && currentNotification) {
					notifications.forEach((ourNotif) => {
						const userNotif = Game.Notifications.find(ourNotif);
						if (userNotif && userNotif.Type == currentNotification.Type && !userNotif.Dismissed) {
							instances++;
						}
					});
				}

				this.doAddIDToViewItem(item, id, instances);

				if (item.root) {

					const notificationID: ComponentID = item.notifications[0];
					const notificationType: number | null = Game.Notifications.getType(notificationID);

					if (Game.Notifications.getPlayedAudioOnTurn(notificationID, Game.turn)) {
						item.root.classList.add("notif__anim-skip");
					} else {
						if (notificationType) {
							this.numAnimatingNotifs++;
							item.root.classList.add("notif__animate");
							item.root.addEventListener("animationstart", (event: AnimationEvent) => {
								if (event.animationName == "trainNotificationSlideIn") {
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-notif-pop', 'audio-panel-notification-train'));

									if (this.numAnimatingNotifs > 0) {
										this.numAnimatingNotifs--;

										if (this.numAnimatingNotifs == 0) {
											NotificationModel.manager.lastAnimationTurn = Game.turn;
										}
									}

									delayByFrame(() => {
										NotificationModel.manager.playAudio(id, "Add");
									}, 7);
								}
							});
						}
					}
				}
			}
		}
	}

	private reset() {
		if (this.Root.contains(FocusManager.getFocus())) {
			this.focusWorld();
		}

		// clear the notification train
		while (this.notificationList.hasChildNodes()) {
			this.notificationList.removeChild(this.notificationList.lastChild!);
		}

		this.viewItems = {};
		this.toAddIds.length = 0;
		this.toRemoveIds.length = 0;
		this.needRebuild = false;
		this.needUpdate = false;

		this.navHelpContainer?.classList.remove('notification-available');
	}

	private rebuild() {
		this.reset();
		const localPlayerId: PlayerId = GameContext.localPlayerID;
		if ((localPlayerId != PlayerIds.NO_PLAYER) && (localPlayerId != PlayerIds.OBSERVER_ID)) {
			const playerEntry = NotificationModel.manager.findPlayer(localPlayerId);
			if (playerEntry) {
				const entries = playerEntry.getTypesBy(NotificationModel.QueryBy.Priority)
				if (entries && entries.length > 0) {
					this.numAnimatingNotifs = 0;
					this.navHelpContainer?.classList.add('notification-available');
					for (const entry of entries) {
						for (const id of entry.notifications) {
							this.addIDToViewItem(id);
						}
					}
				}
			}
		}
	}

	private update() {
		// TODO try to keep the focus if we don't remove the focused element ?
		if (this.Root.contains(FocusManager.getFocus())) {
			this.focusWorld();
		}

		if (this.toRemoveIds.length) {
			for (const id of this.toRemoveIds) {
				this.removeIDFromViewItem(id);
			}
			this.toRemoveIds.length = 0;
		}
		if (this.toAddIds.length) {
			for (const id of this.toAddIds) {
				this.addIDToViewItem(id);
			}
			this.toAddIds.length = 0;
		}
		this.needUpdate = false;

		waitForLayout(() => {
			this.navHelpContainer?.classList.toggle('notification-available', Navigation.isFocusable(this.notificationList));
		});
	}

	// This handles the user wanting to activate the notification
	private onActionActivateNotification(event: CustomEvent) {
		if (event.target instanceof HTMLElement) {
			const notificationIDString: string | null = event.target.getAttribute('notificationID');
			if (notificationIDString) {
				const notificationID = parseInt(notificationIDString);
				if (!isNaN(notificationID)) {
					const notifications: ComponentID[] | null = Game.Notifications.getIdsForPlayer(GameContext.localPlayerID);
					if (notifications) {
						notifications.forEach((notification) => {
							if (notification.id == notificationID) {
								this.focusWorld();
								Game.Notifications.activate(notification);
							}
						})
					}
				}
			}
		}
	}

	// This handles the user wanting to dismiss the notification
	private onDismissNotification(event: CustomEvent) {
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		const player: PlayerLibrary | null = Players.get(localPlayerID);
		if (!player) {
			console.error("panel-notification-train: local player has valid id #" + localPlayerID + ", but could not obtain a valid player object.");
			return;
		}
		if (event.target instanceof HTMLElement) {
			const notificationIDString: string | null = event.target.getAttribute('notificationID');
			if (!notificationIDString) {
				console.error("panel-notification-train: Could not obtain a valid notification ID.");
				return;
			}
			const notificationID: number = parseInt(notificationIDString);
			const notifications: ComponentID[] | null = Game.Notifications.getIdsForPlayer(localPlayerID);
			if (!notifications) {
				console.error("panel-notification-train: Could not obtain notifications for playerId: " + localPlayerID + ", notificationID: " + notificationID + " .");
				return;
			}
			const endTurnblockingType: EndTurnBlockingType = Game.Notifications.getEndTurnBlockingType(localPlayerID);
			if (endTurnblockingType != EndTurnBlockingTypes.NONE) {
				const endTurnblockingNotificationId: ComponentID | null = Game.Notifications.findEndTurnBlocking(localPlayerID, endTurnblockingType);
				if (!endTurnblockingNotificationId) {
					console.error("panel-notification-train: Could not obtain a notification Blocker for playerId: " + localPlayerID + ".");
					return;
				}
				if (endTurnblockingNotificationId.id != notificationID) {
					for (const notification of notifications) {
						if (notification.id == notificationID) {
							Game.Notifications.dismiss(notification);
							break;
						}
					}
				}
			}
			else {
				for (const notification of notifications) {
					if (notification.id == notificationID) {
						Game.Notifications.dismiss(notification);
						break;
					}
				}
			}

			// For mouse only, update the current target element so the user can spam-dismiss them without moving the mouse.
			if (ActionHandler.deviceType == InputDeviceType.Mouse) {
				ActionHandler.forceCursorCheck();
			}

			Audio.playSound("data-audio-notif-close", "audio-panel-notification-train");
		}
	}

	private onNotificationAdded(notificationId: NotificationID) {
		const isSoftNotification = !Game.Notifications.find(notificationId)?.BlocksTurnAdvancement;

		if (notificationId.owner == GameContext.localPlayerID && !this.needRebuild && isSoftNotification) {
			if (ComponentID.addToArray(this.toAddIds, notificationId)) {
				this.needUpdate = true;
			}
		}
	}

	private onNotificationRemoved(notificationId: NotificationID) {
		if (notificationId.owner == GameContext.localPlayerID && !this.needRebuild) {
			if (ComponentID.addToArray(this.toRemoveIds, notificationId)) {
				this.needUpdate = true;
			}
		}
	}

	private onNotificationRebuild() {
		this.needRebuild = true;
	}

	private onNotificationUpdate() {
		if (this.needRebuild) {
			this.rebuild();
		} else if (this.needUpdate) {
			this.update();
		}
	}

	private onFocusNotifications() {
		if (Navigation.isFocusable(this.notificationList)) {
			Input.setActiveContext(InputContext.Dual);
			FocusManager.setFocus(this.notificationList);
			ViewManager.getHarness()?.classList.remove("trigger-nav-help");
		}
	}

	private onClickUpArrow(item: NotificationView.ViewItem, notificationContainer: HTMLElement) {
		const bottomButton: HTMLElement = notificationContainer.children[0] as HTMLElement;
		if (!bottomButton) {
			console.error("panel-notification-train: unable to find first child of notificationContainer during onClickDownArrow()!");
			return;
		}

		const currentIndexString: string | null = bottomButton.getAttribute("index");
		if (!currentIndexString || currentIndexString == "") {
			console.error("panel-notification-train: unable to find index attribute of button during onClickDownArrow()!");
			return;
		}

		let currentIndex: number = parseInt(currentIndexString);

		for (let i: number = 0; i < notificationContainer.childElementCount; i++) {
			//Cycle up through the notifications
			currentIndex = currentIndex - 1;
			if (currentIndex < 0) {
				currentIndex = item.notifications.length - 1;
			}
			this.setButtonContents(notificationContainer.children[i] as HTMLElement, item.notifications[currentIndex], currentIndex);
		}
	}

	private onClickDownArrow(item: NotificationView.ViewItem, notificationContainer: HTMLElement) {
		const bottomButton = notificationContainer.children[0];
		if (!(bottomButton instanceof HTMLElement)) {
			console.error("panel-notification-train: unable to find first child of notificationContainer during onClickDownArrow()!");
			return;
		}

		const currentIndexString = bottomButton.getAttribute("index");
		if (!currentIndexString || currentIndexString == "") {
			console.error("panel-notification-train: unable to find index attribute of button during onClickDownArrow()!");
			return;
		}

		let currentIndex = parseInt(currentIndexString);
		for (let i = 0; i < notificationContainer.childElementCount; i++) {
			//Cycle up through the notifications
			currentIndex = currentIndex + 1;
			if (currentIndex >= item.notifications.length) {
				currentIndex = 0;
			}
			this.setButtonContents(notificationContainer.children[i] as HTMLElement, item.notifications[currentIndex], currentIndex);
		}

		//TODO:Animation to signify you are scrolling through the list (animate down)
	}

	private setButtonContents(button: HTMLElement, notificationID: ComponentID, newIndex: number) {
		button.setAttribute("index", newIndex.toString());

		const item = button.querySelector<HTMLElement>(".icon");
		if (item) {
			item.classList.add("icon");
			item.setAttribute("tabindex", "-1");
			item.setAttribute('notificationID', `${notificationID.id}`);

			const icon: HTMLImageElement | null = item.querySelector<HTMLImageElement>("img");
			if (icon) {
				icon.src = Icon.getNotificationIconFromID(notificationID);
				item.appendChild(icon);
			} else {
				console.error(`panel-notification-train: setButtonContents(): Missing icon with 'img'. ID: ${ComponentID.toLogString(notificationID)}, newIndex: ${newIndex}`);
			}

			const summary = Game.Notifications.getSummary(notificationID);
			if (summary) {
				item.setAttribute("data-tooltip-content", Locale.compose(summary));
			}
		} else {
			console.error(`panel-notification-train: setButtonContents(): Missing icon with 'img'. ID: ${ComponentID.toLogString(notificationID)}, newIndex: ${newIndex}`);
		}
	}
}

Controls.define('panel-notification-train', {
	createInstance: PanelNotificationTrain,
	description: 'Area for sub system button icons.',
	classNames: ['notification-train', 'allowCameraMovement'],
	styles: ["fs://game/base-standard/ui/notification-train/panel-notification-train.css"],
	images: [
		'fs://game/mask_rounded-square-10px.png',
		'fs://game/mask_rounded-square-8px.png',
		'fs://game/overlay_rounded-square-rvs-10px.png',
		'fs://game/shadow_rounded-square.png',
	]
});

import { NotificationID, NotificationModel } from '/base-standard/ui/notification-train/model-notification-train.js';
import { ActionActivateEvent, ActionActivateEventName } from '/core/ui/components/fxs-activatable.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { ChooserNode } from "/base-standard/ui/chooser-item/model-chooser-item.js";
import { ChooserItem } from '/base-standard/ui/chooser-item/chooser-item.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

const DISMISS_NOTIFICATION_ID_ATTRIBUTE_NAME: string = "data-dismiss-notification-Id";
const ACTIVATE_NOTIFICATION_ID_ATTRIBUTE_NAME: string = "data-action-notification-id";
const NOTIFICATION_GROUP_ARROW_DIRECTION_NAME: string = "data-notification-type-group-arrow-direction";

class PanelNotificationTrainMobile extends Panel {

	private buttonCloseListener = this.close.bind(this, UIViewChangeMethod.PlayerInteraction);
	private requestCloserListener = this.onCloseRequest.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private notificationRemovedListener = this.onNotificationRemoved.bind(this);
	private notificationRebuildListener = this.onNotificationRebuild.bind(this);

	private types: NotificationModel.TypeEntry[] = [];
	private scrollableElementContent?: HTMLElement;
	private frameElement!: HTMLElement;

	private static readonly BATCH_SIZE: number = 20;

	private refreshUpdateGate: UpdateGate = new UpdateGate(() => {
		this.refresh();
	});

	onInitialize(): void {
		this.Root.setAttribute("data-audio-group-ref", "notification-train-mobile");
		this.enableOpenSound = true;
		this.enableCloseSound = false; // Disabling for now because these mobile notifications are failing to pop from the Context Manager.
		super.onInitialize();
	}

	onAttach(): void {
		super.onAttach();
		NotificationModel.manager.eventNotificationRemove.on(this.notificationRemovedListener);
		NotificationModel.manager.eventNotificationRebuild.on(this.notificationRebuildListener);
		this.Root.addEventListener("request-close", this.requestCloserListener);
		this.Root.addEventListener('engine-input', this.engineInputListener);

		this.frameElement = MustGetElement("fxs-modal-frame", this.Root);

		waitForLayout(() => {
			this.scrollableElementContent = MustGetElement(".panel-notification-train-mobile-content", this.Root);
			this.refreshUpdateGate.call("onAttach");
		});
	}

	onDetach(): void {
		NotificationModel.manager.eventNotificationRemove.off(this.notificationRemovedListener);
		NotificationModel.manager.eventNotificationRebuild.off(this.notificationRebuildListener);
		this.Root.removeEventListener("request-close", this.requestCloserListener);
		this.Root.removeEventListener('engine-input', this.engineInputListener);
	}

	onReceiveFocus(): void {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		const focusTarget = MustGetElement("fxs-vslot", this.Root);
		Focus.setContextAwareFocus(focusTarget, this.Root);
		super.onReceiveFocus();
	}

	private realizeDimissAll() {
		const canDismissAny: boolean = this.types.some((type) => {
			return type.notifications.some((notification) => {
				return Game.Notifications.canUserDismissNotification(notification);
			});
		});

		if (canDismissAny) {
			NavTray.addOrUpdateShellAction2("LOC_NOTIFICATION_DISMISS_ALL");
		}
	}

	private refresh(): void {
		const playerEntry: NotificationModel.PlayerEntry | null = NotificationModel.manager.findPlayer(GameContext.localPlayerID);
		if (playerEntry) {
			this.types = playerEntry.getTypesBy(NotificationModel.QueryBy.Priority);
		}

		if (this.types.length == 0) {
			this.close();
		}

		this.realizeDimissAll();

		if (!this.scrollableElementContent) {
			return;
		}

		this.scrollableElementContent.innerHTML = "";

		this.types.forEach((typeEntry: NotificationModel.TypeEntry) => {
			let prossessedNotifications = 0;
			let batchNumber = 0;

			while (prossessedNotifications < typeEntry.notifications.length) {
				const batchNotification = typeEntry.notifications.slice(batchNumber * PanelNotificationTrainMobile.BATCH_SIZE, (batchNumber + 1) * PanelNotificationTrainMobile.BATCH_SIZE);

				const notificationGroup = document.createElement('notification-type-group');
				notificationGroup.setAttribute('data-notifications', JSON.stringify(typeEntry.notifications));
				notificationGroup.setAttribute('data-batch-number', batchNumber.toString());
				this.scrollableElementContent?.appendChild(notificationGroup);

				prossessedNotifications += batchNotification.length;
				batchNumber++;
			}
		});

		FocusManager.setFocus(MustGetElement("fxs-vslot", this.Root));

		const closeButton: HTMLElement = document.createElement('fxs-close-button');
		closeButton.addEventListener('action-activate', this.buttonCloseListener);
		this.frameElement.appendChild(closeButton);
	}

	private onNotificationRemoved(notificationId: NotificationID) {
		if (notificationId.owner == GameContext.localPlayerID) {
			// TODO don't refresh everything and just remove the notification card element? or refesh only the correct group ?
			this.refreshUpdateGate.call("onNotificationRemoved");
		}
	}

	private onNotificationRebuild(playerId: PlayerId) {
		if (playerId == GameContext.localPlayerID) {
			this.refreshUpdateGate.call("onNotificationRebuild");
		}
	}

	private onCloseRequest(event: CustomEvent) {
		event.stopPropagation();
		this.close();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private handleEngineInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return false;
		}

		if (inputEvent.isCancelInput()) {
			this.close();
			return true;
		}

		switch (inputEvent.detail.name) {
			case 'sys-menu':
				this.close();
				return true;
			case 'shell-action-2':
				this.dismissAllNotifications();
				return true;
		}

		return false;
	}

	protected close(_uiViewChangeMethod: UIViewChangeMethod = UIViewChangeMethod.Unknown) {
		this.playAnimateOutSound();
		super.close();
	}

	private dismissAllNotifications() {
		Audio.playSound("data-audio-dismiss-notification", "notification-train-mobile");
		this.types.forEach((type) => {
			type.notifications.forEach((notification) => {
				Game.Notifications.dismiss(notification);
			});
		});
	}
}

Controls.define('notifications-train-mobile', {
	createInstance: PanelNotificationTrainMobile,
	description: 'Panel for the mobile version of the notification train',
	classNames: ['notifications-train-mobile', 'absolute'],
	styles: ["fs://game/base-standard/ui/notification-train-mobile/panel-notification-train-mobile.css"],
	content: ["fs://game/base-standard/ui/notification-train-mobile/panel-notification-train-mobile.html"]
});

interface NotificationChoooserNode extends ChooserNode {
	notification: NotificationID;
	length: number;
}

class NotificationChooserItem extends ChooserItem {

	public get notificationChooserNode(): NotificationChoooserNode | null {
		return this._chooserNode as NotificationChoooserNode;
	}

	public set notificationChooserNode(value: NotificationChoooserNode | null) {
		this._chooserNode = value;
	}

	private dismissButtonListener = this.dismissNotification.bind(this);

	onInitialize() {
		super.onInitialize();

		const icon = this.Root.getAttribute('icon');
		if (icon) {
			const iconElement = this.createChooserIcon(icon);
			this.Root.appendChild(iconElement);
		}
		this.Root.setAttribute("data-audio-group-ref", "notification-train-mobile");
	}

	render() {
		super.render();

		const chooserItem = document.createDocumentFragment();

		const node = this.notificationChooserNode;
		if (!node) {
			console.error("notification-chooser-item: render() - notificationChooserNode was null!");
			return;
		}

		const icon = node.primaryIcon;

		this.Root.classList.add("flex-row", "p-2", "my-1\\.5", "w-200", "chooser-item_unlocked");

		if (icon) {
			const primaryIcon: HTMLElement = this.createChooserIcon(icon);
			chooserItem.appendChild(primaryIcon);
		}

		const description = document.createElement("div");
		description.classList.value = "flex flex-auto flow-column justify-center ml-2 relative";
		chooserItem.appendChild(description);

		const title = document.createElement("div");
		title.classList.value = "font-title-base text-accent-1 uppercase";
		title.setAttribute('data-l10n-id', Game.Notifications.getMessage(node.notification) + (node.length > 1 ? `(${node.length})` : ""));
		description.appendChild(title);

		const summary = document.createElement("div");
		summary.classList.value = "font-body text-xs text-accent-1";
		summary.setAttribute('data-l10n-id', `${Game.Notifications.getSummary(node.notification)}`);
		description.appendChild(summary);

		const dismissContainer = document.createElement("div");
		dismissContainer.classList.value = "self-center ml-6 mr-4 relative";

		const dismissButton = document.createElement("fxs-activatable");
		dismissButton.classList.add(Game.Notifications.canUserDismissNotification(node.notification) ? "flex" : "hidden", "notification-dismiss-button", "justify-center", "items-center", "size-20");
		dismissButton.setAttribute(DISMISS_NOTIFICATION_ID_ATTRIBUTE_NAME, node.notification.id.toString());
		dismissButton.addEventListener("action-activate", this.dismissButtonListener);
		dismissButton.setAttribute("data-audio-press-ref", "None");

		const dismissIcon = document.createElement("div");
		dismissIcon.classList.value = "w-8 h-8 bg-repeat bg-contain img-ntf-dismiss tint-bg-accent-2 hover\\:tint-bg-accent-1";
		dismissButton.appendChild(dismissIcon);

		dismissContainer.appendChild(dismissButton);

		chooserItem.appendChild(dismissContainer);

		this.Root.appendChild(chooserItem);
	}

	private dismissNotification(event: ActionActivateEvent) {
		const notificationId: ComponentID | undefined = this.notificationChooserNode?.notification;
		if (!notificationId) {
			return;
		}
		Audio.playSound("data-audio-dismiss-notification", "notification-train-mobile");
		Game.Notifications.dismiss(notificationId);
		event.stopPropagation();
	}
}

Controls.define('notification-chooser-item', {
	createInstance: NotificationChooserItem,
	description: 'Chooser item for the notification train',
	tabIndex: -1
});


class NotificationTypeGroup extends Component {
	private currentIndex: number = 0;
	private notifications: NotificationID[] = [];

	private arrows: HTMLElement[] = [];
	private notificationCards: HTMLElement[] = [];
	private radioButtons: HTMLElement[] = [];

	private arrowButtonListener = this.onArrowButton.bind(this);
	private radioButtonListener = this.onRadioButton.bind(this);
	private activateNotificationListener = this.activateNotification.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private navigationInputListener = this.onNavigationInput.bind(this);
	private cardFocusListener = this.onCardFocus.bind(this);

	onDetach(): void {
		this.detachListeners();
		super.onDetach();
	}

	private detachListeners() {
		for (const arrow of this.arrows) {
			arrow.removeEventListener("action-activate", this.arrowButtonListener);
		}
		for (const notificationCard of this.notificationCards) {
			notificationCard.removeEventListener("action-activate", this.activateNotificationListener);
			notificationCard.removeEventListener("engine-input", this.engineInputListener);
			notificationCard.removeEventListener("navigation-input", this.navigationInputListener);
			notificationCard.removeEventListener("focus", this.cardFocusListener);
		}
	}

	private createNotificationChooserNode(notification: NotificationID, length: number): NotificationChoooserNode {
		return {
			notification: notification,
			length: length,
			primaryIcon: Icon.getNotificationIconFromID(notification),
			isLocked: false,
			name: ""
		};
	}

	private refresh() {
		this.detachListeners();
		this.notificationCards = [];
		this.radioButtons = [];

		const isMobileExperience = UI.getViewExperience() == UIViewExperience.Mobile;

		const container = document.createElement('div');
		container.classList.value = "flex flex-row items-center";

		const previousArrowContainer = document.createElement('div');
		previousArrowContainer.classList.value = "w-8 mx-4";

		if (this.notifications.length > 1) {
			const previousNavhelp = document.createElement('fxs-nav-help');
			previousNavhelp.setAttribute('action-key', "inline-cycle-previous");
			previousArrowContainer.appendChild(previousNavhelp);

			const previousArrow = document.createElement('fxs-activatable');
			previousArrow.classList.value = "group-arrow w-8 h-12 bg-contain";
			previousArrow.setAttribute(NOTIFICATION_GROUP_ARROW_DIRECTION_NAME, "backward");

			const previousArrowBackground = document.createElement("div");
			previousArrowBackground.classList.add("img-arrow");

			previousArrow.appendChild(previousArrowBackground);

			previousArrowContainer.appendChild(previousArrow);

			previousArrow.addEventListener(ActionActivateEventName, this.arrowButtonListener);

			Databind.classToggle(previousArrow, "hidden", "{{g_NavTray.isTrayRequired}}");
		}

		container.appendChild(previousArrowContainer);

		this.notifications.forEach((notification, index) => {
			const notificationChooserItem = document.createElement('notification-chooser-item') as ComponentRoot<NotificationChooserItem>;
			notificationChooserItem.setAttribute(ACTIVATE_NOTIFICATION_ID_ATTRIBUTE_NAME, notification.id.toString());
			notificationChooserItem.classList.add(this.currentIndex == index ? "flex" : "hidden");
			notificationChooserItem.componentCreatedEvent.on((chooser) => {
				chooser.notificationChooserNode = this.createNotificationChooserNode(notification, this.notifications.length);
			});

			notificationChooserItem.addEventListener(ActionActivateEventName, this.activateNotificationListener);
			notificationChooserItem.addEventListener("engine-input", this.engineInputListener);
			notificationChooserItem.addEventListener("navigate-input", this.navigationInputListener);
			notificationChooserItem.addEventListener("focus", this.cardFocusListener);

			this.notificationCards.push(notificationChooserItem);

			container.appendChild(notificationChooserItem);
		});

		const nextArrowContainer = document.createElement('div');
		nextArrowContainer.classList.value = "w-8 mx-4";

		if (this.notifications.length > 1) {
			const nextNavhelp = document.createElement('fxs-nav-help');
			nextNavhelp.setAttribute('action-key', "inline-cycle-next");
			nextArrowContainer.appendChild(nextNavhelp);

			const nextArrow = document.createElement('fxs-activatable');
			nextArrow.classList.value = "group-arrow w-8 h-12";
			nextArrow.setAttribute(NOTIFICATION_GROUP_ARROW_DIRECTION_NAME, "forward");

			const nextArrowBackground = document.createElement("div");
			nextArrowBackground.classList.add("img-arrow", "-scale-x-100");

			nextArrow.appendChild(nextArrowBackground);

			Databind.classToggle(nextArrow, "hidden", "{{g_NavTray.isTrayRequired}}");

			nextArrow.addEventListener(ActionActivateEventName, this.arrowButtonListener);

			nextArrowContainer.appendChild(nextArrow);
		}
		container.appendChild(nextArrowContainer);

		this.Root.appendChild(container);

		if (this.notifications.length > 1) {
			const batchNumber = this.Root.getAttribute('data-batch-number');

			const radioButtonContainer = document.createElement('div');
			radioButtonContainer.classList.value = "flex flex-row justify-center mb-3";

			this.notifications.forEach((notification, index) => {
				const radioButton = document.createElement('fxs-radio-button');
				radioButton.classList.value = "mx-1";
				radioButton.setAttribute('group-tag', `notification-group-${notification.type}-${batchNumber}`)
				radioButton.setAttribute('value', index.toString());
				radioButton.setAttribute('disabled', isMobileExperience ? "true" : "false");
				radioButton.setAttribute('is-tiny', "true");

				if (this.currentIndex == index) {
					radioButton.setAttribute('selected', "true");
				}
				radioButton.addEventListener(ActionActivateEventName, this.radioButtonListener);
				this.radioButtons.push(radioButton);

				radioButtonContainer.appendChild(radioButton);
			});

			this.Root.appendChild(radioButtonContainer);
		}
	}

	onAttributeChanged(name: string, _oldValue: string | null, newValue: string | null): void {
		if (name == "data-notifications" && newValue) {
			this.notifications = JSON.parse(newValue);
			this.refresh();
		}
	}

	private onArrowButton(event: ActionActivateEvent): void {
		const targetElement: HTMLElement = event.target as HTMLElement;
		const direction: string | undefined = targetElement.getAttribute(NOTIFICATION_GROUP_ARROW_DIRECTION_NAME)?.toString();
		if (direction == undefined) {
			return;
		}

		this.cycleNotification(direction);
	}

	private onRadioButton(event: Event): void {
		if (event.target instanceof HTMLElement) {
			const value = event.target.getAttribute('value');

			if (value) {
				const index = parseInt(value);

				if (index != this.currentIndex) {
					this.switchToNotification(index);
				}
			}
		}
	}

	private cycleNotification(direction: string) {
		let newIndex: number = this.currentIndex + (direction == "forward" ? 1 : -1);
		newIndex = (newIndex + this.notifications.length) % this.notifications.length;

		if (newIndex != this.currentIndex) {
			this.switchToNotification(newIndex);
			this.radioButtons[newIndex].setAttribute('selected', 'true');
		}
	}

	private switchToNotification(index: number) {
		this.notificationCards[this.currentIndex].classList.replace('flex', 'hidden');
		this.notificationCards[index].classList.replace('hidden', 'flex');

		FocusManager.setFocus(this.notificationCards[index]);

		this.currentIndex = index;
	}

	private activateNotification(event: ActionActivateEvent) {
		const notificationId: ComponentID | undefined = this.getNotificationIdFromEvent(event, ACTIVATE_NOTIFICATION_ID_ATTRIBUTE_NAME);
		if (notificationId == undefined) {
			return;
		}
		Game.Notifications.activate(notificationId);
		this.Root.dispatchEvent(new CustomEvent("request-close", { bubbles: true }));
	}

	private onEngineInput(inputEvent: InputEngineEvent): void {
		if (this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onNavigationInput(navigationInputEvent: NavigateInputEvent): void {
		if (navigationInputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (navigationInputEvent.detail.name) {
			case 'nav-previous':
				this.cycleNotification('backward');
				navigationInputEvent.stopPropagation();
				navigationInputEvent.preventDefault();
				break;
			case 'nav-next':
				this.cycleNotification('forward');
				navigationInputEvent.stopPropagation();
				navigationInputEvent.preventDefault();
				break;
		}
	}

	private onCardFocus(event: CustomEvent): void {
		if (event.target instanceof HTMLElement) {
			const notificationId: number = Number.parseInt(event.target.getAttribute(ACTIVATE_NOTIFICATION_ID_ATTRIBUTE_NAME) ?? "-1");
			const notification: ComponentID | undefined = this.notifications.find(x => x.id == notificationId);
			if (notification != undefined) {
				if (Game.Notifications.canUserDismissNotification(notification)) {
					NavTray.addOrUpdateShellAction1("LOC_NOTIFICATION_DISMISS");
				} else {
					NavTray.removeShellAction1();
				}
			}
		}
	}

	private handleEngineInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return false;
		}

		switch (inputEvent.detail.name) {
			case "shell-action-1":
				const notificationId: ComponentID | undefined = this.getNotificationIdFromEvent(inputEvent, ACTIVATE_NOTIFICATION_ID_ATTRIBUTE_NAME);
				if (notificationId != undefined) {
					Game.Notifications.dismiss(notificationId);
					Audio.playSound("data-audio-dismiss-notification", "notification-train-mobile");
					return true;
				}
				break;
		}

		return false;
	}

	private getNotificationIdFromEvent(event: ActionActivateEvent, attributeName: string): ComponentID | undefined {
		const targetElement: HTMLElement = event.target as HTMLElement;
		const notificationId: number = Number.parseInt(targetElement.getAttribute(attributeName) ?? "-1");
		if (notificationId == -1) {
			return undefined;
		}
		return this.notifications.find(x => x.id == notificationId);
	}
}

Controls.define('notification-type-group', {
	createInstance: NotificationTypeGroup,
	description: 'Panel for the mobile version of the notification train',
	classNames: ['notification-type-group', 'flex', 'flex-col', 'px-12'],
	attributes: [
		{
			name: "data-notifications"
		}
	]
});
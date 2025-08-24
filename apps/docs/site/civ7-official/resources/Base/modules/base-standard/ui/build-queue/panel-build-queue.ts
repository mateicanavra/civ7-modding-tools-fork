/**
 * @file panel-build-queue.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Displays the build queue for the selected city
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';

import { BuildQueue } from '/base-standard/ui/build-queue/model-build-queue.js';
import { FocusCityViewEvent, FocusCityViewEventName } from '/base-standard/ui/views/view-city.js'

class RequestBuildQueueMoveItemUpEvent extends CustomEvent<{ index: string }> {
	constructor(index: string) {
		super('request-build-queue-move-item-up', {
			bubbles: true,
			detail: { index },
		});
	}
}

class RequestBuildQueueMoveItemLastEvent extends CustomEvent<{ index: string }> {
	constructor(index: string) {
		super('request-build-queue-move-item-last', {
			bubbles: true,
			detail: { index },
		});
	}
}

class RequestBuildQueueCancelItemEvent extends CustomEvent<{ index: string }> {
	constructor(index: string) {
		super('request-build-queue-cancel-item', {
			bubbles: true,
			detail: { index },
		});
	}
}

/**
 * Area for expanded city information.
 */
class PanelBuildQueue extends Component {

	private focusInListener = this.onFocusIn.bind(this);
	private focusOutListener = this.onFocusOut.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private itemEngineInputListener = this.onItemEngineInput.bind(this);
	private itemFocusListener = this.onItemFocus.bind(this);
	private deleteButtonListener = this.requestDelete.bind(this);
	private upButtonListener = this.requestMoveUp.bind(this);

	private firstFocus = true;

	onAttach() {
		super.onAttach();

		window.addEventListener(FocusCityViewEventName, this.onFocusCityViewEvent);

		this.Root.addEventListener('focusin', this.focusInListener);
		this.Root.addEventListener('focusout', this.focusOutListener, true);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);

		const activeTitle = document.createElement("div");
		activeTitle.classList.add("active-title", "flex", "justify-center", "font-title", "uppercase", "text-sm", "py-2",);
		activeTitle.setAttribute('data-l10n-id', 'LOC_UI_QUEUE_ACTIVE');

		const queuedTitle = document.createElement("div");
		queuedTitle.classList.add("queued-title", "flex", "justify-center", "font-title", "uppercase", "text-sm", "py-2", "mt-5");
		queuedTitle.setAttribute('data-l10n-id', 'LOC_UI_QUEUE_QUEUED');

		const scrollableContainer = document.createElement('fxs-scrollable');
		scrollableContainer.classList.add('build-queue-scrollable-root', 'max-h-128', 'pr-2');
		const containerQueued = document.createElement("fxs-vslot");
		scrollableContainer.appendChild(containerQueued);
		this.Root.appendChild(scrollableContainer);

		containerQueued.classList.add("build-queue__item-container-queued", "relative", "mr-2\\.5", "grow");

		containerQueued.setAttribute('data-bind-if', '{{g_BuildQueue.isTrackingCity}}');


		const itemContainerDiv = document.createElement('div');
		Databind.for(itemContainerDiv, 'g_BuildQueue.items', 'item');
		{
			const itemContainerOuter = document.createElement('fxs-vslot');

			itemContainerOuter.classList.add("build-queue__item-container-outer");

			const itemContainer = document.createElement('fxs-activatable');
			itemContainer.classList.add('build-queue__item-container', 'items-center', 'justify-center', 'flex', 'flex-row', 'relative');
			itemContainer.setAttribute("tabindex", "-1");

			const itemContainerHover: HTMLElement = document.createElement('div');
			itemContainerHover.classList.add('build-queue__item-container-hover', 'absolute', 'size-full', 'pointer-events-auto', 'opacity-0',
				"hover\\:opacity-100", "focus\\:opacity-100", "selected\\:opacity-100", "active\\:opacity-100"
			);

			const item: HTMLElement = document.createElement('div');
			item.classList.add("build-queue__item", "relative", "flex", "justify-center", "items-center", "m-1", "grow");

			Databind.attribute(itemContainerOuter, 'innerHTML', "item.name");
			Databind.attribute(itemContainerOuter, 'data-tooltip-content', "item.name");
			Databind.attribute(itemContainerOuter, 'item-type', "item.type");
			Databind.attribute(itemContainerOuter, 'item-index', "item.index");
			Databind.attribute(itemContainer, 'item-index', "item.index");
			Databind.attribute(itemContainer, 'item-type', "item.type");

			itemContainerOuter.setAttribute('tabindex', "-1");
			itemContainerOuter.setAttribute('hover-only-trigger', "true");

			itemContainer.addEventListener('engine-input', this.itemEngineInputListener);
			itemContainer.addEventListener('focus', this.itemFocusListener);
			itemContainer.addEventListener('hover', this.itemFocusListener);

			const moveUpButton: HTMLElement = document.createElement('fxs-activatable');

			moveUpButton.classList.add("build-queue__item-button--move-up", "size-6", "bg-contain", "absolute", "z-1");

			Databind.attribute(moveUpButton, 'item-type', "item.type");
			Databind.attribute(moveUpButton, 'item-index', "item.index");

			Databind.if(activeTitle, `{{item.index}} == 0`);
			{
				itemContainerOuter.appendChild(activeTitle);
			}

			Databind.if(queuedTitle, `{{item.index}} == 1`);
			{
				itemContainerOuter.appendChild(queuedTitle);
			}

			moveUpButton.addEventListener('action-activate', this.upButtonListener);

			Databind.if(moveUpButton, '{{item.index}} > 0');
			{
				itemContainerHover.appendChild(moveUpButton);
			}


			const primaryIcon: HTMLElement = document.createElement("div");

			primaryIcon.classList.add("build-queue__item-icon", "size-16", "bg-contain", "relative", "pointer-events-none");
			Databind.classToggle(primaryIcon, "unit-icon", "{{item.isUnit}}");

			primaryIcon.setAttribute('data-bind-style-background-image-url', `{{item.icon}}`);

			item.appendChild(primaryIcon);

			const deleteButton: HTMLElement = document.createElement('fxs-activatable');

			deleteButton.classList.add("build-queue__close-button", "size-6", "absolute", "-right-2", "-top-2", "bg-contain");

			Databind.attribute(deleteButton, 'item-type', "item.type");
			Databind.attribute(deleteButton, 'item-index', "item.index");
			Databind.classToggle(deleteButton, "hidden", "{{g_NavTray.isTrayRequired}}");

			deleteButton.addEventListener('action-activate', this.deleteButtonListener);

			const deleteButtonNavHelp: HTMLElement = document.createElement('fxs-nav-help');

			deleteButtonNavHelp.classList.add("cancel");

			deleteButton.appendChild(deleteButtonNavHelp);

			const progressTurnsContainer = document.createElement('div');
			progressTurnsContainer.classList.add('progress-turns-container', 'relative', 'flex', 'flex-col', "grow", "justify-center", "items-center", "min-w-16", "m-1");

			const progressBar: HTMLDivElement = document.createElement('div');
			Databind.if(progressBar, `{{item.percentComplete}} > -1`);
			{
				progressBar.classList.add("build-queue__item-progress-bar", "relative", "p-0\\.5", "flex", "flex-col-reverse", "h-10", "w-4");

				const progressBarFill: HTMLElement = document.createElement('div');

				progressBarFill.classList.add("build-queue__progress-bar-fill", "relative", "bg-contain", "w-3");

				Databind.style(progressBarFill, "height", "{{item.percentComplete}}+'%'");

				progressBar.appendChild(progressBarFill);

			}
			progressTurnsContainer.appendChild(progressBar)

			const turns: HTMLDivElement = document.createElement("div");

			turns.classList.add("build-queue__turn", "relative", "bottom-0", "right-0", "flex", "items-center");
			const turnsClockIcon: HTMLElement = document.createElement("div");
			turnsClockIcon.classList.add("build-queue__turn-icon", "size-8", "relative");
			turns.appendChild(turnsClockIcon);
			const turnLabel: HTMLElement = document.createElement("div");
			turnLabel.classList.add("build-queue__turn-value", "relative", "text-base");
			turnLabel.setAttribute('data-bind-value', '{{item.turns}}');
			turns.appendChild(turnLabel);
			progressTurnsContainer.appendChild(turns);

			itemContainer.appendChild(itemContainerHover);
			itemContainer.appendChild(progressTurnsContainer);
			itemContainer.appendChild(item);
			itemContainer.appendChild(deleteButton);

			itemContainerOuter.appendChild(itemContainer);

			itemContainerDiv.appendChild(itemContainerOuter);
		}
		containerQueued.appendChild(itemContainerDiv);
	}

	onDetach() {
		this.Root.removeEventListener('focusin', this.focusInListener);
		const captureMode: boolean = true;
		this.Root.removeEventListener('focusout', this.focusOutListener, captureMode);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);

		window.removeEventListener(FocusCityViewEventName, this.onFocusCityViewEvent);

		super.onDetach();
	}

	private onFocusCityViewEvent = (event: FocusCityViewEvent) => {
		if (event.detail.destination != 'left-queue') {
			// Ignore since we're not trying to focus this area of the city view
			return;
		}

		if (!BuildQueue.isEmpty && InterfaceMode.isInInterfaceMode('INTERFACEMODE_CITY_PRODUCTION')) {
			const vSlot: Element | null = this.Root.querySelector('.build-queue__item-container');
			if (vSlot == null) {
				console.error("panel-build-queue: onFocusCityViewEvent(): Missing vSlot with '.fxs-vslot'");
				return;
			}

			FocusManager.setFocus(vSlot);
		}
	}

	private onFocusIn() {
		if (!this.firstFocus) {
			// Internal focus changes are ignored
			return;
		}

		this.firstFocus = false;

		// Note the PanelBuildQueue does NOT use the Component::onReceiveFocus() and the 'event-mgr-receive-focus'
		// (the Context Manager does NOT push it) so the NavTray is updated here.
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		NavTray.addOrUpdateShellAction1("LOC_UI_QUEUE_DELETE_ITEM");
	}

	private onFocusOut({ relatedTarget }: FocusEvent) {
		if (relatedTarget instanceof Node && this.Root.contains(relatedTarget)) {
			// Internal focus changes are ignored
			return;
		}

		this.firstFocus = true; // reset

		// Note the PanelBuildQueue does NOT use the Component::onLoseFocus() and the 'event-mgr-lose-focus'
		// (independent from the Context Manager focus system) so the NavTray is updated here.
		NavTray.clear();
	}

	private onItemEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.detail.name == 'shell-action-1' || inputEvent.detail.name == 'mousebutton-right') {
			this.requestDelete(inputEvent);
		} else if (inputEvent.detail.name == 'keyboard-enter' || inputEvent.detail.name == 'accept') {
			this.requestMoveUp(inputEvent);
		}
	}

	private requestDelete(event: CustomEvent) {
		const targetElement: EventTarget | null = event.target;
		if (targetElement instanceof HTMLElement) {
			const itemType: string | null = targetElement.getAttribute('item-type');
			const index: string | null = targetElement.getAttribute('item-index');
			const parsedIndex = parseInt(index ?? "0");
			if (itemType && index) {
				Audio.playSound("data-audio-dequeue-item", "audio-production-chooser");

				// this was the last item on the queue so move to the production list
				if (BuildQueue.items.length == 1) {
					window.dispatchEvent(new FocusCityViewEvent({ source: 'right', destination: 'left' }));
				}
				else {
					let newFocusElement: HTMLElement | null;
					if (parsedIndex == BuildQueue.items.length - 1) {
						newFocusElement = this.Root.querySelector(`.build-queue__item-container[item-index="${(parsedIndex - 1)}"]`);
					} else {
						newFocusElement = this.Root.querySelector(`.build-queue__item-container[item-index="${(parsedIndex)}"]`);
					}
					if (newFocusElement) {
						FocusManager.setFocus(newFocusElement);
					} else {
						window.dispatchEvent(new FocusCityViewEvent({ source: 'right', destination: 'left' }));
					}
				}
				// TODO: handle focus after the build queue has been modified to handle the case where the focus will shift up if we don't cancel the last item
				// TODO: a proper solution may be to mod fxs-slot to resolve focus on child tree changes
				window.dispatchEvent(new RequestBuildQueueCancelItemEvent(index));
				event.stopPropagation();
				event.preventDefault();
			}
		}
	}

	private requestMoveUp(event: CustomEvent) {
		const targetElement: EventTarget | null = event.target;
		if (targetElement instanceof HTMLElement) {
			const itemType: string | null = targetElement.getAttribute('item-type');
			const index: string | null = targetElement.getAttribute('item-index');

			if (itemType && index) {
				let moveIndex: number;
				if (index == "0") {
					moveIndex = parseInt(index) - 1;
					window.dispatchEvent(new RequestBuildQueueMoveItemLastEvent(index));
				} else {
					moveIndex = parseInt(index) - 1;
					window.dispatchEvent(new RequestBuildQueueMoveItemUpEvent(index));
				}
				const newFocusElement = this.Root.querySelector(`.build-queue__item-container[item-index="${(moveIndex)}"]`);

				if (newFocusElement) {
					FocusManager.setFocus(newFocusElement);
				}
				event.stopPropagation();
			}
		}
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		const live: boolean = this.handleNavigation(navigationEvent);
		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		}
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	private handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH && navigationEvent.detail.status != InputActionStatuses.UPDATE) {
			// Ignore everything but FINISH/UPDATE events
			return true;
		}

		let live: boolean = true;

		const direction: InputNavigationAction = navigationEvent.getDirection();

		switch (direction) {
			case InputNavigationAction.LEFT:
				window.dispatchEvent(new FocusCityViewEvent({ source: 'right', destination: 'left' }));
				live = false;
				break;
		}

		return live;
	}

	private onItemFocus(event: FocusEvent) {
		const target: HTMLElement | null = event.target as HTMLElement;
		if (target == null) {
			console.error("panel-build-queue: onItemFocus(): Invalid event target. It should be an HTMLElement");
			return;
		}

		const itemIndexStr: string | null = target.getAttribute("item-index");
		if (itemIndexStr == null) {
			console.error("panel-build-queue: onItemFocus(): Invalid item-index attribute");
			return;
		}
	}
}

Controls.define('panel-build-queue', {
	createInstance: PanelBuildQueue,
	description: 'Area for production build queue information.',
	styles: ["fs://game/base-standard/ui/build-queue/panel-build-queue.css"]
});

declare global {
	interface HTMLElementTagNameMap {
		'panel-build-queue': ComponentRoot<PanelBuildQueue>;
	}

	interface WindowEventMap {
		'request-build-queue-move-item-up': RequestBuildQueueMoveItemUpEvent;
		'request-build-queue-cancel-item': RequestBuildQueueCancelItemEvent;
		'request-build-queue-move-item-last': RequestBuildQueueMoveItemLastEvent;
	}
}
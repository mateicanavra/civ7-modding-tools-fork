/**
 * @file context-manager.ts
 * @copyright 2021-2023, Firaxis Games
 * @description An object to manager new UI "context" requests. 
 */

import { setContextManager } from '/core/ui/framework.js';
import Cursor from '/core/ui/input/cursor.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js'
import FocusManager from '/core/ui/input/focus-manager.js';
import { IEngineInputHandler, InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import Panel from '/core/ui/panel-support.js';
import ViewManager from '/core/ui/views/view-manager.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';

export interface PushProperties<PanelOptions = never, Attributes = never> {
	singleton: boolean;
	createMouseGuard?: boolean;
	targetParent?: HTMLElement;
	attributes?: Attributes;
	panelOptions?: PanelOptions;  // optional, panel-specific properties
	viewChangeMethod?: UIViewChangeMethod;
}

export interface PopProperties {
	mustExist?: boolean;
	dontDetach?: boolean;
	viewChangeMethod?: UIViewChangeMethod;
}

// TODO: remove, context manager should only track context it should not signal
export namespace ContextManagerEvents {
	export const OnChanged: string = "OnContextManagerChanged";
	export const OnOpen: string = "OnContextManagerOpen";
	export const OnClose: string = "OnContextManagerClose";
}


class ContextManagerSingleton {
	private static _instance: ContextManagerSingleton;
	private engineInputEventHandlers: IEngineInputHandler[] = [];

	//Array of component references  
	private screens: HTMLElement[] = [];

	//Events for components to listen for any Context state changes 
	private receiveFocusEvent: CustomEvent = new CustomEvent('event-mgr-receive-focus');
	private loseFocusEvent: CustomEvent = new CustomEvent('event-mgr-lose-focus');
	private popFocusEvent: CustomEvent = new CustomEvent('event-mgr-pop');

	private targetSlotPrefix: string = "target-slot-";

	private lastActivatedComponent: Component | null = null;

	constructor() {
		window.addEventListener('set-activated-component', this.onSetActivatedEvent.bind(this));

		window.addEventListener('view-changed', () => {
			const screen = this.screens.find((screen) => {
				const panel = (screen as ComponentRoot<Panel>).component;
				return panel.inputContext != undefined && panel.inputContext != InputContext.INVALID;
			});

			if (!screen) {
				ViewManager.handleReceiveFocus();
			}
		});
	}

	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!ContextManagerSingleton._instance) {
			ContextManagerSingleton._instance = new ContextManagerSingleton();
		}
		return ContextManagerSingleton._instance;
	}

	get isEmpty(): boolean { return (this.screens.length == 0); }

	/** ------------------------------------------------------------------------------------------------------------------
	 * Push a reference to a component in to the front of the stack.
	 * @param targetElement The element you want to register with the ContextManager, extending HTMLElement somewhere in its parentage. 
	 */
	pushElement<PanelOptions, Attributes>(targetElement: HTMLElement, prop?: PushProperties<PanelOptions, Attributes>) {

		let deactivatedElement: HTMLElement | undefined;
		if (this.screens.length > 0) {
			//let the old screen know to un-focus
			// don't notify when are pushing the mouseguard otherwise it will dispatch the event twice
			if (targetElement.tagName.toLowerCase() != "mouse-guard") {
				this.screens[0].dispatchEvent(this.loseFocusEvent);
			}
			deactivatedElement = this.screens[0];
		}
		if (prop && prop.createMouseGuard) {
			let guardProperties: PushProperties = {
				singleton: true,
				targetParent: targetElement
			};

			const mouseGuard: HTMLElement = this.push("mouse-guard", guardProperties);
			if (prop.attributes) {
				//Check whether or not we want to darken the screen with the mouse-guard
				if ((prop.attributes as any).shouldDarken === false) {
					mouseGuard.classList.add("invisible");
				}
				//blackOut is a completely black background - only use when necessary 
				if ((prop.attributes as any).blackOut === true) {
					mouseGuard.classList.add("bg-black");
				}
			}

			ViewManager.isWorldInputAllowed = false;
		}

		//Add target screen to the stack and order the screens by document order so that the topmost context is always the one that draws on top
		// NOTE: This does not take into account manually set z-orders
		this.screens.unshift(targetElement);
		this.screens.sort((a, b) => {
			const pos = a.compareDocumentPosition(b);

			if (pos & (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY)) {
				return 1;
			} else if (pos & (Node.DOCUMENT_POSITION_PRECEDING | Node.DOCUMENT_POSITION_CONTAINS)) {
				return -1;
			}

			return 0;
		});

		// Notify listeners...
		if (targetElement.tagName.toLowerCase() != "mouse-guard") {
			engine.trigger(ContextManagerEvents.OnChanged, { detail: { activatedElement: targetElement, deactivatedElement: deactivatedElement } });
			engine.trigger(ContextManagerEvents.OnOpen, { detail: { activatedElement: targetElement, deactivatedElement: deactivatedElement } });

			// Only update the active input context if the pushed screen is the topmost context
			if (targetElement === this.screens[0]) {
				const panel = (targetElement as ComponentRoot<Panel>).component;
				if (panel.inputContext != null && panel.inputContext != InputContext.INVALID) {
					Input.setActiveContext(panel.inputContext);
				}

				targetElement.dispatchEvent(this.receiveFocusEvent); // must be sent after the ContextManagerEvents
			}
		}
	}

	// returns the type specified by HTMLElementTagNameMap[T] if T is a valid key of HTMLElementTagNameMap, otherwise HTMLElement
	push<T extends keyof HTMLElementTagNameMap, PanelOptions, Attributes>(targetClassName: T, prop?: PushProperties<PanelOptions, Attributes>): HTMLElementTagNameMap[T];
	push<PanelOptions, Attributes>(targetClassName: string, prop?: PushProperties<PanelOptions, Attributes>): HTMLElement;
	/** ------------------------------------------------------------------------------------------------------------------
	 * Function will create and the Push() a new elements of specified class type. 
	 * @param targetClassName string of HTMLElement type to create 
	 */
	push<PanelOptions, Attributes>(targetClassName: string, prop?: PushProperties<PanelOptions, Attributes>): HTMLElement {

		// Elements with mouse-guard will add the mouse-guard element before adding itself to the list of screens but will be attached 
		// if the screen set the focus in the onAttach it will break the initialFocus so ignore mouse-guard elements
		if (this.screens.length == 0 && targetClassName != "mouse-guard") {
			// keep the current focus to restore it when the screen stack is empty
			ViewManager.handleLoseFocus();
		}

		let target: HTMLElement | undefined;

		if (prop && !prop.singleton) {
			//If not a singleton, then create a new element.
			target = document.createElement(targetClassName);
		}
		else {
			//Singleton or no prop specified ... 
			// ...so search the stack 
			var targetIndex: number = -1;
			if (targetClassName != "mouse-guard") { //TODO: this is inelegant. 
				targetIndex = this.getTargetIndex(targetClassName);
			}
			// and create a new one if necessary 
			if (targetIndex == -1) {
				target = document.createElement(targetClassName);

				// Forward any attributes along to the new target: 
				if (prop?.attributes) {
					this.passTargetAttributes(target, prop.attributes);
				}

				var possibleSpecificTarget: HTMLElement | null = null;
				//If a parent is specified, then attach to that parent
				if (prop && prop.targetParent) {
					possibleSpecificTarget = prop.targetParent;
				}
				else {
					// If no parent specified, then look for a slot target for our classname.
					// This would be set in the customizable layouts. 
					possibleSpecificTarget = document.getElementById(`${this.targetSlotPrefix}${targetClassName}`);
				}

				// Now let's pluck out which node we want to attach to. 
				let targetParent: HTMLElement | null = null;
				if (possibleSpecificTarget) {
					targetParent = possibleSpecificTarget;
				} else {    // fall back to the popup root
					targetParent = document.querySelector<HTMLDivElement>('.fxs-popups');
				}

				if (targetParent) {
					//Inject the mouse guard on the same parent behind the target screen. 
					if (targetClassName == "mouse-guard") {
						// Mouse guards are guaranteed to have a usable parent (the screen they're attached to) so insert before that parent
						targetParent.parentNode?.insertBefore(target, targetParent);
					}
					else { //else we are NOT a mouse-guard, so append normally. 
						targetParent.appendChild(target);
					}
				}
				else {
					console.error(`ContextManager.push() failed to find a targetParent to load the requested screen in to: { classname: ${targetClassName} }`);
				}
			}
			else {
				//Grab the singleton out of the stack
				const screenBeneathTarget: HTMLElement = this.screens[targetIndex + 1];
				target = this.screens.splice(targetIndex, 1)[0];

				// Forward any attributes along to the new target: 
				if (prop?.attributes) {
					this.passTargetAttributes(target, prop.attributes);
				}

				//If there's a mouse guard lingering beneath this screen, nuke it, too. A new mouse guard could be generated depending on target element's push props. 
				if (screenBeneathTarget?.tagName == "MOUSE-GUARD") {
					screenBeneathTarget?.parentElement?.removeChild(screenBeneathTarget);
					this.screens.splice(targetIndex, 1);
				}
			}
		}

		//Put our target at the top of the stack. 
		this.pushElement(target, prop);

		const panel: Panel = (target as ComponentRoot<Panel>).component;
		let viewChangeMethod: UIViewChangeMethod = UIViewChangeMethod.Unknown;
		if (prop) {
			if (prop.viewChangeMethod) {
				viewChangeMethod = prop.viewChangeMethod;
			}
		}

		const panelContent: string = panel.getPanelContent ? panel.getPanelContent() : "";
		if (panelContent == "replaying") {	// If this is a repeat, close before re-opening; mainly for audio tracking.			
			UI.panelEnd(targetClassName, panelContent, viewChangeMethod, false);
		}
		UI.panelStart(targetClassName, panelContent, viewChangeMethod, true);

		// setPanelOptions() will eventually call onAttach() for the panel being pushed.  If that onAttach() then pushes a screen itself,
		// then this function will recurse.  So setPanelOptions() must be called AFTER UI.panelStart() to keep the game in-order.
		if (prop) {
			if (prop.panelOptions) {
				panel.setPanelOptions(prop.panelOptions);
			}
		}

		return target;

	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Pop the first instance found of an element out of the Context. 
	 * Note: this does NOT pop anything else. If you want to pop all elements
	 * on top of the target, too; use PopUntil(). 
	 * @param target string class name of the screen or element you are looking for 
	 * @param prop.mustExist optional flag to require the target to exist. A warning in the log generated if flagged but target not found. 
	 */
	pop(target: string | HTMLElement | undefined, prop?: PopProperties) {
		if (target == undefined) {
			return;
		}

		let targetElement: HTMLElement | undefined = undefined;
		if (target instanceof HTMLElement) {
			targetElement = target;
		} else {
			targetElement = this.getTarget(target);
		}

		if (targetElement) {
			let dontDetach: boolean = false;
			if (prop && prop.dontDetach) {
				dontDetach = prop.dontDetach;
			}

			if (!dontDetach) {
				targetElement.parentElement?.removeChild(targetElement);    // remove from DOM
			}

			const foundIndex: number = this.getTargetIndex(target);

			if (foundIndex == 0) {
				// only notify the element lost the focus if it was on top of the stack
				targetElement.dispatchEvent(this.loseFocusEvent);           // Context manager signaling
			}

			if (foundIndex > 0 && prop && prop.mustExist) {
				console.warn(`ContextManager.pop() requesting to pop a screen which is not currently the top of the stack. THIS WILL CAUSE PROBLEMS! : classname: ${target}, foundIndex: ${foundIndex}`);
				console.log((new Error()).stack);
			}

			// ... now boot it out of the stack. 
			if (foundIndex >= 0) {
				this.screens.splice(foundIndex, 1);
			}

			if (!dontDetach) {
				targetElement.dispatchEvent(this.popFocusEvent);
			}

			// Check for a MouseGuard under our screen
			// If a mouseguard is now at the top of the stack / where the target screen was previously...
			if ((this.screens.length > 0) && (foundIndex >= 0) && (foundIndex <= (this.screens.length - 1)) && (this.screens[foundIndex].tagName == "MOUSE-GUARD")) {
				const mouseGuardElement: HTMLElement | undefined = this.screens[foundIndex];
				mouseGuardElement?.parentElement?.removeChild(mouseGuardElement);
				// ...boot it out of the stack. 
				this.screens.splice(foundIndex, 1);
				mouseGuardElement?.dispatchEvent(this.popFocusEvent);
			}

			let activatedElement: HTMLElement | undefined;
			// Let next one on top of stack know it's activated
			if (this.screens.length > 0) {
				if (foundIndex == 0) {
					// only notify the top of the stack it received focus if we removed the top screen

					// look for the first screen with a valid input context
					const screen = this.screens.find((screen) => {
						const panel = (screen as ComponentRoot<Panel>).component;
						return panel.inputContext != undefined && panel.inputContext != InputContext.INVALID;
					});

					if (screen) {
						const panel = (screen as ComponentRoot<Panel>).component;
						Input.setActiveContext(panel.inputContext);
					} else {
						// no screen had a valid input context to apply the view one
						Input.setActiveContext(ViewManager.current.getInputContext());
					}
				}

				// Check if focus is in the active context - if not set focus on it.
				activatedElement = this.screens[0];
				if (!activatedElement.contains(document.activeElement)) {
					activatedElement.dispatchEvent(this.receiveFocusEvent);
				}
			} else {
				ViewManager.handleReceiveFocus();

				// TODO: flip it so view-manager uses context-manager, not vice-versa so that
				// when entering the default/world view, there should be a check if the context-manager is empty
				// HACK: when empty check the view to signal back to audio
				if (ViewManager.current.getName() == "World") {
					UI.panelDefault();
				}

			}

			engine.trigger(ContextManagerEvents.OnChanged, { detail: { activatedElement: activatedElement, deactivatedElement: targetElement } });
			engine.trigger(ContextManagerEvents.OnClose, { detail: { activatedElement: activatedElement, deactivatedElement: targetElement } });

			let viewChangeMethod: UIViewChangeMethod = UIViewChangeMethod.Unknown;
			if (prop) {
				if (prop.viewChangeMethod) {
					viewChangeMethod = prop.viewChangeMethod;
				}
			}

			const panel: Panel = (targetElement as ComponentRoot<Panel>).component;
			const panelName: string = targetElement.tagName.toLowerCase();
			const panelContent: string = panel.getPanelContent ? panel.getPanelContent() : "";
			UI.panelEnd(panelName, panelContent, viewChangeMethod, false);
		}

		if (this.getTarget("mouse-guard") == undefined) {
			const worldInputRule = ViewManager.current.getRules().find((rule) => rule.name == "world-input");
			if (worldInputRule == undefined || (worldInputRule.selectable != undefined && worldInputRule.selectable == true)) {
				ViewManager.isWorldInputAllowed = true;
			}
		}

		//If we've fallen out here, then we never found a match.
		//This can be intentional. 

		// BUT! If flagged that the it must exist, warning time! 
		if (prop && prop.mustExist) {
			console.warn(`ContextManager.pop() failed to find requested screen: { classname: ${target}, prop.mustExist: ${prop.mustExist}`);
			console.log((new Error()).stack);
		}
	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Pop all elements until target is reached, NOT INCLUDING target. 
	 * @param targetClassName string class name of the screen or element you are looking for 
	 * @param prop optional flags 
	 */
	popUntil(targetName: string, prop?: PopProperties) {

		// TODO Clear only the dialog box opened by the popped screen
		// TODO a solution would be to add a reference or an id of the screen that opened the dialog box 
		DialogManager.clear();

		var foundIndex: number = this.getTargetIndex(targetName);
		if (foundIndex > 0 /*NOT including self target*/) {

			const targetTagName = targetName.toUpperCase();
			//Look at screens from zero in the array NOT INCLUDING our target class 
			for (var iScreen = 0; iScreen < foundIndex; iScreen++) {
				if (this.screens[0].tagName == targetTagName) {
					//Safety check that may trigger when there are mouseguards layered in with the screens. 
					//Once we hit our target screen, bail. 
					continue;
				}
				this.pop(this.screens[0].tagName, prop);
			}
			return;
		}

		//If flagged that the it must exist, warning time! 
		if (prop && prop.mustExist) {
			console.warn(`ContextManager.popUntil() failed to find requested screen: { classname: ${targetName}, prop.mustExist: ${prop.mustExist}`);
			console.log((new Error()).stack);
		}
	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Pop all elements until the target is reached AND INCLUDING the target. 
	 * @param targetClassName string class name of the screen or element you are looking for 
	 * @param prop optional flags 
	 */
	popIncluding(targetClassName: string, prop?: PopProperties) {

		var foundIndex: number = this.getTargetIndex(targetClassName);
		if (foundIndex == 0 && prop && prop.mustExist) {
			console.warn(`ContextManager.popIncluding() failed to find requested screen: { classname: ${targetClassName}, prop.mustExist: ${prop.mustExist}`);
			console.log((new Error()).stack);
		}
		else {
			this.popUntil(targetClassName, prop);
			this.pop(targetClassName, prop);
		}
	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Clear the entire stack, generally down to the HUD. 
	 */
	clear() {
		var target: HTMLElement | undefined;
		while (this.screens.length > 0) {
			target = this.getCurrentTarget();
			if (target) {
				this.pop(target);
			}
		}
	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Returns a REFERENCE to an HTMLElement, if found in the screen Context array 
	 * @param targetClassName string class name of the screen or element you are looking for 
	 */
	getTarget(target: string | HTMLElement): HTMLElement | undefined {
		if (target instanceof HTMLElement) {
			return this.screens.find(function (item: HTMLElement) { return item == target });
		} else {
			const targetTagName = target.toUpperCase();
			return this.screens.find(function (item: HTMLElement) { return item.tagName == targetTagName });
		}
	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Private look up for INDEX of an HTMLElement in the Context array 
	 * @param target string class name of the screen or element you are looking for 
	 */
	private getTargetIndex(target: string | HTMLElement): number {
		if (target instanceof HTMLElement) {
			return this.screens.findIndex(function (item: HTMLElement) { return item == target });
		} else {
			const targetTagName = target.toUpperCase();
			return this.screens.findIndex(function (item: HTMLElement) { return item.tagName == targetTagName });
		}
	}
	/** ------------------------------------------------------------------------------------------------------------------
	 * Returns current HTMLElement at the top of the stack
	 */
	getCurrentTarget(): HTMLElement | undefined {
		if (this.screens.length >= 1) {
			return this.screens[0];
		}
		else {
			return undefined;
		}
	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Returns true if there is any instance of the target class
	 * @param targetClassName string class name of the screen or element you are looking for 
	 */
	hasInstanceOf(targetClassName: string, prop?: PopProperties): boolean {
		if (this.getTargetIndex(targetClassName) > -1) {
			return true;
		}
		else {
			if (prop && prop.mustExist) {
				console.warn(`ContextManager.doesNotHaveInstanceOf() has unexpectedly found the target type: { classname: ${targetClassName}`);
				console.log((new Error()).stack);
			}
			return false;
		}
	}

	/** ------------------------------------------------------------------------------------------------------------------
	 * Returns true if the target screen class is atzero in the array 
	 * @param targetClassName string class name of the screen or element you are looking for 
	 */
	isCurrentClass(targetClassName: string): boolean {
		return (this.getTargetIndex(targetClassName) == 0);
	}

	/** ------------------------------------------------------------------------------------------------------------------ */
	/** Convert generic key:value object in to HTML attributes  */
	private passTargetAttributes(target: HTMLElement, attributes: object) {
		let logInfo = "";
		for (let [key, value] of Object.entries(attributes)) {
			target.setAttribute(key, value);
			logInfo += `${key}: ${value ?? "-"}, `;
		}
		if (logInfo.length > 3) {
			logInfo = logInfo.substring(0, logInfo.length - 3);	// Clean up trailing ",  "
		}
		console.log("context-manager, attrs: " + logInfo);
	}
	/** ------------------------------------------------------------------------------------------------------------------ */

	/**
	 * Output formatted debugging information to the log.
	 */
	log() {
		console.log(`===========================`);
		console.log(`ContextManager log information:`);
		var targetElement: HTMLElement;

		var targetInfo: string = "";
		for (var index = 0; index < this.screens.length; index++) {
			targetElement = this.screens[index];
			if (targetElement == null) {
				targetInfo = `null`;
			}
			else {
				targetInfo = targetElement.tagName;
			}
			console.log(`${index} \t  ${targetInfo}`);
		}
		console.log(`===========================`);
	}

	//TODO: remove this when we update focus management system. 
	//For now, we need to divide when this engine event is used by various parts of UI. 
	canUseInput(source: string, action: string): boolean {
		switch (source) {
			case 'plot-cursor':
				if (this.getCurrentTarget()?.tagName == "TUTORIAL-DIALOG") {
					return false;
				}
				break;
			case 'world-input':
			case 'notification-train':
				if (action == "action-target" || action == "action-next-action") {
					//By using hasInstanceOf(), we are checking the stack, so that we still get true if sub-screens appear in the tech/culture flow.
					if (this.hasInstanceOf("screen-tech-tree-chooser")
						|| this.hasInstanceOf("screen-culture-tree-chooser")
						|| this.hasInstanceOf("tutorial-dialog")
					) {
						return false;
					}
				}
				break;
			case 'panel-radial-menu':
				if (this.isCurrentClass(source)) {
					return true;
				}
				//Only allowed to fire in HUD mode. 
				if (!this.isEmpty) {
					return false;
				}
				break;
		}
		return true;
	}

	/// Add an input handler; input will be handled in the order provided.
	registerEngineInputHandler(engineEventHandler: IEngineInputHandler) {
		this.engineInputEventHandlers.push(engineEventHandler);
	}

	/// Remove an input handler.  (Only loading screen should be doing this!)
	unregisterEngineInputHandler(engineEventHandler: IEngineInputHandler) {
		const index: number = this.engineInputEventHandlers.findIndex((handler) => { return handler == engineEventHandler; });
		if (index == -1) {
			console.warn("Unable to unregister event handler, not found in list!");
			return;
		}
		this.engineInputEventHandlers.splice(index, 1);
	}


	private onSetActivatedEvent(event: SetActivatedComponentEvent) {
		this.setLastActivatedComponent(event.detail.component);
	}

	private setLastActivatedComponent(component: Component | null) {
		if (this.lastActivatedComponent != component) {
			if (this.lastActivatedComponent) {
				this.lastActivatedComponent.onDeactivated();
			}
			this.lastActivatedComponent = component;
		}
	}

	private shouldSendEventToCursor(inputEvent: InputEngineEvent): boolean {
		return inputEvent.detail.isMouse;
	}

	/**
	 * Run through input handlers
	 * @param inputEvent An 'engine-input' event to process.
	 * @returns true if still valid (may need to be handled) or false if event was cancelled.
	 */
	handleInput(inputEvent: InputEngineEvent): boolean {
		if ((inputEvent.detail.name == undefined) || inputEvent.type != 'engine-input') {
			console.warn("CM: Attempt to process a non 'engine-input' custom event in the input handler: ", inputEvent.type);
			return true;
		}

		//Don't use focus for touch/mouse events otherwise the focused element will handle
		//the touch tap/mouse click before the touch/mouse click target
		if (FocusManager.isFocusActive() && !inputEvent.detail.isTouch && !this.shouldSendEventToCursor(inputEvent)) {
			FocusManager.getFocus().dispatchEvent(inputEvent);
			if (inputEvent.defaultPrevented) {
				return false;
			}
		}

		if (this.shouldSendEventToCursor(inputEvent) && Cursor.target instanceof HTMLElement) {
			if (inputEvent.detail.name == 'mousebutton-left' && Cursor.ignoreCursorTargetDueToDragging && inputEvent.detail.status == InputActionStatuses.FINISH) {
				Cursor.ignoreCursorTargetDueToDragging = false;
				return false;
			}
			Cursor.target.dispatchEvent(inputEvent);
			if (inputEvent.defaultPrevented) {
				return false;
			}
		}

		if (inputEvent.detail.isTouch) {
			const element: Element | null = document.elementFromPoint(inputEvent.detail.x, inputEvent.detail.y);
			element?.dispatchEvent(inputEvent);
			if (inputEvent.defaultPrevented) {
				return false;
			}
		}

		const currentTarget: HTMLElement | undefined = this.getCurrentTarget();
		if (currentTarget != undefined) {
			currentTarget.dispatchEvent(inputEvent); // Specific context? Give it first crack.
			if (inputEvent.defaultPrevented) {
				return false;
			}
		}

		if (inputEvent.detail.status == InputActionStatuses.FINISH && ['mousebutton-left', 'accept', 'touch-tap'].includes(inputEvent.detail.name)) {
			this.setLastActivatedComponent(null);
		}

		// If not yet handled, let other handler (registered in order) get a crack at it.
		return !this.engineInputEventHandlers.some((handler: IEngineInputHandler) => {  // Flip final answer so true means keep processing (outside of this)
			return !handler.handleInput(inputEvent);  // Flip to false so some() keeps processing.
		});
	}

	/**
	 * Handle focus navigation specific events.  These are based on input events but may bounce around the system more based on the rules slots contain.
	 * @param navigationEvent Event with navigation details.
	 * @returns true if even is still valid, or false if it was cancelled.
	 */
	handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		const focus: HTMLElement = FocusManager.getFocus();
		focus.dispatchEvent(navigationEvent);
		if (!navigationEvent.defaultPrevented && (this.getCurrentTarget() != undefined)) {
			this.getCurrentTarget()!.dispatchEvent(navigationEvent); // Specific context? Give it first crack.            
		}
		let cancelled: boolean = navigationEvent.defaultPrevented;
		if (!cancelled) {
			// If not yet handled, let other handler (registered in order) get a crack at it.
			cancelled = this.engineInputEventHandlers.some((handler: IEngineInputHandler) => {
				return !handler.handleNavigation(navigationEvent);  // Flip to false so some() keeps processing.
			});
		}
		return !cancelled;  // Flips so true means input is still live
	}

	public canOpenPauseMenu(): boolean {
		const pausingDisabled = DisplayQueueManager.activeDisplays.some((request => request.disablesPausing));
		if (pausingDisabled) {
			return false;
		}

		// if we're in the screen-endgame sequence, don't allow pause
		if (ContextManager.getTarget("screen-endgame")) {
			return false;
		}

		// pause menu can be opened when not in cinematic mode and we haven't retired.
		const isCinematic = DisplayQueueManager.activeDisplays.some(request => request.category === "Cinematic");
		return !isCinematic && !GameContext.hasSentRetire();
	}

	public isGameActive(): boolean {
		return (!Game.AgeProgressManager.isAgeOver || Game.AgeProgressManager.isExtendedGame) && !GameContext.hasSentRetire();
	}

	public canSaveGame(): boolean {
		return this.isGameActive();
	}

	public canLoadGame(): boolean {
		return this.isGameActive();
	}

	/** Should the UI show a modal popup, based on the input player 
	 * This helps prevent popups from being shown if automation is
	 * running.
	*/
	public shouldShowPopup(playerId: PlayerId) {
		if (playerId == GameContext.localPlayerID && !Automation.isActive) {
			// Check if the player is a participating human too, the local player can be an AI for testing purposes.
			return Players.isParticipant(playerId) && Players.isHuman(playerId);
		}
		return false;
	}

	// Similar to a popup, but called out differently for usage context
	public shouldShowModalEvent(playerId: PlayerId) {
		if (playerId == GameContext.localPlayerID && !Automation.isActive) {
			// Check if the player is a participating human too, the local player can be an AI for testing purposes.
			return Players.isParticipant(playerId) && Players.isHuman(playerId);
		}
		return false;
	}

	// Check to see if there is no user input active.
	public noUserInput() {
		return (Automation.isActive || Autoplay.isActive || Players.isParticipant(GameContext.localPlayerID) == false || Players.isHuman(GameContext.localPlayerID) == false);
	}
}
const ContextManager = ContextManagerSingleton.getInstance();
setContextManager(ContextManager);
export { ContextManager as default };

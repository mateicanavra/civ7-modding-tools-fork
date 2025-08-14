/**
 * @file view-manager.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Tracks the "view" while in game.
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js'
import { AnchorType } from '/core/ui/panel-support.js';
import { Navigation } from '/core/ui/input/navigation-support.js'

export type ViewCallback = () => {};

export enum UISystem {
	HUD,
	World,
	Lens,
	Events,
	Unset
};

export enum SwitchViewResult {
	Error,
	NothingChanged,
	ChangesApplied
}

/**
 * @property {string} name of the UI components/sub-system to be affected
 * @property {UISystem} type the related user-interface system
 * @property {string} visible if the UI components/sub-system are visible during this time
 * @property {boolean} selectable can items be selected.
 */
export type ViewRules = {
	name: string,
	type: UISystem,
	visible?: string	// TODO: make a boolean?
	selectable?: boolean
} & ({ visible: string } | { selectable: boolean })

/** @description The state of a given (visibility) rule. */
type RuleState = { name: string, visible: boolean, selectable?: boolean };

/**
 * A "view" of the game
 */
export interface IGameView {
	/// Name of view
	getName(): string;
	// Input context for the view
	getInputContext(): InputContext;
	// Which harness tmeplate should the view use
	getHarnessTemplate(): string;
	/// Called by manager when entering view
	enterView(): void;
	/// Called by manager when leaving view
	exitView(): void;
	/// A callback function set to be called by view when entered
	addEnterCallback(func: ViewCallback): void;
	/// A callback function set to be called by view when leaving
	addExitCallback(func: ViewCallback): void;
	/// get rules on what should be shown and hidden during this view
	getRules(): ViewRules[];

	/// (optional) Take an input event and potentially do somethign with it.
	readInputEvent?(inputEvent: InputEngineEvent): boolean;
	/**
	 * (optional) Handle a navigation request
	 * @returns true if still live, false if input should stop.
	 */
	handleNavigation?(navigationEvent: NavigateInputEvent): boolean;

	// Called by manager when receiving focus
	handleReceiveFocus?(): void;

	// Called by manager when losing focus
	handleLoseFocus?(): void;
}

/**
 * Initial view set by view manager, should immediately be changed to a legit view.
 */
class UnsetView implements IGameView {
	getName(): string { return "Unset"; }
	getInputContext(): InputContext { return InputContext.Shell; }
	getHarnessTemplate(): string { return "empty"; }
	enterView() { console.error("Attempt to enter the UnsetView!"); }
	exitView() { }
	addEnterCallback(_func: ViewCallback) { console.error("Attempt to set the enter callback the UnsetView!"); }
	addExitCallback(_func: ViewCallback) { console.error("Attempt to set the exit callback the UnsetView!"); }
	getRules(): ViewRules[] { return []; }
}

/**
 * Single class to manage the current view and signal view changes.
 * Views can either be passed as new objects or used from a pool of views added earlier and references by name.
 */
class ViewManagerSingleton {
	private _current: IGameView = new UnsetView();
	private _last: IGameView = new UnsetView();
	private views: Map<string, IGameView> = new Map<string, IGameView>();
	private isHarnessHidden: boolean = false;
	private ruleStates: RuleState[] = [];
	//private previousViewID: string = "";
	private currentViewID: string = "";

	//Is world input like panning, rotating, or zooming allowed. Separate variable from view rule to allow context-manager to toggle this rule
	private _isWorldInputAllowed: boolean = true;

	private harness: HTMLElement | null = null;

	//Does the current view has focus
	private get viewHasFocus(): boolean {
		const harness: HTMLElement | null = this.getHarness();
		return FocusManager.isWorldFocused() || (harness != null && FocusManager.getFocusChildOf(harness) != null);
	};

	get current(): IGameView { return this._current; }	// current view
	get last(): IGameView { return this._last; }		// last view that was set

	private observerCallback = (multationList: MutationRecord[], observer: MutationObserver) => { this.onChildrenChanged(multationList, observer); }
	private observer: MutationObserver | null = null;

	constructor() {
		const config: MutationObserverInit = { attributes: false, childList: true, subtree: false };
		this.observer = new MutationObserver(this.observerCallback);
		const harness: HTMLElement | null = this.getHarness();
		if (harness) {
			this.observer.observe(harness, config);
		} else {
			if (UI.isInShell()) {
				console.warn("VM: Unable to find harness.  The ViewManager should not be loaded in the shell.");	// TODO: Fix the places like cursor and context-manager which are stuffing input values in ViewManager and move that functionality out of VM and into the action-handler.
			} else {
				console.error("VM: Unable to find harness during CTOR and not in Shell.");
			}
		}

		this.addHandler(new UnsetView());
	}

	/**
	 * Track if children are added (and removed) so a signal can be sent out 
	 * when a new DOM is loaded.
	 */
	private onChildrenChanged(mutationList: MutationRecord[], _observer: MutationObserver) {
		const isHarnessAdded: boolean = mutationList.some((mutationRecord: MutationRecord) => {
			return (mutationRecord.addedNodes.length > 0);
		});
		if (isHarnessAdded) {
			// No detail sent, listeners can obtained by looking at accessors on this singleton.
			window.dispatchEvent(new CustomEvent('view-changed'));
		}
	}

	private applyRules(): void {
		this._current.getRules().forEach((rule: ViewRules) => {
			switch (rule.type) {
				case UISystem.HUD:
					switch (rule.name) {
						case "harness":
							if (rule.visible == "false") {
								this.hideHarness();
							} else {
								this.showHarness();
							}
							break;

						default:
							console.error(`VM: Unknown HUD view rule name ${rule.name}`);
							break;
					}
					break;

				case UISystem.World:
					// World toggle states are tracked so if they are different than the rules in this view,
					// a message can be sent out to signal the change.
					// First step, get the tracked state...
					const state: RuleState | undefined = this.ruleStates.find(t => t.name == rule.name);
					const newVis: boolean = (rule.visible == "true");
					const newSelectable: boolean | undefined = rule.selectable;
					const INVALID_STATE_INDEX: number = -1;
					let stateIndex: number = INVALID_STATE_INDEX;

					// If the state isn't yet tracked...
					if (state == undefined) {
						this.ruleStates.push({ name: rule.name, visible: !newVis, selectable: newSelectable });
						// ... add an entry, but with the state rule inverted so its
						// guaranteed to mismatch and cause a state event to fire.
						stateIndex = this.ruleStates.length - 1;
					} else {
						stateIndex = this.ruleStates.indexOf(state);
					}

					if (stateIndex != INVALID_STATE_INDEX) {
						if (newVis != this.ruleStates[stateIndex].visible) {
							this.ruleStates[stateIndex].visible = newVis;
							// build the event name to send from the name in the rule
							const eventName: string = ((newVis) ? "ui-show-" : "ui-hide-") + rule.name;
							window.dispatchEvent(new CustomEvent(eventName, { bubbles: false }));
						} if (newSelectable !== this.ruleStates[stateIndex].selectable) {
							this.ruleStates[stateIndex].selectable = newSelectable;
							const eventName: string = (newSelectable ? "ui-enable-" : "ui-disable-") + rule.name;
							window.dispatchEvent(new CustomEvent(eventName, { bubbles: false }));
						}
					} else {
						console.error(`VM: couldn't find ${rule.name} in tracking info and couldn't add it`);
					}
					break;

				case UISystem.Lens:
					console.warn(`VM: TODO: implement lens toggling via view manager.`);
					break;

				case UISystem.Events:
					// Nothing to raise, value is set for other contexts to check.
					break;

				default:
					console.error(`VM: Unknown UISystem value '${rule.type}' when parsing view rules.`);
					break;
			}
		});
	}

	/**
	 * Set the current view either by object interface.
	 */
	set current(view: IGameView) {
		if (view == this._current) {
			//console.info("VM: Ignoring attempt to set view to '" + view.getName() + "', that's the current view."); // TODO: remove debugging
			return;
		}

		if (this.viewHasFocus) {
			this.handleLoseFocus();
		}

		this._current.exitView();
		this._last = this._current;
		this._current = view;
		this.applyRules();

		this.switchView(view.getHarnessTemplate());
		view.enterView();
	}

	/**
	 * Help API to set the current view by view name in the pool.
	 * @param {string} viewName The name of view that has been added to the pool.
	 * @returns true if successful.
	 */
	setCurrentByName(viewName: string): boolean {
		const view: IGameView | undefined = this.views.get(viewName);
		if (view == undefined) {
			console.error("VM: Unable to setCurrent view '" + viewName + "', none exists with that name.");
			return false;
		}
		this.current = view;
		return true;
	}

	/**
	 * Add a view to the pool.
	 * @param {IGameView} view The view to add to the pool.
	 */
	addHandler(view: IGameView) {
		if (this.views.has(view.getName())) {
			console.error("VM: Attempt to add view '" + view.getName() + "' but it already exists in the view pool.");
			return;
		}
		this.views.set(view.getName(), view);
	}

	/// Confirm a view is valid.
	isValid(view: IGameView): boolean {
		return !(view instanceof UnsetView);
	}

	/**
	 * Obtain a rule (within the view) for a given name.
	 * @param name of the rule
	 * @param last optional flag to search in the last set view
	 */
	private getRule(name: string): ViewRules | null {
		let matchingRule: ViewRules | null = null;
		this.current.getRules().some(rule => {
			if (rule.name == name) {
				matchingRule = rule;
				return true;
			}
			return false;
		});
		return matchingRule;
	}

	/**
	 * Should unit selection be listened to in this view?
	 * @returns true if should, false otherwise
	 */
	get isUnitSelectingAllowed(): boolean {
		const rule: ViewRules | null = this.getRule("units");
		if (!rule) {
			return true;	// Not explicitly set, default to allowing selection
		}
		return (rule.selectable != undefined && rule.selectable);
	}

	/**
	 * Should city selection be listened to in this view?
	 * @returns true if should, false otherwise
	 */
	get isCitySelectingAllowed(): boolean {
		const rule: ViewRules | null = this.getRule("cities");
		if (!rule) {
			return true;	// Not explicitly set, default to allowing selection
		}
		return (rule.selectable != undefined && rule.selectable);
	}

	/**
	 * Should world selection be listened to in this view?
	 * @returns true if should, false otherwise
	 */
	get isWorldSelectingAllowed(): boolean {
		const rule: ViewRules | null = this.getRule("world");
		if (!rule) {
			return true;	// Not explicitly set, default to allowing selection
		}
		return (rule.selectable != undefined && rule.selectable);
	}

	/**
	 * Should other world input (zooming, panning, rotating) be listened to in this view or context?
	 * @returns true if should, false otherwise
	 */
	get isWorldInputAllowed(): boolean {
		//Check if we have manually toggled this option from the context-manager (mouse-guard is up)
		if (!this._isWorldInputAllowed) {
			return false;
		}

		//Now check if the view has a rule for this
		const rule: ViewRules | null = this.getRule("world-input");
		if (!rule) {
			return true;	// Not explicitly set, default to allowing selection
		}
		return (rule.selectable != undefined && rule.selectable);
	}

	set isWorldInputAllowed(state: boolean) {
		this._isWorldInputAllowed = state;
		Camera.setPreventMouseCameraMovement(!state);
	}

	/**
	 * Should radial selection be allowed in this view?
	 * @returns true if should, false otherwise
	 */
	get isRadialSelectionAllowed(): boolean {
		const rule: ViewRules | null = this.getRule("radial-selection");
		if (!rule) {
			return false;	// Not explicitly set, default to not allowing radial selection
		}
		return (rule.selectable != undefined && rule.selectable);
	}

	/**
	 * Should small narratives be allowed in this view?
	 * @returns true if should, false otherwise
	 */
	get areSmallNarrativesAllowed(): boolean {
		const rule: ViewRules | null = this.getRule("small-narratives");
		if (!rule) {
			return true;	// Not explicitly set, default to allowing small narratives
		}
		return (rule.visible != undefined && rule.visible == "true");
	}

	/**
	 * If the current view handles input, let it inspect an engine input event.
	 * @param {InputEngineEvent} inputEvent An input event
	 * @returns true if the input is still "live" and not yet cancelled.
	 */
	handleInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.type != 'engine-input') {
			console.warn(`VM: Attempt to dispatch a non engine-input event '${inputEvent.type}' to the current view.`);
			return true;
		}
		if (!this.current.readInputEvent) {
			return true;
		}
		const live: boolean = this.current.readInputEvent(inputEvent);	// Send input to the view...
		return live;
	}

	/**
	 * Obtain the active view's harness DOM element.
	 * @returns the HTMLElement for the harness element or null if unable to be found.
	 */
	getHarness(): HTMLElement | null {
		if (!this.harness || !this.harness.isConnected) {
			this.harness = document.querySelector<HTMLElement>(".harness");
		}

		return this.harness;
	}

	/**
	 * Handle navigation input.
	 * @param {NavigateInputEvent} navigationEvent
	 * @returns true if still live, false if input should stop.
	 * @implements NavigateInputEvent
	 */
	handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			// Ignore everything but FINISH events
			return true;
		}

		if (navigationEvent.type != 'navigate-input') {
			console.warn(`VM: Attempt to handle navigation event failed since '${navigationEvent.type}' is not 'navigate-input'.`);
			return true;
		}

		let live: boolean = true;

		if (this.current.handleNavigation) {				// If the view support custom navigation, give it a crack.
			live = this.current.handleNavigation(navigationEvent);
		}

		const direction: InputNavigationAction = navigationEvent.getDirection();

		// Navigating between slots in the harness...
		// If navigation input is still alive after the current view has a crack at it, look to move the
		// focus between any occupied slots within the view.
		// Also ignore next/previous navigations as they are not related to the harness.
		if (live && !FocusManager.isWorldFocused() && !(direction & (InputNavigationAction.NEXT | InputNavigationAction.PREVIOUS))) {
			const harness: HTMLElement | null = this.getHarness();
			if (harness == null) {
				console.error("VM: View is unable to find the harness for navigation handling; this should never happen!");
				return true;
			}

			// Obtain focus item and determine its anchor
			const focusedSlot: HTMLElement | null = FocusManager.getFocusChildOf(harness);
			if (focusedSlot == null) {
				// This is fine as focus may be on an interact or other world-anchored item.
				//console.info("VM: Unable to find a focused slot in the current view's harness for navigation.");
				return true;
			}

			let anchor: AnchorType = this.classesToAnchor(focusedSlot.classList);
			if (anchor == AnchorType.None) {
				console.error("VM: Unable to determine an anchor type from the focus element's classes: ", focusedSlot.classList.toString());
				return true;
			}

			// New anchor
			let nextAnchor: AnchorType = AnchorType.None;

			do {
				nextAnchor = this.getNextAnchorFromDirection(direction, anchor);
				if (nextAnchor == AnchorType.None) {
					console.error("VM: Unable to find the next harness anchor; result is none.  direction: ", direction);
					break;
				}

				if (nextAnchor == anchor) {
					break;
				}

				// New (potential) anchor.  Does it have content?
				const newSlot: HTMLDivElement | null = this.getSlotByAnchors(harness, nextAnchor);
				if (newSlot == null) {
					console.error("VM: Unable to find the next harness slot from the anchor: ", anchor, ", direction: ", direction);
					break;
				}

				// TODO: It may be better suited to have this functionality in either the FocusManager and/or Slot (if there are other cases)
				const props: Navigation.Properties = { isDisableFocusAllowed: false, direction: InputNavigationAction.NONE };
				if (Navigation.isFocusable(newSlot, props)) {
					FocusManager.setFocus(newSlot);
					live = false;
					break;
				}

				anchor = nextAnchor;
			} while (true);
		}

		return live;
	}

	// Let the current view know it received the focus
	handleReceiveFocus() {
		Input.setActiveContext(this.current.getInputContext());

		if (this.current.handleReceiveFocus) {
			this.current.handleReceiveFocus();
		}
	}

	// Let the current view know it lost the focus
	handleLoseFocus() {
		if (this.current.handleLoseFocus) {
			this.current.handleLoseFocus();
		}
	}

	private getSlotByAnchors(harness: HTMLElement, anchor: AnchorType): HTMLDivElement | null {
		switch (anchor) {
			case AnchorType.RelativeToTopLeft: return harness.querySelector<HTMLDivElement>('.top.left'); break;
			case AnchorType.RelativeToTopRight: return harness.querySelector<HTMLDivElement>('.top.right'); break;
			case AnchorType.RelativeToTop: return harness.querySelector<HTMLDivElement>('.top.center'); break;
			case AnchorType.RelativeToBottomLeft: return harness.querySelector<HTMLDivElement>('.bottom.left'); break;
			case AnchorType.RelativeToBottomRight: return harness.querySelector<HTMLDivElement>('.bottom.right'); break;
			case AnchorType.RelativeToBottom: return harness.querySelector<HTMLDivElement>('.bottom.center'); break;
			case AnchorType.RelativeToLeft: return harness.querySelector<HTMLDivElement>('.middle.left'); break;
			case AnchorType.RelativeToCenter: return harness.querySelector<HTMLDivElement>('.middle.center'); break;
			case AnchorType.RelativeToRight: return harness.querySelector<HTMLDivElement>('.middle.right'); break;
			case AnchorType.SidePanelLeft: return harness.querySelector<HTMLDivElement>('.sidepanel.left_panel'); break;
			case AnchorType.SidePanelRight: return harness.querySelector<HTMLDivElement>('.sidepanel.right_panel'); break;
		}
		console.error("VM: Unable to query for slot element by classes.  anchor: ", anchor);
		return null;
	}

	/**
	 * Obtains an anchor in the harness based on the current anchor an a navigation direction.
	 * @param {InputNavigationAction} navigationAction The direction of navigation
	 * @param {AnchorType} currentAnchor The current anchor
	 * @returns {AnchorType} New anchor (or AnchorType.None if invalid)
	 */
	private getNextAnchorFromDirection(navigationAction: InputNavigationAction, currentAnchor: AnchorType): AnchorType {
		// Order of movement through slots based on input. (Harness navigation rules assume "stop" at boundaries.)
		const navigationChains: Map<InputNavigationAction, AnchorType[][]> = new Map([
			[InputNavigationAction.LEFT, [
				[AnchorType.SidePanelRight, AnchorType.RelativeToTopRight, AnchorType.RelativeToTop, AnchorType.RelativeToTopLeft, AnchorType.SidePanelLeft],
				[AnchorType.RelativeToRight, AnchorType.RelativeToCenter, AnchorType.RelativeToLeft, AnchorType.SidePanelLeft],
				[AnchorType.RelativeToBottomRight, AnchorType.RelativeToBottom, AnchorType.RelativeToBottomLeft, AnchorType.SidePanelLeft]]
			],
			[InputNavigationAction.RIGHT, [
				[AnchorType.SidePanelLeft, AnchorType.RelativeToTopLeft, AnchorType.RelativeToTop, AnchorType.RelativeToTopRight, AnchorType.SidePanelRight],
				[AnchorType.RelativeToLeft, AnchorType.RelativeToCenter, AnchorType.RelativeToRight, AnchorType.SidePanelRight],
				[AnchorType.RelativeToBottomLeft, AnchorType.RelativeToBottom, AnchorType.RelativeToBottomRight, AnchorType.SidePanelRight]]
			],
			[InputNavigationAction.UP, [
				[AnchorType.RelativeToBottomRight, AnchorType.RelativeToRight, AnchorType.RelativeToTopRight],
				[AnchorType.RelativeToBottom, AnchorType.RelativeToCenter, AnchorType.RelativeToTop],
				[AnchorType.RelativeToBottomLeft, AnchorType.RelativeToLeft, AnchorType.RelativeToTopLeft]]
			],
			[InputNavigationAction.DOWN, [
				[AnchorType.RelativeToTopRight, AnchorType.RelativeToRight, AnchorType.RelativeToBottomRight],
				[AnchorType.RelativeToTop, AnchorType.RelativeToCenter, AnchorType.RelativeToBottom],
				[AnchorType.RelativeToTopLeft, AnchorType.RelativeToLeft, AnchorType.RelativeToBottomLeft]]
			]
		]);

		// TODO: Offer a more robust solution for focus coming from the side panels; currently assumes next navigation slot is along the top.

		const chains: AnchorType[][] | undefined = navigationChains.get(navigationAction);
		if (chains == undefined) {
			console.error("VM: getNextSlot was unable to find a chain based on the navigation action: ", navigationAction);
			return AnchorType.None;
		}

		// If there is a match return the next chain.  (Assumes every chain has at least 1 entry!)
		let anchor: AnchorType = AnchorType.None;
		chains.some((chain: AnchorType[]) => {
			for (let i = 0; i < chain.length; i++) {
				if (chain[i] == currentAnchor) {
					if (i < chain.length - 1) {
						anchor = chain[i + 1];	// Next anchor in the chain
					} else {
						anchor = chain[i];		// Same anchor (at the end)
					}
					return true;
				}
			}
			return false;
		});

		return anchor;
	}

	/**
	 * Find the anchorType based on classes.
	 * @param classes list of classes used on a DOM Token
	 * @returns The appropriate AnchorType based on the classes list or None if it cannot be determined.
	 */
	private classesToAnchor(classes: DOMTokenList): AnchorType {
		if (classes.contains("top")) {
			if (classes.contains("left")) {
				return AnchorType.RelativeToTopLeft;
			} else if (classes.contains("center")) {
				return AnchorType.RelativeToTop;
			} else if (classes.contains("right")) {
				return AnchorType.RelativeToTopRight;
			}
		} else if (classes.contains("middle")) {
			if (classes.contains("left")) {
				return AnchorType.RelativeToLeft;
			} else if (classes.contains("center")) {
				return AnchorType.RelativeToCenter;
			} else if (classes.contains("right")) {
				return AnchorType.RelativeToRight;
			}
		} else if (classes.contains("bottom")) {
			if (classes.contains("left")) {
				return AnchorType.RelativeToBottomLeft;
			} else if (classes.contains("center")) {
				return AnchorType.RelativeToBottom;
			} else if (classes.contains("right")) {
				return AnchorType.RelativeToBottomRight;
			}
		}
		return AnchorType.None;
	}

	/**
	 * Hides the 2D harness if it isn't hidden.
	 */
	private hideHarness() {
		// are we already hidden?
		if (!this.isHarnessHidden) {
			const harnessElements: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>('.harness');
			harnessElements.forEach((harness: HTMLElement) => {
				harness.style.display = 'none';
			});
			this.isHarnessHidden = true;
		}
	}

	/**
	 * Shows the 2D harness if it isn't visible.
	 */
	private showHarness() {
		if (this.isHarnessHidden) {
			const harnessElements: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>('.harness');
			harnessElements.forEach((harness: HTMLElement) => {
				harness.style.display = 'flex';
			});
			this.isHarnessHidden = false;
		}
	}

	/**
	 * Replaces the existing view with the one provided by the template.
	 * @param viewID The new view ID being switched.
	 * @param template A template element on the DOM
	 * @returns true if the layout has been changed 
	 */
	loadViewTemplate(viewID: string, template: HTMLTemplateElement): boolean {
		const harness: HTMLElement | null = ViewManager.getHarness();
		if (harness == null) {
			console.error(`view-manager: Failed finding layout harness to attach layout to from ID. view: '${viewID}'`);
			return false;
		}

		const view: HTMLElement | null = harness.parentElement;
		if (view == null || !view.classList.contains("screen")) {
			console.error(`view-manager: Can not find view element for given ID. view: '${viewID}'`);
			return false;
		}

		document.dispatchEvent(new CustomEvent('close-panel'));

		// These are set here because is when the actual html layout is set.
		//this.previousViewID = this.currentViewID;
		this.currentViewID = viewID;		// Setting IDs here prevent re-entry calls.

		harness.innerHTML = '';
		harness.appendChild(template.content.cloneNode(true));
		view.setAttribute("id", viewID);		// IDs shouldn't be changed until after the HTML replacement or things (like the view manager) may think the wrong harness is active
		return true;
	}

	/**
	 * Switch to another view 
	 * @param viewID which view to switch to
	 * Simple helper function to switch to the active layout in the requested view
	 * ***Should only be called from view files***
	 */
	switchView(viewID: string, selector?: string): SwitchViewResult {
		if (viewID == "" || this.currentViewID == viewID) {
			// we should come from a view change so if it doesn't change the harness we will not know the view changed.
			// Otherwise let mutation observer signal when new harness has been added.
			window.dispatchEvent(new CustomEvent('view-changed'));

			//We are already have the layout loaded for this view
			return SwitchViewResult.NothingChanged;
		}

		const experience = UI.getViewExperience();
		let experienceSelector = '.desktop';
		switch (experience) {
			case UIViewExperience.Console:
				experienceSelector = ".console";
				break;
			case UIViewExperience.Handheld:
				experienceSelector = ".handheld";
				break;
			case UIViewExperience.Mobile:
				experienceSelector = ".mobile";
				break;
			case UIViewExperience.VR:
				experienceSelector = ".xr"
				break;

			case UIViewExperience.Desktop:
			default:
				break;
		}

		if (!selector) {
			selector = `.${viewID}`;
		}

		const template = document.querySelector<HTMLTemplateElement>(`template${selector}${experienceSelector}`)
			?? document.querySelector<HTMLTemplateElement>(`template${selector}`);

		if (template && this.loadViewTemplate(viewID, template)) {
			UI.viewChanged(viewID);
			return SwitchViewResult.ChangesApplied;
		}

		return SwitchViewResult.Error;
	}

	/**
	 * Switch to the empty layout.
	 */
	switchToEmptyView() {
		return this.switchView("empty");
	}
}

const ViewManager = new ViewManagerSingleton();
export { ViewManager as default };
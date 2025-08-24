/**
 * @file fxs-slot.ts
 * @copyright 2020-2021, Firaxis Games
 * @description Components that specialize in containment and grouping of other components.
 * 
 * TODO: Use mutation observer to set new initialFocus if the initialFocus item is removed.
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { NavigateInputEvent } from '/core/ui/input/input-support.js';
import { NavigationHandlers } from '/core/ui/input/navigation-handlers.js';
import { Navigation, NavigationRule } from '/core/ui/input/navigation-support.js';
import { SnUnfocusedEvent } from '/core/ui/external/js-spatial-navigation/spatial_navigation.js'

/**
 * A base slot element. 
 */
export class FxsSlot extends Component {

	protected static ruleDirectionCallbackMapping: Navigation.RuleDirectionCallbackMap =
		new Map([
			[InputNavigationAction.NONE, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapNext],
				[NavigationRule.Stop, NavigationHandlers.handlerStopNext],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.UP, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapPrevious],
				[NavigationRule.Stop, NavigationHandlers.handlerStopPrevious],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.DOWN, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapNext],
				[NavigationRule.Stop, NavigationHandlers.handlerStopNext],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.LEFT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapPrevious],
				[NavigationRule.Stop, NavigationHandlers.handlerStopPrevious],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.RIGHT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapNext],
				[NavigationRule.Stop, NavigationHandlers.handlerStopNext],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
		]);

	protected rules = new Map<InputNavigationAction, NavigationRule>();
	private navigateInputListener: EventListener = this.onNavigateInput.bind(this);
	private focusListener = this.onFocus.bind(this);
	private focusOutListener = this.onFocusOut.bind(this);
	private continuousCheckForInitialFocusHelpCallback: FrameRequestCallback = this.continuousCheckForInitialFocusHelper.bind(this);
	private observer = new MutationObserver(this.onChildrenChanged.bind(this));
	protected isDisableFocusAllowed: boolean = false;	// Can a "disabled" item still gain focus (typically a tooltip or some other way of expressing why it's disabled)
	protected initialFocus: Element | null = null;		// Explicitly set initial item to be focued.
	protected priorFocus: Element | null = null;			// Last item to be focused before a blur occurred

	private numberOfFramesWithoutChildFocus: number = 0;

	private lastEventTimeStamp: number = 0;
	private repeatThreshold: number = 0;
	private static readonly INITIAL_THRESHOLD = 400;
	private static readonly REPEAT_THRESHOLD = 150;
	private static readonly NO_FOCUS_FRAMES_WARNING_THRESHOLD = 30;

	onInitialize() {
		super.onInitialize();

		this.Root.setAttribute('slot', "true");

		this.readRules();
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		this.Root.addEventListener('focus', this.focusListener);
		this.Root.addEventListener('focusout', this.focusOutListener);	// Note: prefer over 'blur' as it occurs before focus is lost.

		const config: MutationObserverInit = { attributes: false, childList: true, subtree: false };
		this.observer.observe(this.Root, config);
	}

	onDetach() {
		this.observer.disconnect();

		this.Root.removeEventListener('focusout', this.focusOutListener);
		this.Root.removeEventListener('focus', this.focusListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);

		super.onDetach();
	}

	/**
	 * Component Callback
	 * @param name 
	 * @param _oldValue 
	 * @param newValue 
	 */
	onAttributeChanged(name: string, _oldValue: string, value: any) {
		if (name.substring(0, 12) == "data-navrule") {
			const action: InputNavigationAction = ((): InputNavigationAction => {
				const key: string = name.substring(13);
				switch (key) {
					case "up": return InputNavigationAction.UP;
					case "down": return InputNavigationAction.DOWN;
					case "left": return InputNavigationAction.LEFT;
					case "right": return InputNavigationAction.RIGHT;
					case "previous": return InputNavigationAction.PREVIOUS;
					case "next": return InputNavigationAction.NEXT;
					case "shell-previous": return InputNavigationAction.SHELL_PREVIOUS;
					case "shell-next": return InputNavigationAction.SHELL_NEXT;
					default:
						console.error(`fxs-slot: Unexpected attribute nav rule ignored '${name}' with value '${value}'`);
						break;
				}
				return InputNavigationAction.NONE;
			}
			)();
			const rule: NavigationRule = this.ruleNameToRule(value);
			this.rules.set(action, rule);
		} else if (name == "disable-focus-allowed") {
			this.isDisableFocusAllowed = (value === 'true');
			// This attribute impacts the initial focus so reset it
			this.initialFocus = null;
		} else if (name == "focus-rule") {
			// This attribute impacts the initial focus so reset it
			this.initialFocus = null;
		}
	}

	/**
	 * Set a navigation rule in the slot from code.
	 * @param {InputNavigationAction} direction to associate with a new rule (overrides the default rule) 
	 * @param {NavigationRule} rule to associate with the navigation action
	 */
	setRule(direction: InputNavigationAction, rule: NavigationRule) {
		if (rule == this.rules.get(direction)) {
			console.warn(`fxs-slot: A slot is having its rule set to the same value for the direction: ${direction}`);
		}
		this.rules.set(direction, rule);
	}

	/**
	 * Sets the initial focus of the slot
	 * @param focusTarget The target to set as initial focus
	 */
	setInitialFocus(focusTarget: Element | null) {
		this.initialFocus = focusTarget;
	}

	/**
	 * Set the default rules for the slot.
	 * If an attribute in the HTML or DOM is set, override to use that rule.
	 */
	protected readRules() {
		const upRuleName: string = this.Root.getAttribute('data-navrule-up') ?? "escape";
		const downRuleName: string = this.Root.getAttribute('data-navrule-down') ?? "escape";
		const leftRuleName: string = this.Root.getAttribute('data-navrule-left') ?? "escape";
		const rightRuleName: string = this.Root.getAttribute('data-navrule-right') ?? "escape";
		const previousRuleName: string = this.Root.getAttribute('data-navrule-previous') ?? "invalid";
		const nextRuleName: string = this.Root.getAttribute('data-navrule-next') ?? "invalid";
		this.rules.set(InputNavigationAction.NONE, NavigationRule.Invalid); // invalid is forced to this.
		this.rules.set(InputNavigationAction.UP, this.ruleNameToRule(upRuleName));
		this.rules.set(InputNavigationAction.DOWN, this.ruleNameToRule(downRuleName));
		this.rules.set(InputNavigationAction.LEFT, this.ruleNameToRule(leftRuleName));
		this.rules.set(InputNavigationAction.RIGHT, this.ruleNameToRule(rightRuleName));
		this.rules.set(InputNavigationAction.PREVIOUS, this.ruleNameToRule(previousRuleName));
		this.rules.set(InputNavigationAction.NEXT, this.ruleNameToRule(nextRuleName));
		this.rules.set(InputNavigationAction.SHELL_PREVIOUS, this.ruleNameToRule(previousRuleName));
		this.rules.set(InputNavigationAction.SHELL_NEXT, this.ruleNameToRule(nextRuleName));
	}

	/**
	 * Helper, convert a rule name to it's enumeration.
	 * @param {string} name The rule name, can be case-insensative.
	 * @returns {NavigationRule} the associated navigation rule enum for the name.  Unknown names will return the invalid rule.
	 */
	protected ruleNameToRule(name: string): NavigationRule {
		const lowerName = name.toLowerCase();
		if (lowerName.includes("esc")) { return NavigationRule.Escape; }
		if (lowerName.includes("wrap")) { return NavigationRule.Wrap; }
		if (lowerName.includes("stop")) { return NavigationRule.Stop; }
		if (lowerName.includes("inv")) { return NavigationRule.Invalid; }

		console.error(`fxs-slot: A slot has an unknown 'data-navrule-XXX' defined with value ${name}. Setting to invalid rule`);
		return NavigationRule.Invalid;
	}

	/**
	 * Set the initial focus on the first or last focusable element
	 */
	private realizeInitialFocus() {
		const props: Navigation.Properties = { isDisableFocusAllowed: this.isDisableFocusAllowed, direction: InputNavigationAction.NONE };

		// If we already have initial focus, don't change it
		if (this.initialFocus && this.initialFocus.isConnected) {
			return;
		}

		// No focus at all
		if (this.Root.hasAttribute('ignore-focus')) {
			return;
		}

		if (this.Root.getAttribute('focus-rule') == 'last') {
			this.initialFocus = Navigation.getLastFocusableElement(this.Root, props);
		} else {
			this.initialFocus = Navigation.getFirstFocusableElement(this.Root, props);
		}
	}

	private continuousCheckForInitialFocus() {
		this.numberOfFramesWithoutChildFocus = 0;
		window.requestAnimationFrame(this.continuousCheckForInitialFocusHelpCallback);
	}

	private continuousCheckForInitialFocusHelper() {
		if (FocusManager.getFocus() != this.Root) {
			// If we don't have direct focus, we can stop checking. If we get focus again, we'll restart in onFocus.
			return;
		}

		if (this.numberOfFramesWithoutChildFocus == FxsSlot.NO_FOCUS_FRAMES_WARNING_THRESHOLD) {
			console.warn(`fxs-slot: continuousCheckForInitialFocus(): Slot has focus but hasn't been able to pass it on to a child for ${this.numberOfFramesWithoutChildFocus} frames.`)
		}

		this.realizeInitialFocus();

		if (this.initialFocus) {
			FocusManager.setFocus(this.initialFocus);
			this.priorFocus = this.initialFocus;
		} else {
			// We didn't find anything, so try again next frame.
			this.numberOfFramesWithoutChildFocus += 1;
			window.requestAnimationFrame(this.continuousCheckForInitialFocusHelpCallback);
		}
	}

	/**
	 * Respond to being directly set to focus.
	 */
	protected onFocus() {
		this.lastEventTimeStamp = Date.now();
		this.repeatThreshold = FxsSlot.INITIAL_THRESHOLD;

		if (!this.Root.hasAttribute('ignore-prior-focus') && this.priorFocus != null && this.priorFocus.isConnected) {
			FocusManager.setFocus(this.priorFocus);
		} else if (this.initialFocus != null && this.initialFocus.isConnected && Navigation.isFocusable(this.initialFocus)) {
			FocusManager.setFocus(this.initialFocus);
		} else if (this.Root.hasChildNodes()) {
			// Lazy set initial focus.
			this.realizeInitialFocus();
			if (this.initialFocus != null) {
				FocusManager.setFocus(this.initialFocus);
			} else {
				this.continuousCheckForInitialFocus()
			}
		}

		// Note that it can happen that the focus is not transfered to any (focusable) child of the FxsSlot here:
		// if the children are not appended YET. But it must be eventually.
	}

	/**
	 * Respond to losing focus.
	 * Use this over 'blur' as this will occur before the old focus is lost.
	 * @param event The focusout bubbles and needs to be stopped.
	 */
	protected onFocusOut(event: FocusEvent) {
		// no matter what happens, we don't want to let this propagate up
		event.preventDefault();
		event.stopImmediatePropagation();

		const currentFocus: HTMLElement = FocusManager.getFocus(); // WARNING: current focus should be the one referenced by event.target. it seems that many errors and code oddities arise from not using the correct element here.

		// if this gets called when we are the current focus, don't update priorFocus or we'll just
		// focus ourself next time and break focus propagation.
		if (this.Root.isSameNode(currentFocus)) {
			return;
		}

		// This can happen when swapping Keyboard Mouse mode and Gamepad mode
		if (!this.Root.contains(currentFocus)) {
			return;
		}

		if (currentFocus.hasAttribute("non-prior-focusable")) { //Hack: Used to fix gamepad related issue.
			return;
		}

		this.priorFocus = currentFocus;
	}

	private onChildrenChanged(mutationList: MutationRecord[], _observer: MutationObserver) {
		// Flag to let us know the current focus was removed from this slot so we need a new one
		let findNewFocus: boolean = false;

		// If an initial focus hasn't been explicitly set (or inferred from an earlier add) then set it to the first item in the slot.
		if (this.initialFocus == null) {
			mutationList.some((mutationRecord: MutationRecord) => {
				if (mutationRecord.type == "childList") {
					this.realizeInitialFocus();
					if (this.initialFocus) {
						return true;	// early out some()
					}
				}
				return false;
			})
		} else {
			mutationList.forEach((mutationRecord: MutationRecord) => {
				if (mutationRecord.type == "childList") {
					// Update the initial, last and current focus when children are added
					if (mutationRecord.addedNodes.length > 0) {
						// It is to handle when the children order have changed and its leads to the Focus rule to no more be followed.
						// For instance, if 'focus-rule' is FIRST but elements are appended BEFORE the current (first) initial focus
						// -> the initial focus is no more the first element so we need to update it.
						// (and vice versa with a 'focus-rule' set to LAST and elements appended AFTER)

						const wasFocused: boolean = (this.initialFocus == FocusManager.getFocus());
						const previousInitialFocus: Element = this.initialFocus!;

						// Updates the initial focus
						this.initialFocus = null;
						this.realizeInitialFocus();

						// Refocus only if the previous initial focus was effectively focused before the update
						if (wasFocused && this.initialFocus && previousInitialFocus != this.initialFocus) {
							FocusManager.setFocus(this.initialFocus);
							this.priorFocus = this.initialFocus;
						}
					}

					// Check if the current, initial or last focus is removed
					mutationRecord.removedNodes.forEach((node: Node) => {
						// Current focus is no longer a child. Find a new child to focus in this slot.
						if (node == FocusManager.getFocus()) {
							findNewFocus = true;
							this.priorFocus = null;
						}

						// Initial focus has been removed. Find a new one.
						if (node == this.initialFocus) {
							this.initialFocus = null;
							this.realizeInitialFocus();
						}

						// Reset priorFocus if it's no longer a child
						if (node == this.priorFocus) {
							this.priorFocus = null;
						}
					});
				}
			})
		}

		// If the slot has focus and an initial focus is set and last focus hasn't, it means it's ready for its first focus call.
		if ((FocusManager.getFocus() == this.Root || findNewFocus) && this.initialFocus && this.priorFocus == null) {
			FocusManager.setFocus(this.initialFocus);
			this.priorFocus = this.initialFocus;
		} else if (this.initialFocus == null && this.priorFocus == null) {
			this.continuousCheckForInitialFocus();
		}
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		const live: boolean = this.handleNavigation(navigationEvent);

		if (navigationEvent.detail.status == InputActionStatuses.FINISH) {
			this.resetRepeatThreshold();
		}

		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		}
	}

	private navigate(direction: InputNavigationAction): boolean {
		const rule: NavigationRule | undefined = this.rules.get(direction);

		if (rule == undefined) {
			console.error(`fxsslot: Unable to get a rule for input direction '${direction}'.`);
			return true;
		}

		if (this.Root.hasAttribute('reverse-navigation')) {
			switch (direction) {
				case InputNavigationAction.DOWN:
					direction = InputNavigationAction.UP;
					break;
				case InputNavigationAction.UP:
					direction = InputNavigationAction.DOWN;
					break;
				case InputNavigationAction.LEFT:
					direction = InputNavigationAction.RIGHT;
					break;
				case InputNavigationAction.RIGHT:
					direction = InputNavigationAction.LEFT;
					break;
				case InputNavigationAction.NEXT:
					direction = InputNavigationAction.PREVIOUS;
					break;
				case InputNavigationAction.PREVIOUS:
					direction = InputNavigationAction.NEXT;
					break;
				case InputNavigationAction.SHELL_NEXT:
					direction = InputNavigationAction.SHELL_PREVIOUS;
					break;
				case InputNavigationAction.SHELL_PREVIOUS:
					direction = InputNavigationAction.SHELL_NEXT;
					break;
			}
		}

		if (this.Root.hasAttribute('ignore-focus')) {
			return true;
		}

		const focus: HTMLElement | null = FocusManager.getFocusChildOf(this.Root);
		if (focus == null) {
			// Maybe valid if navigation is meant to be handled by an interface mode or view
			return true;
		}

		if (focus.parentElement == null) {
			console.error(`fxsslot: Attempt to navigate focus but the current focus '${FocusManager.toLogString()}' doesn't have a parent element! (Was it disconnected?) rule: '${rule}', direction: '${direction}'`);
			return true;
		}

		const callback: Navigation.RuleDirectionCallback = this.getNavigationHandler(rule, direction);
		const props: Navigation.Properties = { isDisableFocusAllowed: this.isDisableFocusAllowed, direction: direction };

		return callback(focus, props);
	}

	private resetRepeatThreshold() {
		this.lastEventTimeStamp = 0;
		this.repeatThreshold = 0;
	}

	/**
	 * Handle an input navigation event but obtain the appropriate focus chain item
	 * and apply the rules set to the navigation direction in how the next item
	 * receives focus.
	 * @param navigationEvent 
	 * @returns true if still live, false if input should stop.
	 */
	private handleNavigation(navigationEvent: NavigateInputEvent): boolean {

		if (navigationEvent.detail.status != InputActionStatuses.START &&
			navigationEvent.detail.status != InputActionStatuses.UPDATE &&
			navigationEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		if (this.Root.isSameNode(FocusManager.getFocus())) {
			// This slot is the main focus (not a child of it) so navigation should be handled higher up.
			return true;
		}

		// No need to check if in the focus chain...
		// This slot may be in DOM branch that's not part of focus chain; may happen when a new view is raised and/or next/previous are first requested.
		if (!this.Root.contains(FocusManager.getFocus())) {
			return true;
		}

		if (navigationEvent.detail.status == InputActionStatuses.START) {
			// Reset repeat threshold so the next UPDATE event is handled as an initial move
			this.resetRepeatThreshold();
			return false;
		}

		const currentTime: number = Date.now();

		if (this.lastEventTimeStamp != 0 && currentTime - this.lastEventTimeStamp < this.repeatThreshold) {
			return false;
		}

		if (!this.navigate(navigationEvent.getDirection())) {
			this.repeatThreshold = this.lastEventTimeStamp == 0 ? FxsSlot.INITIAL_THRESHOLD : FxsSlot.REPEAT_THRESHOLD;
			this.lastEventTimeStamp = currentTime;
			return false;
		}

		return true;
	}

	/**
	 * Returns the static list of rule mapping for this type.
	 * @returns 
	 */
	protected getRulesMap(): Navigation.RuleDirectionCallbackMap {
		return FxsSlot.ruleDirectionCallbackMapping;
	}

	/**
	 * Look up the associated callback for a give rule and direction.
	 * This traverse the map of maps of the callbacks.
	 * @param rule 
	 * @param direction 
	 * @returns Assigned callback based on the Navigation rule and direction or if unfound, a callback that ignores the input.
	 */
	private getNavigationHandler(rule: NavigationRule, direction: InputNavigationAction): Navigation.RuleDirectionCallback {
		const rules = this.getRulesMap().get(direction);
		if (!rules) {
			console.error(`fxs-slot: Unable to find a navigation callback due to unmapped direction. rule: '${rule}', direction: '${direction}'.`)
			return NavigationHandlers.handlerIgnore;
		}
		const callback: Navigation.RuleDirectionCallback | undefined = rules.get(rule);
		if (!callback) {
			console.error(`fxs-slot: Unable to find a navigation callback due to unmapped rule. rule: '${rule}', direction: '${direction}'.`)
			return NavigationHandlers.handlerIgnore;
		}
		return callback;
	}
}

export function isSlot(slot: Element | null): slot is ComponentRoot<FxsSlot> {
	return slot?.hasAttribute('slot') ?? false;
}

Controls.define('fxs-slot', {
	createInstance: FxsSlot,
	description: 'A generic slot element.',
	classNames: ['fxs-slot'],
	attributes: [
		{
			name: 'data-navrule-up'
		},
		{
			name: 'data-navrule-down'
		},
		{
			name: 'data-navrule-left'
		},
		{
			name: 'data-navrule-right'
		},
		{
			name: 'data-navrule-previous'
		},
		{
			name: 'data-navrule-next'
		},
		{
			name: 'disable-focus-allowed',
			description: 'Determines if focus is allowed to occur on disabled items.'
		},
		{
			name: 'focus-rule',
			description: 'Defines whether the "first" or "last" child will be the initial focus when this slot takes focus. Defaults to "first"'
		},
		{
			name: 'ignore-prior-focus',
			description: 'If set, the slot ignores the prior focus and set the focus to initial focus'
		},
		{
			name: 'ignore-focus',
			description: 'Ignore everything in this slot, including the slot itself'
		}

	],
	tabIndex: -1
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

/**
 * A vertical slot element. 
 */
export class FxsVSlot extends FxsSlot {
	protected static ruleDirectionCallbackMapping: Navigation.RuleDirectionCallbackMap =
		new Map([
			[InputNavigationAction.NONE, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.UP, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapePrevious],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapPrevious],
				[NavigationRule.Stop, NavigationHandlers.handlerStopPrevious],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.DOWN, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapeNext],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapNext],
				[NavigationRule.Stop, NavigationHandlers.handlerStopNext],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.LEFT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerStop],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.RIGHT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerStop],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
		]);

	/**
	 * Returns the static list of rule mapping for this type.
	 * @returns 
	 */
	protected getRulesMap(): Navigation.RuleDirectionCallbackMap {
		return FxsVSlot.ruleDirectionCallbackMapping;
	}
}

Controls.define('fxs-vslot', {
	createInstance: FxsVSlot,
	description: 'A slot element which organizes children in a vertical column.',
	classNames: ['fxs-vslot'],
	attributes: [
		{
			name: 'data-navrule-up'
		},
		{
			name: 'data-navrule-down'
		},
		{
			name: 'data-navrule-left'
		},
		{
			name: 'data-navrule-right'
		},
		{
			name: 'data-navrule-previous'
		},
		{
			name: 'data-navrule-next'
		},
		{
			name: 'disable-focus-allowed',
			description: 'Determines if focus is allowed to occur on disabled items.'
		},
		{
			name: 'focus-rule',
			description: 'Defines whether the "first" or "last" child will be the initial focus when this slot takes focus. Defaults to "first"'
		},
		{
			name: 'ignore-prior-focus',
			description: 'If set, the slot ignores the prior focus and set the focus to initial focus'
		},
		{
			name: 'ignore-focus',
			description: 'Ignore everything in this slot, including the slot itself'
		}

	],
	tabIndex: -1
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

/**
* A horizontal slot element. 
*/
export class FxsHSlot extends FxsSlot {
	protected static ruleDirectionCallbackMapping: Navigation.RuleDirectionCallbackMap =
		new Map([
			[InputNavigationAction.NONE, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.UP, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerStop],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.DOWN, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerStop],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.LEFT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapePrevious],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapPrevious],
				[NavigationRule.Stop, NavigationHandlers.handlerStopPrevious],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.RIGHT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapeNext],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapNext],
				[NavigationRule.Stop, NavigationHandlers.handlerStopNext],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
		]);

	/**
	 * Returns the static list of rule mapping for this type.
	 * @returns 
	 */
	protected getRulesMap(): Navigation.RuleDirectionCallbackMap {
		return FxsHSlot.ruleDirectionCallbackMapping;
	}

}

Controls.define('fxs-hslot', {
	createInstance: FxsHSlot,
	description: 'A slot element which organizes children in a horizontal row.',
	classNames: ['fxs-hslot'],
	attributes: [
		{
			name: 'data-navrule-up'
		},
		{
			name: 'data-navrule-down'
		},
		{
			name: 'data-navrule-left'
		},
		{
			name: 'data-navrule-right'
		},
		{
			name: 'data-navrule-previous'
		},
		{
			name: 'data-navrule-next'
		},
		{
			name: 'disable-focus-allowed',
			description: 'Determines if focus is allowed to occur on disabled items.'
		},
		{
			name: 'focus-rule',
			description: 'Defines whether the "first" or "last" child will be the initial focus when this slot takes focus. Defaults to "first"'
		},
		{
			name: 'ignore-prior-focus',
			description: 'If set, the slot ignores the prior focus and set the focus to initial focus'
		},
		{
			name: 'ignore-focus',
			description: 'Ignore everything in this slot, including the slot itself'
		}
	],
	tabIndex: -1
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

/**
* A left side panel slot element. 
*/
export class FxsSidePanel extends FxsSlot {
	private visibleChildren: HTMLElement[] = [];

	private onChildHiddenListener = (event: CustomEvent) => { this.onChildHidden(event); }
	private onChildShownListener = (event: CustomEvent) => { this.onChildShown(event); }

	onAttach() {
		super.onAttach();

		engine.on('OnContextManagerClose', this.onChildHiddenListener);	// TODO: Remove tying to context manager
		engine.on('OnContextManagerOpen', this.onChildShownListener);	// TODO: Remove tying to context manager
	}

	onDetach() {
		engine.off('OnContextManagerClose', this.onChildHiddenListener);
		engine.off('OnContextManagerOpen', this.onChildShownListener);
	}

	onChildHidden(event: CustomEvent) {

		const deactivatedElement = event.detail.deactivatedElement;
		if (deactivatedElement instanceof HTMLElement) {
			const id = `target-slot-${deactivatedElement.tagName.toLowerCase()}`;

			for (let i = 0; i < this.visibleChildren.length; i++) {
				//TODO - This bit of code should be refactored.  There's no reason why the context manager can't simply notify the parent that a child is being detached and to handle that accordingly.
				// You can't look via 'Node.contains()' here, because the child has already been removed 
				// in the ContextManager, so that will always fail because of order of execution. 
				// Instead, you need to look up if the child was formerly attached to one of the visible children
				// by finding the deactivated element's tagName in the visible child's id. The id is what is used to 
				// match where to load in to an marked target-slot. 
				if (this.visibleChildren[i].id == id) {
					this.visibleChildren.splice(i, 1);
					break;
				}
			}

			this.clearModifiers();

			if (this.visibleChildren.length <= 0) {
				this.Root.classList.add("empty");
			}
		}
		else {
			console.error("fxs-slot: onChildHidden expected reference of side panel child in event.detail!");
			return;
		}


	}

	onChildShown(event: CustomEvent) {
		if (!event.detail.activatedElement) {
			console.error("fxs-slot: onChildShown expected reference of side panel child in event.detail!");
			return;
		}

		this.clearModifiers();

		for (let i = 0; i < this.Root.children.length; i++) {
			if (this.Root.children[i].contains(event.detail.activatedElement)) {
				this.visibleChildren.push(this.Root.children[i] as HTMLElement);

				if (this.Root.classList.contains('empty')) {
					this.Root.classList.remove('empty');
				}
				break;
			}
		}
		//Ensure the children are displayed in the order they were opened
		for (let i = 0; i < this.visibleChildren.length; i++) {
			this.visibleChildren[i].style.zIndex = i.toString();
		}
	}

	clearModifiers() {
		// This will automatically shrink the side panel. We may want more explicit control over keeping it expanded in future. 
		this.Root.classList.remove("expanded");
		this.Root.classList.remove("max");
	}
}

Controls.define('fxs-side-panel', {
	createInstance: FxsSidePanel,
	description: 'A generic side panel element',
	classNames: ['empty'],
	attributes: [
		{
			name: 'data-navrule-up'
		},
		{
			name: 'data-navrule-down'
		},
		{
			name: 'data-navrule-left'
		},
		{
			name: 'data-navrule-right'
		},
		{
			name: 'data-navrule-previous'
		},
		{
			name: 'data-navrule-next'
		},
		{
			name: 'disable-focus-allowed',
			description: 'Determines if focus is allowed to occur on disabled items.'
		},
		{
			name: 'focus-rule',
			description: 'Defines whether the "first" or "last" child will be the initial focus when this slot takes focus. Defaults to "first"'
		},
		{
			name: 'ignore-prior-focus',
			description: 'If set, the slot ignores the prior focus and set the focus to initial focus'
		},
		{
			name: 'ignore-focus',
			description: 'Ignore everything in this slot, including the slot itself'
		}

	],
	tabIndex: -1
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

/**
* A slot element designed to use spatial navigation
*/
export class FxsSpatialSlot extends FxsSlot {
	protected static ruleDirectionCallbackMapping: Navigation.RuleDirectionCallbackMap =
		new Map([
			[InputNavigationAction.NONE, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.UP, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapeSpatial],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapSpatial],
				[NavigationRule.Stop, NavigationHandlers.handlerStopSpatial],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.DOWN, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapeSpatial],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapSpatial],
				[NavigationRule.Stop, NavigationHandlers.handlerStopSpatial],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.LEFT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapeSpatial],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapSpatial],
				[NavigationRule.Stop, NavigationHandlers.handlerStopSpatial],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.RIGHT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerEscapeSpatial],
				[NavigationRule.Wrap, NavigationHandlers.handlerWrapSpatial],
				[NavigationRule.Stop, NavigationHandlers.handlerStopSpatial],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_PREVIOUS, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
			[InputNavigationAction.SHELL_NEXT, new Map([
				[NavigationRule.Escape, NavigationHandlers.handlerIgnore],
				[NavigationRule.Wrap, NavigationHandlers.handlerIgnore],
				[NavigationRule.Stop, NavigationHandlers.handlerIgnore],
				[NavigationRule.Invalid, NavigationHandlers.handlerIgnore]
			]
			)],
		]);

	// spatial-navigation.js library has it's own unique section Id generation but
	// it seemed cumbursome without complicated UI and hard to get exposed to
	private static sectionCount: number = 0;
	private static sectionIdPrefix: string = 'fxs-spatial-slot-';
	private static sectionIdPool: Set<string> = new Set<string>();

	private snUnfocusedListener = this.onElementUnfocused.bind(this);

	onInitialize() {
		super.onInitialize();

		// We need to listen for this event from the spatial navigation library to tell our focus manager about the new focus
		this.Root.addEventListener('sn:willunfocus', this.snUnfocusedListener);
	}

	onAttach() {
		super.onAttach();

		this.Root.setAttribute('sectionId', FxsSpatialSlot.getSectionIdFromPool());
	}

	onDetach() {
		FxsSpatialSlot.removeSectionIdFromPool(this.Root.getAttribute('sectionId'));

		super.onDetach();
	}

	private static getSectionIdFromPool(): string {
		let newSectionId: string = "";
		do {
			newSectionId = FxsSpatialSlot.sectionIdPrefix + (++FxsSpatialSlot.sectionCount);
		} while (FxsSpatialSlot.sectionIdPool.has(newSectionId))
		FxsSpatialSlot.sectionIdPool.add(newSectionId);
		return newSectionId;
	}

	private static removeSectionIdFromPool(sectionId: string | null) {
		if (sectionId == null) {
			console.error("fxs-slot: Spatial slot failed to have a unique sectionId to remove from pool.");
			return;
		}
		FxsSpatialSlot.sectionIdPool.delete(sectionId);
	}

	private onElementUnfocused(event: SnUnfocusedEvent) {
		// The spatial-navigation.js library is bluring the current target element to change the focus so let our FocusManager handle it.
		if (!event.detail.native && event.detail.nextElement) {
			FocusManager.setFocus(event.detail.nextElement);

			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}

	/**
	 * Returns the static list of rule mapping for this type.
	 * @returns 
	 */
	protected getRulesMap(): Navigation.RuleDirectionCallbackMap {
		return FxsSpatialSlot.ruleDirectionCallbackMapping;
	}

}

Controls.define('fxs-spatial-slot', {
	createInstance: FxsSpatialSlot,
	description: 'A slot element designed to use spatial navigation.',
	classNames: ['fxs-spatial-slot'],
	attributes: [
		{
			name: 'data-navrule-up'
		},
		{
			name: 'data-navrule-down'
		},
		{
			name: 'data-navrule-left'
		},
		{
			name: 'data-navrule-right'
		},
		{
			name: 'data-navrule-previous'
		},
		{
			name: 'data-navrule-next'
		},
		{
			name: 'disable-focus-allowed',
			description: 'Determines if focus is allowed to occur on disabled items.'
		},
		{
			name: 'focus-rule',
			description: 'Defines whether the "first" or "last" child will be the initial focus when this slot takes focus. Defaults to "first"'
		},
		{
			name: 'ignore-prior-focus',
			description: 'If set, the slot ignores the prior focus and set the focus to initial focus'
		},
		{
			name: 'ignore-slot',
			description: 'Ignore everything in this slot, including the slot itself'
		}

	],
	tabIndex: -1
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

/**
 * A component that groups multiple `fxs-slot` elements and allows switching between them by setting the `selected-slot` attribute.
 * 
 * @remarks
 * 
 * The `FxsSlotGroup` component must have at least one child `fxs-slot` element. If no `selected-slot` attribute is set on the `FxsSlotGroup`, the first child `fxs-slot` element will be selected by default.
 * 
 * To switch between `fxs-slot` elements, set the `selected-slot` attribute on the `FxsSlotGroup` to the ID of the desired `fxs-slot` element.
 * 
 * Example usage:
 * 
 * ```html
 * <fxs-slot-group selected-slot="slot1">
 *   <fxs-slot id="slot1">...</fxs-slot>
 *   <fxs-slot id="slot2">...</fxs-slot>
 * </fxs-slot-group>
 * ```
 */
export class FxsSlotGroup extends FxsSlot {

	onAttach(): void {
		super.onAttach();
		if (this.Root.children.length === 0) {
			console.error('fxs-slot-group: Slot group must have at least one child.');
			return;
		}
	}

	onReceiveFocus(): void {
		if (!this.Root.hasAttribute('selected-slot')) {
			const id = this.Root.children[0].id;
			if (id) {
				this.Root.setAttribute('selected-slot', id);
			}
		}
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string | null): void {
		super.onAttributeChanged(name, oldValue, newValue);
		if (name === 'selected-slot') {
			const selectedSlotId = newValue;
			const children = this.Root.children;
			let selection: HTMLElement | null = null;
			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				if (!(child instanceof HTMLElement)) {
					continue;
				}

				if (child.id === selectedSlotId) {
					selection = child;
					child.style.display = 'flex';
					FocusManager.setFocus(child);
				} else {
					child.style.display = 'none';
				}
			}

			if (!selection) {
				console.error(`fxs-slot-group: Slot with ID '${selectedSlotId}' not found.`);
			}
		}
	}

	protected onFocus(): void {
		const selectedSlotId = this.Root.getAttribute('selected-slot');
		const children = this.Root.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (!(child instanceof HTMLElement)) {
				continue;
			}

			if (child.id === selectedSlotId) {
				FocusManager.setFocus(child);
			}
		}
	}
}

Controls.define('fxs-slot-group', {
	createInstance: FxsSlotGroup,
	attributes: [
		{
			name: 'selected-slot',
		},
	],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-slot': ComponentRoot<FxsSlot>
		'fxs-vslot': ComponentRoot<FxsVSlot>
		'fxs-hslot': ComponentRoot<FxsHSlot>
		'fxs-side-panel': ComponentRoot<FxsSidePanel>
		'fxs-spatial-slot': ComponentRoot<FxsSpatialSlot>
		'fxs-slot-group': ComponentRoot<FxsSlotGroup>
	}
}
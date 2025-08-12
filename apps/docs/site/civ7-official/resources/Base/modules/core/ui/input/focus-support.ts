import FocusManager from "/core/ui/input/focus-manager.js";
import { Navigation } from "/core/ui/input/navigation-support.js";
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { isSlot } from '/core/ui/components/fxs-slot.js';

export namespace Focus {
	/**
	 * Set the focus to a particular element within a context.
	 * If the target is in the current active context, it will be focused immediately.
	 * Otherswise, it will be set as the initial focus in all slots up the ancestor chain to the context.
	 * @param target 
	 * @param context 
	 * @returns 
	 */
	export function setContextAwareFocus(target: Element | null, context: Element | null) {
		if (!target || !context) {
			console.error("FM: Attempt to set focus to an element that doesnt exist.")
			return;
		}

		if (target.isSameNode(FocusManager.getFocus())) {
			return;
		}

		waitForLayout(() => {
			let focusableDescendant = Navigation.isFocusable(target) ? target : null;
			let parent = target.parentElement;
			const curContext = ContextManager.getCurrentTarget();
			const hasContext = !curContext || curContext.contains(target);

			// Iterate through ancsestors and set all initial slots up the chain to the target element
			while (parent != null && parent != context) {
				if (focusableDescendant && isSlot(parent)) {
					parent.maybeComponent?.setInitialFocus(focusableDescendant);
				}

				if (Navigation.isFocusable(parent)) {
					focusableDescendant = parent;
				} else if (!Navigation.shouldCheckChildrenFocusable(parent)) {
					focusableDescendant = null;
				}

				parent = parent.parentElement;
			}

			// If the element is in the curent context, focus it now
			if (hasContext) {
				FocusManager.setFocus(target);
			}
		});
	}
}
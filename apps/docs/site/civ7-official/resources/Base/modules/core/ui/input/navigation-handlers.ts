/**
 * @file navigation-handlers.ts
 * @copyright 2022, Firaxis Games
 * @description Handler functions for various navigation rules
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { Navigation } from '/core/ui/input/navigation-support.js';
import Spatial from '/core/ui/spatial/spatial-manager.js';

export namespace NavigationHandlers {

	/**
	 * Ignore the input and keep it live.
	 * @returns Always returns true, that the input is still live.
	 */
	export function handlerIgnore(): boolean {
		return true;
	}

	/**
	 * Ignore the input and prevent it from propagating.
	 * @returns Always returns false, that the input is always consumed.
	 */
	export function handlerStop(): boolean {
		return false;
	}

	export function handlerEscapeNext(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		const sibling: Element | null = Navigation.getNextFocusableElement(focusElement, props);
		if (sibling != null) {
			FocusManager.setFocus(sibling);
			return false;
		}
		return true;
	}

	export function handlerStopNext(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		const sibling: Element | null = Navigation.getNextFocusableElement(focusElement, props);
		if (sibling != null) {
			FocusManager.setFocus(sibling);
		}
		return false;
	}

	export function handlerWrapNext(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		const sibling: Element | null = Navigation.getNextFocusableElement(focusElement, props);
		if (sibling != null) {
			FocusManager.setFocus(sibling);
			return false;
		}

		let parentSlot = Navigation.getParentSlot(focusElement);
		if (!parentSlot) {
			console.error("navigation-support: handlerWrapNext(): no parent slot was found");
			return false;
		}

		const wrapSibling: Element | null = Navigation.getFirstFocusableElement(parentSlot, props);
		if (wrapSibling != null) {
			FocusManager.setFocus(wrapSibling);
		}
		return false;
	}

	export function handlerEscapePrevious(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		const sibling: Element | null = Navigation.getPreviousFocusableElement(focusElement, props);
		if (sibling != null) {
			FocusManager.setFocus(sibling);
			return false;
		}
		return true;
	}

	export function handlerStopPrevious(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		const sibling: Element | null = Navigation.getPreviousFocusableElement(focusElement, props);
		if (sibling != null) {
			FocusManager.setFocus(sibling);
		}
		return false;
	}

	export function handlerWrapPrevious(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		const sibling: Element | null = Navigation.getPreviousFocusableElement(focusElement, props);
		if (sibling != null) {
			FocusManager.setFocus(sibling);
			return false;
		}

		let parentSlot = Navigation.getParentSlot(focusElement);
		if (!parentSlot) {
			console.error("navigation-support: handlerWrapPrevious(): no parent slot was found");
			return false;
		}

		const wrapSibling: Element | null = Navigation.getLastFocusableElement(parentSlot, props);
		if (wrapSibling != null) {
			FocusManager.setFocus(wrapSibling);
		}
		return false;
	}

	export function handlerEscapeSpatial(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		// Route to the Spatial Manager to determine how to handle this
		const direction: string | undefined = Spatial.getDirection(props.direction);
		if (direction == undefined) {
			console.error("spatial-manager: handlerSpatial(): Failed to get a valid navigation direction");
			return false;
		}

		const parentSlot = Navigation.getParentSlot(focusElement);
		if (!parentSlot) {
			console.error("spatial-manager: handlerSpatial(): No parent slot was found");
			return false;
		}

		const sectionId: string | null = parentSlot.getAttribute('sectionId');
		if (sectionId == null) {
			console.error('spatial-manager: handlerSpatial(): Failed to find sectionId attribute');
			return false;
		}

		const focusableChildren: Array<Element> = Navigation.getFocusableChildren(parentSlot, props);

		return Spatial.navigate(sectionId, focusableChildren, direction);
	}

	export function handlerWrapSpatial(_focusElement: HTMLElement, _props: Readonly<Navigation.Properties>): boolean {
		console.error('navigation-support: No wrap handler has been implemented for spatial slots!');
		return true;
	}

	export function handlerStopSpatial(focusElement: HTMLElement, props: Readonly<Navigation.Properties>): boolean {
		// Route to the Spatial Manager to determine how to handle this
		handlerEscapeSpatial(focusElement, props);
		return false;
	}
}
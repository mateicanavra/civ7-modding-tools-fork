/**
 * @file fxs-dropdown.ts
 * @copyright 2020-2025, Firaxis Games
 * @description A UI dropdown control primitive for selecting an option from a list of options.
 * 
 */

import FxsActivatable from '/core/ui/components/fxs-activatable.js'
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import ActionHandler, { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { Focus } from '/core/ui/input/focus-support.js';

/**
 * DropdownItem is the base data type for items in a dropdown.
 * 
 * You can add additional properties to this type to store additional data for each item.
 * @example
 * ```ts
 * type MyDropdownItem = DropdownItem & {
 *   id: number
 * }
 * ```
 */
export type DropdownItem = {
	label: string
	tooltip?: string
	disabled?: boolean
}

export type DropdownSelectionChangeEventDetail<T extends DropdownItem = DropdownItem> = {
	selectedIndex: -1,
	selectedItem: null
} | {
	selectedIndex: number,
	selectedItem: T
}

export const DropdownSelectionChangeEventName = 'dropdown-selection-change' as const;

/**
 * DropdownSelectionChangeEvent is the event fired when an item is selected from a dropdown.
 */
export class DropdownSelectionChangeEvent<T extends DropdownItem = DropdownItem> extends CustomEvent<DropdownSelectionChangeEventDetail<T>> {
	constructor(detail: DropdownSelectionChangeEventDetail<T>) {
		super(DropdownSelectionChangeEventName, { bubbles: true, cancelable: true, detail });
	}
}

/**
 * A UI dropdown control for selecting an option from a list of options.
 * 
 * Attributes:
 * - `selected-item-index` The index of the selected item.
 * - `no-selection-caption` The text label of the button when there is no valid selection (i.e., when `selected-item-index` is -1).
 * - `dropdown-items` The list of items to display in the dropdown.
 * 
 * @fires DropdownSelectionChangeEvent When an item is selected from the dropdown.
 * 
 * @example
 * ```ts
 * const dropdown = document.createElement('fxs-dropdown');
 * dropdown.setAttribute('dropdown-items', JSON.stringify([
 *    { label: 'Item 1' },
 *    { label: 'Item 2' },
 *    { label: 'Item 3' }
 * ]));
 * dropdown.addEventListener(DropdownSelectionChangeEventName, (event: DropdownSelectionChangeEvent) => {
 *   console.log(`Selected item index: ${event.detail.selectedIndex}`);
 *   console.log(`Selected item label: ${event.detail.selectedItem.label}`);
 * });
 * ```
 */


/**
 * closestClippingParent returns the first parent element which would clip its children.
 * 
 * @param element starting element
 */
const closestClippingParent = (element: HTMLElement): HTMLElement => {
	let parent = element.parentElement;
	while (parent && parent !== document.body) {
		const style = getComputedStyle(parent);

		// TODO: we may want to provide a way to differentiate between scroll and clip,
		// if a parent is scrollable, the caller may want to check the scrollHeight rather than the offsetHeight
		if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
			return parent;
		}
		parent = parent.parentElement;
	}
	return document.body;
}

export class FxsDropdown extends FxsActivatable {
	private isOpen = false;
	protected selectedIndex = -1;

	protected labelElement!: HTMLDivElement;
	protected highlightElement!: HTMLDivElement;
	protected dropdownItems: DropdownItem[] = [];
	private dropdownElements: ComponentRoot<FxsDropdownItemElement>[] = [];

	protected openArrowElement!: HTMLElement;
	private readonly scrollableElement = document.createElement('fxs-scrollable');
	private readonly dropdownItemSlot = document.createElement('fxs-vslot');
	private scrollArea!: HTMLElement;

	private noSelectionCaption = 'LOC_UI_DROPDOWN_NO_SELECTION';
	private selectionCaption = '';

	private wasOpenedUp = false;

	private onScrollWheelEventListener = this.onScrollWheel.bind(this);
	private onActivateEventListener = this.onActivate.bind(this);
	private onEngineInputEventListener = this.onEngineInput.bind(this);
	private dropdownSlotItemFocusInListener = this.onDropdownSlotItemFocusIn.bind(this);
	private dropdownSlotItemFocusOutListener = this.onDropdownSlotItemFocusOut.bind(this);
	private onClickOutsideEventListener = this.onClickOutside.bind(this);
	private onBlurEventListener = this.onBlur.bind(this);
	private onResizeEventListener = this.onResizeEvent.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);

	private listeningForClickOutside: boolean = false;

	private onActivate() {
		this.toggleOpen();
	}

	private onClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!this.Root.contains(target)) {
			this.toggleOpen(false);
		}
	}

	private onBlur(event: FocusEvent) {
		const target = event.relatedTarget as HTMLElement;
		if (!this.Root.contains(target)) {
			this.toggleOpen(false);
		}
	}

	private onResizeEvent() {
		this.updateDropdownVisibility(this.isOpen);
	}

	private onActiveDeviceTypeChanged(_event: ActiveDeviceTypeChangedEvent) {
		this.updateOpenArrowElement();
	}

	private onScrollWheel(event: WheelEvent) {
		if (event.target instanceof Node) {
			this.scrollArea ??= MustGetElement('.fxs-scrollable-content', this.Root);
			const newScrollPos = this.scrollArea.scrollTop / (this.scrollArea.scrollHeight - this.scrollArea.offsetHeight);
			if ((event.deltaY > 0 && newScrollPos >= 1) ||
				(event.deltaY < 0 && newScrollPos <= -1)) {
				event.preventDefault(); // prevent scrolling the parent
			}
		}
	}

	protected onEngineInput(event: InputEngineEvent) {
		if (!this.isOpen) {
			return;
		}

		if (event.detail.name === 'cancel') {
			if (event.detail.status === InputActionStatuses.FINISH) {
				this.toggleOpen(false);
				FocusManager.setFocus(this.Root);
			}

			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}

	protected onDropdownSlotItemFocusIn(_focusEvent: FocusEvent) {
		if (this.isOpen) {
			return;
		}

		// If a dropdown item is focused when the dropdown is not open,
		// focus the dropdown itself instead.
		FocusManager.setFocus(this.Root);
	}

	protected onDropdownSlotItemFocusOut(focusEvent: FocusEvent) {
		if (!this.isOpen) {
			return;
		}

		const target: EventTarget | null = focusEvent.target;
		if (target instanceof Node && this.Root.contains(target) && !this.Root.contains(FocusManager.getFocus())) {
			this.toggleOpen(false);
		}
	}

	onInitialize() {
		super.onInitialize();
		this.Root.role = "select";
		this.render();
	}

	onAttach() {
		super.onAttach();

		// we don't want FxsActivatable adding its own activate sounds

		window.addEventListener('resize', this.onResizeEventListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		this.Root.addEventListener('blur', this.onBlurEventListener);
		this.Root.addEventListener('wheel', this.onScrollWheelEventListener);
		this.Root.addEventListener('action-activate', this.onActivateEventListener);
		this.Root.addEventListener('engine-input', this.onEngineInputEventListener);
		this.dropdownItemSlot.addEventListener("focusin", this.dropdownSlotItemFocusInListener);
		this.dropdownItemSlot.addEventListener("focusout", this.dropdownSlotItemFocusOutListener);
		this.Root.setAttribute("data-audio-press-ref", "data-audio-select-press");
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.onEngineInputEventListener);
		this.Root.removeEventListener('action-activate', this.onActivateEventListener);
		this.Root.removeEventListener('wheel', this.onScrollWheelEventListener);
		this.Root.removeEventListener('blur', this.onBlurEventListener);
		window.removeEventListener('resize', this.onResizeEventListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);

		this.dropdownItemSlot.removeEventListener("focusin", this.dropdownSlotItemFocusInListener);
		this.dropdownItemSlot.removeEventListener("focusout", this.dropdownSlotItemFocusOutListener);

		if (this.listeningForClickOutside) {
			document.removeEventListener('click', this.onClickOutsideEventListener);
			this.listeningForClickOutside = false;
		}

		super.onDetach();
	}

	/**
	 * ToggleOpen opens or closes the dropdown.
	 * 
	 * @param force If true, forces the dropdown to open or close. If false, toggles the dropdown based on its current state.
	 */
	public toggleOpen(force?: boolean): void {
		const isOpen = force ?? !this.isOpen;
		const isDisabled = this.disabled;

		const id = isOpen ? 'data-audio-dropdown-open' : 'data-audio-dropdown-close';

		this.updateDropdownVisibility(isOpen);

		if (this.isOpen === isOpen) {
			return;
		}

		if (isOpen && isDisabled) {
			return; // Opening a disabled list is forbidden (but it can be closed)
		}
		Audio.playSound(id);

		this.isOpen = isOpen;
		if (this.isOpen) {
			FocusManager.setFocus(this.dropdownElements[this.selectedIndex] ?? this.Root);

			if (!this.listeningForClickOutside) {
				document.addEventListener('click', this.onClickOutsideEventListener);
				this.listeningForClickOutside = true;
			}
		} else {
			Focus.setContextAwareFocus(this.Root, closestClippingParent(this.Root));

			if (this.listeningForClickOutside) {
				document.removeEventListener('click', this.onClickOutsideEventListener);
				this.listeningForClickOutside = false;
			}
		}
	}

	/**
	 * UpdateDropdownItems updates the list of items in the dropdown.
	 * 
	 * @param items The list of items to display in the dropdown.
	 */
	public updateDropdownItems(items: DropdownItem[]) {
		this.dropdownItems = items;
		this.update();
		this.createListItems(this.dropdownItemSlot);
	}

	/**
	 * createListItemElement is called when a new item is added to the dropdown.
	 * 
	 * Override this method to customize or replace the default dropdown item.
	 * 
	 * @returns An 'fxs-dropdown-item' element.
	 */
	protected createListItemElement() {
		return document.createElement('fxs-dropdown-item');
	}

	/**
	 * onItemSelected is called when an item is selected from the dropdown.
	 * 
	 * Override this method to customize item selection.
	 * 
	 * @param index The index of the selected item.
	 */
	protected onItemSelected(index: number) {
		if (index < -1 || index >= this.dropdownItems.length) {
			throw new Error(`fxs-dropdown: invalid item index ${index}. Be sure to set dropdown-items before setting selected-item-index.`);
		}

		if (index === this.selectedIndex) {
			return;
		}

		const detail: DropdownSelectionChangeEventDetail = index === -1 ? { selectedIndex: index, selectedItem: null } : { selectedIndex: index, selectedItem: this.dropdownItems[index] };

		// Update the root attribute to match the selected index
		const indexString = index.toString();
		if (indexString !== this.Root.getAttribute('selected-item-index')) {
			// event can be canceled to prevent selection
			const canceled = !this.Root.dispatchEvent(new DropdownSelectionChangeEvent(detail));
			if (!canceled) {
				this.Root.setAttribute('selected-item-index', detail.selectedIndex.toString());
				// calling setAttribute() will recursively call into this function, which will do the work, so
				// we don't need to continue here in the original call.
				return;
			}
		}

		this.selectedIndex = index;

		for (let i = 0; i < this.dropdownElements.length; i++) {
			const element = this.dropdownElements[i];
			element.dataset.selected = i === index ? 'true' : 'false';
		}

		this.update();
	}

	private createListItems(parent: HTMLElement) {
		//create new elements if needed
		for (let i = this.dropdownElements.length; i < this.dropdownItems.length; i++) {
			const element = this.createListItemElement();
			element.addEventListener('action-activate', () => {
				this.playSound("data-audio-dropdown-select");
				this.onItemSelected(i);
				this.toggleOpen(false);
				FocusManager.setFocus(this.Root);
			});

			this.dropdownElements.push(element);
			parent.appendChild(element);
		}

		// update existing elements
		for (let i = 0; i < this.dropdownItems.length; i++) {
			this.updateExistingElement(this.dropdownElements[i], this.dropdownItems[i], i === this.selectedIndex);
		}

		// remove extra elements
		while (this.dropdownElements.length > this.dropdownItems.length) {
			const element = this.dropdownElements.pop();
			element?.remove();
		}
	}

	protected updateExistingElement(element: ComponentRoot<FxsDropdownItemElement>, dropdownItem: DropdownItem, isSelected: boolean) {
		element.dataset.label = dropdownItem.label;
		element.setAttribute('disabled', dropdownItem.disabled ? 'true' : 'false');
		element.dataset.selected = isSelected ? 'true' : 'false';
		element.dataset.tooltipContent = dropdownItem.tooltip ?? "";
	}

	protected update() {
		if (!this.labelElement) {
			return;
		}

		let labelText = this.noSelectionCaption;
		if (this.selectedIndex >= 0 && this.dropdownItems[this.selectedIndex]) {
			labelText = this.dropdownItems[this.selectedIndex].label;
		}

		const text = `${labelText != this.noSelectionCaption ? `${Locale.compose(this.selectionCaption)} ` : ""}${Locale.compose(labelText)}`;
		this.labelElement.dataset.l10nId = text;
		this.Root.setAttribute("aria-valuetext", text);
		this.Root.ariaValueText = text;
	}

	protected updateOpenArrowElement() {
		this.openArrowElement.classList.toggle('invisible', !this.isArrowElementVisibile());
		this.openArrowElement.classList.toggle('img-arrow', !this.disabled);
		this.openArrowElement.classList.toggle('img-arrow-disabled', this.disabled);
	}

	protected isArrowElementVisibile() {
		return !ActionHandler.isGamepadActive || !this.Root.getAttribute("action-key");
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'selected-item-index': {
				const index = parseInt(newValue);
				this.onItemSelected(index);
				return;
			}
			case 'no-selection-caption': {
				this.noSelectionCaption = newValue;
				this.update();
				return;
			}
			case 'selection-caption': {
				this.selectionCaption = newValue;
				this.update();
				return;
			}
			case 'dropdown-items': {
				if (newValue && newValue !== oldValue) {
					let dropdownItems: DropdownItem[];
					try {
						dropdownItems = JSON.parse(newValue);
					} catch (e: unknown) {
						console.error(`fxs-dropdown: invalid dropdown-items attribute value: ${newValue}`);
						return;
					}

					this.updateDropdownItems(dropdownItems);
				} else if (!newValue) {
					this.updateDropdownItems([]);
				}
				return;
			}
			case "has-border":
				this.Root.classList.toggle("no-border", newValue == "false");
				break;
			case 'has-background':
				this.Root.classList.toggle("no-background", newValue == "false");
				break;
			case 'disabled': {
				if (this.isOpen) {
					this.toggleOpen(false);
				}
				this.updateOpenArrowElement();
				break;
			}
			case 'action-key': {
				this.updateOpenArrowElement();
			}
		}

		super.onAttributeChanged(name, oldValue, newValue);
	}

	private updateDropdownVisibility(isOpen: boolean) {
		this.highlightElement.classList.toggle('opacity-100', isOpen);
		this.openArrowElement.classList.toggle('-rotate-90', isOpen);
		this.Root.classList.toggle('group', !isOpen);

		const contentParent = closestClippingParent(this.scrollableElement);
		if (contentParent instanceof HTMLElement) {
			const rootRect = this.Root.getBoundingClientRect();
			const contentParentRect = contentParent.getBoundingClientRect();
			const heightAbove = rootRect.top - contentParentRect.top;
			const heightBelow = contentParentRect.bottom - rootRect.bottom;
			const openUp = heightBelow < this.scrollableElement.offsetHeight && heightAbove > heightBelow;

			if (isOpen) {
				this.scrollableElement.classList.toggle('top-full', !openUp);
				this.scrollableElement.classList.toggle('origin-bottom', openUp);
				this.scrollableElement.classList.toggle('origin-top', !openUp);
				this.dropdownItemSlot.classList.toggle('flex-col-reverse', openUp);
				this.dropdownItemSlot.classList.toggle('flex-col', !openUp);

				if (openUp) {
					this.dropdownItemSlot.setAttribute('reverse-navigation', '');
				} else {
					this.dropdownItemSlot.removeAttribute('reverse-navigation');
				}

				const maxHeight = openUp ? heightAbove : heightBelow;
				this.scrollableElement.attributeStyleMap.set('max-height', CSS.px(maxHeight));

				delayByFrame(() => {
					this.scrollableElement.component.resizeScrollThumb();
				}, 4);
			}

			this.scrollableElement.classList.toggle('fxs-dropdown-open-up', openUp && isOpen);
			this.scrollableElement.classList.toggle('fxs-dropdown-open-down', !openUp && isOpen);
			this.scrollableElement.classList.toggle('fxs-dropdown-close-up', this.wasOpenedUp && !isOpen);
			this.scrollableElement.classList.toggle('fxs-dropdown-close-down', !this.wasOpenedUp && !isOpen);

			this.wasOpenedUp = openUp;
		}
	}

	addOrRemoveNavHelpElement(parent: HTMLElement, value: string | null) {
		super.addOrRemoveNavHelpElement(parent, value);
		this.navHelp?.classList.add("absolute", "right-2", "top-1\\/2", "bottom-1\\/2");
	}

	protected render() {
		const containerClass = this.Root.getAttribute("container-class") ?? "";
		const bgClass = this.Root.getAttribute("bg-class") ?? "";
		const labelClass = this.Root.getAttribute("label-class") ?? "";
		this.Root.classList.add('fxs-dropdown', 'relative', 'flex-auto', 'min-w-80', 'font-body', 'text-base', 'text-accent-2', 'group');
		this.Root.innerHTML = `
			<div class="dropdown__container relative flex flex-auto flex-row items-center justify-between pl-4 pr-1\\.5 ${containerClass.match(/border/) ? '' : 'border-2'} border-primary-1 ${containerClass} ">
				<div class="dropdown__bg absolute inset-px transition-opacity bg-primary-3 ${bgClass}"></div>	
				<div class="dropdown__highlight absolute -inset-0\\.5 img-dropdown-box-focus opacity-0 transition-opacity group-hover\\:opacity-100 group-focus\\:opacity-100"></div>
				<div class="dropdown__label relative flex-auto ${labelClass}"></div>
				<div class="dropdown__open-arrow min-w-8 min-h-12 img-arrow transition-transform relative"></div>
			</div>
		`

		this.openArrowElement = MustGetElement('.dropdown__open-arrow', this.Root);
		this.scrollableElement.classList.add('z-1', "absolute", 'inset-x-0', 'top-full', "img-dropdown-box", "scale-y-0", "origin-top");
		this.dropdownItemSlot.classList.add('flex', 'flex-col');
		this.dropdownItemSlot.setAttribute('data-navrule-up', 'stop');
		this.dropdownItemSlot.setAttribute('data-navrule-down', 'stop');
		this.scrollableElement.appendChild(this.dropdownItemSlot);
		this.Root.appendChild(this.scrollableElement);
		this.highlightElement = MustGetElement('.dropdown__highlight', this.Root);
		this.labelElement = MustGetElement('.dropdown__label', this.Root);
		this.update();
		this.updateOpenArrowElement();
	}
}

Controls.define('fxs-dropdown', {
	createInstance: FxsDropdown,
	description: 'A UI dropdown control for selecting an option from a list of options.',
	tabIndex: -1,
	attributes: [
		{
			name: "dropdown-items",
			description: "The list of items to display in the dropdown."
		},
		{
			name: "selected-item-index",
			description: "The index of the selected item."
		},
		{
			name: "no-selection-caption",
			description: "The text label of the button when there is no valid selection."
		},
		{
			name: "selection-caption",
			description: "The text label of the button that is added at the beginning when there is a valid selection."
		},
		{
			name: "has-border",
			description: "Whether or not the field have a border style (default: 'true')"
		},
		{
			name: "has-background",
			description: "Whether or not the field have a background (default: 'true')"
		},
		{
			name: "container-class",
		},
		{
			name: "bg-class",
		},
		{
			name: "disabled",
			description: "Whether the dropdown is disabled."
		},
		{
			name: "action-key",
			description: "The action key for inline nav help, usually translated to a button icon."
		},
	]
});


export class FxsDropdownItemElement extends FxsActivatable {

	private readonly highlightElement = document.createElement('div');
	private readonly arrowElement = document.createElement('div');
	protected readonly labelElement = document.createElement('div');

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		switch (name) {
			case 'data-label':
				this.labelElement.dataset.l10nId = newValue ?? undefined;
				break;
			case 'data-selected':
				const selected = newValue === 'true';
				this.arrowElement.classList.toggle('opacity-0', !selected);
				this.highlightElement.classList.toggle('opacity-100', selected);
				this.highlightElement.classList.toggle('group-hover\\:opacity-70', !selected);
				this.Root.classList.toggle('cursor-pointer', !selected);
				break;
			case 'disabled':
				super.onAttributeChanged('disabled', oldValue, newValue);
				break;
		}
	}

	protected render() {
		this.Root.classList.add('dropdown-item-container', 'group', 'relative', 'flex', 'flex-row', 'items-center', 'min-h-8', 'pb-px', 'font-body', 'text-base', 'text-accent-2');
		this.highlightElement.classList.add('absolute', 'inset-0', 'img-dropdown-focus', 'group-focus\\:opacity-70', 'group-hover\\:opacity-70', 'opacity-0', 'transition-opacity');
		this.arrowElement.classList.add('mr-0\\.5', 'rotate-180', 'img-selection-arrow');
		this.labelElement.classList.add('relative', 'pr-2');
		this.Root.setAttribute("non-prior-focusable", ""); //Hack: Used to fix gamepad related issue.

		this.Root.appendChild(this.highlightElement);
		this.Root.appendChild(this.arrowElement);
		this.Root.appendChild(this.labelElement);
	}
}

Controls.define('fxs-dropdown-item', {
	createInstance: FxsDropdownItemElement,
	description: 'A UI dropdown item.',
	tabIndex: -1,
	attributes: [
		{
			name: "data-label",
			description: "The label of the dropdown item."
		},
		{
			name: 'data-selected'
		},
		{
			name: 'disabled'
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-dropdown': ComponentRoot<FxsDropdown>;
		'fxs-dropdown-item': ComponentRoot<FxsDropdownItemElement>;
	}

	interface HTMLElementEventMap {
		[DropdownSelectionChangeEventName]: DropdownSelectionChangeEvent;
	}
}
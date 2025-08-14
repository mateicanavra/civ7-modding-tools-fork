/**
 * @file fxs-selector.ts
 * @copyright 2023, Firaxis Games
 * @description A UI selector control primitive for selecting an option from a list of options using a gamepad. Used as a drop-in replacement for the dropdown component.
 * 
 */

import FxsActivatable, { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js'
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js'
import { DropdownItem, DropdownSelectionChangeEvent, DropdownSelectionChangeEventDetail, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

/**
 * A UI selector control for selecting an option from a list of options. Used as a drop-in replacement for the dropdown component.
 * 
 * Attributes:
 * - `selected-item-index` The index of the selected item.
 * - `no-selection-caption` The text label of the button when there is no valid selection (i.e., when `selected-item-index` is -1).
 * - `dropdown-items` The list of items to display in the selector.
 * - `direct-edit` If set to "false", the component must be activated before value can be changed (true by default).
 * 
 * @fires DropdownSelectionChangeEvent When an item is selected from the selector.
 * 
 * @example
 * ```ts
 * const selector = document.createElement('fxs-selector');
 * selector.setAttribute('dropdown-items', JSON.stringify([
 *    { label: 'Item 1' },
 *    { label: 'Item 2' },
 *    { label: 'Item 3' }
 * ]));
 * selector.addEventListener(SelectorSelectionChangeEventName, (event: SelectorSelectionChangeEvent) => {
 *   console.log(`Selected item index: ${event.detail.selectedIndex}`);
 *   console.log(`Selected item label: ${event.detail.selectedItem.label}`);
 * });
 * ```
 */

export class FxsSelector extends FxsActivatable {
	private noSelectionCaption = 'LOC_UI_DROPDOWN_NO_SELECTION';

	private isEditing = false;

	private selectorItems: DropdownItem[] = [];

	private selectedItemContainer!: HTMLElement;
	private selectorElements: HTMLElement[] = [];
	private noSelectionElement!: HTMLElement;
	private leftArrow!: HTMLElement;
	private rightArrow!: HTMLElement;
	private leftNavHelp!: HTMLElement;
	private rightNavHelp!: HTMLElement;

	private activateListener = this.onActivate.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	private updatingItemSelection: boolean = false;

	private get isDisabled() {
		return this.Root.getAttribute("disabled");
	}

	private get selectedIndex() {
		return parseInt(this.Root.getAttribute("selected-item-index") ?? "-1");
	}

	private set selectedIndex(index: number) {
		this.Root.setAttribute("selected-item-index", index.toString());
	}

	private get isNoSelection() {
		return this.selectedIndex == -1;
	}

	private get directEdit() {
		// Default value is true if unset
		return (this.Root.getAttribute("direct-edit") ?? "true") === "true";
	};

	private set directEdit(value: boolean) {
		this.Root.setAttribute("direct-edit", value.toString());
	};

	private get enableShellNavControls() {
		return this.Root.getAttribute("enable-shell-nav") == "true";
	}

	constructor(root: ComponentRoot<FxsSelector>) {
		super(root);
		this.render();
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'selected-item-index': {
				// This callback is invoked during the process of updating item selection. 
				// If we're *not* in this callback, ensure the selection fully completes, otherwise we can skip the redundant call.
				if (!this.updatingItemSelection) {
					const index = parseInt(newValue);
					this.onItemSelected(index, true);
				}
				return;
			}

			case 'no-selection-caption': {
				this.noSelectionCaption = newValue;
				this.updateNoSelectionElement();

				return;
			}

			case 'dropdown-items': {
				if (newValue && newValue !== oldValue) {
					let selectorItems: DropdownItem[];

					try {
						selectorItems = JSON.parse(newValue);
					} catch (e: unknown) {
						console.error(`fxs-selector: invalid dropdown-items attribute value: ${newValue} `, e);
						return;
					}

					this.updateSelectorItems(selectorItems);
				} else if (!newValue) {
					this.updateSelectorItems([]);
				}

				return;
			}

			case 'direct-edit': {
				this.toggleEdit(this.directEdit);

				return;
			}

			case 'disabled': {
				this.updateDisabled(newValue == "true");
				break;
			}

			case 'enable-shell-nav': {
				const shellNavDisabled = newValue != "true";
				this.leftNavHelp?.classList.toggle("invisible", shellNavDisabled);
				this.rightNavHelp?.classList.toggle("invisible", shellNavDisabled);
				break;
			}
		}

		super.onAttributeChanged(name, oldValue, newValue);
	}

	override onInitialize(): void {
		super.onInitialize();
		this.Root.role = "select";
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('action-activate', this.activateListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		this.Root.addEventListener('engine-input', this.engineInputListener);
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		this.Root.removeEventListener('action-activate', this.activateListener);

		super.onDetach();
	}

	protected override onActivatableEngineInput(inputEvent: InputEngineEvent): void {
		// Do not process input events when in direct edit mode
		if (this.directEdit) {
			return;
		} else {
			super.onActivatableEngineInput(inputEvent);
		}
	}

	public updateDisabled(value: boolean) {
		if (this.isEditing) {
			this.toggleEdit(false);
		}

		this.Root.classList.toggle("disabled", value);
		this.leftArrow.classList.toggle("invisible", value);
		this.rightArrow.classList.toggle("invisible", value);
	}

	/**
	 * ToggleOpen edit mode on the selector.
	 * 
	 * @param force If set, forces the selector to edit mode or not. If not set, toggles the selector based on its current state.
	 */
	public toggleEdit = (force?: boolean): void => {
		const isEditing = (force ?? !this.isEditing) || this.directEdit;

		if (this.isEditing === isEditing) {
			return;
		}

		this.isEditing = isEditing;
	}

	/**
	 * UpdateSelectorItems updates the list of items in the selector.
	 * 
	 * @param items The list of items to display in the selector.
	 */
	public updateSelectorItems(items: DropdownItem[]) {
		this.selectorItems = items;
		this.createListItems();
	}

	public selectNext() {
		if (!this.isDisabled) {
			this.onItemSelected(this.selectedIndex + 1);
		}
	}

	public selectPrevious() {
		if (!this.isDisabled) {
			this.onItemSelected(this.selectedIndex - 1);
		}
	}

	/**
	 * createListItem is called when a new item is added to the selector.
	 * 
	 * Override this method to customize the appearance of selector items.
	 */
	protected createListItemElement({ disabled, label, tooltip }: DropdownItem): HTMLElement {
		const newListItem = document.createElement('div');
		newListItem.role = "option";
		newListItem.classList.add("flex", "flex-col", "items-center", "justify-center");

		if (disabled || this.isDisabled) {
			newListItem.setAttribute('disabled', 'true');
		}

		if (tooltip) {
			newListItem.setAttribute('data-tooltip-content', tooltip);
		}

		const title = document.createElement('div');
		title.setAttribute("data-l10n-id", label);
		newListItem.appendChild(title);

		return newListItem
	}

	/**
	 * onItemSelected is called when an item is selected from the selector.
	 * 
	 * Override this method to customize item selection.
	 * 
	 * @param index The index of the selected item.
	 */
	protected onItemSelected(index: number, force?: boolean) {
		if (!force && index === this.selectedIndex) {
			return;
		}

		this.updatingItemSelection = true;

		const numItems = this.selectorItems.length;

		if (numItems <= 0) {
			index = -1;
		} if (index < 0) {
			index = numItems - 1;
		} else if (index >= numItems) {
			index = 0;
		}

		const detail: DropdownSelectionChangeEventDetail = this.isNoSelection
			? { selectedIndex: -1, selectedItem: null }
			: { selectedIndex: index, selectedItem: this.selectorItems[index] };

		// event can be canceled to prevent selection
		const canceled = !this.Root.dispatchEvent(new DropdownSelectionChangeEvent(detail));
		if (canceled) {
			return;
		}

		this.selectedIndex = index;
		this.updateElementSelections();

		this.updatingItemSelection = false;
	}

	protected onActivate(_event: ActionActivateEvent) {
		this.toggleEdit();
	}

	protected onEngineInput(event: InputEngineEvent) {
		if (!this.isEditing || this.directEdit) {
			return;
		}

		if (event.detail.name === 'cancel') {
			if (event.detail.status === InputActionStatuses.FINISH) {
				this.toggleEdit(false);
				FocusManager.setFocus(this.Root);
			}

			event.preventDefault();
			event.stopPropagation();
		}
	}

	protected onNavigateInput(event: NavigateInputEvent) {
		if (!this.isEditing && !this.directEdit) {
			return;
		}

		const isFinished = event.detail.status === InputActionStatuses.FINISH;

		const direction = event.getDirection();
		switch (direction) {
			case InputNavigationAction.UP:
			case InputNavigationAction.DOWN: {
				if (!this.directEdit) {
					event.stopPropagation();
				}
				break;
			}

			// Disable left and right navigation when a selector is active
			case InputNavigationAction.LEFT:
				if (isFinished) {
					this.selectPrevious();
					Audio.playSound("data-audio-activate", "audio-pager");
				}
				event.stopPropagation();
				break;

			case InputNavigationAction.SHELL_PREVIOUS:
				if (this.enableShellNavControls) {
					if (isFinished) {
						this.selectPrevious();
					}
					event.stopPropagation();
				}
				break;

			case InputNavigationAction.RIGHT:
				if (isFinished) {
					this.selectNext();
					Audio.playSound("data-audio-activate", "audio-pager");
				}
				event.stopPropagation();
				break;

			case InputNavigationAction.SHELL_NEXT:
				if (this.enableShellNavControls) {
					if (isFinished) {
						this.selectNext();
					}
					event.stopPropagation();
				}
				break;
		}
	}

	private createListItems() {
		for (const element of this.selectorElements) {
			element.remove();
		}

		this.selectorElements.length = 0;

		for (let i = 0; i < this.selectorItems.length; i++) {
			const item = this.selectorItems[i];

			const newElement = this.createListItemElement(item);
			this.selectorElements.push(newElement);
		}

		this.updateElementSelections();
	}

	private updateElementSelections() {
		const index = this.selectedIndex;

		if (index === -1) {
			this.selectedItemContainer.appendChild(this.noSelectionElement);
			this.Root.ariaValueText = this.noSelectionCaption;
		} else {
			this.noSelectionElement.remove();
		}

		for (let i = 0; i < this.selectorItems.length; i++) {
			const selectedElement = this.selectorElements[i];

			if (i === index) {
				this.selectedItemContainer.appendChild(selectedElement);
				this.Root.ariaValueText = selectedElement.textContent;
			} else {
				selectedElement.remove();
			}
		}
	}

	private updateNoSelectionElement() {
		const newNoSelectionElement = this.createListItemElement({ disabled: this.disabled, label: this.noSelectionCaption, tooltip: this.noSelectionCaption });

		if (this.noSelectionElement && this.isNoSelection) {
			this.noSelectionElement.remove();
			this.selectedItemContainer.appendChild(newNoSelectionElement);
		}

		this.noSelectionElement = newNoSelectionElement;
	}

	private render() {
		const fragment = document.createDocumentFragment();

		this.leftArrow = document.createElement('fxs-activatable');
		this.leftArrow.classList.add("img-arrow-hover", "ml-2");
		this.leftArrow.addEventListener("action-activate", this.selectPrevious.bind(this));

		let arrowGrp = this.Root.getAttribute("data-audio-group-ref");
		if (!arrowGrp || arrowGrp == "") {
			arrowGrp = "audio-pager";
		}
		this.leftArrow.setAttribute("data-audio-group-ref", arrowGrp);

		fragment.appendChild(this.leftArrow);

		this.leftNavHelp = document.createElement('fxs-nav-help');
		this.leftNavHelp.setAttribute("action-key", "inline-nav-shell-previous");
		this.leftNavHelp.classList.add("hidden", "invisible");
		fragment.appendChild(this.leftNavHelp);

		this.selectedItemContainer = document.createElement("div");
		this.selectedItemContainer.classList.add("flex-auto");
		fragment.appendChild(this.selectedItemContainer);

		this.rightNavHelp = document.createElement('fxs-nav-help');
		this.rightNavHelp.setAttribute("action-key", "inline-nav-shell-next");
		this.rightNavHelp.classList.add("hidden", "invisible");
		fragment.appendChild(this.rightNavHelp);

		this.rightArrow = document.createElement('fxs-activatable');
		this.rightArrow.classList.add("img-arrow-hover", "-scale-x-100", "mr-2");
		this.rightArrow.setAttribute("data-audio-group-ref", arrowGrp);

		this.rightArrow.addEventListener("action-activate", this.selectNext.bind(this));
		fragment.appendChild(this.rightArrow);

		this.updateNoSelectionElement();

		this.Root.appendChild(fragment);
	}
}

const SelectorElementTagName = 'fxs-selector' as const
Controls.define(SelectorElementTagName, {
	createInstance: FxsSelector,
	description: 'A UI selector control for selecting an option from a list of options.',
	classNames: ["fxs-selector", "flex", "flex-row", "justify-center", "items-center"],
	tabIndex: -1,
	attributes: [
		{
			name: "dropdown-items",
			description: "The list of items to display in the selector."
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
			name: "disabled",
			description: "Whether the selector is disabled."
		},
		{
			name: "direct-edit",
			description: "Whether the selector is always in edit mode, or if it has to be toggled."
		},
		{
			name: "enable-shell-nav",
			description: "Should shell nav controls and navigation helpers be used?"
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		[SelectorElementTagName]: ComponentRoot<FxsSelector>;
	}

	interface HTMLElementEventMap {
		[DropdownSelectionChangeEventName]: DropdownSelectionChangeEvent;
	}
}
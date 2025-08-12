import { FxsDropdown, FxsDropdownItemElement } from "/core/ui/components/fxs-dropdown.js";
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'
import { DropdownItem } from '/core/ui/components/fxs-dropdown.js';


export type IconDropdownItem = DropdownItem & { iconURL?: string };

export class IconDropdown extends FxsDropdown {
	protected iconContainer!: HTMLElement;
	private icon!: HTMLElement;

	protected render() {
		super.render();

		this.Root.classList.remove('min-w-80');

		this.iconContainer = document.createElement('div');
		this.iconContainer.classList.value = "relative flex flow-row items-center justify-center";
		this.icon = document.createElement('div');
		this.icon.classList.add("dropdown__icon", "w-16", "h-16", "bg-center", "bg-contain", "bg-no-repeat", "relative");
		this.iconContainer.appendChild(this.icon);

		const dropdownContainer: HTMLElement = MustGetElement(".dropdown__container", this.Root);
		const dropdownLabel: HTMLElement = MustGetElement(".dropdown__label", this.Root);
		dropdownContainer.insertBefore(this.iconContainer, dropdownLabel);
	}

	protected update() {
		super.update();

		if (this.selectedIndex >= 0 && this.dropdownItems[this.selectedIndex]) {
			const dropdownIconItem = this.dropdownItems[this.selectedIndex] as IconDropdownItem;
			if (dropdownIconItem.iconURL == "") {
				this.icon.classList.add("hidden");
			} else {
				this.icon.classList.remove("hidden");
				this.icon.style.backgroundImage = `url('${dropdownIconItem.iconURL}')`;
			}
		}
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'show-label-on-selected-item':
				this.labelElement.classList.toggle('hidden', newValue == 'false')
				break;
			case 'icon-container-innerhtml':
				const content = document.createElement("div");
				content.classList.value = "dropdown__icon-container flow-row items-center relative"
				content.innerHTML = newValue;
				this.iconContainer.querySelector(".dropdown__icon-container")?.remove();
				this.iconContainer.insertAdjacentElement("afterbegin", content);
				break;
		}
	}

	protected createListItemElement() {
		return document.createElement('icon-dropdown-item');
	}

	protected updateExistingElement(element: ComponentRoot<FxsDropdownItemElement>, dropdownItem: DropdownItem, isSelected: boolean) {
		super.updateExistingElement(element, dropdownItem, isSelected);
		element.setAttribute("data-icon", (dropdownItem as IconDropdownItem).iconURL ?? "");
	}
}

Controls.define('icon-dropdown', {
	createInstance: IconDropdown,
	description: 'A UI dropdown control for selecting an option from a list of options, but with icons.',
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
		{
			name: "show-label-on-selected-item",
			description: "Show the label next to the icon on the selected item of the dropdown."
		},
		{
			name: "icon-container-innerhtml"
		}
	]
});

class IconDropdownItemElement extends FxsDropdownItemElement {

	private icon!: HTMLElement;

	protected render() {
		super.render();
		this.icon = document.createElement('div');
		this.icon.classList.add("dropdownitem__icon", "w-8", "h-8", "bg-center", "bg-cover");
		this.Root.insertBefore(this.icon, this.labelElement);
		this.icon.classList.toggle('hidden', true);
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		super.onAttributeChanged(name, oldValue, newValue);

		switch (name) {
			case 'data-icon':
				this.icon.style.backgroundImage = `url('${newValue!}')`;
				this.icon.classList.toggle('hidden', newValue == "");
				break;
		}
	}
}

Controls.define('icon-dropdown-item', {
	createInstance: IconDropdownItemElement,
	description: 'A UI dropdown item, but with an icon.',
	tabIndex: -1,
	attributes: [
		{
			name: "data-label",
			description: "The label of the dropdown item."
		},
		{
			name: "data-disabled",
			description: "Whether the dropdown item is disabled."
		},
		{
			name: 'data-selected'
		},
		{
			name: 'data-icon',
			description: "icon that goes along with the label."
		},
		{
			name: 'disabled'
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'icon-dropdown': ComponentRoot<IconDropdown>;
		'icon-dropdown-item': ComponentRoot<IconDropdownItemElement>;
	}
}
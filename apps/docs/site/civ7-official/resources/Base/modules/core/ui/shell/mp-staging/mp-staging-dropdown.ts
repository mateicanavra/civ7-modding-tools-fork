import { IconDropdown } from '/core/ui/shell/shell-components/icon-dropdown.js';

export class MPStagingDropdown extends IconDropdown {
	private hideArrowElement: boolean = true;

	onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'disabled':
				this.hideArrowElement = newValue == "true";
				super.updateOpenArrowElement();
				break;
		}
	}

	protected isArrowElementVisibile() {
		return !this.hideArrowElement && super.isArrowElementVisibile();
	}
}

Controls.define('lobby-dropdown', {
	createInstance: MPStagingDropdown,
	description: 'a dropdown specific to the staging screen.',
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
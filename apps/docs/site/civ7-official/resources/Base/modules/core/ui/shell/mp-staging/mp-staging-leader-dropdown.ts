import { MPStagingDropdown } from "/core/ui/shell/mp-staging/mp-staging-dropdown.js"
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";

class MPStagingLeaderDropdown extends MPStagingDropdown {
	readonly MEMENTO_CONFIGURATION: string[] = [
		"img-mem_maj_generic",
		"img-mem_min_generic",
		"img-mem_min_generic"
	];
	private mementoElements: HTMLElement[] = [];
	private mementoContainer!: HTMLElement;

	protected render() {
		super.render();

		const dropdownContainer: HTMLElement = MustGetElement(".dropdown__container", this.Root);
		dropdownContainer.classList.add("justify-start");
		const label: HTMLElement = MustGetElement(".dropdown__label", this.Root);

		const contentContainer = document.createElement('div');
		contentContainer.classList.value = "flex-auto ml-2";
		dropdownContainer.replaceChild(contentContainer, label);
		label.classList.remove("flex-auto");
		label.classList.add("w-full", "truncate");
		contentContainer.appendChild(label);

		this.mementoContainer = document.createElement('div')
		this.mementoContainer.classList.add('flow-row', 'mt-1');
		contentContainer.appendChild(this.mementoContainer);

		for (let i = 0; i < this.MEMENTO_CONFIGURATION.length; ++i) {
			const currentMomento: HTMLElement = document.createElement('div');
			currentMomento.classList.add("w-8", "h-8", "bg-center", "bg-cover", "mr-2");
			this.mementoContainer.appendChild(currentMomento);
			this.mementoElements.push(currentMomento);
		}
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'mementos': {
				this.mementoContainer.classList.toggle("hidden", newValue == "");

				if (newValue != "") {
					const mementos: string[] = newValue.split(',');
					for (let i = 0; i < mementos.length; ++i) {
						const currentMementoElement: HTMLElement = this.mementoElements[i];

						const memento: string = mementos[i];
						const isMementoValid: boolean = memento != "NONE";

						currentMementoElement.classList.toggle(this.MEMENTO_CONFIGURATION[i], isMementoValid);
						currentMementoElement.classList.toggle("bg-cover", isMementoValid);
						currentMementoElement.classList.toggle("mp_mem_available", !isMementoValid);
					}
				}
				break;
			}
		}
	}
}

Controls.define('leader-dropdown', {
	createInstance: MPStagingLeaderDropdown,
	description: 'A icon dropdown control for selecting an option from a list of options, specific to the staging screen.',
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
			name: "mementos",
		},
		{
			name: "icon-container-innerhtml"
		}
	]
});
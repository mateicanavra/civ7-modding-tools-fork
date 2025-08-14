import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'
import { FxsDropdown } from "/core/ui/components/fxs-dropdown.js";

class MPLobbyPlayerInfoCardDropdown extends FxsDropdown {
	private hideArrowElement: boolean = true;
	private permanantHighlight!: HTMLElement;

	protected render() {
		super.render();

		this.Root.classList.remove('min-w-80');

		const dropdownContainer: HTMLElement = MustGetElement(".dropdown__container", this.Root);
		dropdownContainer.classList.remove("pl-4", "min-w-80", "pr-1\\.5");

		const playerInfoCard: HTMLElement = document.createElement("mp-staging-player-info-card");
		playerInfoCard.setAttribute("data-bind-attributes", "{'data-player-info': {{g_MPLobbyModel}}.stringify({{player}})}");
		playerInfoCard.classList.add("flex-auto");
		dropdownContainer.insertBefore(playerInfoCard, this.labelElement);
		dropdownContainer.removeChild(this.labelElement);

		this.permanantHighlight = document.createElement("div");
		this.permanantHighlight.classList.add("absolute", "-inset-0\\.5", "img-dropdown-box-focus", "opacity-0");
		dropdownContainer.insertBefore(this.permanantHighlight, this.highlightElement);

		this.openArrowElement.classList.add("absolute", "right-1\\.25");
		this.highlightElement.classList.remove("-inset-0\\.5");
		this.highlightElement.classList.add("inset-0");
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'disabled':
				this.hideArrowElement = newValue == "true";
				super.updateOpenArrowElement();
				break;
			case 'is-local':
				this.permanantHighlight.classList.toggle('opacity-100', newValue == "true");
				break;
			case 'tooltip':
				if (newValue != undefined) {
					this.Root.setAttribute("data-tooltip-anchor", "left");
					this.Root.setAttribute('data-tooltip-content', newValue);
				}
				else {
					this.Root.removeAttribute('data-tooltip-anchor');
					this.Root.removeAttribute('data-tooltip-content');
				}
				break;
		}
	}

	protected isArrowElementVisibile() {
		return !this.hideArrowElement && super.isArrowElementVisibile();
	}
}

Controls.define('lobby-playerinfocard-dropdown', {
	createInstance: MPLobbyPlayerInfoCardDropdown,
	description: 'A UI dropdown control, custom to the multiplayer lobby, whose selected item is instead a playerinfocard',
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
			name: "is-local",
			description: "Whether the player is local."
		},
		{
			name: "tooltip",
			description: "Tooltip for the dropdown html element itself"
		}
	]
});
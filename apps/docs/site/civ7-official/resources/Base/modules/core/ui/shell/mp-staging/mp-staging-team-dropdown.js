import { MPStagingDropdown } from "/core/ui/shell/mp-staging/mp-staging-dropdown.js";
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { multiplayerTeamColors } from '/core/ui/utilities/utilities-network-constants.js';
export class MPStagingTeamDropdown extends MPStagingDropdown {
    render() {
        super.render();
        const dropdownLabel = MustGetElement(".dropdown__label", this.Root);
        dropdownLabel.classList.remove("flex-auto");
        dropdownLabel.classList.add("w-auto", "-ml-24", "font-body-xl", 'text-white', 'text-shadow');
    }
    onAttributeChanged(name, oldValue, newValue) {
        super.onAttributeChanged(name, oldValue, newValue);
        if (name == "selected-item-index") {
            const selectedTeam = parseInt(newValue);
            let itemContents = `
				<div class='mp-staging__team-bg absolute bg-cover w-16 h-16' style='fxs-background-image-tint: #8c7e62'>
				<div class='mp-staging__team-bg absolute bg-cover w-14 h-14 left-1 top-1' style='fxs-background-image-tint: ${multiplayerTeamColors[selectedTeam]}'></div>
				</div>
				`;
            this.Root.setAttribute("icon-container-innerhtml", itemContents);
        }
    }
}
Controls.define('team-dropdown', {
    createInstance: MPStagingTeamDropdown,
    description: 'An icon dropdown control for selecting a team in multiplayer.',
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

//# sourceMappingURL=file:///core/ui/shell/mp-staging/mp-staging-team-dropdown.js.map

/**
 * @file screen-age-summary-hub.ts
 * @copyright 2024, Firaxis Games
 * @description Full screen age summary hub which hosts the different panels we want to show at the end of an age during age transition
 */
import AgeSummary from '/base-standard/ui/age-summary/model-age-summary-hub.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
//import { RadioButtonChangeEvent } from '/core/ui/components/fxs-radio-button.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
class ScreenAgeSummaryHub extends Panel {
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        AgeSummary.selectCurrentAge();
    }
    onDetach() {
        super.onDetach();
    }
    render() {
        this.Root.innerHTML = `
			<fxs-frame class="flex-auto w-full h-full">
				<div class="flex-auto">
					<fxs-header class="age-name-title self-center mb-4 font-title-2xl text-secondary" filigree-style="none"></fxs-header>
					<div class="age-button-container flex flex-row self-center mb-4"></div>
					<fxs-tab-bar class="self-center mb-4" selected-tab-index="0"
						tab-items='[{"id":"age-rankings-tab","label":"Age Rankings"},
								{"id":"victory-points-tab","label":"Victory Points"}]'></fxs-tab-bar>
					<fxs-slot-group class="flex flex-auto">
						<panel-age-rankings id="age-rankings-tab">
						</panel-age-rankings>
						<panel-victory-points id="victory-points-tab">
						</panel-victory-points>
					</fxs-slot-group>
					<fxs-button class="age-summary-continue-button w-128 self-end" caption="LOC_AGE_LOADOUT_CONTINUE"></fxs-button>
				</div>
			</fxs-frame>
		`;
        const tabControl = MustGetElement("fxs-tab-bar", this.Root);
        tabControl.addEventListener("tab-selected", this.onTabBarSelected.bind(this));
        const ageNameTitle = MustGetElement(".age-name-title", this.Root);
        Databind.attribute(ageNameTitle, 'title', "g_AgeSummary.ageName");
        const continueButton = MustGetElement(".age-summary-continue-button", this.Root);
        continueButton.addEventListener("action-activate", this.onContinueButton.bind(this));
        // TODO - Reimplement when previous age victory data is full exposed
        // const ageButtonContainer = MustGetElement(".age-button-container", this.Root);
        // const ageButton = document.createElement('fxs-radio-button');
        // Databind.for(ageButton, 'g_AgeSummary.ageData', 'age');
        // {
        // 	ageButton.classList.add('ml-2', 'mr-2');
        // 	ageButton.setAttribute('group-tag', 'age-summary-buttons');
        // 	Databind.attribute(ageButton, 'value', 'age.type');
        // 	Databind.attribute(ageButton, 'selected', 'age.isSelected');
        // 	Databind.attribute(ageButton, 'disabled', 'age.isDisabled');
        // 	Databind.tooltip(ageButton, 'age.name');
        // 	ageButton.addEventListener(ComponentValueChangeEventName, this.onAgeButtonSelected);
        // }
        // ageButtonContainer.appendChild(ageButton);
    }
    // TODO - Reimplement when previous age victory data is full exposed
    // private onAgeButtonSelected = (event: RadioButtonChangeEvent<string>) => {
    // 	const { isChecked, value: ageType } = event.detail;
    // 	if (isChecked) {
    // 		AgeSummary.selectAgeType(ageType);
    // 	}
    // }
    onTabBarSelected(event) {
        const slotGroup = MustGetElement('fxs-slot-group', this.Root);
        slotGroup.setAttribute('selected-slot', event.detail.selectedItem.id);
    }
    onContinueButton() {
        this.close();
    }
}
Controls.define('screen-age-summary-hub', {
    createInstance: ScreenAgeSummaryHub,
    description: 'Screen for adjusting game options.',
    classNames: ['screen-age-summary-hub'],
    styles: ['fs://game/base-standard/ui/age-summary/screen-age-summary-hub.css']
});

//# sourceMappingURL=file:///base-standard/ui/age-summary/screen-age-summary-hub.js.map

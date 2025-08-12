/**
 * @file screen-belief-chooser.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Religious Belief Chooser screen.  This screen is a customized instance of a general chooser.
 */
import { ScreenGeneralChooser } from '/base-standard/ui/general-chooser/screen-general-chooser.js';
class ScreenBeliefChooser extends ScreenGeneralChooser {
    constructor() {
        super(...arguments);
        this.chosenBelief = null;
        this.confirmListener = () => { this.confirmButton(); };
    }
    /**
     * Create the list of entries in this chooser. Called by the base general chooser.
     * @param {element} entryContainer - The HTML element that's the parent of all of the entries.
     */
    createEntries(entryContainer) {
        GameInfo.Beliefs.forEach(belief => {
            if (Game.Religion.canHaveBelief(GameContext.localPlayerID, belief.$index)) {
                const newEntry = document.createElement("fxs-activatable");
                this.tagEntry(newEntry);
                newEntry.setAttribute("data-tooltip-content", Locale.compose(belief.Description));
                newEntry.setAttribute("religion-belief", belief.BeliefType);
                const iconContainer = document.createElement("div");
                iconContainer.classList.add("belief-chooser__selection-status");
                const iconImg = document.createElement("div");
                iconImg.classList.add("belief-chooser__selection-icon-img");
                iconImg.style.backgroundImage = "none";
                iconContainer.appendChild(iconImg);
                newEntry.appendChild(iconContainer);
                const text = document.createElement("div");
                text.classList.add("belief-chooser__selection-text");
                text.innerHTML = Locale.compose(belief.Name);
                newEntry.appendChild(text);
                entryContainer.appendChild(newEntry);
            }
        });
        const confirmButton = this.Root.querySelector(".belief-confirm-button");
        if (confirmButton) {
            confirmButton.addEventListener("action-activate", this.confirmListener);
        }
        else {
            console.error("screen-belief-chooser: createEntries(): Missing confirmButton with '.belief-confirm-button'");
        }
        this.updateButtonState();
    }
    /**
     * Called by the base general chooser when the user chooses an item in the list.
     * @param {element} entryElement - The HTML element chosen.
     */
    entrySelected(entryElement) {
        const iconImg = entryElement.querySelector(".belief-chooser__selection-icon-img");
        if (entryElement != this.chosenBelief) {
            //uncheck previously selected belief (if it exists)
            if (this.chosenBelief) {
                const iconElement = this.chosenBelief.querySelector(".belief-chooser__selection-icon-img");
                if (iconElement) {
                    iconElement.style.backgroundImage = "none";
                }
                else {
                    console.error("screen-belief-chooser: entrySelected - can't find belief-chooser__selection-icon-img for previously selected belief!");
                }
            }
            this.chosenBelief = entryElement;
            //check newly selected belief
            if (iconImg) {
                const iconElement = this.chosenBelief.querySelector(".belief-chooser__selection-icon-img");
                if (iconElement) {
                    // TODO: do we want a different icon for this?  This one actually works well (it's a blue hex with a white checkmark in it)
                    iconElement.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/mpicon_ready.png')";
                }
                else {
                    console.error("screen-belief-chooser: entrySelected - can't find belief-chooser__selection-icon-img for newly selected belief!");
                }
            }
        }
        this.updateButtonState();
    }
    // Turn the confirm button on and off.
    updateButtonState() {
        const confirmButton = this.Root.querySelector(".belief-confirm-button");
        if (confirmButton) {
            if (this.chosenBelief) {
                confirmButton.classList.remove("disabled");
                confirmButton.classList.remove("hidden");
            }
            else {
                // don't let the gamepad select it either
                confirmButton.classList.add("disabled");
                confirmButton.classList.add("hidden");
            }
        }
    }
    confirmButton() {
        if (this.chosenBelief) {
            const beliefType = this.chosenBelief.getAttribute("religion-belief");
            if (beliefType) {
                let args = {
                    BeliefType: Database.makeHash(beliefType)
                };
                const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.ADD_BELIEF, args, false);
                if (result.Success) {
                    Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.ADD_BELIEF, args);
                    this.close();
                }
                else {
                    console.error("screen-belief-chooser: ADD_BELIEF player operation failed!");
                }
            }
        }
        else {
            console.error("screen-belief-chooser: confirm button was activated without 1 beliefs selected");
        }
    }
}
Controls.define('screen-belief-chooser', {
    createInstance: ScreenBeliefChooser,
    description: 'Religious Belief Chooser screen.',
    classNames: ['screen-general-chooser'],
    styles: ["fs://game/age-exploration/ui/belief-chooser/screen-belief-chooser.css"],
    content: ['fs://game/age-exploration/ui/belief-chooser/screen-belief-chooser.html'],
    attributes: []
});

//# sourceMappingURL=file:///age-exploration/ui/belief-chooser/screen-belief-chooser.js.map

/**
 * @file fxs-close-button.ts
 * @copyright 2025, Firaxis Games
 * @description A UI button for showing the edit pencil
 *
 */
import FxsActivatable from "/core/ui/components/fxs-activatable.js";
export class FxsEditButton extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.editButtonBG = document.createElement("div");
        this.editButtonHoverBG = document.createElement("div");
        this.playSoundListener = this.playSound.bind(this, 'data-audio-focus', 'data-audio-focus-ref');
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.playSoundListener);
        this.render();
        this.Root.setAttribute("data-tooltip-content", "LOC_NAME_EDIT");
    }
    onDetach() {
        this.Root.removeEventListener('mouseenter', this.playSoundListener);
        super.onDetach();
    }
    render() {
        this.Root.classList.add('cursor-pointer', 'group');
        this.editButtonBG.classList.add("img-icon-pencil", "absolute", "inset-0", "opacity-100", "group-hover\\:opacity-0", "group-focus\\:opacity-0", "transition-opacity");
        this.editButtonHoverBG.classList.add("img-icon-pencil-hover", "absolute", "inset-0", "opacity-0", "group-hover\\:opacity-100", "group-focus\\:opacity-100", "transition-opacity");
        this.Root.appendChild(this.editButtonBG);
        this.Root.appendChild(this.editButtonHoverBG);
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case "is-confirm":
                this.editButtonBG.classList.toggle("img-icon-pencil", newValue != "true");
                this.editButtonBG.classList.toggle("img-icon-pencil-check", newValue == "true");
                this.editButtonHoverBG.classList.toggle("img-icon-pencil-hover", newValue != "true");
                this.editButtonHoverBG.classList.toggle("img-icon-pencil-check-hover", newValue == "true");
                break;
            default:
                super.onAttributeChanged(name, oldValue, newValue);
                break;
        }
    }
}
Controls.define('fxs-edit-button', {
    createInstance: FxsEditButton,
    description: 'An edit button primitive',
    classNames: ['fxs-edit-button', 'relative'],
    images: [
        'fs://game/icon_pencil.png',
        'fs://game/icon_pencil_hover.png',
        'fs://game/icon_pencil_check.png',
        'fs://game/icon_pencil_check_hover.png'
    ],
    attributes: [
        {
            name: "is-confirm",
            description: "If the text box should show the confirm classes or not"
        }
    ],
});

//# sourceMappingURL=file:///core/ui/components/fxs-edit-button.js.map

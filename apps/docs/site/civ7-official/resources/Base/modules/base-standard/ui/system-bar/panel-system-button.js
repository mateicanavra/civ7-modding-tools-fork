/**
 * @file panel-system-button.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Button for system panel.
 */
//! MODULES SUPPORT
/// <reference path="../../../core/ui/component-support.ts" />
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
/**
 * A panel button for activating system elements, such as pause menu button, clock, etc.
 */
class PanelSystemButton extends FxsActivatable {
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.playSound.bind(this, 'data-audio-focus', 'data-audio-focus-ref'));
        const tag = this.Root.getAttribute("radial-tag");
        if (tag) {
            this.Root.classList.add(tag);
        }
        const icon = this.Root.querySelector('.ps-btn-icon');
        if (icon) {
            icon.style.backgroundImage = `url('fs://game/core/ui/themes/default/img/icons/${this.Root.getAttribute('data-icon')}.png')`;
        }
    }
    onAttributeChanged(name, _oldValue, newValue) {
        if (name == "radial-tag") {
            this.Root.classList.add(newValue);
        }
    }
}
Controls.define('panel-system-button', {
    createInstance: PanelSystemButton,
    description: 'Basic panel button',
    classNames: ['ps-btn'],
    styles: ['fs://game/base-standard/ui/system-bar/panel-system-button.css'],
    content: ['fs://game/base-standard/ui/system-bar/panel-system-button.html'],
    attributes: [
        {
            name: "caption",
            description: "The text label of the button."
        },
        {
            name: "action-key",
            description: "The action key for inline nav help, usually translated to a button icon."
        },
        {
            name: 'radial-tag'
        }
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///base-standard/ui/system-bar/panel-system-button.js.map

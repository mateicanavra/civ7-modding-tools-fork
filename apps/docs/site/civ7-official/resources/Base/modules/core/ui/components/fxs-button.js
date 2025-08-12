/**
 * @file fxs-button.ts
 * @copyright 2019-2023, Firaxis Games
 * @description Base button.
 *
 * Set the `caption` attribute to the text you want to display on the button.
 *
 * Set the `action-key` attribute to the action key you want to display on the button.
 *
 * Set the `type` attribute to `big` to make the button bigger.
 */
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
/**
 * FxsButton is a simple clickable button element, not intended to be overridden.
 *
 * Other buttons should FxsActivatable as a base class instead.
 */
export class FxsButton extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.label = document.createElement('div');
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'action-key': {
                this.addOrRemoveNavHelpElement(this.Root, newValue);
                break;
            }
            case 'caption': {
                if (newValue) {
                    this.label.setAttribute('data-l10n-id', newValue);
                }
                else {
                    this.label.removeAttribute('data-l10n-id');
                    this.label.innerHTML = "";
                }
                break;
            }
            default:
                super.onAttributeChanged(name, oldValue, newValue);
                break;
        }
    }
    render() {
        this.Root.classList.add('z-0', 'relative', 'flex', 'h-13', 'items-center', 'justify-center', 'px-4', 'py-1\\.5', 'font-title', 'text-base', 'text-accent-1', 'uppercase', 'tracking-150');
        this.Root.innerHTML = `
			<div class="-z-1 absolute inset-0">
				<div class="absolute inset-0 fxs-button__bg fxs-button__bg--base"></div>
				<div class="absolute inset-0 opacity-0 fxs-button__bg fxs-button__bg--focus"></div>
				<div class="absolute inset-0 opacity-0 fxs-button__bg fxs-button__bg--active"></div>
				<div class="absolute inset-0 opacity-0 fxs-button__bg fxs-button__bg--disabled"></div>
			</div>
		`;
        this.Root.appendChild(this.label);
        this.addOrRemoveNavHelpElement(this.Root, this.Root.getAttribute('action-key'));
        if (!this.Root.hasAttribute("data-audio-press-ref")) {
            this.Root.setAttribute("data-audio-press-ref", "data-audio-primary-button-press");
        }
        if (!this.Root.hasAttribute("data-audio-focus-ref")) {
            this.Root.setAttribute('data-audio-focus-ref', "data-audio-primary-button-focus");
        }
        if (this.Root.hasAttribute("disabled-focusable")) {
            this.Root.classList.add("disabled-focusable");
        }
    }
}
Controls.define('fxs-button', {
    createInstance: FxsButton,
    description: 'A button primitive',
    classNames: ['fxs-button'],
    attributes: [
        {
            name: "disabled",
            description: "Whether the button is disabled."
        },
        {
            name: "disabled-focusable",
            description: "A button gets the visual disabled while still being able to be focused by gamepad"
        },
        {
            name: "caption",
            description: "The text label of the button."
        },
        {
            name: "action-key",
            description: "The action key for inline nav help, usually translated to a button icon."
        },
        {
            name: "play-error-sound",
            description: "Determines whether or not the error sounds should be played when clicking this button"
        }
    ],
    images: [
        'fs://game/base_button-bg.png',
        'fs://game/base_button-bg-focus.png',
        'fs://game/base_button-bg-press.png',
        'fs://game/base_button-bg-dis.png'
    ],
    tabIndex: -1
});
export { FxsButton as default };

//# sourceMappingURL=file:///core/ui/components/fxs-button.js.map

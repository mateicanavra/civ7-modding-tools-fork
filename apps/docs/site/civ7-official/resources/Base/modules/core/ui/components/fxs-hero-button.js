import { FxsActivatable } from '/core/ui/components/fxs-activatable.js';
/**
 * FxsHeroButton
 */
export class FxsHeroButton extends FxsActivatable {
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
            case 'caption': {
                if (newValue) {
                    this.label.setAttribute('data-l10n-id', newValue);
                }
                else {
                    this.label.removeAttribute('data-l10n-id');
                }
                break;
            }
            case 'disabled': {
                super.onAttributeChanged(name, oldValue, newValue);
                const elements = this.Root.querySelectorAll('.bg-herobutton-sideframe, .bg-herobutton-centerpiece');
                for (let i = 0; i < elements.length; i++) {
                    elements[i].classList.toggle('disabled', this.disabled);
                }
                break;
            }
            default:
                super.onAttributeChanged(name, oldValue, newValue);
                break;
        }
    }
    render() {
        this.Root.classList.add('relative', 'flex', 'h-13', 'items-center', 'justify-center', 'min-w-80', 'font-title', 'uppercase', 'text-base', 'text-accent-1', 'tracking-150', 'cursor-pointer', 'mt-6');
        this.Root.innerHTML = `
			<div class="absolute inset-0 opacity-0 bg-herobutton-gradient"></div>
			<div class="absolute inset-x-0 top-0 bottom-0 flex flex-row">
				<div class="flex-1 bg-herobutton-sideframe"></div>
				<div class="flex-1 bg-herobutton-sideframe -rotate-y-180"></div>
				<div class="absolute inset-0 flex justify-center">
					<div class="w-11 bg-herobutton-centerpiece"></div>
				</div>
			</div>
		`;
        this.label.classList.add('relative', 'py-3', "px-5");
        if (!this.Root.hasAttribute("data-audio-activate-ref")) {
            this.Root.setAttribute("data-audio-activate-ref", "data-audio-hero-activate");
        }
        if (!this.Root.hasAttribute("data-audio-press-ref")) {
            this.Root.setAttribute("data-audio-press-ref", "data-audio-hero-press");
        }
        if (!this.Root.hasAttribute("data-audio-focus-ref")) {
            this.Root.setAttribute("data-audio-focus-ref", "data-audio-hero-focus");
            this.Root.appendChild(this.label);
        }
    }
}
Controls.define('fxs-hero-button', {
    createInstance: FxsHeroButton,
    attributes: [
        { name: 'caption' },
        { name: 'icon' },
        { name: 'action-key' },
        { name: 'disabled' },
    ],
    images: [
        'blp:hud_herobutton_centerpiece',
        'blp:hud_herobutton_centerpiece-dis',
        'blp:hud_herobutton_sideframe',
        'blp:hud_herobutton_sideframe-dis'
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/components/fxs-hero-button.js.map

import { FxsActivatable } from '/core/ui/components/fxs-activatable.js';
/**
 * FxsPlusMinusButton
 */
export class FxsMinusPlusButton extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.plusContainer = document.createElement('div');
        this.plusBg = document.createElement('div');
        this.plusBgHighlight = document.createElement('div');
        this.minusContainer = document.createElement('div');
        this.minusBg = document.createElement('div');
        this.minusBgHighlight = document.createElement('div');
        this.mobileHitbox = document.createElement('div');
    }
    set type(value) {
        this.Root.dataset.type = value;
    }
    get type() {
        return this.Root.dataset.type === 'plus' ? 'plus' : 'minus';
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
    }
    onDetach() {
        super.onDetach();
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'type':
                if (newValue === 'plus' || newValue === 'minus') {
                    this.update(newValue);
                }
                break;
            case 'data-disabled': {
                super.onAttributeChanged('disabled', oldValue, newValue);
                this.Root.classList.toggle('opacity-50', this.disabled);
                break;
            }
        }
    }
    update(type = null) {
        type = type ?? this.type;
        this.plusContainer.classList.toggle('opacity-0', type === 'minus');
        this.minusContainer.classList.toggle('opacity-0', type === 'plus');
    }
    render() {
        this.Root.classList.add('relative', 'p-1', 'cursor-pointer', 'pointer-events-auto', 'group');
        this.Root.classList.toggle("w-5", UI.getViewExperience() != UIViewExperience.Mobile);
        this.Root.classList.toggle("h-5", UI.getViewExperience() != UIViewExperience.Mobile);
        this.Root.classList.toggle("w-6", UI.getViewExperience() == UIViewExperience.Mobile);
        this.Root.classList.toggle("h-6", UI.getViewExperience() == UIViewExperience.Mobile);
        this.plusContainer.classList.add('absolute', 'inset-0');
        this.minusContainer.classList.add('absolute', 'inset-0');
        this.plusBg.classList.add('absolute', '-inset-1\\.5', 'img-questopen', 'bg-no-repeat', 'bg-center', 'bg-contain');
        this.plusBgHighlight.classList.add('absolute', '-inset-1\\.5', 'bg-no-repeat', 'bg-center', 'bg-contain', 'img-questopen-highlight', 'transition-opacity', 'opacity-0', 'group-hover\\:opacity-100', 'group-focus\\:opacity-100');
        this.minusBg.classList.add('absolute', '-inset-1\\.5', 'img-questclose', 'bg-no-repeat', 'bg-center', 'bg-contain');
        this.minusBgHighlight.classList.add('absolute', '-inset-1\\.5', 'bg-no-repeat', 'bg-center', 'bg-contain', 'img-questclose-highlight', 'transition-opacity', 'opacity-0', 'group-hover\\:opacity-100', 'group-focus\\:opacity-100');
        this.mobileHitbox.classList.add('absolute', '-inset-3');
        this.mobileHitbox.classList.toggle("hidden", UI.getViewExperience() != UIViewExperience.Mobile);
        this.plusContainer.appendChild(this.plusBg);
        this.plusContainer.appendChild(this.plusBgHighlight);
        this.minusContainer.appendChild(this.minusBg);
        this.minusContainer.appendChild(this.minusBgHighlight);
        this.Root.appendChild(this.plusContainer);
        this.Root.appendChild(this.minusContainer);
        this.Root.appendChild(this.mobileHitbox);
    }
}
Controls.define('fxs-minus-plus', {
    createInstance: FxsMinusPlusButton,
    attributes: [
        { name: 'type' },
        { name: 'data-disabled' }
    ],
    images: ["hud_quest_open", "hud_quest_open_hov", "hud_quest_close", "hud_quest_close_hov"]
});

//# sourceMappingURL=file:///core/ui/components/fxs-minus-plus.js.map

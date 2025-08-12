import { FxsActivatable } from '/core/ui/components/fxs-activatable.js'

/**
 * FxsPlusMinusButton 
 */
export class FxsMinusPlusButton extends FxsActivatable {

	private readonly plusContainer = document.createElement('div');
	private readonly plusBg = document.createElement('div');
	private readonly plusBgHighlight = document.createElement('div');
	private readonly minusContainer = document.createElement('div');
	private readonly minusBg = document.createElement('div');
	private readonly minusBgHighlight = document.createElement('div');
	private readonly mobileHitbox = document.createElement('div');

	public set type(value: 'plus' | 'minus') {
		this.Root.dataset.type = value;
	}

	public get type() {
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

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
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

	private update(type: 'plus' | 'minus' | null = null) {
		type = type ?? this.type;
		this.plusContainer.classList.toggle('opacity-0', type === 'minus');
		this.minusContainer.classList.toggle('opacity-0', type === 'plus');
	}

	private render() {
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

declare global {
	interface HTMLElementTagNameMap {
		'fxs-minus-plus': ComponentRoot<FxsMinusPlusButton>;
	}
}
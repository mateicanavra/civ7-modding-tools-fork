/**
 * @file fxs-text-button.ts
 * @copyright 2023-24, Firaxis Games
 * @description A simple text button.
 * 
 * For increased size, set the type attribute to "big".
 * For decorative highlight set highlight-style attribute to "decorative".
 */

import FxsActivatable from '/core/ui/components/fxs-activatable.js';

class FxsTextButton extends FxsActivatable {
	onInitialize(): void {
		super.onInitialize();
		this.render();
	}

	onAttributeChanged(name: string, _oldValue: string, newValue: string): void {
		switch (name) {
			case 'caption': {
				const labels = this.Root.querySelectorAll<HTMLElement>('.text-button__label');
				if (newValue) {
					for (let i = 0; i < labels.length; i++) {
						labels[i].setAttribute('data-l10n-id', newValue);
					}
				} else {
					for (let i = 0; i < labels.length; i++) {
						labels[i].removeAttribute('data-l10n-id');
					}
				}
				break;
			}
			default:
				super.onAttributeChanged(name, _oldValue, newValue);
				break;
		}
	}

	render() {
		const sizeClass = this.Root.getAttribute('type') === 'big' ? 'text-xl' : 'text-base';
		this.Root.classList.add('relative', 'font-title', 'leading-normal', sizeClass);
		const caption = this.Root.getAttribute("caption") ?? "";
		if (this.Root.getAttribute('highlight-style') === 'decorative') {
			this.Root.innerHTML = `
				<div class="text-button__highlight-decorative size-full flex justify-center">
					<div class="text-button__highlight-decorative-rays -top-2"></div>
					<div class="text-button__highlight-decorative-rays rotate-180 -bottom-2"></div>
					<div class="text-button__highlight-decorative-glow size-full"></div>
					<div class="text-button__highlight-decorative-bg size-full"></div>
				</div>
				<div class="text-button__label text-accent-1 text-center min-w-72 relative" data-l10n-id="${caption}"></div>
			`
		}
		else {
			this.Root.innerHTML = `
					<div class="text-button__highlight"></div>
					<div class="text-button__label text-accent-1 text-center min-w-72 relative" data-l10n-id="${caption}"></div>
				`
		}
		this.Root.setAttribute('data-audio-press-ref', "data-audio-select-press");
	}
}

Controls.define('fxs-text-button', {
	createInstance: FxsTextButton,
	description: 'just text, but also a button.',
	classNames: ['fxs-text-button'],
	attributes: [
		{
			name: "caption",
			description: "The text label of the button."
		},
		{
			name: 'disabled',
			description: 'Whether the button is disabled or not.'
		}
	],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		"fxs-text-button": ComponentRoot<FxsTextButton>,
	}
}
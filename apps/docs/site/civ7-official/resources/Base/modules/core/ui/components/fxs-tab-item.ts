/**
 * @copyright 2024, Firaxis Games
 * @description a component that represents a tab item in a tab bar
 * @file fxs-tab-item.ts
 */

import FxsActivatable from '/core/ui/components/fxs-activatable.js'
import { FxsStatefulIcon } from '/core/ui/components/fxs-stateful-icon.js'
import { StatefulIcon } from '../stateful-icon/index.js'
import { PassThroughAttributes } from '/core/ui/utilities/utilities-dom.js'

export class FxsTabItem extends FxsActivatable {
	private _labelElement: HTMLSpanElement | undefined;
	private get labelElement() {
		if (!this._labelElement) {
			const labelElement = document.createElement('span');
			this._labelElement = labelElement;
		}

		return this._labelElement;
	}

	private iconGroupElement: ComponentRoot<FxsStatefulIcon> | undefined;

	onInitialize() {
		super.onInitialize();
		this.disabledCursorAllowed = false;
		this.render();
	}


	updateLabelText() {
		const disabled = this.disabled;
		const selected = this.Root.getAttribute('selected') === 'true';

		this.Root.classList.toggle('text-secondary', selected && !disabled);
		this.Root.classList.toggle('text-accent-1', !selected && !disabled);
		this.Root.classList.toggle('text-accent-5', disabled);

	}

	updateIconState() {
		const disabled = this.disabled;
		const selected = this.Root.getAttribute('selected') === 'true';

		this.iconGroupElement?.setAttribute('data-state',
			disabled ? StatefulIcon.IconState.Disabled :
				selected ? StatefulIcon.IconState.Focus :
					StatefulIcon.IconState.Default
		);
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		switch (name) {
			case 'selected': {
				this.updateLabelText();
				this.updateIconState();
				break;
			}

			case 'disabled': {
				super.onAttributeChanged('disabled', oldValue, newValue);
				this.updateLabelText();
				this.updateIconState();
				break;
			}

			case 'nowrap': {
				this.labelElement.classList.toggle("whitespace-nowrap", newValue == "true");
				break;
			}

			case 'label': {
				if (newValue === null) {
					this.labelElement.remove();
				} else {
					this.labelElement.setAttribute('data-l10n-id', newValue);
					this.labelElement.classList.add("font-fit-shrink", "shrink");
					this.Root.appendChild(this.labelElement);
				}
				break;
			}

			default:
				super.onAttributeChanged(name, oldValue, newValue);
				break;
		}
	}


	private render() {
		this.Root.classList.add('relative', 'flex', 'items-center', 'justify-center', 'cursor-pointer', 'font-fit-shrink', 'text-center', 'flex-1');
		this.Root.setAttribute("data-audio-press-ref", "none");

		if (this.Root.hasAttribute('data-icon')) {
			this.Root.classList.add('group');
			this.iconGroupElement = document.createElement('fxs-stateful-icon');
			const iconClass = this.Root.getAttribute('icon-class');
			this.iconGroupElement.classList.value = "min-w-8 flex";

			if (iconClass) {
				this.iconGroupElement.classList.add(...iconClass.split(' '))
			}

			PassThroughAttributes(this.Root, this.iconGroupElement, ...StatefulIcon.AttributeNames);
			this.Root.insertBefore(this.iconGroupElement, this.Root.firstChild);

			// initial attribute changes are already processed by this point, so we have to manually trigger an update here
			this.updateIconState();

			const iconTextAttr: string | null = this.Root.getAttribute('icon-text');
			if (iconTextAttr) {
				const iconTextContainer = document.createElement("div");
				iconTextContainer.classList.value = "absolute size-full flex items-center justify-center";
				this.iconGroupElement.appendChild(iconTextContainer);

				const iconText = document.createElement("div");
				iconText.setAttribute("data-l10n-id", iconTextAttr);
				iconText.classList.value = "mb-2";
				iconTextContainer.appendChild(iconText);
			}
		}
	}
}

Controls.define('fxs-tab-item', {
	createInstance: FxsTabItem,
	attributes: [
		{
			name: 'selected'
		},
		{
			name: 'disabled'
		},
		{
			name: "disabled-cursor-allowed",
		},
		{
			name: 'label'
		},
		{
			name: 'nowrap'
		},
		{
			name: "sound-disabled",
			description: "Set to prevent the default activate sound from being played"
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-tab-item': ComponentRoot<FxsTabItem>;
	}
}
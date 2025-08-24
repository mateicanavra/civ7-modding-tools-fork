/**
 * @file fxs-stepper.ts
 * @copyright 2020-2023, Firaxis Games
 * @description A stepper primitive.
 * 
 * Set the `value` attribute to the current value of the stepper.
 * Set the `min-value` attribute to the minimum value of the stepper.
 * Set the `max-value` attribute to the maximum value of the stepper.
 * Set the `captions-list` attribute to a JSON array of strings to use as captions for each step.
 */

import { NavigateInputEvent } from '/core/ui/input/input-support.js';

export class FxsStepper extends ChangeNotificationComponent {

	private minValue = 1;
	private _value = 3;
	private maxValue = 5;
	private caption: HTMLDivElement | null = null;
	private leftArrow: HTMLDivElement | null = null;
	private rightArrow: HTMLDivElement | null = null;
	private stepperSteps: NodeListOf<HTMLDivElement> | null = null;
	private captionsList: string[] | null = null;


	private navigateInputEventListener: EventListener = this.onNavigateInput.bind(this);
	private leftArrowClickEventListener: EventListener = this.onLeftArrowClick.bind(this);
	private rightArrowClickEventListener: EventListener = this.onRightArrowClick.bind(this);

	public get value() {
		return this._value;
	}

	get captionText() {
		return this.captionsList ? this.captionsList[this.value] : this.value.toString();
	}

	private addEventListeners() {
		this.Root.addEventListener('navigate-input', this.navigateInputEventListener);
		this.leftArrow?.addEventListener('click', this.leftArrowClickEventListener);
		this.rightArrow?.addEventListener('click', this.rightArrowClickEventListener);
	}

	private removeEventListeners() {
		this.Root.removeEventListener('navigate-input', this.navigateInputEventListener);
		this.leftArrow?.removeEventListener('click', this.leftArrowClickEventListener);
		this.rightArrow?.removeEventListener('click', this.rightArrowClickEventListener);
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent): void {
		const live = this.handleNavigation(navigationEvent);
		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopPropagation();
		}
	}

	private onLeftArrowClick(): void {
		if (this._value > this.minValue) {
			this._value--;
			this.playSound('data-audio-activate', 'data-audio-activate-ref');
			this.setNewValue(this._value);
		}
	}

	private onRightArrowClick(): void {
		if (this._value < this.maxValue) {
			this._value++;
			this.playSound('data-audio-activate', 'data-audio-activate-ref');
			this.setNewValue(this._value);
		}
	}

	private updateStepperSteps() {
		const value = this.value;
		const count = this.stepperSteps?.length ?? 0;
		for (let i = 0; i < count; i++) {
			const step = this.stepperSteps?.item(i);
			if (step) {
				step.classList.toggle('selected', i + 1 === value);
			}
		}
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	private handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			// Ignore everything but FINISH events
			return true;
		}

		let live = true;

		const direction = navigationEvent.getDirection();

		switch (direction) {
			case InputNavigationAction.LEFT:
			case InputNavigationAction.RIGHT: {
				let value = this.value;
				value = direction == InputNavigationAction.LEFT ? value - 1 : value + 1;
				if (value >= this.minValue && value <= this.maxValue) {
					this.setNewValue(value);
				}

				live = false;
				break;
			}
		}

		return live;
	}

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	onAttach() {
		super.onAttach();
		this.addEventListeners();
	}

	onDetach() {
		this.removeEventListeners();
		super.onDetach();
	}

	onAttributeChanged(attributeName: string, _oldValue: string | null, newValue: string | null) {

		switch (attributeName) {
			case 'captions-list': {
				if (newValue) {
					this.captionsList = JSON.parse(newValue);
				} else {
					this.captionsList = null;
				}

				if (this.caption) {
					this.caption.innerHTML = this.captionText;
				}
				break;
			}
		}
	}


	private setNewValue(newValue: number) {
		this.Root.setAttribute('value', newValue.toString());
		this.updateStepperSteps();

		if (this.caption) {
			this.caption.innerHTML = this.captionText;
		}

		// Signal change to any outside listener.
		this.sendValueChange(new ComponentValueChangeEvent({
			value: newValue,
		}));
	}

	private render() {
		this.minValue = parseInt(this.Root.getAttribute('min-value') || '1');
		this.maxValue = parseInt(this.Root.getAttribute('max-value') || '5');
		const parsedValue = parseInt(this.Root.getAttribute('value') || '3');
		this._value = Math.min(Math.max(parsedValue, this.minValue), this.maxValue);

		let stepItems = '';
		for (let i = this.minValue; i <= this.maxValue; i++) {
			const classList = i === this.value ? 'fxs-stepper-step selected' : 'fxs-stepper-step';
			stepItems += `<div class="${classList}" step="${i}"></div>`;
		}

		this.Root.innerHTML = `
			<div class="fxs-stepper-left fxs-stepper-arrow">
				<div class="fxs-stepper-arrow stepper-left-arrow-shadow"></div>
				<div class="fxs-stepper-arrow stepper-left-arrow-shape"></div>
				<div class="fxs-stepper-arrow stepper-left-arrow-overlay"></div>
			</div>
			<div class="fxs-stepper-center-container">
				<div class="fxs-stepper-caption">${this.captionText}</div>
				<div class="fxs-stepper-step-container">${stepItems}</div>
			</div>
			<div class="fxs-stepper-right fxs-stepper-arrow">
				<div class="fxs-stepper-arrow stepper-right-arrow-shadow"></div>
				<div class="fxs-stepper-arrow stepper-right-arrow-shape"></div>
				<div class="fxs-stepper-arrow stepper-right-arrow-overlay"></div>
			</div>
		`;

		this.caption = this.Root.querySelector<HTMLDivElement>('.fxs-stepper-caption');
		this.leftArrow = this.Root.querySelector<HTMLDivElement>('.fxs-stepper-left');
		this.rightArrow = this.Root.querySelector<HTMLDivElement>('.fxs-stepper-right');
		this.stepperSteps = this.Root.querySelectorAll<HTMLDivElement>('.fxs-stepper-step');
	}
}

Controls.define('fxs-stepper', {
	createInstance: FxsStepper,
	description: 'A stepper primitive',
	classNames: ['fxs-stepper'],
	attributes: [
		{
			name: 'value',
			description: 'The current value of the stepper',
		}
	],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-stepper': ComponentRoot<FxsStepper>;
	}
}
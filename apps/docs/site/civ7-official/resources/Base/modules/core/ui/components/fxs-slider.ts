/**
 * @file fxs-slider.ts
 * @copyright 2020-2023, Firaxis Games
 * @description A UI slider control primitive for selecting a smooth or stepped value between a range.
 * 
 * TODO: @todo Need support for stylizing "steps".
 * 
 * Note: these attributes are not observable and are only read once during initialization.
 * 
 * Set the `steps` attribute to 0 for a smooth slider, or a positive integer for a stepped slider.
 * 
 * Set the `min` attribute to the minimum value of the slider.
 * 
 * Set the `value` attribute to set the initial value of the slider.
 * 
 * Set the `max` attribute to the maximum value of the slider.
 */

import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';


export type SliderValueChangeEventDetail = {
	percent: number
	value: number
	min: number
	max: number
	steps: number
}

export type SliderValueChangeEvent = ComponentValueChangeEvent<SliderValueChangeEventDetail>;

// TODO: Should probably be convert into an configurable setting
// Time between repeating steps in milliseconds
const navRepeatInterval: number = 150;

export class FxsSlider extends ChangeNotificationComponent {
	private readonly leftArrow = document.createElement('fxs-activatable');
	private readonly rightArrow = document.createElement('fxs-activatable');
	private readonly bar = document.createElement('div');
	private readonly fill = document.createElement('div');
	private readonly thumb = document.createElement('div');

	private dragInProgress = false;
	private _percent = 0;
	private min = 0;
	private max = 1;
	private steps = 0;   // Number of steps between values (0 for no step)
	private intervalHandle = 0;
	private intervalActive = false;    // true if the interval timer is active
	private intervalLeft = false;  // true if the interval timer is active for a left press-and-hold, false for right
	private navigateInputListener = this.onNavigateInput.bind(this);
	private intervalHandler = this.onInterval.bind(this);
	private thumbMouseDownListener = this.onDragStart.bind(this);
	private blurListener = this.onBlur.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private engineInputCaptureListener = this.onEngineInputCapture.bind(this);

	private dragStopEventListener = this.onDragStop.bind(this);
	private dragMoveEventListener = this.onDragMove.bind(this);
	private onRightArrowActivateListener = this.updateValueAttribute.bind(this, false);
	private onLeftArrowActivateListener = this.updateValueAttribute.bind(this, true);

	private resizeObserver = new ResizeObserver(this.realizeThumb.bind(this));

	get range(): number {
		return (this.max - this.min);
	}

	/** return the real, internal value between 0-1 of the slider */
	get percent(): number {
		return this._percent;
	}

	/** Get the current value of the slider based on the min/max range and any steps that have been set */
	get value(): number {
		if (this.steps <= 0) {
			const rangedValue: number = this.min + (this.range * this._percent);
			return rangedValue; // Value no using steps
		}
		return this.getStepValue();
	}

	onInitialize() {
		super.onInitialize();

		const value = this.getHTMLAttributeNumber("value", this.value);
		const min = this.getHTMLAttributeNumber("min", this.min);
		const max = this.getHTMLAttributeNumber("max", this.max);
		const steps = this.getHTMLAttributeNumber("steps", this.steps);

		this.setRange(min, max);
		this.setSteps(steps);
		this.setValue(value);

		this.render();
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('mouseenter', this.playSound.bind(this, 'data-audio-focus', 'data-audio-focus-ref'));

		this.resizeObserver.observe(this.Root);
		this.bar.addEventListener("mousedown", this.thumbMouseDownListener, false);
		this.Root.addEventListener("blur", this.blurListener);
		this.Root.addEventListener('engine-input', this.engineInputListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		this.leftArrow.addEventListener('action-activate', this.onLeftArrowActivateListener);
		this.leftArrow.setAttribute("data-audio-press-ref", "data-audio-checkbox-press");
		this.rightArrow.addEventListener('action-activate', this.onRightArrowActivateListener);
		this.rightArrow.setAttribute("data-audio-press-ref", "data-audio-checkbox-press");

		this.realizeThumb();
	}

	onDetach() {
		this.leftArrow.removeEventListener('action-activate', this.onLeftArrowActivateListener);
		this.rightArrow.removeEventListener('action-activate', this.onRightArrowActivateListener);
		this.bar.removeEventListener("mousedown", this.thumbMouseDownListener, false);
		window.removeEventListener("mousemove", this.dragMoveEventListener, false);
		window.removeEventListener("mouseup", this.dragStopEventListener, false);

		this.Root.removeEventListener("blur", this.blurListener);

		this.Root.removeEventListener('engine-input', this.engineInputListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		this.resizeObserver.disconnect();

		if (this.dragInProgress) {
			this.stopDrag();
		}

		super.onDetach();
	}

	private onBlur() {
		if (this.intervalActive) {
			clearInterval(this.intervalHandle);
			this.intervalActive = false;
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {

		if (inputEvent.detail.name == "touch-touch") {
			this.dragInProgress = true;

			// listen to the engine-input on window so the slider receive them if the touch coord are not on the sliders 
			// (handle the finger being above the slider and able to reach the begining/end of the slider)
			// listen in capture mode so the other components cannot stop the event
			const useCapture = true;
			window.addEventListener('engine-input', this.engineInputCaptureListener, useCapture);
		}
	}

	private onEngineInputCapture(inputEvent: InputEngineEvent) {

		if (!this.dragInProgress) {
			return;
		}

		switch (inputEvent.detail.name) {
			case 'touch-pan':
				this.onTouchPan(inputEvent);
				break;
			case 'touch-complete':
				this.stopDrag();
		}
	}

	private onTouchPan(inputEvent: InputEngineEvent) {
		if (this.dragInProgress && inputEvent.detail.status != InputActionStatuses.FINISH) {
			const value: number = this.computeValueFromCursor(inputEvent.detail.x);
			if (value != this.value) {
				this.playChangeSound();
			}

			this.Root.setAttribute("value", value.toString());

			inputEvent.stopImmediatePropagation();
			inputEvent.preventDefault();
		}
	}

	private stopDrag() {
		const useCapture: boolean = true;
		window.removeEventListener('engine-input', this.engineInputCaptureListener, useCapture);
		this.dragInProgress = false;
	}

	private updateValueAttribute(decrease: boolean) {
		const stepSize = (this.steps ?
			(1 / this.steps) * this.range
			// if no step size is set, divide the slider into 100 segments.
			: (this.max - this.min) / 100);

		if (decrease) {
			const value = this.value - stepSize;
			if (value >= this.min) {
				this.playChangeSound();
				this.Root.setAttribute("value", value.toString());
			}
		} else {
			const value: number = this.value + stepSize;
			if (value <= this.max) {
				this.playChangeSound();
				this.Root.setAttribute("value", value.toString());
			}
		}
	}

	private onInterval() {
		this.updateValueAttribute(this.intervalLeft);
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		const live = this.handleNavigation(navigationEvent);
		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		}
	}

	private playChangeSound() {
		this.playSound("data-audio-slider-changed")
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	private handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH && navigationEvent.detail.status != InputActionStatuses.START) {
			// Ignore everything but FINISH/START events
			return true;
		}

		let live: boolean = true;

		const direction: InputNavigationAction = navigationEvent.getDirection();

		switch (direction) {
			case InputNavigationAction.LEFT:
				switch (navigationEvent.detail.status) {
					case InputActionStatuses.START:
						clearInterval(this.intervalHandle);
						this.intervalHandle = setInterval(this.intervalHandler, navRepeatInterval);
						this.intervalActive = true;
						this.intervalLeft = true;
						break;

					case InputActionStatuses.FINISH:
						clearInterval(this.intervalHandle);
						this.intervalActive = false;
						this.updateValueAttribute(true);
						break;
				}

				live = false;
				break;
			case InputNavigationAction.RIGHT:
				switch (navigationEvent.detail.status) {
					case InputActionStatuses.START:
						clearInterval(this.intervalHandle);
						this.intervalHandle = setInterval(this.intervalHandler, navRepeatInterval);
						this.intervalActive = true;
						this.intervalLeft = false;
						break;

					case InputActionStatuses.FINISH:
						clearInterval(this.intervalHandle);
						this.intervalActive = false;
						this.updateValueAttribute(false);
						break;
				}

				live = false;
				break;
		}

		return live;
	}

	private getHTMLAttributeNumber(attribute: string, defaultValue: number): number {
		const value: string | null = this.Root.getAttribute(attribute);
		if (!value) {
			return defaultValue;    // May not be set, this is legit.
		}
		const num: number = parseFloat(value);
		if (Number.isNaN(num)) {
			console.warn("fxs-slider: The fxs-slider attribute '" + attribute + "' could not be parsed as an int.");
			return defaultValue;
		}
		return num;
	}

	onAttributeChanged(name: string, _oldValue: string | null, newValue: string | null) {
		if (name == "value") {
			const value = parseFloat(newValue || '0');
			this.setValue(value);
			this.realizeThumb();

			this.leftArrow.setAttribute("disabled", value <= this.min ? "true" : "false");
			this.rightArrow.setAttribute("disabled", value >= this.max ? "true" : "false");
		}
	}

	private realizeThumb() {
		let percent = ((this.value - this.min) / this.range);
		percent = Math.min(100, Math.max(0, percent)); //clamp for style safety

		const barWidth = this.bar.offsetWidth;
		let thumbLeftOffset = percent * 100;
		// refine the thumb position if the slider has rendered
		if (barWidth > 0) {
			const thumbWidth = this.thumb.offsetWidth;
			thumbLeftOffset -= (thumbWidth / barWidth) * percent * 100;
		}

		this.thumb.attributeStyleMap.set('left', CSS.percent(thumbLeftOffset));
		this.fill.attributeStyleMap.set('transform', new CSSTransformValue([new CSSScale(percent, 1)]));
	}

	private onDragStart(_event: MouseEvent) {
		this.dragInProgress = true;

		window.removeEventListener("mousemove", this.dragMoveEventListener, false);
		window.removeEventListener("mouseup", this.dragStopEventListener, true);
		window.addEventListener("mousemove", this.dragMoveEventListener, false);
		window.addEventListener("mouseup", this.dragStopEventListener, true);
	}

	private onDragMove(event: MouseEvent) {
		if (!this.dragInProgress) {
			return;
		}
		const value = this.computeValueFromCursor(event.clientX);

		// Only play sound if value has changed and within range.
		const oldValue = this.Root.getAttribute("value");
		const oldNumber = oldValue !== null ? parseFloat(oldValue) : NaN;
		if (!isNaN(oldNumber) && oldNumber != value && oldNumber >= this.min && oldNumber <= this.max) {
			this.playChangeSound();
		}

		this.Root.setAttribute("value", value.toString());
	}

	private onDragStop(event: MouseEvent): void {
		// Should only be one item dragged at once so if this is set to drag
		// it's related to this control whether the event.target is pointing to it or not.        
		if (!this.dragInProgress || !event.target) {
			return;
		}
		this.dragInProgress = false;
		const value = this.computeValueFromCursor(event.clientX);
		if (value != this.value) {
			this.playChangeSound();
		}
		this.Root.setAttribute("value", value.toString());

		window.removeEventListener("mousemove", this.dragMoveEventListener, false);
		window.removeEventListener("mouseup", this.dragStopEventListener, true);
	}

	/**
	 * Determine the ranged value on the slider based on a cursor's X position relative to the screen.
	 * @param {number} cursorX The X position (in pixels) of the cursor
	 * @returns {number} A value in the slider's range.
	 */
	private computeValueFromCursor(cursorX: number): number {
		const rect = this.bar.getBoundingClientRect();
		const ratio = (cursorX - rect.x) / (rect.width);
		if (!this.steps) {
			const value = Math.min(this.max, Math.max(this.min, (this.range * ratio) + this.min)); // compute and clamp
			return value;
		} else {
			const stepSize = (1 / this.steps) * this.range;
			const value = this.min + (Math.round(ratio * this.steps) * stepSize);
			return value;
		}
	}

	/**
	 * For a given value, obtain the equivalent step value.  (If step is 0, the value is the same.)
	 * @param value A values
	 * @returns value when placed within steps
	 */
	private getStepValue(): number {
		const stepSize: number = (1 / this.steps) * this.range;
		return this.min + (Math.round(this._percent * this.steps) * stepSize);
	}

	/**
	 * Set the range of values that can be returned from this slider.
	 * @param min The minimum boundary of the range.
	 * @param max The maximum boundary of the range.
	 */
	setRange(min = 0, max = 1) {
		if (min > max) {
			console.error("fxs-slider: Setting slider '" + this.Root.id + "' range where the min '" + min.toString() + "' is greater than the max '" + max.toString() + "'");
			min = min ^ max; // swap values (3 XORs)
			max = max ^ min;
			min = min ^ max;
		}
		this.min = min;
		this.max = max;
	}

	setSteps(steps: number = 0) {
		this.steps = steps;
	}

	setValue(value: number) {
		if (value < this.min) {
			value = this.min;
		} else if (value > this.max) {
			value = this.max;
		}
		this._percent = (value - this.min) / (this.range);

		// Signal change to any outside listener.
		this.sendValueChange(new ComponentValueChangeEvent({
			percent: this._percent,
			value: this.value,
			min: this.min,
			max: this.max,
			steps: this.steps
		}));
	}

	private render() {
		this.Root.classList.add('relative', 'w-60', 'h-8', 'flex', 'flex-row', 'items-center', 'pointer-events-auto');

		this.leftArrow.classList.add('w-8', 'h-12', 'bg-no-repeat', 'bg-contain', 'img-arrow');
		this.leftArrow.setAttribute('disabled-cursor-allowed', 'false');
		this.Root.appendChild(this.leftArrow);

		this.bar.classList.add('relative', 'flex', 'items-center', 'flex-1', 'h-3', 'cursor-pointer', 'fxs-slider__bar');
		this.fill.classList.add('absolute', 'top-0', 'left-0', 'h-full', 'w-full', 'origin-left', 'fxs-slider__fill');
		this.bar.appendChild(this.fill);

		// account for thumb shadow with inner div
		this.thumb.classList.add('absolute', 'left-0', 'w-2\\.5', 'flex', 'justify-center', 'h-5', 'py-px', 'cursor-pointer', 'transition-left', 'duration-0');
		const thumbInner = document.createElement('div');
		thumbInner.classList.add('w-6', 'h-8', 'pointer-events-none', 'fxs-slider__thumb', 'bg-contain', 'bg-no-repeat');
		this.thumb.appendChild(thumbInner);

		this.bar.appendChild(this.thumb);
		this.Root.appendChild(this.bar);
		this.rightArrow.classList.add('w-8', 'h-12', 'bg-no-repeat', 'bg-contain', 'img-arrow', 'rotate-180');
		this.rightArrow.setAttribute('disabled-cursor-allowed', 'false');
		this.Root.appendChild(this.rightArrow);
	}
}

Controls.define('fxs-slider', {
	createInstance: FxsSlider,
	description: 'A UI slider control primitive for selecting a smooth or stepped value between a range.',
	classNames: ['fxs-slider'],
	attributes: [
		{ name: 'value' }
	],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-slider': ComponentRoot<FxsSlider>;
	}
}
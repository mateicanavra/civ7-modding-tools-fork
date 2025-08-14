/**
 * @file fxs-ring-meter.ts
 * @copyright 2024, Firaxis Games
 * @description Ring meter control
 * 
 * Set min-value and max-value to control the range of the meter.
 * Set value to adjust how full the the meter is.
 * Set animation-duration to choose how fast the meter animates in milliseconds.
 * Set ring-class to alter the style of the ring halves and/or background.
 * 
 * NOTE: This control fits its size to its content unless width/height are directly set.
 *       It must have an equal width and height or clipping may occur along the diagonals.
 */

/** @description A primitive ring meter component */
export class FxsRingMeter extends Component {
	private ring?: HTMLDivElement;
	private leftRing?: HTMLDivElement;
	private rightRing?: HTMLDivElement;
	private leftMask?: HTMLDivElement;
	private rightMask?: HTMLDivElement;

	private ringFill = 1;
	private ringFillStart = 0;
	private ringFillEased = 0;

	private isAnimating = false;
	private lastAnimationTime = 0;
	private animationTimeElapsed = 0;

	public get animationDuration(): number {
		return Number(this.Root.getAttribute("animation-duration") ?? 1500);
	}

	public set animationDuration(value: number) {
		this.Root.setAttribute("animation-duration", value.toString());
	}

	public get minValue(): number {
		return Number(this.Root.getAttribute("min-value") ?? 0);
	}

	public set minValue(value: number) {
		this.Root.setAttribute("min-value", value.toString());
	}

	public get maxValue(): number {
		return Number(this.Root.getAttribute("max-value") ?? 100);
	}

	public set maxValue(value: number) {
		this.Root.setAttribute("max-value", value.toString());
	}

	public get value(): number {
		return Number(this.Root.getAttribute("value") ?? 100);
	}

	public set value(value: number) {
		this.Root.setAttribute("value", value.toString());
	}

	public get ringClass(): string {
		return this.Root.getAttribute("ring-class") ?? "fxs-ring-meter__default-ring";
	}

	public set ringClass(value: string) {
		this.Root.setAttribute("ring-class", value);
	}

	constructor(root: ComponentRoot) {
		super(root);
	}

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	onAttach() {
		super.onAttach();
		this.startAnimation();
	}

	onDetach() {
		super.onDetach();
		this.stopAnimation();
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		switch (name) {
			case "ring-class":
				if (oldValue) {
					this.ring?.classList.remove(oldValue);
				}
				if (newValue) {
					this.ring?.classList.add(newValue);
				}
				break;

			/* Intentional Fallthrough */
			case "animation-duration":
			case "min-value":
			case "max-value":
			case "value":
				this.startAnimation();
				break;

			default:
				super.onAttributeChanged(name, oldValue, newValue);
				break;
		}
	}

	private render() {
		this.Root.classList.add("fxs-ring-meter");
		const content = document.createElement("div");
		content.classList.add("fxs-ring-meter__content");

		// This is setup to animate as follows:
		// - The ring is split into 2 halfs, left and right
		// - The mask shows only the ring for it's own half
		// - Each mask half starts on the opposite side, and thus the ring is not visible
		// - Thie mask half rotates clockwise while the right ring half rotates counter-clockwise 
		//     into the mask, making the ring become visible without apparent ring background rotation
		// - Once the left ring half is fully visible, the right ring half rotates, completing the circle
		this.leftRing = document.createElement('div');
		this.leftRing.classList.add("fxs-ring-meter__ring-left")

		this.leftMask = document.createElement("div");
		this.leftMask.classList.add("fxs-ring-meter__mask-left")
		this.leftMask.appendChild(this.leftRing);

		this.rightRing = document.createElement('div');
		this.rightRing.classList.add("fxs-ring-meter__ring-right")

		this.rightMask = document.createElement("div");
		this.rightMask.classList.add("fxs-ring-meter__mask-right")
		this.rightMask.appendChild(this.rightRing);

		this.ring = document.createElement("div");
		this.ring.classList.add("fxs-ring-meter__ring");
		this.ring.appendChild(this.leftMask);
		this.ring.appendChild(this.rightMask);

		this.Root.appendChild(this.ring);
		this.Root.appendChild(content);
	}

	private calculateRingFillPercentage() {
		const minValue = this.minValue;
		const maxValue = this.maxValue;

		if (maxValue - minValue <= 0) {
			this.ringFill = 0;
		}
		else {
			const value = Math.max(Math.min(maxValue, this.value), this.minValue);
			this.ringFill = (value - minValue) / (maxValue - minValue);
		}
	}

	private startAnimation() {
		if (this.isAnimating) {
			// If value changed while animating, set the animation start to current animated ring fill
			this.ringFillStart = this.ringFillEased;
		}

		this.animationTimeElapsed = 0;
		this.calculateRingFillPercentage();

		if (!this.isAnimating) {
			this.isAnimating = true;
			this.lastAnimationTime = 0;

			requestAnimationFrame((t) => this.startAnimationTimer(t));
			if (this.animationDuration > 0) {
				const fillSound = this.Root.getAttribute("data-audio-fill-sound");
				if (fillSound) {
					this.playSound(fillSound);
					this.Root.setAttribute("anim-sound-playing", "true");
				}
			}
		}
	}

	private stopAnimation() {
		if (this.isAnimating) {
			if (this.animationDuration > 0) {
				if (this.Root.hasAttribute("data-audio-fill-sound")) {
					const soundPlaying = this.Root.getAttribute("anim-sound-playing");
					if (soundPlaying == "true") {
						this.playSound("data-audio-ring-animate-stop");
						this.Root.setAttribute("anim-sound-playing", "false");
					}
				}
			}
		}
		this.isAnimating = false;
		this.ringFillStart = this.ringFill;
	}

	private startAnimationTimer(timeElapsed: number) {
		this.lastAnimationTime = timeElapsed;
		requestAnimationFrame((t) => this.animate(t));
	}

	private calculateEasedRingFill() {

		// Prevent the divide by 0.
		if (this.animationDuration == 0) {
			return 0;
		}

		const timeElapsed = Math.min(this.animationTimeElapsed, this.animationDuration);
		const cubicEaseFactor = Math.pow(1 - (timeElapsed / this.animationDuration), 3);
		return this.ringFill - (this.ringFill - this.ringFillStart) * cubicEaseFactor;
	}

	private animate(timeElapsed: number) {
		if (this.isAnimating) {
			const EPSILON = 0.0005;
			const timeDelta = timeElapsed - this.lastAnimationTime;
			this.animationTimeElapsed += timeDelta;

			this.ringFillEased = this.calculateEasedRingFill();

			if (this.ringFillEased <= EPSILON) {
				this.rightRing?.style.setProperty("opacity", "0");
				this.leftRing?.style.setProperty("opacity", "0");
			}
			else if (this.ringFillEased < .5) {
				const fillDegrees = 180 - (this.ringFillEased * 360);
				this.leftMask?.style.setProperty("transform", `rotate(-${fillDegrees}deg)`);
				this.leftRing?.style.setProperty("transform", `rotate(${fillDegrees}deg)`);
				this.rightRing?.style.setProperty("opacity", "0");
				this.leftRing?.style.setProperty("opacity", "1");
			} else {
				const fillDegrees = 180 - ((this.ringFillEased - 0.5) * 360);
				this.leftMask?.style.setProperty("transform", "rotate(0deg)");
				this.leftRing?.style.setProperty("transform", "rotate(0deg)");
				this.rightMask?.style.setProperty("transform", `rotate(-${fillDegrees}deg)`);
				this.rightRing?.style.setProperty("transform", `rotate(${fillDegrees}deg)`);
				this.rightRing?.style.setProperty("opacity", "1");
				this.leftRing?.style.setProperty("opacity", "1");
			}

			if (this.animationTimeElapsed >= this.animationDuration) {
				this.stopAnimation();
			} else {
				requestAnimationFrame((t) => this.animate(t));
			}
		}

		this.lastAnimationTime = timeElapsed;
	}
}

Controls.define('fxs-ring-meter', {
	createInstance: FxsRingMeter,
	description: 'A ring meter primitive',
	attributes: [
		{
			name: "max-value",
			description: "The maximum value of the ring meter (default 100)"
		},
		{
			name: "min-value",
			description: "The minimum value of the ring meter (default 0)"
		},
		{
			name: "value",
			description: "The current value of the ring meter (default 0)"
		},
		{
			name: "animation-duration",
			description: "The duration of the animation in millseconds (default 1500)"
		},
		{
			name: "ring-class",
			description: "A css class to add to the ring element"
		}
	],
	images: []
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-ring-meter': ComponentRoot<FxsRingMeter>
	}
}

export { FxsRingMeter as default }
// @ts-nocheck

class TestRadialDial extends Component {

	refStyle = "fs://game/core/ui/sandbox/radial-dial/test_radial-dial.css";

	private previousSelectListener: ArbitraryCallback = (status: InputActionStatuses) => { this.toggleRadial(status); };
	private moveCursorListener: EventListener = (event: CustomEvent) => { this.onActionMoveCursor(event); }
	private isRadialOpened: boolean = false;
	private currentFocus: HTMLElement | null = null;

	private radialContainer: HTMLElement | null = null;

	private radialIndicator: HTMLElement | null = null;

	private analogNavigationThreshold: number = .2;
	private stickDirection: number = 0;
	private stickLength: number = 0;

	private subItems: Element[] = [];

	private targetChangeCount = 0;
	private targetChangeMax = 1;

	private subItemAngles: any[] = [];

	private navRepeat: boolean = false;

	private topLeftAngle: number = 0;
	private botLeftAngle: number = 0;
	private topRightAngle: number = 0;
	private botRightAngle: number = 0;

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();

		engine.on('previous-select', this.previousSelectListener);
		window.addEventListener('action-move-cursor', this.moveCursorListener);

		this.subItems = Array.from(document.querySelectorAll('.test_subsystem-item'));
		this.radialContainer = document.getElementById("test_radial-container") as HTMLElement;
		this.radialIndicator = document.getElementById("test_radial-dot") as HTMLElement;
	}

	// given 3 points, finds the angle in radians
	private find_angle(p0: float2, p1: float2, c: float2): number {
		var p0c = Math.sqrt(Math.pow(c.x - p0.x, 2) +
			Math.pow(c.y - p0.y, 2)); // p0->c (b)   
		var p1c = Math.sqrt(Math.pow(c.x - p1.x, 2) +
			Math.pow(c.y - p1.y, 2)); // p1->c (a)
		var p0p1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) +
			Math.pow(p1.y - p0.y, 2)); // p0->p1 (c)
		return Math.acos((p1c * p1c + p0c * p0c - p0p1 * p0p1) / (2 * p1c * p0c));
	}

	// given an element, finds its relative angle to the center in degrees
	private findAngleFromCenter(targetItem: Element): number {
		let originPoint = {
			x: window.innerWidth * .5,
			y: window.innerHeight * .5
		}
		let targetRect = targetItem.getBoundingClientRect();
		let targetPoint = {
			x: targetRect.x + (targetRect.width * .5),
			y: targetRect.y + (targetRect.height * .5)
		}
		let centerPoint = {
			x: originPoint.x + originPoint.y,
			y: originPoint.y
		}
		let newAngle = (this.find_angle(centerPoint, targetPoint, originPoint)) * 180 / Math.PI;
		return newAngle * (targetPoint.y >= originPoint.y ? -1 : 1)
	}

	// given a point, finds its relative angle to the center in degrees
	private findPointAngleFromCenter(point1: float2): number {
		let originPoint = {
			x: window.innerWidth * .5,
			y: window.innerHeight * .5
		}
		let targetPoint = point1
		let centerPoint = {
			x: originPoint.x + originPoint.y,
			y: originPoint.y
		}
		let newAngle = (this.find_angle(centerPoint, targetPoint, originPoint)) * 180 / Math.PI;
		return newAngle * (targetPoint.y >= originPoint.y ? -1 : 1)
	}

	// compares 2 angles and normalizes the difference in a range of -180, 180
	private findAngleDifference(angle1: number, angle2: number): number {
		let diff = (((angle1 - angle2) + 180) % 360) - 180;
		if (diff < -180) {
			diff = diff + 360;
		}
		diff = Math.abs(diff);
		return diff
	}

	// given an angle, finds the closest valid item to that angle
	private findTarget(angle: number): HTMLElement | null {
		let diff: number = 180;
		let target: HTMLElement | null = null;
		for (let elem of this.subItemAngles) {
			let newDiff = this.findAngleDifference(elem.angle, angle);
			if (newDiff < diff) {
				diff = newDiff;
				target = elem.element as HTMLElement;
			}
		}
		return target
	}

	// moves forwards or backwards through the valid item index
	private moveThroughItemIndex(index: number, prev: boolean = false): HTMLElement {
		let targetIndex = prev ? index - 1 : index + 1;
		if (!prev && targetIndex == this.subItemAngles.length) {
			return this.subItemAngles[0].element
		}
		if (prev && targetIndex < 0) {
			return this.subItemAngles[this.subItemAngles.length - 1].element
		}
		return this.subItemAngles[targetIndex].element
	}

	// toggles the test radial menu on or off using the left bumper
	private toggleRadial(status: InputActionStatuses) {
		if (status == 1) {
			if (!this.isRadialOpened) {
				// finds the angles of each 4 corners from the center, and offsets
				this.topLeftAngle = this.findPointAngleFromCenter({ x: 0, y: 0 }) + 5;
				this.topRightAngle = this.findPointAngleFromCenter({ x: window.innerWidth, y: 0 }) - 5;
				this.botLeftAngle = this.findPointAngleFromCenter({ x: 0, y: window.innerHeight }) - 5;
				this.botRightAngle = this.findPointAngleFromCenter({ x: window.innerWidth, y: window.innerHeight }) + 5;

				this.isRadialOpened = true;

				if (this.radialContainer) {
					this.radialContainer.classList.add("radial-mode");
				}

				// finds the angle of each item, and adds it all to an array
				this.subItemAngles.splice(0, this.subItemAngles.length);
				this.subItems.forEach((_e, _index) => {
					let newAngle = this.findAngleFromCenter(_e);
					let elem = _e;
					this.subItemAngles.push({
						element: elem,
						angle: newAngle
					})
				})

				// sorts the array by the angle, from -180 to 180
				this.subItemAngles.sort((a, b) => (a.angle > b.angle) ? 1 : -1);
			}
			else {
				this.isRadialOpened = false;
				if (this.currentFocus) {
					this.currentFocus?.classList.remove('focused');
					this.currentFocus = null;
				}
				(document.activeElement as HTMLElement).blur();
				if (this.radialContainer) {
					this.radialContainer.classList.remove("radial-mode");
				}
			}
		}
	}

	private onActionMoveCursor(event: CustomEvent) {
		// get the stick direction and length
		this.stickDirection = (((Math.atan2(event.detail.y, event.detail.x) * 180 / Math.PI)));
		this.stickLength = Math.hypot(event.detail.x, event.detail.y);

		// update the indicator
		if (this.radialIndicator) {
			this.radialIndicator.style.transform = `translateX(${6 + (5 * event.detail.x)}rem) translateY(${6 - (5 * event.detail.y)}rem)`;
		}

		// if the radial isn't opened, or if the stick length isn't past the deadzone threshhold, reset the nav repeating and stop
		if (!this.isRadialOpened || this.stickLength < this.analogNavigationThreshold) {
			this.navRepeat = false;
			return
		}

		// if there currently isn't a focus, focus on whatever item is in the current direction to start out
		if (!this.currentFocus) {
			let newTarget = this.findTarget(this.stickDirection) as HTMLElement;

			if (newTarget) {
				this.currentFocus = newTarget;
				this.currentFocus.classList.add('focused');
			}
			return
		}

		// if we aren't yet repeating navigation movement, let the full movement happen, then set to -1 to create a delay before the repeat starts
		if (!this.navRepeat) {
			this.navRepeat = true;
			this.targetChangeCount = this.targetChangeMax;
			this.moveFocus();
			this.targetChangeCount = -1;
		}
		// if we are repeating, increase the change count and check if we should move focus
		else {
			this.targetChangeCount++;
			this.moveFocus();
		}
	}

	private moveFocus() {
		// if we can move/repeat, and we have an item that's focused
		if (this.targetChangeCount >= this.targetChangeMax && this.currentFocus) {
			this.targetChangeCount = 0;

			let navTarget: HTMLElement | null = null;
			let currentTargetIndex = this.subItemAngles.map(e => e.element).indexOf(this.currentFocus);
			let currentTargetAngle = this.subItemAngles[currentTargetIndex].angle;

			// if the currently focused item is on the left, ignore pressing leftward, and navigate on up/down
			if (currentTargetAngle <= this.botLeftAngle || currentTargetAngle >= this.topLeftAngle) {
				if (this.stickDirection <= -150 || this.stickDirection >= 150) {
					return
				}
				if (this.stickDirection > -150 && this.stickDirection < -30) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, false);
				}
				if (this.stickDirection > 30 && this.stickDirection < 150) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, true);
				}
			}

			// if the currently focused item is on the bottom, ignore pressing downward
			if (currentTargetAngle > this.botLeftAngle && currentTargetAngle < this.botRightAngle) {
				if (this.stickDirection > -120 && this.stickDirection < -60) {
					return
				}
				// check if it's an upward press
				if (this.stickDirection > 30 && this.stickDirection < 150) {
					// if it's up and to the left, move backwards
					if (currentTargetAngle <= -90) {
						navTarget = this.moveThroughItemIndex(currentTargetIndex, true);
					}
					// if it's up and to the right, move forwards
					else if (currentTargetAngle > -90) {
						navTarget = this.moveThroughItemIndex(currentTargetIndex, false);
					}
					// if the target is actually higher than the current one, focus on that, create a delay before navigation resumes
					if (navTarget && navTarget.getBoundingClientRect().y < this.currentFocus.getBoundingClientRect().y - 1) {
						this.targetChangeCount = -1;
						this.currentFocus.classList.remove('focused');
						this.currentFocus = navTarget;
						this.currentFocus.classList.add('focused');
						return
					}
					// if the target isn't valid, ignore this upward press and continue
					else {
						navTarget = null;
					}
				}
				// if pressing right, move fowards in the list
				if (this.stickDirection >= -60 && this.stickDirection <= 60) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, false);
				}
				// if pressing left, move backwards in the list
				if (this.stickDirection <= -120 || this.stickDirection >= 120) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, true);
				}
				// if we've pressed left or right, we want the nav target to be in-line with the bottom line, otherwise ignore this press
				if (navTarget) {
					let navTargetIndex = this.subItemAngles.map(e => e.element).indexOf(navTarget);
					let navTargetAngle = this.subItemAngles[navTargetIndex].angle;
					if (!(navTargetAngle > this.botLeftAngle && navTargetAngle < this.botRightAngle)) {
						return
					}
				}
			}

			// if the currently focused item is on the right, ignore presses rightward, and navigation up/down
			if (currentTargetAngle >= this.botRightAngle && currentTargetAngle <= this.topRightAngle) {
				if (this.stickDirection >= -30 && this.stickDirection <= 30) {
					return
				}
				if (this.stickDirection > -150 && this.stickDirection < -30) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, true);
				}
				if (this.stickDirection > 30 && this.stickDirection < 150) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, false);
				}
			}

			// if the currently focused item is on the top, ignore presses upwards
			if (currentTargetAngle > this.topRightAngle && currentTargetAngle < this.topLeftAngle) {
				if (this.stickDirection > 60 && this.stickDirection < 120) {
					return
				}
				// if the press is downwards
				if (this.stickDirection > -150 && this.stickDirection < -30) {
					// item is on the top left
					if (currentTargetAngle >= 90) {
						navTarget = this.moveThroughItemIndex(currentTargetIndex, false);
					}
					// item is on the top right
					else if (currentTargetAngle < 90) {
						navTarget = this.moveThroughItemIndex(currentTargetIndex, true);
					}
					// if the new target is below the current target, focus on that and create a delay before nav repeating resumes
					if (navTarget && navTarget.getBoundingClientRect().y > this.currentFocus.getBoundingClientRect().y + 1) {
						this.targetChangeCount = -1;
						this.currentFocus.classList.remove('focused');
						this.currentFocus = navTarget;
						this.currentFocus.classList.add('focused');
						return
					}
					// target wasn't actually below current target, ignore and continue
					else {
						navTarget = null;
					}
				}
				// pressing right, move backwards through list
				if (this.stickDirection >= -60 && this.stickDirection <= 60) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, true);
				}
				// pressing left, move forward through list
				if (this.stickDirection <= -120 || this.stickDirection >= 120) {
					navTarget = this.moveThroughItemIndex(currentTargetIndex, false);
				}
				// if the target isn't actually in the same part of the UI, ignore this press
				if (navTarget) {
					let navTargetIndex = this.subItemAngles.map(e => e.element).indexOf(navTarget);
					let navTargetAngle = this.subItemAngles[navTargetIndex].angle;
					if (!(navTargetAngle > this.topRightAngle && navTargetAngle < this.topLeftAngle)) {
						return
					}
				}
			}

			// if we have a target, focus in
			if (navTarget != null) {
				this.currentFocus.classList.remove('focused');
				this.currentFocus = navTarget;
				this.currentFocus.classList.add('focused');
				return
			}

			// if we still don't have a target, grab whatever item the stick is pointing at and focus on that
			navTarget = this.findTarget(this.stickDirection) as HTMLElement;

			if (navTarget) {
				this.currentFocus.classList.remove('focused');
				this.currentFocus = navTarget;
				this.currentFocus.classList.add('focused');
			}
			return
		}
	}
}

export { TestRadialDial as default };

Controls.define('test-radial-dial', {
	createInstance: TestRadialDial,
	description: '[TEST] Radial dial allowing the player to quickly select multiple options.',
	styles: ["fs://game/core/ui/sandbox/radial-dial/test_radial-dial.css"],
	attributes: []
});
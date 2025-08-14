// // import '/core/ui/sandbox/radial-dial/spatial_navigation.js'

// let previousSelectListener:ArbitraryCallback = (status: InputActionStatuses) => { test_toggleRadial(status); };
// let moveCursorListener:EventListener = (event: CustomEvent) => { test_onActionMoveCursor(event); }
// let test_radialOpened: boolean = false;
// let test_currentPendingFocus: HTMLElement | null;
// let test_currentFocus: HTMLElement | null;
// let test_focusCounter: number = 0;
// let test_focusCounterMax: number = 4;
// let test_directNavActivated: boolean = false;
// let test_analogNavigationThreshold: number = .2;
// let test_navMode: string = "H";

// let stickDirection: number = 0;
// let stickLength: number = 0;

// let test_subsystems_1 = document.getElementById("test_subsystems_1") as HTMLElement;
// let test_subsystems_2 = document.getElementById("test_subsystems_2") as HTMLElement;
// let test_subsystems_3 = document.getElementById("test_subsystems_3") as HTMLElement;
// let test_subsystems_4 = document.getElementById("test_subsystems_4") as HTMLElement;
// let test_subsystems_5 = document.getElementById("test_subsystems_5") as HTMLElement;
// let test_subsystems_6 = document.getElementById("test_subsystems_6") as HTMLElement;

// let test_radialContainer = document.getElementById("test_radial-container") as HTMLElement;

// let test_radialIndicator = document.getElementById("test_radial-dot") as HTMLElement;

// let SpatialNavigation = (window as any).SpatialNavigation;

// const test_subsystemContainers: Element[] = Array.from(document.querySelectorAll('.test_subsystem-container'));

// const test_subItems: Element[] = Array.from(document.querySelectorAll('.test_subsystem-item'));

// let navTimeout: number = 0;

// let test_targetChangeCount = 0;
// let test_targetChangeMax = 1;

// let test_subItemAngles: any[] = [];

// let test_navStart: boolean = false;

// let test_topLeftAngle: number = 0;
// let test_botLeftAngle: number = 0;
// let test_topRightAngle: number = 0;
// let test_botRightAngle: number = 0;

// engine.on('previous-select', previousSelectListener);
// window.addEventListener('action-move-cursor', moveCursorListener);

// // init: just has a _ready = true that we need
// SpatialNavigation.init();

// // add: takes a section name and config object (including selector), adds a property to _sections with key of section name, increments _sectionCount, and passes sectionID and config to 'set'
// // set: takes the config given and compares it to global config, and if there isn't a section name applies it to global, otherwise adds it as a property of the sectionID object within _sections, then passes this to 'extend'
// // extend: checks each property to make sure it's not inherited, then finally assigns it as a property of _sections[sectionID]
// SpatialNavigation.add(
// 	{
// 		selector: '.test_subsystem-item'
// 	}
// );

// // makeFocusable: grabs the section (or global) ignore list of a section or everything (if no sectionID given), then runs parseSelector
// // parseSelector: if given a string, runs 'document.querySelectorAll(selector)' and returns array; if array of objects, returns the object, and if a single object, returns that object as the sole member of an array
// // makeFocusable: then it matches it against the ignore list, and finally any that remain are given a tabindex of -1 if it doesn't already have it
// SpatialNavigation.makeFocusable();

// test_subsystemContainers.forEach((_e, _index) => {
// 	// const subItems: HTMLElement[] = Array.from(_e.querySelectorAll<HTMLElement>('.test_subsystem-item'));
// 	// let navOrientation: string = window.getComputedStyle(_e).flexDirection;
// 	// subItems.forEach((_sub, _i) => {
// 	// 	if (_i == 0 || _i == subItems.length - 1) {
// 	// 		let targetDirection: string = 'data-sn-left';
// 	// 		switch (true) {
// 	// 			case (_i == 0 && navOrientation == "row"):
// 	// 				targetDirection = 'data-sn-left';
// 	// 				break;
// 	// 			case (_i == subItems.length - 1 && navOrientation == "row"):
// 	// 				targetDirection = 'data-sn-right';
// 	// 				break;
// 	// 			case (_i == 0 && navOrientation == "column"):
// 	// 				targetDirection = 'data-sn-up';
// 	// 				break;
// 	// 			case (_i == subItems.length - 1 && navOrientation == "column"):
// 	// 				targetDirection = 'data-sn-down';
// 	// 				break;
// 	// 		}
// 	// 		_sub.setAttribute(targetDirection, "");
// 	// 		_sub.addEventListener("focus", () => {
// 	// 			clearTimeout(navTimeout);
// 	// 			navTimeout = setTimeout(() => {
// 	// 				_sub.removeAttribute(targetDirection);
// 	// 			}, 125);
// 	// 		});
// 	// 		_sub.addEventListener("blur", () => {
// 	// 			clearTimeout(navTimeout);
// 	// 			_sub.setAttribute(targetDirection, "");
// 	// 		});
// 	// 	}
// 	// });
// 	_e.addEventListener("focusin", () => {
// 		_e.classList.add("hud-select");
// 		let navOrientation: string = window.getComputedStyle(_e).flexDirection;
// 		if (navOrientation == "row") {
// 			test_navMode = "H";
// 		}
// 		if (navOrientation == "column") {
// 			test_navMode = "V";
// 		}
// 	})
// 	_e.addEventListener("focusout", () => {
// 		_e.classList.remove("hud-select");
// 	})
// })

// function find_angle(p0: float2, p1: float2, c: float2): number {
// 	var p0c = Math.sqrt(Math.pow(c.x - p0.x, 2) +
// 		Math.pow(c.y - p0.y, 2)); // p0->c (b)
// 	var p1c = Math.sqrt(Math.pow(c.x - p1.x, 2) +
// 		Math.pow(c.y - p1.y, 2)); // p1->c (a)
// 	var p0p1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) +
// 		Math.pow(p1.y - p0.y, 2)); // p0->p1 (c)
// 	return Math.acos((p1c * p1c + p0c * p0c - p0p1 * p0p1) / (2 * p1c * p0c));
// }

// function test_findItemAngle(originItem: HTMLElement, targetItem: HTMLElement) {
// 	let originRect = originItem.getBoundingClientRect();
// 	let originPoint = {
// 		x: originRect.x + (originRect.width * .5),
// 		y: originRect.y + (originRect.height * .5)
// 	}
// 	let targetRect = targetItem.getBoundingClientRect();
// 	let targetPoint = {
// 		x: targetRect.x + (targetRect.width * .5),
// 		y: targetRect.y + (targetRect.height * .5)
// 	}
// 	let centerPoint = {
// 		x: window.innerWidth,
// 		y: originPoint.y
// 	}
// 	let newAngle = (find_angle(centerPoint, targetPoint, originPoint)) * 180 / Math.PI;
// }

// function test_findAngleFromCenter(targetItem: Element): number {
// 	let originPoint = {
// 		x: window.innerWidth * .5,
// 		y: window.innerHeight * .5
// 	}
// 	let targetRect = targetItem.getBoundingClientRect();
// 	let targetPoint = {
// 		x: targetRect.x + (targetRect.width * .5),
// 		y: targetRect.y + (targetRect.height * .5)
// 	}
// 	let centerPoint = {
// 		x: originPoint.x + originPoint.y,
// 		y: originPoint.y
// 	}
// 	let newAngle = (find_angle(centerPoint, targetPoint, originPoint)) * 180 / Math.PI;
// 	return newAngle * (targetPoint.y >= originPoint.y ? -1 : 1)
// }

// function test_findPointAngleFromCenter(point1: float2): number {
// 	let originPoint = {
// 		x: window.innerWidth * .5,
// 		y: window.innerHeight * .5
// 	}
// 	let targetPoint = point1
// 	let centerPoint = {
// 		x: originPoint.x + originPoint.y,
// 		y: originPoint.y
// 	}
// 	let newAngle = (find_angle(centerPoint, targetPoint, originPoint)) * 180 / Math.PI;
// 	return newAngle * (targetPoint.y >= originPoint.y ? -1 : 1)
// }

// function test_findAngleDifference(angle1: number, angle2: number): number {
// 	let diff = (((angle1 - angle2) + 180) % 360) - 180;
// 	if (diff < -180) {
// 		diff = diff + 360;
// 	}
// 	diff = Math.abs(diff);
// 	return diff
// }

// function test_findTarget(angle: number): HTMLElement | null {
// 	let diff: number = 180;
// 	let target: HTMLElement | null = null;
// 	for (let elem of test_subItemAngles) {
// 		let newDiff = test_findAngleDifference(elem.angle, angle);
// 		if (newDiff < diff) {
// 			diff = newDiff;
// 			target = elem.element as HTMLElement;
// 		}
// 	}
// 	return target
// }

// function test_moveThroughItemIndex(index: number, prev: boolean = false): HTMLElement {
// 	let targetIndex = prev ? index - 1 : index + 1;
// 	if (!prev && targetIndex == test_subItemAngles.length) {
// 		return test_subItemAngles[0].element
// 	}
// 	if (prev && targetIndex < 0) {
// 		return test_subItemAngles[test_subItemAngles.length - 1].element
// 	}
// 	return test_subItemAngles[targetIndex].element
// }

// function test_toggleRadial(status: InputActionStatuses) {
// 	if (status == 1) {
// 		if (!test_radialOpened) {
// 			test_topLeftAngle = test_findPointAngleFromCenter({ x: 0, y: 0 }) + 5;
// 			test_topRightAngle = test_findPointAngleFromCenter({ x: window.innerWidth, y: 0 }) - 5;
// 			test_botLeftAngle = test_findPointAngleFromCenter({ x: 0, y: window.innerHeight }) - 5;
// 			test_botRightAngle = test_findPointAngleFromCenter({ x: window.innerWidth, y: window.innerHeight }) + 5;

// 			console.error(`${test_topLeftAngle} ${test_topRightAngle} ${test_botLeftAngle} ${test_botRightAngle}`);
// 			test_radialOpened = true;
// 			SpatialNavigation.resume();
// 			console.error('RADIAL OPENED');
// 			if (test_radialContainer) {
// 				test_radialContainer.classList.add("radial-mode");
// 			}
// 			test_subItemAngles.splice(0, test_subItemAngles.length);
// 			test_subItems.forEach((_e, _index) => {
// 				let newAngle = test_findAngleFromCenter(_e);
// 				let elem = _e;
// 				test_subItemAngles.push({
// 					element: elem,
// 					angle: newAngle
// 				})
// 			})
// 			test_subItemAngles.sort((a, b) => (a.angle > b.angle) ? 1 : -1);
// 		}
// 		else {
// 			test_radialOpened = false;
// 			test_clearSubItemFocus();
// 			test_clearFocus();
// 			test_currentFocus = null;
// 			test_currentPendingFocus = null;
// 			test_focusCounter = 0;
// 			SpatialNavigation.pause();
// 			(document.activeElement as HTMLElement).blur();
// 			console.error('RADIAL CLOSED')
// 			if (test_radialContainer) {
// 				test_radialContainer.classList.remove("radial-mode");
// 			}
// 		}
// 	}
// }

// function test_onActionMoveCursor(event: CustomEvent) {
// 	let newStickDirection = (((Math.atan2(event.detail.y, event.detail.x) * 180 / Math.PI)));
// 	stickLength = Math.hypot(event.detail.x, event.detail.y);

// 	test_radialIndicator.style.transform = `translateX(${6 + (5 * event.detail.x)}rem) translateY(${6 - (5 * event.detail.y)}rem)`;

// 	if (!test_radialOpened || stickLength < test_analogNavigationThreshold) {
// 		test_navStart = false;
// 		return
// 	}
// 	console.error(newStickDirection);

// 	// let newTarget = test_findTarget(newStickDirection) as HTMLElement;

// 	// if (newTarget) {
// 	// 	if (!test_currentFocus) {
// 	// 		test_currentFocus = newTarget;
// 	// 		SpatialNavigation.focus(test_currentFocus);
// 	// 	}

// 	// 	else {

// 	// 	}

// 	// else {
// 	// 	let currentTargetIndex = test_subItemAngles.map(e => e.element).indexOf(test_currentFocus);
// 	// 	let newTargetIndex = test_subItemAngles.map(e => e.element).indexOf(newTarget);
// 	// 	let currentTargetAngle = test_subItemAngles[currentTargetIndex].angle;
// 	// 	let newTargetAngle = test_subItemAngles[newTargetIndex].angle;
// 	// 	let targetDiff = test_findAngleDifference(currentTargetAngle, newTargetAngle);
// 	// 	let directionDiff = test_findAngleDifference(stickDirection, newStickDirection);

// 	// 	if (targetDiff > 45) {
// 	// 		test_targetChangeCount = 0;
// 	// 		test_currentFocus = newTarget;
// 	// 		SpatialNavigation.focus(test_currentFocus);
// 	// 	}
// 	// 	else {
// 	// 		if (targetDiff < 5 && directionDiff > 5) {
// 	// 			test_targetChangeCount = test_targetChangeCount + .25;
// 	// 		}
// 	// 		else {
// 	// 			test_targetChangeCount++;
// 	// 		}
// 	// 		if (test_targetChangeCount >= test_targetChangeMax) {
// 	// 			test_targetChangeCount = 0;
// 	// 			if (newTargetIndex > currentTargetIndex) {
// 	// 				if (newTargetAngle > 135 && currentTargetAngle < -135) {
// 	// 					test_currentFocus = test_moveThroughItemIndex(currentTargetIndex, true);
// 	// 				}
// 	// 				else {
// 	// 					test_currentFocus = test_moveThroughItemIndex(currentTargetIndex, false);
// 	// 				}
// 	// 			}
// 	// 			else if (newTargetIndex < currentTargetIndex) {
// 	// 				if (currentTargetAngle > 135 && newTargetAngle < -135) {
// 	// 					test_currentFocus = test_moveThroughItemIndex(currentTargetIndex, false);
// 	// 				}
// 	// 				else {
// 	// 					test_currentFocus = test_moveThroughItemIndex(currentTargetIndex, true);
// 	// 				}
// 	// 			}
// 	// 			SpatialNavigation.focus(test_currentFocus);
// 	// 		}
// 	// 	}

// 	// }

// 	// }

// 	stickDirection = newStickDirection;

// 	if (!test_currentFocus) {
// 		let newTarget = test_findTarget(stickDirection) as HTMLElement;

// 		if (newTarget) {
// 			test_currentFocus = newTarget;
// 			SpatialNavigation.focus(test_currentFocus);
// 		}
// 		return
// 	}

// 	if (!test_navStart) {
// 		test_navStart = true;
// 		test_targetChangeCount = test_targetChangeMax;
// 		test_moveFocus();
// 		test_targetChangeCount = -1;
// 	}
// 	else {
// 		test_targetChangeCount++;
// 		test_moveFocus();
// 	}


// 	// move: takes direction as string, optional selector as target, makes direction lowercase, then if direction is a key of REVERSE continues
// 	// gets an elem based on selector, or if no selector the current focused element (otherwise returns false)
// 	// takes that elem and gets its sectionID (if sectionID isn't disabled and elem is a valid selector of that section, returns the id)
// 	// if it can fire the custom "willmove" event it does so and continues to 'focusNext'

// 	// focusNext: grabs the current focused element and gets the custom attribute associated with the desired move direction (if set to '', fires a failed navigate event)
// 	// sets up an object (all navigable elements in the section) and array (all possible navigable elements), then runs 'getSectionNavigableElements' using the sectionID

// 	// getSectionNavigableElements: parses all the elements in the section, then checks if they're disabled or have a width/height of 0 and otherwise unselectable

// 	// focusNext: then it adds the section's navigable elements to the array of all navigable elements, then if self-first or self-only is set, try to navigate to those using 'navigate'

// 	// navigate: for all candidates, runs the core function 'getRect':

// 	// getRect: returns an object, rect, that has the getBoundingClientRect() of element, and finds the center and returns those coordinates as well

// 	// navigate: gets the rect of the current target, then sends that to 'generateDistanceFunction':

// 	// generateDistanceFunction: generates functions based on the target's rect attributes for calculating comparisons with candidate rect attributes

// 	// navigate: returns 2 sets of data that I have no clue what they are, comparing rects and target rects and then a specific group of those rects with the target rect.center attributes
// 	// then, based on the direction, does a number of comparisons to get groups of valid candidates in that direction
// 	// then uses a prioritize function to sort each group to find the most likely candidate

// 	// if (test_directNavActivated) {
// 	// 	if (test_currentFocus) {
// 	// 		let navDirection: string = '';
// 	// 		let navOrientation: string = window.getComputedStyle(test_currentFocus).flexDirection;
// 	// 		console.error(navOrientation);
// 	// 		if (navOrientation == "row") {
// 	// 			test_navMode = "H";
// 	// 		}
// 	// 		if (navOrientation == "column") {
// 	// 			test_navMode = "V";
// 	// 		}
// 	// 		if (test_navMode == "V" || test_navMode == "H") {
// 	// 			navDirection = test_tryAnalogNavigation(stickDirection, stickLength);
// 	// 			console.error(`${test_navMode} ${navDirection}`);
// 	// 			switch (navDirection) {
// 	// 				case "none":
// 	// 					break;
// 	// 				case "up":
// 	// 					test_focusSubItem(true);
// 	// 					return
// 	// 				case "down":
// 	// 					test_focusSubItem();
// 	// 					return
// 	// 				case "left":
// 	// 					test_focusSubItem(true);
// 	// 					return
// 	// 				case "right":
// 	// 					test_focusSubItem();
// 	// 					return
// 	// 			}
// 	// 		}
// 	// 	}
// 	// }
// 	// test_angleCursor(stickDirection, stickLength);
// }

// function test_moveFocus3() {
// 	if (test_targetChangeCount >= test_targetChangeMax) {
// 		test_targetChangeCount = 0;
// 		if (test_navMode == "V") {
// 			if (stickDirection > -150 && stickDirection < -30) {
// 				SpatialNavigation.move('down');
// 			}
// 			if (stickDirection >= -45 && stickDirection <= 45) {
// 				SpatialNavigation.move('right');
// 			}
// 			if (stickDirection > 30 && stickDirection < 150) {
// 				SpatialNavigation.move('up');
// 			}
// 			if (stickDirection <= -135 || stickDirection >= 135) {
// 				SpatialNavigation.move('left');
// 			}
// 		}

// 		if (test_navMode == "H") {
// 			if (stickDirection > -135 && stickDirection < -45) {
// 				SpatialNavigation.move('down');
// 			}
// 			if (stickDirection >= -60 && stickDirection <= 60) {
// 				SpatialNavigation.move('right');
// 			}
// 			if (stickDirection > 45 && stickDirection < 135) {
// 				SpatialNavigation.move('up');
// 			}
// 			if (stickDirection <= -120 || stickDirection >= 120) {
// 				SpatialNavigation.move('left');
// 			}
// 		}
// 	}
// }

// function test_moveFocus2() {
// 	if (test_targetChangeCount >= test_targetChangeMax) {
// 		test_targetChangeCount = 0;

// 		let currentTargetIndex = test_subItemAngles.map(e => e.element).indexOf(test_currentFocus);
// 		let currentTargetAngle = test_subItemAngles[currentTargetIndex].angle;

// 		if (test_navMode == "V") {
// 			let navTarget: HTMLElement | null = null;
// 			let isLeft: boolean = (currentTargetAngle >= 90 || currentTargetAngle <= -90);

// 			if (isLeft) {
// 				if (stickDirection <= -165 || stickDirection >= 165) {
// 					test_targetChangeCount = -1;
// 					return
// 				}
// 				if (stickDirection >= -180 && stickDirection <= -75) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 				}
// 				if (stickDirection <= 180 && stickDirection >= 75) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 				}
// 			}
// 			else {
// 				if (stickDirection >= -15 && stickDirection <= 15) {
// 					test_targetChangeCount = -1;
// 					return
// 				}
// 				if (stickDirection >= -105 && stickDirection < 0) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 				}
// 				if (stickDirection >= 0 && stickDirection <= 105) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 				}
// 			}
// 			if (navTarget != null) {
// 				test_currentFocus = navTarget;
// 				SpatialNavigation.focus(test_currentFocus);
// 				return
// 			}
// 		}

// 		if (test_navMode == "H") {
// 			let navTarget: HTMLElement | null = null;
// 			let isTop: boolean = (currentTargetAngle >= 0);


// 			if (isTop) {
// 				if (stickDirection > 75 && stickDirection < 105) {
// 					test_targetChangeCount = -1;
// 					return
// 				}
// 				if (stickDirection >= 90 && stickDirection <= 180) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 				}
// 				if (stickDirection >= -180 && stickDirection <= -165) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 				}
// 				if (stickDirection >= -15 && stickDirection < 90) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 				}
// 			}
// 			else {
// 				if (stickDirection > -105 && stickDirection < -75) {
// 					test_targetChangeCount = -1;
// 					return
// 				}
// 				if (stickDirection <= -90 && stickDirection >= -180) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 				}
// 				if (stickDirection >= 165) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 				}
// 				if (stickDirection > -90 && stickDirection <= 15) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 				}
// 			}
// 			if (navTarget != null) {
// 				test_currentFocus = navTarget;
// 				SpatialNavigation.focus(test_currentFocus);
// 				return
// 			}
// 		}

// 		let newTarget = test_findTarget(stickDirection) as HTMLElement;

// 		if (newTarget) {
// 			test_currentFocus = newTarget;
// 			SpatialNavigation.focus(test_currentFocus);
// 		}
// 		return
// 	}
// }

// function test_moveFocus() {
// 	if (test_targetChangeCount >= test_targetChangeMax && test_currentFocus) {
// 		test_targetChangeCount = 0;

// 		let navTarget: HTMLElement | null = null;
// 		let currentTargetIndex = test_subItemAngles.map(e => e.element).indexOf(test_currentFocus);
// 		let currentTargetAngle = test_subItemAngles[currentTargetIndex].angle;
// 		console.error(`current target angle: ${currentTargetAngle}`);

// 		if (currentTargetAngle <= test_botLeftAngle || currentTargetAngle >= test_topLeftAngle) {
// 			if (stickDirection <= -150 || stickDirection >= 150) {
// 				return
// 			}
// 			if (stickDirection > -150 && stickDirection < -30) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 			}
// 			if (stickDirection > 30 && stickDirection < 150) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 			}
// 		}
// 		if (currentTargetAngle > test_botLeftAngle && currentTargetAngle < test_botRightAngle) {
// 			if (stickDirection > -120 && stickDirection < -60) {
// 				return
// 			}
// 			if (stickDirection > 30 && stickDirection < 150) {
// 				if (currentTargetAngle <= -90) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 				}
// 				else if (currentTargetAngle > -90) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 				}
// 				if (navTarget && navTarget.getBoundingClientRect().y < test_currentFocus.getBoundingClientRect().y - 1) {
// 					test_targetChangeCount = -1;
// 					test_currentFocus = navTarget;
// 					SpatialNavigation.focus(test_currentFocus);
// 					return
// 				}
// 				else {
// 					navTarget = null;
// 				}
// 			}
// 			if (stickDirection >= -60 && stickDirection <= 60) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 			}
// 			if (stickDirection <= -120 || stickDirection >= 120) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 			}
// 			if (navTarget) {
// 				let navTargetIndex = test_subItemAngles.map(e => e.element).indexOf(navTarget);
// 				let navTargetAngle = test_subItemAngles[navTargetIndex].angle;
// 				if (!(navTargetAngle > test_botLeftAngle && navTargetAngle < test_botRightAngle)) {
// 					return
// 				}
// 			}
// 		}
// 		if (currentTargetAngle >= test_botRightAngle && currentTargetAngle <= test_topRightAngle) {
// 			if (stickDirection >= -30 && stickDirection <= 30) {
// 				return
// 			}
// 			if (stickDirection > -150 && stickDirection < -30) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 			}
// 			if (stickDirection > 30 && stickDirection < 150) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 			}
// 		}
// 		if (currentTargetAngle > test_topRightAngle && currentTargetAngle < test_topLeftAngle) {
// 			if (stickDirection > 60 && stickDirection < 120) {
// 				return
// 			}
// 			if (stickDirection > -150 && stickDirection < -30) {
// 				if (currentTargetAngle >= 90) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 				}
// 				else if (currentTargetAngle < 90) {
// 					navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 				}
// 				if (navTarget && navTarget.getBoundingClientRect().y > test_currentFocus.getBoundingClientRect().y + 1) {
// 					test_targetChangeCount = -1;
// 					test_currentFocus = navTarget;
// 					SpatialNavigation.focus(test_currentFocus);
// 					return
// 				}
// 				else {
// 					navTarget = null;
// 				}
// 			}
// 			if (stickDirection >= -60 && stickDirection <= 60) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, true);
// 			}
// 			if (stickDirection <= -120 || stickDirection >= 120) {
// 				navTarget = test_moveThroughItemIndex(currentTargetIndex, false);
// 			}
// 			if (navTarget) {
// 				let navTargetIndex = test_subItemAngles.map(e => e.element).indexOf(navTarget);
// 				let navTargetAngle = test_subItemAngles[navTargetIndex].angle;
// 				if (!(navTargetAngle > test_topRightAngle && navTargetAngle < test_topLeftAngle)) {
// 					return
// 				}
// 			}
// 		}
// 		if (navTarget != null) {
// 			test_currentFocus = navTarget;
// 			SpatialNavigation.focus(test_currentFocus);
// 			return
// 		}

// 		let newTarget = test_findTarget(stickDirection) as HTMLElement;

// 		if (newTarget) {
// 			test_currentFocus = newTarget;
// 			SpatialNavigation.focus(test_currentFocus);
// 		}
// 		return
// 	}
// }

// // if (stickDirection >= -60 && stickDirection <= 60) {
// // 	SpatialNavigation.move('right');
// // }
// // if (stickDirection > 45 && stickDirection < 135) {
// // 	SpatialNavigation.move('up');
// // }
// // if (stickDirection <= -120 || stickDirection >= 120) {
// // 	SpatialNavigation.move('left');
// // }

// function test_angleCursor(stickDirection: number, stickLength: number) {
// 	if (test_currentFocus) {
// 		switch (test_currentFocus) {
// 			case test_subsystems_1:
// 				switch (true) {
// 					case (stickDirection <= 150 && stickDirection >= 112.5):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_5, true, true);
// 						break;
// 					case (stickDirection < 112.5 && stickDirection >= 75):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_3, true, true);
// 						break;
// 					case (stickDirection < 75 && stickDirection > 67.5):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_4, true, false);
// 						break;
// 					case (stickDirection <= 67.5 && stickDirection >= 30):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_6, true, true);
// 						break;
// 				}
// 				break;
// 			case test_subsystems_2:
// 				switch (true) {
// 					case (stickDirection <= 150 && stickDirection >= 112.5):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_5, true, true);
// 						break;
// 					case (stickDirection < 112.5 && stickDirection > 105):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_3, true, true);
// 						break;
// 					case (stickDirection <= 105 && stickDirection > 67.5):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_4, true, false);
// 						break;
// 					case (stickDirection <= 67.5 && stickDirection >= 30):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_6, true, true);
// 						break;
// 				}
// 				break;
// 			case test_subsystems_3:
// 				switch (true) {
// 					case (stickDirection >= -150 && stickDirection < -90):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_5, true, false);
// 						break;
// 					case (stickDirection >= -90 && stickDirection < -60):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_1, true, false);
// 						break;
// 					case (stickDirection >= -60 && stickDirection < -45):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_2, true, false);
// 						break;
// 					case (stickDirection >= -45 && stickDirection <= -30):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_6, true, false);
// 						break;
// 				}
// 				break;
// 			case test_subsystems_4:
// 				switch (true) {
// 					case (stickDirection >= -150 && stickDirection < -135):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_5, true, false);
// 						break;
// 					case (stickDirection >= -135 && stickDirection < -120):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_1, true, true);
// 						break;
// 					case (stickDirection >= -120 && stickDirection < -90):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_2, true, true);
// 						break;
// 					case (stickDirection >= -90 && stickDirection <= -30):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_6, true, false);
// 						break;
// 				}
// 				break;
// 			case test_subsystems_5:
// 				switch (true) {
// 					case (stickDirection >= -30 && stickDirection <= 30):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_6, true, false);
// 						break;
// 					case (stickDirection > 30 && stickDirection < 45):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_4, true, false);
// 						break;
// 					case (stickDirection >= 45 && stickDirection < 60):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_3, true, false);
// 						break;
// 					case (stickDirection < -30 && stickDirection > -45):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_2, true, false);
// 						break;
// 					case (stickDirection <= -45 && stickDirection > -60):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_1, true, false);
// 						break;
// 				}
// 				break;
// 			case test_subsystems_6:
// 				switch (true) {
// 					case (stickDirection <= -150 || stickDirection >= 150):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_5, true, false);
// 						break;
// 					case (stickDirection < 150 && stickDirection > 135):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_3, true, true);
// 						break;
// 					case (stickDirection <= 135 && stickDirection > 120):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_4, true, true);
// 						break;
// 					case (stickDirection > -150 && stickDirection < -135):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_1, true, true);
// 						break;
// 					case (stickDirection >= -135 && stickDirection < -120):
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_2, true, true);
// 						break;
// 				}
// 				break;
// 		}

// 	}
// 	else {
// 		switch (true) {
// 			case (stickDirection > 90 && stickDirection <= 135):
// 				if (!test_directNavActivated) {
// 					test_focusTarget(test_subsystems_3, true);
// 				}
// 				break;
// 			case (stickDirection <= 90 && stickDirection >= 45):
// 				if (!test_directNavActivated) {
// 					test_focusTarget(test_subsystems_4, true);
// 				}
// 				break;
// 			case (stickDirection <= -90 && stickDirection >= -135):
// 				if (!test_directNavActivated) {
// 					test_focusTarget(test_subsystems_1, true);
// 				}
// 				break;
// 			case (stickDirection > -90 && stickDirection <= -45):
// 				if (!test_directNavActivated) {
// 					test_focusTarget(test_subsystems_2, true);
// 				}
// 				break;
// 			case (stickDirection < -135 || stickDirection > 135):
// 				if (!test_directNavActivated) {
// 					test_focusTarget(test_subsystems_5, true);
// 				}
// 				break;
// 			case (stickDirection > -45 || stickDirection < 45):
// 				if (!test_directNavActivated) {
// 					test_focusTarget(test_subsystems_6, true);
// 				}
// 				break;
// 		}
// 	}
// }

// function test_focusTarget(target: HTMLElement | null, force: boolean = false, last: boolean = false) {
// 	if (test_currentPendingFocus != target) {
// 		test_focusCounter = force ? test_focusCounterMax - 1 : 0;
// 		test_clearSubItemFocus();
// 		if (test_currentPendingFocus && test_currentPendingFocus != test_currentFocus) {
// 			test_currentPendingFocus.classList.remove('hud-select');
// 		}
// 		if (target) {
// 			target.classList.add('hud-select');
// 		}
// 		test_currentPendingFocus = target;
// 	}
// 	if (test_currentPendingFocus && !test_directNavActivated) {
// 		test_focusCounter++;
// 		if (test_focusCounter == test_focusCounterMax) {
// 			test_toggleDirectNav(last);
// 		}
// 		const progressMeter: HTMLElement | null = test_currentPendingFocus.querySelector<HTMLElement>('.test_progress-bar-meter');
// 		if (progressMeter) {
// 			progressMeter.style.width = `${(test_focusCounter / test_focusCounterMax) * 100}%`;
// 		}
// 	}
// }

// function test_toggleDirectNav(last: boolean = false) {
// 	if (test_currentFocus) {
// 		test_currentFocus.classList.remove("hud-select");
// 	}
// 	test_currentFocus = test_currentPendingFocus;
// 	test_directNavActivated = true;
// 	test_focusSubItem(false, last);
// 	window.addEventListener('action-navigate', (event: CustomEvent) => { console.error(`NAVIGATE: ${JSON.stringify(event.detail)}`); });
// }

// function test_focusSubItem(prev: boolean = false, last: boolean = false) {

// 	const currentSub: Element | null = test_currentFocus?.querySelector('.focused');
// 	if (currentSub) {
// 		if (prev) {
// 			if (currentSub.previousElementSibling && currentSub.previousElementSibling.hasAttribute("tabindex")) {
// 				// currentSub.classList.remove("focused");
// 				// currentSub.previousElementSibling.classList.add("focused");
// 			}
// 			else {
// 				switch (test_currentFocus) {
// 					case test_subsystems_1:
// 						if (stickDirection > 135 && stickDirection <= 165) {
// 							test_directNavActivated = false;
// 							test_focusTarget(test_subsystems_5, true, true);
// 						}
// 						break;
// 					case test_subsystems_2:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_1, true, true);
// 						break;
// 					case test_subsystems_3:
// 						if (stickDirection < -135 && stickDirection >= -165) {
// 							test_directNavActivated = false;
// 							test_focusTarget(test_subsystems_5, true, false);
// 						}
// 						break;
// 					case test_subsystems_4:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_3, true, true);
// 						break;
// 					case test_subsystems_5:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_3, true, false);
// 						break;
// 					case test_subsystems_6:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_4, true, true);
// 						break;
// 				}
// 			}
// 		}
// 		if (!prev) {
// 			if (currentSub.nextElementSibling && currentSub.nextElementSibling.hasAttribute("tabindex")) {
// 				// currentSub.classList.remove("focused");
// 				// currentSub.nextElementSibling.classList.add("focused");
// 			}
// 			else {
// 				switch (test_currentFocus) {
// 					case test_subsystems_1:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_2, true, false);
// 						break;
// 					case test_subsystems_2:
// 						if (stickDirection >= 15) {
// 							test_directNavActivated = false;
// 							test_focusTarget(test_subsystems_6, true, true);
// 						}
// 						break;
// 					case test_subsystems_3:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_4, true, false);
// 						break;
// 					case test_subsystems_4:
// 						if (stickDirection <= -15) {
// 							test_directNavActivated = false;
// 							test_focusTarget(test_subsystems_6, true, false);
// 						}
// 						break;
// 					case test_subsystems_5:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_1, true, false);
// 						break;
// 					case test_subsystems_6:
// 						test_directNavActivated = false;
// 						test_focusTarget(test_subsystems_2, true, true);
// 						break;
// 				}
// 			}
// 		}
// 	}
// 	else {
// 		const currentSubList: NodeListOf<Element> = test_currentFocus?.querySelectorAll('[tabindex]');
// 		if (currentSubList && currentSubList.length > 0) {
// 			currentSub = currentSubList[last ? currentSubList.length - 1 : 0];
// 			// currentSub.classList.add("focused");
// 			SpatialNavigation.focus(currentSub);
// 		}
// 	}
// }

// function test_clearSubItemFocus() {
// 	const currentSub: Element | null = test_currentFocus?.querySelector('.focused');
// 	if (currentSub) {
// 		currentSub.classList.remove("focused");
// 	}
// }

// function test_clearFocus() {
// 	test_directNavActivated = false;
// 	if (test_currentFocus) {
// 		test_currentFocus.classList.remove("hud-select");
// 		const progressMeter: HTMLElement | null = test_currentFocus.querySelector<HTMLElement>('.test_progress-bar-meter');
// 		if (progressMeter) {
// 			progressMeter.style.width = `0%`;
// 		}
// 	}
// }

// function test_tryAnalogNavigation(angle: number, length: number): string {
// 	if (length > test_analogNavigationThreshold) {
// 		if (test_navMode == "V") {
// 			if (angle > -150 && angle < -30) {
// 				return "down";
// 			}
// 			if (angle > 30 && angle < 150) {
// 				return "up";
// 			}
// 		}
// 		if (test_navMode == "H") {
// 			if (angle >= -60 && angle <= 60) {
// 				return "right";
// 			}
// 			if (angle <= -120 || angle > 120) {
// 				return "left";
// 			}
// 		}
// 		// if (angle > -120 && angle < -60) {
// 		// 	return test_navMode == "V" ? "down" : "none";
// 		// }
// 		// if (angle >= -30 && angle <= 30) {
// 		// 	return test_navMode == "H" ? "right" : "none";
// 		// }
// 		// if (angle > 60 && angle < 120) {
// 		// 	return test_navMode == "V" ? "up" : "none";
// 		// }
// 		// if (angle < -150 || angle > 150) {
// 		// 	return test_navMode == "H" ? "left" : "none";
// 		// }
// 	}

// 	return "none"
// }
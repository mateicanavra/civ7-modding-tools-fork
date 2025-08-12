/**
 * Utility functions to help with computed style checks on elements
 * @copyright 2020-2022, Firaxis Games
 *
 */

/**
 * Checks an element's style property and waits until it equals a target value to return true, or returns false after 3 frames
 * @param element The target element that will have its style checked.
 * @param property The name of the property to check.
 * @param target The target value the element's property should equal before continuing
 */
export async function waitForElementStyle(element: Element, property: string, target: number): Promise<boolean> {
	// set up the max number of frames we want to wait for this to resolve
	const _frameLimit: number = 3;
	let _framesLeft: number = _frameLimit;

	// check if the element exists, if not return with error
	if (!element) {
		console.warn(`StyleChecker: Target element could not be found`);
		return false
	}
	// check if the property exists, if not return with error
	if (!window.getComputedStyle(element).getPropertyValue(property)) {
		console.warn(`StyleChecker: Target ${element.tagName} ${element.className} does not have a '${property}' property`);
		return false
	}

	// set up a new Promise
	let promise: Promise<boolean> = new Promise((res) => {
		// iterative function
		let checkReadyStatus = () => {
			// subtract 1 from frame count
			_framesLeft--;

			// advance by 1 frame to check if style is set to target
			requestAnimationFrame(() => {
				// get value of property
				// TODO: add in a parser for the 'transform' property, if necessary
				let _value: number = parseFloat(window.getComputedStyle(element).getPropertyValue(property));

				// property is set to the target value; advance 1 frame for it to paint and return true
				if (_value == target) {
					requestAnimationFrame(() => { res(true); });
				}

				// frame limit has been reached; return false with error
				else if (_framesLeft == 0) {
					console.error(`StyleChecker: Target ${element.tagName} ${element.className} did not have its '${property}' property set to ${target} within ${_frameLimit} frames`);
					requestAnimationFrame(() => { res(false); });
				}

				// loop back
				else {
					checkReadyStatus();
				}
			});
		}
		checkReadyStatus();
	});
	return await promise
}
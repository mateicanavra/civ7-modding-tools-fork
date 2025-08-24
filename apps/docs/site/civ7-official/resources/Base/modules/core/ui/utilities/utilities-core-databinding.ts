/**
 * @file utilities-core-databinding.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Helpers for formatting, injecting, and extracting infomation from the databinding attribute.
 * @link https://coherent-labs.com/Documentation/cpp-gt/df/dfb/_h_t_m_l_data_binding.html
 */

class Databind {

	/**
	 * Bind an attribute to a value
	 * @param {HTMLElement} target Target element 
	 * @param {string} label Name of the attribute 
	 * @param {string} value Value to bind to the attribute
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static attribute(target: HTMLElement, label: string, value: string, verbose?: boolean) {

		let targetAttributes = target.getAttribute('data-bind-attributes') ?? "";

		if (targetAttributes.length > 0) {
			//Remove the first brace 
			if (targetAttributes[0] == "{") {
				targetAttributes = targetAttributes.slice(0);
			}
			//remove the last brace
			if (targetAttributes[targetAttributes.length - 1] == "}") {
				targetAttributes = targetAttributes.slice(1, targetAttributes.length - 1);
			}
			//CSV list 
			targetAttributes = `${targetAttributes},`;
		}
		targetAttributes += `"${label}":`;
		targetAttributes += `{{${value}}}`;

		// And lastly, don't forget to add the final braces around the whole shebang.
		targetAttributes = `{${targetAttributes}}`;

		if (verbose) {
			console.log(`Adding databind attribute to target:'${target.tagName}'`);
			console.log(`   Specific attribute being added:: target:'${target.tagName}', label: '${label}', value: '${value}'`);
			console.log("   Full databind attributes: " + targetAttributes);
		}

		target.setAttribute('data-bind-attributes', targetAttributes);
	}

	/**
	 * Create a DOM node for each element in the target array
	 * @param {HTMLElement} target Parent element of the new nodes 
	 * @param {string} targetArray Nodes will be created for each element in this array
	 * @param {string} iterator Iterator for the each new node
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static for(target: HTMLElement, targetArray: string, iterator: string, verbose?: boolean) {

		const targetValue = `${iterator}:{{${targetArray}}}`;

		if (verbose) {
			console.log(`Databinding for-loop to target:'${target.tagName}', value = ${targetValue}`);
		}

		target.setAttribute('data-bind-for', targetValue);
	}

	/**
	 * Helper function to create dropdown items with data bound key/value pairs
	 * @param {HTMLElement} target Parent element of the new nodes 
	 * @param {string} targetArray Nodes will be created for each element in this array
	 * @param {string} iterator Iterator for the each new node
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static dropdownItems(target: HTMLElement, targetArray: string, iterator: string, verbose?: boolean) {
		this.for(target, targetArray, `${iterator}`, verbose);
		{
			this.attribute(target, `${iterator}_keys`, "Option.serializedKeys");
			this.attribute(target, `${iterator}_values`, "Option.serializedValues");
		}
	}

	/**
	 * Displays the target element based on the condition
	 * @param {HTMLElement} target Element to display if the condition is true
	 * @param {string} condition If true, display the target element
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static if(target: HTMLElement, condition: string, verbose?: boolean) {

		const currentInfo = target.getAttribute('data-bind-if') ?? "";

		let newInfo = condition;
		if (!newInfo.includes("{")) {
			newInfo = `{{${condition}}}`;
		}

		if (currentInfo.length > 0) {
			newInfo = `${currentInfo}&&${newInfo}`;
		}

		if (verbose) {
			console.log(`Databinding if-check to target:'${target.tagName}', value = ${newInfo}`);
		}

		target.setAttribute('data-bind-if', newInfo);
	}

	/**
	 * Sets the target element's textContent to the data bound value
	 * @param {HTMLElement} target Element that will have it's textContent bound to the value 
	 * @param {string} value Value to be bound to the element's textContent
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static value(target: HTMLElement, value: string, verbose?: boolean) {

		let targetValue = value;

		if (!targetValue.includes("{")) {
			targetValue = `{{${value}}}`;
		}

		if (verbose) {
			console.log(`Databinding value to target:'${target.tagName}', value = ${targetValue}`);
		}

		target.setAttribute('data-bind-value', targetValue);
	}

	/**
	 * Insert the input HTML into the target DOM element
	 * @param {HTMLElement} target Target element
	 * @param {string} value HTML to be inserted into the target element
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static html(target: HTMLElement, value: string, verbose?: boolean) {

		let targetValue = value;

		if (!targetValue.includes("{")) {
			targetValue = `{{${value}}}`;
		}

		if (verbose) {
			console.log(`Databinding html to target:'${target.tagName}', value = ${targetValue}`);
		}

		target.setAttribute('data-bind-html', targetValue);
	}

	static loc(target: HTMLElement, value: string, verbose?: boolean) {
		let targetValue = value;

		if (!targetValue.includes("{")) {
			targetValue = `{{${value}}}`;
		}

		if (verbose) {
			console.log(`Databinding html to target:'${target.tagName}', value = ${targetValue}`);
		}

		target.setAttribute('data-bind-attr-data-l10n-id', targetValue);
	}

	/**
	 * Add/remove a class to the target element based on a condition
	 * @param {HTMLElement} target 
	 * @param {string} className
	 * @param {string} condition Condition may contain a data-bound iterator from elsewhere, using double-curly notation, e.g. "{{yieldIndex}} % 2 == 0"
	 */
	static classToggle(target: HTMLElement, className: string, condition: string) {

		const currentInfo = target.getAttribute('data-bind-class-toggle') ?? "";

		if (!condition.includes("{")) {
			condition = `{{${condition}}}`;
		}
		//Semi-colon is absorbed in to the attributes list, intentionally. 
		let newInfo: string = `${className}:${condition}`;
		if (currentInfo.length > 0) {
			newInfo = `${currentInfo};${newInfo}`;
		}

		target.setAttribute('data-bind-class-toggle', newInfo);
	}

	/**
	 * Useful for alternating row styling. 
	 * @param {HTMLElement} target 
	 * @param {string} styleName 
	 * @param {string} databoundIndex Specifically the string used in a wrapper databind for iterating in an array. 
	 */
	static alternatingClassStyle(target: HTMLElement, styleName: string, databoundIndex: string) {
		this.classToggle(target, styleName, `{{${databoundIndex}}} % 2 == 0`);
	}

	/**
	 * Access a specific style element within an object, and not the entire style class. 
	 * @param {HTMLElement} target 
	 * @param {string} styleWithDashes Expected to contain any dashes to correspond to CoHTML styles. "background-image" for example.
	 * @param {string} value 
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static style(target: HTMLElement, styleWithDashes: string, value: string, verbose?: boolean) {

		let targetValue = value;

		if (!targetValue.includes("{")) {
			targetValue = `{{${value}}}`;
		}

		if (verbose) {
			console.log(`Databinding data-bind-style-${styleWithDashes} to target:'${target.tagName}', value = ${targetValue}`);
		}

		target.setAttribute(`data-bind-style-${styleWithDashes}`, targetValue);
	}

	/**
	 * Databind to text using the magic-handshake Coherent l;ocalized text look up.
	 * @param {HTMLElement} target
	 * @param {string} value String key used to reference a localized string
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static locText(target: HTMLElement, value: string, verbose?: boolean) {
		this.attribute(target, "data-l10n-id", value, verbose);
	}

	/**
	 * Databind the background image using Coherent's special style define
	 * @param {HTMLElement} target
	 * @param {string} value The URL for an imaged to be set as the target's background-image
	 * @param {boolean} verbose Optional. If true, output debug console messages
	 */
	static bgImg(target: HTMLElement, value: string, verbose?: boolean) {
		this.style(target, "background-image-url", value, verbose);
	}

	/**
	 * Clear the target element's 'data-bind-attribute' attribute
	 * @param {HTMLElement} target
	 */
	static clearAttributes(target: HTMLElement) {
		target.setAttribute('data-bind-attributes', "");
	}

	/**
	 * Clear the target element's 'data-bind-class-toggle' attribute
	 * @param {HTMLElement} target
	 */
	static clearClassToggle(target: HTMLElement) {
		target.setAttribute('data-bind-class-toggle', "");
	}

	/**
	 * Databind simple tooltip text 
	 * @param {HTMLElement} target
	 * @param {string} value Text to be bound to the element's tooltip
	 */
	static tooltip(target: HTMLElement, value: string, verbose?: boolean) {
		this.attribute(target, "data-tooltip-content", value, verbose);
	}
}

export { Databind as default };


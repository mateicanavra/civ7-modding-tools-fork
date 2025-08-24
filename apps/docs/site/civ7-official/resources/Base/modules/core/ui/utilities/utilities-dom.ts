/**
 * @file utilities-dom.ts
 * @copyright 2023, Firaxis Games
 * @description Utilties for working with DOM elements
 */

export const MAX_UI_SCALE = 200;
export const MIN_UI_SCALE = 50;

export enum FontScale {
	XSmall = 0,
	Small = 1,
	Medium = 2,
	Large = 3,
	XLarge = 4
}

export type ElementTableInit = Record<string, string>;
export type ElementTable<U extends string> = Readonly<Record<U, HTMLElement>>;

/**
 * CreateElementTable returns a table of elements that lazily evaluates selectors and caches the retrieved elements via get/set.
 * 
 * @description for each kvp in init, create two properties on the returned object:
 * 1. An underscore-prefixed field that holds the element. Undefined until the getter is called. Null if the element is not found.
 * 2. A non-prefixed field with a getter and setter. The getter will return the element if it exists, or invoke the setter to query for the element.
 * 
 * 
 * @param root root element to use for looking up selectors
 * @param init object of kvp's where the key is the name of the element and the value is the selector 
 */
export const CreateElementTable = <T extends ElementTableInit>(root: HTMLElement, init: T): ElementTable<Extract<keyof T, string>> => {
	const table = {} as ElementTable<Extract<keyof T, string>>;

	for (const key in init) {
		const _key = `_${key}`;
		Object.defineProperty(table, _key, { value: undefined, writable: true, enumerable: false, configurable: true });
		Object.defineProperty(table, key, {
			get: function (this: Record<string, HTMLElement | undefined | null>): HTMLElement {
				if (this[_key] === undefined) {
					if (!root.isConnected) {
						console.error(`CreateElementTable: attempted to access element ${key} on a root that is not yet connected to the DOM.`)
					}
					this[_key] = root.querySelector(init[key]) as HTMLElement | null

				}

				if (this[_key] === null) {
					throw new Error(`CreateElementTable: element ${key} not found in root element.`);
				}

				// TypeScript doesn't seem to know that this[_key] is not null/undefined at this point
				return this[_key] as HTMLElement;
			},
			set: function (value: HTMLElement | null) {
				this[`_${key}`] = value;
			},
			enumerable: true,
			configurable: true
		});
	}

	return table;
}

/**
 * Creates a string representation of an element that can be used for debugging.
 */
export const ElementToDebugString = (element: Element): string => {
	const tag = element.tagName.toLowerCase();
	const id = element.id ? `#${element.id}` : '';
	const classes = element.classList.length > 0 ? `.${Array.from(element.classList).join('.')}` : '';
	return `${tag}${id}${classes}`;
}

interface MustGetElementFunction {
	<K extends keyof HTMLElementTagNameMap>(selectors: K, element: HTMLElement | Document): HTMLElementTagNameMap[K]
	<K extends keyof SVGElementTagNameMap>(selectors: K, element: HTMLElement | Document): SVGElementTagNameMap[K]
	<K extends keyof MathMLElementTagNameMap>(selectors: K, element: HTMLElement | Document): MathMLElementTagNameMap[K]

	// This should maybe default to Element instead of HTMLElement, but leaving it as HTMLElement to avoid updating usages for now
	<E extends HTMLElement = HTMLElement>(selectors: string, element: HTMLElement | Document): E
}

/**
 * MustGetElement queries for the element and throws an error if it is not found.
 * 
 * @param selector selector to query for
 * @param element optional root element to use for the query. Defaults to document.
 */
export const MustGetElement: MustGetElementFunction = <T extends HTMLElement>(selector: string, element: HTMLElement | Document): T => {
	const result = element.querySelector<T>(selector);
	if (!result) {
		const parent = element instanceof HTMLElement ? ElementToDebugString(element) : "document";
		throw new Error(`MustGetElement: element ${selector} not found in ${parent}.`);
	}
	return result;
}

/**
 * MustGetElements queries for all elements and throws an error if it is not found.
 * 
 * @param selector selector to query for
 * @param element optional root element to use for the query. Defaults to document.
 */
export const MustGetElements = <T extends HTMLElement>(selector: string, element: HTMLElement | Document): NodeListOf<T> => {
	const result = element.querySelectorAll<T>(selector);
	if (!result.length) {
		const parent = element instanceof HTMLElement ? ElementToDebugString(element) : "document";
		throw new Error(`MustGetElements: elements ${selector} not found in ${parent}.`);
	}
	return result;
}


/**
 * RecursiveGetAttribute retrieves an attribute from an element or its parent recursively.
 * 
 * @param target element to start the search from
 * @param attr attribute to retrieve
 */
export const RecursiveGetAttribute = (target: HTMLElement | null, attr: string): string | null => {
	if (target == null || target == document.body) {
		return null;
	}

	return target.getAttribute(attr) ?? RecursiveGetAttribute(target.parentElement, attr);
}


/**
 * IsElement is a type guard for checking if an element is of a specific tag name
 * 
 * @example
 * if (IsElement(element, 'fxs-button')) {
 *   element; // element is inferred as ComponentRoot<FxsButton>
 * }
 * @param element element to check
 * @param tagName tag name to compare against
 */
export const IsElement = <
	TagName extends keyof HTMLElementTagNameMap
>(element: unknown, tagName: TagName): element is HTMLElementTagNameMap[TagName] => element instanceof HTMLElement && element.tagName.toLowerCase() === tagName;

/**
 * PassThroughAttributes sets the attributes of element a on element b.
 */
export const PassThroughAttributes = (a: HTMLElement, b: HTMLElement, ...attributes: string[]) => {
	attributes.forEach(attr => {
		const value = a.getAttribute(attr);
		if (value) {
			b.setAttribute(attr, value);
		}
	});
}
/**
 * @file tutorial-highlighter
 * @copyright 2022, Firaxis Games
 * @description Tutorial highlight classes & functions
 *
 */

// Defined for the functions that adding/remove a particular type of "highlight"
type HighlightFunc = (node: HTMLElement) => void;
type HighlightFuncs = {
	add: HighlightFunc,
	remove: HighlightFunc
}

/**
 * Part of the tutorial system, tracks different functions which can be used to
 * highlight nodes when they are called out in the tutorial.
 * 
 * A "highlight" function can add style(s), and node(s) to a selector target.
 * 
 * Whatever HTML element is being highlighted can specify which highlighter
 * should be used with data-tut-highlight and point to a registered name.
 * (If no name is specified, the default highlighting function is used.)
 */
class HighlightManager {
	private highlighters: Map<string, HighlightFuncs> = new Map<string, HighlightFuncs>();
	registerHighlighter(name: string, addFunc: HighlightFunc, removeFunc: HighlightFunc) {
		this.highlighters.set(name, { add: addFunc, remove: removeFunc });
	}
	add(element: HTMLElement) {
		const name: string = element.getAttribute("data-tut-highlight") ?? "default";
		const func: HighlightFunc | undefined = this.highlighters.get(name)?.add;
		if (func) {
			func(element);
		} else {
			console.error(`Tutorial cannot add highlight to an element because specified highlighter '${name}' doesn't exist. element: ${element.className}`);
		}
	}
	remove(element: HTMLElement) {
		const name: string = element.getAttribute("data-tut-highlight") ?? "default";
		const func: HighlightFunc | undefined = this.highlighters.get(name)?.remove;
		if (func) {
			func(element);
		} else {
			console.error(`Tutorial cannot remove a highlight from an element because specified highlighter '${name}' doesn't exist. element: ${element.className}`);
		}
	}
}
const highlighter: HighlightManager = new HighlightManager();


/**
 * Create highlighter which is a arrow pointing down at the element below it.
 */
function downArrowAdd(element: HTMLElement) {
	const highlightRoot: HTMLDivElement = document.createElement("div");
	highlightRoot.classList.add("tut-arrow-vert");
	element.appendChild(highlightRoot);
}
function downArrowDelete(element: HTMLElement) {
	const highlightRoot: HTMLDivElement | null = element.querySelector(".tut-arrow-vert");
	if (!highlightRoot) {
		console.warn("Unable to remove down arrow highlight from element, cannot find root highlight node.");
		return;
	}
	highlightRoot.classList.remove("tut-arrow-vert");
	highlightRoot.parentElement?.removeChild(highlightRoot);
}
highlighter.registerHighlighter("downArrowHighlighter", downArrowAdd, downArrowDelete);

// Default highlight functions (just applies a CSS class)
function defaultHighlightAdd(element: HTMLElement) {
	element.classList.add("tut-default-highlight");
}
function defaultHighlightRemove(element: HTMLElement) {
	element.classList.remove("tut-default-highlight");
}
highlighter.registerHighlighter("default", defaultHighlightAdd, defaultHighlightRemove);


///Founder highlights
function founderHighlightAdd(element: HTMLElement) {
	const pingAnim: HTMLDivElement = document.createElement('div');
	pingAnim.classList.value = 'tut-circle-highlight absolute min-w-36 min-h-36 pointer-events-none';
	element.classList.add("flex", "justify-center", "items-center");
	element.appendChild(pingAnim);
}
function founderHighlightRemove() {
	const highlightLeftover: HTMLElement | null = document.querySelector<HTMLElement>(".tut-circle-highlight");
	if (highlightLeftover?.parentElement) {
		highlightLeftover.parentElement.classList.remove("flex", "justify-center", "items-center");
		highlightLeftover.parentElement.removeChild(highlightLeftover);
	}
}
highlighter.registerHighlighter("founderHighlight", founderHighlightAdd, founderHighlightRemove);

///production highlights
function productionHighlightAdd(element: HTMLElement) {
	const pingAnim: HTMLDivElement = document.createElement('div');
	pingAnim.classList.add('tut-container-highlight');
	pingAnim.classList.add('production-highlight');
	element.appendChild(pingAnim);
}
function productionHighlightRemove() {
	const highlightLeftover: HTMLElement | null = document.querySelector<HTMLElement>(".tut-container-highlight");
	if (highlightLeftover?.parentElement) {
		highlightLeftover.parentElement.removeChild(highlightLeftover);
	}
}
highlighter.registerHighlighter("productionHighlights", productionHighlightAdd, productionHighlightRemove);


///tech highlights
function techHighlightAdd(element: HTMLElement) {
	const borderAnim: HTMLDivElement = document.createElement('div');
	borderAnim.classList.add('tut-chooser-item-highlight');
	element.appendChild(borderAnim);

	const pingAnim: HTMLDivElement = document.createElement('div');
	pingAnim.classList.add('tut-ping-pos-highlight', 'tut-ping-pos-highlight-top');
	borderAnim.appendChild(pingAnim);

	const arrowAnim: HTMLDivElement = document.createElement('div');
	arrowAnim.classList.add('tut-ping-arrow', 'tut-ping-arrow-top');
	element.appendChild(arrowAnim);
}
function techHighlightRemove() {
	const borderHighlightLeftover = document.querySelector<HTMLElement>(".tut-chooser-item-highlight");
	borderHighlightLeftover?.remove();

	const arrowHighlightLeftover = document.querySelector<HTMLElement>(".tut-ping-arrow");
	arrowHighlightLeftover?.remove();
}
highlighter.registerHighlighter("techChooserHighlights", techHighlightAdd, techHighlightRemove);

function techHighlightOffAdd(element: HTMLElement) {
	const pingAnim: HTMLDivElement = document.createElement('div');
	pingAnim.classList.add('tut-blank-highlight');
	element.appendChild(pingAnim);

}
function techHighlightOffRemove() {
	const highlightLeftover: HTMLElement | null = document.querySelector<HTMLElement>(".tut-blank-highlight");
	if (highlightLeftover?.parentElement) {
		highlightLeftover.parentElement.removeChild(highlightLeftover);
	}
}
highlighter.registerHighlighter("techChooserHighlightsOff", techHighlightOffAdd, techHighlightOffRemove);



export namespace Tutorial {

	export type HighlightFunc = (element: HTMLElement) => void;

	export function highlightElement(element: HTMLElement) {
		highlighter.add(element);
	}

	export function unhighlightElement(element: HTMLElement) {
		highlighter.remove(element);
	}
}


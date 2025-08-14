/**
 * @file Default tooltip
 * @copyright 2020-2021, Firaxis Games
 * @description Default tooltip type.
 */

import TooltipManager, { TooltipType } from '/core/ui/tooltips/tooltip-manager.js';

/**
 * Simple default tooltip that essentially expects lines of DIVs to be placed in order of content.
 * TODO: Implement algorithm to pass tooltip rows object around.
 * TODO: Change to use fragments so animation will re-trigger.  Doesn't do this currently when add/remove a CSS animation class because the DOM will not properly reflow.  Attempts to force the reflow have not been consistent (and that's a kluge anyway.)
 */
/*
class DefaultTooltipType implements TooltipType {
	component: HTMLElement;
	div: HTMLElement;
	content?: string;
	cachedTarget?: HTMLElement;
	isContentEmpty: boolean = true;

	// Flip this bool to see the debugging tooltip information as you move the cursor around 
	showDebugInformation: boolean = false;

	constructor() {
		this.component = document.createElement('fxs-tooltip');
		this.div = document.createElement('div');
		this.div.classList.add("tooltip-text");
		this.component.appendChild(this.div);
	}

	getHTML(): HTMLElement {
		return this.component;
	}

	reset() {
		while (this.div.hasChildNodes()) {
			this.div.removeChild(this.div.lastChild!);
		}
	}

	isUpdateNeeded(target: HTMLElement): boolean {
		const content: string | null = target.getAttribute('data-tooltip-content');

		// Just swapped from empty to not
		if (this.isContentEmpty && (content != null)) {
			this.isContentEmpty = false;
			return true;
		}
		this.isContentEmpty = (content == null);

		if (content) {
			if (content == this.content) {	// Same content? Nothing to update.
				return false;
			}
			this.div.classList.remove("tooltip-debug");
			this.content = content;
		} else {
			// Caching to prevent refresh from being hammered. 
			if (this.cachedTarget == target) {
				return false;
			}
			this.cachedTarget = target;

			// If not showing default info; we're done here.
			if (!this.showDebugInformation) {
				return false;
			}
			this.content = "DEBUG: MISSING tooltip: ";
			this.content += "<br>className = " + target.className;
			this.content += ", <br>id = " + target.id.toString();
			this.content += ", <br>src = " + target.getAttribute("src");
			this.div.classList.add("tooltip-debug");
		}
		return true;
	}

	update() {
		this.div.innerHTML = this.content?.trim() ?? "";
	}

	isBlank(): boolean {
		return this.isContentEmpty;
	}
}
*/

/**
 * This is a kludge to blank out 'default' tool-tips during this transition from the older tooltip-manager to separate tooltip controllers.
 */
class EmptyTooltipType implements TooltipType {

	// Flip this bool to see the debugging tooltip information as you move the cursor around 
	showDebugInformation: boolean = false;

	private readonly dummyElement = document.createElement('fxs-tooltip');

	getHTML() {
		return this.dummyElement;
	}

	reset() {
	}

	isUpdateNeeded(_target: HTMLElement): boolean {
		return false;
	}

	update() {
	}

	isBlank(): boolean {
		return true;
	}
}
TooltipManager.registerType('default', new EmptyTooltipType());

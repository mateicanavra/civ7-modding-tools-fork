/**
 * @file framework.ts
 * @copyright 2021-2024, Firaxis Games
 * @description A central storage location for singleton 'manager' instances and entry point into the UI framework.
 */
import type ContextManager from '/core/ui/context-manager/context-manager.js';
import type FocusManager from '/core/ui/input/focus-manager.js';
import type DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';

let contextManager: typeof ContextManager | null = null;
let focusManager: typeof FocusManager | null = null;
let dialogManager: typeof DialogManager | null = null;

const Framework = {
	get ContextManager(): typeof ContextManager {
		throw new Error("ContextManager must be set prior to using.");
	},
	get FocusManager(): typeof FocusManager {
		throw new Error("FocusManager must be set prior to using.");
	},
	get DialogManager(): typeof DialogManager {
		throw new Error("DialogManager must be set prior to using.");
	},
}

export function setContextManager(value: typeof ContextManager) {
	contextManager = value;
	Object.defineProperty(Framework, 'ContextManager', {
		get: () => contextManager,
	});
}

export function setFocusManager(value: typeof FocusManager) {
	focusManager = value;
	Object.defineProperty(Framework, 'FocusManager', {
		get: () => focusManager,
	});
}

export function setDialogManager(value: typeof DialogManager) {
	dialogManager = value;
	Object.defineProperty(Framework, 'DialogManager', {
		get: () => dialogManager,
	});
}

export { Framework };
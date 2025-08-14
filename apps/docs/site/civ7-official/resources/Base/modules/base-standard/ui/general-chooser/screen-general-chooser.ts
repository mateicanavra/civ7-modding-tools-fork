/**
 * @file screen-general-chooser.ts
 * @copyright 2020-2022, Firaxis Games
 * @description General Chooser screen.  This screen is meant to be a base that's overridden by other screens.
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';

export class ScreenGeneralChooser extends Panel {

	protected defaultFocus: HTMLElement | null = null;

	protected createCloseButton = true;

	private closeButtonListener = () => this.close();
	private entryListener = this.onActivate.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.inputContext = InputContext.Dual;
	};

	onAttach() {
		super.onAttach();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		if (this.createCloseButton) {
			const closebutton: HTMLElement = document.createElement('fxs-close-button');
			closebutton.addEventListener('action-activate', this.closeButtonListener);
			this.Root.appendChild(closebutton);
		}

		const entryContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.gen-chooser-content');
		if (entryContainer) {
			this.defaultFocus = entryContainer;
			this.createEntries(entryContainer);
		}

		if (ContextManager.hasInstanceOf("panel-radial-menu")) {
			ContextManager.pop("panel-radial-menu");
		}
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		if (this.defaultFocus != null) {
			FocusManager.setFocus(this.defaultFocus);
		}
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	protected onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onActivate(event: CustomEvent) {
		if (event.target instanceof HTMLElement) {
			if (event.target.classList.contains("gen-chooser-item")) {
				this.entrySelected(event.target);
			}
		}
	}

	/**
	 * Performs the boilerplate for each entry to work properly with the general chooser framework.
	 * Each screen will need to add whatever attribute it wants to identify the entry when it's chosen.
	 * @param {element} entry - The HTML element for the entry.
	 */
	tagEntry(entry: HTMLElement) {
		entry.addEventListener('action-activate', this.entryListener);
		entry.classList.add("gen-chooser-item");
		entry.setAttribute("tabindex", "-1");
	}

	/**
	 * Creates the list of entries in the chooser list. Override this in your derived chooser.
	 * @param {element} entryContainer - The HTML element that's the parent of all of the entries.
	 */
	protected createEntries(entryContainer: HTMLElement) {
		// Simple example to demonstrate how to override this.
		// You must add the gen-chooser-item class and tabindex attribute to each item as shown.
		let i: number = 0;
		for (i = 0; i < 25; i++) {
			const newEntry: HTMLElement = document.createElement("fxs-activatable");
			this.tagEntry(newEntry);
			newEntry.innerHTML = i.toString();
			entryContainer.appendChild(newEntry);
		}
	}

	/**
	 * Called when the user chooses an item in the list.  Override this in your derived chooser.
	 * @param {element} entryElement - The HTML element chosen.
	 */
	entrySelected(_entryElement: HTMLElement) {
	}
}

Controls.define('screen-general-chooser', {
	createInstance: ScreenGeneralChooser,
	description: 'General Chooser screen.',
	classNames: ['screen-general-chooser'],
	styles: ['fs://game/base-standard/ui/general-chooser/screen-general-chooser.css'],
	content: ['fs://game/base-standard/ui/general-chooser/screen-general-chooser.html'],
	attributes: []
});
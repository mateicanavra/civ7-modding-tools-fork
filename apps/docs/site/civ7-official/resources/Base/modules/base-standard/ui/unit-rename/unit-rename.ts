/**
 * @file unit-rename.ts
 * @copyright 2025, Firaxis Games
 * @description Panel for renaming units.
 */

import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { TextBoxTextChangedEvent, TextBoxTextChangedEventName, TextBoxTextEditStopEvent, TextBoxTextEditStopEventName } from '/core/ui/components/fxs-textbox.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';

export const UnitRenameConfirmEventName = 'unit-rename-confirm';
export class UnitRenameConfirmEvent extends CustomEvent<{ newName: string }> {
	constructor(newName: string) {
		super(UnitRenameConfirmEventName, { bubbles: false, cancelable: true, detail: { newName } });
	}
}

export const UnitRenameHideStatusToggledEventName = 'unit-rename-hide-status-toggle';
export class UnitRenameHideStatusToggledEvent extends CustomEvent<{ isHidden: boolean }> {
	constructor(isHidden: boolean) {
		super(UnitRenameHideStatusToggledEventName, { bubbles: false, cancelable: true, detail: { isHidden } });
	}
}

class UnitRename extends Panel {

	private nameEditConfirmButton!: HTMLElement;
	private nameEditTextBox!: HTMLElement;
	private nameEditCloseButton!: HTMLElement;
	private onCommanderNameConfirmedListener = this.onNameConfirmed.bind(this);
	private onTextBoxTextChangedListener = this.onTextBoxTextChanged.bind(this);
	private onTextBoxEditingStoppedListener = this.onTextBoxEditingStopped.bind(this);
	private onCloseButtonListener = this.onCloseButton.bind(this);

	private onEngineInputListener = this.onEngineInput.bind(this);

	private textboxMaxLength: number = 32;

	onInitialize(): void {
		this.Root.classList.add('absolute', 'w-128', 'h-60', 'trigger-nav-help');
		this.nameEditConfirmButton = MustGetElement(".unit-rename__confirm", this.Root);
		this.nameEditTextBox = MustGetElement(".unit-rename__textbox", this.Root);
		this.nameEditCloseButton = MustGetElement("fxs-close-button", this.Root);
	}

	onAttach() {
		super.onAttach();
		this.nameEditConfirmButton.addEventListener('action-activate', this.onCommanderNameConfirmedListener);
		this.nameEditConfirmButton.setAttribute("action-key", "inline-swap-plot-selection");
		this.nameEditTextBox.addEventListener(TextBoxTextChangedEventName, this.onTextBoxTextChangedListener);
		this.nameEditCloseButton.addEventListener('action-activate', this.onCloseButtonListener);
		this.nameEditTextBox.addEventListener(TextBoxTextEditStopEventName, this.onTextBoxEditingStoppedListener);

		this.Root.addEventListener(InputEngineEventName, this.onEngineInputListener);

		this.nameEditTextBox.setAttribute("max-length", this.textboxMaxLength.toString());
	}

	onDetach() {
		this.nameEditConfirmButton.removeEventListener('action-activate', this.onCommanderNameConfirmedListener);
		this.nameEditTextBox.removeEventListener(TextBoxTextChangedEventName, this.onTextBoxTextChangedListener);
		this.nameEditTextBox.removeEventListener(TextBoxTextEditStopEventName, this.onTextBoxEditingStoppedListener);
		this.nameEditCloseButton.removeEventListener('action-activate', this.onCloseButtonListener);

		this.Root.removeEventListener(InputEngineEventName, this.onEngineInputListener);

		super.onDetach();
	}

	//Handle confirmation of the unit's name
	private onNameConfirmed() {
		const textBoxValue: string | null = this.nameEditTextBox.getAttribute("value");
		if (textBoxValue == null) {
			console.error("unit-rename: onNameConfirmed - confirming null name.");
			return;
		}
		if (textBoxValue.length == 0) {
			console.warn("unit-rename: onNameConfirmed - confirming empty name. This is probably not intentional.");
		}
		this.Root.dispatchEvent(new UnitRenameConfirmEvent(textBoxValue));
	}

	//handle changing text in the text box. Don't let people input empty names
	private onTextBoxTextChanged(event: TextBoxTextChangedEvent) {
		const newString: string = event.detail.newStr;
		const shouldDisabledConfirm: boolean = newString.length == 0;
		this.nameEditConfirmButton.setAttribute("disabled", shouldDisabledConfirm.toString());
	}

	//event handler for textbox's TextBoxTextEditStopEvent. Handle cancel/confirming text input 
	private onTextBoxEditingStopped(event: TextBoxTextEditStopEvent) {
		//Handle consoles with a virtual keyboard
		if (UI.canDisplayKeyboard()) {
			if (event.detail.confirmed) {
				this.onNameConfirmed();
			}
			this.onCloseButton();
		}
		else {
			if (event.detail.confirmed) {
				if (event.detail.inputEventName != "accept") {
					this.onNameConfirmed();
				}
			}
			else {
				this.onCloseButton();
			}
		}
	}

	//handle input
	private onEngineInput(event: InputEngineEvent) {
		if (event.detail.status != InputActionStatuses.FINISH || event.detail.name == "camera-pan") {
			return;
		}
		if (event.detail.name == "swap-plot-selection") {
			this.onNameConfirmed();
		}
		else if (event.isCancelInput()) {
			this.onCloseButton();
		}
		event.stopPropagation();
		event.preventDefault();
	}

	//handle clicking the close button/hitting the gamepad cancel button
	private onCloseButton() {
		this.Root.setAttribute("active", "true");
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string | null) {

		switch (name) {
			case "active":
				const shouldHide: boolean = newValue == "true";
				//don't display the unit-rename panel if on a platform with a virtual keyboard that can do the work for us!
				this.Root.classList.toggle("hidden", shouldHide || UI.canDisplayKeyboard());
				if (shouldHide) {
					this.nameEditTextBox.setAttribute("value", "");
					this.nameEditTextBox.setAttribute("enabled", "false");
				}
				else {
					if (UI.canDisplayKeyboard()) {
						this.nameEditTextBox.setAttribute("activated", "true");
					}
					else {
						this.nameEditTextBox.setAttribute("enabled", "true");
					}
				}
				this.Root.dispatchEvent(new UnitRenameHideStatusToggledEvent(shouldHide));
				break;
			default:
				super.onAttributeChanged(name, oldValue, newValue);
				break;
		}
	}
}

Controls.define("unit-rename", {
	createInstance: UnitRename,
	description: 'Unit Renaming Panel',
	content: ['fs://game/base-standard/ui/unit-rename/unit-rename.html'],
	styles: ['fs://game/base-standard/ui/unit-rename/unit-rename.css'],
	attributes: [
		{
			name: "active",
			description: "If the rename panel is showing or not"
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'name-edit': ComponentRoot<UnitRename>
	}
	interface HTMLElementEventMap {
		'unit-rename-confirm': UnitRenameConfirmEvent;
	}
}
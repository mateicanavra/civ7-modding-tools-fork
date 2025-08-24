/**
 * @file fxs-editable-header.ts
 * @copyright 2025, Firaxis Games
 */

import { FxsHeader } from "/core/ui/components/fxs-header.js";
import { TextBoxTextEditStopEvent } from "/core/ui/components/fxs-textbox.js";
import ActionHandler, { ActiveDeviceTypeChangedEventName, ActiveDeviceTypeChangedEvent } from "/core/ui/input/action-handler.js";
import { InputEngineEvent, InputEngineEventName } from "/core/ui/input/input-support.js";

export const EditableHeaderTextChangedEventName = 'editable-header-text-changed';
export class EditableHeaderTextChangedEvent extends CustomEvent<{ newStr: string }> {
	constructor(newStr: string) {
		super(EditableHeaderTextChangedEventName, { bubbles: false, cancelable: true, detail: { newStr } });
	}
}

export class FxsEditableHeader extends FxsHeader {
	private inputHandler: Element = this.Root;

	private editableTextBox: HTMLElement = document.createElement("fxs-textbox");
	private staticText: HTMLElement = document.createElement("div");
	private textEditToggleButton: HTMLElement = document.createElement("fxs-edit-button");
	private textEditToggleNavHelp: HTMLElement = document.createElement("fxs-nav-help");
	private disable: boolean = false;

	private onEditToggleActivatedListener = this.onEditToggleActivated.bind(this);
	private onTextEditStoppedListener = this.onTextEditStopped.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private activeDeviceChangedListener = this.onActiveDeviceChange.bind(this);

	private textboxMaxLength: number = 32;

	onAttach(): void {
		const tabForSelector = this.Root.getAttribute('tab-for') ?? 'fxs-frame';
		if (tabForSelector !== '') {
			const inputHandler = this.Root.closest(tabForSelector);
			if (!inputHandler) {
				console.error(`fxs-editable-header: onAttach - no valid input handler found!`);
			} else {
				this.inputHandler = inputHandler;
			}
		}

		this.textEditToggleNavHelp.setAttribute("action-key", "inline-shell-action-3");
		this.textEditToggleNavHelp.classList.add("absolute", "left-0");

		this.inputHandler.addEventListener(InputEngineEventName, this.engineInputListener);

		this.staticText.classList.add("font-fit-shrink", "max-w-84", "text-center", "truncate");

		this.editableTextBox.setAttribute("has-background", "false");
		this.editableTextBox.setAttribute("has-border", "false");
		this.editableTextBox.setAttribute("enabled", "false");
		this.editableTextBox.setAttribute("max-length", this.textboxMaxLength.toString());
		this.editableTextBox.addEventListener("text-edit-stop", this.onTextEditStoppedListener);
		this.editableTextBox.classList.add("max-w-84");

		this.textEditToggleButton.classList.add("size-10", "bg-contain", "bg-no-repeat", "absolute", "right-0");
		this.textEditToggleButton.addEventListener("action-activate", this.onEditToggleActivatedListener);
		this.textEditToggleButton.classList.toggle("hidden", ActionHandler.isGamepadActive);

		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);

		super.onAttach();
	}

	onDetach(): void {
		this.inputHandler.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.textEditToggleButton.removeEventListener("action-activate", this.onEditToggleActivatedListener);
		this.editableTextBox.removeEventListener("text-edit-stop", this.onTextEditStoppedListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
		super.onDetach();
	}

	protected render(): void {
		this.renderQueued = false;
		while (this.Root.firstChild) {
			this.Root.removeChild(this.Root.firstChild);
		}
		this.editableTextBox.classList.add("hidden");

		this.staticText.setAttribute("data-l10n-id", this.titleText ?? "");
		this.editableTextBox.setAttribute("value", this.titleText ?? "");

		const outerDiv: HTMLElement = document.createElement("div");
		switch (this.filigreeStyle) {
			case "none":
				outerDiv.append(this.editableTextBox);
				outerDiv.insertBefore(this.staticText, outerDiv.firstChild);
				break;
			case "h1":
				outerDiv.classList.add("flex", "flex-col", "items-center", "max-w-full");
				outerDiv.innerHTML = `<div class="filigree-divider-h1"></div>`;
				outerDiv.insertBefore(this.editableTextBox, outerDiv.firstChild);
				outerDiv.insertBefore(this.staticText, outerDiv.firstChild);
				break;
			case "h2":
				outerDiv.classList.add("flex", "flex-col", "items-center", "max-w-full");
				outerDiv.innerHTML = `<div class="filigree-divider-h2"></div>`;
				outerDiv.insertBefore(this.editableTextBox, outerDiv.firstChild);
				outerDiv.insertBefore(this.staticText, outerDiv.firstChild);
				break;
			case "h3":
				outerDiv.classList.add("flex", "flex-col", "items-center", "max-w-full");
				outerDiv.innerHTML = `<div class="filigree-divider-h3"></div>`;
				outerDiv.insertBefore(this.editableTextBox, outerDiv.firstChild);
				outerDiv.insertBefore(this.staticText, outerDiv.firstChild);
				break;
			case "h4":
				outerDiv.classList.add("flex", "justify-center", "max-w-full", "items-center");

				const leftDiv: HTMLElement = document.createElement("div");
				leftDiv.classList.add("filigree-h4-left");
				outerDiv.appendChild(leftDiv);

				const midDiv: HTMLElement = document.createElement("div");
				midDiv.classList.add("flow-row");
				midDiv.appendChild(this.editableTextBox);
				outerDiv.appendChild(midDiv);

				const rightDiv: HTMLElement = document.createElement("div");
				rightDiv.classList.add("filigree-h4-right");
				outerDiv.appendChild(rightDiv);
				break;
			case "small":
				outerDiv.classList.add("flex", "flex-col", "items-center", "max-w-full");
				outerDiv.innerHTML = `<div class="filigree-shell-small mt-2\\.5"></div>`;
				outerDiv.insertBefore(this.editableTextBox, outerDiv.firstChild);
				outerDiv.insertBefore(this.staticText, outerDiv.firstChild);
				break;
			default:
				console.warn(`fxs-editable-header - Invalid header style`);
		}
		this.Root.appendChild(outerDiv);
		this.Root.appendChild(this.textEditToggleButton);
		this.Root.appendChild(this.textEditToggleNavHelp);
	}

	private onActiveDeviceChange(event: ActiveDeviceTypeChangedEvent) {
		this.textEditToggleButton.classList.toggle("hidden", event.detail.gamepadActive);
	}

	private onTextEditStopped(event: TextBoxTextEditStopEvent) {
		if (event.detail.confirmed) {
			this.textEditEnd();
		}
		else {
			this.onCancelEdit();
		}
	}

	private onEngineInput(event: InputEngineEvent) {
		if (event.detail.status != InputActionStatuses.FINISH || this.disable) {
			return;
		}
		if (event.detail.name == "shell-action-3" || event.detail.name == "accept") {
			this.onEditToggleActivated();
			event.preventDefault();
			event.stopPropagation();
		}
	}

	private onCancelEdit() {
		this.editableTextBox.classList.add("hidden");
		this.staticText.classList.remove("hidden");
		this.editableTextBox.setAttribute("value", this.staticText.innerHTML);
		this.editableTextBox.setAttribute("enabled", "false");
		this.textEditToggleButton.setAttribute("is-confirm", "false");
	}

	private onEditToggleActivated() {
		const shouldEnable: boolean = this.editableTextBox.getAttribute("enabled") != "true";

		if (shouldEnable) {
			this.textEditBegin();
		}
		else {
			this.textEditEnd();
		}
	}

	private textEditBegin() {
		this.editableTextBox.classList.remove("hidden");
		this.editableTextBox.setAttribute("value", this.staticText.innerHTML);
		this.staticText.classList.add("hidden");
		if (UI.canDisplayKeyboard()) {
			this.editableTextBox.setAttribute("activated", "true");
		}
		else {
			this.editableTextBox.setAttribute("enabled", "true");
		}
		this.textEditToggleButton.setAttribute("is-confirm", "true");
	}

	private textEditEnd() {
		this.editableTextBox.setAttribute("enabled", "false");
		const textboxValue: string = this.editableTextBox.getAttribute("value") ?? "";
		this.Root.setAttribute('title', Locale.fromUGC("LOC_CITY_CUSTOM_NAME", textboxValue));
		this.Root.dispatchEvent(new EditableHeaderTextChangedEvent(textboxValue));
	}

	onAttributeChanged(_name: string, _oldValue: string, _newValue: string) {
		switch (_name) {
			case "title":
				this.onCancelEdit();
				this.staticText.setAttribute("data-l10n-id", _newValue);
				break;
			case "disable":
				this.disable = _newValue == "true" ? true : false;
				break;
			default:
				super.onAttributeChanged(_name, _oldValue, _newValue);
		}
	}
}

Controls.define('fxs-editable-header', {
	createInstance: FxsEditableHeader,
	description: 'An editable header',
	skipPostOnAttach: true,
	classNames: ['fxs-editable-header', 'relative'],
	attributes: [
		{
			name: 'title'
		},
		{
			name: 'filigree-style',
			description: 'The style of the title from the following list: none, h1, h2, h3, h4, small. Default value: h3'
		},
		{
			name: 'font-fit-mode',
			description: 'Whether to grow or shrink the text to fit the header.'
		},
		{
			name: 'font-min-size',
			description: 'overwrite the text min shrink size (default: 14px)'
		},
		{
			name: "text-edit-enabled",
			description: 'toggle if text is being edited or not'
		},
		{
			name: "disable"
		}
	],
	images: [
		'fs://game/header_filigree.png',
		'fs://game/hud_divider-h2.png',
		'fs://game/hud_sidepanel_divider.png',
		'fs://game/hud_fleur.png',
		'fs://game/shell_small-filigree.png',
		'fs://game/hud_paneltop-simple.png',
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-editable-header': ComponentRoot<FxsEditableHeader>
	}
	interface HTMLElementEventMap {
		'editable-header-text-changed': EditableHeaderTextChangedEvent;
	}
}
/**
 * @file screen-dialog-box.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Popup dialog, visual part of the dialog box. 
 */

import DialogBoxManager, { DialogBoxExtensions, DialogBoxAction, DialogBoxID, DialogBoxOption } from '/core/ui/dialog-box/manager-dialog-box.js';
import "/core/ui/components/fxs-button-group.js";
import { FlipbookDefinition, FlipbookFrame } from '/core/ui/components/fxs-flipbook.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import FxsNavHelp from '/core/ui/components/fxs-nav-help.js';
import { DialogBoxCustom, DialogBoxDefinition } from '/core/ui/dialog-box/model-dialog-box.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { TextBoxTextEditStopEvent } from '/core/ui/components/fxs-textbox.js';


interface ExtensionListItem {
	id: string;
	element: HTMLElement;
}

/**
 * Generic dialog box pop up.
 */
export class ScreenDialogBox extends Panel {
	private dialogId: DialogBoxID = 0;

	private canClose: boolean = true;
	private readonly header = document.createElement('fxs-header');

	private extensions: ExtensionListItem[] = [];

	private extensionsContainer: HTMLElement | null = null;
	private buttonContainer: HTMLElement | null = null;

	private closeButtonListener = () => { this.requestClose(); }

	private engineInputListener = this.onEngineInput.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private valueChangeListener = this.onValueChange.bind(this);
	private textboxKeyupListener = this.onTextboxKeyup.bind(this);
	private textBoxTextEditStopListener = this.onTextboxEditStop.bind(this);

	private closing: boolean = false;

	private options: DialogBoxOption[] = [];
	private customOptions: DialogBoxCustom[] = [];
	private useChooserItem: boolean = false;
	private customDialog: string | null = null;
	private isBodyCentered: boolean = false;


	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToTop;
	}

	onAttach() {
		//TODO Implement the current use case for the custom dialog box as a custom component and then pull out the changes made here for custom dialogs
		super.onAttach();

		const customDialog = this.Root.getAttribute('custom');
		const frame = document.createElement("fxs-modal-frame");
		if (customDialog != "true") {
			this.header.setAttribute('filigree-style', 'h2');
			this.header.setAttribute("title", this.Root.getAttribute('title') ?? "");
			this.header.classList.add("font-title-xl", "text-secondary");
			frame.appendChild(this.header);
		}
		frame.classList.add("screen-dialog-box__dialog-wrapper");
		const componentName = this.Root.getAttribute('name');

		const frag = document.createDocumentFragment();

		if (componentName != null) {
			if (componentName == "declare-war") {
				frame.classList.add("declare-war");
			}
		}
		if (customDialog != "true") {
			frame.appendChild(this.header);
		}

		// TODO: implement custom style support here
		/*
				const customStyles = this.Root.getAttribute('customStyles');
				let defaultStylePath = '\"fs://game/core/ui/dialog-box/screen-dialog-box.css\"';
		
				if (customStyles == "true" && componentName != null) {
					const stylePath = "fs://game/base-standard/ui/diplomacy-" + componentName + "/panel-diplomacy-" + componentName + ".css"
					defaultStylePath = defaultStylePath + "," + stylePath;
				}
		
				if (customDialog == "true") {
					frame.classList.add("max-w-96");
				} */

		//TODO this needs to go into our custom area if customdialog is true also make sure we are displaying any body text that's fed into the function
		/* if (bodyAttribute != "" && customDialog) {
			const body: HTMLDivElement = document.createElement("div");
			body.classList.add('font-body', 'text-base', 'py-3\\.5');
			body.innerHTML = Locale.stylize(bodyAttribute);
			frag.appendChild(body);
		} */

		const bodyAttribute = this.Root.getAttribute('body') ?? "";
		if (customDialog != "true") {
			if (bodyAttribute != "") {
				const body: HTMLDivElement = document.createElement("div");
				body.role = "paragraph";

				body.classList.add('font-body', 'text-base', 'py-3\\.5', 'pointer-events-auto');

				body.innerHTML = Locale.stylize(bodyAttribute);

				frag.appendChild(body);
			}


			if ((this.Root.getAttribute('displayHourGlass') ?? "") == "true") {
				const hourGlass = document.createElement("fxs-flipbook");
				hourGlass.classList.add("self-center", "my-4");
				const atlas: FlipbookFrame[] = [
					{
						src: 'fs://game/hourglasses01.png',
						spriteWidth: 128,
						spriteHeight: 128,
						size: 512
					},
					{
						src: 'fs://game/hourglasses02.png',
						spriteWidth: 128,
						spriteHeight: 128,
						size: 512
					},
					{
						src: 'fs://game/hourglasses03.png',
						spriteWidth: 128,
						spriteHeight: 128,
						size: 1024,
						nFrames: 13
					}
				]
				const flipbookDefinition: FlipbookDefinition = {
					fps: 30,
					preload: true,
					atlas: atlas
				};
				hourGlass.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
				frag.appendChild(hourGlass);
			}
		}

		if (customDialog != "true") {
			this.extensionsContainer = document.createElement("fxs-vslot");
			const extensionValue: string | null = this.Root.getAttribute('extensions');
			if ((extensionValue) && (extensionValue != "undefined")) {
				const extensions: DialogBoxExtensions = JSON.parse(extensionValue);

				// add each stepper
				if (extensions.steppers) {
					for (const stepperData of extensions.steppers) {
						const stepper = document.createElement("fxs-stepper");
						stepper.classList.add("dialog-stepper");
						stepper.setAttribute("value", stepperData.stepperValue ?? "0");
						stepper.setAttribute("min-value", stepperData.stepperMinValue ?? "0");
						stepper.setAttribute("max-value", stepperData.stepperMaxValue ?? "1");
						stepper.addEventListener(ComponentValueChangeEventName, this.valueChangeListener);
						this.extensionsContainer?.appendChild(stepper);

						this.extensions.push({ id: stepperData.id, element: stepper });
					}
				}
				if (extensions.dropdowns) {
					for (const dropdownData of extensions.dropdowns) {
						const container = document.createElement('div');
						container.classList.add("flow-row", "p-4", "items-center");
						container.classList.toggle("justify-center", true);
						const label = document.createElement("div");
						label.classList.add("font-body", "text-left", 'text-lg', 'leading-9', 'max-w-174', '-mx-px', '-my-0\\.5', "mr-6");
						label.innerHTML = Locale.stylize(dropdownData.label ?? "");
						const dropdown = document.createElement('fxs-dropdown');
						dropdown.setAttribute('id', dropdownData.id);
						dropdown.setAttribute('dropdown-items', dropdownData.dropdownItems ?? "[]");
						dropdown.setAttribute('selected-item-index', dropdownData.selectedIndex ?? "0");
						dropdown.setAttribute('disabled', dropdownData.disabled ?? "");
						dropdown.setAttribute('action-key', dropdownData.actionKey ?? "");
						dropdown.setAttribute('selection-caption', dropdownData.selectionCaption ?? "");
						dropdown.setAttribute('no-selection-caption', dropdownData.noSelectionCaption ?? "");
						dropdown.addEventListener(ComponentValueChangeEventName, this.valueChangeListener);
						container.appendChild(label);
						container.appendChild(dropdown);
						this.extensionsContainer?.appendChild(container);

						this.extensions.push({ id: dropdownData.id, element: dropdown });
					}
				}
				if (extensions.textboxes) {
					for (const textboxData of extensions.textboxes) {
						const container = document.createElement('div');
						container.classList.add("flow-row", "p-4", "items-center");
						container.classList.toggle("justify-center", true);
						const label = document.createElement("div");
						label.classList.add("font-body", "text-left", 'text-lg', 'leading-9', 'max-w-174', '-mx-px', '-my-0\\.5', "mr-6");
						label.innerHTML = Locale.stylize(textboxData.label ?? "");
						const textbox = document.createElement('fxs-textbox');
						textbox.className = textboxData.classname ?? "";
						textbox.classList.add("fxs-textbox", "max-w-96");
						textbox.setAttribute('id', textboxData.id);
						textbox.setAttribute('placeholder', textboxData.placeholder ?? "");
						textbox.setAttribute('show-keyboard-on-activate', textboxData.showKeyboardOnActivate ?? "true");
						textbox.setAttribute('enabled', textboxData.enabled ?? 'true')
						textbox.setAttribute('max-length', textboxData.maxLength ?? "");
						textbox.setAttribute('value', textboxData.value ?? "");
						textbox.setAttribute('case-mode', textboxData.caseMode ?? "");
						textbox.addEventListener(ComponentValueChangeEventName, this.valueChangeListener);
						textbox.addEventListener('keyup', this.textboxKeyupListener);
						if (textboxData.editStopClose) {
							textbox.addEventListener('text-edit-stop', this.textBoxTextEditStopListener);
						}
						container.appendChild(label);
						container.appendChild(textbox);
						this.extensionsContainer?.appendChild(container);

						this.extensions.push({ id: textboxData.id, element: textbox });
					}
				}
			}

			this.buttonContainer = document.createElement("fxs-button-group");
			this.buttonContainer.classList.add("px-8");

			// Stock buttons: Close
			this.canClose = (this.Root.getAttribute('canClose') ?? "") == "true";

			if (this.canClose) {
				const closeButton = document.createElement('fxs-close-button');
				closeButton.addEventListener('action-activate', this.closeButtonListener);
				waitForLayout(() => frame.appendChild(closeButton)); // need to wait for the button to not be added within the content div
			}

			this.extensionsContainer.appendChild(this.buttonContainer);
			frag.appendChild(this.extensionsContainer);
		}
		frame.appendChild(frag);

		this.Root.appendChild(frame);
		/* if (customDialog == "true") {
			frame.classList.remove("max-w-full");
		} */
		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);

		UI.sendAudioEvent("popup-open-generic");
	}

	onDetach() {
		UI.sendAudioEvent("popup-close-generic");

		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		DialogBoxManager.closeDialogBox(this.dialogId);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		if (this.extensions.length != 0 && this.extensionsContainer) {
			FocusManager.setFocus(this.extensionsContainer);
		} else {
			FocusManager.setFocus(this.Root);
		}
	}

	setDialogId(dialogId: DialogBoxID) {
		this.dialogId = dialogId;
	}

	setOptions(definition: DialogBoxDefinition, options: DialogBoxOption[], customOptions: DialogBoxCustom[]) {

		//TODO: if we're using custom options, draw the dialog box with what I've set, if we're using chooser-items draw the button container and extensions and populate that info as well. Also we need to move the close button up to the top right flushhh
		this.customDialog = this.Root.getAttribute('custom');
		if (this.customDialog == "true") {
			this.options = options;
			this.customOptions = customOptions;
			this.useChooserItem = false;
			this.isBodyCentered = this.Root.getAttribute('isBodyCentered') == "true";
			const customDialogWrapper = MustGetElement(".screen-dialog-box__dialog-wrapper", this.Root);

			if (this.customDialog == "true" && this.customOptions.length > 0) {
				const body = document.createElement("fxs-hslot");
				body.classList.add("pb-4");
				/// put in the custom layout code, image then button
				for (let i = 0; i < this.customOptions.length; i++) {
					const customOption = this.customOptions[i];
					const dialogText = customOption.layoutBodyWrapper;
					const dialogImage = customOption.layoutImageWrapper;
					if (customOption.useChooserItem) {
						this.useChooserItem = customOption.useChooserItem;
					}
					if (dialogText || dialogImage) {
						if (dialogImage) {
							body.appendChild(dialogImage);
						}
						if (dialogText) {
							body.appendChild(dialogText);
						}
						customDialogWrapper.appendChild(body);
					}

				}
			}

			this.extensionsContainer = document.createElement("fxs-vslot");
			const extensionValue: string | null = this.Root.getAttribute('extensions');
			if ((extensionValue) && (extensionValue != "undefined")) {
				const extensions: DialogBoxExtensions = JSON.parse(extensionValue);

				// add each stepper
				if (extensions.steppers) {
					for (const stepperData of extensions.steppers) {
						const stepper = document.createElement("fxs-stepper");
						stepper.classList.add("dialog-stepper");
						stepper.setAttribute("value", stepperData.stepperValue ?? "0");
						stepper.setAttribute("min-value", stepperData.stepperMinValue ?? "0");
						stepper.setAttribute("max-value", stepperData.stepperMaxValue ?? "1");
						stepper.addEventListener(ComponentValueChangeEventName, this.valueChangeListener);
						this.extensionsContainer?.appendChild(stepper);

						this.extensions.push({ id: stepperData.id, element: stepper });
					}
				}
				if (extensions.dropdowns) {
					for (const dropdownData of extensions.dropdowns) {
						const container = document.createElement('div');
						container.classList.add("flow-row", "p-4", "items-center");
						container.classList.toggle("justify-center", this.isBodyCentered);
						const label = document.createElement("div");
						label.classList.add("font-body", "text-left", 'text-lg', 'leading-9', 'max-w-174', '-mx-px', '-my-0\\.5', "mr-6");
						label.innerHTML = Locale.stylize(dropdownData.label ?? "");
						const dropdown = document.createElement('fxs-dropdown');
						dropdown.setAttribute('id', dropdownData.id);
						dropdown.setAttribute('dropdown-items', dropdownData.dropdownItems ?? "[]");
						dropdown.setAttribute('selected-item-index', dropdownData.selectedIndex ?? "0");
						dropdown.setAttribute('disabled', dropdownData.disabled ?? "");
						dropdown.setAttribute('action-key', dropdownData.actionKey ?? "");
						dropdown.setAttribute('selection-caption', dropdownData.selectionCaption ?? "");
						dropdown.setAttribute('no-selection-caption', dropdownData.noSelectionCaption ?? "");
						dropdown.addEventListener(ComponentValueChangeEventName, this.valueChangeListener);
						container.appendChild(label);
						container.appendChild(dropdown);
						this.extensionsContainer?.appendChild(container);

						this.extensions.push({ id: dropdownData.id, element: dropdown });
					}
				}
				if (extensions.textboxes) {
					for (const textboxData of extensions.textboxes) {
						const container = document.createElement('div');
						container.classList.add("flow-row", "p-4", "items-center");
						container.classList.toggle("justify-center", this.isBodyCentered);
						const label = document.createElement("div");
						label.classList.add("font-body", "text-left", 'text-lg', 'leading-9', 'max-w-174', '-mx-px', '-my-0\\.5', "mr-6");
						label.innerHTML = Locale.stylize(textboxData.label ?? "");
						const textbox = document.createElement('fxs-textbox');
						textbox.className = textboxData.classname ?? "";
						textbox.classList.add("fxs-textbox", "max-w-96");
						textbox.setAttribute('id', textboxData.id);
						textbox.setAttribute('placeholder', textboxData.placeholder ?? "");
						textbox.setAttribute('show-keyboard-on-activate', textboxData.showKeyboardOnActivate ?? "true");
						textbox.setAttribute('enabled', textboxData.enabled ?? 'true')
						textbox.setAttribute('max-length', textboxData.maxLength ?? "");
						textbox.setAttribute('value', textboxData.value ?? "");
						textbox.addEventListener(ComponentValueChangeEventName, this.valueChangeListener);
						textbox.addEventListener('keyup', this.textboxKeyupListener);
						if (textboxData.editStopClose) {
							textbox.addEventListener('text-edit-stop', this.textBoxTextEditStopListener);
						}
						container.appendChild(label);
						container.appendChild(textbox);
						this.extensionsContainer?.appendChild(container);

						this.extensions.push({ id: textboxData.id, element: textbox });
					}
				}
			}

			if (this.useChooserItem != true) {
				this.buttonContainer = document.createElement("fxs-button-group");
			}
			else {
				this.buttonContainer = document.createElement("div");
			}

			this.extensionsContainer.classList.add("pl-40");
			this.buttonContainer.classList.add("self-center");

			// Stock buttons: Close
			this.canClose = (this.Root.getAttribute('canClose') ?? "") == "true";

			if (this.canClose) {
				const declareWarFrame = MustGetElement(".screen-dialog-box__dialog-wrapper", this.Root);
				const closeButton = document.createElement('fxs-close-button');
				closeButton.addEventListener('action-activate', this.closeButtonListener);
				closeButton.classList.add("top-1", "right-1");
				declareWarFrame.appendChild(closeButton);
			}

			this.extensionsContainer.appendChild(this.buttonContainer);

			/// everything above here gets bumped if it's custom
			if (this.extensionsContainer) {
				customDialogWrapper.appendChild(this.extensionsContainer);
			}
			if (this.useChooserItem == false) {
				// Variable options (including default 'Confirm' if any)
				for (let i = 0; i < this.options.length; i++) {
					const option = this.options[i];
					const optionButton = document.createElement("fxs-button");
					optionButton.setAttribute('type', 'big');
					optionButton.setAttribute('caption', option.label);

					for (let j = 0; j < this.options[i].actions.length; j++) {
						const actionKey = `inline-${option.actions[j]}`;
						if (FxsNavHelp.getGamepadActionName(actionKey)) {
							optionButton.setAttribute("action-key", actionKey);
							break;
						}
					}

					if (option.disabled) {
						optionButton.setAttribute('disabled', 'true');
					}
					if (option.tooltip) {
						optionButton.setAttribute("data-tooltip-content", option.tooltip);
					}
					waitForLayout(() => optionButton.removeAttribute("tabindex"));
					optionButton.addEventListener('action-activate', () => { this.onOption(option); });
					this.buttonContainer?.appendChild(optionButton);
				}
			}

			else {
				// Variable options (including default 'Confirm' if any)
				const chooserItemsWrapper = document.createElement("fxs-hslot");
				chooserItemsWrapper.classList.add("w-full", "justify-center");
				customDialogWrapper.appendChild(chooserItemsWrapper);
				for (let i = 0; i < this.customOptions.length; i++) {
					const customOption = this.customOptions[i];
					const chooserItemElement = customOption.chooserInfo;
					if (chooserItemElement) {
						const newElement = chooserItemElement;
						chooserItemsWrapper.appendChild(newElement);
					}
					if (customOption.cancelChooser == true) {
						// chooser items here
						const cancelButton = document.createElement("chooser-item");
						cancelButton.classList.add("panel-diplomacy-declare-war__button-cancel", "chooser-item_unlocked", "w-1\\/2", "min-h-16", "h-full", "flow-row", "py-2", "items-center");
						cancelButton.setAttribute('disabled', 'false');
						cancelButton.setAttribute("tabindex", "-1");
						cancelButton.addEventListener('action-activate', this.closeButtonListener);

						// set the button information
						const radialBG = document.createElement("div");
						radialBG.classList.add("panel-diplomacy-declare-war__radial-bg", "absolute", "bg-cover", "size-16", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "opacity-1");
						const radialBGHover = document.createElement("div");
						radialBGHover.classList.add("panel-diplomacy-declare-war__radial-bg-hover", "absolute", "opacity-0", "bg-cover", "size-16", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100");

						cancelButton.appendChild(radialBG);
						cancelButton.appendChild(radialBGHover);
						const cancelIconWrapper = document.createElement("div");
						cancelIconWrapper.classList.add("absolute", "size-16", "bg-cover", "panel-diplomacy-declare-war__war-icon-wrapper");
						let cancelIcon = document.createElement("img");
						cancelIcon.classList.add("flex", "mt-2", "ml-2", "size-12");
						cancelIcon.setAttribute("src", UI.getIconURL("DIPLOMACY_CANCEL_DEAL_ICON"));

						cancelIconWrapper.appendChild(cancelIcon);
						cancelButton.appendChild(cancelIconWrapper);
						const cancelDescription = document.createElement("div");
						cancelDescription.classList.add("absolute", "ml-18", "self-center", "font-title", "uppercase", "font-normal", "tracking-100");

						cancelDescription.setAttribute('data-l10n-id', "LOC_DIPLOMACY_DEAL_CANCEL");

						cancelButton.appendChild(cancelDescription);
						chooserItemsWrapper.appendChild(cancelButton);
					}
				}
				for (let i = 0; i < this.options.length; i++) {
					const option = this.options[i];
					const theChooserButton = MustGetElement(".panel-diplomacy-declare-war__button-declare-war", this.Root);
					theChooserButton.addEventListener('action-activate', () => { this.onOption(option); });
					// theChooserButton.setAttribute('data-audio-group-ref', 'audio-diplo-project-reaction');
					// theChooserButton.setAttribute('data-audio-activate-ref', 'data-audio-leader-declare-war');
				}
				const firstSlot = MustGetElement(".panel-diplomacy-declare-war__button-declare-war", this.Root);
				FocusManager.setFocus(firstSlot);
			}
		}
		else {

			this.options = options;

			const verticalLayout = definition.layout == "vertical";

			if (verticalLayout) {
				this.buttonContainer = document.createElement("div");
				this.buttonContainer.classList.add("flex flex-col mx-2");
				this.extensionsContainer?.appendChild(this.buttonContainer);
			} else if (this.options.length > 2) {
				this.buttonContainer?.classList.add("multi-button-container");
			}

			// Variable options (including default 'Confirm' if any)
			for (let i = 0; i < this.options.length; i++) {
				const option = this.options[i];
				const optionButton = document.createElement("fxs-button");
				optionButton.setAttribute('type', 'big');
				optionButton.setAttribute('caption', option.label);

				if (verticalLayout) {
					optionButton.classList.add("mb-2");
				} else if (i < this.options.length - 1) {
					optionButton.classList.add('mr-4');
				}

				for (let j = 0; j < this.options[i].actions.length; j++) {
					const actionKey = `inline-${option.actions[j]}`;
					if (FxsNavHelp.getGamepadActionName(actionKey)) {
						optionButton.setAttribute("action-key", actionKey);
						break;
					}
				}

				if (option.disabled) {
					optionButton.setAttribute('disabled', 'true');
				}
				if (option.tooltip) {
					optionButton.setAttribute("data-tooltip-content", option.tooltip);
				}
				waitForLayout(() => optionButton.removeAttribute("tabindex"));
				optionButton.addEventListener('action-activate', () => { this.onOption(option); });
				this.buttonContainer?.appendChild(optionButton);
			}
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {

		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		for (let i = 0; i < this.options.length; i++) {
			const button = this.buttonContainer?.querySelector(`fxs-button[caption='${this.options[i].label}']`);
			const isDisabled = button?.getAttribute("disabled") == "true";
			if (!isDisabled) {
				for (let j = 0; j < this.options[i].actions.length; j++) {
					if (this.options[i].actions[j] == inputEvent.detail.name) {
						this.onOption(this.options[i], inputEvent);
						return;
					}
				}
			}
		}

		if (inputEvent.isCancelInput()) {
			if (this.canClose) {
				this.requestClose(inputEvent);
			}
		}
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		// We shouldn't be able to navigate outside a dialog box so stop event propagation
		navigationEvent.preventDefault();
		navigationEvent.stopImmediatePropagation();
	}

	protected requestClose(inputEvent?: InputEngineEvent) {
		if (this.canClose) {
			inputEvent?.stopPropagation();
			inputEvent?.preventDefault();

			this.close();
		} else {
			console.error("screen-dialog-box, requestClose(): Incoherence: canClose is false!")
		}
	}

	private onValueChange({ detail: { value }, target }: ComponentValueChangeEvent<{ value: string }>) {
		this.options.forEach(({ valueChangeCallback, label }) => {
			if (valueChangeCallback) {
				valueChangeCallback((target as HTMLElement).id, value, this.buttonContainer?.querySelector(`fxs-button[caption='${label}']`) || undefined);
			}
		})
	}

	private onOption(option: DialogBoxOption, inputEvent?: InputEngineEvent) {

		if (this.closing) {
			return;
		}

		inputEvent?.stopPropagation();
		inputEvent?.preventDefault();

		// Send back the final value of each extension if there's a value callback
		this.extensions?.forEach(extension => {
			// all fxs-* components with a value store it in the "value" attribute, so there's no need (hopefully) to check the class here
			const extensionValue: string | null | undefined = extension.element.getAttribute('value') || extension.element.getAttribute('selected-item-index');
			if (extensionValue && option.valueCallback) {
				option.valueCallback(extension.id, extensionValue);
			}
		});

		if (option.callback) {
			option.callback(DialogBoxAction.Confirm);
		}
		this.close();
	}

	public close() {
		if (!this.closing) {
			this.closing = true;
			super.close();
		}
	}

	private onTextboxKeyup({ code }: KeyboardEvent) {
		if (code == 'Enter') {
			for (const option of this.options) {
				if (option.actions.includes('keyboard-enter')) {
					this.onOption(option);
					return;
				}
			}
		}
	}

	private onTextboxEditStop({ detail }: TextBoxTextEditStopEvent) {
		if (!detail.confirmed)
			this.close();
	}

	//TODO: do we need to update data and refresh visuals on attributes changed? 
	onAttributeChanged(name: string, _oldValue: string, newValue: string) {
		switch (name) {
			case 'title':
				this.header?.setAttribute('title', newValue);
				break;
		}
	}
}

Controls.define('screen-dialog-box', {
	createInstance: ScreenDialogBox,
	description: 'Generic dialog box pop up.',
	classNames: ['screen-dialog-box', 'fullscreen'],
	styles: ["fs://game/core/ui/dialog-box/screen-dialog-box.css", "fs://game/base-standard/ui/diplomacy-declare-war/panel-diplomacy-declare-war.css"],
	images: [
		"fs://game/HourGlass.png"
	],
	attributes: [
		{
			name: 'title'
		},
		{
			name: 'subtitle'
		},
		{
			name: 'canClose'
		}
	],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		'screen-dialog-box': ComponentRoot<ScreenDialogBox>;
	}
}
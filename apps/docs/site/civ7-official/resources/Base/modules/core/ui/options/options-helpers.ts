/**
 * @file options-helpers.ts
 * @copyright 2023, Firaxis Games
 * @description common types and shared functions supporting the options screen/model.
 */

import { DropdownItem } from '/core/ui/components/fxs-dropdown.js';
import { PushProperties } from '/core/ui/context-manager/context-manager.js'
import DialogManager, { DialogBoxCallbackSignature, DialogBoxOption } from '/core/ui/dialog-box/manager-dialog-box.js';
import { Options, OptionType, GameCoreOptionCategory } from '/core/ui/options/model-options.js';
import ActionHandler from '/core/ui/input/action-handler.js';


export { OptionType };

export enum CategoryType {
	Accessibility = "accessibility",
	Audio = "audio",
	Game = "game",
	Graphics = "graphics",
	Input = "input",
	System = "system",
	Interface = "interface"
}

type NonEditorOption = Exclude<OptionInfo, { type: OptionType.Editor }>;
/**
 * OptionInitHandler should read the option's value from its source and set the OptionInfo's currentValue field.
 */
export type OptionInitHandler<O extends NonEditorOption = NonEditorOption> = (optionInfo: O) => void;
/**
 * OptionUpdateHandler is called when the user changes the option's value.
 */
export type OptionUpdateHandler<O extends NonEditorOption = NonEditorOption> = (optionInfo: O, value: Exclude<O['currentValue'], undefined>) => void;
/**
 * EditorOptionActivateHandler is called when the user activates the editor button.
 * 
 * The return value is optionally used to determine whether or not the editor should be opened.
 */
export type EditorOptionActivateHandler = () => boolean | undefined;

/**
 * OptionRestoreHandler is called when the user cancel's their changes.
 * 
 * It should read in the configuration from the source and apply it to the UI.
 * This is used for configuration options where GameCore holds the value, but the value must be realized within the UI (e.g., UI scale).
 */
export type OptionRestoreHandler<O extends OptionInfo = OptionInfo> = (optionInfo: O) => void;

export type OptionCategoryGroup = 'advanced' | 'advisors' | 'autosaves' | 'camera' | 'controls' | 'extras' | 'gamepad' | 'general' | 'mouse' | 'subtitles' | 'timeofday' | 'touch' | 'tutorial' | 'volume';
export type OptionValue = string | number | boolean;

type Option<
	Type extends OptionType,
	Value extends OptionValue
> = {

	/** category determines what tab the option can be found under. */
	category: CategoryType;

	currentValue?: Value;

	/**
	 * group is used to render related options in the same category together.
	 */
	group?: OptionCategoryGroup;
	type: Type;

	/**
	 * id is used to identify the option in the backing data and in the UI.
	 */
	id: string;

	/**
	 * label is the localization key for the option's label
	 */
	label: string;

	/**
	 * description is the localization key for the tooltip text
	 */
	description?: string;
	isDisabled?: boolean;
	isHidden?: boolean;

	initListener?: Type extends OptionType.Editor ? never : OptionInitHandler;
	updateListener?: Type extends OptionType.Editor ? never : OptionUpdateHandler;
	restoreListener?: OptionRestoreHandler;

	forceRender?: () => void;
}

export type CheckboxInfo = Option<OptionType.Checkbox, boolean>;
export type AdvancedCheckboxInfo = CheckboxInfo & {
	optionSet: string;
	optionType: string;
	optionName: string;
}

export type SwitchInfo = Option<OptionType.Switch, boolean>

export type StepperInfo = Option<OptionType.Stepper, number> & {
	min?: number;
	max?: number;
	steps?: number;
	originalValue?: number;
	formattedValue?: string;
}

export type SliderInfo = Option<OptionType.Slider, number> & {
	min?: number;
	max?: number;
	steps?: number;
	originalValue?: number;
	formattedValue?: string;

	/** sliderValue is the text representation of the slider value. */
	sliderValue?: HTMLElement;
}

export type EditorInfo = Option<OptionType.Editor, never> & {
	/** caption is the loc string used on the button which opens the editor */
	caption?: string;

	/** 
	 * editorTagName is the tagname of the custom element to create when the button for this option in clicked.
	 * 
	 * Add your custom element to the HTMLElementTagNameMap interface via declaration merging.
	 */
	editorTagName: keyof HTMLElementTagNameMap
	pushProperties?: PushProperties<never, object>

	activateListener?: EditorOptionActivateHandler
}

export type DropdownInfo = Option<OptionType.Dropdown, number> & {
	selectedItemIndex?: number;
	dropdownItems?: DropdownItem[];
	originalValue?: number;
}

export type OptionInfo = |
	EditorInfo |
	CheckboxInfo |
	AdvancedCheckboxInfo |
	DropdownInfo |
	SliderInfo |
	StepperInfo |
	SwitchInfo;

export type OptionComponent = ReturnType<typeof createOptionComponentInternal>;

const createOptionComponentInternal = (optionInfo: OptionInfo) => {
	switch (optionInfo.type) {
		case OptionType.Editor:
			const btn = document.createElement("fxs-button");
			btn.setAttribute("data-audio-group-ref", "options");
			switch (optionInfo.id) {
				case 'option-language-select':
					btn.setAttribute("data-audio-activate", "options-select-language");
					break;

				case 'option-remap-kbm':
				case 'option-remap-controller':
					btn.setAttribute("data-audio-activate", "options-configure-controller");
					break;

				default:
					break;
			}
			btn.setAttribute("optionID", optionInfo.id);
			if (optionInfo.caption) {
				btn.setAttribute("caption", Locale.compose(optionInfo.caption));
			}
			return btn;

		case OptionType.Checkbox:
			const cb = document.createElement("fxs-checkbox");
			cb.setAttribute("data-audio-group-ref", "options");

			cb.setAttribute("optionID", optionInfo.id);
			cb.setAttribute("selected", `${optionInfo.currentValue}`);
			return cb;

		case OptionType.Dropdown:
			const dd = document.createElement("fxs-dropdown");
			dd.classList.add("w-80");
			dd.setAttribute("optionID", optionInfo.id);
			dd.setAttribute("dropdown-items", JSON.stringify(optionInfo.dropdownItems));
			if (optionInfo.dropdownItems?.length) {
				dd.setAttribute("selected-item-index", optionInfo.selectedItemIndex?.toString() ?? "0");
			} else {
				console.error(`options-helpers: createOptionComponentInternal(): cannot select item index ${optionInfo.selectedItemIndex?.toString() ?? "0"} on empty dropdownItems array of option id: ${optionInfo.id}, label: ${optionInfo.label}`);
			}
			return dd;

		case OptionType.Slider:
			const slider = document.createElement("fxs-slider");

			slider.setAttribute("optionID", optionInfo.id);
			slider.setAttribute("value", `${optionInfo.currentValue ?? 0}`);
			slider.setAttribute("min", `${optionInfo.min ?? 0}`);
			slider.setAttribute("max", `${optionInfo.max ?? 1}`);
			slider.setAttribute("steps", `${optionInfo.steps ?? 0}`);
			return slider;

		case OptionType.Stepper:
			const st = document.createElement("fxs-stepper");

			st.setAttribute("optionID", optionInfo.id);
			st.setAttribute("value", `${optionInfo.currentValue ?? 0}`);
			st.setAttribute("min-value", `${optionInfo.min ?? 0}`);
			st.setAttribute("max-value", `${optionInfo.max ?? 0}`);
			return st;

		case OptionType.Switch:
			const sw = document.createElement("fxs-switch");

			sw.setAttribute("optionID", optionInfo.id);
			sw.setAttribute("selected", optionInfo.currentValue ? 'true' : 'false');
			return sw;
		default:
			throw new Error(`Unhandled option type: ${optionInfo satisfies never}`);
	}
}

/**
 * CreateOptionComponent creates the corresponding UI component for the given option data.
 */
export const CreateOptionComponent = (option: OptionInfo) => {
	const element = createOptionComponentInternal(option);
	element.setAttribute("data-audio-group-ref", "options");
	switch (option.type) {
		case OptionType.Checkbox:
			break;

		case OptionType.Editor:
			break;

		default:
			break;
	}
	element.setAttribute("disabled", option.isDisabled ? "true" : "false");
	if (!ActionHandler.isGamepadActive) {
		element.setAttribute("data-audio-focus-ref", "none");
	}
	else {
		//the primary button will override the sounds unless we do this
		element.setAttribute("data-audio-focus-ref", "data-audio-focus");
	}
	return element;
}

export const CategoryData = {
	[CategoryType.Accessibility]: {
		title: "LOC_OPTIONS_CATEGORY_ACCESSIBILITY",
		description: "LOC_OPTIONS_CATEGORY_ACCESSIBILITY_DESCRIPTION"
	},
	[CategoryType.Audio]: {
		title: "LOC_OPTIONS_CATEGORY_AUDIO",
		description: "LOC_OPTIONS_CATEGORY_AUDIO_DESCRIPTION"
	},
	[CategoryType.Game]: {
		title: "LOC_OPTIONS_CATEGORY_GAME",
		description: "LOC_OPTIONS_CATEGORY_GAME_DESCRIPTION"
	},
	[CategoryType.Graphics]: {
		title: "LOC_OPTIONS_CATEGORY_GRAPHICS",
		description: "LOC_OPTIONS_CATEGORY_GRAPHICS_DESCRIPTION"
	},
	[CategoryType.Input]: {
		title: "LOC_OPTIONS_CATEGORY_INPUT",
		description: "LOC_OPTIONS_CATEGORY_INPUT_DESCRIPTION"
	},
	[CategoryType.System]: {
		title: "LOC_OPTIONS_CATEGORY_SYSTEM",
		description: "LOC_OPTIONS_CATEGORY_SYSTEM_DESCRIPTION"
	},
	[CategoryType.Interface]: {
		title: "LOC_OPTIONS_CATEGORY_INTERFACE",
		description: "LOC_OPTIONS_CATEGORY_INTERFACE_DESCRIPTION"
	}
} as const;

export const GetGroupLocKey = (group: OptionCategoryGroup) => {
	if (group == 'extras') {
		return `LOC_MAIN_MENU_EXTRAS`;
	}

	const suffix = group.toUpperCase() as Uppercase<OptionCategoryGroup>;
	return `LOC_OPTIONS_GROUP_${suffix}` as const;
}

/**
 * @param closeCallback callback to close the UI associated with this prompt
 * @param restoreCategory the category to restore if the user cancels the prompt
 */
export const ShowReloadUIPrompt = (closeCallback?: () => void, restoreCategory?: GameCoreOptionCategory) => {
	const acceptCallback: DialogBoxCallbackSignature = () => {
		Options.commitOptions();
		closeCallback?.();
	}
	const acceptOption: DialogBoxOption = {
		actions: ["accept"],
		label: "LOC_OPTIONS_RELOAD_WARN_CONTINUE",
		callback: acceptCallback,
	}

	const cancelCallback: DialogBoxCallbackSignature = () => {
		Options.restore(restoreCategory);
		closeCallback?.();
	}

	const cancelOption: DialogBoxOption = {
		actions: ["cancel", "keyboard-escape"],
		label: "LOC_OPTIONS_RELOAD_WARN_ABANDON_CHANGES",
		callback: cancelCallback,
	}

	DialogManager.createDialog_MultiOption({
		body: "LOC_OPTIONS_RELOAD_WARN_BODY",
		title: "LOC_OPTIONS_RELOAD_WARN_TITLE",
		options: [cancelOption, acceptOption],
		canClose: false
	});
}

/**
 * @param closeCallback callback to close the UI associated with this prompt
 */
export const ShowRestartGamePrompt = (closeCallback?: () => void) => {
	DialogManager.createDialog_Confirm({
		title: "LOC_OPTIONS_RESTART_TITLE",
		body: "LOC_OPTIONS_RESTART_BODY",
		callback: () => {
			Options.commitOptions();
			closeCallback?.();
		}
	});
}
/**
 * @file options-helpers.ts
 * @copyright 2023, Firaxis Games
 * @description common types and shared functions supporting the options screen/model.
 */
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { Options, OptionType } from '/core/ui/options/model-options.js';
import ActionHandler from '/core/ui/input/action-handler.js';
export { OptionType };
export var CategoryType;
(function (CategoryType) {
    CategoryType["Accessibility"] = "accessibility";
    CategoryType["Audio"] = "audio";
    CategoryType["Game"] = "game";
    CategoryType["Graphics"] = "graphics";
    CategoryType["Input"] = "input";
    CategoryType["System"] = "system";
    CategoryType["Interface"] = "interface";
})(CategoryType || (CategoryType = {}));
const createOptionComponentInternal = (optionInfo) => {
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
            }
            else {
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
            throw new Error(`Unhandled option type: ${optionInfo}`);
    }
};
/**
 * CreateOptionComponent creates the corresponding UI component for the given option data.
 */
export const CreateOptionComponent = (option) => {
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
};
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
};
export const GetGroupLocKey = (group) => {
    if (group == 'extras') {
        return `LOC_MAIN_MENU_EXTRAS`;
    }
    const suffix = group.toUpperCase();
    return `LOC_OPTIONS_GROUP_${suffix}`;
};
/**
 * @param closeCallback callback to close the UI associated with this prompt
 * @param restoreCategory the category to restore if the user cancels the prompt
 */
export const ShowReloadUIPrompt = (closeCallback, restoreCategory) => {
    const acceptCallback = () => {
        Options.commitOptions();
        closeCallback?.();
    };
    const acceptOption = {
        actions: ["accept"],
        label: "LOC_OPTIONS_RELOAD_WARN_CONTINUE",
        callback: acceptCallback,
    };
    const cancelCallback = () => {
        Options.restore(restoreCategory);
        closeCallback?.();
    };
    const cancelOption = {
        actions: ["cancel", "keyboard-escape"],
        label: "LOC_OPTIONS_RELOAD_WARN_ABANDON_CHANGES",
        callback: cancelCallback,
    };
    DialogManager.createDialog_MultiOption({
        body: "LOC_OPTIONS_RELOAD_WARN_BODY",
        title: "LOC_OPTIONS_RELOAD_WARN_TITLE",
        options: [cancelOption, acceptOption],
        canClose: false
    });
};
/**
 * @param closeCallback callback to close the UI associated with this prompt
 */
export const ShowRestartGamePrompt = (closeCallback) => {
    DialogManager.createDialog_Confirm({
        title: "LOC_OPTIONS_RESTART_TITLE",
        body: "LOC_OPTIONS_RESTART_BODY",
        callback: () => {
            Options.commitOptions();
            closeCallback?.();
        }
    });
};

//# sourceMappingURL=file:///core/ui/options/options-helpers.js.map

/**
 * @file screen-options.ts
 * @copyright 2020-2023, Firaxis Games
 * @description The view portion of the options/setting screen.
 */

import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import FxsButton from '/core/ui/components/fxs-button.js';
import { CheckboxValueChangeEvent, FxsCheckbox } from '/core/ui/components/fxs-checkbox.js';
import DialogManager, { DialogBoxAction, DialogBoxCallbackSignature, DialogBoxID } from '/core/ui/dialog-box/manager-dialog-box.js'
import { DropdownSelectionChangeEvent, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import { FxsScrollable } from '/core/ui/components/fxs-scrollable.js';
import { FxsSlider, SliderValueChangeEvent } from '/core/ui/components/fxs-slider.js';
import { FxsStepper } from '/core/ui/components/fxs-stepper.js';
import { FxsSwitch, SwitchValueChangeEvent } from '/core/ui/components/fxs-switch.js'
import { FxsTabBar, TabItem, TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import ContextManager, { PushProperties } from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Options from '/core/ui/options/model-options.js';
import { CategoryData, CategoryType, OptionInfo, OptionType, ShowReloadUIPrompt, ShowRestartGamePrompt } from '/core/ui/options/options-helpers.js';
import '/core/ui/options/options.js';
import '/core/ui/options/screen-options-category.js';
import { ScreenOptionsCategory } from '/core/ui/options/screen-options-category.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';
import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';

type OptionsTabItem = TabItem & { category: CategoryType };
const DEFAULT_PUSH_PROPERTIES = {
	singleton: true,
	createMouseGuard: true
} as const satisfies PushProperties;

/**
 * Display and modify the game options.
 */

export class ScreenOptions extends Panel {

	private panels: ComponentRoot<ScreenOptionsCategory>[] = [];
	private tabData: OptionsTabItem[] = [];
	private tabControl?: ComponentRoot<FxsTabBar>;
	private readonly slotGroup = document.createElement('fxs-slot-group');

	private scrollable?: ComponentRoot<FxsScrollable>;
	private cancelButton?: ComponentRoot<FxsButton>;
	private defaultsButton?: ComponentRoot<FxsButton>;
	private confirmButton?: ComponentRoot<FxsButton>;
	private dialogId: DialogBoxID = displayRequestUniqueId();

	onInitialize() {
		super.onInitialize();

		Options.init();
		// Initialize options data on panel initialization
		for (const option of Options.data.values()) {
			option.initListener?.(option);
		}
		Options.saveCheckpoints();

		this.render();
	}

	onAttach() {
		this.enableCloseSound = true;
		//open sound is false on purpose
		this.Root.setAttribute("data-audio-group-ref", "options");

		super.onAttach();

		this.cancelButton?.addEventListener('action-activate', this.onCancelOptions);
		this.cancelButton?.setAttribute("data-audio-focus-ref", "data-audio-hero-focus");

		this.defaultsButton?.addEventListener('action-activate', this.onDefaultOptions);
		this.defaultsButton?.setAttribute("data-audio-focus-ref", "data-audio-hero-focus");
		this.confirmButton?.addEventListener('action-activate', this.onConfirmOptions);
		this.defaultsButton?.setAttribute("data-audio-focus-ref", "data-audio-hero-focus");
		this.Root.addEventListener(InputEngineEventName, this.onEngineInput);

		const uiViewExperienceIsMobile: boolean = UI.getViewExperience() == UIViewExperience.Mobile;
		const optionFrame = MustGetElement(".option-frame", this.Root);
		optionFrame.classList.toggle("size-full", uiViewExperienceIsMobile);
		optionFrame.setAttribute("outside-safezone-mode", uiViewExperienceIsMobile ? "full" : "vertical");
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.onEngineInput);
		this.cancelButton?.removeEventListener('action-activate', this.onCancelOptions);
		this.defaultsButton?.removeEventListener('action-activate', this.onDefaultOptions);
		this.confirmButton?.removeEventListener('action-activate', this.onConfirmOptions);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericCancel();
		NavTray.addOrUpdateShellAction1("LOC_OPTIONS_CONFIRM_CHANGES");
		NavTray.addOrUpdateShellAction2("LOC_OPTIONS_RESET_TO_DEFAULTS");

		// Keep a record of the current volumes so they can be restored if "Reset to Defaults" or "Cancel Changes" are clicked.
		Sound.volumeSetCheckpoint();

		waitForLayout(() => {
			FocusManager.setFocus(this.slotGroup);
		});
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onDefaultOptions = () => {
		const defaultCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
			if (eAction == DialogBoxAction.Confirm) {
				Options.resetOptionsToDefault();	// reset all values to engine-defined defaults
				VisualRemaps.resetToDefaults();
				window.dispatchEvent(new MainMenuReturnEvent());
				this.close();
			}
		}

		DialogManager.createDialog_ConfirmCancel({
			body: "LOC_OPTIONS_ARE_YOU_SURE_DEFAULT",
			title: "LOC_OPTIONS_DEFAULT",
			canClose: false,
			displayQueue: "SystemMessage",
			addToFront: true,
			callback: defaultCallback
		});
	}

	private onCancelOptions = () => {
		const cancelCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
			if (eAction == DialogBoxAction.Confirm) {
				Options.restore();  // restore previous values
				VisualRemaps.revertUnsavedChanges();
				window.dispatchEvent(new MainMenuReturnEvent());
				this.close();
			}
		}

		if (Options.hasChanges() || VisualRemaps.hasUnsavedChanges()) {
			// There are pending changes that weren't applied, warn the user that they will be reverted
			DialogManager.createDialog_ConfirmCancel({
				dialogId: this.dialogId,
				body: "LOC_OPTIONS_REVERT_DESCRIPTION",
				title: "LOC_OPTIONS_CANCEL_CHANGES",
				canClose: false,
				displayQueue: "SystemMessage",
				addToFront: true,
				callback: cancelCallback
			});
		} else {
			// No options were changed, close the options panel immediately
			window.dispatchEvent(new MainMenuReturnEvent());
			this.close();
		}
	}

	private onConfirmOptions = () => {
		const closeFn = this.close.bind(this);
		if (Options.isUIReloadRequired() && UI.isInGame()) {
			ShowReloadUIPrompt(closeFn);
		} else if (Options.isRestartRequired()) {
			ShowRestartGamePrompt(closeFn);
		} else {
			Options.commitOptions();
			VisualRemaps.saveConfiguration();
			// trigger update and force completion for current tutorial items
			engine.trigger('update-tutorial-level');
			engine.trigger('UIFontScaleChanged');
			engine.trigger('UIGlobalScaleChanged');
			engine.trigger('UI_OptionsChanged');
			window.dispatchEvent(new MainMenuReturnEvent());
			this.close();
		}
	}

	private onEngineInput = (inputEvent: InputEngineEvent) => {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput()) {
			this.onCancelOptions();
			inputEvent.preventDefault();
			inputEvent.stopPropagation();
		}

		switch (inputEvent.detail.name) {
			case 'shell-action-1':
				this.onConfirmOptions();
				inputEvent.preventDefault();
				inputEvent.stopPropagation();
				break;
			case 'shell-action-2':
				this.onDefaultOptions();
				inputEvent.preventDefault();
				inputEvent.stopPropagation();
				break;
		}
	}

	private onOptionsTabSelected = (e: TabSelectedEvent) => {
		e.stopPropagation();

		const { index } = e.detail;
		const slotId = this.panels[index].id;
		this.slotGroup.setAttribute('selected-slot', slotId);
	}

	private handleForceRenderOptions(optionElement: HTMLElement, _component: Component, option: OptionInfo) {
		optionElement.classList.toggle("hidden", option.isHidden ?? false);
	}

	private onUpdateOptionValue(optionElement: HTMLElement, component: Component, option: OptionInfo) {
		// Each change listener will increment changeRefCount to avoid a cancel popup if nothing was changed
		// TODO skip incrementing if that option is already changed, and decrement if it returns to its original value

		switch (option.type) {
			// TODO: Add cases for other component types used
			case OptionType.Editor:
				component.Root.addEventListener("action-activate", (_event: ActionActivateEvent) => {
					const pushProperties = option.pushProperties ?? DEFAULT_PUSH_PROPERTIES;

					// Push the editor if the callback returns undefined or false, the editor will be pushed.
					const activateResult = option.activateListener?.();
					if (option.editorTagName && (activateResult === undefined || activateResult === false)) {
						ContextManager.push(option.editorTagName, pushProperties);
					}

					Options.incRefCount(); // TODO only increment if the editor actually changes a setting
				});
				break;

			case OptionType.Dropdown:
				component.Root.addEventListener(DropdownSelectionChangeEventName, (event: DropdownSelectionChangeEvent) => {
					Options.incRefCount();
					option.updateListener?.(option, event.detail.selectedIndex);
				});
				option.forceRender = () => {
					component.Root.setAttribute("selected-item-index", `${(option.selectedItemIndex ?? 0)}`);
					component.Root.setAttribute("dropdown-items", JSON.stringify(option.dropdownItems));
					this.handleForceRenderOptions(optionElement, component, option);
				};
				break;

			case OptionType.Stepper:
				if (component instanceof FxsStepper) {
					component.Root.addEventListener("component-value-changed", () => {
						Options.incRefCount();
						option.updateListener?.(option, component.value);
					})
				}
				option.forceRender = () => {
					component.Root.setAttribute("value", `${option.currentValue ?? 0}`);
					this.handleForceRenderOptions(optionElement, component, option);
				};
				break;

			case OptionType.Checkbox:
				if (component instanceof FxsCheckbox) {
					component.Root.addEventListener(ComponentValueChangeEventName, (event: CheckboxValueChangeEvent) => {
						Options.incRefCount();
						option.updateListener?.(option, event.detail.value);
					})
					option.forceRender = () => {
						component.Root.setAttribute("selected", `${option.currentValue}`);
						component.Root.setAttribute("disabled", `${option.isDisabled}`);
						this.handleForceRenderOptions(optionElement, component, option);
					};
				}
				break;

			case OptionType.Switch:
				if (component instanceof FxsSwitch) {
					component.Root.addEventListener(ComponentValueChangeEventName, (event: SwitchValueChangeEvent) => {
						Options.incRefCount();
						option.updateListener?.(option, event.detail.value);
					})
					option.forceRender = () => {
						component.Root.setAttribute("selected", option.currentValue ? 'true' : 'false');
						this.handleForceRenderOptions(optionElement, component, option);
					};
				}
				break;

			case OptionType.Slider:
				if (component instanceof FxsSlider) {
					component.Root.addEventListener(ComponentValueChangeEventName, (event: SliderValueChangeEvent) => {
						// Only track a change if the value actually is different, accounting for float rounding errors
						if (option.currentValue && Math.abs(option.currentValue - event.detail.value) > 0.000001) {
							Options.incRefCount();
						}

						option.updateListener?.(option, event.detail.value);

						if (option.sliderValue) {
							const output = option.formattedValue ?? `${option.currentValue ?? 0}%`;
							option.sliderValue.textContent = output;
						}
					})
					if (option.sliderValue) {
						const output = option.formattedValue ?? `${option.currentValue ?? 0}%`;
						option.sliderValue.textContent = output;
					}
					option.forceRender = () => {
						component.Root.setAttribute("value", `${option.currentValue ?? 0}`);
						this.handleForceRenderOptions(optionElement, component, option);
					};
				}
				break;

			default:
				throw new Error(`Unhandled option type: ${option satisfies never}`);
		}
	}

	/**
	 * getOrCreateCategoryTab Finds or creates the panel associated with a given option category.
	 * 
	 * @param catID A category to associate with a tab.
	 * @returns The display panel associated with the tab.
	 */
	private getOrCreateCategoryTab(catID: CategoryType) {
		const elementID = `category-table-${catID}` as const;

		// Find or create the display panel 
		let categoryPanel = this.panels.find(panel => panel.id === elementID)

		// If needed, create the category panel.
		if (!categoryPanel) {
			categoryPanel = document.createElement("screen-options-category");
			categoryPanel.classList.add(elementID, 'flex', 'flex-col');
			categoryPanel.id = elementID;
			this.panels.push(categoryPanel);
			const { title, description } = CategoryData[catID];
			categoryPanel.setAttribute('description', description);

			this.tabData.push({
				id: elementID,
				category: catID,
				label: title,
			});
		}

		return categoryPanel;
	}

	private render() {
		this.Root.classList.add("absolute", "flex", "justify-center", "fullscreen", "max-w-screen", "max-h-screen", "pointer-events-auto");
		this.Root.innerHTML = `
			<div class="absolute img-lsgb-egypt-720 fullscreen"></div>
			<fxs-frame class="option-frame min-w-256 flex-initial" content-as="fxs-vslot" content-class="flex-auto">
				<fxs-vslot class="flex-auto" focus-rule="last">
					<fxs-header class="self-center mb-6 font-title text-xl text-secondary" title="LOC_UI_OPTIONS_TITLE" filigree-style="none"></fxs-header>
					<fxs-tab-bar class="mb-6"></fxs-tab-bar>
					<fxs-scrollable class="flex-auto" attached-scrollbar="true"></fxs-scrollable>
				</fxs-vslot>
				<div class="flex flex-row justify-between items-end mt-6" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}">
					<fxs-button id="options-cancel"
								data-audio-group-ref="options" data-audio-activate="options-cancel-selected"
								caption="LOC_OPTIONS_CANCEL_CHANGES"></fxs-button>
					<fxs-button id="options-defaults" class="ml-2"
								data-audio-group-ref="options" data-audio-activate="options-default-selected"
								caption="LOC_OPTIONS_RESET_TO_DEFAULTS"></fxs-button>
					<fxs-hero-button id="options-confirm" class="ml-2"
								caption="LOC_OPTIONS_CONFIRM_CHANGES" data-audio-group-ref="options"
								data-audio-activate-ref="data-audio-options-confirm"></fxs-button>
				</div>
			</fxs-frame>
		`;

		this.scrollable = MustGetElement("fxs-scrollable", this.Root);
		this.cancelButton = MustGetElement('#options-cancel', this.Root);
		this.defaultsButton = MustGetElement('#options-defaults', this.Root);
		this.confirmButton = MustGetElement('#options-confirm', this.Root);
		this.tabControl = MustGetElement("fxs-tab-bar", this.Root);

		// Loop through options, building HTML into approriate category pages.
		for (const [, option] of Options.data) {
			const category = this.getOrCreateCategoryTab(option.category);

			if (!category.maybeComponent) {
				// @ts-expect-error - gameface custom element initialization is broken when appending custom elements to other custom elements
				category.initialize()
			}


			const { optionRow, optionElement } = category.component.appendOption(option);
			// @ts-expect-error - gameface custom element initialization is broken when appending custom elements to other custom elements
			optionElement.initialize();
			this.onUpdateOptionValue(optionRow, optionElement.component, option);
			optionRow.classList.toggle("hidden", option.isHidden ?? false);
		}

		this.tabControl.setAttribute("tab-items", JSON.stringify(this.tabData));

		const selectedTab = this.Root.getAttribute("selected-tab");
		this.tabControl.setAttribute("selected-tab-index", selectedTab ?? "0");

		for (let i = 0; i < this.panels.length; i++) {
			this.slotGroup.appendChild(this.panels[i]);
		}

		this.slotGroup.classList.add('px-6')

		this.scrollable.appendChild(this.slotGroup);

		this.tabControl.addEventListener("tab-selected", this.onOptionsTabSelected);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'screen-options': ComponentRoot<ScreenOptions>;
	}
}

Controls.define('screen-options', {
	createInstance: ScreenOptions,
	description: 'Screen for adjusting game options.',
	styles: ['fs://game/core/ui/options/screen-options.css'],
});

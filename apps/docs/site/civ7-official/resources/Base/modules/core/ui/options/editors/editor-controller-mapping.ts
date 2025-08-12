/**
 * @file editor-controller-mapping.ts
 * @copyright 2021-2023, Firaxis Games
 * @description The controller mapping screen.
 */

import Panel from '/core/ui/panel-support.js';
import { MustGetElement, MustGetElements } from '/core/ui/utilities/utilities-dom.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { ActionActivateEvent, ActionActivateEventName } from '/core/ui/components/fxs-activatable.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogBoxManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';
import { TtsManager } from '/core/ui/accessibility/tts-manager.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import ActionHandler, { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Focus } from '/core/ui/input/focus-support.js';

const GESTURE_KEYS = [
	InputKeys.PAD_A,
	InputKeys.PAD_B,
	InputKeys.PAD_X,
	InputKeys.PAD_Y,
	InputKeys.PAD_RSHOULDER,
	InputKeys.PAD_LSHOULDER,
	InputKeys.PAD_RTRIGGER,
	InputKeys.PAD_LTRIGGER,
	InputKeys.PAD_DPAD_UP,
	InputKeys.PAD_DPAD_DOWN,
	InputKeys.PAD_DPAD_LEFT,
	InputKeys.PAD_DPAD_RIGHT,
	InputKeys.PAD_START,
	InputKeys.PAD_BACK,
	InputKeys.PAD_LTHUMB_PRESS,
	InputKeys.PAD_RTHUMB_PRESS,
	InputKeys.PAD_LTHUMB_AXIS,
	InputKeys.PAD_RTHUMB_AXIS,
];

const DEVICE_TYPE_TO_EXCLUDED_GESTURES = {
	[InputDeviceType.Controller]: [],
	[InputDeviceType.Hybrid]: [InputKeys.PAD_RTHUMB_PRESS],
	[InputDeviceType.Keyboard]: [],
	[InputDeviceType.Mouse]: [],
	[InputDeviceType.Touch]: [],
	[InputDeviceType.XR]: [],
}

// TODO: modify database to get the list of actions based on controls (hybrid)
const HYBRID_ACTIONS = [
	"mousebutton-left",
	"mousebutton-right",
	"force-end-turn",
	"open-attributes",
	"open-civics",
	"open-greatworks",
	"open-rankings",
	"open-techs",
	"open-traditions",
	"open-civilopedia",
	"quick-load",
	"quick-save",
	"toggle-grid-layer",
	"toggle-yields-layer",
	"toggle-resources-layer",
	"cycle-next",
	"cycle-prev",
	"unit-move",
	"unit-ranged-attack",
	"unit-skip-turn",
	"unit-sleep",
	"unit-heal",
	"unit-fortify",
	"unit-alert",
	"next-action",
	"camera-pan",
	"scroll-pan",
	"notification",
	"sys-menu",
	"shell-action-5",
	"camera-zoom-in",
	"camera-zoom-out",
	"cancel",
];

if (TtsManager.isTtsSupported) {
	HYBRID_ACTIONS.push("text-to-speech-keyboard");
}

const INPUT_LAYOUT_TO_CLASS = {
	[InputDeviceLayout.Generic]: "hidden",
	[InputDeviceLayout.Nintendo]: "switch",
	[InputDeviceLayout.Ounce]: "ounce",
	[InputDeviceLayout.PlayStation4]: "playstation-4",
	[InputDeviceLayout.PlayStation5]: "playstation-5",
	[InputDeviceLayout.Stadia]: "hidden",
	[InputDeviceLayout.Steam]: "hidden",
	[InputDeviceLayout.Unknown]: "hidden",
	[InputDeviceLayout.XBox]: "xbox",
};

const DEVICE_TYPE_TO_ACTIONS = {
	[InputDeviceType.Controller]: undefined,
	[InputDeviceType.Hybrid]: HYBRID_ACTIONS,
	[InputDeviceType.Keyboard]: undefined,
	[InputDeviceType.Mouse]: undefined,
	[InputDeviceType.Touch]: undefined,
	[InputDeviceType.XR]: undefined,
}

enum StickActionName {
	MOVE_CURSOR = "LOC_MOVE_CURSOR",
	PLOT_MOVE = "LOC_PLOT_MOVE",
	CAMERA_PAN = "LOC_CAMERA_PAN",
	SCROLL_PAN = "LOC_SCROLL_PAN",
}

enum UnbindableActionName {
	MOUSE_BUTTON_LEFT = "LOC_MOUSE_BUTTON_LEFT",
	MOUSE_BUTTON_RIGHT = "LOC_MOUSE_BUTTON_RIGHT",
	SCROLL_PAN = "LOC_SCROLL_PAN",
	CAMERA_PAN = "LOC_CAMERA_PAN",
}

const STICK_ACTION_NAMES: ReadonlyArray<StickActionName> = [StickActionName.MOVE_CURSOR, StickActionName.PLOT_MOVE, StickActionName.CAMERA_PAN, StickActionName.SCROLL_PAN];
const UNBINDABLE_ACTION_NAMES: ReadonlyArray<UnbindableActionName> = [UnbindableActionName.MOUSE_BUTTON_LEFT, UnbindableActionName.MOUSE_BUTTON_RIGHT, UnbindableActionName.SCROLL_PAN, UnbindableActionName.CAMERA_PAN];

const PS4_OPTIONS_TEXT = "OPTIONS";
const PS4_SHARE_TEXT = "SHARE";

const mapIconToText = {
	"ps4_icon_start": PS4_OPTIONS_TEXT,
	"ps4_icon_share": PS4_SHARE_TEXT,
}

interface ActionsDictionary {
    [actionId: string]: {actionChooserItem?: HTMLElement, actionMapElement?: HTMLElement, descriptionElement?: HTMLElement, name: string, gestureKey: InputKeyID, description: string};
}

/**
 * Display and modify the game options.
 */
class EditorControllerMapping extends Panel {

	private controlList: { name: string, id: InputContext, actionsDictionary: ActionsDictionary, actions: {name: string, gestureKey: InputKeyID, id: InputActionID, description: string}[] }[] = [];
	private prevContext: InputContext = InputContext.Shell;
	private currentContext: InputContext = InputContext.Shell;
	private prevActionID: InputActionID = -2; // -1 -> invert joystick, 0 -> context, x -> action
	private currentActionID: InputActionID = -2; // -1 -> invert joystick, 0 -> context, x -> action
	private inputDeviceLayout: InputDeviceLayout = InputDeviceLayout.Unknown;
	private inputControllerIcon: string = "";
	private inputDeviceType: InputDeviceType = InputDeviceType.Keyboard;
	private isDeviceTypeToActionsDefined: boolean = false; // in the case where we have defined actions, we are in the mode of context ALL

	private actionListDivs: NodeListOf<HTMLElement> | null = null;
	private actionVisDivs: NodeListOf<HTMLElement> | null = null;
	private expandButtons: NodeListOf<HTMLElement> | null = null;
	private controllerContainer!: HTMLElement;
	private actionListContainer!: HTMLElement;
	private controllerActionDiv!: HTMLElement;
	private actionList!: HTMLElement;
	private invertCheckbox?: HTMLElement;
	private actionDescriptionDivs: NodeListOf<HTMLElement> | null = null;
	private controllerSection!: HTMLElement;
	private backButton!: HTMLElement;
	private restoreButton!: HTMLElement;
	private saveButton!: HTMLElement;
	private title!: HTMLElement;

	private expandButtonActivateListener = this.onExpandButtonActivate.bind(this);
	private chooserItemFocusListener = this.onChooserItemFocus.bind(this);
	private chooserItemHoverListener = this.onChooserItemHover.bind(this);
	private chooserItemBlurListener = this.onChooserItemBlur.bind(this);
	private chooserItemActivateListener = this.onChooserItemActivate.bind(this);
	private expandButtonFocusListener = this.onExpandButtonFocus.bind(this);
	private expandButtonHoverListener = this.onExpandButtonHover.bind(this);
	private backButtonActivateListener = this.onBackButtonActivate.bind(this);
	private restoreButtonActivateListener = this.onRestoreDefaultActivate.bind(this);
	private saveButtonActivateListener = this.onConfirmChangeActivate.bind(this);
	private invertCheckboxFocusListener = this.onInvertCheckboxFocus.bind(this);
	private invertCheckboxHoverListener = this.onInvertCheckboxHover.bind(this);
	private invertCheckboxActivateListener = this.onInvertCheckboxActivate.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
	private resizeListener = this.onResize.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	onInitialize() {
		super.onInitialize();

		this.Root.innerHTML = this.getContent();

		this.actionList = MustGetElement(".editor-controller-mapping__scrollable-content", this.Root);
		this.actionListContainer = MustGetElement(".editor-controller-mapping__action-list-container", this.Root);
		this.controllerContainer = MustGetElement(".editor-controller-mapping__controller-content", this.Root);
		this.controllerActionDiv = MustGetElement(".editor-controller-mapping__controller", this.Root);
		this.controllerSection = MustGetElement(".editor-controller-mapping__controller-section", this.Root);
		this.backButton = MustGetElement('fxs-close-button', this.Root);
		this.restoreButton = MustGetElement(".editor-controller-mapping__option-restore", this.Root);
		this.saveButton = MustGetElement(".editor-controller-mapping__option-save", this.Root);
		this.title = MustGetElement(".editor-controller-mapping__title", this.Root);
	}

	private getContent() {
		return `
			<fxs-frame class="flex-1 flow-column w-full h-full">
				<fxs-header title="LOC_UI_CONTROLLER_MAPPING_TITLE" class="editor-controller-mapping__title font-title text-xl text-center uppercase tracking-100" filigree-style="none"></fxs-header>
				<div class="font-body text-base text-accent-3 text-center" data-l10n-id="LOC_UI_CONTROLLER_MAPPING_SUBTITLE"></div>
				<div class="flex-auto flow-column items-center">
					<div class="editor-controller-mapping__content flow-row flex-auto px-5 pb-14">
						<fxs-vslot class="editor-controller-mapping__action-list-container flex-2" data-bind-class-toggle="mb-2:!{{g_NavTray.isTrayRequired}}">
							<fxs-scrollable class="editor-controller-mapping__scrollable" handle-gamepad-pan="true">
								<div class="editor-controller-mapping__scrollable-content"></div>
							</fxs-scrollable>
						</fxs-vslot>
						<div class="editor-controller-mapping__controller-section flex-3 h-full flow-row justify-center items-center">
							<div class="editor-controller-mapping__controller-content flex-auto relative flow-row">
								<div class="editor-controller-mapping__controller flex-auto relative flow-row"></div>
							</div>
						</div>
					</div>
					<div class="flow-row justify-between editor-controller-mapping__options w-full pl-11" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}">
						<fxs-button class="editor-controller-mapping__option-restore" caption="LOC_UI_CONTROLLER_MAPPING_RESTORE_DEFAULT"></fxs-button>
						<fxs-button class="mr-3 editor-controller-mapping__option-save" caption="LOC_UI_CONTROLLER_MAPPING_CONFIRM_CHANGE_TITLE"></fxs-button>
					</div>
				</div>
				<fxs-close-button class="top-4 right-4" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}"></fxs-close-button>
			</fxs-frame>
		`
	}

	private getControllerMapActionElement(node: ControllerMapActionElementNode) {
		const elem = document.createElement("controller-map-action-element");
		elem.setAttribute("node", JSON.stringify(node));
		return elem;
	}

	private getEditorControllerChooserItem(node: Partial<EditorControllerChooserNode>, list: { name: string, id: InputActionID }[], index: number): HTMLElement {
		const chooserItemContainer = document.createElement("div");
		chooserItemContainer.classList.toggle("pb-2", index < list.length - 1);
		chooserItemContainer.classList.add("pointer-events-auto");
		chooserItemContainer.setAttribute("index", `${index}`);
		const elem = document.createElement("editor-controller-chooser-item");
		elem.classList.add("min-h-8");
		elem.setAttribute("index", `${index}`);
		elem.setAttribute("tabindex", "-1");
		elem.setAttribute("select-highlight", "true");
		elem.setAttribute("data-bind-attributes", "{'select-on-focus':{{g_NavTray.isTrayRequired}}?'true':'false'}");
		elem.setAttribute("data-audio-group-ref", "controller-mapping");
		elem.setAttribute("node", JSON.stringify(node));
		chooserItemContainer.appendChild(elem);
		return chooserItemContainer;
	}

	private generateControlList(actionNames?: string[]) {
		this.isDeviceTypeToActionsDefined = !!actionNames;
		if (!!actionNames) {
			this.controlList = [
				{
					name: "",
					id: InputContext.ALL,
					actionsDictionary: {},
					actions: actionNames.map(name => {
						const id = Input.getActionIdByName(name) ?? 0;
						return {
							name: Input.getActionName(id),
							gestureKey: Input.getGestureKey(id, 0, this.inputDeviceType, InputContext.ALL),
							id,
							sortIndex: Input.getActionSortIndex(id),
							description: Input.getActionDescription(id),
						}
					}).filter(
						({ name }) => (!name.startsWith("text-to-speech") || TtsManager.isTtsSupported)
					).sort(({ id: aID }, { id: bID }) => parseInt(Input.getActionSortIndex(aID) || "0") - parseInt(Input.getActionSortIndex(bID) || "0"))
				}
			];
		} else {
			this.controlList = [...Array(Input.getNumContexts()).keys()].map(i => {
				const context = Input.getContext(i);
				return {
					name: Input.getContextName(i),
					id: context,
					actionsDictionary: {},
					actions: [...Array(Input.getActionCount()).keys()].map(j => {
						const id = Input.getActionIdByIndex(j) ?? 0;
						return {
							name: Input.getActionName(id),
							gestureKey: Input.getGestureKey(id, 0, this.inputDeviceType, i),
							id,
							sortIndex: Input.getActionSortIndex(id),
							description: Input.getActionDescription(id)
						}
					}).filter(
						({ id, name }) => Input.isActionAllowed(id, context)
							&& Input.getActionDeviceType(id) == this.inputDeviceType
							// TODO this should probably be moved to the backend and done via configuration instead of by name
							&& (!name.startsWith("text-to-speech") || TtsManager.isTtsSupported)
					).sort(({ id: aID }, { id: bID }) => parseInt(Input.getActionSortIndex(aID) || "0") - parseInt(Input.getActionSortIndex(bID) || "0"))
				}
			});
		}
		this.controlList.forEach((control => {
			control.actions.forEach(({id, gestureKey, name, description}) => {
				control.actionsDictionary[`${id}`] = {name, gestureKey, description}
			});
			control.actionsDictionary['0'] = {name: "", gestureKey: 0, description: control.name};
			control.actionsDictionary['-1'] = {name: "", gestureKey: 0, description: control.name};
		}))
	}

	onAttach() {
		super.onAttach();

		window.addEventListener("resize", this.resizeListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		this.Root.addEventListener("engine-input", this.engineInputListener);
		engine.on("InputActionBinded", this.onInputActionBinded, this);

		this.backButton.addEventListener("action-activate", this.backButtonActivateListener);
		this.restoreButton.addEventListener("action-activate", this.restoreButtonActivateListener);
		this.saveButton.addEventListener("action-activate", this.saveButtonActivateListener);

		this.updateInputDeviceType();
	}

	onDetach(): void {
		window.removeEventListener("resize", this.resizeListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		engine.off("InputActionBinded", this.onInputActionBinded, this);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();
		FocusManager.setFocus(this.actionListContainer);
		this.updateNavTray();
	}

	private updateActionList() {
		this.actionList.innerHTML = `
			${this.controlList.map(({ name }, i) => `
				<div class="mt-7 mx-6">
					<div class="flow-row items-center relative ${this.isDeviceTypeToActionsDefined ? "hidden" : ""}">
						<fxs-header title="${name}" class="flex-auto uppercase text-center font-title text-base tracking-100" filigree-style="none"></fxs-header>
						<fxs-minus-plus class="editor-controller-mapping__expand absolute right-2" type="minus" index="${i}" tabindex="-1"></fxs-minus-plus>
					</div>
					<div class="flow-row justify-center -mt-3 mb-3 ${this.isDeviceTypeToActionsDefined ? "hidden" : ""}">
						<div class="img-unit-panel-divider -scale-y-100"></div>
						<div class="img-unit-panel-divider -scale-100"></div>
					</div>
					<div class="editor-controller-mapping__action-list editor-controller-mapping__action-list-${i}" index="${i}"></div>
				</div>
			`).join("")}
		`

		if (Input.isInvertStickActionsAllowed()) {
			const invertStickRow = document.createElement('div');
			invertStickRow.classList.add("flow-row", "mx-6", "items-center");

			const invertStickLabel = document.createElement('div');
			invertStickLabel.classList.add("font-body", "text-base", "text-accent-3", "flex-auto", "font-fit-shrink", "whitespace-nowrap");
			invertStickLabel.setAttribute("data-l10n-id", "LOC_UI_CONTROLLER_MAPPING_INVERT_STICK");

			this.invertCheckbox = document.createElement('fxs-checkbox');

			invertStickRow.appendChild(invertStickLabel);
			invertStickRow.appendChild(this.invertCheckbox);

			this.actionList.insertAdjacentElement("afterbegin", invertStickRow);
		}

		this.invertCheckbox?.addEventListener("focus", this.invertCheckboxFocusListener);
		this.invertCheckbox?.addEventListener("mouseover", this.invertCheckboxHoverListener);
		this.invertCheckbox?.addEventListener("action-activate", this.invertCheckboxActivateListener);

		this.expandButtons = MustGetElements(".editor-controller-mapping__expand", this.Root);
		this.expandButtons?.forEach((expandButton) => {
			expandButton.addEventListener(ActionActivateEventName, this.expandButtonActivateListener);
			expandButton.addEventListener("focus", this.expandButtonFocusListener);
			expandButton.addEventListener("mouseover", this.expandButtonHoverListener);
		})

		this.actionListDivs = MustGetElements(".editor-controller-mapping__action-list", this.Root);

		this.actionListDivs.forEach((actionListDiv) => {
			const i = parseInt(actionListDiv.getAttribute("index") ?? "0");
			const { id: context } = this.controlList[i];
			const actions = this.controlList[i].actions.filter(({ id }) => Input.getActionSortIndex(id) != '');
			actions.forEach(({ name: actionName, id: actionID }, j) => {
				const chooserItem = this.getEditorControllerChooserItem({
					context,
					actionName,
					actionID,
				}, this.controlList[i].actions, j);
				chooserItem.firstChild?.addEventListener("focus", this.chooserItemFocusListener);
				chooserItem.addEventListener("mouseenter", this.chooserItemHoverListener);
				chooserItem.addEventListener("mouseleave", this.chooserItemBlurListener);
				chooserItem.firstChild?.addEventListener("action-activate", this.chooserItemActivateListener);
				actionListDiv.appendChild(chooserItem);
				this.controlList[i].actionsDictionary[`${actionID}`].actionChooserItem = chooserItem;
			})
		});
	}

	private updateControllerActionDiv() {
		this.controllerActionDiv.innerHTML = `
			<div class="editor-controller-mapping__controller-icon absolute inset-0 bg-contain bg-no-repeat bg-center" style="background-image: url('${this.inputControllerIcon}')"></div>
			${this.controlList.map(({ }, i) => `
				<div class="editor-controller-mapping__action-description text-center font-body text-base text-accent-3 font-fit-shrink whitespace-nowrap w-full absolute" index="${i}"></div>
				<div class="absolute inset-0 editor-controller-mapping__action-vis hidden" index="${i}"></div>
			`).join("")}
		`;
		this.actionVisDivs = MustGetElements(".editor-controller-mapping__action-vis", this.Root);
		this.actionVisDivs.forEach((actionVisDiv) => {
			const i = parseInt(actionVisDiv.getAttribute("index") ?? "0");
			const { id: context } = this.controlList[i];
			this.controlList[i].actions.forEach(({ name: actionName, id: actionID }) => {
				const mapActionElement = this.getControllerMapActionElement({
					context,
					actionName,
					actionID
				})
				
				actionVisDiv.appendChild(mapActionElement);
				this.controlList[i].actionsDictionary[`${actionID}`].actionMapElement = mapActionElement;
			});

			GESTURE_KEYS.filter(
				key => !DEVICE_TYPE_TO_EXCLUDED_GESTURES[this.inputDeviceType].includes(key)
			).forEach(key => {
				const mapActionElement = this.getControllerMapActionElement({
					context,
					actionName: "",
					actionID: -3,
					gestureKey: key,
				});
				actionVisDiv.appendChild(mapActionElement);
			});
		});
		this.actionDescriptionDivs = MustGetElements(".editor-controller-mapping__action-description", this.Root);
		this.actionDescriptionDivs.forEach((actionDescriptionDiv) => {
			const i = parseInt(actionDescriptionDiv.getAttribute("index") ?? "0");
			this.controlList[i].actions.forEach(({ id: actionID, description }) => {
				const actionDescription = document.createElement("div");
				actionDescription.classList.add("text-center", "font-body", "text-base", "text-accent-3", "font-fit-shrink", "whitespace-nowrap", "w-full", "invisible", "absolute");
				actionDescription.setAttribute("data-l10n-id", description);
				actionDescriptionDiv.appendChild(actionDescription);
				this.controlList[i].actionsDictionary[`${actionID}`].descriptionElement = actionDescription;
			});
			// the context description
			const contextDescription = document.createElement("div");
			contextDescription.classList.add("text-center", "font-body", "text-base", "text-accent-3", "font-fit-shrink", "whitespace-nowrap", "w-full", "invisible", "absolute");
			contextDescription.setAttribute("data-l10n-id", this.controlList[i].name ?? "");
			actionDescriptionDiv.appendChild(contextDescription);
			this.controlList[i].actionsDictionary['0'].descriptionElement = contextDescription;

			// the swap stick description
			const swapStickDescription = document.createElement("div");
			swapStickDescription.classList.add("text-center", "font-body", "text-base", "text-accent-3", "font-fit-shrink", "whitespace-nowrap", "w-full", "invisible", "absolute");
			swapStickDescription.setAttribute("data-l10n-id", "LOC_GESTURE_THUMB_AXIS");
			actionDescriptionDiv.appendChild(swapStickDescription);
			this.controlList[i].actionsDictionary['-1'].descriptionElement = swapStickDescription;
		})
	}

	private updateNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericCancel();
		NavTray.addOrUpdateShellAction1("LOC_UI_CONTROLLER_MAPPING_CONFIRM_CHANGE_TITLE");
		NavTray.addOrUpdateShellAction2("LOC_UI_CONTROLLER_MAPPING_RESTORE_DEFAULT");
	}

	private updateInvertCheckbox() {
		const i = this.controlList.findIndex(({ id }) => id == InputContext.Shell);
		const { id: actionId = 0 } = this.controlList[i]?.actions.find(({ name }) => name == "LOC_MOVE_CURSOR") ?? {};
		this.invertCheckbox?.setAttribute("selected", Input.getGestureKey(actionId, 0, this.inputDeviceType, InputContext.Shell) == InputKeys.PAD_RTHUMB_AXIS ? "true" : "false");
	}

	private updateActionVisDivs() {
		this.actionVisDivs?.forEach(actionVisDiv => {
			const i = parseInt(actionVisDiv.getAttribute("index") ?? "0");
			const { id } = this.controlList[i];
			actionVisDiv.classList.toggle("hidden", this.currentContext != id);
		});
	}

	private updateTitle() {
		// TODO: have layout ounce-right & ounce-left instead of resolving this through the result of getIconFromActionID
		if (this.inputDeviceType == InputDeviceType.Hybrid) {
			const gestureIconUrl = `${Input.getPrefix(this.inputDeviceType)}${Icon.getIconFromActionID(Input.getActionIdByName("mousebutton-left") || 0, this.inputDeviceType, InputContext.ALL, false) || ""}`;
			const iconClass = gestureIconUrl.split("_").slice(2).join("-");
			this.title.setAttribute("title", Locale.compose("LOC_UI_CONTROLLER_MAPPING_TITLE_HYBRID", Locale.compose(iconClass == "right-bumper" ? "LOC_UI_CONTROLLER_MAPPING_RIGHT" : "LOC_UI_CONTROLLER_MAPPING_LEFT")))
		}
		else {
			this.title.setAttribute("title", "LOC_UI_CONTROLLER_MAPPING_TITLE");
		}
	}

	private updateControllerContainer() {
		const { width } = this.controllerContainer.getBoundingClientRect();
		this.controllerContainer.style.setProperty("height", `${width * 710 / 1100}px`);
	}

	private updateMapActionElements() {
		const toggleStickActions = (value: boolean) => {
			const actionDic = this.controlList.find(({id}) => id == this.currentContext)?.actionsDictionary;
			Object.keys(actionDic ?? {}).forEach(actionID => {
				const {name, actionMapElement} = actionDic?.[actionID] ?? {};
				if (STICK_ACTION_NAMES.includes(name as StickActionName)) {
					actionMapElement?.setAttribute("highlight", value ? "true" : "false");
				}
			})
		}
		if (this.prevActionID == -1) {
			toggleStickActions(false);
		}
		this.controlList.find(({id}) => id == this.currentContext)?.actionsDictionary[this.prevActionID]?.actionMapElement?.setAttribute("highlight", "false");

		if (this.currentActionID == -1) {
			toggleStickActions(true);
		}
		this.controlList.find(({id}) => id == this.currentContext)?.actionsDictionary[this.currentActionID]?.actionMapElement?.setAttribute("highlight", "true");
	}

	private updateControllerSection() {
		this.controllerSection.classList.toggle("hidden", this.inputDeviceLayout == InputDeviceLayout.Unknown);
		this.controllerSection.classList.toggle("ounce", this.inputDeviceLayout == InputDeviceLayout.Ounce);
		this.controllerSection.classList.toggle("switch", this.inputDeviceLayout == InputDeviceLayout.Nintendo);
		this.controllerSection.classList.toggle("xbox", this.inputDeviceLayout == InputDeviceLayout.XBox);
		this.controllerSection.classList.toggle("playstation-4", this.inputDeviceLayout == InputDeviceLayout.PlayStation4);
		this.controllerSection.classList.toggle("playstation-5", this.inputDeviceLayout == InputDeviceLayout.PlayStation5);
	}

	private updateActionDescriptionDiv() {
		const prevContextControl = this.controlList.find(({id}) => id == this.prevContext);
		const currentContextControl = this.controlList.find(({id}) => id == this.currentContext);
		currentContextControl?.actionsDictionary[this.currentActionID]?.descriptionElement?.classList.toggle("invisible", false);
		prevContextControl?.actionsDictionary[this.prevActionID]?.descriptionElement?.classList.toggle("invisible", true);
		if (this.currentActionID != this.prevActionID) {
			currentContextControl?.actionsDictionary[this.prevActionID]?.descriptionElement?.classList.toggle("invisible", true);
		}
		this.actionDescriptionDivs?.forEach(actionDescriptionDiv => {
			actionDescriptionDiv.classList.toggle("ounce", this.inputDeviceLayout == InputDeviceLayout.Ounce);
			actionDescriptionDiv.classList.toggle("switch", this.inputDeviceLayout == InputDeviceLayout.Nintendo);
			actionDescriptionDiv.classList.toggle("xbox", this.inputDeviceLayout == InputDeviceLayout.XBox);
			actionDescriptionDiv.classList.toggle("playstation-4", this.inputDeviceLayout == InputDeviceLayout.PlayStation4);
			actionDescriptionDiv.classList.toggle("playstation-5", this.inputDeviceLayout == InputDeviceLayout.PlayStation5);
		})
	}

	private updateInputDeviceLayout() {
		let inputDeviceLayout = Input.getInputDeviceLayout(this.inputDeviceType) || this.inputDeviceLayout;
		if (inputDeviceLayout != this.inputDeviceLayout) {
			this.inputDeviceLayout = inputDeviceLayout;
			this.updateControllerSection();
			this.updateActionDescriptionDiv();
		}
	}

	private updateInputDeviceType() {
		let inputDeviceType = InputDeviceType.Controller;
		if (ActionHandler.isHybridActive) {
			inputDeviceType = InputDeviceType.Hybrid;
		}
		if (inputDeviceType != this.inputDeviceType) {
			this.inputDeviceType = inputDeviceType;
			const actions = DEVICE_TYPE_TO_ACTIONS[this.inputDeviceType];
			this.prevContext = this.currentContext;
			this.currentContext = actions ? InputContext.ALL : InputContext.Shell;
			this.inputControllerIcon = Input.getControllerIcon() || this.inputControllerIcon;
			this.prevActionID = this.currentActionID;
			this.currentActionID = -2;
			this.generateControlList(actions);
			this.updateActionList();
			this.updateControllerActionDiv();
			this.updateActionVisDivs();
			this.updateMapActionElements();
			this.updateActionDescriptionDiv();
			this.updateInvertCheckbox();
			waitForLayout(this.updateControllerContainer.bind(this));

			// TODO: fix fxs-slot subtree mutation to true for the slot to reset its own focus
			Focus.setContextAwareFocus(this.Root, this.Root);
			Focus.setContextAwareFocus(this.actionListContainer, this.Root);
		}
		this.updateTitle();
		this.updateInputDeviceLayout();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (!this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		};
	}

	private handleEngineInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		switch (inputEvent.detail.name) {
			case 'cancel':
			case 'keyboard-escape':
				Input.loadPreferences();
				this.close();
				return false;
			case 'shell-action-1':
				this.onConfirmChangeActivate();
				return false;
			case 'shell-action-2':
				this.onRestoreDefaultActivate();
				return false;
		}

		return true;
	}

	private onInputActionBinded({ actionId }: InputActionBindedData) {
		const i = this.controlList.findIndex(({ id }) => id == InputContext.Shell);
		if ((this.controlList[i].actions.find(({ id }) => id == actionId)?.name ?? "") == "LOC_MOVE_CURSOR") {
			this.updateInvertCheckbox();
		}
	}

	private onExpandButtonActivate({ target }: ActionActivateEvent) {
		if (!(target instanceof HTMLElement)) { return; }
		const index = parseInt(target.getAttribute("index") ?? "0");
		const type = target.getAttribute("type");
		target.setAttribute("type", type == "minus" ? "plus" : "minus");
		this.actionListDivs?.[index].classList.toggle("hidden", type == "minus");
	}

	private onChooserItemFocus({ target }: FocusEvent) {
		if (!(target instanceof HTMLElement)) { return; }
		const { context = InputContext.INVALID, actionID = 0 } = JSON.parse(target.getAttribute("node") ?? "") ?? {};
		this.prevContext = this.currentContext;
		this.currentContext = context;
		this.prevActionID = this.currentActionID;
		this.currentActionID = actionID;
		this.updateActionVisDivs();
		this.updateMapActionElements();
		this.updateActionDescriptionDiv();
	}

	private onChooserItemHover({ target }: MouseEvent) {
		if (!(target instanceof HTMLElement)) { return; }
		const { context = InputContext.INVALID, actionID = 0 } = JSON.parse((target.firstChild as HTMLElement)?.getAttribute("node") ?? "") ?? {};
		this.prevContext = this.currentContext;
		this.currentContext = context;
		this.prevActionID = this.currentActionID;
		this.currentActionID = actionID;
		this.updateActionVisDivs();
		this.updateMapActionElements();
		this.updateActionDescriptionDiv();
	}

	private onChooserItemBlur(_event: MouseEvent) {
		this.prevActionID = this.currentActionID;
		this.currentActionID = -2;
		this.updateActionVisDivs();
		this.updateMapActionElements();
		this.updateActionDescriptionDiv();
	}

	private onChooserItemActivate({ target }: ActionActivateEvent) {
		if (!(target instanceof HTMLElement)) { return; }
		const { context = InputContext.INVALID, actionName = "", actionID = 0 } = JSON.parse(target.getAttribute("node") ?? "") ?? {};
		const node = {
			contextName: this.controlList.find((({ id }) => id == context))?.name,
			context,
			actionName,
			actionID
		}
		ContextManager.push("editor-input-binding-panel", { singleton: true, attributes: { "node": JSON.stringify(node), darker: true } });
	}

	private onInvertCheckboxFocus(_event: FocusEvent) {
		this.prevActionID = this.currentActionID;
		this.currentActionID = -1;
		this.updateMapActionElements();
		this.updateActionDescriptionDiv();
	}

	private onInvertCheckboxHover(_event: MouseEvent) {
		this.prevActionID = this.currentActionID;
		this.currentActionID = -1;
		this.updateMapActionElements();
		this.updateActionDescriptionDiv();
	}

	private onActiveDeviceTypeChanged(_event: ActiveDeviceTypeChangedEvent) {
		this.updateInputDeviceType();
	}

	private onInvertCheckboxActivate({ target }: ActionActivateEvent) {
		if (!(target instanceof HTMLElement)) { return; }
		const isChecked = target.getAttribute("selected") == "true";
		Input.swapThumbAxis(isChecked);
	}

	private onExpandButtonFocus({ target }: FocusEvent) {
		if (!(target instanceof HTMLElement)) { return; }
		const { id } = this.controlList[parseInt(target.parentElement?.parentElement?.getAttribute("index") ?? "0")];
		this.prevContext = this.currentContext;
		this.currentContext = id;
		this.prevActionID = this.currentActionID;
		this.currentActionID = 0;
		this.updateActionVisDivs();
		this.updateMapActionElements();
		this.updateActionDescriptionDiv();
	}

	private onExpandButtonHover({ target }: MouseEvent) {
		if (!(target instanceof HTMLElement)) { return; }
		const { id } = this.controlList[parseInt(target.parentElement?.parentElement?.getAttribute("index") ?? "0")];
		this.prevContext = this.currentContext;
		this.currentContext = id;
		this.prevActionID = this.currentActionID;
		this.currentActionID = 0;
		this.updateActionVisDivs();
		this.updateMapActionElements();
		this.updateActionDescriptionDiv();
	}

	private onBackButtonActivate() {
		Input.loadPreferences();
		this.close();
	}

	private onRestoreDefaultActivate() {
		NavTray.clear();
		DialogBoxManager.createDialog_ConfirmCancel({
			body: "LOC_UI_CONTROLLER_MAPPING_RESET_DEFAULT_BODY",
			title: "LOC_UI_CONTROLLER_MAPPING_RESET_DEFAULT_TITLE",
			canClose: false,
			callback: (eAction: DialogBoxAction) => eAction == DialogBoxAction.Confirm && Input.restoreDefault()
		})
	}

	private onConfirmChangeActivate() {
		NavTray.clear();
		DialogBoxManager.createDialog_ConfirmCancel({
			body: "LOC_UI_CONTROLLER_MAPPING_CONFIRM_CHANGE_BODY",
			title: "LOC_UI_CONTROLLER_MAPPING_CONFIRM_CHANGE_TITLE",
			canClose: false,
			callback: (eAction: DialogBoxAction) => {
				if (eAction == DialogBoxAction.Confirm) {
					Input.savePreferences();
					this.close();
				}
			}
		})
	}

	private onResize() {
		waitForLayout(this.updateControllerContainer.bind(this));
	}
}

const EditorControllerMappingTagName = 'editor-controller-mapping';
Controls.define(EditorControllerMappingTagName, {
	createInstance: EditorControllerMapping,
	description: 'Screen for changing the controller mapping.',
	classNames: ['editor-controller-mapping', 'fullscreen', 'flow-row', 'justify-center', 'items-center'],
	styles: ['fs://game/core/ui/options/editors/editor-controller-mapping.css'],
	tabIndex: -1,
});

declare global {
	interface HTMLElementTagNameMap {
		[EditorControllerMappingTagName]: ComponentRoot<EditorControllerMapping>;
	}
}

export interface EditorInputBindingPanelNode {
	contextName: string;
	context: InputContext
	actionName: string;
	actionID: InputActionID;
}

class EditorInputBindingPanel extends Panel {
	private _node?: EditorInputBindingPanelNode;

	public get editorInputBindingPanelNode(): EditorInputBindingPanelNode | undefined {
		return this._node;
	}

	public set editorInputBindingPanelNode(value: EditorInputBindingPanelNode) {
		this._node = value;
	}

	private contextNameDiv!: HTMLElement;
	private actionNameDiv!: HTMLElement;
	private gestureIcon!: HTMLElement;
	private gestureIconText!: HTMLElement;
	private inputDeviceType: InputDeviceType = InputDeviceType.Controller;
	private recordingDeviceTypes: InputDeviceType[] = [InputDeviceType.Controller];

	private engineInputListener = this.onEngineInput.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);

	onInitialize() {
		this.Root.innerHTML = this.getContent();
		this.inputDeviceType = ActionHandler.isHybridActive ? InputDeviceType.Hybrid : InputDeviceType.Controller;
		this.recordingDeviceTypes = ActionHandler.isHybridActive ? [InputDeviceType.Hybrid] : [InputDeviceType.Controller];
		this.contextNameDiv = MustGetElement(".editor-input-binding-panel__context-name", this.Root);
		this.actionNameDiv = MustGetElement(".editor-input-binding-panel__action-name", this.Root);
		this.gestureIcon = MustGetElement(".editor-input-binding-panel__gesture-icon", this.Root);
		this.gestureIconText = MustGetElement(".editor-input-binding-panel__gesture-text", this.Root);
	}

	onAttach() {
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		engine.on("InputGestureRecorded", this.onInputGestureRecorded, this);
		this.Root.addEventListener("engine-input", this.engineInputListener);

		Input.beginRecordingGestures(this.recordingDeviceTypes, true);
	}

	onDetach(): void {
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		engine.off("InputGestureRecorded", this.onInputGestureRecorded, this);
		this.Root.removeEventListener("engine-input", this.engineInputListener);

		Input.stopRecordingGestures();
	}

	private updateData() {
		const {
			contextName = "",
			context = InputContext.INVALID,
			actionName = "",
			actionID = 0,
		} = this.editorInputBindingPanelNode ?? {};
		const gestureIconUrl = `${Input.getPrefix(this.inputDeviceType)}${Icon.getIconFromActionID(actionID, this.inputDeviceType, context, false)}`;
		this.contextNameDiv.setAttribute("title", contextName);
		this.actionNameDiv.setAttribute("data-l10n-id", actionName);
		this.gestureIcon.style.setProperty("background-image", `url(${gestureIconUrl})`);
		this.gestureIconText.innerHTML = mapIconToText[gestureIconUrl as "ps4_icon_start" | "ps4_icon_share"] ?? "";
		this.gestureIconText.classList.toggle("hidden", !["ps4_icon_start", "ps4_icon_share"].includes(gestureIconUrl));
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'node':
				this.editorInputBindingPanelNode = newValue ? JSON.parse(newValue) : null;
				this.updateData();
				break;
		}
	}

	onReceiveFocus() {
		FocusManager.setFocus(this.Root);
		NavTray.clear();
	}

	private onInputGestureRecorded({ index }: InputGestureRecordedData) {
		const {
			context = InputContext.INVALID,
			actionID = 0,
		} = this.editorInputBindingPanelNode ?? {};
		Input.bindAction(actionID, 0, index, context);
		this.close();
	}

	private onActiveDeviceTypeChanged(event: ActiveDeviceTypeChangedEvent) {
		if (event.detail.deviceType != this.inputDeviceType && ([InputDeviceType.Controller, InputDeviceType.Hybrid].includes(event.detail.deviceType))) {
			this.close();
		}
	}

	onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status == InputActionStatuses.FINISH && (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'touch-tap' || inputEvent.detail.name == 'keyboard-escape')) {
			this.close();
		}
	}

	private getContent() {
		const {
			contextName = "",
			actionName = "",
		} = this.editorInputBindingPanelNode ?? {};

		return `
			<div class="w-full h-full flow-column justify-center items-center">
				<fxs-header title="LOC_UI_CONTROLLER_MAPPING_BIND_TITLE" class="font-title text-xl text-center uppercase tracking-100" filigree-style="none"></fxs-header>
				<fxs-header title="${contextName}" class="editor-input-binding-panel__context-name uppercase text-center font-title text-base tracking-100 mt-8" filigree-style="none"></fxs-header>
				<div class="flow-row justify-center -mt-3 mb-3">
					<div class="img-unit-panel-divider -scale-y-100"></div>
					<div class="img-unit-panel-divider -scale-100"></div>
				</div>
				<div class="flow-row items-center">
					<div class="editor-input-binding-panel__action-name flex-auto whitespace-nowrap font-fit-shrink font-title text-base text-accent-3 uppercase mr-2" data-l10n-id="${actionName}"></div>
					<div class="editor-input-binding-panel__gesture-container relative w-8 h-8 flex justify-center z-1">
						<div class="editor-input-binding-panel__gesture-icon absolute inset-0 bg-center bg-contain bg-no-repeat"></div>
						<div class="editor-input-binding-panel__gesture-text absolute bottom-7 text-accent-1 text-shadow text-2xs"></div>
					</div>
				</div>
				<div class="font-title text-lg text-accent-2 uppercase text-center mt-6" data-l10n-id="LOC_UI_CONTROLLER_MAPPING_BIND_GESTURE"></div>
			</div>
		`
	}
}

const EditorInputBindingPanelTagName = 'editor-input-binding-panel';
Controls.define(EditorInputBindingPanelTagName, {
	createInstance: EditorInputBindingPanel,
	description: 'Panel to bind a new gesture to an action.',
	classNames: ['editor-input-binding-panel', 'fullscreen', 'flow-row', 'justify-center', 'items-center', 'pointer-events-auto'],
	attributes: [{ name: 'node' }],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		[EditorInputBindingPanelTagName]: ComponentRoot<EditorInputBindingPanel>
	}
}

export interface EditorControllerChooserNode {
	context: InputContext
	actionName: string;
	actionID: InputActionID;
}

export class EditorControllerChooserItem extends FxsChooserItem {
	private _chooserNode?: EditorControllerChooserNode;

	public get editorControllerChooserNode(): EditorControllerChooserNode | undefined {
		return this._chooserNode;
	}

	public set editorControllerChooserNode(value: EditorControllerChooserNode | undefined) {
		this._chooserNode = value;
	}

	private actionNameDiv!: HTMLElement;
	private gestureIcon!: HTMLElement;
	private gestureIconText!: HTMLElement;
	private inputDeviceType: InputDeviceType = InputDeviceType.Controller;
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);

	onInitialize() {
		super.onInitialize();

		this.renderChooserItem();

		this.actionNameDiv = MustGetElement(".editor-controller-chooser-item__action-name", this.Root);
		this.gestureIcon = MustGetElement(".editor-controller-chooser-item__gesture-icon", this.Root);
		this.gestureIconText = MustGetElement(".editor-controller-chooser-item__gesture-text", this.Root);
	}

	onAttach() {
		super.onAttach();
		this.updateInputDeviceType();
		engine.on("InputActionBinded", this.onInputActionBinded, this);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
	}

	onDetach(): void {
		engine.off("InputActionBinded", this.onInputActionBinded, this);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		super.onDetach();
	}

	renderChooserItem() {
		this.Root.innerHTML = "";

		super.renderChooserItem();

		const {
			actionName = "",
		} = this.editorControllerChooserNode ?? {};

		const content = document.createElement("div");
		content.classList.add("flow-row", "p-2", "pl-3", "relative", "items-center", "flex-auto");

		content.innerHTML = `
			<div class="editor-controller-chooser-item__action-name flex-auto whitespace-nowrap font-fit-shrink font-title text-base text-accent-2 uppercase mr-2" data-l10n-id="${actionName}"></div>
			<div class="editor-controller-chooser-item__gesture-container relative w-8 h-8 flex justify-center z-1">
				<div class="editor-controller-chooser-item__gesture-icon absolute inset-0 bg-center bg-contain bg-no-repeat"></div>
				<div class="editor-controller-chooser-item__gesture-text absolute bottom-7 text-accent-1 text-shadow text-2xs"></div>
			</div>
		`;

		this.Root.appendChild(content);
	}

	private updateData() {
		const {
			context = InputContext.INVALID,
			actionName = "",
			actionID = 0,
		} = this.editorControllerChooserNode ?? {};
		const gestureIconUrl = `${Input.getPrefix(this.inputDeviceType)}${Icon.getIconFromActionID(actionID, this.inputDeviceType, context, false)}`;
		this.actionNameDiv.setAttribute("data-l10n-id", actionName);
		this.gestureIcon.style.setProperty("background-image", `url(${gestureIconUrl})`);
		this.gestureIconText.innerHTML = mapIconToText[gestureIconUrl as "ps4_icon_start" | "ps4_icon_share"] ?? "";
		this.gestureIconText.classList.toggle("hidden", !["ps4_icon_start", "ps4_icon_share"].includes(gestureIconUrl));
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'node':
				this.editorControllerChooserNode = newValue ? JSON.parse(newValue) : null;
				this.updateData();
				break;
		}
	}

	private onInputActionBinded({ context: bindedContext, actionId: bindedActionID }: InputActionBindedData) {
		const {
			context = InputContext.INVALID,
			actionID = 0,
		} = this.editorControllerChooserNode ?? {};
		if ((context == InputContext.ALL && actionID == bindedActionID) || (context == bindedContext && actionID == bindedActionID)) {
			this.updateData();
		}
	}

	private onActiveDeviceTypeChanged(_event: ActiveDeviceTypeChangedEvent) {
		this.updateInputDeviceType();
	}

	// TODO: update only on layout change (ounce-right, ounce-left) as this should be the only time the component stays alive and update
	private updateInputDeviceType() {
		if (ActionHandler.isHybridActive) {
			this.inputDeviceType = InputDeviceType.Hybrid;
		}
		else if (ActionHandler.isGamepadActive) {
			this.inputDeviceType = InputDeviceType.Controller;
		}
		this.updateData();
	}
}

Controls.define('editor-controller-chooser-item', {
	createInstance: EditorControllerChooserItem,
	description: 'A chooser item to be used with the editor controller screen',
	classNames: ['editor-controller-chooser-item', "chooser-item_unlocked"],
	styles: [
		'fs://game/base-standard/ui/chooser-item/chooser-item.css',
	],
	attributes: [{ name: 'node' }, { name: "disabled" }, { name: "index" }, { name: 'selected' }, { name: "select-highlight" }]
});

declare global {
	interface HTMLElementTagNameMap {
		'editor-controller-chooser-item': ComponentRoot<EditorControllerChooserItem>
	}
}

export interface ControllerMapActionElementNode {
	context: InputContext
	actionName: string;
	actionID: InputActionID;
	gestureKey?: number;
}

export class ControllerMapActionElement extends Component {
	private _node?: ControllerMapActionElementNode
	private highlight: boolean = false;

	public get controllerMapActionElementNode(): ControllerMapActionElementNode | undefined {
		return this._node;
	}

	public set controllerMapActionElementNode(value: ControllerMapActionElementNode) {
		this._node = value;
	}

	private actionNameDiv!: HTMLElement;
	private gestureIconContainer!: HTMLElement;
	private gestureIcon!: HTMLElement;
	private gestureIconText!: HTMLElement;
	private highlightDiv!: HTMLElement
	private handleResize = this.onResize.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
	private inputDeviceLayout: InputDeviceLayout = InputDeviceLayout.Unknown;
	private inputDeviceType: InputDeviceType = InputDeviceType.Controller;

	onInitialize() {
		super.onInitialize();

		this.render();

		this.actionNameDiv = MustGetElement(".controller-map-action-element__action-name", this.Root);
		this.gestureIconContainer = MustGetElement(".controller-map-action-element__gesture-container", this.Root);
		this.gestureIcon = MustGetElement(".controller-map-action-element__gesture-icon", this.Root);
		this.gestureIconText = MustGetElement(".controller-map-action-element__gesture-text", this.Root);
		this.highlightDiv = MustGetElement(".controller-map-action-element__highlight", this.Root);
	}

	onAttach() {
		super.onAttach();

		engine.on("InputActionBinded", this.onInputActionBinded, this);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		window.addEventListener("resize", this.handleResize);

		this.updateInputDeviceType();
		this.updateHighlight();
		this.updateActionNameDiv();
		this.updateGestureIconContainer();
	}

	onDetach(): void {
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		window.removeEventListener("resize", this.handleResize);
		engine.off("InputActionBinded", this.onInputActionBinded, this);
		super.onDetach();
	}

	render() {
		const {
			actionName = "",
		} = this.controllerMapActionElementNode ?? {};

		this.Root.innerHTML = `
			<div class="relative flow-row items-center">
				<div class="controller-map-action-element__highlight img-popup_icon_glow absolute bg-full -inset-y-8 -inset-x-14 opacity-0 transition-opacity"></div>
				<div class="controller-map-action-element__action-name font-body text-base text-accent-2 mx-1 max-w-50 whitespace-nowrap font-fit-shrink" data-l10n-id="${actionName}" style="coh-font-fit-min-size:12px;"></div>
				<div class="controller-map-action-element__gesture-container relative flex justify-center z-1">
					<div class="controller-map-action-element__gesture-icon absolute inset-0 bg-center bg-contain bg-no-repeat"></div>
					<div class="controller-map-action-element__gesture-text absolute bottom-7 text-accent-1 text-shadow text-2xs"></div>
				</div>
			</div>
		`
	}

	private updateData() {
		const {
			context = InputContext.INVALID,
			actionName = "",
			actionID = 0,
			gestureKey,
		} = this.controllerMapActionElementNode ?? {};
		const gestureIconUrl = `${Input.getPrefix(this.inputDeviceType)}${!gestureKey ? Icon.getIconFromActionID(actionID, this.inputDeviceType, context, false) : Input.getKeyIcon(gestureKey, false)}`;

		this.actionNameDiv.setAttribute("data-l10n-id", actionName);
		this.actionNameDiv.classList.toggle("text-accent-3", this.inputDeviceType == InputDeviceType.Hybrid && UNBINDABLE_ACTION_NAMES.includes(actionName as UnbindableActionName));
		this.actionNameDiv.classList.toggle("text-accent-2", !UNBINDABLE_ACTION_NAMES.includes(actionName as UnbindableActionName));
		this.gestureIcon.style.setProperty("background-image", `url(${gestureIconUrl})`);
		this.gestureIconText.innerHTML = mapIconToText[gestureIconUrl as "ps4_icon_start" | "ps4_icon_share"] ?? "";
		this.gestureIconText.classList.toggle("hidden", !["ps4_icon_start", "ps4_icon_share"].includes(gestureIconUrl));

		// we remove the platform specific part of gestureIconUrl; we can't do a simple gesture key to class map because we need to be reactive on the hybrid icon override
		const iconClass = gestureIconUrl.split("_").slice(2).join("-");
		this.Root.classList.value = `controller-map-action-element ${INPUT_LAYOUT_TO_CLASS[this.inputDeviceLayout]} ${iconClass}`;
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'node':
				this.controllerMapActionElementNode = newValue ? JSON.parse(newValue) : undefined;
				this.updateData();
				break;
			case 'highlight':
				this.highlight = newValue == "true";
				this.updateHighlight();
		}
	}

	private onActiveDeviceTypeChanged(_event: ActiveDeviceTypeChangedEvent) {
		this.updateInputDeviceType();
	}

	private onResize() {
		waitForLayout(() => {
			this.updateActionNameDiv();
			this.updateGestureIconContainer();
		})
	}

	private onInputActionBinded({ context: bindedContext, actionId: bindedActionID }: InputActionBindedData) {
		const {
			context = InputContext.INVALID,
			actionID = 0,
		} = this.controllerMapActionElementNode ?? {};
		if ((context == InputContext.ALL && actionID == bindedActionID) || (context == bindedContext && actionID == bindedActionID)) {
			this.updateData();
		}
	}

	private updateActionNameDiv() {
		let mode = "xs";
		if (window.innerHeight > Layout.pixelsToScreenPixels(900) && window.innerWidth > Layout.pixelsToScreenPixels(1488)) {
			mode = "base";
		} else if (window.innerHeight > Layout.pixelsToScreenPixels(768) && window.innerWidth > Layout.pixelsToScreenPixels(1366)) {
			mode = "sm"
		}
		this.actionNameDiv.classList.toggle("text-base", mode == "base");
		this.actionNameDiv.classList.toggle("text-sm", mode == "sm");
		this.actionNameDiv.classList.toggle("text-xs", mode == "xs");
		this.actionNameDiv.classList.toggle("max-w-40", mode == "base");
		this.actionNameDiv.classList.toggle("max-w-32", mode == "sm" || mode == "xs");
	}

	private updateGestureIconContainer() {
		let mode = "xs";
		if (window.innerHeight > Layout.pixelsToScreenPixels(900) && window.innerWidth > Layout.pixelsToScreenPixels(1488)) {
			mode = "base";
		} else if (window.innerHeight > Layout.pixelsToScreenPixels(768) && window.innerWidth > Layout.pixelsToScreenPixels(1366)) {
			mode = "sm"
		}
		this.gestureIconContainer.classList.toggle("w-8", mode == "base");
		this.gestureIconContainer.classList.toggle("h-8", mode == "base");

		this.gestureIconContainer.classList.toggle("w-7", mode == "sm");
		this.gestureIconContainer.classList.toggle("h-7", mode == "sm");

		this.gestureIconContainer.classList.toggle("w-6", mode == "xs");
		this.gestureIconContainer.classList.toggle("h-6", mode == "xs");
	}

	private updateHighlight() {
		this.highlightDiv.classList.toggle("opacity-0", !this.highlight)
	}

	private updateInputDeviceLayout() {
		const inputDeviceLayout = Input.getInputDeviceLayout(this.inputDeviceType) || this.inputDeviceLayout;
		if (inputDeviceLayout != this.inputDeviceLayout) {
			this.inputDeviceLayout = inputDeviceLayout;
		}
	}

	// TODO: update only on layout change (ounce-right, ounce-left) as this should be the only time the component stays alive and update
	private updateInputDeviceType() {
		if (ActionHandler.isHybridActive) {
			this.inputDeviceType = InputDeviceType.Hybrid;
		}
		else if (ActionHandler.isGamepadActive) {
			this.inputDeviceType = InputDeviceType.Controller;
		}
		this.updateInputDeviceLayout();
		this.updateData();
	}
}

Controls.define('controller-map-action-element', {
	createInstance: ControllerMapActionElement,
	description: 'An action placed within the controller icon',
	classNames: ['controller-map-action-element'],
	attributes: [{ name: 'node' }, { name: "highlight" }]
});

declare global {
	interface HTMLElementTagNameMap {
		'controller-map-action-element': ComponentRoot<ControllerMapActionElement>
	}
}
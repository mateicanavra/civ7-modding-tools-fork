/**
 * @file tutorial-callout.ts
 * @copyright 2021-2024, Firaxis Games
 * @description An informational box for tutorial items, used to tell what happened or what needs to happen to progress.
 * Note, since information is passed to the callout via JSON, callbacks are performed back in the tutorial manager upon close.
 * TODO: Look into changing the API to not require JSON blob (because it eats up memory on the DOM node)
 */


/// <reference path="../../../core/ui/component-support.ts" />
// TODO: Reactivate after User Test April 2024
// import { FxsCheckbox } from '/core/ui/components/fxs-checkbox.js';
// import DialogManager, { DialogBoxAction, DialogBoxCallbackSignature } from '/core/ui/dialog-box/manager-dialog-box.js'
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import FxsButton from '/core/ui/components/fxs-button.js';
import FxsNavHelp from '/core/ui/components/fxs-nav-help.js';
import { FxsMinusPlusButton } from '/core/ui/components/fxs-minus-plus.js'
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import ViewManager from "/core/ui/views/view-manager.js";
import { LowerCalloutEvent } from '/base-standard/ui/tutorial/tutorial-events.js';
import TutorialItem, { TutorialCalloutDefinition, TutorialCalloutOptionDefinition, /* TutorialLevel,*/ TutorialAdvisorType, TutorialCalloutType } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager, { TutorialCalloutMinimizeEventName } from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import WatchOutManager from '/base-standard/ui/watch-out/watch-out-manager.js';
import { ContextManagerEvents } from '/core/ui/context-manager/context-manager.js';

enum CalloutContentType {
	TITLE,
	BASE,
	ADVISOR
}


/**
 *	Don't extend from Panel - doing so the close() method from panel-support is called on view change.
 */
class TutorialCallout extends Component {

	private itemID: string = "";
	private isClosed: boolean = true; 		// Is this in a closed stated?

	private option1?: TutorialCalloutOptionDefinition | undefined;
	private option2?: TutorialCalloutOptionDefinition | undefined;
	private option3?: TutorialCalloutOptionDefinition | undefined;

	private selectedOptionNum: number = -1;
	private focusSet: boolean = false;	// Has a focus lock been requested?
	private nextID?: string;
	private isMinimized: boolean = false;

	private calloutMinimizeButton!: ComponentRoot<FxsMinusPlusButton>;
	private calloutMinimizeNavHelp!: ComponentRoot<FxsNavHelp>;
	private calloutMaximizeButton!: ComponentRoot<FxsButton>;

	private engineInputListener = this.onEngineInput.bind(this);
	private contextChangedInputListener = this.onContextChanged.bind(this);

	private activeDeviceTypeListener = this.render.bind(this);
	private activeContextChangedListener = this.render.bind(this);

	get isMinimizeDisabled(): boolean {
		return this.Root.getAttribute("minimize-disabled") == "true";
	}

	get hasOptions(): boolean {
		return this.option1 != undefined || this.option2 != undefined || this.option3 != undefined;
	}

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach(): void {
		super.onAttach();

		if (!this.isClosed) {
			console.error("tutorial-callout: onAttach(): Attempting to load tutorial callout content when it's not marked as 'closed'. id: ", this.itemID);
			return;
		}

		this.itemID = this.Root.getAttribute("itemID") ?? "";
		if (this.itemID == "") {
			console.warn("tutorial-callout: onAttach(): Loading a tutorial callout but no associated item ID was passed in.");
		}

		const calloutDataSerialized: string | null = this.Root.getAttribute("value");
		if (!calloutDataSerialized) {
			console.error("tutorial-callout: onAttach(): Could not raise tutorial callout because no data was passed in. id: ", this.itemID);
			return;
		}

		const data: TutorialCalloutDefinition | null = JSON.parse(calloutDataSerialized);
		if (data == null) {
			console.error("tutorial-callout: onAttach(): Could not raise tutorial callout because data provided wasn't a valid definition. id: ", this.itemID);
			console.log("tutorial-callout: onAttach(): Callout data: ", calloutDataSerialized);
			return;
		}

		if (data.type == TutorialCalloutType.NOTIFICATION) {
			this.Root.classList.add("type--notification");
		}

		this.calloutMinimizeButton = MustGetElement("fxs-minus-plus", this.Root);
		this.calloutMinimizeNavHelp = MustGetElement(".callout-minimize__navhelp", this.Root);
		this.calloutMinimizeButton.addEventListener('action-activate', this.onCalloutMinimizeToggle);
		this.calloutMinimizeButton.dataset.type = 'minus';
		this.calloutMinimizeButton.setAttribute("data-audio-group-ref", "tutorial-popup");
		this.calloutMinimizeButton.setAttribute("data-audio-activate-ref", "none");
		this.calloutMinimizeButton.setAttribute("data-audio-press-ref", "none");

		this.calloutMaximizeButton = MustGetElement(".tutorial-callout-min__button", this.Root);
		this.calloutMaximizeButton.addEventListener('action-activate', this.onCalloutMinimizeToggle);
		this.calloutMaximizeButton.setAttribute("data-audio-group-ref", "tutorial-popup");
		this.calloutMaximizeButton.setAttribute("data-audio-activate-ref", "none");

		// TODO: Reactivate after User Test April 2024
		// const checkBox: ComponentRoot<FxsCheckbox> | null = this.Root.querySelector("fxs-checkbox");
		// if (checkBox) {
		// 	checkBox.style.display = TutorialManager.totalCompletedItems() <= TutorialManager.MAX_CALLOUT_CHECKBOX ? "flex" : "none";
		// 	checkBox.setAttribute("action-key", "inline-shell-action-1");
		// 	checkBox.addEventListener("component-value-changed", (event: CustomEvent) => {
		// 		const checked: boolean = event.detail.value;
		// 		if (checked) {
		// 			const dialogCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
		// 				if (eAction == DialogBoxAction.Confirm) {
		// 					const userConfig: ConfigurationUserLibrary = Configuration.getUser();
		// 					userConfig.setTutorialLevel(TutorialLevel.None);
		// 					engine.trigger('update-tutorial-level');
		// 				} else {
		// 					checkBox.setAttribute("selected", "false");
		// 				}
		// 			}
		// 			DialogManager.createDialog_ConfirmCancel({
		// 				title: "LOC_TUTORIAL_DEACTIVATE_TITLE",
		// 				body: "LOC_TUTORIAL_DEACTIVATE_BODY",
		// 				callback: dialogCallback
		// 			});
		// 		}
		// 	});
		// }

		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
		window.addEventListener(TutorialCalloutMinimizeEventName, this.onCalloutMinimizeToggle);
		engine.on(ContextManagerEvents.OnChanged, this.contextChangedInputListener);
		engine.on('InputContextChanged', this.activeContextChangedListener, this);

		this.Root.addEventListener('engine-input', this.engineInputListener);

		if (data.title) {
			this.Root.classList.toggle('show-title', data.title != "");
			const title: string = Locale.compose(data.title);
			this.setHTMLInDivClass(title, "tutorial-callout-title", CalloutContentType.TITLE);
		}

		this.setAdvisor(data.advisorType);

		this.Root.classList.toggle("handheld", UI.getViewExperience() == UIViewExperience.Handheld);

		// Reset callout state.
		this.selectedOptionNum = -1;
		this.focusSet = false;
		this.nextID = undefined;

		this.option1 = data.option1;
		this.option2 = data.option2;
		this.option3 = data.option3;

		// Setup with new data.
		this.setupOption(1, this.option1);
		this.setupOption(2, this.option2);
		this.setupOption(3, this.option3);

		this.isClosed = false;
		this.render();
		this.Root.setAttribute("data-audio-group-ref", "tutorial-popup");
		this.playSound("data-audio-popup-open", "tutorial-popup");
		engine.trigger("TutorialCallout");
	}

	onDetach(): void {
		window.removeEventListener(TutorialCalloutMinimizeEventName, this.onCalloutMinimizeToggle);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
		engine.off(ContextManagerEvents.OnChanged, this.contextChangedInputListener);
		engine.off('InputContextChanged', this.activeContextChangedListener, this);
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		this.playSound("data-audio-close-selected");
		engine.trigger("TutorialCallout");
		super.onDetach();
	}

	private getContentData(type: CalloutContentType = CalloutContentType.BASE) {
		const item: TutorialItem | undefined = TutorialManager.getCalloutItem(this.itemID) || WatchOutManager.currentWatchOutPopupData?.item;

		if (!item) {
			console.error("tutorial-callout: getContentData(): Attempting to get tutorial item but not found, id: ", this.itemID);
			return;
		}

		const calloutDefine: TutorialCalloutDefinition | undefined = item.callout;
		if (!calloutDefine) {
			console.error("tutorial-callout: getContentData(): Tutorial: Callout data missing; cannot raise. id: ", this.itemID);
			return;
		}

		try {
			switch (type) {
				case CalloutContentType.BASE: {
					// Resolve LOC strings and apply any parameters that are to be passed in.
					// Does a body parameter script that needs to be run before passing data to callout?
					let content: string = "";

					if (calloutDefine.body) {
						content = calloutDefine.body.text;
					}
					if (calloutDefine.body?.getLocParams) {
						TutorialManager.calloutBodyParams = calloutDefine.body.getLocParams(item);
					}

					let prompts: string[] = [];
					if (calloutDefine.actionPrompts) {
						prompts = TutorialSupport.getTutorialPrompts(calloutDefine.actionPrompts);
					}
					return Locale.stylize(content, ...TutorialManager.calloutBodyParams, ...prompts);
				}
				case CalloutContentType.ADVISOR: {
					// Resolve LOC strings and apply any parameters that are to be passed in.
					// Does a body parameter script that needs to be run before passing data to callout?
					let content: string = "";

					if (calloutDefine.advisor?.text) {
						content = calloutDefine.advisor.text;
					}

					if (TutorialManager.calloutAdvisorParams.length <= 0 && calloutDefine.advisor?.getLocParams) {
						TutorialManager.calloutAdvisorParams = calloutDefine.advisor.getLocParams(item).filter(Boolean);
					}

					return Locale.stylize(content, ...TutorialManager.calloutAdvisorParams);
				}
			}
		} catch (error) {
			const errorMessage = (error as Error).message;
			console.error("Tutorial Callout: " + this.itemID + ": " + errorMessage);
		}

		return "";
	}

	/// Helper
	private setHTMLInDivClass(innerHTML: string, cssClassName: string, contentType: CalloutContentType) {
		const element: HTMLElement | null = this.Root.querySelector<HTMLElement>(`.${cssClassName}`);
		if (!element) {
			console.warn("tutorial-callout: setStringInDivClass(): Missing element with '." + cssClassName + "'");
			return;
		}

		if (innerHTML.length == 0) {
			let elementHidden: HTMLElement = element;
			if (contentType == CalloutContentType.ADVISOR) {
				const parent: HTMLElement | null = element.parentElement;
				if (parent) {
					elementHidden = parent;
				}
			}
			elementHidden.classList.add("empty");
		}

		element.innerHTML = Locale.stylize(innerHTML);
	}

	private setAdvisor(advisorType?: TutorialAdvisorType) {
		const advisorTopContainer: HTMLElement = MustGetElement('.tutorial-callout-body-advisor-topper', this.Root);
		const advisorTitleContainer: HTMLElement = MustGetElement(".tutorial-callout-title-container", this.Root);
		const advisorImageElement: HTMLElement = MustGetElement('.tutorial-callout-body-advisor-image', this.Root);

		let url: string = "";
		if (advisorType) {
			switch (advisorType) {
				case "advisor-military":
					url = UI.getIcon("ADVISOR_MILITARY", "CIRCLE_MASK");
					break;

				case "advisor-culture":
					url = UI.getIcon("ADVISOR_CULTURE", "CIRCLE_MASK");
					break;

				case "advisor-science":
					url = UI.getIcon("ADVISOR_SCIENCE", "CIRCLE_MASK");
					break;

				case "advisor-economic":
					url = UI.getIcon("ADVISOR_ECONOMIC", "CIRCLE_MASK");
					break;
			}
		}

		if (url != "") {
			const cssUrl = `url('fs://game/${url}')`;
			advisorImageElement.style.backgroundImage = cssUrl;

			this.Root.classList.remove("empty-advisor");
			advisorTopContainer.classList.remove("hidden");
			advisorTitleContainer.classList.add("mt-8");
		} else {
			this.Root.classList.add("empty-advisor");
			advisorImageElement.classList.add("no-advisor");
			advisorTopContainer.classList.add("hidden");
			advisorTitleContainer.classList.remove("mt-8");
		}
	}

	/// Helper
	private setupOption(optionNum: number, calloutOptionDef: TutorialCalloutOptionDefinition | undefined) {
		const cssClassName = `tutorial-callout-option${optionNum}`;
		const element: HTMLElement | null = this.Root.querySelector<HTMLElement>(`.${cssClassName}`);
		if (!element) {
			console.warn("tutorial-callout: setupOption(): Missing element with '." + cssClassName + "'");
			return;
		}
		element.classList.add("relative", "leading-none", "break-words", "max-h-14", "max-w-80", "mx-3", "mb-2");
		if (calloutOptionDef) {
			const caption: string | undefined = Locale.compose(calloutOptionDef.text);
			if (caption == undefined || caption == null) {
				console.error("tutorial-callout: setupOption(): Missing caption");
				return;
			}
			if (FxsNavHelp.getGamepadActionName(calloutOptionDef.actionKey.toLowerCase()) == "shell-action-1") {
				console.error("tutorial-callout: setupOption(): invalid actionKey inline-shell-action-1 (used for the deactivate tutorial checkbox)");
				return;
			}

			element.setAttribute("caption", caption);
			element.setAttribute("data-audio-activate-ref", "none");
			element.setAttribute("action-key", calloutOptionDef.actionKey);

			element.addEventListener("action-activate", () => {
				if (calloutOptionDef.closes && !this.isClosed) {
					this.selectedOptionNum = optionNum;
					this.nextID = calloutOptionDef.nextID;
					this.close();
				}
			});

			// If callout has interactibility, ensure it has locked the focus.			
			if (calloutOptionDef.actionKey.length > 0) {
				this.Root.classList.add('trigger-nav-help');

				if (!this.focusSet) {	// If focus isn't locked yet...
					this.focusSet = FocusManager.lockFocus(this.Root, "tutorial-callout", "Tutorial callout contains buttons.");
					ViewManager.getHarness()?.classList.remove("trigger-nav-help");
				}
			}
		} else {
			// Unused option
			element.style.display = "none";
		}
	}

	private onContextChanged() {
		if (this.focusSet) {
			ViewManager.getHarness()?.classList.remove("trigger-nav-help");
		}
	}

	private tryHandleInput(optionNum: number, calloutOptionDef: TutorialCalloutOptionDefinition | undefined, inputEvent: InputEngineEvent): boolean {
		if (calloutOptionDef) {
			const gamepadActionName: string | undefined = FxsNavHelp.getGamepadActionName(calloutOptionDef.actionKey.toLowerCase());
			if (gamepadActionName != undefined && inputEvent.detail.name == gamepadActionName) {
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				if (calloutOptionDef.closes && !this.isClosed) {
					this.selectedOptionNum = optionNum;
					this.nextID = calloutOptionDef.nextID;
					this.close();
				}

				return true; // even when there is no callback
			} // Else the input event is not for that option
		} // Else the option is not available

		return false;
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		// Only process finished messages, early out to others.
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		const eventName = inputEvent.detail.name;

		// Except for a call to raise the pause menu, or camera pans, consume all other input...
		if (eventName.startsWith("camera")) {
			return;
		} else if (eventName == "sys-menu") {
			// Release the lock for the pause menu
			this.Root.classList.remove('trigger-nav-help');

			if (this.focusSet) {
				this.focusSet = !FocusManager.unlockFocus(this.Root, "tutorial-callout");
				return;
			}
		} else if (eventName == "shell-action-1" || eventName == "shell-action-3" || eventName == "center-plot-cursor") {
			// Let the TutorialManager catch these inputs
			return;
		}

		// Early out if no options take input. (May occur with KBM hotkeys)
		if (!this.hasOptions) {
			if (ActionHandler.isGamepadActive) {
				console.error(`tutorial-callout: Attempt to handle input ${inputEvent.detail.name} but callout doesn't take input.`);
			}
			return;
		}

		// Don't handle callout input when minimized
		if (this.isMinimized) {
			return;
		}

		if (this.tryHandleInput(1, this.option1, inputEvent)) {
			return;
		}
		if (this.tryHandleInput(2, this.option2, inputEvent)) {
			return;
		}
		if (this.tryHandleInput(3, this.option3, inputEvent)) {
			return;
		}

		inputEvent.stopPropagation();
		inputEvent.preventDefault();
	}

	private onCalloutMinimizeToggle = () => {
		let wasMinimized = this.isMinimized;
		if (this.isMinimizeDisabled) {
			this.isMinimized = false;
		} else {
			this.isMinimized = !this.isMinimized;
		}

		if (this.isMinimized) {
			if (this.focusSet) {
				this.focusSet = !FocusManager.unlockFocus(this.Root, "tutorial-callout");
				ViewManager.getHarness()?.classList.add("trigger-nav-help");
			}
			if (!wasMinimized) {
				Audio.playSound("data-audio-minus-press", "tutorial-popup");
			}
		}
		else {
			if (this.hasOptions) {
				if (!this.focusSet) {
					this.focusSet = FocusManager.lockFocus(this.Root, "tutorial-callout", "Tutorial callout contains buttons.");
					ViewManager.getHarness()?.classList.remove("trigger-nav-help");
				}
			}
			if (wasMinimized) {
				this.playSound("data-audio-popup-open", "tutorial-popup");
			}
		}
		this.updateCalloutMinimizedState();
	}

	private updateCalloutMinimizedState() {
		this.Root.classList.toggle("minimized", this.isMinimized);
		let maximizeCaption = "LOC_TUTORIAL_REOPEN_KBM";
		switch (ActionHandler.deviceType) {
			case InputDeviceType.Controller:
				maximizeCaption = "LOC_TUTORIAL_REOPEN_GAMEPAD";
				break;
			case InputDeviceType.Touch:
			case InputDeviceType.XR:
				maximizeCaption = "LOC_TUTORIAL_REOPEN_TOUCH";
				break;
			default:
				break;
		}
		this.calloutMaximizeButton.setAttribute('caption', maximizeCaption);
		this.calloutMinimizeButton.classList.toggle("hidden", ActionHandler.isGamepadActive || this.isMinimizeDisabled);
		this.calloutMinimizeNavHelp.classList.toggle("invisible", this.isMinimizeDisabled);
		this.Root.classList.toggle('trigger-nav-help', ActionHandler.isGamepadActive && !this.isMinimizeDisabled);
	}

	private render() {
		this.updateCalloutMinimizedState();
		this.setHTMLInDivClass(Locale.compose(this.getContentData() || ""), "tutorial-callout-body-text", CalloutContentType.BASE);
		this.setHTMLInDivClass(Locale.compose(this.getContentData(CalloutContentType.ADVISOR) || ""), "advisor-text__content", CalloutContentType.ADVISOR);
	}

	private close() {
		if (this.isClosed) {
			console.error("tutorial-callout: close(): Tutorial callout being closed when already marked closed. id: ", this.itemID);
		}

		const nextID: string | undefined = this.nextID;
		window.dispatchEvent(new LowerCalloutEvent({
			itemID: this.itemID,
			optionNum: this.selectedOptionNum as 1 | 2 | 3,
			nextID: nextID,
			closed: true
		}
		));

		this.isClosed = true;
		this.focusSet = false;

		this.option1 = undefined;
		this.option2 = undefined;
		this.option3 = undefined;
	}
}

Controls.define('tutorial-callout', {
	createInstance: TutorialCallout,
	description: 'Box to point out an event that occurred.',
	styles: ['fs://game/base-standard/ui/tutorial/tutorial-callout.css'],
	content: ['fs://game/base-standard/ui/tutorial/tutorial-callout.html'],
	attributes: [],
	tabIndex: -1
});
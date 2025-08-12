/**
 * @file fxs-chooser-item.ts
 * @copyright 2024, Firaxis Games
 * @description Base component for chooser items.
 * 
 */

import FxsActivatable from '/core/ui/components/fxs-activatable.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';

export const ChooserItemSelectedEventName: string = 'chooser-item-selected';

/**
 * Dispatched when a chooser item is selected
 * 
 * Default behavior is to set the selected attribute of the chooser item to true
 */
export class ChooserItemSelectedEvent extends CustomEvent<void> {
	constructor() {
		super(ChooserItemSelectedEventName, { bubbles: true, cancelable: true });
	}
}

/** 
 * FxsChooserItem can be used as a base class or can be used as a component directly
 * 
 * NOTE: The ChooserItemSelectedEvent bubbles, so make sure you stop propagation when handling it.
 * 
 * Attributes:
 *  content-direction (default: flex-row) - The css class used to set the direction of the content container
 * 	selected (default: false) - Is this chooser item selected?  
 *	selectable-when-disabled (default: false) - Is this chooser item selectable when disabled?
 *    NOTE: setting the selected attribute directly does not trigger selectableWhenDisabled checks, use the class property instead.
 *  select-on-activate (default: false) - When true, select event are sent when the component is activated
 *	select-on-focus (default: false) - Select on focus mode allows selection AND confirmation using gamepad, instead of having to select and confirm as seperate steps.
 *    When true:
 *      The chooser item will automatically be selected when focused.
 *      chooser-item-selected events will be sent whenever the item is focused.
 * 		chooser-item-selected events will be sent by gamepad confirm or click if select-on-activate is true
 * 		action-activate events will only be sent when triggered by gamepad confirm.
 *    When false:
 *      The chooser item will NOT be selected when focused.
 * 		action-activate events will be sent on confirm or click.
 *  	chooser-item-selected events will be sent by gamepad confirm or click if select-on-activate is true
 *  show-frame-on-hover (default: true) - Shows the selection frame on hover
 * 
 *	show-color-bg (default: true) - show the standard gray bg behind the chooser item (hud_sidepanel_list-bg)
 * 
 *  NOTE: the enableDirectDriveMode() function will set select-on-focus and select-on-activate to true and show-frame-on-hover to false
 */
export class FxsChooserItem extends FxsActivatable {
	protected readonly highlight = document.createElement('div');
	protected readonly container = document.createElement('div');
	protected readonly selectedOverlay = document.createElement('div');
	protected readonly disabledOverlay = document.createElement('div');
	protected readonly iconLockToggleFuncs = new Map<HTMLElement, (isLocked: boolean) => void>();

	public get selected() {
		return this.Root.getAttribute("selected") == "true";
	}

	public set selected(value: boolean) {
		const guardedValue = (this.selectableWhenDisabled || !this.disabled) && value;
		this.Root.setAttribute("selected", guardedValue.toString());
	}

	public get selectOnFocus() {
		return this.Root.getAttribute("select-on-focus") == "true";
	}

	public set selectOnFocus(value: boolean) {
		this.Root.setAttribute("select-on-focus", value.toString());
	}

	public get selectOnActivate() {
		return this.Root.getAttribute("select-on-activate") == "true";
	}

	public set selectOnActivate(value: boolean) {
		this.Root.setAttribute("select-on-activate", value.toString());
	}

	public get selectableWhenDisabled() {
		return this.Root.getAttribute("selectable-when-disabled") == "true";
	}

	public set selectableWhenDisabled(value: boolean) {
		this.Root.setAttribute("selectable-when-disabled", value.toString());
	}

	public get showFrameOnHover() {
		return (this.Root.getAttribute("show-frame-on-hover") ?? "true") == "true";
	}

	public set showFrameOnHover(value: boolean) {
		this.Root.setAttribute("show-frame-on-hover", value.toString());
	}

	public get showColorBG() {
		return (this.Root.getAttribute("show-color-bg") ?? "true") == "true";
	}

	public set showColorBG(value: boolean) {
		this.Root.setAttribute("show-color-bg", value.toString());
	}

	public get contentDirection() {
		return this.Root.getAttribute("content-direction") ?? "flex-row";
	}

	constructor(root: ComponentRoot<FxsChooserItem>) {
		super(root);
		this.renderChooserItem();
	}

	override onAttach(): void {
		super.onAttach();

		const childNodes = Array.from(this.Root.children);
		for (const childNode of childNodes) {
			if (childNode != this.container && childNode != this.highlight && childNode != this.disabledOverlay && childNode != this.selectedOverlay) {
				this.container.appendChild(childNode);
			}
		}
	}

	override onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		switch (name) {
			case "disabled":
				this.disabledOverlay.classList.toggle("hidden", newValue != "true");
				super.onAttributeChanged(name, oldValue, newValue);
				break;

			case "selected":
				this.selectedOverlay.classList.toggle("selected", newValue == "true");
				break;

			case "show-frame-on-hover":
				this.selectedOverlay.classList.toggle("show-on-hover", newValue == "true");
				break;
			case "show-color-bg":
				this.Root.classList.toggle("hud_sidepanel_list-bg", newValue == "true");
				break;
			default:
				super.onAttributeChanged(name, oldValue, newValue);
				break;
		}
	}

	override onActivatableBlur() {
		super.onActivatableBlur();

		if (this.selectOnFocus) {
			this.selected = false;
		}
	}

	override onActivatableFocus() {
		super.onActivatableFocus();

		if (this.selectOnFocus) {
			this.triggerSelection();
		}
	}

	override onActivatableEngineInput(inputEvent: InputEngineEvent): void {
		//intercept press events and send them on to be handled
		if (inputEvent.detail.status == InputActionStatuses.START) {
			super.onActivatableEngineInput(inputEvent);
			return;
		}

		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (this.disabled && !this.selectableWhenDisabled) {
			return;
		}

		if (!this.selectOnFocus || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'keyboard-enter') {
			super.onActivatableEngineInput(inputEvent);
		}

		if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap' || inputEvent.detail.name == 'keyboard-enter') {
			if (this.selectOnActivate) {
				this.triggerSelection();
			}

			if (!inputEvent.defaultPrevented) {
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
			}
		}
	}

	public enableDirectDriveMode() {
		this.selectOnActivate = true;
		this.selectOnFocus = true;
		this.showFrameOnHover = false;
	}

	public toggleIconLock(iconEle: HTMLElement, isLocked: boolean) {
		this.iconLockToggleFuncs.get(iconEle)?.(isLocked);
	}

	public createChooserIcon(iconStr: string, isLocked: boolean): HTMLElement {
		const iconEle: HTMLElement = document.createElement('div');
		iconEle.classList.value = "fxs-chooser-item-icon-bg relative flex self-center items-center justify-center pointer-events-none";

		const image: HTMLElement = document.createElement('div');
		image.classList.value = "fxs-chooser-item-icon-image relative flex flex-col items-center";
		image.style.setProperty("background-image", `url(${iconStr})`);
		iconEle.appendChild(image);

		const lockImageBg: HTMLElement = document.createElement('div');
		lockImageBg.classList.value = "fxs-chooser-item-lock-bg absolute inset-0";
		image.appendChild(lockImageBg);

		const lockImage: HTMLElement = document.createElement('div');
		lockImage.classList.add("hidden");
		lockImage.classList.value = "fxs-chooser-item-lock-image absolute bg-cover";
		image.appendChild(lockImage);

		const toggleLockFunc = (isLocked: boolean) => {
			image.classList.toggle("opacity-50", isLocked);
			lockImage.classList.toggle("hidden", !isLocked);
		};

		this.iconLockToggleFuncs.set(iconEle, toggleLockFunc);

		toggleLockFunc(isLocked);

		return iconEle;
	}

	protected renderChooserItem() {
		this.Root.setAttribute('tabindex', "-1");

		if (this.Root.getAttribute("hover-only-trigger") == null) {
			this.Root.setAttribute('hover-only-trigger', "true");
		}

		this.Root.classList.add("fxs-chooser-item", "hud_sidepanel_list-bg", "flex", "justify-stretch", "items-stretch", "relative");

		this.highlight.classList.add("fxs-chooser-item-highlight", "absolute", "inset-0");
		this.Root.appendChild(this.highlight);

		this.container.classList.add("hud_sidepanel_list-bg-no-fill", "relative", "flex", "flex-auto", this.contentDirection);
		this.Root.appendChild(this.container);

		this.selectedOverlay.classList.add("fxs-chooser-item-selected", "show-on-hover", "img-list-focus-frame", "absolute", "inset-0");
		this.Root.appendChild(this.selectedOverlay);

		this.disabledOverlay.classList.value = "fxs-chooser-item-disabled absolute inset-0 opacity-70 pointer-events-none hidden";
		this.Root.appendChild(this.disabledOverlay);
	}

	protected triggerSelection() {
		const valid = this.Root.dispatchEvent(new ChooserItemSelectedEvent());
		if (valid) {
			this.selected = true;
		}
	}
}

Controls.define('fxs-chooser-item', {
	createInstance: FxsChooserItem,
	description: 'A chooser item base class',
	attributes: [
		{ name: "disabled" },
		{ name: "selected", description: "Is this chooser item selected? (Default: false)" },
		{ name: "show-frame-on-hover", description: "Shows the selection frame on hover" },
		{ name: "show-color-bg", description: "Shows the standard gray bg" }
	],
	images: [
		'fs://game/hud_sidepanel_list-bg.png',
		'fs://game/hud_list-focus_frame.png'
	],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-chooser-item': ComponentRoot<FxsChooserItem>
	}

	interface HTMLElementEventMap {
		'chooser-item-selected': ChooserItemSelectedEvent
	}
}

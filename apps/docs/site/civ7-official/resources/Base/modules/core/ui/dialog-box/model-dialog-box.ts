/**
 * @file model-dialog-box.ts
 * @copyright 2020-2024, Firaxis Games
 * This is the data component for a dialog box.
 */

import { Framework } from '/core/ui/framework.js';
import { IDisplayRequestBase, DisplayHandlerBase, DisplayHideOptions } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import type { ScreenDialogBox } from '/core/ui/dialog-box/screen-dialog-box.js';

export type DialogBoxCallbackSignature = (eAction: DialogBoxAction) => void;
export type DialogBoxValueCallbackSignature = (id: string, newValue: string) => void;
export type DialogBoxValueChangeCallbackSignature = (id: string, newValue: string, option: HTMLElement | undefined) => void;

export interface DialogBoxDefinition {
	/* Unique ID for dialog boxes that can be tested against. If set will prevent other dialog boxes with same id from being added. */
	id?: DialogBoxID;
	/* (optional) title to display in dialog box*/
	title?: string;
	/* required body for the dialog box */

	body: string;
	/* Can a player close this dialog box */ //TODO: how does this work when their are dialogs with "cancel" buttons and mapped to ESC  yet have this set to false?!
	canClose: boolean;
	/* (optional) Should the background be darkened when the mouse-guard goes up. */	// TODO: Should this be "mouse-guard", which is true by default.  Or are their cases where the mouse-guard goes up but we don't want the screen to darken?
	shouldDarken?: boolean;
	/* TODO: strong type the colleciton of what components can be used here. */
	extensions?: string;
	/* (optional) Display an hour glass in the dialog box. */ //TODO: why is this not an extension?
	displayHourGlass?: boolean;
	/* (optional) Game or Shell type of component */
	source?: DialogSource;
	/* (optional) Named display queue the dialog box should be associated with */
	displayQueue?: string;
	/* (optional) Force this dialog to be at the "front" of the stack of what's shown. */
	addToFront?: boolean;
	custom?: boolean;
	styles?: boolean;
	layout?: string;
	name?: string;
}

export interface DialogBoxCustom {
	componentName?: string;
	layoutBodyWrapper?: HTMLElement;
	layoutImageWrapper?: HTMLElement;
	useChooserItem?: boolean;
	chooserInfo?: HTMLElement;
	cancelChooser?: boolean;
}

export interface DialogBoxOption {
	callback?: DialogBoxCallbackSignature;
	valueCallback?: DialogBoxValueCallbackSignature;
	valueChangeCallback?: DialogBoxValueChangeCallbackSignature;
	disabled?: boolean;
	tooltip?: string;
	label: string;
	actions: string[];
}

export enum DialogBoxAction {
	Invalid = -1,
	Error = 0, 	 // Uh oh.
	Confirm = 1, // Any positive answer
	Cancel = 2,  // Any negative answer
	Close = 3,   // Any closure of the popup without an answer 
}

export enum DialogSource {
	Game = "Game",
	Shell = "Shell"
}

export type DialogBoxID = number;

interface DialogBoxData {
	id?: DialogBoxID;
	data: DialogBoxDefinition;
	options?: DialogBoxOption[];
	customOptions?: DialogBoxCustom[];
};

interface DialogBoxRequest extends DialogBoxData, IDisplayRequestBase { }

export class DialogBoxDisplayHandler extends DisplayHandlerBase<DialogBoxRequest> {
	private inactiveRequests: DialogBoxRequest[] = [];
	private isInactive: boolean;

	constructor(private source: DialogSource, priority: number, isInactive: boolean) {
		super(`${source}DialogBox`, priority);
		this.isInactive = isInactive;
	}

	override addDisplayRequest(dialogData: DialogBoxData) {
		if (this.isInactive) {
			const request = Object.assign({ category: this.getCategory() }, dialogData) as DialogBoxRequest;
			this.inactiveRequests.push(request);
			return request;
		} else {
			// Shell dialogs should show, even when suspended
			return super.addDisplayRequest(dialogData, this.source == DialogSource.Shell);
		}
	}

	public show(request: DialogBoxRequest): void {
		const dilaogBoxRoot = Framework.ContextManager.push("screen-dialog-box", { singleton: true, createMouseGuard: true, attributes: request.data });
		dilaogBoxRoot.componentCreatedEvent.on((component: ScreenDialogBox) => {
			component.setDialogId(request.id!);
			component.setOptions(request.data, request.options ?? [], request.customOptions ?? []);
		});
	}

	public hide(_request: DialogBoxRequest, _options: DisplayHideOptions): void {
		const dialog = Framework.ContextManager.getTarget("screen-dialog-box") as ComponentRoot<ScreenDialogBox>;
		if (dialog) {
			dialog.maybeComponent?.close();
		}
	}

	public setInactive() {
		this.isInactive = true;
		this.inactiveRequests = DisplayQueueManager.closeMatching(this.getCategory()) as DialogBoxRequest[];
	}

	public clear() {
		DisplayQueueManager.closeMatching(this.getCategory());
	}

	public setActive() {
		this.isInactive = false;

		for (const request of this.inactiveRequests) {
			DisplayQueueManager.add(request);
		}

		this.inactiveRequests.length = 0;
	}

	// Allow dialog boxes to have their priorities be set by other display handlers
	public override setRequestIdAndPriority(request: DialogBoxRequest): void {
		request.addToFront = request.data.addToFront;
		const targetQueue = request.data.displayQueue ?? request.category;

		if (targetQueue !== this.getCategory()) {
			const handler = DisplayQueueManager.getHandler(request.data.displayQueue ?? this.getCategory());
			handler?.setRequestIdAndPriority(request);
		} else {
			super.setRequestIdAndPriority(request);
		}
	}
}

export class DialogBoxModelImpl {
	private source: DialogSource = DialogSource.Game;

	private _shellHandler = new DialogBoxDisplayHandler(DialogSource.Shell, 1000, true);
	private _gameHandler = new DialogBoxDisplayHandler(DialogSource.Game, 2000, false);

	public get isDialogBoxOpen(): boolean {
		return DisplayQueueManager.activeDisplays.some(p => p.category === "DialogBox");
	}

	private get activeHandler() {
		return this.getHandler(this.source);
	}

	private get inactiveHandler() {
		return this.source === DialogSource.Game ? this._shellHandler : this._gameHandler;
	}

	public get shellHandler() {
		return this._shellHandler;
	}

	public get gameHandler() {
		return this._gameHandler;
	}

	private getHandler(source: DialogSource) {
		return source === DialogSource.Game ? this._gameHandler : this._shellHandler;
	}

	public clear() {
		this.activeHandler.clear();
	}

	public showDialogBox(definition: DialogBoxDefinition, options: DialogBoxOption[], customOptions?: DialogBoxCustom[]) {
		return this.getHandler(definition.source ?? this.source).addDisplayRequest({ data: definition, options: options, customOptions: customOptions, id: definition.id });
	}

	/**
	 * Close (if already displayed) or cancel (from the pending list) the dialog box which the DialogBoxID is given.
	 * @param dialogBoxID The id of the dialog box to close
	 */
	public closeDialogBox(dialogBoxID: DialogBoxID) {
		if (dialogBoxID === undefined) {
			// Could not find a dialog, just make sure no dialog is displayed
			Framework.ContextManager.pop("screen-dialog-box");
		} else {
			// Looks for the given ID
			const removed = DisplayQueueManager.closeMatching(dialogBoxID)
			if (removed.length == 0) {
				console.warn("model-dialog-box: closeDialogBox(): The given dialog box ID (" + dialogBoxID + ") is neither the currently displayed one nor one of the pending dialog boxes!");
			}
		}
	}

	public setSource(source: DialogSource) {
		this.source = source;
		this.activeHandler.setActive();
		this.inactiveHandler.setInactive();
	}
}

/** ------------------------------------------------------------------------------------------------------------------ */
export const DialogBoxModel = new DialogBoxModelImpl();

export { DialogBoxModel as default };

DisplayQueueManager.registerHandler(DialogBoxModel.shellHandler);
DisplayQueueManager.registerHandler(DialogBoxModel.gameHandler);


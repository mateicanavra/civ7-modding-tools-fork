/**
 * @file popup-sequencer.ts
 * @copyright 2025, Firaxis Games
 * @description Provides a lightweight interface to the Display Queue so that simple popups can participate.
 */

import ContextManager, { PushProperties } from '/core/ui/context-manager/context-manager.js'
import { DisplayHandlerBase, DisplayHideOptions, IDisplayRequestBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';

export type PopupSequencerCallbackSignature = (userData: any | undefined) => void;

export interface PopupSequencerData extends IDisplayRequestBase {
	screenId: string;
	properties: PushProperties<any, never>;
	panelOptions?: any;
	userData?: any | undefined;
	showCallback?: PopupSequencerCallbackSignature;
}

class PopupSequencerClass extends DisplayHandlerBase<PopupSequencerData> {
	private static instance: PopupSequencerClass | null = null;

	currentPopupData: PopupSequencerData | null = null;

	constructor() {
		super("PopupSequencer", 6000);

		if (PopupSequencerClass.instance) {
			console.error("Only one instance of the PopupSequencerClass can exist at a time!")
		}
		PopupSequencerClass.instance = this;
		this.currentPopupData = null;
	}

	isShowing(): boolean {
		if (this.currentPopupData) {
			return ContextManager.hasInstanceOf(this.currentPopupData.screenId);
		}

		return false;
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	show(request: PopupSequencerData): void {
		this.currentPopupData = request;
		if (request.showCallback) {
			request.showCallback(request.userData);
		}
		ContextManager.push(request.screenId, request.properties);
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	hide(_request: PopupSequencerData, _options?: DisplayHideOptions): void {
		ContextManager.pop(this.currentPopupData?.screenId);
		this.currentPopupData = null;

		if (DisplayQueueManager.findAll(this.getCategory()).length === 1) {
			this.currentPopupData = null;
		}
	}

	closePopup = (screenId: string) => {
		if (this.currentPopupData && this.currentPopupData.screenId == screenId) {
			DisplayQueueManager.close(this.currentPopupData);
		} else {
			if (this.currentPopupData) {
				console.error(`PopupSquencer: tried to close ${screenId}, but topmost screen is ${this.currentPopupData.screenId}`);
			}
		}
		this.currentPopupData = null;
	}
}

const PopupSequencer = new PopupSequencerClass();
export { PopupSequencer as default }

DisplayQueueManager.registerHandler(PopupSequencer);
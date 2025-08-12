/**
 * @file root-shell.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Main class used to load main menu, and other "shell" items.
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager, { DialogBoxAction, DialogBoxCallbackSignature, DialogBoxID } from '/core/ui/dialog-box/manager-dialog-box.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { SuspendCloseListenerEventName, ResumeCloseListenerEventName } from '/core/ui/events/shell-events.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';
import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';

// TODO: remove(?)
// These functions don't appear to do anything any more because
// the main menu is structured differently now. [ggoucher 6/10/22]
window.addEventListener('DOMContentLoaded', () => {
	let menu = document.getElementById("content-manager");
	if (menu) {
		menu.classList.remove("hidden");
	}
});

window.addEventListener('load', () => {
	let menu = document.getElementById("content-manager");
	if (menu) {
		menu.classList.remove("hidden");
	}
});

// using an id to track the closing game dialog box, used to keep multiple boxes from opening if the player clicks on the windows 'X' which is outside of the mouse guard.
let dialogExitId: DialogBoxID = displayRequestUniqueId();
// indicates if something has asked the processing of the closing game dialog to suspend
let isClosingDialogSuspended: boolean = false;
// indicates if a close request came in while the processing was suspended
let isClosingDialogQueued: boolean = false;
// indicates if a exit dialog is currently showing
let isClosingDialogOpen: boolean = false;

// Support for initial scripts.
engine.whenReady.then(() => {
	CohtmlSpeechAPI.run();

	// Override the HTML "default" and "auto" cursors to our custom pointer
	UI.registerCursor(UIHTMLCursorTypes.Auto, UICursorTypes.DEFAULT, "fs://game/core/ui/cursors/Pointer.ani");
	UI.registerCursor(UIHTMLCursorTypes.Default, UICursorTypes.DEFAULT, "fs://game/core/ui/cursors/Pointer.ani");
	UI.registerCursor(UIHTMLCursorTypes.Pointer, UICursorTypes.GRAB, "fs://game/core/ui/cursors/handpointer.ani");
	UI.registerCursor(UIHTMLCursorTypes.NotAllowed, UICursorTypes.CANT_PLACE, "fs://game/core/ui/cursors/cantplace.ani");
	// There is also a "waiting" cursor which shows a globe, not sure which is more appropriate
	UI.registerCursor(UIHTMLCursorTypes.Wait, UICursorTypes.WAIT, "fs://game/core/ui/cursors/loading.ani");
	UI.registerCursor(UIHTMLCursorTypes.Help, UICursorTypes.HELP, "fs://game/core/ui/cursors/info.ani");
	UI.registerCursor(UIHTMLCursorTypes.Place, UICursorTypes.PLACE, "fs://game/core/ui/cursors/place.ani");
	UI.registerCursor(UIHTMLCursorTypes.CantPlace, UICursorTypes.CANT_PLACE, "fs://game/core/ui/cursors/cantplace.ani");
	UI.registerCursor(UIHTMLCursorTypes.Enemy, UICursorTypes.ENEMY, "fs://game/core/ui/cursors/enemy.ani");
	UI.registerCursor(UIHTMLCursorTypes.Attack, UICursorTypes.ATTACK, "fs://game/core/ui/cursors/attack.ani");
	UI.registerCursor(UIHTMLCursorTypes.Ranged, UICursorTypes.RANGED, "fs://game/core/ui/cursors/ranged.ani");

	const userRequestCloseListener = () => {
		// Was there a request to suspend this processing?
		if (isClosingDialogSuspended) {
			// Queue the close request popup and do nothing for now
			isClosingDialogQueued = true;
			return;
		}

		if (isClosingDialogOpen) {
			return;
		}

		const dbCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
			isClosingDialogOpen = false;

			if (eAction == DialogBoxAction.Confirm) {
				engine.call("userConfirmedClose");
			}
		}
		DialogManager.createDialog_ConfirmCancel({
			dialogId: dialogExitId,
			body: "LOC_CLOSEMGR_CONFIRM_BODY",
			title: "LOC_CLOSEMGR_CONFIRM_TITLE",
			displayQueue: "SystemMessage",
			addToFront: true,
			canClose: false,
			callback: dbCallback
		});

		isClosingDialogOpen = true;
	}

	const suspendRequestCloseListener = () => {
		isClosingDialogSuspended = true;
	}

	const resumeRequestCloseListener = () => {
		isClosingDialogSuspended = false;

		// If a close request happened while we were suspended, show the popup now
		if (isClosingDialogQueued) {
			isClosingDialogQueued = false;
			userRequestCloseListener();
		}
	}

	engine.on("UserRequestClose", userRequestCloseListener);
	window.addEventListener(SuspendCloseListenerEventName, suspendRequestCloseListener);
	window.addEventListener(ResumeCloseListenerEventName, resumeRequestCloseListener);
	Input.setActiveContext(InputContext.Shell);

	engine.on("NetworkDisconnected", showDisconnectionPopup.bind(this));
	engine.on("NetworkReconnected", resetDisconnectionPopup.bind(this));
});

Loading.runWhenLoaded(() => {
	const rootElement: HTMLElement | null = document.querySelector<HTMLElement>("#roots");

	if (rootElement) {
		rootElement.appendChild(document.createElement('oob-experience-manager'));
	}

	ContextManager.registerEngineInputHandler(MultiplayerShellManager);

	if (Automation.isActive && Configuration.getUser().firstTimeTutorialEnabled) {
		Configuration.getUser().setFirstTimeTutorialEnabled(false);
		Configuration.getUser().saveCheckpoint();
	}
});

function showDisconnectionPopup(): void {
	if (UI.shouldShowDisconnectionPopup()) {
		DialogManager.createDialog_Confirm({
			body: "LOC_UI_NO_INTERNET_CONNECTION",
			title: "LOC_UI_NO_INTERNET_CONNECTION_TITLE",
			callback: (_eAction: DialogBoxAction) => {
				ContextManager.popUntil("main-menu");
				window.dispatchEvent(new MainMenuReturnEvent());
			}
		});
		UI.setDisconnectionPopupWasShown(true);
	}
}

function resetDisconnectionPopup(): void {
	UI.setDisconnectionPopupWasShown(false);
}

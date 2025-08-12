/**
 * @file manager-dialog-box.ts
 * @copyright 2020-2025, Firaxis Games
 * This is the singleton helper access class for firing up new dialogue boxes.
 */
/*
    Example of a dialog box with a stepper extension:

    / Normal dialog callback
    const dbCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
        if (eAction == DialogBoxAction.Confirm) {
            do_whatever();
        }
    }
    / Called for each extension control added when the dialog is confirmed
    const valueCallback: DialogBoxValueCallbackSignature = (id: string, newValue: string) => {
        console.log(`extension id ${id} newValue is ${newValue}`);
    }

    / Here we define a stepper control
    const stepper: DialogBoxStepper[] = [];
    stepper.push({
        id: "some-id",			// ID passed to the valueCallback to indicate which stepper's value is being updated
        stepperValue: "17",		// Starting value of the stepper control
        stepperMinValue: "1",	// Minimum value
        stepperMaxValue: "20"	// Maximum value
    });
    DialogManager.createDialog_ConfirmCancel({
        title: 'LOC_DIALOG_EXAMPLE_TITLE',
        body: 'LOC_DIALOG_EXAMPLE_BODY',
        callback: dbCallback,
        valueCallback: valueCallback,
        extensions: { steppers: stepper }
    });
*/
import DialogBox, { DialogSource, DialogBoxAction } from '/core/ui/dialog-box/model-dialog-box.js';
import { setDialogManager } from '/core/ui/framework.js';
export { DialogSource, DialogBoxAction };
class DialogBoxManagerImpl {
    /**
     * Helper function for creating simple boolean choice dialog, where the payload is constructed for you.
     * The Cancel option has no callback
     */
    createDialog_ConfirmCancel(params) {
        const confirmOption = {
            actions: ["accept"],
            label: "LOC_GENERIC_OK",
            callback: params.callback,
            valueCallback: params.valueCallback
        };
        const cancelCallback = () => {
            if (params.callback) {
                params.callback(DialogBoxAction.Cancel);
            }
        };
        const cancelOption = {
            actions: ["cancel", "keyboard-escape"],
            label: "LOC_GENERIC_CANCEL",
            callback: cancelCallback
        };
        const options = [confirmOption, cancelOption];
        return this.createDialog_MultiOption({ body: params.body, title: params.title, shouldDarken: params.shouldDarken, options: options, canClose: params.canClose, extensions: params.extensions, displayQueue: params.displayQueue, addToFront: params.addToFront, dialogId: params.dialogId });
    }
    /**
     * Helper function for creating simple confirmation dialog, where the payload is constructed for you.
     */
    createDialog_Confirm(params) {
        const confirmOption = {
            actions: ["accept"],
            label: "LOC_GENERIC_OK",
            callback: params.callback,
            valueCallback: params.valueCallback
        };
        const options = [confirmOption];
        const canClose = false;
        return this.createDialog_MultiOption({ body: params.body, title: params.title, shouldDarken: params.shouldDarken, options: options, canClose: canClose, extensions: params.extensions, displayHourGlass: params.displayHourGlass, displayQueue: params.displayQueue, addToFront: params.addToFront, dialogId: params.dialogId });
    }
    /**
     * Helper function for creating simple cancel dialog, where the payload is constructed for you.
     */
    createDialog_Cancel(params) {
        const cancelOption = {
            actions: ["cancel", "keyboard-escape"],
            label: "LOC_GENERIC_CANCEL",
            callback: params.callback,
            valueCallback: params.valueCallback
        };
        const options = [cancelOption];
        const canClose = false;
        return this.createDialog_MultiOption({ body: params.body, title: params.title, shouldDarken: params.shouldDarken, options: options, canClose: canClose, extensions: params.extensions, displayHourGlass: params.displayHourGlass, displayQueue: params.displayQueue, addToFront: params.addToFront, dialogId: params.dialogId });
    }
    /**
     * Helper function for creating a multi-option dialog with user-defined payloads for each option.
     */
    createDialog_MultiOption(params) {
        const data = {
            id: params.dialogId,
            title: params.title ?? "",
            body: params.body ?? "",
            canClose: params.canClose ?? true,
            shouldDarken: params.shouldDarken ?? true,
            extensions: undefined,
            displayHourGlass: params.displayHourGlass,
            source: params.dialogSource,
            displayQueue: params.displayQueue,
            addToFront: params.addToFront,
            layout: params.layout
        };
        if (params.extensions) {
            data.extensions = JSON.stringify(params.extensions);
        }
        return DialogBox.showDialogBox(data, params.options).id;
    }
    /**
     * Helper function for creation a custom option dialog with user-defined payloads for each option
    */
    createDialog_CustomOptions(params) {
        const data = {
            title: params.title ?? "",
            body: params.body ?? "",
            canClose: params.canClose ?? true,
            shouldDarken: params.shouldDarken ?? true,
            extensions: undefined,
            displayHourGlass: params.displayHourGlass,
            source: params.dialogSource,
            displayQueue: params.displayQueue,
            addToFront: params.addToFront,
            custom: params.custom ?? false,
            styles: params.styles ?? false,
            name: params.name
        };
        if (params.extensions) {
            data.extensions = JSON.stringify(params.extensions);
        }
        return DialogBox.showDialogBox(data, params.options, params.customOptions).id;
    }
    /**
     * Clear all dialog box in the queue
     */
    clear() {
        DialogBox.clear();
    }
    get isDialogBoxOpen() {
        return DialogBox.isDialogBoxOpen;
    }
    closeDialogBox(dialogBoxID) {
        DialogBox.closeDialogBox(dialogBoxID);
    }
    setSource(source) {
        DialogBox.setSource(source);
    }
}
export const DialogBoxManager = new DialogBoxManagerImpl();
setDialogManager(DialogBoxManager);
export { DialogBoxManager as default };
//# sourceMappingURL=file:///core/ui/dialog-box/manager-dialog-box.js.map

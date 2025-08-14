/**
 * @file model-dialog-box.ts
 * @copyright 2020-2024, Firaxis Games
 * This is the data component for a dialog box.
 */
import { Framework } from '/core/ui/framework.js';
import { DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
export var DialogBoxAction;
(function (DialogBoxAction) {
    DialogBoxAction[DialogBoxAction["Invalid"] = -1] = "Invalid";
    DialogBoxAction[DialogBoxAction["Error"] = 0] = "Error";
    DialogBoxAction[DialogBoxAction["Confirm"] = 1] = "Confirm";
    DialogBoxAction[DialogBoxAction["Cancel"] = 2] = "Cancel";
    DialogBoxAction[DialogBoxAction["Close"] = 3] = "Close";
})(DialogBoxAction || (DialogBoxAction = {}));
export var DialogSource;
(function (DialogSource) {
    DialogSource["Game"] = "Game";
    DialogSource["Shell"] = "Shell";
})(DialogSource || (DialogSource = {}));
;
export class DialogBoxDisplayHandler extends DisplayHandlerBase {
    constructor(source, priority, isInactive) {
        super(`${source}DialogBox`, priority);
        this.source = source;
        this.inactiveRequests = [];
        this.isInactive = isInactive;
    }
    addDisplayRequest(dialogData) {
        if (this.isInactive) {
            const request = Object.assign({ category: this.getCategory() }, dialogData);
            this.inactiveRequests.push(request);
            return request;
        }
        else {
            // Shell dialogs should show, even when suspended
            return super.addDisplayRequest(dialogData, this.source == DialogSource.Shell);
        }
    }
    show(request) {
        const dilaogBoxRoot = Framework.ContextManager.push("screen-dialog-box", { singleton: true, createMouseGuard: true, attributes: request.data });
        dilaogBoxRoot.componentCreatedEvent.on((component) => {
            component.setDialogId(request.id);
            component.setOptions(request.data, request.options ?? [], request.customOptions ?? []);
        });
    }
    hide(_request, _options) {
        const dialog = Framework.ContextManager.getTarget("screen-dialog-box");
        if (dialog) {
            dialog.maybeComponent?.close();
        }
    }
    setInactive() {
        this.isInactive = true;
        this.inactiveRequests = DisplayQueueManager.closeMatching(this.getCategory());
    }
    clear() {
        DisplayQueueManager.closeMatching(this.getCategory());
    }
    setActive() {
        this.isInactive = false;
        for (const request of this.inactiveRequests) {
            DisplayQueueManager.add(request);
        }
        this.inactiveRequests.length = 0;
    }
    // Allow dialog boxes to have their priorities be set by other display handlers
    setRequestIdAndPriority(request) {
        request.addToFront = request.data.addToFront;
        const targetQueue = request.data.displayQueue ?? request.category;
        if (targetQueue !== this.getCategory()) {
            const handler = DisplayQueueManager.getHandler(request.data.displayQueue ?? this.getCategory());
            handler?.setRequestIdAndPriority(request);
        }
        else {
            super.setRequestIdAndPriority(request);
        }
    }
}
export class DialogBoxModelImpl {
    constructor() {
        this.source = DialogSource.Game;
        this._shellHandler = new DialogBoxDisplayHandler(DialogSource.Shell, 1000, true);
        this._gameHandler = new DialogBoxDisplayHandler(DialogSource.Game, 2000, false);
    }
    get isDialogBoxOpen() {
        return DisplayQueueManager.activeDisplays.some(p => p.category === "DialogBox");
    }
    get activeHandler() {
        return this.getHandler(this.source);
    }
    get inactiveHandler() {
        return this.source === DialogSource.Game ? this._shellHandler : this._gameHandler;
    }
    get shellHandler() {
        return this._shellHandler;
    }
    get gameHandler() {
        return this._gameHandler;
    }
    getHandler(source) {
        return source === DialogSource.Game ? this._gameHandler : this._shellHandler;
    }
    clear() {
        this.activeHandler.clear();
    }
    showDialogBox(definition, options, customOptions) {
        return this.getHandler(definition.source ?? this.source).addDisplayRequest({ data: definition, options: options, customOptions: customOptions, id: definition.id });
    }
    /**
     * Close (if already displayed) or cancel (from the pending list) the dialog box which the DialogBoxID is given.
     * @param dialogBoxID The id of the dialog box to close
     */
    closeDialogBox(dialogBoxID) {
        if (dialogBoxID === undefined) {
            // Could not find a dialog, just make sure no dialog is displayed
            Framework.ContextManager.pop("screen-dialog-box");
        }
        else {
            // Looks for the given ID
            const removed = DisplayQueueManager.closeMatching(dialogBoxID);
            if (removed.length == 0) {
                console.warn("model-dialog-box: closeDialogBox(): The given dialog box ID (" + dialogBoxID + ") is neither the currently displayed one nor one of the pending dialog boxes!");
            }
        }
    }
    setSource(source) {
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

//# sourceMappingURL=file:///core/ui/dialog-box/model-dialog-box.js.map

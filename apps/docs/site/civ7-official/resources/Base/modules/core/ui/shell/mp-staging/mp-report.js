/**
 * @file mp-report.ts
 * @copyright 2023-2025, Firaxis Games
 * @description Multiplayer quick join.
 */
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { Focus } from '/core/ui/input/focus-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { abuseReasonToTooltip } from '/core/ui/utilities/utilities-online.js';
class PanelMPReport extends Panel {
    constructor(root) {
        super(root);
        this.cancelButtonListener = () => { this.close(); };
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
        this.reportButton = null;
        this.reportTextbox = null;
        this.reportRoomId = -1;
        this.reportUserId = "";
        this.reportUserGamertag = "";
        this.reportReason = "";
        this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
        //this.enableOpenSound false intentionally
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "audio-mp-friends-popups");
    }
    executeReport() {
        if (this.reportTextbox) {
            const value = this.reportTextbox?.getAttribute('value');
            if (value) {
                this.Report(value);
            }
            else {
                this.Report("");
            }
        }
    }
    onAttach() {
        super.onAttach();
        const reportRoomIdAttribute = this.Root.getAttribute('reportRoomId');
        if (reportRoomIdAttribute) {
            this.reportRoomId = Number(reportRoomIdAttribute);
        }
        const reportUserIdAttribute = this.Root.getAttribute('reportUserId');
        if (reportUserIdAttribute) {
            this.reportUserId = reportUserIdAttribute;
        }
        const reportUserGamertagAttribute = this.Root.getAttribute('reportUserGamertag');
        if (reportUserGamertagAttribute) {
            this.reportUserGamertag = reportUserGamertagAttribute;
        }
        const reportReasonAttribute = this.Root.getAttribute('reportReason');
        if (reportReasonAttribute) {
            this.reportReason = reportReasonAttribute;
        }
        let placeholderText = "LOC_UI_MP_REPORT_PLAYER_TITLE";
        let abuseReasonName = abuseReasonToTooltip.get(this.reportReason);
        if (abuseReasonName != undefined) {
            placeholderText = abuseReasonName;
        }
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.reportButton = MustGetElement('.report', this.Root);
        const bgFrameSetOpacity = MustGetElement('fxs-frame', this.Root);
        bgFrameSetOpacity.classList.add('bg-black');
        this.reportButton?.addEventListener('action-activate', () => {
            this.executeReport();
        });
        this.reportTextbox = MustGetElement('.enter-report-textbox', this.Root);
        if (this.reportTextbox) {
            this.reportTextbox.setAttribute('placeholder', Locale.compose(placeholderText));
        }
        const cancelButton = this.Root.querySelector('.cancel');
        cancelButton?.addEventListener('action-activate', this.cancelButtonListener);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        const cancelButton = this.Root.querySelector('.cancel');
        cancelButton?.removeEventListener('action-activate', this.cancelButtonListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        const rulesContainer = this.Root.querySelector('.rules-container');
        if (rulesContainer) {
            Focus.setContextAwareFocus(rulesContainer, this.Root);
        }
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        switch (inputEvent.detail.name) {
            case 'cancel':
            case 'keyboard-escape':
                this.close();
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
            case 'shell-action-1':
                const disableAttribute = this.reportButton?.getAttribute('disabled');
                if (!disableAttribute || disableAttribute != "true") {
                    this.executeReport();
                }
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
        }
    }
    Report(message) {
        if (ContextManager.hasInstanceOf("screen-mp-friends")) {
            Online.Social.reportUser(this.reportUserId, this.reportReason, message);
            DialogManager.createDialog_Confirm({
                title: Locale.compose("LOC_UI_MP_REPORT_FEEDBACK_REPORTED", this.reportUserGamertag),
                body: ""
            });
            ContextManager.popUntil("screen-mp-friends");
        }
        else {
            Online.Social.reportMultiplayerRoom(this.reportRoomId, this.reportUserId, this.reportReason, message);
            ContextManager.popUntil("screen-mp-browser");
        }
    }
}
Controls.define('screen-mp-report', {
    createInstance: PanelMPReport,
    description: 'Custom report reason input screen',
    classNames: ['mp-report'],
    styles: ['fs://game/core/ui/shell/mp-staging/mp-report.css'],
    content: ['fs://game/core/ui/shell/mp-staging/mp-report.html'],
    attributes: []
});

//# sourceMappingURL=file:///core/ui/shell/mp-staging/mp-report.js.map

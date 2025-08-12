/**
 * @file mp-report.ts		
 * @copyright 2023-2025, Firaxis Games
 * @description Multiplayer quick join.  
 */

import Panel, { AnchorType } from '/core/ui/panel-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { Focus } from '/core/ui/input/focus-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { abuseReasonToTooltip } from '/core/ui/utilities/utilities-online.js';

class PanelMPReport extends Panel {

	private cancelButtonListener: EventListener = () => { this.close(); };
	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent) };
	private reportButton: HTMLElement | null = null;
	private reportTextbox: HTMLElement | null = null;

	private reportRoomId: number = -1;
	private reportUserId: string = "";
	private reportUserGamertag: string = "";
	private reportReason: string = "";

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;

		//this.enableOpenSound false intentionally
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-mp-friends-popups");
	}

	private executeReport() {
		if (this.reportTextbox) {
			const value: string | null | undefined = this.reportTextbox?.getAttribute('value');
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

		const reportRoomIdAttribute: string | null = this.Root.getAttribute('reportRoomId');
		if (reportRoomIdAttribute) {
			this.reportRoomId = Number(reportRoomIdAttribute);
		}

		const reportUserIdAttribute: string | null = this.Root.getAttribute('reportUserId');
		if (reportUserIdAttribute) {
			this.reportUserId = reportUserIdAttribute;
		}

		const reportUserGamertagAttribute: string | null = this.Root.getAttribute('reportUserGamertag');
		if (reportUserGamertagAttribute) {
			this.reportUserGamertag = reportUserGamertagAttribute;
		}

		const reportReasonAttribute: string | null = this.Root.getAttribute('reportReason');
		if (reportReasonAttribute) {
			this.reportReason = reportReasonAttribute;
		}

		let placeholderText: string = "LOC_UI_MP_REPORT_PLAYER_TITLE";
		let abuseReasonName: string | undefined = abuseReasonToTooltip.get(this.reportReason);
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

		const cancelButton: HTMLElement | null = this.Root.querySelector<HTMLElement>('.cancel');
		cancelButton?.addEventListener('action-activate', this.cancelButtonListener);
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.engineInputListener);

		const cancelButton: HTMLElement | null = this.Root.querySelector<HTMLElement>('.cancel');
		cancelButton?.removeEventListener('action-activate', this.cancelButtonListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();

		const rulesContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.rules-container');
		if (rulesContainer) {
			Focus.setContextAwareFocus(rulesContainer, this.Root);
		}
	}

	onLoseFocus() {
		NavTray.clear();
		super.onLoseFocus();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
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
				const disableAttribute = this.reportButton?.getAttribute('disabled')

				if (!disableAttribute || disableAttribute != "true") {
					this.executeReport();
				}

				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
		}
	}

	private Report(message: string) {
		if (ContextManager.hasInstanceOf("screen-mp-friends")) {
			Online.Social.reportUser(this.reportUserId, this.reportReason, message);
			DialogManager.createDialog_Confirm({
				title: Locale.compose("LOC_UI_MP_REPORT_FEEDBACK_REPORTED", this.reportUserGamertag),
				body: ""
			})

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
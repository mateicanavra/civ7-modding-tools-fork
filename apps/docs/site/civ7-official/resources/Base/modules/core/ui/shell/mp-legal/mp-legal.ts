/**
 * @file mp-legal.ts
 * @copyright 2022, Firaxis Games
 * @description Screen to review and accept 2K legal documents
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { parseLegalDocument } from '/core/ui/utilities/utilities-liveops.js';
import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { LoginResults } from '/core/ui/utilities/utilities-network-constants.js'
import { FxsScrollable } from '/core/ui/components/fxs-scrollable.js';

interface LegalPageOptions {
	viewOnly: boolean;
}

// When Network.getLegalDocuments is called we would like to know from c++/native what the legal docs are intended for
// AcceptLegalDocuments placement name is for surfacacing legal docs to the user to gate them from entering the game if they have not accepted legal documents
//   Once a user is already in the game we do not want to surface legal documents again for acceptance after transitioning from gameplay to the main menu.
export const LegalDocsPlacementAcceptName = 'AcceptLegalDocuments' as const;
// ReviewLegalDocuments placement name is for surfacing legal docs for review only. This will be in Main Menu -> Additional Content -> Legal
export const LegalDocsPlacementReviewName = 'ReviewLegalDocuments' as const;
export const LegalDocsAcceptedEventName = 'legalDocsAccepted' as const;
export class LegalDocsAcceptedEvent extends CustomEvent<{ accepted: boolean }> {
	constructor(detail: { accepted: boolean }) {
		super(LegalDocsAcceptedEventName, { bubbles: false, cancelable: true, detail });
	}
}

class MpLegal extends Panel {

	private documents: LegalDocumentData[] = [];
	private currentDocument: number = 0;
	private engineInputListener: EventListener = this.onEngineInput.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private legalDocumentAcceptedResultListener = this.onServerAcceptResults.bind(this);
	private legalScrollableView!: HTMLElement;
	private textField: HTMLElement | null = null;
	private textTitle: HTMLElement | null = null;
	private scrollable: HTMLElement | null = null;

	private acceptListener = this.acceptDocument.bind(this);
	private cancelListener = this.onCancel.bind(this);
	private nextListener = this.nextDocument.bind(this);
	private previousListener = this.previousDocument.bind(this);

	private acceptButton!: HTMLElement;
	private cancelButton!: HTMLElement;
	private nextButton!: HTMLElement;
	private previousButton!: HTMLElement;

	private viewOnly: boolean = false;

	onInitialize(): void {
		this.acceptButton = MustGetElement('.button-accept', this.Root);
		this.cancelButton = MustGetElement('.button-cancel', this.Root);
		this.nextButton = MustGetElement('.button-next', this.Root);
		this.previousButton = MustGetElement('.button-previous', this.Root);
		this.scrollable = MustGetElement(".mp-legal__scrollable", this.Root);
		const scrollable = MustGetElement<ComponentRoot<FxsScrollable>>(".mp-legal__scrollable", this.Root);
		scrollable.whenComponentCreated((component) => {
			component.setEngineInputProxy(this.Root);
		});
	}

	/** Callback for when the HTML content for this screen has been loaded and DOM is ready. */
	onAttach() {
		super.onAttach();
	}

	setPanelOptions(options: object) {
		const legalOptions: LegalPageOptions = options as LegalPageOptions;

		if (legalOptions) {
			this.viewOnly = legalOptions.viewOnly;

			this.acceptButton.classList.toggle("hidden", this.viewOnly);
			this.nextButton.classList.toggle("hidden", !this.viewOnly);
			this.previousButton.classList.toggle("hidden", !this.viewOnly);
			this.cancelButton.classList.toggle("hidden", !this.viewOnly);
			if (this.viewOnly) {
				const closeButton: HTMLElement = document.createElement('fxs-close-button');
				closeButton.addEventListener('action-activate', () => {
					this.closePanel();
				});
				this.Root.appendChild(closeButton);
			}

			this.documents = Network.getCachedLegalDocuments();
			this.currentDocument = 0;

			this.Root.addEventListener('engine-input', this.engineInputListener);
			this.Root.addEventListener('navigate-input', this.navigateInputListener);

			this.acceptButton.addEventListener('action-activate', this.acceptListener);
			this.cancelButton.addEventListener('action-activate', this.cancelListener);
			this.nextButton.addEventListener('action-activate', this.nextListener);
			this.previousButton.addEventListener('action-activate', this.previousListener);

			this.textField = MustGetElement(".mp-legal__content", this.Root);
			this.textTitle = MustGetElement(".mp-legal__title", this.Root);

			this.refreshDocument();
			this.updateButtonState();

			this.legalScrollableView = MustGetElement(".mp-legal__scrollable", this.Root);
			if (this.documents.length == 0) {
				const unavailableText: HTMLElement = document.createElement("div");
				unavailableText.setAttribute("data-l10n-id", "LOC_OPTIONS_GFX_UNAVAILABLE");
				unavailableText.classList.value = "font-body-base self-center";
				this.legalScrollableView.appendChild(unavailableText);

				this.nextButton.classList.add("hidden");
				this.previousButton.classList.add("hidden");
			}
		}

		this.updateNavTray();
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);

		super.onDetach();

		window.dispatchEvent(new MainMenuReturnEvent());
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		FocusManager.setFocus(this.Root);

		this.updateNavTray();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onCancel() {
		this.close();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() && this.viewOnly) {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
		else if (inputEvent.detail.name == "accept" && !this.viewOnly) {
			this.acceptDocument();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		if (this.viewOnly) {
			const direction = navigationEvent.getDirection();
			switch (direction) {
				case InputNavigationAction.PREVIOUS:
					if (navigationEvent.detail.status == InputActionStatuses.FINISH) {
						this.previousDocument();
					}
					navigationEvent.preventDefault();
					navigationEvent.stopImmediatePropagation();
					if (navigationEvent.detail.status == InputActionStatuses.START) {
						Audio.playSound("data-audio-primary-button-press");
					}
					break;
				case InputNavigationAction.NEXT:
					if (navigationEvent.detail.status == InputActionStatuses.FINISH) {
						this.nextDocument();
					}
					navigationEvent.preventDefault();
					navigationEvent.stopImmediatePropagation();
					if (navigationEvent.detail.status == InputActionStatuses.START) {
						Audio.playSound("data-audio-primary-button-press");
					}
					break;
			}
		}
	}

	private refreshDocument() {
		if (this.textField && this.textTitle) {
			this.documents = Network.getLegalDocuments(this.viewOnly ? LegalDocsPlacementReviewName : LegalDocsPlacementAcceptName);
			if (this.documents) {
				if (this.documents.length > 0) {
					this.currentDocument = -1;
					// Start at the first unaccepted document
					for (let documentNum: number = 0; documentNum < this.documents.length; documentNum++) {
						if (this.documents[documentNum].state != LegalState.ACCEPT_CONFIRMED) {
							this.currentDocument = documentNum;
							break;
						}
					}

					if (this.viewOnly) {
						this.currentDocument = 0;
					}

					if (this.currentDocument == -1) {
						this.closePanel();
						return;
					}

					this.refreshCurrentDocument();

				} else {
					this.closePanel();
				}
			} else {
				this.closePanel();
			}
		}
	}

	private acceptDocument() {
		if (this.documents) {
			if (this.documents.length > 0) {
				// Tell the server we accepted the document.
				engine.on("LegalDocumentAcceptedResult", this.legalDocumentAcceptedResultListener);
				Network.legalDocumentResponse(this.documents[this.currentDocument].documentId, true);

				window.dispatchEvent(new LegalDocsAcceptedEvent({ accepted: true }));
				return;
			}
		}
		this.closePanel();
	}

	private nextDocument() {
		if (this.textField && this.textTitle) {
			if (this.documents) {
				if (this.documents.length > 0) {

					this.currentDocument++;

					if (this.currentDocument == this.documents.length) {
						this.currentDocument = this.documents.length - 1;
					}

					this.refreshCurrentDocument();

					this.updateButtonState();
				}
			}
		}
	}

	private previousDocument() {
		if (this.textField && this.textTitle) {
			if (this.documents) {
				if (this.documents.length > 0) {

					this.currentDocument--;

					if (this.currentDocument < 0) {
						this.currentDocument = 0;
					}

					this.refreshCurrentDocument();
					this.updateButtonState();
				}
			}
		}
	}

	private refreshCurrentDocument() {
		if (this.scrollable) {
			// "scrollpercent" is write-only, and Coherent optimizes out setting
			// an attribute to the value it already has, so we need to "flip" it
			// in order to reset the position to 0.
			this.scrollable.setAttribute("scrollpercent", "1");
			this.scrollable.setAttribute("scrollpercent", "0");
			this.scrollable.setAttribute("handle-gamepad-pan", "true");
		}

		this.acceptButton.setAttribute("caption", "LOC_TUTORIAL_NEXT_PAGE");

		const privacyInstructions = MustGetElement(".mp-legal-privacy-notice-instructions", this.Root);
		if (this.documents[this.currentDocument].type == 2 && !this.viewOnly) {
			privacyInstructions.classList.remove("hidden");
		} else {
			privacyInstructions.classList.add("hidden");

			if (this.documents[this.currentDocument].type == 1 && !this.viewOnly) {
				this.acceptButton.setAttribute("caption", "LOC_GENERIC_ACCEPT");
			}
		}

		this.textTitle!.setAttribute("data-l10n-id", this.documents[this.currentDocument].title);
		parseLegalDocument(this.textField!, this.documents[this.currentDocument].content);

		this.updateNavTray();
	}

	private onServerAcceptResults(data: GenericDataInt32) {
		engine.off("LegalDocumentAcceptedResult", this.legalDocumentAcceptedResultListener);

		if (data.data == LoginResults.SUCCESS) {
			this.currentDocument = -1;
			// Start at the first unaccepted document
			for (let documentNum: number = 0; documentNum < this.documents.length; documentNum++) {
				if (this.documents[documentNum].state != LegalState.ACCEPT_CONFIRMED) {
					this.currentDocument = documentNum;
					break;
				}
			}

			if (this.currentDocument != -1) {
				this.refreshDocument();
			} else {
				this.close();
			}
		} else {
			DialogManager.createDialog_Confirm({
				body: Locale.compose("LOC_UI_LEGAL_ERROR", data.data),
				title: "LOC_UI_LEGAL_ACCEPT"
			});
		}
	}

	private closePanel() {
		// back to main menu
		ContextManager.popUntil("main-menu");
		Audio.playSound("data-audio-popup-close");
		super.close();
	}

	private updateButtonState() {
		if (this.viewOnly) {
			if (this.documents) {
				if (this.documents.length > 0) {
					if (this.currentDocument > 0) {
						this.previousButton.removeAttribute("disabled");
					} else {
						this.previousButton.setAttribute("disabled", "true");
					}

					if (this.currentDocument < (this.documents.length - 1)) {
						this.nextButton.removeAttribute("disabled");
					} else {
						this.nextButton.setAttribute("disabled", "true");
					}

				} else {
					this.previousButton.setAttribute("disabled", "true");
					this.nextButton.setAttribute("disabled", "true");
				}
			}
		} else {
			this.previousButton.classList.add("hidden");
			this.nextButton.classList.add("hidden");
		}

		this.updateNavTray();
	}

	private updateNavTray() {
		NavTray.clear();

		if (this.documents) {
			if (this.documents.length > 0) {
				if (this.viewOnly) {
					NavTray.addOrUpdateCancel("LOC_GENERIC_BACK");

					if (this.currentDocument > 0) {
						NavTray.addOrUpdateNavPrevious("LOC_NAV_PREVIOUS");
					}

					if (this.currentDocument < (this.documents.length - 1)) {
						NavTray.addOrUpdateNavNext("LOC_NAV_NEXT");
					}
				} else {
					if (this.documents[this.currentDocument].type == 1) {
						NavTray.addOrUpdateAccept("LOC_GENERIC_ACCEPT");
					} else {
						NavTray.addOrUpdateAccept("LOC_TUTORIAL_NEXT_PAGE");
					}
				}
			}
		}
	}
}

Controls.define('screen-mp-legal', {
	createInstance: MpLegal,
	description: 'Screen to review and accept 2K legal documents.',
	classNames: ['mp-legal'],
	styles: ["fs://game/core/ui/shell/mp-legal/mp-legal.css"],
	content: ['fs://game/core/ui/shell/mp-legal/mp-legal.html']
});

declare global {
	interface HTMLElementEventMap {
		[LegalDocsAcceptedEventName]: LegalDocsAcceptedEvent;
	}
}
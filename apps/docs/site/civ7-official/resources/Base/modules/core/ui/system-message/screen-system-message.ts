/**
 * @file screen-system-message.ts
 * @copyright 2022, Firaxis Games
 * @description Displays info for important system messages
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js'
import SystemMessageManager from '/core/ui/system-message/system-message-manager.js'

class ScreenSystemManager extends Panel {
	constructor(root: ComponentRoot) {
		super(root);

		//No HTML to load, just populate the panel
		this.populateSystemMessageContent();
	}

	onInitialize() {
		super.onInitialize();

		this.Root.classList.add('flex', 'items-center', 'justify-center', 'absolute', 'inset-0');
	}

	private populateSystemMessageContent() {
		if (!SystemMessageManager.currentSystemMessage) {
			console.error("screen-tech-civic-complete: invalid currentTechCivicPopupData, closing!")
			return;
		}


		const frame = document.createElement("fxs-modal-frame");
		frame.classList.add('w-1\\/2');
		const header = document.createElement("fxs-header");
		header.setAttribute("title", SystemMessageManager.currentSystemMessage.systemMessageTitle);
		header.setAttribute('filigree-style', 'h2')

		const body = document.createElement("p");
		body.classList.add("text-accent-1", 'font-body', 'text-lg', 'leading-9', 'mt-3\\.5', 'mb-5');
		body.textContent = SystemMessageManager.currentSystemMessage.systemMessageContent;

		const buttonContainer = document.createElement("fxs-hslot");
		buttonContainer.classList.add("justify-center");

		frame.append(
			header,
			body,
			buttonContainer
		)

		SystemMessageManager.currentSystemMessage.buttonData.forEach((buttonData, index) => {
			const button = document.createElement("fxs-button");

			button.setAttribute('caption', buttonData.caption);
			button.addEventListener('action-activate', buttonData.callback);
			buttonContainer.appendChild(button);

			if (index === 0) {
				window.requestAnimationFrame(() => {
					window.requestAnimationFrame(() => {
						FocusManager.setFocus(button);
					});
				});
			} else {
				button.classList.add('ml-12');
			}
		});

		this.Root.appendChild(frame);
	};

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericSelect();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}
}

Controls.define('screen-system-message', {
	createInstance: ScreenSystemManager,
	description: 'Screen for displaying info for important system messages.',
	attributes: []
});
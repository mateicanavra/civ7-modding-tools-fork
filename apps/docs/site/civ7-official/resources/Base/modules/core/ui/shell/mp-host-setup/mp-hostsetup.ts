// Mp Main Menu
// Copyright 2020, Firaxis Games

import FocusManager from '/core/ui/input/focus-manager.js'


class MpHostSetup {

	private buttonList: { name: string, autofocus: boolean, buttonListener: () => void }[] = [
		{ name: "Start Game", autofocus: true, buttonListener: () => { this.onStartGame() } },
		{ name: "Back", autofocus: false, buttonListener: () => { this.onBackToMultiplayerMenu() } }
	];

	private buttonBox?: HTMLElement;

	constructor() {
		engine.whenReady.then(() => { this.onReady(); });
	}

	onInit() {
		// TODO: Implement?
	}

	onStartGame() {
		Network.startMultiplayerGame();
	}

	onBackToMultiplayerMenu() {
		Network.leaveMultiplayerGame();
		window.location.href = "fs://game/core/ui/shell/mp-main-menu/page-mp-mainmenu.html";
	}

	onReady() {
		// Display buttons
		this.buttonBox = document.getElementById("MpButtonBox")!;

		for (let button of this.buttonList) {
			const newButton = document.createElement('fxs-button');
			//newButton.classList.add('main-menu-button');

			this.buttonBox.appendChild(newButton);
			newButton.setAttribute("caption", button.name);

			newButton.addEventListener('action-activate', button.buttonListener);

			if (button.autofocus == true) {
				FocusManager.setFocus(newButton);
			}
		}
	};
}

const MultiplayerHostSetup = new MpHostSetup();
export { MultiplayerHostSetup as default }
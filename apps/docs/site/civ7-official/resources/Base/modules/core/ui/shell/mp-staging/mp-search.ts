/**
 * @file mp-search.ts		
 * @copyright 2023-2024, Firaxis Games
 * @description Multiplayer quick join.  
 */

import Panel, { AnchorType } from '/core/ui/panel-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import MPFriendsModel from '/core/ui/shell/mp-staging/model-mp-friends.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'

class PanelMPSearch extends Panel {

	private cancelButtonListener: EventListener = () => { this.close(); };
	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent) };
	private searchButton: HTMLElement | null = null;
	private searchTextbox: HTMLElement | null = null;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;

		//this.enableOpenSound false intentionally
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-mp-friends-popups");
	}

	private executeSearch() {
		if (this.searchTextbox) {
			const value: string | null | undefined = this.searchTextbox?.getAttribute('value');
			if (value) {
				this.Search(value);
			}
		}
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('engine-input', this.engineInputListener);

		this.searchButton = MustGetElement('.search', this.Root);
		const bgFrameSetOpacity = MustGetElement('fxs-frame', this.Root);
		bgFrameSetOpacity.classList.add('bg-black');
		this.searchButton?.addEventListener('action-activate', () => {
			MPFriendsModel.searching(true);
			this.executeSearch();
		});

		this.searchTextbox = MustGetElement('.enter-search-textbox', this.Root);
		if (this.searchTextbox) {
			this.searchTextbox.setAttribute('placeholder', Locale.compose("LOC_UI_FRIENDS_SEARCH_FIELD"));
			this.searchTextbox.addEventListener('component-value-changed', (event: CustomEvent) => {
				this.searchButton?.setAttribute('disabled', event.detail.value && event.detail.value != "" ? "false" : "true");
			});
		}

		const cancelButton: HTMLElement | null = this.Root.querySelector<HTMLElement>('.cancel');
		cancelButton?.addEventListener('action-activate', this.cancelButtonListener);

		MPFriendsModel.searched(false);
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
			FocusManager.setFocus(rulesContainer);
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
				const disableAttribute = this.searchButton?.getAttribute('disabled')

				if (!disableAttribute || disableAttribute != "true") {
					MPFriendsModel.searching(true);
					this.executeSearch();
				}

				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
		}
	}

	private Search(userName: string) {
		Online.Social.searchFriendList(userName);
		MPFriendsModel.searched(true);
		this.close();
	}
}

Controls.define('screen-mp-search', {
	createInstance: PanelMPSearch,
	description: 'Quick join screen for multiplayer.',
	classNames: ['mp-search'],
	styles: ['fs://game/core/ui/shell/mp-staging/mp-search.css'],
	content: ['fs://game/core/ui/shell/mp-staging/mp-search.html'],
	attributes: []
});
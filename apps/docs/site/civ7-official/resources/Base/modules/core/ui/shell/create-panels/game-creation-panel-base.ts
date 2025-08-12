/**
 * @file game-creation-panel-base.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Base class for most game creation panels
 */

import ContextManager from "/core/ui/context-manager/context-manager.js";
import ActionHandler, { ActiveDeviceTypeChangedEventName } from "/core/ui/input/action-handler.js";
import { InputEngineEvent, NavigateInputEvent } from "/core/ui/input/input-support.js";
import NavTray from "/core/ui/navigation-tray/model-navigation-tray.js";
import Panel from "/core/ui/panel-support.js";
import { CreateGameModel } from "/core/ui/shell/create-panels/create-game-model.js";
import { getPlayerCardInfo } from "/core/ui/utilities/utilities-liveops.js";

export interface GameCreationNavButtonInfo { category: string, isActive: boolean, eventHandler: () => void };

export class GameCreationPanelBase extends Panel {
	protected navControls: HTMLElement = null!;
	protected navControlTabs: HTMLElement[] = [];

	protected mainContent: HTMLElement = null!;
	protected detailContent: HTMLElement = null!;
	protected randomLeaderContent: HTMLElement = null!;

	protected bottomBarEle: HTMLElement = null!;
	protected readonly confirmButton = document.createElement("fxs-hero-button");

	protected leaderBox: HTMLElement | null = null;
	protected leaderBoxLeader: HTMLElement | null = null;
	protected leaderBoxLeaderToAge: HTMLElement | null = null;
	protected leaderBoxAge: HTMLElement | null = null;
	protected leaderBoxLeaderToCiv: HTMLElement | null = null;
	protected leaderBoxCiv: HTMLElement | null = null;
	protected quoteSubtitles: HTMLElement | null = null;

	protected isProgressionShown = false;
	protected isNavigationEnabled = true;

	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
	}

	override onAttach(): void {
		super.onAttach();

		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		this.Root.addEventListener('engine-input', this.engineInputListener);

		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
	}

	override onDetach(): void {
		super.onDetach();

		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		this.Root.removeEventListener('engine-input', this.engineInputListener);

		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
	}

	protected onNavigateInput(navigationEvent: NavigateInputEvent) {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		const direction: InputNavigationAction = navigationEvent.getDirection();

		if (direction == InputNavigationAction.PREVIOUS) {
			CreateGameModel.showPreviousPanel();
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		} else if (direction == InputNavigationAction.NEXT && !CreateGameModel.nextActionStartsGame) {
			this.showNextPanel();
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		}
	}

	protected onEngineInput(event: InputEngineEvent) {
		if (event.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (event.isCancelInput()) {
			CreateGameModel.showPreviousPanel();
			event.stopPropagation();
			event.preventDefault();
		} else if (event.detail.name === "sys-menu") {
			this.showProgression();
			event.stopPropagation();
			event.preventDefault();
		}
	}

	protected showProgression() {
		if (this.isProgressionShown && Network.isMetagamingAvailable()) {
			ContextManager.push("screen-profile-page", { singleton: true, createMouseGuard: true, panelOptions: { onlyChallenges: false, onlyLeaderboards: false } });
		}
	}

	protected onActiveDeviceTypeChanged() {
		if (this.bottomBarEle) {
			this.bottomBarEle.classList.toggle("hidden", ActionHandler.isGamepadActive);
		}
	}

	protected createFiligreeFragment() {
		const fragment = document.createDocumentFragment();

		const filigreeLeft = document.createElement("div");
		filigreeLeft.classList.add("menu-border", "menu-border-left", "top-8", "left-8", "pointer-events-none", "absolute");
		fragment.appendChild(filigreeLeft);

		const filigreeRight = document.createElement("div");
		filigreeRight.classList.add("menu-border", "menu-border-right", "-scale-x-100", "top-8", "right-8", "pointer-events-none", "absolute");
		fragment.appendChild(filigreeRight);

		return fragment;
	}

	protected createLayoutFragment(includeHeader: boolean) {
		const fragment = this.createFiligreeFragment();

		if (includeHeader) {
			fragment.appendChild(this.createHeader());
		}

		const content = document.createElement("div");
		content.classList.add("flex", "flex-row", "flex-auto");
		fragment.appendChild(content);

		const mainBox = document.createElement("div");
		mainBox.classList.add("game-creator-main-box", "relative");
		content.appendChild(mainBox);

		this.mainContent = document.createElement("fxs-vslot");
		this.mainContent.classList.add("absolute", "flex", "flex-col", "inset-0");
		mainBox.appendChild(this.mainContent);

		this.detailContent = document.createElement("div");
		this.detailContent.classList.add("game-creator-details-box", "flex", "flex-col", "items-center");
		content.appendChild(this.detailContent);

		this.randomLeaderContent = document.createElement("div");
		this.randomLeaderContent.classList.add("game-creator-leader-info-content", "relative");
		content.appendChild(this.randomLeaderContent);

		return fragment;
	}

	protected createNavControls(options: GameCreationNavButtonInfo[]) {
		this.navControls = document.createElement("div");
		this.navControls.classList.add("flex", "flex-row", "flex-auto", "justify-center", "my-8");

		const navHelpLeft = document.createElement("fxs-nav-help");
		navHelpLeft.setAttribute("action-key", "inline-cycle-prev");
		navHelpLeft.classList.add("nav-help-left");
		this.navControls.appendChild(navHelpLeft);

		for (const option of options) {
			const newNavButton = this.buildNavButton(option);
			this.navControls.appendChild(newNavButton);
			this.navControlTabs.push(newNavButton);
		}

		const navHelpRight = document.createElement("fxs-nav-help");
		navHelpRight.setAttribute("action-key", "inline-cycle-next");
		navHelpRight.classList.add("nav-help-right");
		this.navControls.appendChild(navHelpRight);

		return this.navControls;
	}

	protected createHeader() {
		const header = document.createElement("div");
		header.classList.add("flex", "flex-row", "relative");

		const navOptions = CreateGameModel.categories.map(category => ({
			category: category,
			isActive: CreateGameModel.activeCategory == category,
			eventHandler: () => this.showPanelFor(category)
		}));
		header.appendChild(this.createNavControls(navOptions));

		if (Network.isMetagamingAvailable()) {
			this.isProgressionShown = true;
			const playerInfo = getPlayerCardInfo();

			const progressionBadgeBg = document.createElement('fxs-activatable');
			progressionBadgeBg.classList.add("absolute", "top-16", "w-22", "h-22");
			progressionBadgeBg.classList.toggle("right-10", UI.getViewExperience() == UIViewExperience.Mobile);
			progressionBadgeBg.classList.toggle("right-16", UI.getViewExperience() != UIViewExperience.Mobile);
			progressionBadgeBg.addEventListener('action-activate', this.showProgression.bind(this));
			header.appendChild(progressionBadgeBg);

			progressionBadgeBg.innerHTML = `
				<div class="w-22 h-22 img-prof-btn-bg pointer-events-auto relative transition-transform hover\\:scale-110 focus\\:scale-110" data-tooltip-content="${playerInfo.twoKName}">
					<div class="absolute inset-0 opacity-30" style="background-color: ${playerInfo.BackgroundColor}"></div>
					<progression-badge class="absolute inset-y-0 -inset-x-0\\.5" badge-size="base" data-badge-url="${playerInfo.BadgeURL}" data-badge-progression-level="${playerInfo.FoundationLevel}"></progression-badge>
				</div>
			`;

			const progressionBadgeNavHelp = document.createElement("fxs-nav-help");
			progressionBadgeNavHelp.classList.add("absolute", "-bottom-3", "-right-6");
			progressionBadgeNavHelp.setAttribute("action-key", "inline-sys-menu");
			progressionBadgeBg.appendChild(progressionBadgeNavHelp);
		}

		return header;
	}

	protected buildNavButton(options: GameCreationNavButtonInfo) {
		const navButton = document.createElement("fxs-activatable");

		navButton.innerHTML = Locale.compose(options.category);
		navButton.classList.add("game-creator-nav-button", "flex", "justify-center", "items-center", "font-title-lg", "text-accent-1", "uppercase");
		navButton.classList.toggle("game-creator-nav-button-selected", options.isActive);
		navButton.setAttribute("data-audio-group-ref", "game-creator");
		navButton.addEventListener("action-activate", options.eventHandler);

		return navButton;
	}

	protected buildBottomNavBar(randomSelectCallback?: () => void) {
		this.bottomBarEle = document.createElement("fxs-hslot");
		this.bottomBarEle.classList.add("h-24", "flex", "flex-row", "items-end");

		const backButton = document.createElement("fxs-activatable");
		backButton.classList.add("game-creator-back-button", "ml-6", "mb-6");
		backButton.setAttribute("data-audio-group-ref", "audio-base");
		backButton.setAttribute("data-audio-press-ref", "data-audio-back-press");
		backButton.addEventListener('action-activate', CreateGameModel.showPreviousPanel.bind(CreateGameModel));
		backButton.setAttribute("tabIndex", "-1");
		this.bottomBarEle.appendChild(backButton);

		if (randomSelectCallback) {
			const randomButton = document.createElement("fxs-activatable");
			randomButton.classList.add("game-creator-random-button", "ml-6", "mb-6");
			randomButton.addEventListener('action-activate', randomSelectCallback);
			randomButton.setAttribute("tabIndex", "-1");
			this.bottomBarEle.appendChild(randomButton);
		}

		this.confirmButton.classList.add("mx-6", "flex-auto", "mb-6");
		this.confirmButton.style.minWidth = "auto";
		this.confirmButton.addEventListener('action-activate', this.showNextPanel.bind(this));

		if (CreateGameModel.nextActionStartsGame) {
			this.confirmButton.setAttribute("data-audio-group-ref", "game-creator-3");
			this.confirmButton.setAttribute("caption", "LOC_UI_SETUP_START_GAME");
		} else {
			this.confirmButton.setAttribute("data-audio-group-ref", "game-creator-2");
			this.confirmButton.setAttribute("caption", "LOC_GENERIC_CONTINUE");
		}

		this.bottomBarEle.appendChild(this.confirmButton);

		this.onActiveDeviceTypeChanged();

		return this.bottomBarEle;
	}

	protected updateNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		if (this.isNavigationEnabled) {
			NavTray.addOrUpdateAccept(CreateGameModel.nextActionStartsGame ? "LOC_UI_SETUP_START_GAME" : "LOC_GENERIC_CONTINUE");
		}
	}

	protected buildLeaderBox() {
		const leaderBoxContainer = document.createElement("div");
		leaderBoxContainer.classList.add("absolute", "inset-0", "justify-end", "flow-column");

		this.leaderBox = document.createElement("div");
		this.leaderBox.classList.add("flex", "flex-col", "hidden", "items-end", "mb-10", "mr-10");

		const contentColumn = document.createElement("div");
		contentColumn.classList.add("flex", "flex-col", "items-end");
		this.leaderBox.appendChild(contentColumn);

		this.quoteSubtitles = document.createElement("div");
		this.quoteSubtitles.classList.add("civ-select-caption-field", "font-body-base", "text-accent-1", "mb-8", "px-4", "self-end", "text-center", "text-shadow-br", "max-w-128", "self-center", "hidden");
		contentColumn.appendChild(this.quoteSubtitles);

		const leaderBoxContents = document.createElement("p");
		leaderBoxContents.classList.add("game-creator-leader-info", "px-4", "pb-2", "items-center", "self-end", "flex", "flex-col", "flex-auto", "relative");
		contentColumn.appendChild(leaderBoxContents);

		const filigree = document.createElement("div");
		filigree.classList.add("filigree-panel-top-special", "-mt-9");
		leaderBoxContents.appendChild(filigree);

		const leaderLine = document.createElement("div")
		leaderLine.classList.add("game-creator-leader-info-name", "flex", "flex-col", "mx-4", "items-center", "justify-center");
		leaderBoxContents.appendChild(leaderLine);

		this.leaderBoxLeader = document.createElement("div");
		this.leaderBoxLeader.classList.add("font-title-2xl", "uppercase", "font-bold", "text-accent-2");
		leaderLine.appendChild(this.leaderBoxLeader);

		this.leaderBoxLeaderToCiv = document.createElement("div");
		this.leaderBoxLeaderToCiv.setAttribute("data-l10n-id", "LOC_CREATE_GAME_LEADER_TO_CIV");
		this.leaderBoxLeaderToCiv.classList.add("font-body-base", "text-accent-2", "m-1");
		leaderLine.appendChild(this.leaderBoxLeaderToCiv);

		this.leaderBoxCiv = document.createElement("div");
		this.leaderBoxCiv.classList.add("font-title-2xl", "uppercase", "font-bold", "text-accent-2");
		leaderLine.appendChild(this.leaderBoxCiv);

		this.leaderBoxLeaderToAge = document.createElement("div");
		this.leaderBoxLeaderToAge.setAttribute("data-l10n-id", "LOC_CREATE_GAME_LEADER_TO_AGE");
		this.leaderBoxLeaderToAge.classList.add("font-body-base", "text-accent-2", "m-1");
		leaderBoxContents.appendChild(this.leaderBoxLeaderToAge);

		this.leaderBoxAge = document.createElement("div");
		this.leaderBoxAge.classList.add("font-title-2xl", "uppercase", "font-bold", "text-accent-2", "mb-2", "text-center");
		leaderBoxContents.appendChild(this.leaderBoxAge);

		leaderBoxContainer.appendChild(this.leaderBox);

		return leaderBoxContainer;
	}

	protected updateLeaderBox() {
		const hasLeader = !!CreateGameModel.selectedLeader;
		const hasAge = !!CreateGameModel.selectedAge;
		const hasCiv = !!CreateGameModel.selectedCiv;

		this.leaderBox?.classList.toggle("hidden", !hasLeader);

		if (hasLeader) {
			this.leaderBoxLeaderToCiv?.classList.toggle("hidden", !hasCiv);
			this.leaderBoxLeaderToAge?.classList.toggle("hidden", !hasAge);

			this.leaderBoxLeader?.setAttribute("data-l10n-id", CreateGameModel.selectedLeader?.name ?? "");

			if (hasCiv) {
				this.leaderBoxCiv?.setAttribute("data-l10n-id", CreateGameModel.selectedCiv?.name ?? "");
			}

			if (hasAge) {
				this.leaderBoxAge!.innerHTML = Locale.stylize("LOC_CREATE_GAME_AGE_TITLE", CreateGameModel.selectedAge?.name ?? "");
			}
		}
	}

	protected showQuoteSubtitles() {
		if (Sound.getSubtitles() && this.quoteSubtitles) {
			this.quoteSubtitles.classList.remove("hidden");
			this.quoteSubtitles.innerHTML = CreateGameModel.selectedLeader?.quote ?? "";
		}
	}

	protected showPanelFor(category: string) {
		// don't allow the current panel to be re-selected
		if (CreateGameModel.isCurrentPanel(category)) {
			return;
		}

		if (this.isNavigationEnabled && this.onContinue()) {
			CreateGameModel.showPanelFor(category);
		}
	}

	protected showNextPanel() {
		if (this.isNavigationEnabled && this.onContinue()) {
			CreateGameModel.showNextPanel();
		}
	}

	protected onContinue(): boolean {
		return true;
	}

	protected disableNavigation() {
		if (this.isNavigationEnabled == true) {
			this.isNavigationEnabled = false;
			this.updateNavTray();
			this.confirmButton.setAttribute("disabled", "true");

			for (const navTab of this.navControlTabs) {
				navTab.setAttribute("disabled", "true");
			}
		}
	}

	protected enableNavigation() {
		if (this.isNavigationEnabled == false) {
			this.isNavigationEnabled = true;
			this.updateNavTray();
			this.confirmButton.removeAttribute("disabled");

			for (const navTab of this.navControlTabs) {
				navTab.removeAttribute("disabled");
			}
		}
	}

	protected showStoreScreen(contentType: string | undefined) {
		if (Network.isConnectedToNetwork()) {
			ContextManager.push("screen-store-launcher", { singleton: true, createMouseGuard: true, panelOptions: { selectedContent: contentType } });
		}
	}
}
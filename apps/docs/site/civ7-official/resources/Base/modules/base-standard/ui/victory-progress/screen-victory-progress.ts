/**
 * @file screen-victory-progress.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Shows a list of player rankings for the Era victory conditions
 */

import VictoryProgress, { PlayerScore } from '/base-standard/ui/victory-progress/model-victory-progress.js';
import { TabItem, TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

export interface VictoriesOverview {
	[victoryType: string]: PlayerScore[];
}

interface ScreenVictoryProgressOptions {
	openTab?: VictoryProgressOpenTab;
}

export enum VictoryProgressOpenTab {
	None = 0,
	LegacyPathsEconomic,
	LegacyPathsMilitary,
	LegacyPathsScience,
	LegacyPathsCulture,
	RankingsOverView,
	RankingsLegacyPoints
}

/**
 * Display the scores and victory progress at the end of each era
 */
class ScreenVictoryProgress extends Panel {

	private closeButtonListener = this.close.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private topTabBarListener = this.onTopTabBarSelected.bind(this);
	private victoryBarListener = this.onVictoryBarSelected.bind(this);


	private topTabBar: HTMLElement | null = null;
	private topTabData: TabItem[] = [
		{ label: 'LOC_VICTORY_PROGRESS_LEGACY_PROGRESS', id: 'age-rankings-tab' },
		{ label: 'LOC_VICTORY_RANKINGS', id: 'victory-points-tab' }
	];
	private topTabIndex: number = 0;

	private ageRankTabBar: HTMLElement | null = null;
	private ageRankTabItems: TabItem[] = []; // set onAttach based on which legacy paths are enabled

	private ageRankTabIndex: number = 0;

	private victoryTabBar: HTMLElement | null = null;
	private victoryTabItems: TabItem[] = [
		{ label: 'LOC_VICTORY_PROGRESS_OVERVIEW', id: 'overview' },
		{ label: 'LOC_VICTORY_PROGRESS_LEGACY_POINTS', id: 'legacy-points' },
	];
	private victoryTabIndex: number = 0;

	private goToEndGameOnClose: boolean = false;
	private bgImageUrl: string = '';
	private bgImageElement: HTMLElement | null = null;

	private advisorPanels: HTMLElement[] = [];
	private victoryPanels: HTMLElement[] = [];

	onInitialize(): void {
		super.onInitialize();
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "victory-progress");
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		const playerInfo = Configuration.getPlayer(GameContext.localPlayerID);
		const playerCiv = playerInfo.civilizationTypeName;
		const info = GameInfo.LoadingInfo_Civilizations.find(info => info.CivilizationType === playerCiv);
		if (info && info.BackgroundImageHigh) {
			this.bgImageUrl = info.BackgroundImageHigh;
		}
		// background
		this.bgImageElement = MustGetElement(".victory-bg", this.Root);
		this.bgImageElement.style.backgroundImage = `url(${this.bgImageUrl})`;

		const frame = MustGetElement("fxs-frame", this.Root);
		frame.setAttribute("outside-safezone-mode", "full");
		frame.setAttribute("filigree-class", "mt-1");

		this.goToEndGameOnClose = false;
		const closeButton = document.createElement('fxs-close-button');
		closeButton.addEventListener('action-activate', this.closeButtonListener);
		const uiViewExperience = UI.getViewExperience();
		if (uiViewExperience == UIViewExperience.Mobile) {
			frame.appendChild(closeButton);
		} else {
			this.Root.appendChild(closeButton);
		}

		const enabledLegacyPaths = Players.get(GameContext.localPlayerID)?.LegacyPaths?.getEnabledLegacyPaths();
		if (enabledLegacyPaths != null) {
			for (const legacyPath of enabledLegacyPaths) {
				const legacyPathDef = GameInfo.LegacyPaths.lookup(legacyPath.legacyPath);
				switch (legacyPathDef?.LegacyPathClassType) {
					case 'LEGACY_PATH_CLASS_SCIENCE':
						this.ageRankTabItems.push({ label: 'LOC_VICTORY_PROGRESS_SCIENCE_VICTORY', id: AdvisorTypes.SCIENCE.toString() });
						break;
					case 'LEGACY_PATH_CLASS_CULTURE':
						this.ageRankTabItems.push({ label: 'LOC_VICTORY_PROGRESS_CULTURE_VICTORY', id: AdvisorTypes.CULTURE.toString() });
						break;
					case 'LEGACY_PATH_CLASS_MILITARY':
						this.ageRankTabItems.push({ label: 'LOC_VICTORY_PROGRESS_MILITARY_VICTORY', id: AdvisorTypes.MILITARY.toString() });
						break;
					case 'LEGACY_PATH_CLASS_ECONOMIC':
						this.ageRankTabItems.push({ label: 'LOC_VICTORY_PROGRESS_ECONOMIC_VICTORY', id: AdvisorTypes.ECONOMIC.toString() });
						break;
					default:
						break;
				}
			}
		}
		if (enabledLegacyPaths?.length == 0) {
			const primaryWindow: HTMLElement = MustGetElement('.primary-window', this.Root);

			primaryWindow.appendChild(this.buildDisabledHTML());
			return;
		}
		this.Root.addEventListener('navigate-input', this.navigateInputListener);

		this.buildVictoryProgress();
		this.refreshScores();
		this.setOpeningTab();
		engine.synchronizeModels();
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		this.topTabBar?.removeEventListener("tab-selected", this.topTabBarListener);
		this.ageRankTabBar?.removeEventListener("tab-selected", this.onAgeRankingTabBarSelected.bind(this));
		this.victoryTabBar?.removeEventListener("tab-selected", this.victoryBarListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();
		const enabledLegacyPaths = Players.get(GameContext.localPlayerID)?.LegacyPaths?.getEnabledLegacyPaths();
		if (enabledLegacyPaths && enabledLegacyPaths!.length > 0) {
			NavTray.clear();
			this.updateNavTray();
			FocusManager.setFocus(this.advisorPanels[this.ageRankTabIndex]);
		}
		else {
			NavTray.addOrUpdateGenericBack();
			FocusManager.setFocus(MustGetElement(".progression_disabled-container", this.Root));
		}
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private updateNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		if (this.topTabIndex == 0) {
			const viewDetail = Locale.stylize("LOC_LEGACY_PATH_VIEW_DETAILS", "")
			NavTray.addOrUpdateShellAction2(viewDetail);
		}

	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private buildVictoryProgress(): void {
		const primaryWindow: HTMLElement = MustGetElement('.primary-window', this.Root);

		const progressionHeader = this.buildHeader();
		const progressionContent = document.createElement('fxs-slot-group');
		progressionContent.classList.add('progression_content-wrapper', 'flow-column', 'items-center', 'flex-auto', 'w-full');

		const ageRankingContent = this.buildAgeRankingsContent();
		const victoryPointsContent = this.buildVictoryPointsContent();

		progressionContent.appendChild(ageRankingContent);
		progressionContent.appendChild(victoryPointsContent);

		primaryWindow.appendChild(progressionHeader);
		primaryWindow.appendChild(progressionContent);
	}

	private buildHeader(): HTMLElement {
		// create header of progression screen
		const progressionHeader: HTMLElement = document.createElement('fxs-vslot');
		progressionHeader.classList.add('progression_header-wrapper', 'w-full', 'flow-column', 'items-center', 'pb-7')
		const progressionTitle: HTMLElement = document.createElement('p');
		progressionTitle.classList.add('font-title', 'uppercase', 'text-2xl', 'bold', 'text-center', 'p-2\\.5', 'fxs-header', 'text-secondary')
		progressionTitle.setAttribute('data-l10n-id', 'LOC_UI_VICTORY_PROGRESS');

		// top tab bar
		this.topTabBar = document.createElement('fxs-tab-bar');
		this.topTabBar.classList.add('progression_nav', 'w-full');
		this.topTabBar.setAttribute("tab-items", JSON.stringify(this.topTabData));
		this.topTabBar.addEventListener("tab-selected", this.topTabBarListener);
		this.topTabBar.setAttribute('tab-for', 'fxs-vslot');
		progressionHeader.appendChild(progressionTitle);
		progressionHeader.appendChild(this.topTabBar);
		return progressionHeader;
	}

	private buildDisabledHTML(): HTMLElement {
		// create header of progression screen
		const pathsDisabledContainer = document.createElement("div");
		pathsDisabledContainer.classList.add("progression_disabled-container", "size-full");
		pathsDisabledContainer.setAttribute("tabindex", "-1");

		const progressionHeader: HTMLElement = document.createElement('fxs-vslot');
		progressionHeader.classList.add('progression_header-wrapper', 'w-full', 'flow-column', 'items-center', 'pb-7')
		const progressionTitle: HTMLElement = document.createElement('p');
		progressionTitle.classList.add('font-title', 'uppercase', 'text-2xl', 'bold', 'text-center', 'p-2\\.5', 'fxs-header', 'text-secondary')
		progressionTitle.setAttribute('data-l10n-id', 'LOC_UI_VICTORY_PROGRESS');

		// top tab bar
		this.topTabBar = document.createElement('fxs-tab-bar');
		this.topTabBar.classList.add('progression_nav', 'w-full');
		const tabItems = [];
		tabItems.push({ label: 'LOC_VICTORY_PROGRESS_LEGACY_PATHS_DISABLED', id: "(9)" })
		this.topTabBar.setAttribute("tab-items", JSON.stringify(tabItems));
		progressionHeader.appendChild(progressionTitle);
		progressionHeader.appendChild(this.topTabBar);

		const bodyContent = document.createElement("div");
		bodyContent.classList.add("flex-auto", "flex", "items-center", "justify-center");

		const pathsDisabledWarning = document.createElement("div");
		pathsDisabledWarning.classList.add("bg-primary-3", "border-2", "border-primary", "flex", "justify-center", "mb-8", "w-1\\/2");

		const pathsDisabledWarningText = document.createElement("div");
		pathsDisabledWarningText.setAttribute("data-l10n-id", "LOC_VICTORY_PROGRESS_LEGACY_PATHS_DISABLED_INFO");
		pathsDisabledWarningText.classList.add("my-3");
		pathsDisabledWarning.appendChild(pathsDisabledWarningText);

		bodyContent.appendChild(pathsDisabledWarning);

		pathsDisabledContainer.appendChild(progressionHeader);
		pathsDisabledContainer.appendChild(bodyContent);

		return pathsDisabledContainer;
	}

	private buildAgeRankingsContent(): HTMLElement {
		const ageRankingContent: HTMLElement = document.createElement('div');
		ageRankingContent.classList.add('progression_age-ranking-content', 'flow-column', 'w-full', 'flex-auto');
		ageRankingContent.setAttribute("tabindex", "-1");
		ageRankingContent.id = "age-rankings-tab"
		const tabWrapper = document.createElement('fxs-vslot');
		tabWrapper.classList.add('age-rank_tab-wrapper');
		this.ageRankTabBar = document.createElement('fxs-tab-bar');
		this.ageRankTabBar.classList.add('progression_ranking-nav', 'font-extralight', 'h-12', 'w-full', 'self-center');
		this.ageRankTabBar.setAttribute("tab-items", JSON.stringify(this.ageRankTabItems));
		this.ageRankTabBar.setAttribute("tab-style", 'flat');
		this.ageRankTabBar.setAttribute('alt-controls', 'true');
		this.ageRankTabBar.setAttribute('tab-for', 'fxs-vslot');
		this.ageRankTabBar.addEventListener("tab-selected", this.onAgeRankingTabBarSelected.bind(this));
		tabWrapper.appendChild(this.ageRankTabBar);
		const ageRankSlot = document.createElement('fxs-slot-group');
		ageRankSlot.classList.add('age-rank-slot', 'flow-column', 'items-center', 'w-full', 'flex-auto');
		for (const advisor of this.ageRankTabItems) {
			const panelAgeRanking = document.createElement('panel-advisor-victory');
			panelAgeRanking.setAttribute("tabindex", "-1");
			panelAgeRanking.setAttribute('advisor-type', advisor.id)
			panelAgeRanking.classList.add('flex');
			panelAgeRanking.id = advisor.id;
			this.advisorPanels.push(panelAgeRanking);
			ageRankSlot.appendChild(panelAgeRanking);
		}
		ageRankingContent.appendChild(tabWrapper);
		ageRankingContent.appendChild(ageRankSlot);
		return ageRankingContent;
	}

	private buildVictoryPointsContent(): HTMLElement {
		const victoryContent = document.createElement('div');
		victoryContent.classList.add('progression__victory-content', 'flow-column', 'w-full', 'flex-auto');
		victoryContent.setAttribute("tabindex", "-1");
		victoryContent.id = "victory-points-tab";
		const tabWrapper = document.createElement('fxs-vslot');
		tabWrapper.classList.add('age-rank_tab-wrapper');
		this.victoryTabBar = document.createElement('fxs-tab-bar');
		this.victoryTabBar.classList.add('progression_ranking-nav', 'font-extralight', 'h-12', 'w-full', 'self-center');
		this.victoryTabBar.setAttribute("tab-items", JSON.stringify(this.victoryTabItems));
		this.victoryTabBar.setAttribute("tab-style", 'flat');
		this.victoryTabBar.setAttribute('alt-controls', 'true');
		this.victoryTabBar.setAttribute('tab-for', 'fxs-vslot');
		this.victoryTabBar.addEventListener('tab-selected', this.victoryBarListener);
		tabWrapper.appendChild(this.victoryTabBar);
		const victorySlot = document.createElement('fxs-slot-group');
		victorySlot.classList.add('victory-slot', 'flow-column', 'items-center', 'w-full', 'flex-auto');

		const overviewContent = document.createElement('div');
		overviewContent.id = 'overview'
		overviewContent.classList.add('overview__tab-wrapper', 'flow-column', 'justify-center', 'w-full');
		overviewContent.setAttribute('tabindex', '-1');
		const overViewMilstoneProgress = document.createElement('panel-age-rankings');
		overViewMilstoneProgress.classList.add('flex', 'justify-center', 'item-center');
		overviewContent.appendChild(overViewMilstoneProgress);
		this.victoryPanels.push(overViewMilstoneProgress);
		const legacyPointsContent = document.createElement('div');
		legacyPointsContent.classList.add('legacy-points__tab-wrapper', 'flow-column', 'justify-center', 'w-full', 'mt-18');
		legacyPointsContent.setAttribute('tabindex', '-1');
		legacyPointsContent.id = "legacy-points";
		const legacyPoint = document.createElement('panel-victory-points');
		legacyPointsContent.appendChild(legacyPoint);
		this.victoryPanels.push(legacyPoint);
		victorySlot.appendChild(overviewContent);
		victorySlot.appendChild(legacyPointsContent);

		victoryContent.appendChild(tabWrapper);
		victoryContent.appendChild(victorySlot);
		return victoryContent;
	}

	private onTopTabBarSelected(event: TabSelectedEvent) {
		const slotGroup = MustGetElement('.progression_content-wrapper', this.Root);
		slotGroup.setAttribute('selected-slot', event.detail.selectedItem.id);
	}

	private onAgeRankingTabBarSelected(event: TabSelectedEvent) {
		const slotGroup = MustGetElement('.age-rank-slot', this.Root);
		this.setBackgroundImage(event.detail.selectedItem.id);
		slotGroup.setAttribute('selected-slot', event.detail.selectedItem.id);
		VictoryProgress.updateAdvisorVictoryTab = Number(event.detail.selectedItem.id);
	}

	private onVictoryBarSelected(event: TabSelectedEvent) {
		const slotGroup = MustGetElement('.victory-slot', this.Root);
		slotGroup.setAttribute('selected-slot', event.detail.selectedItem.id);
	}

	private setBackgroundImage(advisorType: string) {
		if (!this.bgImageElement) {
			console.error('screen-victory-progress: failed to find .victory-bg');
			return;
		}
		this.bgImageUrl = VictoryProgress.getBackdropByAdvisorType(advisorType)
		this.bgImageElement.style.backgroundImage = `url(${this.bgImageUrl})`;
	}

	setPanelOptions(options: any) {
		const traditionsOptions: ScreenVictoryProgressOptions = options as ScreenVictoryProgressOptions;
		if (traditionsOptions.openTab) {
			let slotGroup: HTMLElement | undefined = undefined;
			switch (traditionsOptions.openTab) {
				case VictoryProgressOpenTab.LegacyPathsCulture:
					slotGroup = MustGetElement('.age-rank-slot', this.Root);
					slotGroup.setAttribute('selected-slot', AdvisorTypes.CULTURE.toString());
					MustGetElement(".progression_ranking-nav", this.Root).setAttribute("selected-tab-index", "3");
					break;
				case VictoryProgressOpenTab.LegacyPathsEconomic:
					//already here by default
					break;
				case VictoryProgressOpenTab.LegacyPathsMilitary:
					slotGroup = MustGetElement('.age-rank-slot', this.Root);
					slotGroup.setAttribute('selected-slot', AdvisorTypes.MILITARY.toString());
					MustGetElement(".progression_ranking-nav", this.Root).setAttribute("selected-tab-index", "1");
					break;
				case VictoryProgressOpenTab.LegacyPathsScience:
					slotGroup = MustGetElement('.age-rank-slot', this.Root);
					slotGroup.setAttribute('selected-slot', AdvisorTypes.SCIENCE.toString());
					MustGetElement(".progression_ranking-nav", this.Root).setAttribute("selected-tab-index", "2");
					break;
				case VictoryProgressOpenTab.RankingsOverView:
					slotGroup = MustGetElement('.progression_content-wrapper', this.Root);
					slotGroup.setAttribute('selected-slot', "victory-points-tab");
					MustGetElement(".progression_nav", this.Root).setAttribute("selected-tab-index", "1");
					this.topTabIndex = 1;
					this.updateNavTray();
					FocusManager.setFocus(this.victoryPanels[0]);
					break;
				default:
					break;

			}
		}
	}

	refreshScores() {
		VictoryProgress.update();

		const victoryFrame: HTMLDivElement | null = this.Root.querySelector<HTMLDivElement>("#victory-progress-frame");
		if (victoryFrame) {
			const ageHash: HashId = Game.age;
			const ageObject: AgeDefinition | null = GameInfo.Ages.lookup(ageHash);
			if (ageObject) {
				victoryFrame.setAttribute("title", Locale.compose(ageObject.Name));
			}
		}

	}

	close() {
		super.close();

		if (this.goToEndGameOnClose) {
			DisplayQueueManager.add({ category: 'EndgameScreen' });
		}
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		const live: boolean = this.handleNavigation(navigationEvent);
		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
			Audio.playSound("data-audio-tab-selected");
		}
	}

	private setOpeningTab() {
		let slotGroup: HTMLElement | undefined = undefined;
		switch (VictoryProgress.advisorVictoryTab) {
			case AdvisorTypes.CULTURE:
				slotGroup = MustGetElement('.age-rank-slot', this.Root);
				slotGroup.setAttribute('selected-slot', AdvisorTypes.CULTURE.toString());
				MustGetElement(".progression_ranking-nav", this.Root).setAttribute("selected-tab-index", "0");
				break;
			case AdvisorTypes.MILITARY:
				slotGroup = MustGetElement('.age-rank-slot', this.Root);
				slotGroup.setAttribute('selected-slot', AdvisorTypes.MILITARY.toString());
				MustGetElement(".progression_ranking-nav", this.Root).setAttribute("selected-tab-index", "1");
				break;
			case AdvisorTypes.SCIENCE:
				slotGroup = MustGetElement('.age-rank-slot', this.Root);
				slotGroup.setAttribute('selected-slot', AdvisorTypes.SCIENCE.toString());
				MustGetElement(".progression_ranking-nav", this.Root).setAttribute("selected-tab-index", "2");
				break;
			case AdvisorTypes.ECONOMIC:
				slotGroup = MustGetElement('.age-rank-slot', this.Root);
				slotGroup.setAttribute('selected-slot', AdvisorTypes.ECONOMIC.toString());
				MustGetElement(".progression_ranking-nav", this.Root).setAttribute("selected-tab-index", "3");
				break;
			default:
				break;
		}
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	private handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			// Ignore everything but FINISH events
			return true;
		}
		if (!this.topTabBar || !this.ageRankTabBar || !this.victoryTabBar) {
			console.error('screen-victory-progress: handleNavigation(): Failed to find topTabBar or ageRankBar');
			return false;
		}
		let live: boolean = true;
		const direction: InputNavigationAction = navigationEvent.getDirection();

		switch (direction) {
			case InputNavigationAction.PREVIOUS:
			case InputNavigationAction.NEXT: {
				let selectedIndex = this.topTabIndex;
				selectedIndex = direction === InputNavigationAction.PREVIOUS ? selectedIndex - 1 : selectedIndex + 1;

				if (selectedIndex >= this.topTabData.length) {
					this.topTabIndex = 0;
				} else if (selectedIndex < 0) {
					this.topTabIndex = this.topTabData.length - 1;
				} else {
					this.topTabIndex = selectedIndex;
				}
				this.updateNavTray()
				this.topTabBar.setAttribute('selected-tab-index', `${this.topTabIndex}`);
				if (this.topTabIndex == 1) {
					FocusManager.setFocus(this.victoryPanels[this.victoryTabIndex]);
				}
				if (this.topTabIndex == 0) {
					FocusManager.setFocus(this.advisorPanels[this.ageRankTabIndex]);
				}
				navigationEvent.preventDefault();
				navigationEvent.stopImmediatePropagation();
				live = false;
				break;
			}

			case InputNavigationAction.SHELL_NEXT:
			case InputNavigationAction.SHELL_PREVIOUS: {
				// only moves if the top nav is on age rankings
				if (this.topTabIndex === 0) {
					let selectedIndex = this.ageRankTabIndex;
					selectedIndex = direction === InputNavigationAction.SHELL_PREVIOUS ? selectedIndex - 1 : selectedIndex + 1;

					if (selectedIndex >= this.ageRankTabItems.length) {
						this.ageRankTabIndex = 0;
					} else if (selectedIndex < 0) {
						this.ageRankTabIndex = this.ageRankTabItems.length - 1;
					} else {
						this.ageRankTabIndex = selectedIndex;
					}
					this.ageRankTabBar.setAttribute('selected-tab-index', `${this.ageRankTabIndex}`);
				} else if (this.topTabIndex === 1) {
					let selectedIndex = this.victoryTabIndex;
					selectedIndex = direction === InputNavigationAction.SHELL_PREVIOUS ? selectedIndex - 1 : selectedIndex + 1;

					if (selectedIndex >= this.victoryTabItems.length) {
						this.victoryTabIndex = 0;
					} else if (selectedIndex < 0) {
						this.victoryTabIndex = this.victoryTabItems.length - 1;
					} else {
						this.victoryTabIndex = selectedIndex;
					}
					this.updateNavTray();
					this.victoryTabBar.setAttribute('selected-tab-index', `${this.victoryTabIndex}`);
					FocusManager.setFocus(this.victoryPanels[this.victoryTabIndex]);
					navigationEvent.preventDefault();
					navigationEvent.stopImmediatePropagation();
				}
				live = false;
				break;
			}
		}

		return live;
	}
}

Controls.define('screen-victory-progress', {
	createInstance: ScreenVictoryProgress,
	description: 'Screen showing the victory progress.',
	classNames: ['screen-victory-progress', 'fullscreen', 'self-center', 'pointer-events-auto'],
	styles: ['fs://game/base-standard/ui/victory-progress/screen-victory-progress.css'],
	content: ['fs://game/base-standard/ui/victory-progress/screen-victory-progress.html']
});
/**
 * @file create-game-nav-model.ts		
 * @copyright 2024, Firaxis Games
 * @description Model for game creation navigation info
 */

import ContextManager from "/core/ui/context-manager/context-manager.js";
import { AgeData, CivData } from "/core/ui/shell/create-panels/age-civ-select-model.js";
import { ICreationPanelInfo, NextCreationAction } from "/core/ui/shell/create-panels/game-creator-types.js";
import { LeaderData } from "/core/ui/shell/create-panels/leader-select-model.js";
import { StartCampaignEvent, GameCreatorClosedEvent } from "/core/ui/events/shell-events.js";
import { ScreenProfilePageExternalStatus } from "/core/ui/profile-page/screen-profile-page.js";
import { Audio } from "/core/ui/audio-base/audio-support.js";

class CreateGameModelImpl {
	private _categories: string[] = [];
	private openPanel: HTMLElement | null = null;
	private currentPanelIndex = 0;
	private createGameRoot: HTMLElement | null = null;
	private panelList: ICreationPanelInfo[] = [];
	private currentBackground?: string;
	private _isFirstTimeCreateGame = false;

	private _selectedLeader?: LeaderData;
	private _selectedAge?: AgeData;
	private _selectedCiv?: CivData;

	public get categories(): string[] {
		return this._categories;
	}

	public get activeCategory(): string | undefined {
		return this.currentPanel.category;
	}

	private get currentPanel(): ICreationPanelInfo {
		return this.panelList[this.currentPanelIndex];
	}

	public get selectedLeader(): LeaderData | undefined {
		return this._selectedLeader;
	}

	public set selectedLeader(value: LeaderData | undefined) {
		this._selectedLeader = value;
	}

	public get selectedAge(): AgeData | undefined {
		return this._selectedAge;
	}

	public set selectedAge(value: AgeData | undefined) {
		this._selectedAge = value;
	}

	public get selectedCiv(): CivData | undefined {
		return this._selectedCiv;
	}

	public set selectedCiv(value: CivData | undefined) {
		this._selectedCiv = value;
	}

	public get isLastPanel() {
		return this.currentPanelIndex >= this.panelList.length - 1;
	}

	public get nextActionStartsGame() {
		return this.currentPanel != undefined && this.currentPanel.nextAction == NextCreationAction.StartGame;
	}

	public get isFirstTimeCreateGame() {
		return this._isFirstTimeCreateGame;
	}

	public set isFirstTimeCreateGame(value: boolean) {
		this._isFirstTimeCreateGame = value;
	}

	public getAgeBackgroundName(ageId: string) {
		return `${ageId.toLowerCase().replace("age_", "age-sel_")}_full`;
	}

	public getCivBackgroundName(civId: string) {
		return `bg-panel-${civId.replace("CIVILIZATION_", "").toLowerCase()}`
	}

	public onInviteAccepted() {
		ContextManager.popUntil("main-menu");
		window.dispatchEvent(new GameCreatorClosedEvent());
	}

	public isCurrentPanel(name: string) {
		if (this.panelList[this.currentPanelIndex].category === name) {
			return true;
		}

		return false;
	}

	public showPanelByName(name: string) {
		const newIndex = this.panelList.findIndex(p => p.panel === name);

		if (newIndex >= 0 && newIndex != this.currentPanelIndex) {
			this.popPanel();
			this.currentPanelIndex = newIndex;
			this.showPanel();
		}
	}

	public showPanelFor(category: string) {
		const newIndex = this.panelList.findIndex(p => p.category === category);

		if (newIndex >= 0 && newIndex != this.currentPanelIndex) {
			this.popPanel();
			this.currentPanelIndex = newIndex;
			this.showPanel();
		}
	}

	public showNextPanel(opts?: { skip: string }) {
		this.popPanel();

		if (this.currentPanel.nextAction === NextCreationAction.StartGame) {
			Audio.playSound("data-audio-create-continue", "game-creator-3");
			this.startGame();
		} else {
			// If a panel to skip is specified and it's the next panel, skip it
			if (opts?.skip && this.panelList[this.currentPanelIndex++].panel == opts.skip) {
				this.currentPanelIndex++;
			}
			Audio.playSound("data-audio-create-continue", "game-creator-2");
			this.currentPanelIndex++;
			this.showPanel();
		}
	}

	public showPreviousPanel() {
		this.popPanel()

		if (this.currentPanelIndex > 0) {
			this.currentPanelIndex--;
			this.showPanel();
		} else {
			// back to main menu
			ContextManager.popUntil("main-menu");
			window.dispatchEvent(new GameCreatorClosedEvent());
		}
		Audio.playSound("data-audio-back-activate",);
	}

	public setCreateGameRoot(element: HTMLElement) {
		this.createGameRoot = element;
	}

	public setPanelList(panelList: ICreationPanelInfo[]) {
		this.panelList = panelList;
		// Only keep first entry for each category, maintaining array order
		this._categories = this.panelList.map(panel => panel.category).filter((cat, idx, arr) => cat !== undefined && arr.indexOf(cat) === idx) as string[];
	}

	public startGame() {
		this.isFirstTimeCreateGame = false;
		ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = false;
		window.dispatchEvent(new StartCampaignEvent());
		engine.call('startGame');
	}

	public setBackground(background?: string, forceDisplay?: boolean) {
		if (background != this.currentBackground || forceDisplay) {
			WorldUI.clearBackground();
			WorldUI.addBackgroundLayer("age_sel_bg_ramp", {}); // default values are correct, Fill/CenterX/CenterY

			if (background) {
				WorldUI.addMaskedBackgroundLayer(background, "age_sel_bg_mask", { stretch: StretchMode.UniformFill, alignY: AlignMode.Maximum }); // uniform anchored at bottom
			}

			this.currentBackground = background;
		}
	}

	public launchFirstPanel(): void {
		if (this.panelList.length === 0) {
			console.error("game-creator: couldn't find a panel to launch");
			return;
		}

		this.currentPanelIndex = 0;
		this.showPanel();
	}

	private popPanel() {
		if (this.openPanel) {
			ContextManager.pop(this.openPanel);
			this.openPanel = null;
			ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = false;
		}
	}

	private showPanel() {
		const pushPanelOpts = { singleton: true, createMouseGuard: false, targetParent: this.createGameRoot!, panelOptions: this.currentPanel.panelOptions };
		this.openPanel = ContextManager.push(this.currentPanel.panel, pushPanelOpts);
		ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = true;
	}
}

export const CreateGameModel = new CreateGameModelImpl();

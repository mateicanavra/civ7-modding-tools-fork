/**
 * @file create-game-sp.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Kicks off the single-player create game flow.
 */

import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { ICreationPanelInfo, NextCreationAction } from '/core/ui/shell/create-panels/game-creator-types.js';
import LiveEventManager from '/core/ui/shell/live-event-logic/live-event-logic.js';
import { CreateGameModel } from '/core/ui/shell/create-panels/create-game-model.js';
import LeaderSelectModelManager from '/core/ui/shell/leader-select/leader-select-model-manager.js';
import { GetAgeMap } from '/core/ui/shell/create-panels/age-civ-select-model.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { GameCreationPromoManager } from '/core/ui/shell/create-panels/game-creation-promo-manager.js';

const panelList: ICreationPanelInfo[] = [
	{ panel: "leader-select-panel", nextAction: NextCreationAction.Continue, category: "LOC_CREATE_GAME_LEADER_SELECT_CATEGORY" },
	{ panel: "age-select-panel", nextAction: NextCreationAction.Continue, category: "LOC_CREATE_GAME_AGE_CIV_SELECT_CATEGORY" },
	{ panel: "civ-select-panel", nextAction: NextCreationAction.Continue, category: "LOC_CREATE_GAME_AGE_CIV_SELECT_CATEGORY" },
	{ panel: "game-setup-panel", nextAction: NextCreationAction.StartGame, category: "LOC_CREATE_GAME_GAME_START_CATEGORY" },
	{ panel: "advanced-options-panel", nextAction: NextCreationAction.StartGame, category: "LOC_CREATE_GAME_GAME_START_CATEGORY" }
];

const firstTimeTutorialPanelList: ICreationPanelInfo[] = [
	{ panel: "leader-select-panel", nextAction: NextCreationAction.Continue, category: "LOC_CREATE_GAME_LEADER_SELECT_CATEGORY" },
	{ panel: "civ-select-panel", nextAction: NextCreationAction.StartGame, category: "LOC_CREATE_GAME_AGE_CIV_SELECT_CATEGORY", panelOptions: { noAge: true } },
	{ panel: "game-setup-panel", nextAction: NextCreationAction.StartGame, category: "LOC_CREATE_GAME_GAME_START_CATEGORY" },
];

const fixedAgePanelList: ICreationPanelInfo[] = [
	{ panel: "leader-select-panel", nextAction: NextCreationAction.Continue, category: "LOC_CREATE_GAME_LEADER_SELECT_CATEGORY" },
	{ panel: "civ-select-panel", nextAction: NextCreationAction.Continue, category: "LOC_CREATE_GAME_AGE_CIV_SELECT_CATEGORY", panelOptions: { noAge: true } },
	{ panel: "game-setup-panel", nextAction: NextCreationAction.StartGame, category: "LOC_CREATE_GAME_GAME_START_CATEGORY" },
	{ panel: "advanced-options-panel", nextAction: NextCreationAction.StartGame, category: "LOC_CREATE_GAME_GAME_START_CATEGORY" }
];

class CreateGameSP extends Component {
	onAttach() {
		super.onAttach();

		let panels = panelList;

		if (CreateGameModel.isFirstTimeCreateGame) {
			const ageMap = GetAgeMap();
			GameSetup.setGameParameterValue('Age', 'AGE_ANTIQUITY');
			CreateGameModel.selectedAge = ageMap.get("AGE_ANTIQUITY");
			panels = firstTimeTutorialPanelList;
		}
		else if (Online.Metaprogression.isPlayingActiveEvent()) {
			if (LiveEventManager.skipAgeSelect()) {
				panels = fixedAgePanelList;
			}
		}

		GameCreationPromoManager.refreshPromos();

		CreateGameModel.setCreateGameRoot(this.Root);
		CreateGameModel.setPanelList(panels);
		CreateGameModel.setBackground(undefined, true);

		engine.on('InviteAccepted', this.onInviteAccepted.bind(this));

		// now kick off the flow
		waitForLayout(() => CreateGameModel.launchFirstPanel());
	}

	public onDetach() {
		WorldUI.clearBackground();
		LeaderSelectModelManager.clearLeaderModels();

		engine.off('InviteAccepted', this.onInviteAccepted.bind(this));


		GameCreationPromoManager.cancelResolves();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		FocusManager.setFocus(this.Root);
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	onInviteAccepted() {
		CreateGameModel.onInviteAccepted();
	}
}

Controls.define('create-game-sp', {
	createInstance: CreateGameSP,
	description: 'Create a single-player custom game',
	styles: ["fs://game/core/ui/shell/create-game/create-game-sp.css"],
	classNames: ['fullscreen'],
	requires: ['age-select-panel', 'leader-select-panel', 'civ-select-panel', 'game-setup-panel'],
	images: [
		"fs://game/shell_back-button.png",
		"fs://game/shell_back-button-focus.png",
		"fs://game/shell_arrow-button.png",
		"fs://game/shell_arrow-button-focus.png",
		"fs://game/shell_create-tab-bg.png",
		"fs://game/shell_create-tab-bg-focus.png",
		"fs://game/hud_unit-panel_box-bg.png"],
	tabIndex: -1
});

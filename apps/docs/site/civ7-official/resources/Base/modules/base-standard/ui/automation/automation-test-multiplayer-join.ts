//----------------------------------------------------------------
// Multiplayer test handler
//----------------------------------------------------------------

console.log("loading automation-test-multiplayer-join.ts");

import { AutomationBasePlayGame } from '/base-standard/ui/automation/automation-base-play-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestPlayGame extends AutomationBasePlayGame {

	private automationTestMultiplayerJoinListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }
	private mpGameListUpdatedListener = (data: MultiplayerGameListUpdatedData) => { this.onMultiplayerGameListUpdated(data); };
	private mpGameListCompleteListener = (data: MultiplayerGameListCompleteData) => { this.onMultiplayerGameListComplete(data); };

	private joinGameName: string = "";

	register() {
		engine.on('Automation-Test-Multiplayer-Join', this.automationTestMultiplayerJoinListener);
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		// Forward the event on to the handler.
		if (command === 'Run') {

			// Check for joining by Join Code.
			let joinCodeStr: string = "";
			const joinCodeParam = Automation.getParameter("CurrentTest", "JoinCode");
			if (joinCodeParam !== null) {
				joinCodeStr = joinCodeParam.toString();

				const joinServerType: ServerType = Automation.getParameter("CurrentTest", "ServerType", ServerType.SERVER_TYPE_INTERNET);
				Automation.log("Joining game by Join Code=" + joinCodeStr + ", ServerType=" + joinServerType.toString());

				Network.joinMultiplayerGame(joinCodeStr, joinServerType);
				return;
			}

			// Check for joining by Join Code.
			const gameNameParam = Automation.getParameter("CurrentTest", "GameName");
			if (gameNameParam != null) {
				this.joinGameName = gameNameParam.toString();
				const browseServerType: ServerType = Automation.getParameter("CurrentTest", "ServerType", ServerType.SERVER_TYPE_INTERNET);
				Automation.log("Joining game by GameName=" + this.joinGameName + ", ServerType=" + browseServerType.toString());

				engine.on('MultiplayerGameListUpdated', this.mpGameListUpdatedListener);
				engine.on('MultiplayerGameListComplete', this.mpGameListCompleteListener);

				Network.initGameList(browseServerType);
				Network.refreshGameList();
				return;
			}

			// Uh oh. We are trying to joing a multiplayer game but we don't have a join method.
			AutomationSupport.FailTest("No Join Method Found!");
		} else if (command == 'PostGameInitialization') {
			this.postGameInitialization(args)
		} else if (command == 'GameStarted') {
			this.gameStarted();
		} else if (command == 'Stop') {
			this.stop();
		}
	}

	onMultiplayerGameListUpdated(data: MultiplayerGameListUpdatedData) {
		if (this.joinGameName == "") {
			return;
		}

		let gameListData: GameListEntry | null = Network.getGameListEntry(data.idLobby);
		if (gameListData != null && gameListData.serverNameOriginal == this.joinGameName) {
			Automation.log("GameName=" + this.joinGameName
				+ " Found. RoomID=" + data.idLobby.toString() + " Joining Game...");
			engine.off('MultiplayerGameListUpdated', this.mpGameListUpdatedListener);
			engine.off('MultiplayerGameListComplete', this.mpGameListCompleteListener);

			Network.joinMultiplayerRoom(data.idLobby);
		}
	}

	onMultiplayerGameListComplete(_data: MultiplayerGameListCompleteData) {
		if (this.joinGameName == "") {
			return;
		}

		Automation.log("GameListComplete. GameName=" + this.joinGameName
			+ "Not Found. Refreshing games list...");
		Network.refreshGameList();
	}
}

let automationTestPlayGameHandler = new AutomationTestPlayGame();
automationTestPlayGameHandler.register();

Automation.setScriptHasLoaded("automation-test-multiplayer-join");


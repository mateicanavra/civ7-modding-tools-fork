//----------------------------------------------------------------
// Multiplayer test handler
//----------------------------------------------------------------

console.log("loading automation-test-multiplayer-host.ts");

import { AutomationBasePlayGame } from '/base-standard/ui/automation/automation-base-play-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestPlayGame extends AutomationBasePlayGame {

	private startGame: boolean = false;
	private startGameCount: number = 0;

	private automationTestMultiplayerHostListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); };
	private playerInfoChangedListener = () => { this.onPlayerInfoChanged(); };

	register() {
		engine.on('Automation-Test-Multiplayer-Host', this.automationTestMultiplayerHostListener);
		engine.on('PlayerInfoChanged', this.playerInfoChangedListener);
		engine.on('AutomationAppUpdateComplete', () => { this.update(); });
		engine.on('PlayerTurnActivated', (data: PlayerTurnActivated_EventData) => { this.onPlayerTurnActivated(data) });
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		// Forward the event on to the handler.
		if (command === 'Run') {
			const joinServerType: ServerType = Automation.getParameter("CurrentTest", "ServerType", ServerType.SERVER_TYPE_INTERNET);
			this.run(joinServerType);
			Automation.log("Game hosted");
		} else if (command == 'PostGameInitialization') {
			this.postGameInitialization(args)
		} else if (command == 'GameStarted') {
			this.gameStarted();
		} else if (command == 'Stop') {
			this.stop();
		}
	}

	private onPlayerInfoChanged() {
		const numPlayers = Network.getNumPlayers();
		const numPlayersRequired = Automation.getParameter("CurrentTest", "Players", 2);
		Automation.log("Players: " + numPlayersRequired);
		if (numPlayers >= numPlayersRequired) {
			engine.off('PlayerInfoChanged', this.playerInfoChangedListener);
			for (let i = 0; i < numPlayersRequired; i++) {
				Configuration.editPlayer(i)!.setSlotStatus(SlotStatus.SS_COMPUTER);

			}
			this.startGame = true;
		}
	}

	private update() {
		if (this.startGame) {
			// TODO: There appears to be a delay required in order to successfully have the client
			// actually have a leader and civilization in game
			if (this.startGameCount < 60) {
				this.startGameCount += 1;
			}
			else {
				this.startGame = false;
				Network.startMultiplayerGame();
			}
		}
	}

	private onPlayerTurnActivated(data: PlayerTurnActivated_EventData) {
		Automation.log("Player turn activated: " + data.player);
	}
}

let automationTestPlayGameHandler = new AutomationTestPlayGame();
automationTestPlayGameHandler.register();

Automation.setScriptHasLoaded("automation-test-multiplayer-host");


//----------------------------------------------------------------
// PlayGame test handler
//----------------------------------------------------------------

console.log("loading automation-test-play-game.ts");

import { AutomationBasePlayGame } from '/base-standard/ui/automation/automation-base-play-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestPlayGame extends AutomationBasePlayGame {

	private automationTestPlayGameListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }

	register() {
		engine.on('Automation-Test-PlayGame', this.automationTestPlayGameListener);
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		// Forward the event on to the handler.
		if (command === 'Run') {
			if (args !== null && args.length > 0 && args[0] == 'Restart') {
				this.restart();
			} else {
				this.run();
			}
		} else if (command == 'PostGameInitialization') {
			this.postGameInitialization(args)
		} else if (command == 'GameStarted') {
			this.gameStarted();
		} else if (command == 'Stop') {
			this.stop();
		}
	}
}

let automationTestPlayGameHandler = new AutomationTestPlayGame();
automationTestPlayGameHandler.register();

Automation.setScriptHasLoaded("automation-test-play-game");


//----------------------------------------------------------------
// A set of automation tests for producing buildings 
//----------------------------------------------------------------

console.log("loading automation-test-production.ts");

import { AutomationBasePlayGame } from '/base-standard/ui/automation/automation-base-play-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestProduction extends AutomationBasePlayGame {

	private observer = -1;
	private produceTag?: number = -1;

	private automationTestProductionListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }

	register() {
		engine.on('Automation-Test-Production', this.automationTestProductionListener);
		engine.on('PlayerTurnActivated', (data: PlayerTurnActivated_EventData) => { this.onPlayerTurnActivated(data) });
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		// Forward the event on to the handler.
		if (command === 'Run') {
			this.run();
		} else if (command == 'PostGameInitialization') {
			this.initializeAiBuildingQueue();
			this.postGameInitialization(args)
		} else if (command == 'GameStarted') {
			this.gameStarted();
		} else if (command == 'Stop') {
			this.stop();
		}
	}

	private initializeAiBuildingQueue() {
		Automation.log("initializeAiBuildingQueue");
		// Get the player we are observing
		this.observer = AutomationSupport.GetCurrentTestObserver();
		Automation.log("Observed player: " + this.observer);
		if (this.observer != PlayerIds.NO_PLAYER) {
			// Get the players capital city and it's location
			const capital = Players.Cities.get(this.observer)?.getCapital();
			let location = null;
			if (capital) {
				location = capital.location;
			}
			else {
				AutomationSupport.FailTest("Player doesn't have a capital city???");
				return;
			}
			Automation.log("Capital location: " + JSON.stringify(location));

			// Get what we are building in this test. If both Unit and Constructible are sent, default to Unit
			// However, we need to have at least one to continue
			const unit = Automation.getParameter("CurrentTest", "Unit");
			const constructible = Automation.getParameter("CurrentTest", "Constructible");
			if (unit !== null) {
				const hash = Database.makeHash(unit);
				Automation.log("Hash for " + unit + ": " + hash.valueOf());
				this.produceTag = Players.AI.get(this.observer)?.requestUnit(hash.valueOf(), location, 100000);
			}
			else if (constructible !== null) {
				const hash = Database.makeHash(constructible);
				Automation.log("Hash for " + constructible + ": " + hash.valueOf());
				Automation.log("Id for capital: " + JSON.stringify(capital.id));
				this.produceTag = Players.AI.get(this.observer)?.requestConstructible(hash.valueOf(), capital.id, location, 100000);
			}
			else {
				AutomationSupport.FailTest("No Unit or Constructible set in test");
				return;
			}
			Automation.log("Produce tag: " + this.produceTag);

			// Ensure we received a valid tag
			if (this.produceTag == null) {
				AutomationSupport.FailTest("Unable to get observer player object");
			}
			else if (this.produceTag == -1) {
				AutomationSupport.FailTest("Request made for an invalid unit type");
			}
		}
		else {
			AutomationSupport.FailTest("No observer player to initialize building queue for");
		}
	}

	private onPlayerTurnActivated(data: PlayerTurnActivated_EventData) {
		// If this is the player we are observing, and there is a request in progress...
		if (data.player === this.observer && this.produceTag != null && this.produceTag != -1) {
			const player = Players.AI.get(this.observer);
			if (player != null) {
				if (player.isRequestFulfilled(this.produceTag)) {
					AutomationSupport.PassTest();
				}
				else if (!player.isRequestStillValid(this.produceTag)) {
					AutomationSupport.FailTest("Building request no longer valid");
				}
			}
		}
	}

	protected stop() {
		super.stop();
		this.observer = PlayerIds.NO_PLAYER;
		this.produceTag = -1;
	}
}

let automationTestProductionHandler = new AutomationTestProduction();
automationTestProductionHandler.register();

Automation.setScriptHasLoaded("automation-test-production");

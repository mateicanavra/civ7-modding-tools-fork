//----------------------------------------------------------------
// UI test handler
// -autoscript "fs://game/base-standard/ui/automation/automation-test-ui.js" -autoparams "Tests=(  { Test=UI, HumanPlayers=1 } )" -MemPoolDump -bypassLock -AutoScreenshots -bypassStartButton -DrawFrameStats -EnableSingleOutput 1
//----------------------------------------------------------------

console.log("loading automation-test-ui.ts");

import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
import ActionHandler from '/core/ui/input/action-handler.js';

interface InputData {
	actionName: string;
	status: InputActionStatuses;
	x: number;
	y: number;
}

class AutomationTestUI {

	private observer = -1;

	private automationTestUIListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }

	actions: InputData[] = [
		//open & close resources
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.94, y: -0.69 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.94, y: -0.69 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },

		//open & close great works
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.83, y: -0.79 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.83, y: -0.79 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },

		//open & close rankings
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.82, y: -0.82 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.82, y: -0.82 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },

		//open & close religion
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.73, y: -0.86 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.73, y: -0.86 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },

		//open & close policies
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.64, y: -0.90 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.64, y: -0.90 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },

		//open & close civics
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.53, y: -0.99 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.53, y: -0.99 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },

		//open & close tech
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.4, y: -1 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.4, y: -1 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },

		//open & close unlocks
		{ actionName: "nav-previous", status: InputActionStatuses.START, x: 0, y: 0 },
		{ actionName: "nav-previous", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "nav-beam", status: InputActionStatuses.UPDATE, x: -0.32, y: -1 },
		{ actionName: "nav-beam", status: InputActionStatuses.FINISH, x: -0.32, y: -1 },
		{ actionName: "accept", status: InputActionStatuses.FINISH, x: 0, y: 0 },
		{ actionName: "cancel", status: InputActionStatuses.FINISH, x: 0, y: 0 },
	];

	private curActionIndex: number = 0;

	register() {
		engine.on('Automation-Test-UI', this.automationTestUIListener);
		engine.on('PlayerTurnActivated', (data: PlayerTurnActivated_EventData) => { this.onPlayerTurnActivated(data) });
		engine.on("InputAction", (name: string, status: InputActionStatuses, x: number, y: number) => {
			Automation.log(`Input action: ${name}, status: ${status}, at coordinates (${x}, ${y})`);
		});
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		// Forward the event on to the handler.
		if (command === 'Run') {
			this.run();
		} else if (command == 'PostGameInitialization') {
			this.postGameInitialization();
		}
	}

	private run(serverType: ServerType = ServerType.SERVER_TYPE_NONE) {
		Automation.log("UI Test - run()");
		if (UI.isInShell() == false) {
			Automation.log("Not in shell, exiting to the main menu to continue");
			// Exit back to the main menu, we will pick up from there.
			engine.call('exitToMainMenu');
			return;
		}

		// Start a game
		Configuration.editGame()!.reset();
		// Did they want to load a configuration?
		const configurationFile = Automation.getParameter("CurrentTest", "LoadConfiguration");
		if (configurationFile !== null) {

			let loadParams: any = {};

			loadParams.Location = SaveLocations.LOCAL_STORAGE;
			loadParams.Type = SaveTypes.SINGLE_PLAYER;
			loadParams.FileType = SaveFileTypes.GAME_CONFIGURATION;
			loadParams.IsAutosave = false;
			loadParams.IsQuicksave = false;
			loadParams.Directory = SaveDirectories.DEFAULT;

			loadParams.Name = configurationFile;

			const configDirectory = Automation.getParameter("CurrentTest", "ConfigurationDirectory");
			if (configDirectory !== null) {
				loadParams.Directory = configDirectory;
			}
			Automation.log("Loading configuration");
			const bResult = Network.loadGame(loadParams, serverType);
			if (bResult == false) {
				AutomationSupport.FailTest("");
				return
			}
		}

		AutomationSupport.ApplyCommonNewGameParametersToConfiguration();
		AutomationSupport.ReadUserConfigOptions();
		Automation.log("Starting game");
		Network.hostGame(serverType);
	}

	private postGameInitialization() {
		Automation.log("UI Test - postGameInitialization()");
		this.observer = AutomationSupport.GetCurrentTestObserver();
	}

	private onPlayerTurnActivated(data: PlayerTurnActivated_EventData) {
		//If this is the player we are observing, and there is a request in progress...
		if (data.player === this.observer) {
			const player = Players.AI.get(this.observer);
			if (player != null) {
				this.makeInputs();
			}
		}
	}

	private makeInputs() {
		ActionHandler.deviceType = InputDeviceType.Controller;
		window.setTimeout(() => {
			Automation.log("Starting inputs...");
			this.makeNextInput();
		}, 5000);
	}

	private makeNextInput() {
		if (this.curActionIndex >= this.actions.length) {
			this.curActionIndex = 0;
		}
		const curAction: InputData = this.actions[this.curActionIndex];
		engine.trigger('InputAction', curAction.actionName, curAction.status, curAction.x, curAction.y);
		this.curActionIndex++;
		window.setTimeout(() => {
			this.makeNextInput();
		}, 300);
	}
}

let automationTestUIHandler = new AutomationTestUI();
automationTestUIHandler.register();

Automation.setScriptHasLoaded("automation-test-ui");
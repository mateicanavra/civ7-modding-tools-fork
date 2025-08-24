//-----------------------------------------------------------------
// LoadGame test handler
//-----------------------------------------------------------------

console.log("loading automation-base-load-game.ts");

import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestLoadGame {

	private automationTestLoadGameListener = (command: string) => { this.onAutomationEvent(command); };
	private autoPlayEndListener = () => { this.onAutoPlayEnd(); };
	private saveCompleteListener = () => { this.onSaveComplete(); };

	private savesRemaining: number = 0;

	register() {
		engine.on('Automation-Test-LoadGame', this.automationTestLoadGameListener);
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		if (command === 'Run') {
			this.run();
		}
		else if (command == 'PostGameInitialization') {
			this.postGameInitialization(args)
		}
		else if (command == 'GameStarted') {
			this.gameStarted();
		}
		else if (command == 'Stop') {
			this.stop();
		}
	}

	private loadLastGame() {
		// Set persistent first-or-second run tracker to false
		Automation.setLocalParameter("loadGame_firstRun", false);

		// Initialize game to be loaded		
		let loadGame: any = {};
		loadGame.Location = SaveLocations.LOCAL_STORAGE;
		loadGame.Type = SaveTypes.SINGLE_PLAYER;
		loadGame.IsAutosave = false;
		loadGame.IsQuicksave = false;
		loadGame.FileName = Automation.getLastGeneratedSaveName();
		loadGame.Directory = SaveDirectories.DEFAULT;

		// Load config
		AutomationSupport.ReadUserConfigOptions();

		// Attempt to load game
		Automation.log("Attempting to load " + loadGame.FileName);
		const bResult = Network.loadGame(loadGame, ServerType.SERVER_TYPE_NONE);
		if (bResult == false) {
			Automation.log("Failed to load " + loadGame.FileName);
			Automation.sendTestComplete();
			return;
		}
		Automation.log("Load successful");
	}

	private loadGameByName(fileName: string, fileDirectory: string) {
		// Set persistent first-or-second run tracker to false
		Automation.setLocalParameter("loadGame_firstRun", false);

		// Initialize game to be loaded
		let loadGame: any = {};
		loadGame.Location = SaveLocations.LOCAL_STORAGE;
		loadGame.Type = SaveTypes.SINGLE_PLAYER;
		loadGame.IsAutosave = false;
		loadGame.IsQuicksave = false;
		loadGame.FileName = fileName ?? Automation.getLastGeneratedSaveName();
		loadGame.Directory = fileDirectory ?? SaveDirectories.DEFAULT;

		// Load config
		AutomationSupport.ReadUserConfigOptions();

		// Attempt to load game
		Automation.log("Attempting to load " + loadGame.FileName);
		const bResult = Network.loadGame(loadGame, ServerType.SERVER_TYPE_NONE);
		if (bResult == false) {
			Automation.log("Failed to load " + loadGame.FileName);
			Automation.sendTestComplete();
			return;
		}
		Automation.log("Load successful");
	}

	private onSaveComplete() {
		this.savesRemaining--;

		if (this.savesRemaining <= 0) {
			Automation.log("Save complete, starting load game sequence");
			engine.off('SaveComplete', this.saveCompleteListener);
			this.loadLastGame();
		}
		else {
			Automation.log("Saves remaining " + this.savesRemaining);
		}
	}

	private onAutoPlayEnd() {
		Automation.log("Autoplay complete");
		// Saves are not immediate, so register for completion event.

		if (!AutomationSupport.SharedGame_OnAutoPlayEnd()) {
			AutomationSupport.FailTest("");
		}
	}

	private run() {
		Automation.log("LoadGame - run()");
		// We must be at the Main Menu to do this test.
		if (UI.isInShell() == false) {
			// Exit back to the main menu, we will pick up from there.
			engine.call('exitToMainMenu');
			return;
		}

		// Check if user wants to load an existing save
		const saveName = Automation.getParameter("CurrentTest", "SaveName");
		if (saveName !== null) {
			// Set persistent first-or-second run tracker to false
			Automation.setLocalParameter("loadGame_firstRun", false);

			// Attempt to load specificed game
			const saveDirectory = Automation.getParameter("CurrentTest", "SaveDirectory");
			this.loadGameByName(saveName, saveDirectory);
			return;
		}

		// Set persistent first-or-second run tracker to true
		Automation.setLocalParameter("loadGame_firstRun", true);

		// Start a game
		Configuration.editGame()!.reset();
		// Autosave frequency must be every turn for this test
		Configuration.getUser()!.setAutoSaveFrequency(1);
		AutomationSupport.ApplyCommonNewGameParametersToConfiguration();
		AutomationSupport.ReadUserConfigOptions();
		Automation.log("Starting game");
		Network.hostGame(ServerType.SERVER_TYPE_NONE);
	}

	// Respond to the Post Game Initialization event
	// The game has been initialized (or loaded), but the app
	// side terrain generation, etc. has yet to be performed
	private postGameInitialization(_bWasLoaded: boolean) {
		Automation.log("Game initialized");
		AutomationSupport.LogCurrentPlayers();

		if (Automation.getLocalParameter("loadGame_firstRun")) {
			// Add a handler for when the autoplay ends
			engine.on('AutoplayEnded', this.autoPlayEndListener);
			engine.on('SaveComplete', this.saveCompleteListener);

			// Get the optional Turns parameter from the CurrentTest parameter set
			// If no turns are specified, we will assume that the auto-play is not active.
			// A turn count of 0 means no turn limit.
			const turnCount = Automation.getParameter("CurrentTest", "Turns");
			const observeAs = AutomationSupport.GetCurrentTestObserver();

			if (turnCount !== null) {
				Automation.log(turnCount + " Turns specified!");
				Autoplay.setTurns(turnCount);

				// amount of autosaves (turns played plus one) plus one manual save triggered from the SharedGame_OnAutoPlayEnd call
				this.savesRemaining = turnCount + 2;
			}
			else {
				Automation.log("No Turns specified!");
			}

			Autoplay.setReturnAsPlayer(0);
			Autoplay.setObserveAsPlayer(observeAs);
			Autoplay.setActive(true);
		}
	}

	// Respond to the Game Start event
	private gameStarted() {
		Automation.log("Game started");

		// Check to see if this is the second time a game has been started during this test
		// If so, we can complete the test
		if (!Automation.getLocalParameter("loadGame_firstRun")) {
			Automation.log("Load complete, completing current test.");
			AutomationSupport.PassTest("");
			return;
		}

		// Set up observer for autoplay
		const observeAs = AutomationSupport.GetCurrentTestObserver();
		Autoplay.isActive ?
			AutomationSupport.StartupObserverCamera(observeAs) :
			AutomationSupport.FailTest("");
	}

	// Respond to a Stop event
	private stop() {
		Automation.log("LoadGame test stopped");
		engine.off('AutoplayEnded', this.autoPlayEndListener);
		engine.off('SaveComplete', this.saveCompleteListener);
		Autoplay.setActive(false); // Make sure this is off
		AutomationSupport.RestoreUserConfigOptions();
	}

}

let automationLoadGameHandler = new AutomationTestLoadGame();
automationLoadGameHandler.register();

Automation.setScriptHasLoaded("automation-test-load-game");

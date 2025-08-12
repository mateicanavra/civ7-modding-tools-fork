//-----------------------------------------------------------------
// Base PlayGame Test Handler
//-----------------------------------------------------------------

console.log("loading automation-base-play-game.ts");

import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

export class AutomationBasePlayGame {

	private saveCompleteListener = () => { this.onSaveComplete(); };
	private autoplayEndListener = () => { this.onAutoplayEnd(); };
	private turnBeginListener = (data: TurnState_EventData) => { this.onTurnBegin(data); };
	private turnEndListener = (data: TurnState_EventData) => { this.onTurnEnd(data); };
	private multiplayerGameLastPlayerListener = () => { this.onMultiplayerGameLastPlayer(); };
	private updateFrameListener = (timeStamp: DOMHighResTimeStamp) => { this.OnUpdate(timeStamp); };
	private waitForSetupListener = (timeStamp: DOMHighResTimeStamp) => { this.OnWaitForSetupUpdate(timeStamp); };

	private runServerType: ServerType = ServerType.SERVER_TYPE_NONE
	private runStartRevision: number = 0;

	// CameraDrag vars
	private maxCameraDistance: number = 12;
	private direction: number = 1;
	private panSpeed: number = Configuration.getUser().cameraPanningSpeed / 10;
	private totalDistance: number = 0;
	private gameAgeEndedListener = () => { this.onGameAgeEndedListener(); };

	private onSaveComplete() {
		AutomationSupport.SharedGame_OnSaveComplete();
	}

	private onAutoplayEnd() {
		// Saves are not immediate, so register for completion event.
		engine.on('SaveComplete', this.saveCompleteListener);
		if (AutomationSupport.SharedGame_OnAutoPlayEnd()) {
			Automation.log("Autoplay complete");
			AutomationSupport.PassTest("");
		}
		else {
			AutomationSupport.FailTest("");
		}
	}

	private onTurnBegin(data: TurnState_EventData) {
		// Set force resync if we are the starting the ForceResyncTurn turn.
		const resyncTurn = Automation.getParameter("CurrentTest", "ForceResyncTurn");
		if (resyncTurn !== null) {
			let resyncTurnNumber: number = resyncTurn;
			if (resyncTurnNumber == data.turn) {
				Network.forceResync();
				Automation.log("ForceResyncTurn Turn Reached: " + data.turn);
			}
		}
	}

	protected onTurnEnd(data: TurnState_EventData) {
		// Manually decrement the turns for the current test. We have to do this because
		// the autoplay scripting and manager gets shutdown and restarted if a resync has occurred
		// (during multiplayer autoplays)  We use the updated Turns paramater when the everything 
		// is restarted so the turns count should be accurate.
		const turnCount = Automation.getParameter("CurrentTest", "Turns");
		if (turnCount !== null) {
			let turnsRemaining: number = turnCount;
			turnsRemaining -= 1;
			Automation.setParameter("CurrentTest", "Turns", turnsRemaining);

		}
		Automation.log("Turn Ended: " + data.turn);
	}

	private onMultiplayerGameLastPlayer() {
		// MultiplayerGameLastPlayer only happens in multiplayer games so we handle it like
		// a multiplayer autoplay.
		const quitParam = Automation.getParameter("CurrentTest", "QuitOnLastPlayer");
		if (quitParam == null || quitParam == 1) {
			Automation.log("Completing test due to becoming the last player.");
			AutomationSupport.PassTest("");
		}
	}

	private onGameAgeEndedListener() {
		Automation.log("Completing test as game has ended");
		AutomationSupport.PassTest("");
	}

	// Start the game
	protected run(serverType: ServerType = ServerType.SERVER_TYPE_NONE) {
		Automation.log("PlayGame - run()");
		// We must be at the Main Menu to do this test.
		if (UI.isInShell() == false) {
			// Do we want to continue?
			const resume = Automation.getParameter("CurrentTest", "Resume");
			if (resume !== null) {
				if (resume === true || resume > 0) {
					this.resumeGame();
					return;
				}
			}
			Automation.log("Not in shell, exiting to the main menu to continue");
			if (serverType !== ServerType.SERVER_TYPE_NONE) {
				Automation.setParameter("CurrentTest", "WantServerType", serverType);
			}
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
		Automation.setParameter("CurrentTest", "HasStarted", 1);

		// The next step is in OnWaitForSetupUpdate().
		// We need to wait until the game setup integration has updated.
		// We reset the game configuration and pushed in our autoplay values.
		// The game setup integration needs to catch up.
		this.runStartRevision = GameSetup.currentRevision;
		this.runServerType = serverType;
		engine.on('UpdateFrame', this.waitForSetupListener);
	}

	// Respond to a restart request.
	// This is usually sent when the the automation system transitions to the main-menu.
	// i.e. we quit the game or we got a request to play a new game, while in game.
	protected restart() {
		Automation.log("PlayGame - restart()");
		if (UI.isInShell()) {
			Automation.getParameter("CurrentTest", "HasStarted");
			const hasStarted = Automation.getParameter("CurrentTest", "HasStarted");
			if (hasStarted === null || hasStarted == 0) {
				// Try running now

				const wantServerType = Automation.getParameter("CurrentTest", "WantServerType");
				if (wantServerType !== null) {
					this.run(wantServerType);
				} else {
					this.run(wantServerType);
				}

			} else {
				AutomationSupport.PassTest("Game Ended");
				Automation.sendTestComplete("PlayGame");
			}
		}
		else {
			// Shouldn't usually get a restart request at this time, but...
			Automation.log("Resuming game");
			this.resumeGame();
		}
	}
	// Respond to the Post Game Initialization event.
	// The game has been initialized (or loaded), but the app
	// side terrain generation, etc. has yet to be performed
	protected postGameInitialization(_bWasLoaded: boolean) {
		AutomationSupport.LogCurrentPlayers();

		this.startAutoPlay();
	}

	protected startAutoPlay() {
		// Add a handler for when the autoplay ends
		engine.on('AutoplayEnded', this.autoplayEndListener);
		engine.on('TurnEnd', this.turnEndListener);
		engine.on('TurnBegin', this.turnBeginListener);
		engine.on('MultiplayerGameLastPlayer', this.multiplayerGameLastPlayerListener);
		engine.on('GameAgeEnded', this.gameAgeEndedListener);

		const CameraDragEnabled: boolean = Automation.getParameter("CurrentTest", "CameraDrag", false);
		if (CameraDragEnabled !== null && CameraDragEnabled) {
			Automation.log("Camera Drag is on");
			engine.on('UpdateFrame', this.updateFrameListener);
		}

		// Get the optional Turns parameter from the CurrentTest parameter set
		// If no turns are specified, we will assume that the auto-play is not active.
		// A turn count of 0 means no turn limit.
		const turnCount = Automation.getParameter("CurrentTest", "Turns");
		const observeAs = AutomationSupport.GetCurrentTestObserver();

		if (turnCount !== null) {
			Automation.log(turnCount + " Turns specified!");
			Autoplay.setTurns(turnCount);
		}
		else {
			Automation.log("No Turns specified!");
		}

		Autoplay.setReturnAsPlayer(0);
		Autoplay.setObserveAsPlayer(observeAs);

		Autoplay.setActive(true);
	}

	protected resumeGame() {
		Automation.log("PlayGame - resumeGame()");
		this.startAutoPlay();
		const observeAs = AutomationSupport.GetCurrentTestObserver();
		AutomationSupport.StartupObserverCamera(observeAs);
	}

	// Respond to the Game Start
	// The player will be able to see the map at this time.
	protected gameStarted() {

		Automation.log("PlayGame - gameStarted()");
		const observeAs = AutomationSupport.GetCurrentTestObserver();

		if (Autoplay.isActive) {
			// We are starting as PlayerTypes.NONE and are most likely looking at nothing in particular.
			// Look at who we are going to play.
			AutomationSupport.StartupObserverCamera(observeAs);
		} else {
			// The autoplay did not start or was turned off. This test is complete.
			AutomationSupport.FailTest("");
		}
	}

	// Stop handler for "PlayGame"
	protected stop() {
		Automation.log("PlayGame - stop()");
		// Clean up anything the test needs to.
		engine.off('AutoplayEnded', this.autoplayEndListener);
		engine.off('TurnEnd', this.turnEndListener);
		engine.off('TurnBegin', this.turnBeginListener);
		engine.off('MultiplayerGameLastPlayer', this.multiplayerGameLastPlayerListener);
		engine.off('SaveComplete', this.saveCompleteListener);
		engine.off('UpdateFrame', this.updateFrameListener);
		engine.off('GameAgeEnded', this.gameAgeEndedListener);
		engine.off('UpdateFrame', this.waitForSetupListener);

		if (typeof Autoplay != 'undefined') {		// Test this, we may get called in the front-end, where this doesn't exist
			Autoplay.setActive(false);		// Make sure this is off
		}
		AutomationSupport.RestoreUserConfigOptions();
	}

	// Frame Update function to handle camera drag
	private OnUpdate(timeDelta: DOMHighResTimeStamp) {
		this.totalDistance += (this.panSpeed * timeDelta * this.direction);

		if (this.totalDistance >= this.maxCameraDistance || this.totalDistance <= -this.maxCameraDistance) {
			// reverse panning
			this.direction *= -1;
			this.totalDistance = 0;
		}
		const panAmount: float2 = { x: this.totalDistance, y: 0 };

		Camera.panFocus(panAmount);
	}

	// Frame Update function while we wait for the game setup integration to update after changing the game configuration
	// in preparation to start an autoplay.
	private OnWaitForSetupUpdate(_timeDelta: DOMHighResTimeStamp) {
		if (GameSetup.currentRevision != this.runStartRevision) {
			engine.off('UpdateFrame', this.waitForSetupListener);

			Automation.log("Hosting game");
			Network.hostGame(this.runServerType);
		}

	}

}
//---------------------------------------------------------------------------------------------------------------------
/* 	Common framework code for "standard" automated tests.
	This uses a table called Tests along with the the automation startup parameters to drive a set of automation tests.

	The top key for the Tests table should be the name of the test with the table entries for each test that point to
	functions to run.  Each test should support the Run function and the Stop function.  There is also a GameStarted
	function.

	Please remember that if your automation test starts or load a new game, you should NOT rely on local script variables
	as the whole scripting context may get rebuilt if DLC/Mods are activated/deactivated.
	Use the Automation parameter containers which are store on the C++ side.
*/
//---------------------------------------------------------------------------------------------------------------------

console.log("loading automation-test-support.ts");

export function SharedGame_OnSaveComplete() {
	// Signal that the test is complete.
	Automation.log("Save complete. Completing current test.");
	Automation.sendTestComplete("SaveComplete");
}

//-----------------------------------------------------------------
// Handle the autoplay end for the "PlayGame" and "HostGame" tests
//-----------------------------------------------------------------
export function SharedGame_OnAutoPlayEnd(): boolean {
	Automation.log("The autoplay manager has deactivated. (See autoplay.log) Saving game prior to completing current test. ");

	let saveGame: any = {};
	saveGame.FileName = Automation.generateSaveName();
	saveGame.Location = SaveLocations.LOCAL_STORAGE;
	saveGame.LocationCategories = SaveLocationCategories.NORMAL;
	saveGame.Type = SaveTypes.SINGLE_PLAYER;
	saveGame.ContentType = SaveFileTypes.GAME_STATE;

	return Network.saveGame(saveGame);
}

//-----------------------------------------------------------------
// Look at a player's captial
//-----------------------------------------------------------------
export function LookAtCapital(ePlayer: PlayerId): boolean {
	if (ePlayer !== -1) {
		const pPlayer = Players.get(ePlayer);
		if (pPlayer) {
			// Look at their capital
			const pPlayerCities = pPlayer.Cities;
			if (pPlayerCities) {
				const pCapital = pPlayerCities.getCapital();
				if (pCapital) {
					const loc: float2 = pCapital.location;
					Camera.lookAtPlot(loc, { zoom: 1.0 });
					return true;
				}
			}
		}
	}
	return false;
}

//-----------------------------------------------------------------
// Get the observer for the current test
//-----------------------------------------------------------------
export function GetCurrentTestObserver() {

	let observeAs = PlayerIds.NO_PLAYER;
	const param = Automation.getParameter("CurrentTest", "ObserveAs", 0);
	if (param === "OBSERVER") {
		observeAs = PlayerIds.OBSERVER_ID;
	}
	else if (param === "NONE") {
		observeAs = PlayerIds.NO_PLAYER;
	}
	else if (param >= 0 && param <= Players.maxPlayers) {
		if (Players.isAlive(param)) {
			observeAs = param;
		}
		else {
			observeAs = PlayerIds.OBSERVER_ID;
		}
	}

	return observeAs;
}

//-----------------------------------------------------------------
// Move the camera to something the observer can see.
//-----------------------------------------------------------------
export function StartupObserverCamera(observeAs: PlayerId) {

	let eLookAtPlayer = observeAs;
	if (eLookAtPlayer >= PlayerIds.OBSERVER_ID) {
		eLookAtPlayer = 0;
	}

	if (Players.isValid(eLookAtPlayer)) {
		let bFound = LookAtCapital(eLookAtPlayer);

		// Else look at one of their units
		if (!bFound) {
			const pPlayer = Players.get(eLookAtPlayer);
			if (pPlayer) {
				const pPlayerUnits = pPlayer.Units;
				if (pPlayerUnits) {
					for (const pUnit of pPlayerUnits.getUnits()) {
						if (pUnit.isDead == false) {
							Camera.lookAtPlot(pUnit.location, { zoom: 1.0 });
							bFound = true;
							break;
						}
					}
				}
			}
		}
	}
}

//-----------------------------------------------------------------
// Log the current players
//-----------------------------------------------------------------
export function LogCurrentPlayers() {
	Automation.log("Players:");
	const aPlayers = Players.getAliveIds();
	for (let playerId of aPlayers) {
		const pPlayerConfig = Configuration.getPlayer(playerId);

		if (pPlayerConfig !== null) {
			let szName: string | null = pPlayerConfig.civilizationName;
			if (!szName || szName === null || szName.length == 0) {
				szName = pPlayerConfig.civilizationTypeName;
			}
			if (!szName || szName === null || szName.length == 0) {
				szName = "${pPlayerConfig.civilizationTypeID}";
			}

			Automation.log(playerId.toString() + ":" + szName);
		}
	}
}

//-----------------------------------------------------------------
export function GetTrueOrFalse(value: any) {
	if (value !== null) {
		if (typeof value === 'string') {
			const asString = value.toUpperCase();
			if (asString == "FALSE") {
				return false;
			} else if (asString == "TRUE") {
				return true;
			}
		} else if (typeof value === 'number') {
			if (value >= 0) {
				return true;
			}
		} else if (typeof value === 'boolean') {
			return value;
		}
	}
	return false;
}

//-----------------------------------------------------------------
export function GetFloatParam(paramName: string, defaultValue: number = 0.0): number {
	return parseFloat(Automation.getParameter("CurrentTest", paramName, defaultValue))
}

//-----------------------------------------------------------------
export function GetFloat3Param(paramX: string, paramY: string, paramZ: string, defaultValue: float3 = { x: 0, y: 0, z: 0 }): float3 {
	return {
		x: GetFloatParam(paramX, defaultValue.x),
		y: GetFloatParam(paramY, defaultValue.y),
		z: GetFloatParam(paramZ, defaultValue.z)
	};
}

//-----------------------------------------------------------------
export function ReadUserConfigOptions() {

	const quickMoves = Automation.getParameter("CurrentTest", "QuickMovement");
	if (quickMoves !== null) {
		Configuration.getUser().setLockedValue("QuickMovement", GetTrueOrFalse(quickMoves));
	}

	const quickCombat = Automation.getParameter("CurrentTest", "QuickCombat");
	if (quickCombat !== null) {
		Configuration.getUser().setLockedValue("QuickCombat", GetTrueOrFalse(quickCombat));
	}
}

//-----------------------------------------------------------------
export function RestoreUserConfigOptions() {

	Configuration.getUser().lockValue("QuickMovement", false);
	Configuration.getUser().lockValue("QuickCombat", false);
}

//-----------------------------------------------------------------
export function UpdatePlayerCounts() {

	let defaultPlayers: number | null = null;
	// Do we have GameInfo?
	if (typeof GameInfo != 'undefined') {
		if (GameInfo.Maps != null) {
			const mapSize = Configuration.getMap().mapSize;
			const def = GameInfo.Maps.lookup(mapSize);
			if (def) {
				defaultPlayers = def.DefaultPlayers;
			}
		}
	}
	else {
		// Check the front-end database
		const mapSizeTypeName = Configuration.getMap().mapSizeTypeName;
		if (mapSizeTypeName != null) {
			const q = Database.query('config', 'SELECT DefaultPlayers from MapSizes where MapSizeType=?', Configuration.getMap().mapSizeTypeName);
			if (q && q.length > 0 && q[0].DefaultPlayers != null) {
				if (typeof q[0].DefaultPlayers == 'number') {
					defaultPlayers = q[0].DefaultPlayers;
				}
			}
			else {
				Automation.log(`Could not find ${Configuration.getMap().mapSizeTypeName} in config database`);
			}
		}
		else {
			Automation.log(`MapSizeType is not defined in the configuration`);
		}
	}

	if (defaultPlayers !== null) {
		Automation.log(`Setting players to ${defaultPlayers}`);
		Configuration.editMap()!.setMaxMajorPlayers(defaultPlayers);
		Configuration.editGame()!.setParticipatingPlayerCount(defaultPlayers + Configuration.getGame().hiddenPlayerCount);
	}
}

//-----------------------------------------------------------------
export function GetTestLobbyType() {
	let lobbyType: number = LobbyTypes.LOBBY_LAN;
	const mpLobbyTypeParam: string = Automation.getParameter("CurrentTest", "MPLobbyType");
	if (mpLobbyTypeParam !== null) {
		const paramLobbyType: number = Network.lobbyTypeFromNamedLobbyType(mpLobbyTypeParam);
		if (paramLobbyType !== LobbyTypes.LOBBY_NONE) {
			lobbyType = paramLobbyType;
		}
	}
	return lobbyType;
}

//-----------------------------------------------------------------
export function GetTestServerType() {
	let serverType: number = ServerType.SERVER_TYPE_LAN;
	const mpLobbyTypeParam: string = Automation.getParameter("CurrentTest", "MPLobbyType");
	if (mpLobbyTypeParam !== null) {
		const paramServerType: number = Network.serverTypeFromNamedLobbyType(mpLobbyTypeParam);
		if (paramServerType !== ServerType.SERVER_TYPE_NONE) {
			serverType = paramServerType;
		}
	}
	return serverType;
}

//-----------------------------------------------------------------
export function ApplyHumanPlayersToConfiguration() {
	const humanPlayerCount = Automation.getParameter("CurrentTest", "HumanPlayers");

	// Convert any human slots to AI
	if (humanPlayerCount === null || humanPlayerCount == 0) {
		const aHumanIDs = Configuration.getGame().humanPlayerIDs;

		for (let id of aHumanIDs) {
			const playerConfig = Configuration.editPlayer(id)!;
			playerConfig.setSlotStatus(SlotStatus.SS_COMPUTER);
		}
	} else {
		let neededHumanPlayers = humanPlayerCount - Configuration.getGame().humanPlayerCount;

		if (neededHumanPlayers > 0) {
			const aAvailableIDs = Configuration.getGame().availablePlayerIDs;

			for (let id of aAvailableIDs) {
				const playerConfig = Configuration.editPlayer(id)!;
				playerConfig.setSlotStatus(SlotStatus.SS_TAKEN);
				neededHumanPlayers = neededHumanPlayers - 1;

				if (neededHumanPlayers == 0) {
					break;
				}
			}
		}

		// Still need human players? Take them from the AI slots
		if (neededHumanPlayers > 0) {
			const aAIIDs = Configuration.getGame().aiPlayerIDs;

			for (let id of aAIIDs) {
				const playerConfig = Configuration.editPlayer(id)!;

				if (playerConfig.civilizationLevelTypeID == CivilizationLevelTypes.CIVILIZATION_LEVEL_FULL_CIV) {
					playerConfig.setSlotStatus(SlotStatus.SS_TAKEN);
					neededHumanPlayers = neededHumanPlayers - 1;

					if (neededHumanPlayers == 0) {
						break;
					}
				}
			}
		}
	}
}

//-----------------------------------------------------------------
export function ConfigurePlayers() {
	const game = Configuration.getGame();

	for (let id of game.inUsePlayerIDs) {
		const playerConfig = Configuration.editPlayer(id)!;

		// Set player civilization, if applicable
		const playerCiv = Automation.getParameter("CurrentTest", "Player" + id + "Civ");

		if (playerCiv !== null) {
			Automation.log("Player " + id + " Civ: " + playerCiv);
			playerConfig.setCivilizationTypeName(playerCiv);
		}

		// Set player leader, if applicable
		const playerLeader = Automation.getParameter("CurrentTest", "Player" + id + "Leader");

		if (playerLeader !== null) {
			Automation.log("Player " + id + " Leader: " + playerLeader);
			playerConfig.setLeaderTypeName(playerLeader);
		}
	}
}

//-----------------------------------------------------------------
export function ApplyCommonNewGameParametersToConfiguration() {
	// Did they specify a ruleset?
	const ruleSet = Automation.getParameter("CurrentTest", "RuleSet");

	if (ruleSet !== null) {
		Automation.log("Ruleset: " + ruleSet);
		Configuration.editGame()!.setRuleSet(ruleSet);
	}

	// Did they have a map script?
	const mapScript = Automation.getParameter("CurrentTest", "MapScript");

	if (mapScript !== null) {
		Automation.log("MapScript: " + mapScript);
		Configuration.editMap()!.setScript(mapScript);
		UpdatePlayerCounts();
	}

	// Did they have a map size?
	const mapSize = Automation.getParameter("CurrentTest", "MapSize");

	if (mapSize !== null) {
		Automation.log("MapSize: " + mapSize);
		Configuration.editMap()!.setMapSize(mapSize);
		UpdatePlayerCounts();
	}

	// Update the human counts.  Make sure this is after the MapScript and MapSize, that changes counts.
	ApplyHumanPlayersToConfiguration();

	ConfigurePlayers();

	// Did they have a handicap/difficulty level?
	let difficulty = Automation.getParameter("CurrentTest", "Difficulty");

	if (difficulty === null) {
		difficulty = Automation.getParameter("CurrentTest", "Handicap");		// Letting them use an alias
	}

	if (difficulty !== null) {
		Automation.log("Difficulty: " + difficulty);
		Configuration.editGame()!.setDifficultyType(difficulty);
	}

	// Did they have a game speed?
	const gameSpeed = Automation.getParameter("CurrentTest", "GameSpeed");

	if (gameSpeed !== null) {
		Automation.log("GameSpeed: " + gameSpeed);
		Configuration.editGame()!.setGameSpeedType(gameSpeed);
	}

	// Did they have a map seed?
	const mapSeed = Automation.getParameter("CurrentTest", "MapSeed");

	if (mapSeed !== null) {
		Configuration.editMap()!.setMapSeed(mapSeed);
	}

	// Or a Game Seed?
	const gameSeed = Automation.getParameter("CurrentTest", "GameSeed");

	if (gameSeed !== null) {
		Configuration.editGame()!.setGameSeed(gameSeed);
	}

	// Or a Start Age?
	const gameStartAge = Automation.getParameter("CurrentTest", "StartAge");

	if (gameStartAge !== null) {
		Automation.log("StartAge: " + gameStartAge);
		Configuration.editGame()!.setStartAgeType(gameStartAge);
	}

	// Or Age Transitions disabled?
	const singleAge = Automation.getParameter("CurrentTest", "SingleAge");
	if (singleAge !== null) {
		Automation.log("SingleAge: " + (singleAge ? "true" : "false"));
		Configuration.editGame()!.setSingleAge(singleAge);
	}

	// Or Max Turns?  This is Max turns for a Score victory, not the number of turns for the test.
	const maxTurns = Automation.getParameter("CurrentTest", "MaxTurns");

	if (maxTurns !== null && maxTurns >= 1) {
		Configuration.editGame()!.setMaxTurns(maxTurns);
		Configuration.editGame()!.setTurnLimitType(TurnLimitType.TURNLIMIT_CUSTOM);
	}

	// Or Max Players?
	const participatingPlayers = Automation.getParameter("CurrentTest", "ParticipatingPlayers");
	if (participatingPlayers !== null && participatingPlayers >= 2) {
		Configuration.editGame()!.setParticipatingPlayerCount(participatingPlayers);
	}

	const gameName = Automation.getParameter("CurrentTest", "GameName");

	if (gameName !== null) {
		Configuration.editGame()!.setGameName(gameName.toString())
	}

	const maxPlayers = 64;	// Players.maxPlayers, however Players isn't available here 
	for (let i = 0; i <= maxPlayers; ++i) {
		const playerCiv = Automation.getParameter("CurrentTest", "Player" + i + "Civ");
		if (playerCiv !== null) {
			Configuration.editPlayer(i)!.setCivilizationTypeName(playerCiv);
		}

		const playerLeader = Automation.getParameter("CurrentTest", "Player" + i + "Leader");
		if (playerLeader !== null) {
			Configuration.editPlayer(i)!.setLeaderTypeName(playerLeader);
		}
	}

	Automation.log("Finished applying new game parameters to configuration");
	// KWG: Need to add the 'parsed' parameter code here.
}

//-----------------------------------------------------------------
export function PassTest(message: string = "") {
	engine.trigger("AutomationTestPassed", message);
}

//-----------------------------------------------------------------
export function FailTest(message: string = "") {
	engine.trigger("AutomationTestFailed", message);
}

//-----------------------------------------------------------------
export function Shared_OnAutomationEvent(args: any) {
	if (args && args == "LoopChild") {
		Automation.setLocalParameter("isCurrentTestLoop", true);
	} else {
		Automation.setLocalParameter("isCurrentTestLoop", false);
	}
}

//-----------------------------------------------------------------
// Test Quiting the Application
//-----------------------------------------------------------------
class AutomationQuitApp {

	private automationTestQuitAppListener = (command: string) => { this.onAutomationEvent(command); }

	register() {
		engine.on('Automation-Test-QuitApp', this.automationTestQuitAppListener);
	}

	private onAutomationEvent(command: string) {
		if (command === 'Run') {
			this.run();
		}
	}

	private run() {
		Automation.log("Running QuitApp");
		// Just set a flag, the common code will do the actual quitting.
		Automation.setLocalParameter("QuitApp", true);
		Automation.sendTestComplete("QuitApp");
	}
}

let automationQuitAppHandler = new AutomationQuitApp();
automationQuitAppHandler.register();

//-----------------------------------------------------------------
// Test Quiting the Game
//-----------------------------------------------------------------
class AutomationQuitGame {

	private automationTestQuitGameListener = (command: string, option?: string) => { this.onAutomationEvent(command, option); }

	register() {
		engine.on('Automation-Test-QuitGame', this.automationTestQuitGameListener);
	}

	private onAutomationEvent(command: string, option?: string) {

		if (command === 'Run') {
			this.run(option);
		}
	}

	private run(option?: string) {

		if (option !== null && option === "Restart") {
			Automation.log("Resuming QuitGame");
		}
		else {
			Automation.log("Running QuitGame");
		}

		if (UI.isInGame()) {
			// Exit back to the main menu
			Automation.log("Actually Quiting");
			engine.call('exitToMainMenu');
			// Note, we do not say the test is over, we wait for when we get called again, with the 'Restart' request
		}
		else {
			Automation.log("QuitGame complete");
			Automation.sendTestComplete("QuitGame");
		}
	}
}

let automationQuitGameHandler = new AutomationQuitGame();
automationQuitGameHandler.register();

//-----------------------------------------------------------------
// Loop tests
//-----------------------------------------------------------------
class AutomationTestLoopTests {

	private automationTestLoopTestsListener = (command: string) => { this.onAutomationEvent(command); }

	register() {
		engine.on('Automation-Test-LoopTests', this.automationTestLoopTestsListener);
	}

	private getLoopIndex() {
		return Automation.getLocalParameter("loopIndex", 0)
	}

	private getIndexWithinLoop() {
		return Automation.getLocalParameter("indexWithinLoop", 0)
	}

	private getHasFinishedLoop() {
		return Automation.getLocalParameter("hasFinishedLoop", false)
	}

	private onAutomationEvent(command: string) {
		const triggerName = "Automation-Test-" + Automation.getParameter("CurrentTest", "Test");
		if (command === 'Run') {
			this.run();
		} else {
			engine.trigger(triggerName, command, "LoopChild");
		}
	}

	private run() {
		if (this.getHasFinishedLoop()) {
			Automation.setLocalParameter("hasFinishedLoop", false);
			Automation.setLocalParameter("isCurrentTestLoop", false);
			Automation.log("Completed loop!")
			engine.off('Automation-Test-LoopTests', this.automationTestLoopTestsListener);
			Automation.sendTestComplete("LoopTests");
		} else {
			const testsToLoop: [] = Automation.getParameter("CurrentTest", "Tests");
			const numIterations = Automation.getParameter("CurrentTest", "Count");
			let testObject = testsToLoop[this.getIndexWithinLoop()]

			Automation.clearParameterSet("CurrentTest");
			if (typeof testObject === 'object') {
				if (testObject) {
					Automation.setParameterSet("CurrentTest", <Object>testObject);
				}
			}
			else {
				if (typeof testObject === 'string') {
					Automation.setParameter("CurrentTest", "Test", testObject);
				}
			}

			let curTestName = Automation.getParameter("CurrentTest", "Test");
			const triggerName = "Automation-Test-" + curTestName;

			Automation.log("Loop " + this.getLoopIndex() + " Test " + this.getIndexWithinLoop());
			Automation.log("Looping " + numIterations + " Times!");
			Automation.logDivider();
			Automation.log("Running Test: " + curTestName);

			if ((this.getIndexWithinLoop() + 1) >= testsToLoop.length) {
				Automation.setLocalParameter("indexWithinLoop", 0)
				Automation.setLocalParameter("loopIndex", this.getLoopIndex() + 1)
			} else {
				Automation.setLocalParameter("indexWithinLoop", this.getIndexWithinLoop() + 1)
			}
			if (this.getLoopIndex() >= numIterations) {
				Automation.setLocalParameter("hasFinishedLoop", true)
			}
			engine.trigger(triggerName, "Run", "LoopChild");
		}
	}
}

let automationLoopTestsHandler = new AutomationTestLoopTests();
automationLoopTestsHandler.register();

//-----------------------------------------------------------------
// Pause the Game
//-----------------------------------------------------------------
class AutomationPauseGame {

	private automationTestPauseGameListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }
	private waitForListener = () => { this.onWaitFor(); }
	private waitForListenerHandle: EventHandle | null = null;
	private unpauseListener = () => { this.onUnpause(); }
	private onUnpauseListenerHandle: EventHandle | null = null;

	register() {
		engine.on('Automation-Test-PauseGame', this.automationTestPauseGameListener);
	}

	private onAutomationEvent(command: string, ...args: any) {
		Shared_OnAutomationEvent(args);

		if (command === 'Run') {
			this.run();
		} else if (command == 'Stop') {
			this.stop();
		}
	}

	private run() {
		if (UI.isInShell()) {
			// We are in the front end, nothing to pause so say we are complete
			Automation.sendTestComplete("PauseGame");
			return;
		}

		this.clearListeners();
		let pauseOptions: any = {};

		// Time to pause is handled by the automation system
		const pauseTime = Automation.getParameter("CurrentTest", "Time", 0);
		if (pauseTime !== null) {
			Automation.log("Time: " + pauseTime.toString());
			pauseOptions.time = pauseTime;
		}

		Automation.pause(true, pauseOptions);
		this.onUnpauseListenerHandle = engine.on('AutomationUnpaused', this.unpauseListener);

		// We are going to handle unpausing on an event in script.
		const waitForEvent = Automation.getParameter("CurrentTest", "WaitForEvent");
		if (waitForEvent !== null) {
			if (typeof waitForEvent === 'string') {
				Automation.log("WaitForEvent: " + waitForEvent);
				this.waitForListenerHandle = engine.on(waitForEvent, this.waitForListener);
			}
		}
	}

	private stop() {
		this.clearListeners();
	}

	private onWaitFor() {

		this.clearListeners();
		if (Automation.isActive && Automation.isPaused == true) {
			Automation.pause(false);
			Automation.sendTestComplete("PauseGame");
		}

	}

	private onUnpause() {
		// Our timer hit or something else unpaused, clear the listeners.
		this.clearListeners();
		Automation.sendTestComplete("PauseGame");
	}

	private clearListeners() {
		this.waitForListenerHandle?.clear();
		this.onUnpauseListenerHandle?.clear();
	}
}

let automationPauseGameHandler = new AutomationPauseGame();
automationPauseGameHandler.register();

//-----------------------------------------------------------------
// End the tests.  This will simply stop the automation, 
// leaving the game in its current state.
//-----------------------------------------------------------------
class AutomationEnd {

	private automationTestEndListener = (command: string) => { this.onAutomationEvent(command); }

	register() {
		engine.on('Automation-Test-End', this.automationTestEndListener);
	}

	private onAutomationEvent(command: string) {
		if (command === 'Run') {
			this.run();
		}
	}

	private run() {
		Automation.setActive(false);
	}
}

let automationEndHandler = new AutomationEnd();
automationEndHandler.register();

//-----------------------------------------------------------------
// The Automation Test Manager (script side)
// This coordinates with the C++ Automation manager to
// drive the automation tests.
// NOTE: Since the automation 'state' has to survive the script
// system getting unloaded/re-configured, etc., most of the state
// of the automation is kept on the C++ side in sets of parameters
// that can be easily transferred back and forth between script and C++
//-----------------------------------------------------------------
class AutomationTestManager {

	private automationRunTestListener = (option: string) => { this.onAutomationRunTest(option); }
	private automationStopTestListener = () => { this.onAutomationStopTest(); }
	private automationGameStartedListener = () => { this.onAutomationGameStarted(); }
	private automationPostGameInitializationListener = (bWasLoad: boolean) => { this.onAutomationPostGameInitialization(bWasLoad); }
	private automationCompleteListener = () => { this.onAutomationComplete(); }
	private automationTestCompleteListener = () => { this.onAutomationTestComplete(); }
	private automationTestPassedListener = (message: string) => { this.onAutomationTestPassed(message); }
	private automationTestFailedListener = (message: string) => { this.onAutomationTestFailed(message); }
	private automationStartListener = () => { this.onAutomationStart(); }
	private automationMainMenuStartedListener = () => { this.onAutomationMainMenuStarted(); }
	private automationAppInitCompleteListener = () => { this.onAutomationAppInitComplete(); }

	constructor() {
		Automation.log("AutomationTestManager created");
	}

	register() {
		engine.on('AutomationRunTest', this.automationRunTestListener);
		engine.on('AutomationStopTest', this.automationStopTestListener);
		engine.on('AutomationGameStarted', this.automationGameStartedListener);
		engine.on('AutomationPostGameInitialization', this.automationPostGameInitializationListener);
		engine.on('AutomationComplete', this.automationCompleteListener);
		engine.on('AutomationTestComplete', this.automationTestCompleteListener);
		engine.on('AutomationTestPassed', this.automationTestPassedListener);
		engine.on('AutomationTestFailed', this.automationTestFailedListener);
		engine.on('AutomationStart', this.automationStartListener);
		engine.on('AutomationMainMenuStarted', this.automationMainMenuStartedListener);
		engine.on('AutomationAppInitComplete', this.automationAppInitCompleteListener);
	}

	getTests(): any[] | null {
		// Get the list of test the caller requested to be performed
		const aTests = Automation.getStartupParameter("Tests");
		return aTests;
	}

	// Get the currently running test for logs
	getCurrentTestDisplayName(): string | null {
		if (Automation.getLocalParameter("isCurrentTestLoop", false)) {
			return Automation.getParameter("CurrentTest", "Test");
		} else {
			return this.getCurrentTestName();
		}
	}

	// Get the current test name
	getCurrentTestName(): string | null {
		// Get the list of test the caller requested to be performed
		const aTests = this.getTests();
		if (aTests) {
			// Get our local index from the Automation system.  We can't store in script variabled because of context swaps.
			const testIndex = Automation.getLocalParameter("TestIndex", 0);

			if (testIndex < aTests.length) {
				const testParams = aTests[testIndex];

				if (typeof testParams === 'object') {
					if (testParams) {
						return (<any>testParams).Test;
					}
				}
				else {
					if (typeof testParams === 'string') {
						return testParams;
					}
				}
			}
		}
		else {
			Automation.log("No tests found.");
		}

		return null;
	}

	// Put the parameters for the current test into the "CurrentTest" parameter set on the C++ side
	storeCurrentTestParameters() {
		// Get the list of test the caller requested to be performed
		const aTests = this.getTests();
		if (aTests) {
			// Get our local index from the Automation system.
			const testIndex = Automation.getLocalParameter("TestIndex", 1);

			if (testIndex < aTests.length) {
				Automation.clearParameterSet("CurrentTest");
				const testParams = aTests[testIndex];

				if (typeof testParams === 'object') {
					if (testParams) {
						Automation.setParameterSet("CurrentTest", <Object>testParams);
					}
				}
				else {
					if (typeof testParams === 'string') {
						Automation.setParameter("CurrentTest", "Test", testParams);
					}
				}
			}
		}
	}

	// Send a Run to the current test, or send a AutomationComplete event if there are no more tests 
	onAutomationRunTest(option: string | null) {

		const name = this.getCurrentTestName();
		if (name !== null) {
			if (option === null || option !== "Restart") {
				Automation.logDivider();
				this.storeCurrentTestParameters();
				Automation.log("Running Test: " + name);
			}
			const triggerName = "Automation-Test-" + name;
			engine.trigger(triggerName, "Run", option);
		} else {
			engine.trigger("AutomationComplete");
		}
	}

	// Send a Stop event to the current test
	onAutomationStopTest() {
		Automation.log("Test stopped");
		const name = this.getCurrentTestName();
		if (name !== null) {
			const triggerName = "Automation-Test-" + name;
			engine.trigger(triggerName, "Stop");
		}
	}

	// Send the current test the GameStarted event.
	onAutomationGameStarted() {
		const name = this.getCurrentTestName();
		if (name !== null) {
			const triggerName = "Automation-Test-" + name;
			engine.trigger(triggerName, "GameStarted");
		}
	}

	// Send current test a PostGameInitialization event.
	onAutomationPostGameInitialization(bWasLoad: boolean) {
		const name = this.getCurrentTestName();
		if (name !== null) {
			const triggerName = "Automation-Test-" + name;
			engine.trigger(triggerName, "PostGameInitialization", bWasLoad);
		}
	}

	// Handle the AutomationComplete event.
	onAutomationComplete() {
		Automation.log("Handling AutomationComplete event");
		Automation.setActive(false);

		if (Automation.getLocalParameter("QuitApp", false) == true) {
			// Quit the application
			engine.call('exitToDesktop');
		} else {
			if (UI.isInGame()) {
				engine.call('exitToMainMenu');
			}
		}
	}

	// Handle the AutomationTestComplete event
	onAutomationTestComplete() {
		Automation.log("Test complete");
		// Tell the test to stop, just in case the event was not triggered by the test itself.
		this.onAutomationStopTest();

		// Get our local index from the Automation system.
		const testIndex = Automation.getLocalParameter("TestIndex", 1);

		// If we are not currently within a loop, increment test index
		if (!Automation.getLocalParameter("isCurrentTestLoop", false)) {
			Automation.setLocalParameter("TestIndex", testIndex + 1);
		}
		engine.trigger('AutomationRunTest');
	}

	// Handle the AutomationTestPAssed event
	onAutomationTestPassed(message: string) {
		// Log that the test passed
		Automation.log("[PASS] " + this.getCurrentTestDisplayName() + ". " + message);
		// Mark the test as complete
		this.onAutomationTestComplete();
	}

	// Handle the AutomationTestFailed event
	onAutomationTestFailed(message: string) {
		// Log an error that the test failed
		Automation.log("[FAIL] " + this.getCurrentTestDisplayName() + ". " + message);
		// Mark the test as complete
		this.onAutomationTestComplete();
	}

	// Handle the request for automation to start
	onAutomationStart() {
		Automation.log("Handling AutomationStart event");
		engine.trigger('AutomationRunTest');
	}

	// The main menu has started, start any automation.
	onAutomationMainMenuStarted() {
		Automation.log("Handling AutomationMainMenuStarted");
		// Check our local parameter so that we don't try and re-start automation if
		// is has already been started.
		const bStarted = Automation.getLocalParameter("AutomationStarted", false);
		if (!bStarted) {
			// Start the automation tests
			Automation.setLocalParameter("AutomationStarted", true);
			engine.trigger('AutomationStart');
		} else {
			// Run the current test
			engine.trigger('AutomationRunTest', 'Restart');
		}
	}

	onAutomationAppInitComplete() {
		Automation.log("Handling AutomationAppInitComplete");

		const name = this.getCurrentTestName();
		if (name !== null) {
			const triggerName = "Automation-Test-" + name;
			engine.trigger(triggerName, "AppInitComplete");
		}
	}
}

let automationTestManager = new AutomationTestManager();
automationTestManager.register();

Automation.setScriptHasLoaded("automation-test-support");

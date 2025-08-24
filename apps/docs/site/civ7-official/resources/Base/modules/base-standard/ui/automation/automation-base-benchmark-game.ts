//-----------------------------------------------------------------
// Base BenchmarkGame Test Handler
//-----------------------------------------------------------------

console.log("loading automation-base-benchmark-game.ts");

import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

import ViewManager from '/core/ui/views/view-manager.js';

export class AutomationBaseBenchmarkGame {

	private autoplayEndListener = () => { this.onAutoplayEnd(); };

	private benchmarkCooledListener = (data: BenchCooledData) => { this.onBenchmarkCooled(data); };
	private benchmarkEndedListener = (data: BenchEndedData) => { this.onBenchmarkEnded(data); };
	private benchmarkSwappedListener = (data: BenchSwappedData) => { this.onBenchmarkSwapped(data); };
	private benchmarkTerminatedListener = (data: BenchTerminatedData) => { this.onBenchmarkTerminated(data); };
	private benchmarkWarmedListener = (data: BenchWarmedData) => { this.onBenchmarkWarmed(data); };

	protected observer = -1

	protected constructor(protected testName: string) { }

	private onAutoplayEnd() {
		// Should not exit game if the benchmark completes
		// TODO handle automation ending early?
	}

	/**
	 * @param fileName The filename without an extension
	 */
	protected run(fileName: string) {
		Automation.log(`${this.testName} - run()`);
		// We must be at the Main Menu to do this test.
		if (UI.isInShell() == false) {
			Automation.log("Not in shell, exiting to the main menu to continue");
			// Exit back to the main menu, we will pick up from there.
			engine.call('exitToMainMenu');
			return;
		}

		const includeFileExtension: boolean = Automation.getParameter("CurrentTest", "FileExtension", false);
		if (includeFileExtension) {
			fileName += ".Civ7Save";
		}

		let loadParams: any = {};

		loadParams.Location = SaveLocations.LOCAL_STORAGE;
		loadParams.Type = SaveTypes.SINGLE_PLAYER;
		loadParams.IsAutosave = false;
		loadParams.IsQuicksave = false;
		loadParams.Directory = SaveDirectories.APP_BENCHMARK;
		loadParams.FileName = fileName

		AutomationSupport.ReadUserConfigOptions();

		// Hardcode quick movement and combat so we can test processing more than the animations
		Configuration.getUser().setLockedValue("QuickMovement", true);
		Configuration.getUser().setLockedValue("QuickCombat", true);

		Automation.log("Loading configuration with file '" + fileName + "'");
		const bResult = Network.loadGame(loadParams, ServerType.SERVER_TYPE_NONE);
		if (bResult == false) {
			Automation.log("Failed to load " + loadParams.FileName);
			AutomationSupport.FailTest("");
			return
		}

		Automation.log("Starting game");
	}

	// Respond to a restart request.
	// This is usually sent when the the automation system transitions to the main-menu.
	// i.e. we quit the game.  We just want to say that our test is complete, and move on
	protected restart() {
		Automation.log("BenchmarkGame - restart()");
		if (UI.isInShell()) {
			AutomationSupport.PassTest("Game Ended");
			Automation.sendTestComplete(this.testName);
		}
	}

	// Respond to the Post Game Initialization event.
	// The game has been initialized (or loaded), but the app
	// side terrain generation, etc. has yet to be performed
	protected postGameInitialization(_bWasLoaded: boolean) {
		engine.on('AutoplayEnded', this.autoplayEndListener);

		engine.on('BenchEnded', this.benchmarkEndedListener);
		engine.on('BenchCooled', this.benchmarkCooledListener);
		engine.on('BenchSwapped', this.benchmarkSwappedListener);
		engine.on('BenchTerminated', this.benchmarkTerminatedListener);
		engine.on('BenchWarmed', this.benchmarkWarmedListener);

		// All benchmarking should disable saving so that they don't overwrite auto-saves and introduce new ones.
		//	We process this after the save is loaded so that the value stored within the save is stomped, letting us
		//	use any autoplay save file as a benchmark save
		Configuration.editGame()!.setSaveDisabled(true)

		this.observer = AutomationSupport.GetCurrentTestObserver();
	}

	// Once we get the go ahead to start the game we can make the request to start benchmarking
	protected gameStarted(startParameters: GameBenchmarkStartParameters) {
		Automation.log("BenchmarkGame - gameStarted()");

		Benchmark.Game.start(startParameters);

		// All benchmarking modes should prevent game interaction
		// TODO: Disable all input except for the benchmarking related UI
		ViewManager.isWorldInputAllowed = false;
	}

	protected stop() {
		Automation.log("BenchmarkGame - stop()");

		engine.off('AutoplayEnded', this.autoplayEndListener);

		engine.off('BenchEnded', this.benchmarkEndedListener);
		engine.off('BenchCooled', this.benchmarkCooledListener);
		engine.off('BenchSwapped', this.benchmarkSwappedListener);
		engine.off('BenchTerminated', this.benchmarkTerminatedListener);
		engine.off('BenchWarmed', this.benchmarkWarmedListener);

		AutomationSupport.RestoreUserConfigOptions();

		if (typeof Autoplay != 'undefined') { // Test this, we may get called in the front-end, where this doesn't exist
			Autoplay.setActive(false); // Ensure Autoplay is disabled
			Autoplay.setPause(false);
		}
	}

	// TODO: Receive final statistics
	private onBenchmarkEnded(_data: BenchEndedData) {
		// Send a message that automation is done so that it can be cleaned up at a safe time

		// TODO: Move this to UI Action
		//AutomationSupport.PassTest("Benchmark Ended");
	}

	private onBenchmarkCooled(_data: BenchCooledData) {

	}

	private onBenchmarkSwapped(_data: BenchSwappedData) {

	}

	private onBenchmarkTerminated(_data: BenchTerminatedData) {

	}

	private onBenchmarkWarmed(_data: BenchWarmedData) {

	}
}
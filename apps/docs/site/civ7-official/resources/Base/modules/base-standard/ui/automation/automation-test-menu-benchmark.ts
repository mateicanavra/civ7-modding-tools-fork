//----------------------------------------------------------------
// MenuBenchmark test handler
//----------------------------------------------------------------

console.log("loading automation-test-menu-benchmark.ts");

import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestMenuBenchmark {

	private automationTestMenuBenchmarkListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }

	private benchmarkStartedListener = (data: BenchStartedData) => { this.onBenchmarkStarted(data); };
	private benchmarkCooledListener = (data: BenchCooledData) => { this.onBenchmarkCooled(data); };
	private benchmarkUpdatedListener = (data: BenchUpdatedData) => { this.onBenchmarkUpdated(data); };
	private benchmarkEndedListener = (data: BenchEndedData) => { this.onBenchmarkEnded(data); };
	private benchmarkSwappedListener = (data: BenchSwappedData) => { this.onBenchmarkSwapped(data); };
	private benchmarkTerminatedListener = (data: BenchTerminatedData) => { this.onBenchmarkTerminated(data); };
	private benchmarkWarmedListener = (data: BenchWarmedData) => { this.onBenchmarkWarmed(data); };

	register() {
		engine.on('Automation-Test-MenuBenchmark', this.automationTestMenuBenchmarkListener);
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		Automation.log("Processing Event: " + command);

		// Forward the event on to the handler.
		if (command === 'AppInitComplete') {
			this.initialize();
		}
		else if (command === 'Run') {
			this.run();
		} else if (command == 'Stop') {
			this.stop();
		}
	}

	private initialize() {
		Automation.log("Initializing Benchmark");

		// We must be at the Main Menu to do this test.
		if (UI.isInShell() == false) {

			Automation.log("Not in shell, exiting to the main menu to continue");

			// Exit back to the main menu, we will pick up from there.
			engine.call('exitToMainMenu');
			return;
		}

		Benchmark.Menu.initialize()

		Automation.log("Finished Initializing");
	}

	private run() {
		// Register the state hooks needed
		engine.on('BenchStarted', this.benchmarkStartedListener);
		engine.on('BenchEnded', this.benchmarkEndedListener);
		engine.on('BenchUpdated', this.benchmarkUpdatedListener);
		engine.on('BenchCooled', this.benchmarkCooledListener);
		engine.on('BenchSwapped', this.benchmarkSwappedListener);
		engine.on('BenchTerminated', this.benchmarkTerminatedListener);
		engine.on('BenchWarmed', this.benchmarkWarmedListener);

		const categoryName: string | null = Automation.getParameter("CurrentTest", "Category");
		const arrangementName: string | null = Automation.getParameter("CurrentTest", "Arrangement");
		const time: number = Automation.getParameter("CurrentTest", "Time", 10.0);

		Automation.log("Test Inputs - Category: " + categoryName + ", Arrangement: " + arrangementName + ", Time: " + time);

		if (categoryName !== null && arrangementName !== null) {

			const category: CategoryType = CategoryType[categoryName as keyof typeof CategoryType]
			const arrangement: ArrangementType = ArrangementType[arrangementName as keyof typeof ArrangementType]

			Benchmark.Menu.start({ category, arrangement, time })

			Automation.log("Requesting Start for " + categoryName + " with " + arrangementName + " arrangement");
		}
		else {
			AutomationSupport.FailTest("No benchmarking Category given.");
		}
	}

	private stop() {
		Automation.log("Stopping Benchmark");

		Benchmark.Menu.cancel()

		engine.off('BenchStarted', this.benchmarkStartedListener);
		engine.off('BenchEnded', this.benchmarkEndedListener);
		engine.off('BenchUpdated', this.benchmarkUpdatedListener);
		engine.off('BenchCooled', this.benchmarkCooledListener);
		engine.off('BenchSwapped', this.benchmarkSwappedListener);
		engine.off('BenchTerminated', this.benchmarkTerminatedListener);
		engine.off('BenchWarmed', this.benchmarkWarmedListener);
	}

	private onBenchmarkStarted(data: BenchStartedData) {

		const information = JSON.stringify(data)
		Automation.log("Benchmark Information: " + information);

	}

	private onBenchmarkEnded(_data: BenchEndedData) {
		AutomationSupport.PassTest("Benchmark Ended");
	}

	private onBenchmarkUpdated(_data: BenchUpdatedData) {
	}

	private onBenchmarkCooled(data: BenchCooledData) {

		const information = JSON.stringify(data)
		Automation.log("Benched an asset: " + information);

	}

	private onBenchmarkSwapped(_data: BenchSwappedData) {
	}

	private onBenchmarkTerminated(_data: BenchTerminatedData) {
	}

	private onBenchmarkWarmed(_data: BenchWarmedData) {
	}

}

let automationTestMenuBenchmarkHandler = new AutomationTestMenuBenchmark();
automationTestMenuBenchmarkHandler.register();

Automation.setScriptHasLoaded("automation-test-menu-benchmark");


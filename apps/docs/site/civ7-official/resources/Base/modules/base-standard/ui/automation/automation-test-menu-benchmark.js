//----------------------------------------------------------------
// MenuBenchmark test handler
//----------------------------------------------------------------
console.log("loading automation-test-menu-benchmark.ts");
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
class AutomationTestMenuBenchmark {
    constructor() {
        this.automationTestMenuBenchmarkListener = (command, ...args) => { this.onAutomationEvent(command, args); };
        this.benchmarkStartedListener = (data) => { this.onBenchmarkStarted(data); };
        this.benchmarkCooledListener = (data) => { this.onBenchmarkCooled(data); };
        this.benchmarkUpdatedListener = (data) => { this.onBenchmarkUpdated(data); };
        this.benchmarkEndedListener = (data) => { this.onBenchmarkEnded(data); };
        this.benchmarkSwappedListener = (data) => { this.onBenchmarkSwapped(data); };
        this.benchmarkTerminatedListener = (data) => { this.onBenchmarkTerminated(data); };
        this.benchmarkWarmedListener = (data) => { this.onBenchmarkWarmed(data); };
    }
    register() {
        engine.on('Automation-Test-MenuBenchmark', this.automationTestMenuBenchmarkListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        Automation.log("Processing Event: " + command);
        // Forward the event on to the handler.
        if (command === 'AppInitComplete') {
            this.initialize();
        }
        else if (command === 'Run') {
            this.run();
        }
        else if (command == 'Stop') {
            this.stop();
        }
    }
    initialize() {
        Automation.log("Initializing Benchmark");
        // We must be at the Main Menu to do this test.
        if (UI.isInShell() == false) {
            Automation.log("Not in shell, exiting to the main menu to continue");
            // Exit back to the main menu, we will pick up from there.
            engine.call('exitToMainMenu');
            return;
        }
        Benchmark.Menu.initialize();
        Automation.log("Finished Initializing");
    }
    run() {
        // Register the state hooks needed
        engine.on('BenchStarted', this.benchmarkStartedListener);
        engine.on('BenchEnded', this.benchmarkEndedListener);
        engine.on('BenchUpdated', this.benchmarkUpdatedListener);
        engine.on('BenchCooled', this.benchmarkCooledListener);
        engine.on('BenchSwapped', this.benchmarkSwappedListener);
        engine.on('BenchTerminated', this.benchmarkTerminatedListener);
        engine.on('BenchWarmed', this.benchmarkWarmedListener);
        const categoryName = Automation.getParameter("CurrentTest", "Category");
        const arrangementName = Automation.getParameter("CurrentTest", "Arrangement");
        const time = Automation.getParameter("CurrentTest", "Time", 10.0);
        Automation.log("Test Inputs - Category: " + categoryName + ", Arrangement: " + arrangementName + ", Time: " + time);
        if (categoryName !== null && arrangementName !== null) {
            const category = CategoryType[categoryName];
            const arrangement = ArrangementType[arrangementName];
            Benchmark.Menu.start({ category, arrangement, time });
            Automation.log("Requesting Start for " + categoryName + " with " + arrangementName + " arrangement");
        }
        else {
            AutomationSupport.FailTest("No benchmarking Category given.");
        }
    }
    stop() {
        Automation.log("Stopping Benchmark");
        Benchmark.Menu.cancel();
        engine.off('BenchStarted', this.benchmarkStartedListener);
        engine.off('BenchEnded', this.benchmarkEndedListener);
        engine.off('BenchUpdated', this.benchmarkUpdatedListener);
        engine.off('BenchCooled', this.benchmarkCooledListener);
        engine.off('BenchSwapped', this.benchmarkSwappedListener);
        engine.off('BenchTerminated', this.benchmarkTerminatedListener);
        engine.off('BenchWarmed', this.benchmarkWarmedListener);
    }
    onBenchmarkStarted(data) {
        const information = JSON.stringify(data);
        Automation.log("Benchmark Information: " + information);
    }
    onBenchmarkEnded(_data) {
        AutomationSupport.PassTest("Benchmark Ended");
    }
    onBenchmarkUpdated(_data) {
    }
    onBenchmarkCooled(data) {
        const information = JSON.stringify(data);
        Automation.log("Benched an asset: " + information);
    }
    onBenchmarkSwapped(_data) {
    }
    onBenchmarkTerminated(_data) {
    }
    onBenchmarkWarmed(_data) {
    }
}
let automationTestMenuBenchmarkHandler = new AutomationTestMenuBenchmark();
automationTestMenuBenchmarkHandler.register();
Automation.setScriptHasLoaded("automation-test-menu-benchmark");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-menu-benchmark.js.map

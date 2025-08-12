//----------------------------------------------------------------
// BenchmarkAI test handler
//----------------------------------------------------------------
console.log("loading automation-test-benchmark-ai.ts");
import { AutomationBaseBenchmarkGame } from '/base-standard/ui/automation/automation-base-benchmark-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
class AutomationTestBenchmarkAI extends AutomationBaseBenchmarkGame {
    constructor() {
        super("BenchmarkGameAI");
        this.automationTestBenchmarkAIListener = (command, ...args) => { this.onAutomationEvent(command, args); };
        this.benchmarkStartedListener = (data) => { this.onBenchmarkStarted(data); };
        this.benchmarkUpdatedListener = (data) => { this.onBenchmarkUpdated(data); };
        this.TURN_TARGET = 10;
        this.turnCount = 0;
    }
    register() {
        engine.on(`Automation-Test-${this.testName}`, this.automationTestBenchmarkAIListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        // Forward the event on to the handler.
        if (command === 'Run') {
            if (args !== null && args.length > 0 && args[0] == 'Restart') {
                this.restart();
            }
            else {
                this.run("AIBenchmark");
            }
        }
        else if (command == 'PostGameInitialization') {
            engine.on('BenchStarted', this.benchmarkStartedListener);
            engine.on('BenchUpdated', this.benchmarkUpdatedListener);
            this.postGameInitialization(args);
            // AI benchmark uses autoplay, activate it, but pause until the benchmark starts
            Autoplay.setTurns(this.TURN_TARGET);
            Autoplay.setReturnAsPlayer(GameContext.localPlayerID);
            Autoplay.setObserveAsPlayer(GameContext.localPlayerID);
            Autoplay.setActive(true);
            Autoplay.setPause(true);
        }
        else if (command == 'GameStarted') {
            AutomationSupport.StartupObserverCamera(this.observer);
            const startParameters = {
                type: GameBenchmarkType.AI,
                time: 0,
                delay: 5
            };
            this.gameStarted(startParameters);
        }
        else if (command == 'Stop') {
            engine.off('BenchUpdated', this.benchmarkUpdatedListener);
            engine.off('BenchStarted', this.benchmarkStartedListener);
            this.stop();
        }
    }
    onBenchmarkStarted(_data) {
        // Start the AI after the requested benchmarking delay
        Autoplay.setPause(false);
    }
    onBenchmarkUpdated(_data) {
        // We started the benchmark with an AI request and will receive per-turn timings whenever a turn ends
        this.turnCount++;
        if (this.turnCount >= this.TURN_TARGET) {
            Benchmark.Game.cancel();
        }
        // We can ignore the quantile data, as it provides estimates that are unhelpful with low sample counts
    }
}
let automationTestBenchmarkAIHandler = new AutomationTestBenchmarkAI();
automationTestBenchmarkAIHandler.register();
Automation.setScriptHasLoaded("automation-test-benchmark-ai");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-benchmark-ai.js.map

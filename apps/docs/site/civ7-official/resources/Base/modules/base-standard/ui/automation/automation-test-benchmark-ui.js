//----------------------------------------------------------------
// BenchmarkUI test handler
//----------------------------------------------------------------
console.log("loading automation-test-benchmark-ui.ts");
import { AutomationBaseBenchmarkGame } from '/base-standard/ui/automation/automation-base-benchmark-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
class AutomationTestBenchmarkUI extends AutomationBaseBenchmarkGame {
    constructor() {
        super("BenchmarkGameUI");
        this.automationTestBenchmarkUIListener = (command, ...args) => { this.onAutomationEvent(command, args); };
        this.updateFrameListener = (timeStamp) => { this.OnUpdate(timeStamp); };
        this.benchmarkStartedListener = (data) => { this.onBenchmarkStarted(data); };
        this.FOCUS_DURATION = 1.0;
        this.totalTime = 0.0;
        this.focusTime = -this.FOCUS_DURATION;
        this.started = false; // set to true after the delay
        this.opened = false;
    }
    register() {
        engine.on(`Automation-Test-${this.testName}`, this.automationTestBenchmarkUIListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        // Forward the event on to the handler.
        if (command === 'Run') {
            if (args !== null && args.length > 0 && args[0] == 'Restart') {
                this.restart();
            }
            else {
                this.run("UIBenchmark");
            }
        }
        else if (command == 'PostGameInitialization') {
            engine.on('UpdateFrame', this.updateFrameListener);
            engine.on('BenchStarted', this.benchmarkStartedListener);
            this.postGameInitialization(args);
            Autoplay.setReturnAsPlayer(GameContext.localPlayerID);
            Autoplay.setObserveAsPlayer(GameContext.localObserverID);
            Autoplay.setActive(true);
            Autoplay.setPause(true);
        }
        else if (command == 'GameStarted') {
            const startParameters = {
                type: GameBenchmarkType.UI,
                time: 60,
                delay: 5
            };
            this.gameStarted(startParameters);
            this.started = false; // not actually started until delay is done
        }
        else if (command == 'Stop') {
            engine.off('BenchStarted', this.benchmarkStartedListener);
            engine.off('UpdateFrame', this.updateFrameListener);
            this.stop();
        }
    }
    onBenchmarkStarted(_data) {
        AutomationSupport.StartupObserverCamera(this.observer);
        this.started = true;
        // TODO: List of screens to integrate
        // screen-civilopedia
        // screen-culture-tree
        // screen-culture-tree-chooser
        // screen-pause-menu
        // screen-attribute-trees
        // screen-policies
        // player-yields-report-screen
        // screen-attribute-trees
        // screen-tech-tree-chooser
        // screen-government-picker
        // screen-resource-allocation
        // screen-pantheon-chooser
        // screen-espionage-details
        // screen-victory-progress
        // screen-unlocks
        // screen-great-works
        // screen-city-state-bonus-chooser
    }
    OnUpdate(timeDelta) {
        // Don't do anything until the benchmark is fully started
        if (!Benchmark.Game.isRunning() || !this.started) {
            return;
        }
        this.totalTime += timeDelta;
        if (this.totalTime - this.focusTime > this.FOCUS_DURATION) {
            this.focusTime += this.FOCUS_DURATION;
            const className = "screen-civilopedia";
            if (this.opened) {
                engine.trigger(`close-${className}`);
            }
            else {
                engine.trigger(`open-${className}`);
            }
            this.opened = !this.opened;
        }
    }
}
let automationTestBenchmarkUIHandler = new AutomationTestBenchmarkUI();
automationTestBenchmarkUIHandler.register();
Automation.setScriptHasLoaded("automation-test-benchmark-ui");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-benchmark-ui.js.map

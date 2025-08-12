//----------------------------------------------------------------
// BenchmarkUI test handler
//----------------------------------------------------------------

console.log("loading automation-test-benchmark-ui.ts");

import { AutomationBaseBenchmarkGame } from '/base-standard/ui/automation/automation-base-benchmark-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestBenchmarkUI extends AutomationBaseBenchmarkGame {

	private automationTestBenchmarkUIListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }
	private updateFrameListener = (timeStamp: DOMHighResTimeStamp) => { this.OnUpdate(timeStamp); };
	private benchmarkStartedListener = (data: BenchStartedData) => { this.onBenchmarkStarted(data); };

	private FOCUS_DURATION = 1.0;
	private totalTime: number = 0.0
	private focusTime: number = -this.FOCUS_DURATION;
	private started: boolean = false; // set to true after the delay

	private opened: boolean = false;

	constructor() {
		super("BenchmarkGameUI")
	}

	register() {
		engine.on(`Automation-Test-${this.testName}`, this.automationTestBenchmarkUIListener);
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		// Forward the event on to the handler.
		if (command === 'Run') {
			if (args !== null && args.length > 0 && args[0] == 'Restart') {
				this.restart();
			} else {
				this.run("UIBenchmark");
			}
		} else if (command == 'PostGameInitialization') {
			engine.on('UpdateFrame', this.updateFrameListener);
			engine.on('BenchStarted', this.benchmarkStartedListener);

			this.postGameInitialization(args)

			Autoplay.setReturnAsPlayer(GameContext.localPlayerID);
			Autoplay.setObserveAsPlayer(GameContext.localObserverID);
			Autoplay.setActive(true);
			Autoplay.setPause(true);

		} else if (command == 'GameStarted') {
			const startParameters: GameBenchmarkStartParameters =
			{
				type: GameBenchmarkType.UI,
				time: 60,
				delay: 5
			};
			this.gameStarted(startParameters);
			this.started = false; // not actually started until delay is done
		} else if (command == 'Stop') {
			engine.off('BenchStarted', this.benchmarkStartedListener);
			engine.off('UpdateFrame', this.updateFrameListener);
			this.stop();
		}
	}

	private onBenchmarkStarted(_data: BenchStartedData) {
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

	private OnUpdate(timeDelta: DOMHighResTimeStamp) {
		// Don't do anything until the benchmark is fully started
		if (!Benchmark.Game.isRunning() || !this.started) {
			return;
		}

		this.totalTime += timeDelta;

		if (this.totalTime - this.focusTime > this.FOCUS_DURATION) {
			this.focusTime += this.FOCUS_DURATION;

			const className = "screen-civilopedia";
			if (this.opened) {
				engine.trigger(`close-${className}`)
			}
			else {
				engine.trigger(`open-${className}`)
			}

			this.opened = !this.opened;
		}
	}
}

let automationTestBenchmarkUIHandler = new AutomationTestBenchmarkUI();
automationTestBenchmarkUIHandler.register();

Automation.setScriptHasLoaded("automation-test-benchmark-ui");


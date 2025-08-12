//----------------------------------------------------------------
// BenchmarkAI test handler
//----------------------------------------------------------------

console.log("loading automation-test-benchmark-ai.ts");

import { AutomationBaseBenchmarkGame } from '/base-standard/ui/automation/automation-base-benchmark-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';

class AutomationTestBenchmarkAI extends AutomationBaseBenchmarkGame {

	private automationTestBenchmarkAIListener = (command: string, ...args: any) => { this.onAutomationEvent(command, args); }

	private benchmarkStartedListener = (data: BenchStartedData) => { this.onBenchmarkStarted(data); };
	private benchmarkUpdatedListener = (data: BenchUpdatedData) => { this.onBenchmarkUpdated(data); };

	private TURN_TARGET = 10
	private turnCount = 0

	constructor() {
		super("BenchmarkGameAI")
	}

	register() {
		engine.on(`Automation-Test-${this.testName}`, this.automationTestBenchmarkAIListener);
	}

	private onAutomationEvent(command: string, ...args: any) {
		AutomationSupport.Shared_OnAutomationEvent(args);

		// Forward the event on to the handler.
		if (command === 'Run') {
			if (args !== null && args.length > 0 && args[0] == 'Restart') {
				this.restart();
			} else {
				this.run("AIBenchmark");
			}
		} else if (command == 'PostGameInitialization') {
			engine.on('BenchStarted', this.benchmarkStartedListener);
			engine.on('BenchUpdated', this.benchmarkUpdatedListener);

			this.postGameInitialization(args)

			// AI benchmark uses autoplay, activate it, but pause until the benchmark starts
			Autoplay.setTurns(this.TURN_TARGET);
			Autoplay.setReturnAsPlayer(GameContext.localPlayerID);
			Autoplay.setObserveAsPlayer(GameContext.localPlayerID);
			Autoplay.setActive(true);
			Autoplay.setPause(true);
		} else if (command == 'GameStarted') {
			AutomationSupport.StartupObserverCamera(this.observer);

			const startParameters: GameBenchmarkStartParameters =
			{
				type: GameBenchmarkType.AI,
				time: 0, // 0 will run almost forever, and we must manually cancel the benchmark
				delay: 5
			};

			this.gameStarted(startParameters);
		} else if (command == 'Stop') {
			engine.off('BenchUpdated', this.benchmarkUpdatedListener);
			engine.off('BenchStarted', this.benchmarkStartedListener);
			this.stop();
		}
	}

	private onBenchmarkStarted(_data: BenchStartedData) {
		// Start the AI after the requested benchmarking delay
		Autoplay.setPause(false);
	}

	private onBenchmarkUpdated(_data: BenchUpdatedData) {
		// We started the benchmark with an AI request and will receive per-turn timings whenever a turn ends
		this.turnCount++

		if (this.turnCount >= this.TURN_TARGET) {
			Benchmark.Game.cancel()
		}

		// We can ignore the quantile data, as it provides estimates that are unhelpful with low sample counts

	}

}

let automationTestBenchmarkAIHandler = new AutomationTestBenchmarkAI();
automationTestBenchmarkAIHandler.register();

Automation.setScriptHasLoaded("automation-test-benchmark-ai");


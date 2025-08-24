//----------------------------------------------------------------
// BenchmarkGraphics test handler
//----------------------------------------------------------------
console.log("loading automation-test-benchmark-graphics.ts");
import { AutomationBaseBenchmarkGame } from '/base-standard/ui/automation/automation-base-benchmark-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
import ViewManager from '/core/ui/views/view-manager.js';
var States;
(function (States) {
    States[States["NONE"] = 0] = "NONE";
    States[States["LOOK_AT"] = 1] = "LOOK_AT";
    States[States["CINEMATIC"] = 2] = "CINEMATIC";
})(States || (States = {}));
;
class AutomationTestBenchmarkGraphics extends AutomationBaseBenchmarkGame {
    constructor() {
        super("BenchmarkGameGraphics");
        this.automationTestBenchmarkGraphicsListener = (command, ...args) => { this.onAutomationEvent(command, args); };
        this.updateFrameListener = (timeStamp) => { this.OnUpdate(timeStamp); };
        this.benchmarkStartedListener = (data) => { this.onBenchmarkStarted(data); };
        this.FOCUS_DURATION = 2.0;
        this.CINEMATIC_DURATION = 12.0;
        this.FOCUS_HEIGHT = 10;
        this.CAMERA_HEIGHT = 30;
        this.DYNAMIC_CAMERA_PARAMS = {
            focusHeight: this.FOCUS_HEIGHT,
            cameraHeight: this.CAMERA_HEIGHT,
            duration: this.CINEMATIC_DURATION,
            easeInFactor: 1.25,
            easeOutFactor: 2.0
        };
        this.totalTime = 0.0;
        this.started = false; // set to true after the delay
        this.cities = [];
        this.currentState = States.NONE;
        this.useStaticCamera = false;
        this.plotCoord = { x: 0, y: 0 };
    }
    register() {
        engine.on(`Automation-Test-${this.testName}`, this.automationTestBenchmarkGraphicsListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        // Forward the event on to the handler.
        if (command === 'Run') {
            if (args !== null && args.length > 0 && args[0] == 'Restart') {
                this.restart();
            }
            else {
                this.run("GraphicsBenchmark");
            }
        }
        else if (command == 'PostGameInitialization') {
            this.useStaticCamera = Automation.getParameter("CurrentTest", "StaticCamera", false);
            engine.on('UpdateFrame', this.updateFrameListener);
            engine.on('BenchStarted', this.benchmarkStartedListener);
            this.postGameInitialization(args);
        }
        else if (command == 'GameStarted') {
            const startParameters = {
                type: GameBenchmarkType.GRAPHICS,
                time: 45,
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
    SelectNextPlot() {
        // NOTE: rng must choose the same sequence every time the benchmark is run
        // Only use Benchmark random functions, which use a fixed seed when the benchmark starts
        // Try looking at a capital city, may not succeed and thats ok
        if (this.cities.length > 0) {
            const selection = Benchmark.Game.randomRange(0, this.cities.length - 1);
            this.plotCoord = this.cities[selection];
            // remove the selected element, without preserving order
            this.cities[selection] = this.cities[this.cities.length - 1];
            this.cities.pop();
        }
        // No cities left, go to a random plot
        if (!this.plotCoord) {
            const Y_PADDING = 5; // Avoid the the edges of the map
            const gridWidth = GameplayMap.getGridWidth();
            const gridHeight = GameplayMap.getGridHeight();
            let x = Benchmark.Game.randomRange(0, gridWidth - 1);
            let y = Benchmark.Game.randomRange(Y_PADDING, gridHeight - Y_PADDING - 1);
            this.plotCoord = { x, y };
        }
    }
    onBenchmarkStarted(_data) {
        this.started = true;
        // Add all major cities
        const MIN_POPULATION = 5;
        this.cities = [];
        const players = Players.getAlive();
        for (const player of players) {
            if (player && player.isMajor) {
                const playerCities = player.Cities;
                if (playerCities) {
                    const cities = playerCities.getCities();
                    for (const city of cities) {
                        if (!city.isTown && city.population >= MIN_POPULATION) {
                            this.cities.push(city.location);
                        }
                    }
                }
            }
        }
        this.SelectNextPlot();
    }
    OnUpdate(timeDelta) {
        // Don't do anything until the benchmark is fully started
        if (!Benchmark.Game.isRunning() || !this.started) {
            return;
        }
        if (this.useStaticCamera) {
            return;
        }
        this.totalTime += timeDelta;
        //If doing a look at, wait for that to finish
        if (this.currentState === States.LOOK_AT) {
            if (this.totalTime > this.FOCUS_DURATION) {
                this.totalTime -= this.FOCUS_DURATION;
                this.currentState = States.NONE;
                //Do a cinematic camera some of the time
                if (Benchmark.Game.randomRange(0, 2) == 0) {
                    this.currentState = States.CINEMATIC;
                    Camera.pushDynamicCamera(this.plotCoord, this.DYNAMIC_CAMERA_PARAMS);
                    ViewManager.setCurrentByName('Cinematic');
                }
            }
        }
        //If we are doing a cinematic camera, finish that event 
        if (this.currentState === States.CINEMATIC) {
            if (this.totalTime > this.CINEMATIC_DURATION) {
                this.totalTime -= this.CINEMATIC_DURATION;
                this.currentState = States.NONE;
                Camera.popCamera();
                ViewManager.setCurrentByName('World');
            }
        }
        // If we are not in a state already, then do a look at to the next plot.
        if (this.currentState === States.NONE) {
            this.SelectNextPlot();
            Camera.lookAtPlot(this.plotCoord);
            this.currentState = States.LOOK_AT;
        }
    }
}
let automationTestBenchmarkGraphicsHandler = new AutomationTestBenchmarkGraphics();
automationTestBenchmarkGraphicsHandler.register();
Automation.setScriptHasLoaded("automation-test-benchmark-graphics");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-benchmark-graphics.js.map

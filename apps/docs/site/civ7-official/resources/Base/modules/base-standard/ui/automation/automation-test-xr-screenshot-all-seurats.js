//----------------------------------------------------------------
// XRScreenshotAllSeurats test handler
//
// mostly plagiarised from automation-test-xr-teleport-zones.ts
//----------------------------------------------------------------
console.log("automation-test-xr-screenshot-all-seurats.ts");
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
var XRScreenshotAllSeuratsScene;
(function (XRScreenshotAllSeuratsScene) {
    XRScreenshotAllSeuratsScene[XRScreenshotAllSeuratsScene["MainMenu"] = 0] = "MainMenu";
    XRScreenshotAllSeuratsScene[XRScreenshotAllSeuratsScene["Gameplay"] = 1] = "Gameplay";
    //Diplomacy,
})(XRScreenshotAllSeuratsScene || (XRScreenshotAllSeuratsScene = {}));
var XRScreenshotAllSeuratsMenuState;
(function (XRScreenshotAllSeuratsMenuState) {
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["Initialising"] = 0] = "Initialising";
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["Teleporting"] = 1] = "Teleporting";
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["FreezingView"] = 2] = "FreezingView";
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["Screenshotting"] = 3] = "Screenshotting";
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["UnFreezingView"] = 4] = "UnFreezingView";
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["Deciding"] = 5] = "Deciding";
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["Moving"] = 6] = "Moving";
    XRScreenshotAllSeuratsMenuState[XRScreenshotAllSeuratsMenuState["Complete"] = 7] = "Complete";
})(XRScreenshotAllSeuratsMenuState || (XRScreenshotAllSeuratsMenuState = {}));
var XRScreenshotAllSeuratsGameplayState;
(function (XRScreenshotAllSeuratsGameplayState) {
    XRScreenshotAllSeuratsGameplayState[XRScreenshotAllSeuratsGameplayState["GameNotLoaded"] = 0] = "GameNotLoaded";
    XRScreenshotAllSeuratsGameplayState[XRScreenshotAllSeuratsGameplayState["GameLoaded"] = 1] = "GameLoaded";
    XRScreenshotAllSeuratsGameplayState[XRScreenshotAllSeuratsGameplayState["ChangingVista"] = 2] = "ChangingVista";
    XRScreenshotAllSeuratsGameplayState[XRScreenshotAllSeuratsGameplayState["FreezingView"] = 3] = "FreezingView";
    XRScreenshotAllSeuratsGameplayState[XRScreenshotAllSeuratsGameplayState["Screenshotting"] = 4] = "Screenshotting";
    XRScreenshotAllSeuratsGameplayState[XRScreenshotAllSeuratsGameplayState["UnFreezingView"] = 5] = "UnFreezingView";
    XRScreenshotAllSeuratsGameplayState[XRScreenshotAllSeuratsGameplayState["Complete"] = 6] = "Complete";
})(XRScreenshotAllSeuratsGameplayState || (XRScreenshotAllSeuratsGameplayState = {}));
var XRScreenshotAllSeuratsCivilisations;
(function (XRScreenshotAllSeuratsCivilisations) {
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["AKSUM"] = 0] = "AKSUM";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["EGYPT"] = 1] = "EGYPT";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["GREECE"] = 2] = "GREECE";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["HAN"] = 3] = "HAN";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["KHMER"] = 4] = "KHMER";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["MAURYA"] = 5] = "MAURYA";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["MAYA"] = 6] = "MAYA";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["MISSISSIPPIAN"] = 7] = "MISSISSIPPIAN";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["PERSIA"] = 8] = "PERSIA";
    XRScreenshotAllSeuratsCivilisations[XRScreenshotAllSeuratsCivilisations["ROME"] = 9] = "ROME";
})(XRScreenshotAllSeuratsCivilisations || (XRScreenshotAllSeuratsCivilisations = {}));
var XRScreenshotAllSeuratsPopulations;
(function (XRScreenshotAllSeuratsPopulations) {
    XRScreenshotAllSeuratsPopulations[XRScreenshotAllSeuratsPopulations["Low"] = 0] = "Low";
    XRScreenshotAllSeuratsPopulations[XRScreenshotAllSeuratsPopulations["Medium"] = 1] = "Medium";
    XRScreenshotAllSeuratsPopulations[XRScreenshotAllSeuratsPopulations["High"] = 2] = "High";
})(XRScreenshotAllSeuratsPopulations || (XRScreenshotAllSeuratsPopulations = {}));
export class AutomationTestXRScreenshotAllSeurats {
    constructor() {
        this.sceneIndex = 0;
        this.sceneState = XRScreenshotAllSeuratsScene.MainMenu;
        this.menuZoneIndex = 0;
        this.menuZones = new Array;
        this.menuState = XRScreenshotAllSeuratsMenuState.Initialising;
        this.gameplaySeuratIndex = 0;
        this.gameplaySeuratPopulation = XRScreenshotAllSeuratsPopulations.Low;
        this.gameplayState = XRScreenshotAllSeuratsGameplayState.GameNotLoaded;
        this.orientationIndex = 0;
        this.orientations = [
            { x: 0, y: -90, z: -90 },
            { x: 90, y: -90, z: -90 },
            { x: -90, y: -90, z: -90 },
            { x: 180, y: -90, z: -90 },
            { x: 0, y: 0, z: -90 },
            { x: 0, y: -180, z: -90 } // Ceiling
        ];
        this.pauseTimeAny = 0.5;
        this.pauseTimeStartDelay = 1.0;
        this.pauseTimeTeleport = 0.5;
        this.pauseTimeFreeze = 0.15;
        this.pauseTimeTakeScreenshot = 0.15;
        this.pauseTimeGameplayTurnModal = 5.0;
        this.pauseTimeChangeVista = 0.2;
        this.automationTestXRScreenshotAllSeuratsListener = (command, ...args) => {
            this.onAutomationEvent(command, args);
        };
    }
    register() {
        engine.on('Automation-Test-XRScreenshotAllSeurats', this.automationTestXRScreenshotAllSeuratsListener, this);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        // Forward the event on to the handler.
        if (command == 'AppInitComplete') {
            this.run();
        }
        else if (command == 'PostGameInitialization') {
            // Basicly need to reconfigure the test state, as it was reloaded during game load.
            engine.on('AutomationUnpaused', this.onUnpaused, this);
            this.sceneState = XRScreenshotAllSeuratsScene.Gameplay;
            this.gameplayState = XRScreenshotAllSeuratsGameplayState.GameLoaded;
            this.pause(this.pauseTimeStartDelay); // wait for the 'Turn 1' modal to time out.
        }
        else if (command == 'Stop') {
            this.stop();
        }
    }
    run() {
        engine.on('AutomationUnpaused', this.onUnpaused, this);
        this.initialise();
        this.pause(this.pauseTimeStartDelay);
    }
    initialise() {
        Automation.log("Initializing");
        // Get all Zones
        Automation.log("Main Menu Zone Names:");
        // Hardcode the first one because we start in it and arent aware of self.
        let startingZone = "PLY_Zone_Menu_Center";
        Automation.log(startingZone);
        this.menuZones.push(startingZone);
        let teleportZoneCount = XR.World.getZoneCount();
        for (let i = 0; i < teleportZoneCount; i++) {
            let zoneName = XR.World.getZoneNameByIndex(i);
            Automation.log(zoneName);
            this.menuZones.push(zoneName);
        }
        this.menuState = XRScreenshotAllSeuratsMenuState.FreezingView;
    }
    onUnpaused() {
        switch (this.sceneState) {
            case XRScreenshotAllSeuratsScene.MainMenu:
                {
                    this.updateMainMenu();
                    break;
                }
            case XRScreenshotAllSeuratsScene.Gameplay:
                {
                    this.updateGameplay();
                    break;
                }
        }
    }
    updateMainMenu() {
        switch (this.menuState) {
            case XRScreenshotAllSeuratsMenuState.Teleporting:
                {
                    this.teleportToNextLocation();
                    this.pause(this.pauseTimeTeleport);
                    this.menuState = XRScreenshotAllSeuratsMenuState.FreezingView;
                    break;
                }
            case XRScreenshotAllSeuratsMenuState.FreezingView:
                {
                    Automation.log("Orienting: " + this.orientationIndex);
                    this.applyOrientationIndex();
                    this.incrementOrientationIndex();
                    this.pause(this.pauseTimeFreeze);
                    this.menuState = XRScreenshotAllSeuratsMenuState.Screenshotting;
                    break;
                }
            case XRScreenshotAllSeuratsMenuState.Screenshotting:
                {
                    Automation.log("Taking Screenshot");
                    XR.World.takeScreenshot();
                    this.pause(this.pauseTimeTakeScreenshot);
                    this.menuState = XRScreenshotAllSeuratsMenuState.UnFreezingView;
                    break;
                }
            case XRScreenshotAllSeuratsMenuState.UnFreezingView:
                {
                    Automation.log("UnFreezing");
                    XR.FireTuner.unfreezeView();
                    this.pause(this.pauseTimeFreeze);
                    this.menuState = XRScreenshotAllSeuratsMenuState.Deciding;
                    break;
                }
            case XRScreenshotAllSeuratsMenuState.Deciding:
                {
                    Automation.log("Deciding what to do next");
                    if (this.orientationIndex < 6) {
                        Automation.log("Next Orientation: " + this.orientationIndex);
                        this.menuState = XRScreenshotAllSeuratsMenuState.FreezingView;
                    }
                    else {
                        Automation.log("Next Position");
                        this.orientationIndex = 0;
                        this.menuZoneIndex += 1;
                        if (this.menuZoneIndex < 5) {
                            this.menuState = XRScreenshotAllSeuratsMenuState.Teleporting;
                        }
                        else {
                            Automation.log("No positions left - We're done!");
                            this.menuState = XRScreenshotAllSeuratsMenuState.Complete;
                        }
                    }
                    this.pause(this.pauseTimeAny);
                    break;
                }
            case XRScreenshotAllSeuratsMenuState.Complete:
                {
                    XR.World.teleportToZone(this.menuZones[0]); // teleport home.
                    this.sceneState = XRScreenshotAllSeuratsScene.Gameplay;
                    this.pause(this.pauseTimeAny);
                    break;
                }
        }
    }
    updateGameplay() {
        switch (this.gameplayState) {
            case XRScreenshotAllSeuratsGameplayState.GameNotLoaded:
                {
                    // Start a game loading
                    Configuration.editGame().reset();
                    AutomationSupport.ApplyCommonNewGameParametersToConfiguration();
                    AutomationSupport.ReadUserConfigOptions();
                    Automation.log("Starting game..");
                    let serverType = ServerType.SERVER_TYPE_NONE;
                    Network.hostGame(serverType);
                    // We unsubscribe here because this script is about to get reloaded during game load.
                    engine.off('AutomationUnpause', this.onUnpaused, this);
                    break;
                }
            case XRScreenshotAllSeuratsGameplayState.GameLoaded:
                {
                    this.pause(this.pauseTimeGameplayTurnModal);
                    this.gameplayState = XRScreenshotAllSeuratsGameplayState.ChangingVista;
                    break;
                }
            case XRScreenshotAllSeuratsGameplayState.ChangingVista:
                {
                    XR.World.setVista(this.gameplaySeuratIndex, this.gameplaySeuratPopulation);
                    this.pause(this.pauseTimeChangeVista);
                    this.gameplayState = XRScreenshotAllSeuratsGameplayState.FreezingView;
                    break;
                }
            case XRScreenshotAllSeuratsGameplayState.FreezingView:
                {
                    this.applyOrientationIndex();
                    this.pause(this.pauseTimeFreeze);
                    this.gameplayState = XRScreenshotAllSeuratsGameplayState.Screenshotting;
                    break;
                }
            case XRScreenshotAllSeuratsGameplayState.Screenshotting:
                {
                    Automation.log("Taking Screenshot");
                    Automation.log("Civ: " + XRScreenshotAllSeuratsCivilisations[this.gameplaySeuratIndex]);
                    Automation.log("Pop: " + XRScreenshotAllSeuratsPopulations[this.gameplaySeuratPopulation]);
                    XR.World.takeScreenshot();
                    this.pause(this.pauseTimeTakeScreenshot);
                    this.gameplayState = XRScreenshotAllSeuratsGameplayState.UnFreezingView;
                    break;
                }
            case XRScreenshotAllSeuratsGameplayState.UnFreezingView:
                {
                    XR.FireTuner.unfreezeView();
                    // Decide on next step
                    if (this.gameplaySeuratPopulation < XRScreenshotAllSeuratsPopulations.High) {
                        this.gameplaySeuratPopulation += 1;
                    }
                    else if (this.gameplaySeuratIndex < XRScreenshotAllSeuratsCivilisations.ROME) {
                        this.gameplaySeuratIndex += 1;
                        this.gameplaySeuratPopulation = 0;
                    }
                    else {
                        AutomationSupport.PassTest("Finished taking screenshots");
                        return; // we done for now
                    }
                    this.pause(this.pauseTimeFreeze);
                    this.gameplayState = XRScreenshotAllSeuratsGameplayState.ChangingVista;
                    break;
                }
        }
    }
    stop() {
        Automation.log("XRScreenshotAllSeurats - stop()");
    }
    teleportToNextLocation() {
        let result = XR.World.teleportToZone(this.menuZones[this.menuZoneIndex]);
        if (!result)
            AutomationSupport.FailTest("Attempted to teleport to zone that does not exist");
    }
    pause(time) {
        let pauseOptions = {};
        pauseOptions.time = time;
        Automation.pause(true, pauseOptions);
    }
    applyOrientationIndex() {
        const tableZoom = 300.0;
        let playerLocalPosition = XR.World.getPlayerLocalPosition();
        const cameraPosition = { x: playerLocalPosition.x, y: playerLocalPosition.y, z: playerLocalPosition.z + 2 };
        const cameraRotation = this.orientations[this.orientationIndex];
        XR.FireTuner.freezeView(tableZoom, cameraPosition, cameraRotation);
    }
    incrementOrientationIndex() {
        this.orientationIndex += 1;
    }
}
let automationTestXRScreenshotAllSeuratsHandler = new AutomationTestXRScreenshotAllSeurats();
automationTestXRScreenshotAllSeuratsHandler.register();
Automation.setScriptHasLoaded("automation-test-xr-screenshot-all-seurats");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-xr-screenshot-all-seurats.js.map

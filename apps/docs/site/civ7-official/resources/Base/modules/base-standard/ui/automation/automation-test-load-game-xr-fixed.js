//----------------------------------------------------------------
// LoadGameFixedXR test handler
//----------------------------------------------------------------
console.log("loading automation-test-play-game-xr-fixed.ts");
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
class AutomationTestLoadGameFixedViewXR {
    constructor() {
        this.automationTestLoadGameFixedViewListener = (command, ...args) => {
            this.onAutomationEvent(command, args);
        };
    }
    register() {
        engine.on('Automation-Test-LoadGameFixedXR', this.automationTestLoadGameFixedViewListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        // Forward the event on to the handler.
        if (command === 'Run') {
            this.run();
        }
        else if (command == 'PostGameInitialization') {
            this.postGameInitialization(args);
        }
        else if (command == 'GameStarted') {
            const tableZoom = AutomationSupport.GetFloatParam("TableZoom", 300.0);
            const cameraPosition = AutomationSupport.GetFloat3Param("CameraPositionX", "CameraPositionY", "CameraPositionZ", { x: -2.25, y: 0, z: 2.0 });
            const cameraRotation = AutomationSupport.GetFloat3Param("CameraRotationX", "CameraRotationY", "CameraRotationZ", { x: 0, y: -60, z: -90 });
            XR.FireTuner.freezeView(tableZoom, cameraPosition, cameraRotation);
            this.gameStarted();
        }
        else if (command == 'Stop') {
            this.stop();
        }
    }
    run() {
        Automation.log("LoadGameFixedViewXR - run()");
        // We must be at the Main Menu to do this test.
        if (UI.isInShell() == false) {
            // Exit back to the main menu, we will pick up from there.
            engine.call('exitToMainMenu');
            return;
        }
        // Check if user wants to load an existing save
        const saveName = Automation.getParameter("CurrentTest", "SaveName");
        if (saveName !== null) {
            // Attempt to load specificed game
            const saveDirectory = Automation.getParameter("CurrentTest", "SaveDirectory");
            this.loadGameByName(saveName, saveDirectory);
            return;
        }
    }
    loadGameByName(fileName, fileDirectory) {
        // Initialize game to be loaded
        let loadGame = {};
        loadGame.Location = SaveLocations.LOCAL_STORAGE;
        loadGame.Type = SaveTypes.SINGLE_PLAYER;
        loadGame.IsAutosave = false;
        loadGame.IsQuicksave = false;
        loadGame.FileName = fileName ?? Automation.getLastGeneratedSaveName();
        loadGame.Directory = fileDirectory ?? SaveDirectories.DEFAULT;
        // Load config
        AutomationSupport.ReadUserConfigOptions();
        // Attempt to load game
        Automation.log("Attempting to load " + loadGame.FileName);
        const bResult = Network.loadGame(loadGame, ServerType.SERVER_TYPE_NONE);
        if (bResult == false) {
            Automation.log("Failed to load " + loadGame.FileName);
            Automation.sendTestComplete();
            return;
        }
        Automation.log("Load successful");
    }
    postGameInitialization(_bWasLoaded) {
        AutomationSupport.LogCurrentPlayers();
    }
    gameStarted() {
        Automation.log("LoadGameIdleXR - gameStarted()");
        // Wait for specified time
        const idleTime = Automation.getParameter("CurrentTest", "IdleTime");
        if (idleTime !== null) {
            Automation.log("Idling for " + idleTime + " seconds.");
            // Wait for unfreeze view to resolve completely.
            setTimeout(() => {
                XR.FireTuner.unfreezeView();
                setTimeout(() => {
                    Automation.log("Idle time complete.");
                    AutomationSupport.PassTest("");
                }, 1000);
            }, idleTime * 1000);
        }
    }
    stop() {
        Automation.log("LoadGameIdleXR - stop()");
        AutomationSupport.RestoreUserConfigOptions();
    }
}
let automationTestLoadGameFixedViewHandler = new AutomationTestLoadGameFixedViewXR();
automationTestLoadGameFixedViewHandler.register();
Automation.setScriptHasLoaded("automation-test-load-game-xr-fixed");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-load-game-xr-fixed.js.map

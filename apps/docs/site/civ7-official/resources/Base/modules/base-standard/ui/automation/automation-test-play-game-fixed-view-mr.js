//----------------------------------------------------------------
// PlayGameFixedView test handler
//
// mostly plagiarised from automation-test-play-game.ts
//----------------------------------------------------------------
console.log("loading automation-test-play-game-fixed-view-mr.ts");
import { AutomationBasePlayGameXR } from '/base-standard/ui/automation/automation-base-play-game-xr.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
class AutomationTestPlayGameFixedViewMR extends AutomationBasePlayGameXR {
    constructor() {
        super(...arguments);
        this.automationTestPlayGameFixedViewMRListener = (command, ...args) => {
            this.onAutomationEvent(command, args);
        };
    }
    register() {
        engine.on('Automation-Test-PlayGameFixedMR', this.automationTestPlayGameFixedViewMRListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        // Forward the event on to the handler.
        if (command === 'Run') {
            XR.Options.forceEnterMixedReality();
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
}
let automationTestPlayGameFixedViewMRHandler = new AutomationTestPlayGameFixedViewMR();
automationTestPlayGameFixedViewMRHandler.register();
Automation.setScriptHasLoaded("automation-test-play-game-fixed-view-mr");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-play-game-fixed-view-mr.js.map

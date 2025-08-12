//----------------------------------------------------------------
// XRTeleportZones test handler
//
// mostly plagiarised from automation-test-play-game.ts
//----------------------------------------------------------------
console.log("automation-test-xr-teleport-zones.ts");
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
var XRTeleportTestState;
(function (XRTeleportTestState) {
    XRTeleportTestState[XRTeleportTestState["Teleporting"] = 0] = "Teleporting";
    XRTeleportTestState[XRTeleportTestState["ReturningHome"] = 1] = "ReturningHome";
    XRTeleportTestState[XRTeleportTestState["Moving"] = 2] = "Moving";
    XRTeleportTestState[XRTeleportTestState["Complete"] = 3] = "Complete";
})(XRTeleportTestState || (XRTeleportTestState = {}));
export class AutomationTestXRTeleportZones {
    constructor() {
        this.testingZoneFromName = "";
        this.testingZoneToName = "";
        this.testingOuterIndex = 0;
        this.testingInnerIndex = 0;
        this.testingHomeName = "";
        this.testingShouldReturnHome = false;
        this.testingIsMovingToNewLocation = false;
        this.allStartingZones = new Array;
        this.state = XRTeleportTestState.Teleporting;
        this.automationTestXRTeleportZonesListener = (command, ...args) => {
            this.onAutomationEvent(command, args);
        };
    }
    register() {
        engine.on('Automation-Test-XRTeleportZones', this.automationTestXRTeleportZonesListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        Automation.log("onAutomationEvent command: " + command);
        // Forward the event on to the handler.
        if (command === 'AppInitComplete') {
            this.run();
        }
        else if (command == 'Stop') {
            this.stop();
        }
    }
    initialise() {
        // Get all Zones
        Automation.log("XRTeleportZones - initialise()");
        Automation.log("Collecting Initial Teleport Zones");
        // Hardcode the first one because we start in it and arent aware of self.
        let startingZone = "PLY_Zone_Menu_Center";
        Automation.log(startingZone);
        this.allStartingZones.push(startingZone);
        this.testingHomeName = startingZone;
        let teleportZoneCount = XR.World.getZoneCount();
        for (let i = 0; i < teleportZoneCount; i++) {
            let zoneName = XR.World.getZoneNameByIndex(i);
            Automation.log(zoneName);
            this.allStartingZones.push(zoneName);
        }
    }
    run() {
        Automation.log("XRTeleportZones - run()");
        engine.on('XRTeleportCompleted', this.onTeleportCompleted, this);
        this.initialise();
        this.testSelfTeleportation();
        this.configureNextTeleport();
        this.performNextTeleport();
        Automation.log("XRTeleportZones - end of run()");
    }
    stop() {
        Automation.log("XRTeleportZones - stop()");
        engine.off('XRTeleportCompleted', this.onTeleportCompleted, this);
    }
    onTeleportCompleted(_data) {
        Automation.log("XRTeleportZones - onTeleportCompleted()");
        this.validateTeleport();
        this.updateTestState();
        this.configureNextTeleport();
        this.performNextTeleport();
    }
    updateTestState() {
        Automation.log("XRTeleportZones - updateTestState()");
        switch (this.state) {
            case XRTeleportTestState.Teleporting:
                {
                    this.state = XRTeleportTestState.ReturningHome;
                    break;
                }
            case XRTeleportTestState.ReturningHome:
                {
                    this.testingInnerIndex += 1;
                    this.testSelfTeleportation();
                    this.state = XRTeleportTestState.Teleporting; // assume we're going to test the next zone, but do some checks below.
                    if (this.testingInnerIndex == this.allStartingZones.length) { // Check if we've finished testing all teleports for this zone
                        this.testingInnerIndex = 0;
                        this.testingOuterIndex += 1;
                        this.state = XRTeleportTestState.Moving;
                    }
                    if (this.testingOuterIndex == this.allStartingZones.length - 1) { // Check if we've finished testing all teleports for all zones.
                        this.state = XRTeleportTestState.Complete;
                        AutomationSupport.PassTest("All zones tested successfully.");
                    }
                    break;
                }
            case XRTeleportTestState.Moving:
                {
                    this.state = XRTeleportTestState.Teleporting;
                    break;
                }
            default:
                {
                    break;
                }
        }
    }
    testSelfTeleportation() {
        if (this.testingInnerIndex == this.testingOuterIndex) {
            // we're about to test that we're going to teleport to ourself - this is not possible for a human to intialise this way, so we skip over it.
            this.testingInnerIndex += 1;
        }
    }
    configureNextTeleport() {
        Automation.log("XRTeleportZones - configureNextTeleport()");
        switch (this.state) {
            case XRTeleportTestState.Teleporting:
                {
                    Automation.log("XRTeleportZones - Configuring to test a teleport zone");
                    this.testingZoneToName = this.allStartingZones[this.testingInnerIndex];
                    this.testingZoneFromName = this.testingHomeName;
                    break;
                }
            case XRTeleportTestState.ReturningHome:
                {
                    Automation.log("XRTeleportZones - Configuring to return home");
                    this.testingZoneToName = this.testingHomeName;
                    this.testingZoneFromName = this.allStartingZones[this.testingInnerIndex];
                    break;
                }
            case XRTeleportTestState.Moving:
                {
                    Automation.log("XRTeleportZones - Configuring to Move to new Location");
                    this.testingHomeName = this.allStartingZones[this.testingOuterIndex];
                    this.testingZoneToName = this.testingHomeName;
                    this.testingZoneFromName = "N/A";
                    break;
                }
            case XRTeleportTestState.Complete:
                {
                    Automation.log("XRTeleportZones - Configuring to return to centre location.");
                    this.testingHomeName = this.allStartingZones[0];
                    this.testingZoneToName = this.testingHomeName;
                    this.testingZoneFromName = "N/A";
                    break;
                }
            default:
                {
                    break;
                }
        }
        Automation.log("XRTeleportZones - testingZoneToName: " + this.testingZoneToName);
        Automation.log("XRTeleportZones - testingZoneFromName: " + this.testingZoneFromName);
    }
    performNextTeleport() {
        let result = XR.World.teleportToZone(this.testingZoneToName);
        if (!result)
            AutomationSupport.FailTest("Attempted to teleport to zone that does not exist");
    }
    // This function asks a bunch of questions about the current state and passes and fails accordingly.
    validateTeleport() {
        switch (this.state) {
            case XRTeleportTestState.Teleporting:
                {
                    // Collect All zones
                    let activeZones = new Array();
                    let activeZoneCount = XR.World.getZoneCount();
                    for (let i = 0; i < activeZoneCount; i++) {
                        activeZones.push(XR.World.getZoneNameByIndex(i));
                    }
                    // Process all the starting zone names for validity
                    for (let i = 0; i < this.allStartingZones.length; i++) {
                        if (i == this.testingInnerIndex) // This is where we intended to be, check it's disabled (Not in the list)
                         {
                            for (let ii = 0; ii < activeZoneCount; ii++) {
                                if (this.testingZoneToName == activeZones[ii]) {
                                    AutomationSupport.FailTest("We teleported to a zone, and that zone was still available as a teleport destination: " + this.allStartingZones[i]);
                                    this.state = XRTeleportTestState.Complete;
                                    return;
                                }
                            }
                        }
                        else {
                            let foundZone = false;
                            for (let ii = 0; ii < activeZoneCount; ii++) {
                                if (this.allStartingZones[i] == activeZones[ii]) {
                                    foundZone = true;
                                    break;
                                }
                            }
                            if (!foundZone) {
                                AutomationSupport.FailTest("We teleported to a zone, and found that a zone we expected to be avaialble was not: " + this.allStartingZones[i]);
                                this.state = XRTeleportTestState.Complete;
                                return;
                            }
                        }
                    }
                    break;
                }
            default:
                {
                    // N/A
                    break;
                }
        }
    }
}
let automationTestXRTeleportZonesHandler = new AutomationTestXRTeleportZones();
automationTestXRTeleportZonesHandler.register();
Automation.setScriptHasLoaded("automation-test-xr-teleport-zones");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-xr-teleport-zones.js.map

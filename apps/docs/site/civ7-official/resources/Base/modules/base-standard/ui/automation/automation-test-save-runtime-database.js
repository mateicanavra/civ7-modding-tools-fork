//-----------------------------------------------------------------
// Sets the configuration and then generates a runtime database image
// This is used by the build system to generate a runtime database image
// for the tools.
//-----------------------------------------------------------------
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
console.log("loading automation-test-save-runtime-database.ts");
class AutomationTestSaveRuntimeDatabase {
    constructor() {
        this.automationTestSaveRuntimeDatabaseListener = (command, ...args) => { this.onAutomationEvent(command, args); };
    }
    register() {
        engine.on('Automation-Test-SaveRuntimeDatabase', this.automationTestSaveRuntimeDatabaseListener);
    }
    onAutomationEvent(command, ..._args) {
        AutomationSupport.Shared_OnAutomationEvent(_args);
        // Forward the event on to the handler.
        if (command === 'Run') {
            this.run();
        }
        else if (command == 'Stop') {
            this.stop();
        }
    }
    // Start the game
    run() {
        Automation.log("SaveRuntimeDatabase - run()");
        // We must be at the Main Menu to do this test.
        if (UI.isInShell() == false) {
            Automation.log("Not in shell!");
            Automation.sendTestComplete();
            return;
        }
        Configuration.editGame().reset();
        // KWG: Might want to support loading a configuration.  Would require event callbacks though.
        AutomationSupport.ApplyCommonNewGameParametersToConfiguration();
        AutomationSupport.ReadUserConfigOptions();
        Network.prepareConfigurationForHosting(ServerType.SERVER_TYPE_NONE);
        Modding.applyConfiguration();
        Automation.sendTestComplete();
    }
    // Stop handler for "PlayGame"
    stop() {
        Automation.log("PlayGame - stop()");
        AutomationSupport.RestoreUserConfigOptions();
    }
}
let automationTestSaveRuntimeDatabase = new AutomationTestSaveRuntimeDatabase();
automationTestSaveRuntimeDatabase.register();
Automation.setScriptHasLoaded("automation-test-save-runtime-database");

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-save-runtime-database.js.map

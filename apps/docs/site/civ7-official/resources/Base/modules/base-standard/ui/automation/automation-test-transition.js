//----------------------------------------------------------------------------
// Automation that grabs a Save X Turns before Age Transition
//----------------------------------------------------------------------------
console.log("loading automation-test-transition.ts");
//Import base-play-game & test-support
import { AutomationBasePlayGame } from '/base-standard/ui/automation/automation-base-play-game.js';
import * as AutomationSupport from '/base-standard/ui/automation/automation-test-support.js';
class AutomationTestTransition extends AutomationBasePlayGame {
    constructor() {
        super(...arguments);
        //Listener for the script itself. Listens for Automation-Test-Transition to be called so that the Event Handler can begin with onAutomationEvent and facilitate the test.
        this.automationTestTransitionListener = (command) => { this.onAutomationEvent(command); };
        //Listener for age transition. Listens for GameAgeEnded to call the transitionSave() method.
        this.autoPlayAgeTransitionListener = () => { this.transitionSave(); };
    }
    register() {
        //Activates the listener for the script
        engine.on('Automation-Test-Transition', this.automationTestTransitionListener);
    }
    onAutomationEvent(command, ...args) {
        AutomationSupport.Shared_OnAutomationEvent(args);
        if (command === 'Run') {
            this.run();
        }
        else if (command == 'PostGameInitialization') {
            //Calls the function to activate the listener for age transition before the user is in the game
            this.autoListen();
            this.postGameInitialization(args);
        }
        else if (command == 'GameStarted') {
            Automation.log('GameStart');
            this.gameStarted();
        }
        else if (command == 'Stop') {
            this.quitApplication();
            this.stop();
        }
    }
    //Get the Autosave From X Turns before Transition
    transitionSave() {
        Automation.log("Transition Save Process Started");
        //Automation.getParameter("CurrentTest", "Resume");
        //if the game turn is not null collect the auto save
        if (Game.turn != null) {
            //Populates Automation "Save" folder in the logs with a copy of an autosave with current turn - X and gives it a new name
            Automation.copyAutosave(Game.turn - 3, "AutomationTransitionSave.Civ7Save");
            //engine.on("GameAgeEnded", (_event: unknown) => { Automation.copyAutosave(Game.turn - 3, "AutomationTransitionSave"); });
            //Notifies that the test has passed and logs it as a pass
            AutomationSupport.PassTest("");
        }
        else {
            console.log("Game.turn = " + Game.turn);
            //Notifies that the test has failed and logs it as a fail
            AutomationSupport.FailTest("");
        }
        Automation.log("Transition Save Process Ended");
    }
    autoListen() {
        //Activates the listener for age transition
        engine.on('GameAgeEnded', this.autoPlayAgeTransitionListener);
    }
    quitApplication() {
        Automation.log("Quitting Through quitApplication");
        //Quit the Current Game if it is still running
        if (UI.isInGame()) {
            Automation.log("Still in Game");
            engine.call('exitToMainMenu');
        }
        //Send that the game has been quit
        Automation.sendTestComplete("QuitGame");
        //Set the flag to trigger the code responsible for quiting the application then Send that the app has been quit
        Automation.setLocalParameter("QuitApp", true);
        Automation.sendTestComplete("QuitApp");
        //Quit out of the App
        engine.call("exitToDesktop");
        Automation.log("Quit Complete");
    }
    stop() {
        //Deactivates the listener for age transition
        engine.off('GameAgeEnded', this.autoPlayAgeTransitionListener);
        //Resets Automation - Note that the automation must still be disabled through firetuner in the new autosave
        //Automation.setActive(false);
        AutomationSupport.RestoreUserConfigOptions();
    }
}
//Creates the handler and has it run the register() method
let AutomationTestTransitionHandler = new AutomationTestTransition();
AutomationTestTransitionHandler.register();
//Signals that the script has loaded to the Automation
Automation.setScriptHasLoaded('automation-test-transition');

//# sourceMappingURL=file:///base-standard/ui/automation/automation-test-transition.js.map

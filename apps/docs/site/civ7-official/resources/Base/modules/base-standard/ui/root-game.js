/**
 * @file root-game.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Top level User Interface script (UI root) when playing the game.
 */
await Loading.isInitialized; // all other imports must be dynamic after this point, as they may access globals that are not yet initialized
const { default: ContextManager } = await import("/core/ui/context-manager/context-manager.js");
await import("/core/ui/input/action-handler.js");
/**
 * This class reroutes KBM input to the hovered element and controller input to the loading screen
 * This stops functioning after the game is finished loading
 */
class LoadingInputHandler {
    constructor() {
        this.loadScreen = null;
    }
    handleInput(inputEvent) {
        if (!this.loadScreen) {
            this.loadScreen = document.getElementById("load-screen");
        }
        if (inputEvent.detail.isMouse || inputEvent.detail.isTouch) {
            const hoverTargets = [...document.querySelectorAll(":hover")];
            if (hoverTargets.length > 0) {
                hoverTargets[hoverTargets.length - 1]?.dispatchEvent(inputEvent);
            }
        }
        else {
            this.loadScreen?.dispatchEvent(inputEvent);
        }
        return false;
    }
    handleNavigation(navigationEvent) {
        if (!this.loadScreen) {
            this.loadScreen = document.getElementById("load-screen");
        }
        this.loadScreen?.dispatchEvent(navigationEvent);
        return false;
    }
}
const loadingInputHandler = new LoadingInputHandler();
ContextManager.registerEngineInputHandler(loadingInputHandler);
await Loading.whenLoaded; // all other imports must be dynamic after this point, as they may access globals that are not yet initialized
const { default: CameraController } = await import('/core/ui/camera/camera-controller.js');
const { default: Cursor } = await import('/core/ui/input/cursor.js');
const { default: DialogManager, DialogBoxAction, DialogSource } = await import('/core/ui/dialog-box/manager-dialog-box.js');
const { default: HotkeyManager } = await import('/core/ui/input/hotkey-manager.js');
const { default: InputFilterManager } = await import('/core/ui/input/input-filter.js');
const { PlotCursor } = await import('/core/ui/input/plot-cursor.js');
const { default: ViewManager, SwitchViewResult } = await import('/core/ui/views/view-manager.js');
const { InterfaceMode } = await import('/core/ui/interface-modes/interface-modes.js');
const { InitDebugWidgets } = await import('/base-standard/ui/debug/hud-debug-widgets.js');
const { Icon } = await import('/core/ui/utilities/utilities-image.js');
const { default: WorldInput } = await import('/base-standard/ui/world-input/world-input.js');
const { default: TooltipManager } = await import('/core/ui/tooltips/tooltip-manager.js');
const { default: TutorialManager } = await import('/base-standard/ui/tutorial/tutorial-manager.js');
const { DisplayQueueManager } = await import('/core/ui/context-manager/display-queue-manager.js');
const { instance: Civilopedia } = await import('/base-standard/ui/civilopedia/model-civilopedia.js');
const { openBenchmarkUi } = await import('/base-standard/ui/benchmark/screen-benchmark.js');
const { MustGetElement } = await import('/core/ui/utilities/utilities-dom.js');
const { displayRequestUniqueId } = await import('/core/ui/context-manager/display-handler.js');
// using a bool to track theclosing game dialog box, used to keep multiple boxes from opening if the player clicks on the windows 'X' which is outside of the mouse guard.
const dialogExitId = displayRequestUniqueId();
let isClosingDialogOpen = false;
function openCivilopedia(searchTerm) {
    if (searchTerm) {
        const result = Civilopedia.search(searchTerm, 1);
        if (result.length > 0) {
            Civilopedia.navigateTo(result[0].page);
            ContextManager.push("screen-civilopedia", { singleton: true, createMouseGuard: true });
            return;
        }
    }
    // Fall back to just opening the pedia.
    Civilopedia.navigateHome();
    ContextManager.push("screen-civilopedia", { singleton: true, createMouseGuard: true });
}
function openScreenshotView() {
    if (ViewManager.switchToEmptyView() != SwitchViewResult.Error) {
        waitForLayout(() => {
            InterfaceMode.switchTo("INTERFACEMODE_SCREENSHOT");
        });
    }
}
function openTutorialInspector() {
    DialogManager.setSource(DialogSource.Game);
    DisplayQueueManager.resume();
    ContextManager.push("panel-tutorial-inspector", { singleton: true });
}
// Support for initial scripts.
const userRequestCloseListener = () => {
    if (isClosingDialogOpen) {
        return;
    }
    const dbCallback = (eAction) => {
        isClosingDialogOpen = false;
        if (eAction == DialogBoxAction.Confirm) {
            engine.call("userConfirmedClose");
        }
    };
    DialogManager.createDialog_ConfirmCancel({
        dialogId: dialogExitId,
        body: "LOC_CLOSEMGR_CONFIRM_BODY",
        title: "LOC_CLOSEMGR_CONFIRM_TITLE",
        canClose: false,
        displayQueue: "SystemMessage",
        addToFront: true,
        callback: dbCallback,
    });
    isClosingDialogOpen = true;
};
// set up CSS global variables
const rootElement = document.querySelector(":root");
if (rootElement) {
    // set up --playerX-color-primary and --playerX-color-secondary variables
    const playerList = Players.getEverAlive();
    for (const p of playerList) {
        rootElement.style.setProperty(`--player${p.id}-color-primary`, UI.Player.getPrimaryColorValueAsString(p.id));
        rootElement.style.setProperty(`--player${p.id}-color-secondary`, UI.Player.getSecondaryColorValueAsString(p.id));
    }
    const localPlayer = Players.get(GameContext.localObserverID);
    if (localPlayer) {
        rootElement.style.setProperty("--player-pattern", Icon.getCivLineCSSFromCivilizationType(localPlayer.civilizationType));
        rootElement.style.setProperty("--player-symbol", Icon.getCivSymbolCSSFromCivilizationType(localPlayer.civilizationType));
    }
}
if (Network.supportsSSO()) {
    const tooltips = MustGetElement("#tooltips", document.body);
    tooltips.insertAdjacentElement("beforebegin", document.createElement("live-notice-panel"));
}
engine.on("UserRequestClose", userRequestCloseListener);
engine.on("NetworkDisconnected", showDisconnectionPopup.bind(this));
engine.on("NetworkReconnected", resetDisconnectionPopup.bind(this));
// Setup benchmarking UI (and open it if a benchmark is already running)
if (Benchmark.Game.isRunning()) {
    openBenchmarkUi();
}
engine.on("BenchStarted", openBenchmarkUi);
// Setup environment.
ContextManager.registerEngineInputHandler(InputFilterManager);
ContextManager.registerEngineInputHandler(InterfaceMode);
ContextManager.registerEngineInputHandler(ViewManager);
ContextManager.registerEngineInputHandler(Cursor);
ContextManager.registerEngineInputHandler(CameraController);
ContextManager.registerEngineInputHandler(PlotCursor);
ContextManager.registerEngineInputHandler(WorldInput); // needs to be added after PlotCursor
ContextManager.registerEngineInputHandler(TooltipManager); // needs to be added after PlotCursor
ContextManager.registerEngineInputHandler(HotkeyManager);
ContextManager.registerEngineInputHandler(TutorialManager);
engine.on("open-civilopedia", openCivilopedia);
engine.on("open-tutorial-inspector", openTutorialInspector);
engine.on("open-screenshot-view", openScreenshotView);
// TODO: Map all simple screen hotkeys that pass through the HotkeyManager and register them
// UI.Control.registerHotkey("open-techs");
// UI.Control.registerHotkey("open-civics");
// UI.Control.registerHotkey("open-traditions");
// UI.Control.registerHotkey("open-rankings");
// UI.Control.registerHotkey("open-attributes");
UI.Control.registerHotkey("open-civilopedia");
//UI.Control.registerHotkey("open-greatworks");
// TODO - This entire block needs to be revised to be more predictable.
// Signals UI is ready based on the system panel being found on the DOM.
const frameLimit = 30;
let framesLeft = frameLimit;
new Promise((resolve, reject) => {
    const checkDOMReady = () => {
        framesLeft--;
        requestAnimationFrame(() => {
            const keyElement = document.querySelector("#world");
            if (keyElement?.isConnected) {
                // If found, should be impossible to not be connected.
                resolve();
            }
            else if (framesLeft == 0) {
                console.error(`ERROR - Failed to signal UI loaded when inspecting DOM for system bar across ${frameLimit} frames.`);
                reject();
            }
            else {
                checkDOMReady();
            }
        });
    };
    checkDOMReady();
}).finally(() => {
    console.log(`DOMReady with ${framesLeft} frames to spare.`);
    // Before the loading refactor, this event would typically fire AFTER a lot of initial gameplay events would fire.
    // However, now that loading occurs much earlier, this event is triggering before gameplay events trigger and are causing some issues.
    // For now, let's delay this event by 1 second to allow gameplay events to trigger as a temporary measure.
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent("user-interface-loaded-and-ready", { cancelable: false })); // Signal loading scren
    }, 1000);
});
function showDisconnectionPopup() {
    if (UI.shouldShowDisconnectionPopup() && ContextManager.isGameActive()) {
        DialogManager.createDialog_Confirm({
            body: "LOC_UI_NO_INTERNET_CONNECTION",
            title: "LOC_UI_NO_INTERNET_CONNECTION_TITLE",
        });
        UI.setDisconnectionPopupWasShown(true);
    }
}
function resetDisconnectionPopup() {
    UI.setDisconnectionPopupWasShown(false);
}
/**
 * Pause menu handler; that's it.  If anything else is being handled here, you're doing it wrong.
 * @param inputEvent An 'engine-input' event to process.
 * @returns true if non-pause input came through.
 */
function handleInput(inputEvent) {
    if (inputEvent.type != "engine-input") {
        console.warn("root-game: Attempt to process a non 'engine-input' custom event in the input handler: ", inputEvent.type);
        return true;
    }
    if (inputEvent.detail.status != InputActionStatuses.FINISH) {
        return true;
    }
    if (inputEvent.detail.name != "sys-menu" && inputEvent.detail.name != "keyboard-escape") {
        return true;
    }
    if (ContextManager.canOpenPauseMenu()) {
        if (!ContextManager.getTarget("screen-pause-menu")) {
            //Only push pause menu if not already open
            DisplayQueueManager.suspend();
            ContextManager.push("screen-pause-menu", { singleton: true, createMouseGuard: true });
        }
        else {
            return true;
        }
    }
    // This being the root means it needs to special case the end, both returning false if called directly and stopping the event if raise via DOM.
    inputEvent.stopPropagation();
    inputEvent.preventDefault();
    return false;
}
const onPullCurtain = () => {
    ContextManager.unregisterEngineInputHandler(loadingInputHandler);
    const curtain = document.getElementById("loading-curtain");
    if (curtain) {
        // Adding curtain-opened is going to trigger a fade-out animation.
        // When this animation ends, wait 1 frame and detach all of the loading screen related code.
        curtain.addEventListener("animationend", (event) => {
            if (event.target == curtain) {
                window.requestAnimationFrame(() => {
                    document.body.removeChild(curtain);
                    document.head.querySelector('link[href$="load-screen.css"]')?.remove();
                });
            }
        });
        curtain.classList.add("curtain-opened");
        InterfaceMode.startup();
    }
    const userConfig = Configuration.getUser();
    if (userConfig.firstTimeTutorialEnabled) {
        userConfig.setFirstTimeTutorialEnabled(false);
        userConfig.saveCheckpoint();
    }
    window.addEventListener("engine-input", handleInput);
};
Loading.runWhenFinished(onPullCurtain);
engine.whenReady.then(() => {
    InitDebugWidgets();
});
export {};

//# sourceMappingURL=file:///base-standard/ui/root-game.js.map

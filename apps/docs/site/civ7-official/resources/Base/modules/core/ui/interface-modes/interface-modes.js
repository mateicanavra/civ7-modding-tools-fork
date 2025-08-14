/**
 * @file interface-modes.ts
 * @copyright 2019-2025, Firaxis Games
 * @description States of different "modes" the User Interface may be in while playing the game.
 */
import ViewManager from '/core/ui/views/view-manager.js';
const debug_showModeChanges = false; // log out the UI mode as well as current view and input for that mode 
export const InterfaceModeChangedEventName = 'interface-mode-changed';
export class InterfaceModeChangedEvent extends CustomEvent {
    constructor(prevMode, newMode) {
        super(InterfaceModeChangedEventName, {
            detail: {
                prevMode,
                newMode
            }
        });
    }
}
export class InterfaceModeReadyEvent extends CustomEvent {
    constructor() {
        super('interface-mode-ready');
    }
}
export var InterfaceMode;
(function (InterfaceMode) {
    const UNSET_INTERFACE_MODE = 'INTERFACEMODE_UNSET';
    const DEFAULT_INTERFACE_MODE = 'INTERFACEMODE_DEFAULT';
    const InterfaceModeHandlers = new Map();
    let isReady = false; // Call startup to get state machine a' runnin.
    let initMode = DEFAULT_INTERFACE_MODE; // First mode to initialize with
    let currentInterfaceMode = UNSET_INTERFACE_MODE;
    let currentInterfaceParameters = undefined;
    function getInterfaceModeHandler(mode) {
        return InterfaceModeHandlers.get(mode) ?? null;
    }
    InterfaceMode.getInterfaceModeHandler = getInterfaceModeHandler;
    function addHandler(mode, handler) {
        const definition = GameInfo.InterfaceModes.lookup(mode);
        if (definition == null) {
            console.warn(`Interface Mode '${mode}' not defined in database.`);
        }
        const oldHandler = InterfaceModeHandlers.get(mode);
        if (oldHandler != null) {
            console.warn("Replacing an existing interface mode handler.");
        }
        InterfaceModeHandlers.set(mode, handler);
    }
    InterfaceMode.addHandler = addHandler;
    /**
     * Gets the current interface mode.
     *
     * @returns ModeId of the current interface mode.
     */
    function getCurrent() {
        return currentInterfaceMode;
    }
    InterfaceMode.getCurrent = getCurrent;
    /**
     * Gets the parameters of the current interface mode.
     *
     * @returns Parameters passed into the current interface mode when it was switched to
     */
    function getParameters() {
        return currentInterfaceParameters;
    }
    InterfaceMode.getParameters = getParameters;
    /**
     * Change to an interface mode.  Any input or associated views are changed as well.
     * @param mode
     * @param {any} parameters optional values that are specifically needed by a mode.
     * @returns true if successful
     */
    function switchTo(mode, parameters) {
        let success = false;
        if (!isReady) {
            // Lazy loading is allowed, should only be done at startup and from something
            // special like a benchmark system.
            if (parameters?.lazyInit == true) {
                initMode = mode;
                return false;
            }
            console.error(`Attempt to switch to an interface mode '${mode}' before startup completed.`);
            return false;
        }
        // Ensure handler is defined in the XML
        const definition = GameInfo.InterfaceModes.lookup(mode);
        if (definition == null) {
            console.warn(`Interface Mode '${mode}' not defined in Database.`);
            return false;
        }
        const handler = getInterfaceModeHandler(mode);
        if (handler == null) {
            console.error(`No handler registered for '${mode}'`);
            return false;
        }
        // Ensure we can leave the current mode and enter the next mode before attempting.
        const prevHandler = getInterfaceModeHandler(currentInterfaceMode);
        if (prevHandler && prevHandler.canLeaveMode && !prevHandler.canLeaveMode(mode)) {
            return false;
        }
        if (handler.canEnterMode && !handler.canEnterMode(parameters)) {
            return false;
        }
        const prevMode = currentInterfaceMode;
        if (mode != currentInterfaceMode) {
            currentInterfaceMode = mode;
            currentInterfaceParameters = parameters;
            console.log(`UIInterfaceMode: from '${prevMode}' to '${mode}'.`); // Key info to log.
            prevHandler?.transitionFrom(prevMode, mode);
            handler?.transitionTo(prevMode, mode, parameters);
            // Change the view, if successful setup the input keys and inform the world.
            success = ViewManager.setCurrentByName(definition.ViewName);
            if (success) {
                window.dispatchEvent(new InterfaceModeChangedEvent(prevMode, currentInterfaceMode));
                if (debug_showModeChanges) {
                    const GreenANSI = "\x1b[32m";
                    const BlackOnGreenANSI = "\x1b[30m\x1b[42m";
                    const ResetANSI = "\x1b[0m";
                    console.log(GreenANSI + `IM.switchTo('${BlackOnGreenANSI}${mode}${ResetANSI}${GreenANSI}') success!   View: '${BlackOnGreenANSI}${definition.ViewName}${ResetANSI}${GreenANSI}'` + ResetANSI);
                }
            }
            else {
                console.warn(`Failed after chaning mode to '${mode}', failed to change the associated view with name '${definition.ViewName}'.`);
            }
        }
        return success;
    }
    InterfaceMode.switchTo = switchTo;
    const MaxFrames = 5;
    let delayFrameCount = 0;
    /**
     * Default mode needs to exist, so if it doesn't assume it was called too early during a loading sequence.
     */
    function startup() {
        return new Promise((resolve, reject) => {
            let updateListener = (_timeStamp) => {
                delayFrameCount++;
                const handler = getInterfaceModeHandler(DEFAULT_INTERFACE_MODE);
                if (handler != null) {
                    isReady = true;
                    window.dispatchEvent(new InterfaceModeReadyEvent());
                    resolve(switchTo(initMode));
                }
                else {
                    console.warn(`Delaying startup of interface mode handler, because default mode isn't yet registered. frame: ${delayFrameCount}`);
                    requestAnimationFrame(updateListener);
                    if (delayFrameCount > MaxFrames) {
                        console.error(`Unable to startup interface modes; more than ${MaxFrames} passed since called and a default mode has yet to be registered.`);
                        reject();
                    }
                }
            };
            updateListener(0);
        });
    }
    InterfaceMode.startup = startup;
    /**
     * Switch to the default interface mode.
     */
    function switchToDefault() {
        switchTo(DEFAULT_INTERFACE_MODE);
    }
    InterfaceMode.switchToDefault = switchToDefault;
    /// Is a particular interface mode the current one?
    function isInInterfaceMode(targetMode) {
        return currentInterfaceMode == targetMode;
    }
    InterfaceMode.isInInterfaceMode = isInInterfaceMode;
    //does this interface mode allow for hotkeys?
    function allowsHotKeys() {
        const handler = getInterfaceModeHandler(currentInterfaceMode);
        if (!handler || !handler.allowsHotKeys) {
            return false;
        }
        return handler.allowsHotKeys();
    }
    InterfaceMode.allowsHotKeys = allowsHotKeys;
    /// If the current interface mode handles input, let it inspect an engine input event.
    function handleInput(inputEvent) {
        if (inputEvent.type != 'engine-input') {
            console.warn("Attempt to handle a non engine-input event to the interface mode handlers.");
            return true;
        }
        const handler = getInterfaceModeHandler(currentInterfaceMode);
        if (!handler || !handler.handleInput) {
            return true;
        }
        return handler.handleInput(inputEvent);
    }
    InterfaceMode.handleInput = handleInput;
    /**
     * If the current interface mode handles navigation, let it inspect the navigation event.
     * @returns true if still live, false if input should stop.
     */
    function handleNavigation(navigationEvent) {
        if (navigationEvent.type != 'navigate-input') {
            console.warn("Attempt to handle a non navigate-input event to the interface mode handlers.");
            return true;
        }
        const handler = getInterfaceModeHandler(currentInterfaceMode);
        if (!handler || !handler.handleNavigation) {
            return true;
        }
        return handler.handleNavigation(navigationEvent);
    }
    InterfaceMode.handleNavigation = handleNavigation;
    function isInDefaultMode() {
        return currentInterfaceMode == DEFAULT_INTERFACE_MODE;
    }
    InterfaceMode.isInDefaultMode = isInDefaultMode;
})(InterfaceMode || (InterfaceMode = {}));

//# sourceMappingURL=file:///core/ui/interface-modes/interface-modes.js.map

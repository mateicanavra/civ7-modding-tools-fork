/**
 * @file tutorial-displayer
 * @copyright 2022, Firaxis Gamers
 * @description Tutorial display system for showing/hiding particular pieces of the UI
 *
 * TODO: remove, Slack thread source: https://firaxis.slack.com/archives/C0104C9M8JH/p1659093562080719
 */
export var DisplayState;
(function (DisplayState) {
    DisplayState[DisplayState["shown"] = 0] = "shown";
    DisplayState[DisplayState["hidden"] = 1] = "hidden";
    DisplayState[DisplayState["disabled"] = 2] = "disabled";
})(DisplayState || (DisplayState = {}));
/**
 * Display Manager
 * Determine if a piece of the UI should be shown to the player.
 */
class DisplayManagerSingleton {
    //TODO: private items: Map<string, boolean> = new Map<string, boolean>();	// items to track for displaying
    isShowable(_id) {
        return true;
    }
}
const DisplayManager = new DisplayManagerSingleton();
export { DisplayManager };

//# sourceMappingURL=file:///base-standard/ui/tutorial/tutorial-displayer.js.map

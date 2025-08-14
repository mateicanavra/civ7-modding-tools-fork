/**
 * @file tutorial-displayer
 * @copyright 2022, Firaxis Gamers
 * @description Tutorial display system for showing/hiding particular pieces of the UI
 * 
 * TODO: remove, Slack thread source: https://firaxis.slack.com/archives/C0104C9M8JH/p1659093562080719
 */

export enum DisplayState {
	shown = 0,
	hidden = 1,
	disabled = 2
}


/**
 * Display Manager
 * Determine if a piece of the UI should be shown to the player.
 */
class DisplayManagerSingleton {
	//TODO: private items: Map<string, boolean> = new Map<string, boolean>();	// items to track for displaying

	public isShowable(_id: string): boolean {
		return true;
	}
}
const DisplayManager: DisplayManagerSingleton = new DisplayManagerSingleton();
export { DisplayManager };

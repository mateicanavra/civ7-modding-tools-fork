/**
 * @file live-event-logic.ts
 * @copyright 2021, Firaxis Games
 * @description An object to catch mp messages and orchestrate UI responses.
 */


class LiveEventManagerSingleton {

	private static _Instance: LiveEventManagerSingleton;

	skipAgeSelect(): boolean {
		if (!Network.supportsSSO()) {
			return false;
		}

		const keys = Online.LiveEvent.getLiveEventConfigKeys();
		return keys.some((key) => key === "StartAge");
	}

	restrictToPreferredCivs(): boolean {
		if (Network.supportsSSO()) {
			const keys = Online.LiveEvent.getLiveEventConfigKeys();
			if (keys.some((key) => key === "EventFilterType")) {
				return Configuration.getGame().getValue("EventFilterType") == Database.makeHash("RESTRICTED_LEADER_CIVS");
			}
		}
		return false;
	}

	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!LiveEventManagerSingleton._Instance) {
			LiveEventManagerSingleton._Instance = new LiveEventManagerSingleton();
		}
		return LiveEventManagerSingleton._Instance;
	}
}

const LiveEventManager = LiveEventManagerSingleton.getInstance();
export { LiveEventManager as default };
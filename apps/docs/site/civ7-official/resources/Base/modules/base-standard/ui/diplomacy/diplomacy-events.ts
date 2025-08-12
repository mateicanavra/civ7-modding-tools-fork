/**
 * @file diplomacy-events.ts
 * @copyright 2025, Firaxis Games
 * @description Defines events for the diplomacy manager
 */


export const RaiseDiplomacyEventName = 'raise-diplomacy' as const;
export class RaiseDiplomacyEvent extends CustomEvent<{ playerID: PlayerId }> {
	constructor(playerID: PlayerId) {
		super(RaiseDiplomacyEventName, { bubbles: true, cancelable: true, detail: { playerID } });
	}
}

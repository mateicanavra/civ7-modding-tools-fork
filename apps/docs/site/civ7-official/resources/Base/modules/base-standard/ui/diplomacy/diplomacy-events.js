/**
 * @file diplomacy-events.ts
 * @copyright 2025, Firaxis Games
 * @description Defines events for the diplomacy manager
 */
export const RaiseDiplomacyEventName = 'raise-diplomacy';
export class RaiseDiplomacyEvent extends CustomEvent {
    constructor(playerID) {
        super(RaiseDiplomacyEventName, { bubbles: true, cancelable: true, detail: { playerID } });
    }
}
//# sourceMappingURL=file:///base-standard/ui/diplomacy/diplomacy-events.js.map

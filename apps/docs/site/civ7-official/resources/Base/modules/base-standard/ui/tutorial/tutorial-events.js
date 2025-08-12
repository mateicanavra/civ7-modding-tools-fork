/**
 * @file tutorial-events
 * @copyright 2024, Firaxis Games
 * @description Events related to the tutorial system
 *
 */
/// <reference path="../../../core/ui/component-support.ts" />
export class LowerCalloutEvent extends CustomEvent {
    constructor(detail) {
        super('LowerCalloutEvent', { bubbles: false, cancelable: true, detail });
    }
}
export class LowerQuestPanelEvent extends CustomEvent {
    constructor(detail) {
        super('LowerQuestPanelEvent', { bubbles: false, cancelable: true, detail });
    }
}

//# sourceMappingURL=file:///base-standard/ui/tutorial/tutorial-events.js.map

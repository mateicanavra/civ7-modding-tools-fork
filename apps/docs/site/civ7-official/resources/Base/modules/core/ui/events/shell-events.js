/**
 * @file shell-events.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Event declaratons specific to the shell.
 */
export const GameCreatorOpenedEventName = 'game-creator-opened';
export class GameCreatorOpenedEvent extends CustomEvent {
    constructor() {
        super(GameCreatorOpenedEventName, { bubbles: false, cancelable: true });
    }
}
export const GameCreatorClosedEventName = 'game-creator-closed';
export class GameCreatorClosedEvent extends CustomEvent {
    constructor() {
        super(GameCreatorClosedEventName, { bubbles: false, cancelable: true });
    }
}
export const StartCampaignEventName = 'startCampaign';
export class StartCampaignEvent extends CustomEvent {
    constructor() {
        super(StartCampaignEventName, { bubbles: false, cancelable: true });
    }
}
export const SuspendCloseListenerEventName = 'suspend-close-listener';
export class SuspendCloseListenerEvent extends CustomEvent {
    constructor() {
        super(SuspendCloseListenerEventName, { bubbles: false, cancelable: true });
    }
}
export const ResumeCloseListenerEventName = 'resume-close-listener';
export class ResumeCloseListenerEvent extends CustomEvent {
    constructor() {
        super(ResumeCloseListenerEventName, { bubbles: false, cancelable: true });
    }
}
export const UpdateLiveNoticeEventName = 'update-live-notice';
export class UpdateLiveNoticeEvent extends CustomEvent {
    constructor() {
        super(UpdateLiveNoticeEventName, { bubbles: false, cancelable: true });
    }
}
export const MainMenuReturnEventName = 'main-menu-return';
export class MainMenuReturnEvent extends CustomEvent {
    constructor() {
        super(MainMenuReturnEventName, { bubbles: false, cancelable: true });
    }
}
export const SendCampaignSetupTelemetryEventName = 'send-campaign-setup-telemetry';
export class SendCampaignSetupTelemetryEvent extends CustomEvent {
    constructor(event, humanCount, participantCount) {
        super(SendCampaignSetupTelemetryEventName, { bubbles: false, cancelable: true, detail: { event, humanCount, participantCount } });
    }
}
//# sourceMappingURL=file:///core/ui/events/shell-events.js.map

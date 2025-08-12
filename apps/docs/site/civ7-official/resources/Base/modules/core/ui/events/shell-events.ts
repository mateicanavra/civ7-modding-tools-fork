/**
 * @file shell-events.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Event declaratons specific to the shell.
 */

export const GameCreatorOpenedEventName = 'game-creator-opened' as const;
export class GameCreatorOpenedEvent extends CustomEvent<{}> {
	constructor() {
		super(GameCreatorOpenedEventName, { bubbles: false, cancelable: true });
	}
}

export const GameCreatorClosedEventName = 'game-creator-closed' as const;
export class GameCreatorClosedEvent extends CustomEvent<{}> {
	constructor() {
		super(GameCreatorClosedEventName, { bubbles: false, cancelable: true });
	}
}

export const StartCampaignEventName = 'startCampaign' as const;
export class StartCampaignEvent extends CustomEvent<{}> {
	constructor() {
		super(StartCampaignEventName, { bubbles: false, cancelable: true });
	}
}

export const SuspendCloseListenerEventName = 'suspend-close-listener' as const;
export class SuspendCloseListenerEvent extends CustomEvent<{}> {
	constructor() {
		super(SuspendCloseListenerEventName, { bubbles: false, cancelable: true });
	}
}

export const ResumeCloseListenerEventName = 'resume-close-listener' as const;
export class ResumeCloseListenerEvent extends CustomEvent<{}> {
	constructor() {
		super(ResumeCloseListenerEventName, { bubbles: false, cancelable: true });
	}
}

export const UpdateLiveNoticeEventName = 'update-live-notice' as const;
export class UpdateLiveNoticeEvent extends CustomEvent<{}> {
	constructor() {
		super(UpdateLiveNoticeEventName, { bubbles: false, cancelable: true });
	}
}

export const MainMenuReturnEventName = 'main-menu-return' as const;
export class MainMenuReturnEvent extends CustomEvent<never> {
	constructor() {
		super(MainMenuReturnEventName, { bubbles: false, cancelable: true });
	}
}

export const SendCampaignSetupTelemetryEventName = 'send-campaign-setup-telemetry' as const;
export class SendCampaignSetupTelemetryEvent extends CustomEvent<{ event: CampaignSetupType, humanCount?: number | null, participantCount?: number | null }> {
	constructor(event: CampaignSetupType, humanCount?: number | null, participantCount?: number | null) {
		super(SendCampaignSetupTelemetryEventName, { bubbles: false, cancelable: true, detail: { event, humanCount, participantCount } });
	}
}

declare global {
	interface WindowEventMap {
		[GameCreatorOpenedEventName]: GameCreatorOpenedEvent;
		[GameCreatorClosedEventName]: GameCreatorClosedEvent;
		[StartCampaignEventName]: StartCampaignEvent;
		[SuspendCloseListenerEventName]: SuspendCloseListenerEvent;
		[ResumeCloseListenerEventName]: ResumeCloseListenerEvent;
		[SendCampaignSetupTelemetryEventName]: SendCampaignSetupTelemetryEvent;
	}
}

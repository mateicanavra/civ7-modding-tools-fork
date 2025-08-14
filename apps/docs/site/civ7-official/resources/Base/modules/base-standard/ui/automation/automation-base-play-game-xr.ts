//----------------------------------------------------------------
// Base PlayGame XR Test Handler
//----------------------------------------------------------------

console.log("loading automation-base-play-game-xr.ts");

import { AutomationBasePlayGame } from '/base-standard/ui/automation/automation-base-play-game.js';

export class AutomationBasePlayGameXR extends AutomationBasePlayGame {
	protected onTurnEnd(data: TurnState_EventData) {
		// Halt at the end of the turn to let the game settle for stable performance captures (XR performance tests) 
		const autoplayPauseWarmupDurationMs = Automation.getParameter("CurrentTest", "EndTurnAutoplayPauseWarmupDurationMS", 0);
		const autoplayPauseDurationMs = Automation.getParameter("CurrentTest", "EndTurnAutoplayPauseDurationMS", 0);

		if ((autoplayPauseWarmupDurationMs + autoplayPauseDurationMs) > 0) {
			XR.Autoplay.state = AutoplayState.PauseSettling;
			Automation.log("Autoplay pausing");

			setTimeout(() => {
				XR.Autoplay.state = AutoplayState.Paused;
				Automation.log("Autoplay paused");

				setTimeout(() => {
					XR.Autoplay.state = AutoplayState.Playing;
					Automation.log("Autoplay resumed");
				}, autoplayPauseDurationMs);
			}, autoplayPauseWarmupDurationMs);
		}

		super.onTurnEnd(data);
	}
}
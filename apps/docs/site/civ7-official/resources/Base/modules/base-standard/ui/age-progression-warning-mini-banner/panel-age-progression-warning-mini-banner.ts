/**
 * @file panel-age-progression-warning-mini-banner.ts
 * @copyright 2025, Firaxis Games
 * @description Displays a smaller warning that the age is about to end. Leaves by itself after a bit
 */

import Panel from "/core/ui/panel-support.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";

import AgeProgressionPopupManager, { AgeProgressionMiniBannerShowEventName, AgeProgressionPopupData } from "/base-standard/ui/age-progression-warning-popup/age-progression-warning-popup-manager.js";

class PanelAgeProgressionWarningMiniBanner extends Panel {

	private textElement!: HTMLElement;

	private _lifetimeSeconds: number = 1.5;

	private onStayTimerEndedListener = this.onStayTimerEnded.bind(this);
	private onAnimationEndListener = this.onAnimationEnd.bind(this);
	private onMiniBannerShowListener = this.onMiniBannerShow.bind(this);

	private waitTimerHandle: number = 0;

	onInitialize(): void {
		this.textElement = MustGetElement(".progress-banner__text", this.Root);
	}
	onAttach(): void {
		super.onAttach();
		window.addEventListener(AgeProgressionMiniBannerShowEventName, this.onMiniBannerShowListener);
	}
	onDetach(): void {
		this.Root.removeEventListener("animationend", this.onAnimationEndListener);
		window.removeEventListener(AgeProgressionMiniBannerShowEventName, this.onMiniBannerShowListener);
		super.onDetach();
	}

	private onMiniBannerShow(): void {
		const ageCountdownStarted: boolean = Game.AgeProgressManager.ageCountdownStarted;
		if (ageCountdownStarted) {
			const currentAgeProgressionData: AgeProgressionPopupData | null = AgeProgressionPopupManager.currentAgeProgressionPopupData;
			if (!currentAgeProgressionData) {
				console.error("panel-age-progression-warning-mini-banner.ts: onMiniBannerShow() - no age progression popup data was found!");
				return;
			}

			const turnsRemaining: number = currentAgeProgressionData.turnsRemaining;
			if (turnsRemaining == 0) {
				this.textElement.setAttribute("data-l10n-id", "LOC_UI_GAME_FINAL_TURN_OF_AGE");
			}
			else {
				this.textElement.textContent = Locale.compose("LOC_UI_X_TURNS_LEFT_UNTIL_AGE_END", currentAgeProgressionData.turnsRemaining);
			}

			if (this.waitTimerHandle > 0) {
				clearTimeout(this.waitTimerHandle);
				this.waitTimerHandle = 0;
			}

			this.Root.addEventListener("animationend", this.onAnimationEndListener);
			this.Root.classList.add("progress-banner__enter");
			this.Root.classList.remove("hidden", "progress-banner__exit");
		}
	}

	private onStayTimerEnded() {
		this.Root.classList.add("progress-banner__exit");
	}

	private onAnimationEnd() {
		//entering animation ended
		if (this.Root.classList.contains("progress-banner__enter")) {
			this.Root.classList.remove("progress-banner__enter");
			this.waitTimerHandle = setTimeout(this.onStayTimerEndedListener, this._lifetimeSeconds * 1000);
		}
		//leaving animation ended
		else if (this.Root.classList.contains("progress-banner__exit")) {
			this.Root.classList.remove("progress-banner__exit");
			this.Root.classList.add("hidden");
			this.Root.removeEventListener("animationend", this.onAnimationEndListener);
			AgeProgressionPopupManager.closePopup();
		}
	}
}

Controls.define('panel-age-progression-warning-mini-banner', {
	createInstance: PanelAgeProgressionWarningMiniBanner,
	description: 'Displays a smaller warning that the age is about to end. Leaves by itself after a bit.',
	content: ["fs://game/base-standard/ui/age-progression-warning-mini-banner/panel-age-progression-warning-mini-banner.html"],
	styles: ["fs://game/base-standard/ui/age-progression-warning-mini-banner/panel-age-progression-warning-mini-banner.css"],
	classNames: ['hidden']
});

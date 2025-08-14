/**
 * @file panel-age-progression-warning-mini-banner.ts
 * @copyright 2025, Firaxis Games
 * @description Displays a smaller warning that the age is about to end. Leaves by itself after a bit
 */
import Panel from "/core/ui/panel-support.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import AgeProgressionPopupManager, { AgeProgressionMiniBannerShowEventName } from "/base-standard/ui/age-progression-warning-popup/age-progression-warning-popup-manager.js";
class PanelAgeProgressionWarningMiniBanner extends Panel {
    constructor() {
        super(...arguments);
        this._lifetimeSeconds = 1.5;
        this.onStayTimerEndedListener = this.onStayTimerEnded.bind(this);
        this.onAnimationEndListener = this.onAnimationEnd.bind(this);
        this.onMiniBannerShowListener = this.onMiniBannerShow.bind(this);
        this.waitTimerHandle = 0;
    }
    onInitialize() {
        this.textElement = MustGetElement(".progress-banner__text", this.Root);
    }
    onAttach() {
        super.onAttach();
        window.addEventListener(AgeProgressionMiniBannerShowEventName, this.onMiniBannerShowListener);
    }
    onDetach() {
        this.Root.removeEventListener("animationend", this.onAnimationEndListener);
        window.removeEventListener(AgeProgressionMiniBannerShowEventName, this.onMiniBannerShowListener);
        super.onDetach();
    }
    onMiniBannerShow() {
        const ageCountdownStarted = Game.AgeProgressManager.ageCountdownStarted;
        if (ageCountdownStarted) {
            const currentAgeProgressionData = AgeProgressionPopupManager.currentAgeProgressionPopupData;
            if (!currentAgeProgressionData) {
                console.error("panel-age-progression-warning-mini-banner.ts: onMiniBannerShow() - no age progression popup data was found!");
                return;
            }
            const turnsRemaining = currentAgeProgressionData.turnsRemaining;
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
    onStayTimerEnded() {
        this.Root.classList.add("progress-banner__exit");
    }
    onAnimationEnd() {
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

//# sourceMappingURL=file:///base-standard/ui/age-progression-warning-mini-banner/panel-age-progression-warning-mini-banner.js.map

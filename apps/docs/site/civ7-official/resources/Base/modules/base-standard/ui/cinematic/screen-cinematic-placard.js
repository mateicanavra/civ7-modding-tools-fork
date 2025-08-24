/**
 * @file screen-cinematic-placard.ts
 * @copyright 2020-2024, Firaxis Games
 * @description A lower third with info on recently completed wonders
 */
import CinematicManager from '/base-standard/ui/cinematic/cinematic-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
class ScreenCinematicPlacard extends Component {
    setReplaying() { this.isReplaying = true; }
    clearReplaying() { this.isReplaying = false; }
    getPanelContent() {
        return this.isReplaying ? "replaying" : "";
    }
    constructor(root) {
        super(root);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.replayCinematicListener = this.onReplayCinematic.bind(this);
        this.closeCinematicListener = this.onCloseCinematic.bind(this);
        // No replay for the nuclear strike or disaster reveals, the effects just get overlayed and it looks bad.
        // Also, many of the effects are related to gameplay changing values on plots and those
        // are not going to be replayed.
        this.canReplay = true;
        this.hasQuote = true;
        this.canContinue = true;
        this.defaultTimeToWait = 30;
        // For signaling to the context manager if this is repeat request.
        this.isReplaying = false;
    }
    onAttach() {
        super.onAttach();
        const audio = CinematicManager.getCinematicAudio();
        if (audio) {
            UI.sendAudioEvent(audio);
        }
        const cinematicUIInfo = this.buildCinematicInfo();
        this.attachFunctionButtons();
        this.realizeCinematicUI(cinematicUIInfo);
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        window.addEventListener(InputEngineEventName, this.engineInputListener);
    }
    realizeCinematicUI(cinematicUIInfo) {
        const quoteTitleElement = MustGetElement(".cinematic-moment_title-header", this.Root);
        quoteTitleElement.setAttribute("title", cinematicUIInfo.cinematicTitle);
        const quoteSubtitleElement = MustGetElement(".cinematic-moment_title-subtitle", this.Root);
        quoteSubtitleElement.setAttribute("data-l10n-id", cinematicUIInfo.cinematicSubtitle);
        if (this.hasQuote) {
            const quoteTextElement = MustGetElement(".cinematic-moment_quote-text", this.Root);
            quoteTextElement.setAttribute("data-l10n-id", cinematicUIInfo.cinematicQuote);
            const quoteAuthorElement = MustGetElement(".cinematic-moment_quote-author-text", this.Root);
            quoteAuthorElement.setAttribute("title", cinematicUIInfo.cinematicAuthor);
        }
        else {
            const quoteContainerElement = MustGetElement(".cinematic-moment_quote-container", this.Root);
            quoteContainerElement.classList.add("hidden");
        }
        const quoteOverTitleElement = MustGetElement(".cinematic-moment_title-overtitle", this.Root);
        quoteOverTitleElement.setAttribute("data-l10n-id", cinematicUIInfo.cinematicOverTitle);
    }
    buildCinematicInfo() {
        return {
            cinematicTitle: "ErrorTitle",
            cinematicQuote: "ErrorQuote",
            cinematicAuthor: "ErrorAuthor",
            cinematicSubtitle: "ErrorSubtitle",
            cinematicOverTitle: "ErrorOverTitle"
        };
    }
    attachFunctionButtons() {
        const cinematicMomentReplayButton = MustGetElement(".cinematic-moment__replay-button", this.Root);
        cinematicMomentReplayButton.setAttribute("action-key", "inline-shell-action-1");
        const cinematicMomentCloseButton = MustGetElement(".cinematic-moment__close-button", this.Root);
        cinematicMomentCloseButton.setAttribute("action-key", "inline-cancel");
        if (!this.canReplay) {
            cinematicMomentReplayButton.classList.add("hidden");
        }
        else {
            cinematicMomentReplayButton.addEventListener("action-activate", this.replayCinematicListener);
        }
        if (!this.canContinue) {
            cinematicMomentCloseButton.classList.add("hidden");
            //if we can't press the button to continue out of the cinematic, we better have some duration specified!
            let timeToExit = Number(this.Root.getAttribute("autoCompleteDuration"));
            if (timeToExit == null) {
                console.warn(`screen-cinematic-placard: attachFunctionButtons - no 'autoCompleteDuration' attribute specified for a cine placard that has no continue button! Using a default of ${this.defaultTimeToWait} seconds.`);
                timeToExit = this.defaultTimeToWait;
            }
            setTimeout(this.closeCinematicListener, timeToExit * 1000);
        }
        else {
            cinematicMomentCloseButton.addEventListener("action-activate", this.closeCinematicListener);
        }
    }
    onDetach() {
        window.removeEventListener(InputEngineEventName, this.engineInputListener);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        Sound.play("Stop_Quote");
        super.onDetach();
    }
    onCloseCinematic() {
        CinematicManager.stop();
    }
    onReplayCinematic() {
        if (!this.canReplay) {
            console.error("screen-cinematic-placard: onReplayCinematic() - attempted to replay a cinematic that shouldn't be able to be replayed!");
            return;
        }
        this.setReplaying();
        CinematicManager.replayCinematic();
        this.clearReplaying();
        const audio = CinematicManager.getCinematicAudio();
        if (audio) {
            Sound.play("Stop_Quote");
            UI.sendAudioEvent(audio);
        }
    }
    onEngineInput(inputEvent) {
        if (ContextManager.getCurrentTarget() != this.Root) {
            // we are not on top of the stack so ignore the event
            // this can happen because we are listening to the event on window to handle the right click to stop
            return;
        }
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if ((inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') && this.canContinue) {
            CinematicManager.stop();
        }
        else if (inputEvent.detail.name == "shell-action-1" && this.canReplay) {
            this.onReplayCinematic();
        }
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
    }
    onNavigateInput(navigationEvent) {
        //shouldn't be able to navigate while this screen is up
        navigationEvent.preventDefault();
        navigationEvent.stopImmediatePropagation();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
}
class ScreenWonderCompletePlacard extends ScreenCinematicPlacard {
    buildCinematicInfo() {
        let quote = "";
        let title = "";
        let subtitle = "";
        let author = "";
        const overTitle = Locale.compose("LOC_UI_NEW_WONDER");
        const location = CinematicManager.getCinematicLocation();
        // walk the constructibles on the tile and find the wonder to get it's name
        const constructibles = MapConstructibles.getConstructibles(location.x, location.y);
        for (let i = 0; i < constructibles.length; i++) {
            const instance = Constructibles.getByComponentID(constructibles[i]);
            if (instance) {
                const info = GameInfo.Constructibles.lookup(instance.type);
                if (info?.ConstructibleClass == "WONDER") {
                    title = info.Name;
                    subtitle = Locale.compose("LOC_WONDER_MOVIE_SUBTITLE_YEAR", Cities.get(instance.cityId).name, Game.getTurnDate());
                    const wonderQuote = GameInfo.TypeQuotes.lookup(info.ConstructibleType);
                    if (wonderQuote) {
                        quote = wonderQuote.Quote;
                        author = wonderQuote.QuoteAuthor ?? '';
                    }
                    break;
                }
            }
        }
        return { cinematicTitle: title, cinematicQuote: quote, cinematicAuthor: author, cinematicSubtitle: subtitle, cinematicOverTitle: overTitle };
    }
}
class ScreenNaturalWonderRevealedPlacard extends ScreenCinematicPlacard {
    buildCinematicInfo() {
        let quote = "";
        let title = "";
        const subtitle = Game.getTurnDate();
        let author = "";
        const overTitle = Locale.compose("LOC_UI_NEW_NATURAL_WONDER");
        const location = CinematicManager.getCinematicLocation();
        const featureType = GameplayMap.getFeatureType(location.x, location.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (feature) {
            const featureQuote = GameInfo.TypeQuotes.lookup(feature.FeatureType);
            if (featureQuote) {
                quote = featureQuote.Quote;
                author = featureQuote.QuoteAuthor ?? '';
            }
            title = feature.Name;
        }
        return { cinematicTitle: title, cinematicQuote: quote, cinematicAuthor: author, cinematicSubtitle: subtitle, cinematicOverTitle: overTitle };
    }
}
class ScreenVictoryPlacard extends ScreenCinematicPlacard {
    onInitialize() {
        this.canReplay = false;
        this.hasQuote = false;
        this.canContinue = false;
    }
    buildCinematicInfo() {
        let title = "";
        let subtitle = Game.getTurnDate();
        const victoryType = this.Root.getAttribute("victoryType");
        if (!victoryType) {
            console.error("ScreenVictoryPlacard: buildCinematicInfo() - no victoryType attribute specified!");
            return { cinematicTitle: title, cinematicQuote: "", cinematicAuthor: "", cinematicSubtitle: subtitle, cinematicOverTitle: "" };
        }
        switch (victoryType) {
            case "VICTORY_MODERN_SCIENCE":
                title = Locale.compose("LOC_UI_CINEMATIC_FIRST_SPACE_FLIGHT");
                subtitle = Locale.compose("LOC_UI_CINEMATIC_LAUNCHED", Game.getTurnDate());
                break;
            case "VICTORY_MODERN_ECONOMIC":
                title = Locale.compose("LOC_UI_CINEMATIC_WORLD_BANK");
                subtitle = Locale.compose("LOC_UI_CINEMATIC_ESTABLISHED", Game.getTurnDate());
                break;
            case "VICTORY_MODERN_MILITARY":
                //gandhi is proud ofy o9u
                title = Locale.compose("LOC_UI_CINEMATIC_OPERATION_IVY_TITLE");
                subtitle = Locale.compose("LOC_WONDER_MOVIE_SUBTITLE_YEAR", "LOC_UI_CINEMATIC_OPERATION_IVY_SUBTITLE", Game.getTurnDate());
                break;
            case "VICTORY_MODERN_CULTURE":
                title = Locale.compose("LOC_UI_CINEMATIC_WORLDS_FAIR");
                subtitle = Locale.compose("LOC_UI_CINEMATIC_COMPLETED", Game.getTurnDate());
                break;
            default:
                break;
        }
        return { cinematicTitle: title, cinematicQuote: "", cinematicAuthor: "", cinematicSubtitle: subtitle, cinematicOverTitle: "" };
    }
}
class ScreenNaturalDisasterPlacard extends ScreenCinematicPlacard {
    onInitialize() {
        this.canReplay = false;
        this.hasQuote = false;
    }
    buildCinematicInfo() {
        let title = "";
        let subtitle = "";
        const overTitle = Locale.compose("LOC_UI_NATURAL_DISASTER_OCCURRING");
        const location = CinematicManager.getCinematicLocation();
        const plotIndex = GameplayMap.getIndexFromLocation(location);
        const stormID = MapStorms.getActiveStormIDAtPlot(plotIndex);
        if (stormID) {
            const stormInfo = MapStorms.getStorm(stormID);
            if (!stormInfo) {
                console.error(`ScreenNaturalDisasterPlacard: buildCinematicInfo() - No stormInfo found for stormID ${stormID}`);
                return { cinematicTitle: "", cinematicQuote: "", cinematicAuthor: "", cinematicSubtitle: subtitle, cinematicOverTitle: "" };
            }
            const stormDefinition = GameInfo.RandomEvents.lookup(stormInfo.type);
            title = Locale.compose(stormDefinition?.Name ?? "ErrorTitle");
            subtitle = Game.getTurnDate();
        }
        else if (MapFeatures.isVolcanoActiveAt(plotIndex)) {
            subtitle = Locale.compose("LOC_WONDER_MOVIE_SUBTITLE_YEAR", "LOC_UI_VOLCANIC_ERUPTION", Game.getTurnDate());
            title = Locale.compose(GameplayMap.getVolcanoName(location.x, location.y));
        }
        else {
            const riverType = GameplayMap.getRiverType(location.x, location.y);
            if (riverType != RiverTypes.NO_RIVER) {
                subtitle = Locale.compose("LOC_WONDER_MOVIE_SUBTITLE_YEAR", Locale.compose("LOC_WONDER_MOVIE_FLOOD"), Game.getTurnDate());
                title = Locale.compose(GameplayMap.getRiverName(location.x, location.y));
            }
        }
        return { cinematicTitle: title, cinematicQuote: "", cinematicAuthor: "", cinematicSubtitle: subtitle, cinematicOverTitle: overTitle };
    }
}
Controls.define('screen-cinematic-generic-placard', {
    createInstance: ScreenCinematicPlacard,
    description: 'Generic placeholder Placard for cinematics',
    styles: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.css"],
    content: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.html"],
    classNames: ["fullscreen"],
    attributes: [],
    tabIndex: -1,
});
Controls.define('screen-natural-wonder-revealed-placard', {
    createInstance: ScreenNaturalWonderRevealedPlacard,
    description: 'Supplemental Information for the Natural Wonder Revealed Movie',
    styles: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.css"],
    content: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.html"],
    classNames: ["fullscreen"],
    attributes: [],
    tabIndex: -1,
});
Controls.define('screen-wonder-complete-placard', {
    createInstance: ScreenWonderCompletePlacard,
    description: 'Supplemental Information for the Wonder Movie',
    styles: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.css"],
    content: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.html"],
    classNames: ["fullscreen"],
    attributes: [],
    tabIndex: -1,
});
Controls.define('screen-victory-cinematic', {
    createInstance: ScreenVictoryPlacard,
    description: 'Supplemental Information for victory cinematics',
    styles: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.css"],
    content: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.html"],
    classNames: ["fullscreen"],
    attributes: [],
    tabIndex: -1,
});
Controls.define('screen-natural-disaster-placard', {
    createInstance: ScreenNaturalDisasterPlacard,
    description: 'Supplemental Information for the Natural Disaster Movie',
    styles: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.css"],
    content: ["fs://game/base-standard/ui/cinematic/screen-cinematic-placard.html"],
    classNames: ["fullscreen"],
    attributes: [],
    tabIndex: -1,
});

//# sourceMappingURL=file:///base-standard/ui/cinematic/screen-cinematic-placard.js.map

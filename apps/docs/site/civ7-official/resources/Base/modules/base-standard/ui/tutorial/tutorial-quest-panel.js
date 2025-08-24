/**
 * @file tutorial-quest-panel.ts
 * @copyright 2024, Firaxis Games
 * @description An selection panel for advisor quests, allows to select a quest path for the player.
 */
/// <reference path="../../../core/ui/component-support.ts" />
import { TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import QuestTracker from "/base-standard/ui/quest-tracker/quest-tracker.js";
import { LowerQuestPanelEvent } from '/base-standard/ui/tutorial/tutorial-events.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
class TutorialQuestPanel extends Component {
    constructor(root) {
        super(root);
        this.itemID = "";
        this.isClosed = true; // Is this in a closed stated?
        this.selectedAdvisorQuestPath = AdvisorTypes.NO_ADVISOR;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
        this.onAdvisorButtonSelected = (pathName, pathDescription) => {
            //no point asking for a confirmation if there's only one advisor to pick.
            //It's kinda silly for players who know how to use advanced options to also have tutorials on but...
            if (this.data?.advisors.length == 1) {
                this.close();
                return;
            }
            const actionCallback = (action) => {
                if (action == DialogBoxAction.Confirm) {
                    this.close();
                }
            };
            const confirmOption = {
                actions: ["accept"],
                label: "LOC_TUTORIAL_CALLOUT_CONTINUE",
                callback: actionCallback,
            };
            const cancelCallback = () => {
                actionCallback(DialogBoxAction.Cancel);
            };
            const cancelOption = {
                actions: ["cancel", "keyboard-escape"],
                label: "LOC_TUTORIAL_CALLOUT_GO_BACK",
                callback: cancelCallback
            };
            const options = [confirmOption, cancelOption];
            DialogManager.createDialog_MultiOption({
                body: Locale.compose("LOC_TUTORIAL_QUEST_CONFIRM_BODY", pathDescription, Locale.compose("LOC_TUTORIAL_QUEST_PATH_ADVISOR", pathName)),
                title: Locale.compose("LOC_TUTORIAL_QUEST_CONFIRM_TITLE", pathName),
                options: options,
                canClose: false,
                displayQueue: "TutorialManager",
                addToFront: true,
            });
        };
    }
    onAttach() {
        super.onAttach();
        if (!this.isClosed) {
            console.error("tutorial-quest-panel: onAttach(): Attempting to load tutorial quest panel content when it's not marked as 'closed'. id: ", this.itemID);
            return;
        }
        this.itemID = this.Root.getAttribute("itemID") ?? "";
        if (this.itemID == "") {
            console.warn("tutorial-quest-panel: onAttach(): Loading a tutorial quest panel but no associated item ID was passed in.");
        }
        const calloutDataSerialized = this.Root.getAttribute("value");
        if (!calloutDataSerialized) {
            console.warn("tutorial-quest-panel: onAttach(): Could not raise tutorial quest panel because no data was passed in. id: ", this.itemID);
            return;
        }
        const serializedData = JSON.parse(calloutDataSerialized);
        if (!serializedData) {
            console.error("tutorial-quest-panel: onAttach(): Could not raise tutorial quest panel because data provided wasn't a valid definition. id: ", this.itemID);
            return;
        }
        this.data = serializedData;
        //put advisors representing a disabled legacy path on The Bench.
        const enabledLegacyPaths = Players.get(GameContext.localPlayerID)?.LegacyPaths?.getEnabledLegacyPaths();
        this.data.advisors = this.data.advisors.filter(advisor => enabledLegacyPaths?.find(lPath => lPath.legacyPathClass == Database.makeHash(advisor.legacyPathClassType)));
        if (this.data.title) {
            this.Root.classList.toggle('show-title', this.data.title != "");
            const title = Locale.compose(this.data.title);
            this.setHTMLInDivClass(title, "tutorial-quest-panel-title");
        }
        this.setHTMLInDivClass(Locale.compose(this.getContentData() || ""), "tutorial-quest-panel-body-text");
        this.setAdvisors();
        this.Root.classList.add(TutorialAnchorPosition.MiddleCenter);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.nextID = undefined;
        this.selectedAdvisorQuestPath = AdvisorTypes.NO_ADVISOR;
        this.isClosed = false;
        Audio.playSound("data-audio-showing", "tutorial-quest-panel");
    }
    onDetach() {
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        super.onDetach();
        Audio.playSound("data-audio-hiding", "tutorial-quest-panel");
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Input.setActiveContext(InputContext.Shell);
        const advisorButton = this.Root.querySelector('.quest-advisor-button');
        if (advisorButton) {
            Focus.setContextAwareFocus(advisorButton, this.Root);
        }
        else {
            const exitButton = MustGetElement('.quest-advisor__emergency-exit', this.Root);
            Focus.setContextAwareFocus(exitButton, this.Root);
        }
    }
    getContentData() {
        const item = TutorialManager.getCalloutItem(this.itemID);
        if (!item) {
            console.error("tutorial-quest-panel: getContentData(): Attempting to get tutorial item but not found, id: ", this.itemID);
            return;
        }
        const questPanelDefine = item.questPanel;
        if (!questPanelDefine) {
            console.error("tutorial-quest-panel: getContentData(): Tutorial: Quest Panel data missing; cannot raise. id: ", this.itemID);
            return;
        }
        // Resolve LOC strings and apply any parameters that are to be passed in.
        // Does a body parameter script that needs to be run before passing data to callout?
        let params = [];
        let content = "";
        const hasAdvisors = this.data.advisors.length > 0;
        if (hasAdvisors) {
            if (questPanelDefine.description) {
                content = questPanelDefine.description.text;
            }
            if (questPanelDefine.description?.getLocParams) {
                params = questPanelDefine.description.getLocParams(item);
            }
        }
        else {
            if (questPanelDefine.altNoAdvisorsDescription) {
                content = questPanelDefine.altNoAdvisorsDescription.text;
            }
            if (questPanelDefine.altNoAdvisorsDescription?.getLocParams) {
                params = questPanelDefine.altNoAdvisorsDescription.getLocParams(item);
            }
        }
        let prompts = [];
        if (questPanelDefine.actionPrompts) {
            prompts = TutorialSupport.getTutorialPrompts(questPanelDefine.actionPrompts);
        }
        return Locale.stylize(content, ...params, ...prompts);
    }
    setAdvisors() {
        if (this.data == null) {
            console.error("tutorial-quest-panel: setAdvisors(): Could not raise tutorial quest panel because data provided wasn't a valid definition. id: ", this.itemID);
            return;
        }
        const advisorsContainer = MustGetElement('.tutorial-quest-panel-advisors', this.Root);
        while (advisorsContainer.hasChildNodes()) {
            advisorsContainer.removeChild(advisorsContainer.lastChild);
        }
        if (this.data.advisors.length == 0) {
            const exitButton = document.createElement("fxs-button");
            exitButton.setAttribute("caption", "LOC_GENERIC_CONTINUE");
            exitButton.classList.add("quest-advisor__emergency-exit", "w-96", "self-center");
            exitButton.addEventListener("action-activate", this.close.bind(this));
            MustGetElement(".tutorial-quest-panel-body", this.Root).appendChild(exitButton);
            return;
        }
        for (let advisor of this.data.advisors) {
            const advisorElement = document.createElement('fxs-vslot');
            advisorElement.classList.add("quest-advisor-element", "flex", "flex-col", "my-4", "flex-auto", "justify-between", "max-w-96");
            const advisorCardBg = document.createElement('div');
            advisorCardBg.classList.add("quest-advisor-card-backdrop", "absolute", "inset-0");
            advisorElement.appendChild(advisorCardBg);
            const advisorCardFiligree = document.createElement('div');
            advisorCardFiligree.classList.add("quest-advisor-card-filigree", "absolute", "top-20", "h-18", "w-full");
            advisorElement.appendChild(advisorCardFiligree);
            const advisorPicContainer = document.createElement('div');
            advisorPicContainer.classList.add("relative", "flex", "self-center", "pb-2");
            const advisorBg = document.createElement('div');
            advisorBg.classList.add("quest-advisor-bg", "bg-cover", "bg-no-repeat");
            advisorPicContainer.appendChild(advisorBg);
            let advisorType = "";
            switch (advisor.type) {
                case AdvisorTypes.CULTURE:
                    advisorType = "ADVISOR_CULTURE";
                    break;
                case AdvisorTypes.ECONOMIC:
                    advisorType = "ADVISOR_ECONOMIC";
                    break;
                case AdvisorTypes.MILITARY:
                    advisorType = "ADVISOR_MILITARY";
                    break;
                case AdvisorTypes.SCIENCE:
                    advisorType = "ADVISOR_SCIENCE";
                    break;
            }
            const advisorImage = document.createElement('div');
            advisorImage.classList.add("quest-advisor-portrait", "absolute", "inset-0", "bg-cover", "bg-no-repeat");
            advisorImage.style.backgroundImage = UI.getIconCSS(advisorType, "CIRCLE_MASK");
            advisorPicContainer.appendChild(advisorImage);
            const advisorTypeIconBg = document.createElement('div');
            advisorTypeIconBg.classList.add("quest-advisor-type-icon-bg", "absolute", "inset-0", "bg-cover", "bg-no-repeat");
            advisorPicContainer.appendChild(advisorTypeIconBg);
            const advisorTypeIcon = document.createElement('div');
            advisorTypeIcon.classList.add("quest-advisor-type-icon", "absolute", "inset-0", "bg-cover", "bg-no-repeat");
            advisorTypeIcon.style.backgroundImage = UI.getIconCSS(advisorType, "BADGE");
            advisorPicContainer.appendChild(advisorTypeIcon);
            advisorElement.appendChild(advisorPicContainer);
            const advisorQuoteContainer = document.createElement('div');
            advisorQuoteContainer.classList.add("relative", "my-2", "mx-4");
            const advisorQuoteBackground = document.createElement('fxs-inner-frame');
            advisorQuoteBackground.classList.add("quest-advisor-quote-background", "absolute", "size-full");
            const advisorQuote = document.createElement('div');
            advisorQuote.classList.add("quest-advisor-quote", "m-3", "relative", "font-body", "text-base", "text-accent-2", "self-center");
            advisorQuote.innerHTML = Locale.compose(advisor.quote || "");
            advisorQuoteContainer.appendChild(advisorQuoteBackground);
            advisorQuoteContainer.appendChild(advisorQuote);
            const optionDef = advisor.button;
            const caption = Locale.compose(optionDef.text);
            if (caption == undefined || caption == null) {
                console.error("tutorial-callout: setupOption(): Missing caption");
                continue;
            }
            const advisorButton = document.createElement('fxs-button');
            advisorButton.classList.add("quest-advisor-button", "mx-3", "mb-2", "leading-none", "h-14", "text-center");
            if (optionDef.nextID && QuestTracker.isQuestVictoryInProgress(optionDef.questID)) {
                advisorButton.setAttribute("disabled", "true");
                advisorButton.setAttribute("caption", "LOC_TUTORIAL_QUEST_ALREADY_FOLLOWING");
            }
            else {
                advisorButton.setAttribute("caption", caption);
                advisorButton.setAttribute("tabindex", '-1');
            }
            advisorButton.addEventListener("action-activate", () => {
                if (optionDef.closes && !this.isClosed) {
                    this.selectedAdvisorQuestPath = advisor.type;
                    this.nextID = optionDef.nextID;
                    this.onAdvisorButtonSelected(optionDef.text, optionDef.pathDesc);
                }
            });
            advisorElement.appendChild(advisorQuoteContainer);
            advisorElement.appendChild(advisorButton);
            advisorsContainer.appendChild(advisorElement);
        }
        const advisorButtons = MustGetElement('.tutorial-quest-panel-advisors', this.Root);
        FocusManager.setFocus(advisorButtons);
    }
    /// Helper
    setHTMLInDivClass(innerHTML, cssClassName) {
        const element = this.Root.querySelector(`.${cssClassName}`);
        if (!element) {
            console.warn("tutorial-callout: setStringInDivClass(): Missing element with '." + cssClassName + "'");
            return;
        }
        element.innerHTML = Locale.stylize(innerHTML);
    }
    onEngineInput(inputEvent) {
        // Only process finished messages, early out to others.
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        // Except for a call to raise the pause menu, or camera pans, consume all other input...
        if (inputEvent.detail.name.startsWith("camera")) {
            return;
        }
        else if (inputEvent.detail.name == "sys-menu" || inputEvent.detail.name == "keyboard-escape") {
            this.Root.classList.remove('trigger-nav-help');
            return;
        }
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
    }
    onActiveDeviceTypeChanged() {
        this.setHTMLInDivClass(Locale.compose(this.getContentData() || ""), "tutorial-callout-body-text");
        this.setAdvisors();
    }
    close() {
        if (this.isClosed) {
            console.error("tutorial-callout: close(): Tutorial callout being closed when already marked closed. id: ", this.itemID);
        }
        window.dispatchEvent(new LowerQuestPanelEvent({
            itemID: this.itemID,
            nextID: this.nextID,
            advisorPath: this.selectedAdvisorQuestPath,
            closed: true
        }));
        this.isClosed = true;
    }
}
Controls.define('tutorial-quest-panel', {
    createInstance: TutorialQuestPanel,
    description: 'Panel to select a quest path.',
    styles: ['fs://game/base-standard/ui/tutorial/tutorial-quest-panel.css'],
    content: ['fs://game/base-standard/ui/tutorial/tutorial-quest-panel.html'],
    classNames: ["size-full", "relative"],
    tabIndex: -1
});

//# sourceMappingURL=file:///base-standard/ui/tutorial/tutorial-quest-panel.js.map

/**
 * @file age-transition-civ-card.ts
 * @copyright 2024, Firaxis Games
 * @description Displays compact information about a civilization
 */
import FxsActivatable, { ActionActivateEvent } from "/core/ui/components/fxs-activatable.js";
export class AgeTransitionCivCard extends FxsActivatable {
    constructor(root) {
        super(root);
        this.background = document.createElement("div");
        this.content = document.createElement("div");
        this.focusBorder = document.createElement("div");
        this.civName = document.createElement("fxs-header");
        this.civTraits = document.createElement("div");
        this.civIcon = document.createElement("fxs-icon");
        this.hoverInfo = document.createElement("div");
        this.abilityTitle = document.createElement("fxs-header");
        this.bonusList = document.createElement("div");
        this.historicalChoiceInfo = document.createElement("div");
        this.historicalChoiceReason = document.createElement("div");
        this.historicalChoiceIcon = document.createElement("div");
        this.historicalChoiceIconLeader = document.createElement("fxs-icon");
        this.selectCivButton = document.createElement("fxs-button");
        this.lockIcon = document.createElement("div");
        this.unlockedInfo = document.createElement("div");
        this.lockedInfo = document.createElement("div");
        this.Root.setAttribute("data-audio-group-ref", "new-civ-select");
        this.Root.classList.add("age-transition-civ-card", "img-card-button", "flex", "justify-stretch", "items-stretch");
        const fragment = document.createDocumentFragment();
        this.background.classList.add("flex-auto", "flex", "bg-cover", "justify-stretch", "items-stretch", "m-0\\.5", "relative");
        fragment.appendChild(this.background);
        this.content.classList.add("flex-auto", "flex", "flex-col", "items-center");
        this.background.appendChild(this.content);
        this.focusBorder.classList.add("age-transition-civ-card-focus-border", "img-card-button-focus", "opacity-0", "absolute", "inset-0", "pointer-events-none");
        this.content.appendChild(this.focusBorder);
        const focusBorderFiligrees = document.createElement("div");
        focusBorderFiligrees.classList.add("age-transition-civ-card-filigree", "absolute", "-top-8", "left-0", "-right-0\\.5", "flex", "flex-row");
        this.focusBorder.appendChild(focusBorderFiligrees);
        const focusBorderLeftFiligree = document.createElement("div");
        focusBorderLeftFiligree.classList.add("img-top-filigree-left", "grow");
        focusBorderFiligrees.appendChild(focusBorderLeftFiligree);
        const focusBorderCenterFiligree = document.createElement("div");
        focusBorderCenterFiligree.classList.add("img-top-filigree-center");
        focusBorderFiligrees.appendChild(focusBorderCenterFiligree);
        const focusBorderRightFiligree = document.createElement("div");
        focusBorderRightFiligree.classList.add("img-top-filigree-right", "grow");
        focusBorderFiligrees.appendChild(focusBorderRightFiligree);
        this.civName.classList.add("age-transition-civ-card-name", "font-title-lg", "mt-5", "text-shadow", "uppercase");
        this.civName.setAttribute("filigree-style", "none");
        this.content.appendChild(this.civName);
        this.civTraits.classList.add("font-body-base", "text-shadow", "text-accent-1");
        this.content.appendChild(this.civTraits);
        this.civIcon.classList.add("age-transition-civ-card-icon", "size-21");
        this.content.appendChild(this.civIcon);
        const spacer = document.createElement("div");
        spacer.classList.add("flex-auto", "flex", "flex-col", "items-center", "justify-center");
        this.content.appendChild(spacer);
        this.lockIcon.classList.add("age-transition-civ-card-locked", "size-20", "hidden");
        spacer.appendChild(this.lockIcon);
        this.lockedInfo.classList.add("hidden", "flex", "flex-col", "items-center");
        this.hoverInfo.appendChild(this.lockedInfo);
        this.hoverInfo.classList.add("age-transition-civ-card-hover-info", "flex", "flex-col", "items-center", "text-center", "opacity-0");
        this.content.appendChild(this.hoverInfo);
        this.unlockedInfo.classList.add("hidden", "flex", "flex-col", "items-center", "p-2", "mx-4", "max-w-full", "relative");
        this.hoverInfo.appendChild(this.unlockedInfo);
        this.abilityTitle.classList.add("font-title-sm", "text-shadow", "uppercase", "text-accent-1", "text-gradient-accent-1");
        this.abilityTitle.setAttribute("filigree-style", "none");
        this.unlockedInfo.appendChild(this.abilityTitle);
        this.bonusList.classList.add("flex", "flex-wrap");
        this.unlockedInfo.appendChild(this.bonusList);
        this.historicalChoiceInfo = document.createElement("div");
        this.historicalChoiceInfo.classList.add("hidden", "flex", "flex-col", "items-center");
        this.unlockedInfo.appendChild(this.historicalChoiceInfo);
        const seperator = document.createElement('div');
        seperator.classList.add("filigree-divider-inner-frame", "w-64");
        this.historicalChoiceInfo.appendChild(seperator);
        this.historicalChoiceReason.classList.add("font-body-sm", "text-shadow-br", "mx-1", "max-w-64", "text-center");
        this.historicalChoiceInfo.appendChild(this.historicalChoiceReason);
        this.historicalChoiceIcon.classList.add("img-historical-choice", "w-8", "h-8", "-right-4", "-top-4", "absolute", "hidden");
        this.content.appendChild(this.historicalChoiceIcon);
        this.historicalChoiceIconLeader.classList.add("img-historical-choice", "w-8", "h-8");
        this.historicalChoiceIconLeader.setAttribute("data-icon-context", "LEADER");
        this.historicalChoiceIcon.appendChild(this.historicalChoiceIconLeader);
        this.selectCivButton.classList.add("m-2", "w-72");
        this.selectCivButton.setAttribute("action-key", "inline-accept");
        this.selectCivButton.setAttribute("caption", "LOC_AGE_TRANSITION_VIEW_DETAILS");
        this.selectCivButton.setAttribute("data-audio-press-ref", "none");
        this.selectCivButton.addEventListener("action-activate", (event) => {
            this.Root.dispatchEvent(new ActionActivateEvent(event.detail.x, event.detail.y));
        });
        this.hoverInfo.appendChild(this.selectCivButton);
        this.Root.appendChild(fragment);
    }
    getCivData() {
        return this.civData;
    }
    setCivData(civData) {
        this.civData = civData;
        const civNameOnly = civData.civID.replace("CIVILIZATION_", "").toLowerCase();
        this.background.style.backgroundImage = `url('fs://game/bg-card-${civNameOnly}.png')`;
        this.civName.setAttribute("title", civData.name);
        this.civTraits.innerHTML = civData.tags.join(", ");
        this.civIcon.style.backgroundImage = `url("${civData.icon}")`;
        if (this.civData.isLocked) {
            this.content.classList.add("age-transition-civ-card-content-locked");
            this.lockedInfo.classList.remove("hidden");
            this.lockIcon.classList.remove("hidden");
            this.lockedInfo.innerHTML = "";
            for (const unlockBy of this.civData.unlockedBy) {
                const unlockByInfo = document.createElement("div");
                unlockByInfo.classList.add("font-body-sm", "text-shadow-br", "mx-1");
                unlockByInfo.innerHTML = Locale.stylize(unlockBy.text);
                this.lockedInfo.appendChild(unlockByInfo);
            }
        }
        else {
            this.content.classList.add("age-transition-civ-card-darkening");
            this.unlockedInfo.classList.remove("hidden");
            this.abilityTitle.setAttribute("title", civData.abilityTitle);
            this.bonusList.innerHTML = "";
            for (const bonus of civData.bonuses) {
                const bonusItemBorder = document.createElement("div");
                bonusItemBorder.classList.add("img-simple-square", "size-12", "m-2", "pointer-events-auto");
                bonusItemBorder.setAttribute("data-tooltip-content", `[n][style:font-title-lg]${bonus.title}[/style][n][style:font-body-base]${bonus.text}[/style]`);
                this.bonusList.appendChild(bonusItemBorder);
                const bonusItemIcon = document.createElement("fxs-icon");
                bonusItemIcon.classList.add("size-12");
                bonusItemIcon.setAttribute("data-icon-id", bonus.icon);
                bonusItemIcon.setAttribute("data-icon-context", "CIV_BONUS");
                bonusItemBorder.appendChild(bonusItemIcon);
            }
        }
        if (civData.isHistoricalChoice) {
            this.historicalChoiceInfo.classList.remove("hidden");
            this.historicalChoiceReason.innerHTML = Locale.stylize(civData.historicalChoiceReason ?? "");
            const leaderParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
            const leaderIcon = leaderParameter ? GameSetup.resolveString(leaderParameter.value.icon) : "";
            this.historicalChoiceIconLeader.setAttribute("data-icon-id", leaderIcon ?? "");
            this.historicalChoiceIcon.classList.remove("hidden");
        }
    }
}
Controls.define('age-transition-civ-card', {
    createInstance: AgeTransitionCivCard,
    description: 'Single-player era transition civ select card.',
    styles: ["fs://game/core/ui/shell/age-transition/age-transition-civ-card.css"],
    tabIndex: -1,
});

//# sourceMappingURL=file:///core/ui/shell/age-transition/age-transition-civ-card.js.map

/**
 * @file panel-advisor-victory.ts
 * @copyright 2024, Firaxis Games
 * @description Panel which displays specific advisor quest for victory and current ranking
 */
import AdvisorProgress from '/base-standard/ui/victory-progress/model-advisor-victory.js';
import Panel from '/core/ui/panel-support.js';
import { VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
const PROGRESS_BAR_WIDTH = 1250;
const PROGRESS_BAR_MIN_WIDTH = 950;
const MOBILE_PROGRESS_BAR_WIDTH = 1180;
const MOBILE_PROGRESS_BAR_MIN_WIDTH = 1050;
const CIVILOPEDIA_VICTORY_PLACEHOLDER = "CIVILOPEDIA_VICTORY_PLACEHOLDER";
class PanelAdvisorVictory extends Panel {
    constructor() {
        super(...arguments);
        this.trackVictoryActivateListener = this.onTrackVictoryActivate.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.civilopediaListener = this.onCivilopediaButtonInput.bind(this);
        this.onRadioButtonListener = this.onRadioButtonInput.bind(this);
        this.carousel = null;
        this.carouselIndex = 0;
        this.selectedAgeType = "";
        this.selectedAdvisor = null;
        this.playerData = null;
        this.activeQuest = undefined;
        this.victoryQuests = [];
        this.radioButtons = [];
        this.isTopFocused = true;
        this.selectedRewardIndex = 0;
        this.rewardElemends = [];
        this.showVictoryDetailsLink = false;
        this.isTracked = false;
    }
    onAttach() {
        const currentAge = GameInfo.Ages.lookup(Game.age);
        if (!currentAge) {
            console.error(`panel-advisor-victory: Failed to get current age for hash ${Game.age}`);
            return;
        }
        this.selectedAgeType = currentAge.AgeType;
        this.showVictoryDetailsLink = this.selectedAgeType === "AGE_MODERN" ? true : false;
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        this.render();
        super.onAttach();
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        super.onDetach();
    }
    render() {
        while (this.Root.lastChild) {
            this.Root.removeChild(this.Root.lastChild);
        }
        const advisor = this.Root.getAttribute('advisor-type');
        if (!advisor) {
            console.error('panel-advisor-victory: Failed to get advisor type');
            return;
        }
        const advisorType = +advisor;
        this.selectedAdvisor = advisorType;
        const victoryData = AdvisorProgress.victoryData.get(this.selectedAgeType);
        this.activeQuest = AdvisorProgress.getActiveQuest(this.selectedAdvisor);
        if (!victoryData) {
            console.error('panel-advisor-victory: Failed to get the victory data for the desired age');
            return;
        }
        this.playerData = AdvisorProgress.getPlayerProgress(this.selectedAdvisor, this.selectedAgeType);
        if (!this.playerData) {
            console.error('panel-advisor-victory: No local player was found');
            return;
        }
        if (this.activeQuest) {
            this.isTracked = AdvisorProgress.isQuestTracked(this.activeQuest);
        }
        this.victoryQuests = AdvisorProgress.getQuestsByAdvisor(this.selectedAdvisor);
        const chosenVictory = victoryData.find(victory => victory.ClassType == AdvisorProgress.getLegacyPathClassTypeByAdvisorType(advisorType));
        if (!chosenVictory) {
            console.error('panel-advisor-victory: render - Failed to get victoryData');
            return;
        }
        const advisorPanel = document.createElement('div');
        advisorPanel.classList.add('advisor-panal_wrapper', 'w-full', 'flow-column', 'justify-center', 'flex-auto');
        advisorPanel.appendChild(this.renderTopPanel(chosenVictory, advisorType));
        advisorPanel.appendChild(this.renderBottomPanel(advisorType));
        this.Root.appendChild(advisorPanel);
    }
    createVictoryCivilopediaLink() {
        const victoryLinkWrapper = document.createElement('div');
        victoryLinkWrapper.classList.add('advisor-panel_civilopedia-link');
        const victoryTitleContainer = document.createElement('div');
        const victoryTextContainer = document.createElement('fxs-activatable');
        victoryTitleContainer.classList.value = 'font-title text-base justify-center uppercase relative items-center flex-col flex-nowrap text-center text-gradient-secondary font-bold tracking-150';
        const victoryTitle = document.createElement('div');
        victoryTitle.setAttribute('data-l10n-id', 'LOC_VICTORY_VICTORY');
        const filigree = document.createElement('img');
        filigree.src = 'fs://game/shell_small-filigree.png';
        filigree.classList.add('h-4', 'w-84', 'mt-1');
        victoryTitleContainer.appendChild(victoryTitle);
        victoryTitleContainer.appendChild(filigree);
        victoryTextContainer.classList.value = 'text-xs font-body pointer-events-auto';
        const victoryText = this.createCivilopediaText();
        victoryTextContainer.appendChild(victoryText);
        victoryTextContainer.addEventListener('action-activate', this.civilopediaListener);
        victoryLinkWrapper.appendChild(victoryTitleContainer);
        victoryLinkWrapper.appendChild(victoryTextContainer);
        return victoryLinkWrapper;
    }
    createCivilopediaText() {
        const victoryText = document.createElement('div');
        victoryText.classList.add('flex');
        // Translate the Victory text, put it in a span. Because we want to keep all the HTML elements,
        // it has to replace the VICTORY_TITLE so that all the html can be inserted correctly
        const victoryTypeTitle = Locale.compose(AdvisorProgress.getAdvisorVictoryLoc(this.selectedAdvisor || ""));
        const victoryCivilopediaLinkText = `<span class="font-body text-secondary">${victoryTypeTitle}</span>`;
        const text = Locale.stylize('LOC_LEGACY_PATH_VICTORY_CONDITION', CIVILOPEDIA_VICTORY_PLACEHOLDER, 'ADVISOR_CIVILOPEDIA');
        const updatedText = text.replace(CIVILOPEDIA_VICTORY_PLACEHOLDER, victoryCivilopediaLinkText);
        victoryText.innerHTML = updatedText;
        return victoryText;
    }
    createQuestCarousel() {
        // base box
        const carouselWrapper = document.createElement('div');
        carouselWrapper.classList.add('advisor-victory-carousel', 'flow-column', 'items-center', 'justify-start', 'advisor-carousel__bg-gradient', 'mb-16', 'relative', 'ml-6');
        if (this.victoryQuests.length <= 0) {
            return carouselWrapper;
        }
        // middle decor
        const middleDecor = document.createElement('div');
        middleDecor.classList.add('absolute', '-top-2', 'h-4', 'w-16', 'bg-center', 'bg-no-repeat', 'bg-contain');
        middleDecor.style.backgroundImage = 'url(fs://game/popup_middle_decor.png)';
        // top border
        const topBorder = document.createElement('div');
        topBorder.classList.add('advisor-carousel__border-bar', 'absolute', 'top-0', 'h-6', 'w-full');
        // bottom-border
        const bottomBorder = document.createElement('div');
        bottomBorder.classList.add('advisor-carousel__border-bar', 'bottom', '-scale-y-100', 'absolute', 'bottom-0', 'h-6', 'w-full');
        //title
        const carouselTitle = document.createElement('p');
        carouselTitle.classList.add('advisor-panel_next-step', 'w-full', 'font-title', 'text-xl', 'uppercase', 'text-center', 'mt-5', 'mb-2', 'text-gradient-secondary', 'tracking-150');
        carouselTitle.setAttribute('data-l10n-id', 'LOC_VICTORY_PROGRESS_NEXT_STEP');
        // content box
        const carouselContentContainer = document.createElement('fxs-scrollable');
        carouselContentContainer.classList.add('advisor-carousel__content-container', 'flow-row', 'items-start', 'justify-center', 'w-full', 'h-3\\/4', 'pl-16', 'pr-12', 'mr-10');
        carouselContentContainer.setAttribute('handle-gamepad-pan', 'true');
        carouselContentContainer.setAttribute('tabindex', '-1');
        carouselContentContainer.componentCreatedEvent.on(scrollable => scrollable.setEngineInputProxy(this.Root));
        // text box
        const carouselTextContainer = document.createElement('div');
        carouselTextContainer.classList.add('flow-column', 'items-start', 'justify-center', 'w-full');
        const advisorTextWrapper = document.createElement('div');
        advisorTextWrapper.classList.add('advisor-carousel__advisor-text-bg', 'font-body', 'text-sm', 'text-center', 'text-accent-2', 'flex-auto', 'min-w-128', 'relative', 'mt-5', 'mb-10', 'w-full');
        const advisorText = document.createElement('div');
        advisorText.classList.add('advisor-text', 'px-6', 'py-8', 'flow-column', 'justify-center', 'items-center');
        // top border
        const advisorTextTopBorder = document.createElement('div');
        advisorTextTopBorder.classList.add('advisor-carousel__border-bar', 'absolute', 'top-0', 'h-6', 'w-full');
        // bottom-border
        const advisorTextBottomBorder = document.createElement('div');
        advisorTextBottomBorder.classList.add('advisor-carousel__border-bar', 'bottom', '-scale-y-100', 'absolute', 'bottom-0', 'h-6', 'w-full');
        advisorTextWrapper.appendChild(advisorTextTopBorder);
        advisorTextWrapper.appendChild(advisorTextBottomBorder);
        advisorTextWrapper.appendChild(advisorText);
        const bodyText = document.createElement('div');
        bodyText.classList.add('body-text', 'font-body', 'text-sm', 'text-left', 'px-4', 'py-1', 'flex-auto', 'min-w-128');
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('flow-column', 'p-3', 'font-body', 'text-sm', 'flex-auto', 'w-full');
        const carouselText = document.createElement('div');
        carouselText.classList.add('carousel-text');
        const progressText = document.createElement('p');
        progressText.classList.add('progress-text', 'font-body', 'text-sm', 'text-left', 'pr-5', 'py-5', 'flex-auto', 'min-w-128', 'flex', 'justify-end', 'self-end');
        const currentQuest = this.getCurrentQuest();
        if (currentQuest) {
            const questDescription = currentQuest.getDescriptionLocParams ?
                Locale.stylize(currentQuest.description, ...currentQuest.getDescriptionLocParams()) :
                currentQuest.description;
            carouselText.setAttribute('data-l10n-id', questDescription);
            if (currentQuest.victory) {
                const progressDescription = this.getStateString(currentQuest.victory.state);
                progressText.setAttribute('data-l10n-id', progressDescription);
                if (currentQuest.victory.content) {
                    const { advisor, body } = currentQuest.victory.content;
                    if (advisor) {
                        const advisorContent = advisor.getLocParams != undefined ? Locale.stylize(advisor.text, ...advisor.getLocParams(currentQuest)) : advisor.text;
                        advisorText.setAttribute('data-l10n-id', advisorContent);
                    }
                    if (body) {
                        const bodyContent = body.getLocParams != undefined ? Locale.stylize(body.text, ...body.getLocParams(currentQuest)) : body.text;
                        bodyText.setAttribute('data-l10n-id', bodyContent);
                    }
                }
            }
        }
        carouselTextContainer.appendChild(advisorTextWrapper);
        carouselTextContainer.appendChild(bodyText);
        progressContainer.appendChild(carouselText);
        progressContainer.appendChild(progressText);
        carouselTextContainer.appendChild(progressContainer);
        carouselContentContainer.appendChild(carouselTextContainer);
        const isMobile = UI.getViewExperience() == UIViewExperience.Mobile;
        const radioWrapper = document.createElement('div');
        radioWrapper.classList.add('flow-row', 'mt-6', 'absolute');
        radioWrapper.classList.toggle('-bottom-8', !isMobile);
        radioWrapper.classList.toggle('-bottom-10', isMobile);
        for (let i = 0; i < this.victoryQuests.length; i++) {
            const radioButton = document.createElement('fxs-radio-button');
            radioButton.setAttribute('value', i.toString());
            radioButton.addEventListener('action-activate', this.onRadioButtonListener);
            radioButton.setAttribute("tabindex", "-1");
            this.radioButtons.push(radioButton);
            if (i == this.carouselIndex) {
                radioButton.setAttribute("selected", "true");
            }
            radioWrapper.appendChild(radioButton);
        }
        carouselWrapper.appendChild(middleDecor);
        carouselWrapper.appendChild(topBorder);
        carouselWrapper.appendChild(bottomBorder);
        carouselWrapper.appendChild(carouselTitle);
        carouselWrapper.appendChild(carouselContentContainer);
        carouselWrapper.appendChild(radioWrapper);
        return carouselWrapper;
    }
    getStateString(state) {
        switch (state) {
            case VictoryQuestState.QUEST_IN_PROGRESS:
                return "LOC_VICTORY_PROGRESS_STATE_IN_PROGRESS";
            case VictoryQuestState.QUEST_COMPLETED:
                return "LOC_VICTORY_PROGRESS_STATE_COMPLETED";
            default:
                return "";
        }
    }
    onCarouselLeft() {
        this.carouselAction(true);
    }
    onCarouselRight() {
        this.carouselAction();
    }
    updateRadioButton(prevIndex, currentIndex) {
        if (!this.radioButtons[prevIndex] || !this.radioButtons[currentIndex]) {
            return;
        }
        this.radioButtons[prevIndex].setAttribute('selected', 'false');
        this.radioButtons[currentIndex].setAttribute('selected', 'true');
        FocusManager.setFocus(this.radioButtons[currentIndex]);
    }
    /**
     * Very basic carousel movement.
     * May want to check out the fxs-carousel component and adapt it for this (not used anywhere else)
     * @param moveBack Used for back index movement, default is forward
    */
    carouselAction(moveBack) {
        const prevIndex = this.carouselIndex;
        if (moveBack) {
            this.carouselIndex--;
        }
        else {
            this.carouselIndex++;
        }
        if (this.carouselIndex < 0) {
            this.carouselIndex = 0;
        }
        if (this.carouselIndex > this.victoryQuests.length - 1) {
            this.carouselIndex = this.victoryQuests.length - 1;
        }
        this.updateRadioButton(prevIndex, this.carouselIndex);
        this.updateVictoryQuests();
    }
    updateVictoryQuests() {
        if (!this.carousel) {
            console.error("panel-advisor-victory: updateVictoryQuests(): No carousel component available");
            return;
        }
        const advisorText = this.carousel.querySelector('.advisor-text');
        if (!advisorText) {
            console.error("panel-advisor-victory: updateVictoryQuests(): No text container for carousel");
            return;
        }
        const bodyText = this.carousel.querySelector('.body-text');
        if (!bodyText) {
            console.error("panel-advisor-victory: updateVictoryQuests(): No text container for carousel");
            return;
        }
        const carouselText = this.carousel.querySelector('.carousel-text');
        if (!carouselText) {
            console.error("panel-advisor-victory: updateVictoryQuests(): No text container for carousel");
            return;
        }
        const progressText = this.carousel.querySelector('.progress-text');
        if (!progressText) {
            console.error("panel-advisor-victory: updateVictoryQuests(): No progress text container for carousel");
            return;
        }
        const currentQuest = this.victoryQuests[this.carouselIndex];
        if (!currentQuest) {
            console.error("panel-advisor-victory: updateVictoryQuests(): No quest found in victoryQuests");
            return;
        }
        const questDescription = currentQuest.getDescriptionLocParams ?
            Locale.stylize(currentQuest.description, ...currentQuest.getDescriptionLocParams()) :
            currentQuest.description;
        carouselText.setAttribute('data-l10n-id', questDescription);
        if (currentQuest.victory) {
            const progressDescription = this.getStateString(currentQuest.victory.state);
            progressText.setAttribute('data-l10n-id', progressDescription);
            if (currentQuest.victory.content) {
                const { advisor, body } = currentQuest.victory.content;
                if (advisor) {
                    const advisorContent = advisor.getLocParams != undefined ? Locale.stylize(advisor.text, ...advisor.getLocParams(currentQuest)) : advisor.text;
                    advisorText.setAttribute('data-l10n-id', advisorContent);
                }
                if (body) {
                    const bodyContent = body.getLocParams != undefined ? Locale.stylize(body.text, ...body.getLocParams(currentQuest)) : body.text;
                    bodyText.setAttribute('data-l10n-id', bodyContent);
                }
            }
        }
    }
    getCurrentQuest() {
        if (this.activeQuest) {
            const activeQuestId = this.activeQuest.id;
            const activeIndex = this.victoryQuests.findIndex(item => item.id == activeQuestId);
            this.carouselIndex = activeIndex;
            return this.activeQuest;
        }
        else {
            return this.victoryQuests[this.carouselIndex];
        }
    }
    onAttributeChanged(_name, _oldValue, newValue) {
        if (!newValue) {
            return;
        }
        this.selectedAdvisor = +newValue;
    }
    renderTopPanel(chosenVictory, chosenAdvisor) {
        const topPanel = document.createElement('div');
        topPanel.classList.add('advisor-panel_top', 'mt-9', 'flow-row', 'flex-auto', 'w-full', 'h-1\\/2', 'pointer-events-none');
        const titleContainer = document.createElement('div');
        titleContainer.classList.add('advisor-panel__title', 'flow-column', 'w-128', 'items-center', '-ml-13', 'justify-center');
        const iconsWrapper = document.createElement('div');
        iconsWrapper.classList.add('advisor-panel__victory-icon-wrapper', 'flow-row', 'w-128');
        const advisorPortraitWrapper = document.createElement('div');
        advisorPortraitWrapper.classList.add('advisor-pane__portrait-wrapper', 'relative', 'flex');
        const advisorBorder = document.createElement('div');
        advisorBorder.classList.add('advisor-panel__icon-border', 'absolute', 'inset-0', 'bg-cover', 'bg-no-repeat');
        advisorPortraitWrapper.appendChild(advisorBorder);
        const advisorIcon = document.createElement('div');
        advisorIcon.classList.add('advisor-panel__portrait', 'absolute', 'inset-0', 'bg-cover', 'bg-no-repeat');
        advisorIcon.style.backgroundImage = UI.getIconCSS(AdvisorProgress.getAdvisorStringByAdvisorType(chosenAdvisor), "CIRCLE_MASK");
        advisorPortraitWrapper.appendChild(advisorIcon);
        const advisorTypeIconBg = document.createElement('div');
        advisorTypeIconBg.classList.add("advisor-panel__type-icon-bg", "absolute", "inset-0", "bg-cover", "bg-no-repeat");
        advisorPortraitWrapper.appendChild(advisorTypeIconBg);
        const advisorTypeIcon = document.createElement('div');
        advisorTypeIcon.classList.add("advisor-panel__type-icon", "absolute", "inset-0", "bg-cover", "bg-no-repeat");
        advisorTypeIcon.style.backgroundImage = UI.getIconCSS(AdvisorProgress.getAdvisorStringByAdvisorType(chosenAdvisor), "BADGE");
        advisorPortraitWrapper.appendChild(advisorTypeIcon);
        const victoryIcon = document.createElement('div');
        victoryIcon.classList.add('advisor-panel__advisor-icon', 'relative', 'size-84', 'bg-center', 'bg-cover', 'bg-no-repeat', '-mb-25', '-mt-26', '-mr-22');
        victoryIcon.style.backgroundImage = `url('${chosenVictory.Icon}')`;
        iconsWrapper.appendChild(victoryIcon);
        iconsWrapper.appendChild(advisorPortraitWrapper);
        const victoryTextContainer = document.createElement('div');
        victoryTextContainer.classList.add('advisor-panel_victory-text', 'mt-6', 'text-center');
        // victorty title
        const victoryName = document.createElement('p');
        victoryName.classList.add('advisor-panel_victory-title', 'font-title', 'text-lg', 'mb-2', 'uppercase', 'flow-row', 'font-bold', 'tracking-150', 'justify-center', 'text-center', 'text-gradient-secondary');
        victoryName.classList.toggle('text-xl', window.innerHeight > Layout.pixelsToScreenPixels(1000));
        victoryName.setAttribute('data-l10n-id', chosenVictory.Name);
        //civilopedia link
        const civilopedieaLinkWrapper = document.createElement('div');
        civilopedieaLinkWrapper.classList.add('advisor-panel__civilopedia', 'w-96', 'text-center');
        // victory description
        const victoryDescription = document.createElement('p');
        victoryDescription.classList.add('advisor-panel_victory-description', 'self-center', 'font-body', 'text-sm', 'mb-2', 'font-normal', 'text-center', 'font-fit-shrink', 'max-h-25');
        victoryDescription.classList.toggle('text-base', window.innerHeight > Layout.pixelsToScreenPixels(1000));
        victoryDescription.setAttribute('data-l10n-id', chosenVictory.Description);
        victoryTextContainer.appendChild(victoryName);
        victoryTextContainer.appendChild(victoryDescription);
        victoryTextContainer.appendChild(civilopedieaLinkWrapper);
        const trackQuestWrapper = this.renderTrackVictoryCheckBox();
        const victoryLinkWrapper = this.createVictoryCivilopediaLink();
        titleContainer.appendChild(iconsWrapper);
        titleContainer.appendChild(victoryTextContainer);
        titleContainer.appendChild(trackQuestWrapper);
        if (this.showVictoryDetailsLink) {
            const civilopediaLink = this.createCivilopediaText();
            civilopediaLink.classList.add('text-sm', 'text-center', 'flex');
            civilopedieaLinkWrapper.appendChild(civilopediaLink);
            titleContainer.appendChild(victoryLinkWrapper);
        }
        this.carousel = this.createQuestCarousel();
        topPanel.appendChild(titleContainer);
        topPanel.appendChild(this.carousel);
        return topPanel;
    }
    renderRewardPip(milestoneRewards, ageProgressRewardAmt) {
        const rewardWrapper = document.createElement('div');
        rewardWrapper.classList.add('advisor-panel__reward-wrapper', 'absolute', 'flow-row', "pointer-events-auto");
        rewardWrapper.role = "tooltip";
        const minorRewardWrapper = document.createElement('div');
        minorRewardWrapper.classList.add('advisor-panel__additional-rewards', 'size-25', 'flow-column');
        const rewardIconHolder = document.createElement('img');
        rewardIconHolder.src = "fs://game/leg_pro_milestone_icon_holder.png";
        rewardIconHolder.classList.add('advisor-panel__reward-holder', 'relative');
        let tooltipString = '';
        for (let i = 0; i < milestoneRewards.length; i++) {
            if (i == 0) {
                const rewardIcon = document.createElement('img');
                rewardIcon.src = UI.getIconURL(milestoneRewards[i].Icon || '');
                rewardIcon.classList.add('advisor-panel__reward-icon', 'absolute', 'size-18', 'top-0\\.5', 'left-0\\.5');
                rewardIconHolder.appendChild(rewardIcon);
            }
            else {
                const minorReward = document.createElement('div');
                minorReward.classList.add('flow-row', 'pl-3', 'font-body-sm');
                minorReward.innerHTML = Locale.stylize('LOC_VICTORY_ADDITIONAL_REWARDS', milestoneRewards[i].Icon || '');
                minorRewardWrapper.appendChild(minorReward);
            }
            const tipName = Locale.compose(milestoneRewards[i].Name || '');
            let tipDescription = Locale.compose(milestoneRewards[i].Description || '');
            if (Game.AgeProgressManager.isFinalAge && milestoneRewards[i].DescriptionFinalAge) {
                tipDescription = Locale.compose(milestoneRewards[i].DescriptionFinalAge || '');
            }
            tooltipString = tooltipString + `[B]${tipName}[/B][N]${tipDescription}[N]`;
        }
        rewardWrapper.appendChild(rewardIconHolder);
        rewardWrapper.appendChild(minorRewardWrapper);
        tooltipString = tooltipString + Locale.stylize('LOC_VICTORY_AGE_PROGRESS_TOOLTIP', ageProgressRewardAmt);
        rewardWrapper.setAttribute("data-tooltip-content", tooltipString);
        return rewardWrapper;
    }
    renderBottomPanel(chosenAdvisor) {
        const bottomPanel = document.createElement('div');
        bottomPanel.classList.add('advisor-panel_bottom', 'flow-row', 'items-center', 'flex-auto', 'justify-start');
        const legendWrapper = document.createElement('div');
        legendWrapper.classList.add('advisor-panel__progressbar-legend', 'flow-column', 'text-accent-4', 'tracking-150', 'font-title', 'text-sm', 'w-56', 'h-44', '-ml-39', 'uppercase');
        const legendReward = document.createElement('p');
        legendReward.classList.add('advisor-panel__progress-rewards', 'font-fit-shrink', 'w-36', 'min-h-24', 'break-words');
        legendReward.setAttribute('data-l10n-id', "LOC_VICTORY_PROGRESS_REWARD");
        const legendProgress = document.createElement('p');
        legendProgress.classList.add('advisor-panel__progress-key', 'font-fit-shrink');
        legendProgress.setAttribute('data-l10n-id', "LOC_VICTORY_PROGRESS_LEGACY_PROGRESS");
        legendWrapper.appendChild(legendReward);
        legendWrapper.appendChild(legendProgress);
        const progressBarWrapper = document.createElement('div');
        progressBarWrapper.classList.add('advisor-panel__progress-bar-wrapper', 'flow-column', 'h-44', 'w-full', 'pt-22');
        const rewardSection = document.createElement('div');
        const progressBar = document.createElement('div');
        progressBar.classList.add('advisor-panel__progress-bar', 'bg-contain', 'bg-center', 'bg-no-repeat', 'relative');
        progressBar.style.backgroundImage = `url("fs://game/leg_pro_bar_empty.png")`;
        if (!this.playerData) {
            return bottomPanel;
        }
        // dark age bar
        const darkAgeReward = AdvisorProgress.getDarkAgeReward(chosenAdvisor);
        if (!Game.AgeProgressManager.isFinalAge && darkAgeReward) {
            const darkAgeIcon = document.createElement('img');
            const darkAgeIconUrl = UI.getIconURL(darkAgeReward.Icon || '');
            darkAgeIcon.src = AdvisorProgress.getDarkAgeIcon(chosenAdvisor, this.playerData.currentScore, darkAgeIconUrl);
            darkAgeIcon.classList.add('advisor-panel__darkage-icon', 'absolute', '-left-21', 'size-18');
            progressBar.appendChild(darkAgeIcon);
            const darkAgeBar = document.createElement('img');
            darkAgeBar.src = "fs://game/leg_pro_darka_line.png";
            darkAgeBar.classList.add('advisor-panel__darkage-bar', 'absolute', 'h-14', '-top-14', 'origin-left', 'w-full');
            darkAgeBar.style.transform = `scaleX(${AdvisorProgress.getDarkAgeBarPercent(chosenAdvisor)})`;
            const darkAgeToolTipCondition = Locale.compose("LOC_AGE_REWARD_DARK_AGE_EARNED");
            const darkAgeToolTipName = Locale.compose(darkAgeReward.Name || '');
            const darkAgeToolTipDescription = Locale.compose(darkAgeReward.Description || '');
            const darkAgeToolTip = `${darkAgeToolTipCondition}[N][B]${darkAgeToolTipName}[/B][N]${darkAgeToolTipDescription}[N]`;
            darkAgeIcon.setAttribute("data-tooltip-content", darkAgeToolTip);
            darkAgeIcon.setAttribute("tabindex", "-1");
            this.rewardElemends.push(darkAgeIcon);
            progressBar.appendChild(darkAgeBar);
        }
        const maxTicks = this.playerData.maxScore;
        const isMobile = UI.getViewExperience() == UIViewExperience.Mobile;
        let barWidth;
        if (isMobile) {
            barWidth = window.innerHeight > Layout.pixelsToScreenPixels(1000) ? MOBILE_PROGRESS_BAR_WIDTH : MOBILE_PROGRESS_BAR_MIN_WIDTH;
        }
        else {
            barWidth = window.innerHeight > Layout.pixelsToScreenPixels(1000) ? PROGRESS_BAR_WIDTH : PROGRESS_BAR_MIN_WIDTH;
        }
        const spacing = barWidth / maxTicks;
        let milestoneRewardNum = 0;
        for (let i = 0; i < maxTicks; i++) {
            if (AdvisorProgress.isRewardMileStone(chosenAdvisor, i)) {
                milestoneRewardNum++;
                const rewards = AdvisorProgress.getMilestoneRewards(chosenAdvisor, i);
                const isScoreMet = AdvisorProgress.isMilestoneComplete(chosenAdvisor, i);
                const pipIconUrl = isScoreMet ? "fs://game/leg_pro_pip_milestone_done.png" : "fs://game/leg_pro_pip_milestone_empty.png";
                const checkedLine = document.createElement('img');
                checkedLine.src = pipIconUrl;
                checkedLine.classList.add('advisor-panel__reward-pip', 'absolute', '-bottom-12');
                checkedLine.style.left = Layout.pixels((spacing * i) - 15);
                progressBar.appendChild(checkedLine);
                const ageProgressRewardAmt = AdvisorProgress.getMilestoneProgressAmount(chosenAdvisor, milestoneRewardNum);
                const rewardWrapper = this.renderRewardPip(rewards, ageProgressRewardAmt);
                const rewardOffSet = window.innerHeight > Layout.pixelsToScreenPixels(1000) ? 39 : 27;
                rewardWrapper.style.left = Layout.pixels((spacing * i) - rewardOffSet);
                rewardWrapper.setAttribute("tabindex", "-1");
                this.rewardElemends.push(rewardWrapper);
                progressBar.appendChild(rewardWrapper);
                const ageProgression = document.createElement('div');
                ageProgression.role = "paragraph";
                ageProgression.classList.add('advisor-panel__age-progress', 'absolute', '-bottom-22', 'text-2xs', "pointer-events-auto", 'font-fit-shrink');
                const textOffSet = window.innerHeight > Layout.pixelsToScreenPixels(1000) ? 75 : 85;
                ageProgression.style.left = Layout.pixels((spacing * i) - textOffSet);
                const ageProgressRewardLabel = Locale.compose("LOC_VICTORY_AGE_PROGRESS", ageProgressRewardAmt);
                ageProgression.setAttribute('data-l10n-id', ageProgressRewardLabel);
                if (isScoreMet) {
                    ageProgression.classList.add('opacity-20');
                }
                progressBar.appendChild(ageProgression);
            }
            else {
                const line = document.createElement('div');
                line.classList.add('advisor-panel__pip', 'w-px', 'h-3', 'absolute', '-bottom-4', 'bg-primary-1');
                line.style.left = Layout.pixels(spacing * i);
                progressBar.appendChild(line);
            }
        }
        milestoneRewardNum++;
        const finalReward = AdvisorProgress.getMilestoneRewards(chosenAdvisor, maxTicks);
        let finalRewardToolTip = '';
        const finaleLine = document.createElement('img');
        finaleLine.classList.add('advisor-panel__final-pip', 'absolute', '-bottom-16', '-right-5');
        finaleLine.src = "fs://game/leg_pro_pip_milestone_end.png";
        progressBar.appendChild(finaleLine);
        const rewardWrapper = document.createElement('div');
        rewardWrapper.role = "tooltip";
        rewardWrapper.classList.add('advisor-panel__reward-wrapper', 'advisor-panel__last-reward', 'absolute', 'flow-row', '-right-9', "pointer-events-auto");
        const minorRewardWrapper = document.createElement('div');
        minorRewardWrapper.classList.add('advisor-panel__additional-rewards', 'size-25', 'flow-column', 'absolute', '-right-25');
        for (const reward of finalReward) {
            if (!reward.AgeProgressionRewardType.includes('GOLDEN_AGE')) {
                const minorReward = document.createElement('div');
                minorReward.classList.add('flow-row', 'pl-3', 'font-body-sm');
                minorReward.innerHTML = Locale.stylize('LOC_VICTORY_ADDITIONAL_REWARDS', reward.Icon || '');
                minorRewardWrapper.appendChild(minorReward);
            }
            const tipName = Locale.compose(reward.Name || '');
            let tipDescription = Locale.compose(reward.Description || '');
            if (Game.AgeProgressManager.isFinalAge && reward.DescriptionFinalAge != null) {
                tipDescription = Locale.compose(reward.DescriptionFinalAge || '');
            }
            finalRewardToolTip += `[B]${tipName}[/B][N]${tipDescription}[N]`;
        }
        const rewardIconHolder = document.createElement('img');
        rewardIconHolder.src = "fs://game/leg_pro_milestone_icon_holder.png";
        rewardIconHolder.classList.add('advisor-panel__reward-holder', 'relative');
        const rewardIcon = document.createElement('img');
        rewardIcon.src = AdvisorProgress.getAdvisorVictoryIcon(chosenAdvisor, this.selectedAgeType === 'AGE_MODERN');
        rewardIcon.classList.add('w-44', 'absolute');
        rewardIconHolder.appendChild(rewardIcon);
        const victoryText = document.createElement('div');
        victoryText.classList.add('advisor-panel__victory-desc', 'font-title-base', 'uppercase', 'text-gradient-secondary', 'absolute', '-top-10', '-left-8', 'whitespace-nowrap', 'font-fit-shrink');
        if (this.selectedAgeType === "AGE_MODERN") {
            victoryText.setAttribute('data-l10n-id', 'LOC_VICTORY_VICTORY');
            rewardIcon.classList.add(`advisor-panel__victory-icon`);
        }
        else {
            victoryText.setAttribute('data-l10n-id', 'LOC_VICTORY_GOLDEN_AGE');
            rewardIcon.classList.add(`advisor-panel__golden-icon-${AdvisorProgress.getAdvisorStringByAdvisorType(chosenAdvisor).toLowerCase()}`);
        }
        rewardIconHolder.appendChild(victoryText);
        rewardWrapper.appendChild(rewardIconHolder);
        rewardWrapper.appendChild(minorRewardWrapper);
        rewardWrapper.setAttribute("data-tooltip-content", finalRewardToolTip);
        rewardWrapper.setAttribute("tabindex", "-1");
        this.rewardElemends.push(rewardWrapper);
        progressBar.appendChild(rewardWrapper);
        const isScoreMet = AdvisorProgress.isMilestoneComplete(chosenAdvisor, maxTicks);
        const ageProgressRewardAmt = AdvisorProgress.getMilestoneProgressAmount(chosenAdvisor, milestoneRewardNum);
        const ageProgression = document.createElement('div');
        ageProgression.classList.add('advisor-panel__age-progress', 'absolute', '-bottom-22', 'text-2xs');
        const textOffSet = window.innerHeight > Layout.pixelsToScreenPixels(1000) ? isMobile ? 90 : 75 : 85;
        ageProgression.style.left = Layout.pixels((spacing * maxTicks) - textOffSet);
        const ageProgressRewardLabel = Locale.compose("LOC_VICTORY_AGE_PROGRESS", ageProgressRewardAmt);
        ageProgression.setAttribute('data-l10n-id', ageProgressRewardLabel);
        if (isScoreMet) {
            ageProgression.classList.add('opacity-20');
        }
        progressBar.appendChild(ageProgression);
        // progress on the bar
        const progressMask = document.createElement('div');
        progressMask.classList.add('advisor-panel__progress-mask', 'bg-cover', 'bg-center', 'bg-no-repeat', 'absolute', 'w-full', 'h-8', 'top-0', 'origin-left', 'border-2', 'border-secondary-2');
        progressMask.style.backgroundImage = `url("${AdvisorProgress.getAdvisorProgressBar(chosenAdvisor)}")`;
        let ratio = (this.playerData.maxScore > 0) ? this.playerData.currentScore / this.playerData.maxScore : 0;
        // this prevents the score from growing beyond when they achive greater then max score.
        ratio = ratio > 1 ? 1 : ratio;
        progressMask.style.transform = `scaleX(${ratio})`;
        progressBar.appendChild(progressMask);
        progressBarWrapper.appendChild(rewardSection);
        progressBarWrapper.appendChild(progressBar);
        bottomPanel.appendChild(legendWrapper);
        bottomPanel.appendChild(progressBarWrapper);
        return bottomPanel;
    }
    renderTrackVictoryCheckBox() {
        const trackQuestWrapper = document.createElement('div');
        trackQuestWrapper.classList.add('flow-row', 'text-base', 'font-title', 'uppercase', 'flex-auto', 'font-bold', 'tracking-150', 'relative');
        const isTrackerVisible = (this.activeQuest && !Online.Metaprogression.isPlayingActiveEvent()) ? true : false;
        trackQuestWrapper.classList.toggle("hidden", !isTrackerVisible);
        const checkBox = document.createElement('fxs-checkbox');
        checkBox.setAttribute('selected', `${this.isTracked}`);
        checkBox.setAttribute("tabindex", "-1");
        checkBox.classList.add('advisor-victory_tracker', 'size-7', 'mr-4');
        checkBox.addEventListener('action-activate', this.trackVictoryActivateListener);
        const navHelper = document.createElement('fxs-nav-help');
        navHelper.classList.add('absolute', '-left-9');
        navHelper.setAttribute('action-key', 'inline-shell-action-3');
        const trackerText = document.createElement('p');
        trackerText.classList.add('font-title-sm', 'leading-loose', 'text-gradient-secondary');
        trackerText.setAttribute('data-l10n-id', 'LOC_VICTORY_PROGRESS_TRACK_VICTORY');
        trackQuestWrapper.appendChild(navHelper);
        trackQuestWrapper.appendChild(checkBox);
        trackQuestWrapper.appendChild(trackerText);
        return trackQuestWrapper;
    }
    onTrackVictoryActivate(event) {
        if (event.target instanceof HTMLElement) {
            const isCurrentlyTracked = event.target.getAttribute('selected');
            if (!this.activeQuest) {
                return;
            }
            const trackQuest = isCurrentlyTracked === 'true' ? true : false;
            AdvisorProgress.updateQuestTracking(this.activeQuest, trackQuest);
            this.updateVictoryQuests();
        }
    }
    toggleCheckBox() {
        const checkBox = this.Root.querySelector('.advisor-victory_tracker');
        if (!checkBox || !this.activeQuest) {
            console.error('panel-advisor-victory: toggleCheckBox(): Failed to find advisor-victory_tracker or activeQuest');
            return;
        }
        this.isTracked = !this.isTracked;
        AdvisorProgress.updateQuestTracking(this.activeQuest, this.isTracked);
        checkBox.setAttribute('selected', `${this.isTracked}`);
    }
    onRadioButtonInput(event) {
        if (event.target instanceof HTMLElement) {
            const targetActivateIndex = event.target.getAttribute('value');
            if (targetActivateIndex) {
                const prevIndex = this.carouselIndex;
                this.carouselIndex = +targetActivateIndex;
                this.updateRadioButton(prevIndex, this.carouselIndex);
                this.updateVictoryQuests();
            }
        }
    }
    onEngineInput(inputEvent) {
        if (this.handleEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    handleEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return false;
        }
        if (inputEvent.detail.name == 'shell-action-2' && this.selectedAdvisor) {
            engine.trigger('open-civilopedia', AdvisorProgress.getCivilopediaVictorySearchByAdvisor(this.selectedAdvisor));
            return true;
        }
        if (inputEvent.detail.name == 'shell-action-3') {
            this.toggleCheckBox();
            Audio.playSound("data-audio-checkbox-press");
            return true;
        }
        return false;
    }
    onNavigateInput(navigationEvent) {
        const live = this.handleNavigation(navigationEvent);
        if (!live) {
            navigationEvent.preventDefault();
        }
    }
    onCivilopediaButtonInput(_event) {
        // confirm that there is a selected advisor and that it gives a search string
        if (!this.selectedAdvisor || !AdvisorProgress.getCivilopediaVictorySearchByAdvisor(this.selectedAdvisor)) {
            console.error('panel-advisor-victory: onCivilopediaButtonInput, error finding advisor or search');
            return;
        }
        engine.trigger('open-civilopedia', AdvisorProgress.getCivilopediaVictorySearchByAdvisor(this.selectedAdvisor));
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(navigationEvent) {
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            // Ignore everything but FINISH events
            return true;
        }
        if (!this.carousel || this.radioButtons.length <= 0 || !this.radioButtons[this.carouselIndex]) {
            console.error('screen-victory-progress: handleNavigation(): Failed to find carousel or radioButtons');
            return false;
        }
        let live = true;
        const direction = navigationEvent.getDirection();
        switch (direction) {
            case InputNavigationAction.LEFT: {
                if (this.isTopFocused) {
                    this.onCarouselLeft();
                    //currently this will play even if we can't go any further. However, implementing
                    //this in the onCaraouselRight function will cause it to play double or at the wrong time
                    //when using the mouse
                    Audio.playSound("data-audio-radio-press");
                }
                else {
                    if (this.selectedRewardIndex > 0) {
                        this.selectedRewardIndex--;
                    }
                    FocusManager.setFocus(this.rewardElemends[this.selectedRewardIndex]);
                }
                live = false;
                break;
            }
            case InputNavigationAction.RIGHT: {
                if (this.isTopFocused) {
                    this.onCarouselRight();
                    //currently this will play even if we can't go any further. However, implementing
                    //this in the onCaraouselRight function will cause it to play double or at the wrong time
                    //when using the mouse
                    Audio.playSound("data-audio-radio-press");
                }
                else {
                    if (this.selectedRewardIndex < this.rewardElemends.length - 1) {
                        this.selectedRewardIndex++;
                    }
                    FocusManager.setFocus(this.rewardElemends[this.selectedRewardIndex]);
                }
                live = false;
                break;
            }
            case InputNavigationAction.UP: {
                if (!this.isTopFocused) {
                    this.isTopFocused = !this.isTopFocused;
                    FocusManager.setFocus(this.radioButtons[this.carouselIndex]);
                }
                live = false;
                break;
            }
            case InputNavigationAction.DOWN: {
                if (this.isTopFocused) {
                    this.isTopFocused = !this.isTopFocused;
                    FocusManager.setFocus(this.rewardElemends[this.selectedRewardIndex]);
                }
                live = false;
                break;
            }
        }
        return live;
    }
}
Controls.define('panel-advisor-victory', {
    createInstance: PanelAdvisorVictory,
    attributes: [{ name: 'advisor-type' }],
    description: 'Panel which displays a specific advisor quest for victory and current ranking',
    classNames: ['panel-advisor-victory', 'flex-auto', 'h-auto'],
    styles: ['fs://game/base-standard/ui/victory-progress/panel-advisor-victory.css'],
});

//# sourceMappingURL=file:///base-standard/ui/victory-progress/panel-advisor-victory.js.map

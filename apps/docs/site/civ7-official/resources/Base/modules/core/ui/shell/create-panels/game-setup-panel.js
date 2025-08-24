/**
 * @file game-setup-panel.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Displays the start game button and game options
 */
import { DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { CreateGameModel } from '/core/ui/shell/create-panels/create-game-model.js';
import { GameCreationPanelBase } from '/core/ui/shell/create-panels/game-creation-panel-base.js';
const STANDARD_PARAMETERS = [
    GameSetup.makeString("Difficulty"),
    GameSetup.makeString("GameSpeeds"),
    GameSetup.makeString("Map"),
    GameSetup.makeString("MapSize")
];
/**
 * GameSetupComponentPanel is the final panel in the create game flow. It displays the start game button and game options.
 *
 * @fires CreatePanelAcceptedEvent - When the start game button is pressed
 */
class GameSetupComponentPanel extends GameCreationPanelBase {
    constructor(root) {
        super(root);
        this.gameSetupRevision = 0;
        this.gameParamContainer = document.createElement("fxs-vslot");
        this.gameParamEles = [];
        // We cache the last changed parameter in case we need to refocus that parameter after rebuilding options
        this.lastChangedParameter = '';
    }
    onInitialize() {
        super.onInitialize();
        const fragment = this.createLayoutFragment(true);
        const configHeader = document.createElement("fxs-header");
        configHeader.setAttribute("title", "LOC_GAME_SETUP_TITLE");
        configHeader.classList.add("mt-4");
        this.mainContent.appendChild(configHeader);
        const paramListScroll = document.createElement("fxs-scrollable");
        paramListScroll.setAttribute("attached-scrollbar", "true");
        paramListScroll.classList.add("flex", "flex-auto", "mr-3");
        this.mainContent.appendChild(paramListScroll);
        this.gameParamContainer.classList.add("flex", "flex-col", "flex-auto");
        paramListScroll.appendChild(this.gameParamContainer);
        this.mainContent.appendChild(this.buildBottomNavBar());
        fragment.appendChild(this.buildLeaderBox());
        this.updateLeaderBox();
        this.Root.appendChild(fragment);
    }
    onAttach() {
        super.onAttach();
        const checkGameSetup = () => {
            if (this.Root.isConnected) {
                if (GameSetup.currentRevision != this.gameSetupRevision) {
                    this.refreshGameOptions();
                    this.gameSetupRevision = GameSetup.currentRevision;
                }
                window.requestAnimationFrame(checkGameSetup);
            }
        };
        window.requestAnimationFrame(checkGameSetup);
    }
    onDetach() {
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        FocusManager.setFocus(this.gameParamContainer);
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        NavTray.addOrUpdateShellAction1(CreateGameModel.nextActionStartsGame ? "LOC_UI_SETUP_START_GAME" : "LOC_GENERIC_CONTINUE");
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    onEngineInput(event) {
        super.onEngineInput(event);
        if (event.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (event.detail.name === "shell-action-1") {
            CreateGameModel.showNextPanel();
            event.stopPropagation();
            event.preventDefault();
        }
    }
    getParameterImage(parameterID) {
        switch (parameterID) {
            case "Difficulty":
                return 'url("fs://game/sett_difficulty_full.png")';
            case "GameSpeeds":
                return 'url("fs://game/sett_speed_full.png")';
            case "Map":
                return 'url("fs://game/sett_type_full.png")';
            case "MapSize":
                return 'url("fs://game/sett_size_full.png")';
            default:
                // Use difficulty background for unknown fields
                return "fs://game/sett_difficulty_full.png";
        }
    }
    refreshGameOptions() {
        // Remove old options
        for (const element of this.gameParamEles) {
            element.remove();
        }
        this.gameParamEles.length = 0;
        // Create new options
        const fragment = document.createDocumentFragment();
        const parameters = GameSetup.getGameParameters();
        for (const [index, setupParam] of parameters.entries()) {
            if (!setupParam.hidden && setupParam.invalidReason == GameSetupParameterInvalidReason.Valid && STANDARD_PARAMETERS.includes(setupParam.ID)) {
                this.createOption(fragment, setupParam, index + 1);
            }
        }
        // Create Advanced options button
        if ((!Network.supportsSSO() || !Online.LiveEvent.getLiveEventGameFlag()) && !CreateGameModel.isLastPanel) {
            const advancedOptionsButton = document.createElement("fxs-button");
            advancedOptionsButton.setAttribute("caption", "LOC_ADVANCED_OPTIONS_ADVANCED");
            advancedOptionsButton.setAttribute("data-audio-group-ref", "main-menu-audio");
            advancedOptionsButton.setAttribute("data-audio-activate-ref", "data-audio-advanced-options-activate");
            advancedOptionsButton.classList.add("mx-5", "my-3");
            advancedOptionsButton.addEventListener("action-activate", () => CreateGameModel.showPanelByName("advanced-options-panel"));
            fragment.appendChild(advancedOptionsButton);
            this.gameParamEles.push(advancedOptionsButton);
        }
        // Append new options to DOM
        this.gameParamContainer.appendChild(fragment);
        this.refocusLastChangedParameter();
    }
    refocusLastChangedParameter() {
        if (this.lastChangedParameter != '') {
            for (const element of this.gameParamEles) {
                if (element.getAttribute('data-parameter-id') == this.lastChangedParameter) {
                    FocusManager.setFocus(element);
                }
            }
        }
    }
    createOption(frag, setupParam, tabIndex) {
        if (setupParam.domain.type == GameSetupDomainType.Select) {
            const selector = document.createElement('fxs-selector-ornate');
            selector.classList.add('game-setup-selector');
            selector.setAttribute("tabindex", tabIndex.toString());
            this.gameParamEles.push(selector);
            const parameterID = GameSetup.resolveString(setupParam.ID);
            const paramName = GameSetup.resolveString(setupParam.name);
            selector.setAttribute('label', paramName ?? "");
            selector.setAttribute('default-image', this.getParameterImage(parameterID));
            selector.setAttribute('data-parameter-id', parameterID);
            selector.setAttribute("data-audio-activate-ref", "none");
            const description = GameSetup.resolveString(setupParam.description);
            selector.addEventListener(DropdownSelectionChangeEventName, (event) => {
                const targetElement = event.target;
                const parameterID = targetElement.getAttribute('data-parameter-id');
                if (parameterID) {
                    const index = event.detail.selectedIndex;
                    const parameter = GameSetup.findGameParameter(parameterID);
                    if (parameter && parameter.domain.possibleValues && parameter.domain.possibleValues.length > index) {
                        const value = parameter.domain.possibleValues[index];
                        this.lastChangedParameter = parameterID;
                        GameSetup.setGameParameterValue(parameterID, value.value);
                        let tooltip = "";
                        if (description) {
                            tooltip = Locale.compose(description);
                        }
                        const paramName = GameSetup.resolveString(value.name);
                        if (paramName) {
                            tooltip = tooltip + "[N]" + Locale.compose(paramName);
                        }
                        const paramDescription = GameSetup.resolveString(value.description);
                        if (paramDescription) {
                            tooltip = tooltip + "[N]" + Locale.compose(paramDescription);
                        }
                        selector.setAttribute('data-tooltip-content', tooltip);
                    }
                }
            });
            let tooltip = "";
            if (description) {
                tooltip = Locale.compose(description);
            }
            const actionsList = [];
            if (setupParam.domain.possibleValues) {
                for (const [index, pv] of setupParam.domain.possibleValues.entries()) {
                    const valueName = GameSetup.resolveString(pv.name);
                    if (!valueName) {
                        console.error(`game-setup.ts - Failed to resolve string for game option: ${pv.name}`);
                        return;
                    }
                    if (setupParam.value.value == pv.value) {
                        selector.setAttribute('selected-item-index', index.toString());
                        tooltip = tooltip + "[N]" + Locale.compose(valueName);
                        const paramDescription = GameSetup.resolveString(pv.description);
                        if (paramDescription) {
                            tooltip = tooltip + "[N]" + Locale.compose(paramDescription);
                        }
                    }
                    actionsList.push({ label: Locale.compose(valueName) });
                }
            }
            selector.setAttribute('data-tooltip-content', tooltip);
            selector.setAttribute('dropdown-items', JSON.stringify(actionsList));
            frag.appendChild(selector);
        }
        else {
            const parameterID = GameSetup.resolveString(setupParam.ID);
            const paramName = GameSetup.resolveString(setupParam.name);
            const valueName = (setupParam.value.name) ? GameSetup.resolveString(setupParam.value.name) : setupParam.value.value?.toString();
            if (valueName) {
                if (paramName) {
                    const parent = document.createElement('div');
                    parent.classList.add('flow-row', 'flex', 'items-center');
                    this.gameParamEles.push(parent);
                    const label = document.createElement('div');
                    label.classList.add('flex', "flex-auto", 'justify-end', 'flow-row-reverse', "font-body-base");
                    label.setAttribute('data-l10n-id', `{${paramName}}:`);
                    parent.appendChild(label);
                    const description = GameSetup.resolveString(setupParam.description);
                    if (description) {
                        parent.setAttribute('data-tooltip-content', description);
                    }
                    if (setupParam.domain.type == GameSetupDomainType.Boolean) {
                        if (setupParam.readOnly) {
                            const value = document.createElement('div');
                            value.classList.add('display-flex', "font-body-base");
                            value.setAttribute('data-l10n-id', valueName);
                            parent.appendChild(value);
                        }
                        else {
                            const value = document.createElement('fxs-checkbox');
                            value.classList.add('display-flex', "font-body-base");
                            value.setAttribute("tabindex", tabIndex.toString());
                            value.setAttribute('selected', valueName);
                            value.addEventListener("component-value-changed", (event) => {
                                const newValue = event.detail.value;
                                const parameter = GameSetup.findGameParameter(parameterID);
                                if (parameter) {
                                    GameSetup.setGameParameterValue(parameterID, newValue);
                                }
                            });
                            parent.appendChild(value);
                        }
                    }
                    else {
                        if (setupParam.readOnly) {
                            const value = document.createElement('div');
                            value.classList.add('display-flex', "font-body-base");
                            value.setAttribute('data-l10n-id', valueName);
                            parent.appendChild(value);
                        }
                        else {
                            const value = document.createElement('fxs-textbox');
                            value.setAttribute("tabindex", tabIndex.toString());
                            value.classList.add('display-flex', "font-body-base");
                            value.setAttribute('value', valueName);
                            value.addEventListener("component-value-changed", (event) => {
                                const newValue = event.detail.value.toString();
                                const parameter = GameSetup.findGameParameter(parameterID);
                                if (parameter) {
                                    if (parameter.domain.type != GameSetupDomainType.Text) {
                                        const numericValue = Number.parseInt(newValue);
                                        if (numericValue) {
                                            GameSetup.setGameParameterValue(parameterID, numericValue);
                                        }
                                    }
                                    else {
                                        GameSetup.setGameParameterValue(parameterID, newValue);
                                    }
                                }
                            });
                            parent.appendChild(value);
                        }
                    }
                    frag.appendChild(parent);
                }
                else {
                    const value = document.createElement('div');
                    value.classList.add("font-body-base");
                    value.setAttribute('data-l10n-id', valueName);
                    frag.appendChild(value);
                }
            }
        }
    }
}
Controls.define('game-setup-panel', {
    createInstance: GameSetupComponentPanel,
    description: 'Configure game options',
    classNames: ["size-full", "relative", 'flex', 'flex-col'],
    styles: ['fs://game/core/ui/shell/create-panels/game-setup-panel.css'],
    images: ["fs://game/sett_difficulty_full.png", "fs://game/sett_speed_full.png", "fs://game/sett_type_full.png", "fs://game/sett_size_full.png"],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/shell/create-panels/game-setup-panel.js.map

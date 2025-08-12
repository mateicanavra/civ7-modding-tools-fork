/**
 * @file mp-create-game.ts
 * @copyright 2023, Firaxis Games
 * @description Multiplayer create game.
 */
import { DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { SendCampaignSetupTelemetryEvent } from '/core/ui/events/shell-events.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { serverTypeToGameModeType } from '/core/ui/utilities/utilities-network-constants.js';
import LiveEventManager from '/core/ui/shell/live-event-logic/live-event-logic.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
class PanelMPCreateGame extends Panel {
    constructor(root) {
        super(root);
        this.wasCompact = Layout.isCompact();
        this.groupNames = new Map();
        this.tooltipElements = [];
        this.gameSetupRevision = 0;
        this.ignoreParameters = [];
        this.enteredAdditionalContent = false;
        // We cache the last changed parameter in case we need to refocus that parameter after rebuilding options
        this.lastChangedParameter = '';
        this.creatingOptions = false; // to avoid updating the lastChangedParameter when initializing the options and to do it only when an option is effectively changed
        this.onHostLobbyListener = this.onHostLobby.bind(this);
        this.onSaveConfigListener = this.onSaveConfig.bind(this);
        this.onLoadConfigListener = this.onLoadConfig.bind(this);
        this.onExtraContentListener = this.onExtraContent.bind(this);
        this.onWindowResizeListener = this.onResize.bind(this);
        this.onEngineInput = (inputEvent) => {
            if (inputEvent.detail.status != InputActionStatuses.FINISH) {
                return;
            }
            switch (inputEvent.detail.name) {
                case 'cancel':
                case 'keyboard-escape':
                    this.onClose();
                    inputEvent.stopPropagation();
                    inputEvent.preventDefault();
                    break;
                case 'shell-action-2':
                    if (!Online.LiveEvent.getLiveEventGameFlag()) {
                        this.onLoadConfig();
                        inputEvent.stopPropagation();
                        inputEvent.preventDefault();
                    }
                    break;
                case 'shell-action-1':
                    if (!Online.LiveEvent.getLiveEventGameFlag()) {
                        this.onSaveConfig();
                        inputEvent.stopPropagation();
                        inputEvent.preventDefault();
                    }
                    break;
                case 'shell-action-3':
                    if (UI.supportsDLC()) {
                        this.onExtraContent();
                        inputEvent.stopPropagation();
                        inputEvent.preventDefault();
                    }
                    break;
                case 'sys-menu':
                    this.onHostLobby();
                    inputEvent.stopPropagation();
                    inputEvent.preventDefault();
                    break;
            }
        };
        this.onClose = () => {
            window.dispatchEvent(new SendCampaignSetupTelemetryEvent(CampaignSetupType.Abandon));
            this.close();
        };
        this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute('data-audio-group-ref', "multiplayer-create-game");
        this.Root.listenForEngineEvent('UpdateFrame', this.onUpdate, this);
    }
    onAttach() {
        super.onAttach();
        this.optionsContainer = MustGetElement(".main-container", this.Root);
        this.hostLobbyButton = MustGetElement(".host-lobby", this.Root);
        const leftContainer = MustGetElement(".left-container", this.Root);
        const saveConfigButton = MustGetElement(".save-config", this.Root);
        saveConfigButton.setAttribute("data-audio-group-ref", "multiplayer-create-game");
        saveConfigButton.setAttribute("data-audio-activate-ref", "data-audio-save-config-activate");
        const loadConfigButton = MustGetElement(".load-config", this.Root);
        loadConfigButton.setAttribute("data-audio-group-ref", "multiplayer-create-game");
        loadConfigButton.setAttribute("data-audio-activate-ref", "data-audio-load-config-activate");
        saveConfigButton.classList.toggle("hidden", Online.LiveEvent.getLiveEventGameFlag());
        loadConfigButton.classList.toggle("hidden", Online.LiveEvent.getLiveEventGameFlag());
        this.enteredAdditionalContent = false;
        if (UI.supportsDLC()) {
            const extraContentButton = document.createElement('fxs-button');
            extraContentButton.classList.add('min-w-62', 'mr-4', 'mb-3', 'mt-6');
            extraContentButton.setAttribute("data-audio-group-ref", "multiplayer-create-game");
            extraContentButton.setAttribute("data-audio-activate-ref", "data-audio-additional-config-activate");
            extraContentButton.setAttribute('caption', 'LOC_UI_STORE_ADDITIONAL_CONTENT');
            leftContainer.insertAdjacentElement("afterbegin", extraContentButton);
            extraContentButton.addEventListener('action-activate', this.onExtraContentListener);
        }
        this.Root.addEventListener('engine-input', this.onEngineInput);
        window.addEventListener('resize', this.onWindowResizeListener);
        let gameMode = serverTypeToGameModeType.get(MultiplayerShellManager.serverType);
        if (gameMode) {
            Configuration.editGame()?.reset(gameMode);
        }
        else {
            console.warn("Couldn't find gameMode for serverType=${MultiplayerShellManager.serverType} in mp-create-game.ts. Default to INTERNET.");
            Configuration.editGame()?.reset(GameModeTypes.INTERNET);
        }
        this.hostLobbyButton.addEventListener('action-activate', this.onHostLobbyListener);
        saveConfigButton.addEventListener('action-activate', this.onSaveConfigListener);
        loadConfigButton.addEventListener('action-activate', this.onLoadConfigListener);
        const closeButton = document.createElement('fxs-close-button');
        if (UI.getViewExperience() == UIViewExperience.Mobile) {
            closeButton.classList.add("right-10", "top-14");
        }
        closeButton.addEventListener('action-activate', this.onClose);
        this.frame = MustGetElement('fxs-frame', this.Root);
        this.frame.appendChild(closeButton);
        this.updateFrame();
        this.Root.classList.toggle("fullscreen", UI.getViewExperience() == UIViewExperience.Mobile);
        this.Root.classList.toggle("h-full", UI.getViewExperience() != UIViewExperience.Mobile);
        const q = Database.query('config', 'SELECT GroupID, Name from ParameterGroups');
        if (q) {
            for (const r of q) {
                if (typeof r.GroupID == 'string' && typeof r.Name == 'string') {
                    this.groupNames.set(r.GroupID, r.Name);
                }
            }
        }
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.onEngineInput);
        window.removeEventListener('resize', this.onWindowResizeListener);
        super.onDetach();
    }
    onUpdate() {
        if (GameSetup.currentRevision != this.gameSetupRevision) {
            let skipRefresh = false;
            // There exists an issue in which refreshing the options causes any textbox-based parameters
            // to exit out of edit-mode and feel like they have lost focus.  This is made worse when using a regular
            // keyboard instead of a virtual keyboard.
            // To try and work around this, if only a single parameter's value has changed AND a textbox has focus
            // we avoid refreshing the game options.
            const focusElement = FocusManager.getFocus();
            if (focusElement.tagName == 'FXS-TEXTBOX') {
                skipRefresh = true;
            }
            else {
                const changes = GameSetup.getParameterChanges(this.gameSetupRevision);
                if (changes?.length == 1) {
                    skipRefresh = true;
                }
            }
            if (!skipRefresh) {
                this.refreshGameOptions();
            }
            this.gameSetupRevision = GameSetup.currentRevision;
        }
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        if (!Online.LiveEvent.getLiveEventGameFlag()) {
            NavTray.addOrUpdateShellAction2('LOC_UI_LOAD_CONFIG');
            NavTray.addOrUpdateShellAction1('LOC_UI_SAVE_CONFIG');
        }
        if (UI.supportsDLC()) {
            NavTray.addOrUpdateShellAction3('LOC_UI_STORE_ADDITIONAL_CONTENT');
        }
        NavTray.addOrUpdateSysMenu('LOC_UI_MP_HOST_LOBBY');
        FocusManager.setFocus(this.optionsContainer);
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    close() {
        super.close();
    }
    onHostLobby() {
        this.close();
        if (this.enteredAdditionalContent) {
            Configuration.editGame()?.refreshEnabledMods();
        }
        MultiplayerShellManager.hostMultiplayerGame(MultiplayerShellManager.serverType);
    }
    ;
    onSaveConfig() {
        ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "save_config", "server-type": MultiplayerShellManager.serverType, "save-type": SaveTypes.NETWORK_MULTIPLAYER } });
    }
    ;
    onLoadConfig() {
        ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "load_config", "server-type": MultiplayerShellManager.serverType, "save-type": SaveTypes.NETWORK_MULTIPLAYER } });
    }
    ;
    onExtraContent() {
        this.enteredAdditionalContent = true;
        ContextManager.push("screen-additional-content", { singleton: true, createMouseGuard: true });
    }
    refreshGameOptions() {
        // Create new options
        this.creatingOptions = true;
        const fragment = document.createDocumentFragment();
        const parameters = GameSetup.getGameParameters();
        let currentGroupId = -1;
        this.tooltipElements.length = 0;
        for (const p of parameters) {
            if (!p.hidden && p.invalidReason == GameSetupParameterInvalidReason.Valid && !this.ignoreParameters.includes(p.ID)) {
                if (currentGroupId != p.group) {
                    this.createHeader(fragment, p.group);
                    currentGroupId = p.group;
                }
                this.createOption(fragment, p);
            }
        }
        waitForLayout(() => this.creatingOptions = false);
        // Remove old options
        while (this.optionsContainer.firstChild) {
            this.optionsContainer.removeChild(this.optionsContainer.firstChild);
        }
        // Append new options to DOM
        this.optionsContainer.appendChild(fragment);
        this.refocusLastChangedParameter();
    }
    refocusLastChangedParameter() {
        if (this.lastChangedParameter != '') {
            const lastChangedElement = this.optionsContainer.querySelector(`[data-parameter-id="${this.lastChangedParameter}"]`);
            if (lastChangedElement) {
                FocusManager.setFocus(lastChangedElement);
            }
        }
        else {
            FocusManager.setFocus(this.optionsContainer);
        }
    }
    setParameterValue(parameterID, newValue) {
        if (!this.creatingOptions) {
            this.lastChangedParameter = parameterID;
        }
        GameSetup.setGameParameterValue(parameterID, newValue);
    }
    createHeader(frag, groupId) {
        const groupIdString = GameSetup.resolveString(groupId);
        const name = this.groupNames.get(groupIdString);
        if (name == undefined) {
            console.warn("game-creator: missing groupid:%s in groupNames map", groupIdString);
        }
        const header = document.createElement('fxs-header');
        header.classList.add('text-center', 'font-title-lg', 'text-secondary', 'uppercase');
        header.setAttribute('title', name ?? "UNKNOWN");
        const row = document.createElement('div');
        row.classList.add('option-row', 'flow-column');
        row.appendChild(header);
        frag.appendChild(row);
    }
    createOption(frag, parameter) {
        const isCompact = Layout.isCompact();
        const parameterID = GameSetup.resolveString(parameter.ID);
        const parameterName = GameSetup.resolveString(parameter.name);
        const row = document.createElement('div');
        row.classList.add('option-row', 'flow-column');
        const content = document.createElement('div');
        content.classList.add('flow-row', 'items-center');
        row.appendChild(content);
        const label = document.createElement('div');
        label.classList.add('text-gap-0', 'text-base', 'w-96', 'ml-32');
        if (parameterName) {
            label.setAttribute('data-l10n-id', parameterName);
        }
        content.appendChild(label);
        const parameterValueName = (parameter.value.name) ? GameSetup.resolveString(parameter.value.name) : parameter.value.value?.toString();
        const parameterContainer = document.createElement('div');
        parameterContainer.classList.value += "w-128 mr-32 flow-row justify-end";
        switch (parameter.domain.type) {
            case GameSetupDomainType.Select:
                const dropdown = document.createElement('fxs-dropdown');
                // we have to set the dropdown min width instead of 100% width because of the min-width rule on the drop down component.
                dropdown.classList.add('min-w-128');
                dropdown.setAttribute('data-parameter-id', parameterID);
                dropdown.setAttribute("data-audio-group-ref", "audio-mp-browser");
                dropdown.addEventListener(DropdownSelectionChangeEventName, (event) => {
                    const targetElement = event.target;
                    const parameterID = targetElement.getAttribute('data-parameter-id');
                    if (parameterID) {
                        const index = event.detail.selectedIndex;
                        const parameter = GameSetup.findGameParameter(parameterID);
                        if (parameter && parameter.domain.possibleValues && parameter.domain.possibleValues.length > index) {
                            const value = parameter.domain.possibleValues[index];
                            this.setParameterValue(parameterID, value.value);
                        }
                    }
                });
                const actionsList = [];
                parameter.domain.possibleValues?.forEach((pv, index) => {
                    const valueName = GameSetup.resolveString(pv.name);
                    if (!valueName) {
                        console.error(`mp-create-game: createOption(): Failed to resolve string for game option: ${pv.name}`);
                        return;
                    }
                    if (parameter.value.value == pv.value) {
                        dropdown.setAttribute('selected-item-index', index.toString());
                    }
                    actionsList.push({ label: Locale.compose(valueName), sortIndex: pv.sortIndex });
                });
                actionsList.sort(({ sortIndex: a }, { sortIndex: b }) => a - b);
                dropdown.setAttribute('dropdown-items', JSON.stringify(actionsList));
                if (parameterID == "Age") {
                    if (LiveEventManager.skipAgeSelect()) {
                        dropdown.setAttribute('disabled', 'true');
                    }
                }
                parameterContainer.appendChild(dropdown);
                break;
            case GameSetupDomainType.Boolean:
                if (parameter.readOnly) {
                    const value = document.createElement('div');
                    value.classList.add('display-flex');
                    if (parameterValueName) {
                        value.setAttribute('data-l10n-id', parameterValueName);
                    }
                    parameterContainer.appendChild(value);
                }
                else {
                    const value = document.createElement('fxs-checkbox');
                    value.classList.add('display-flex');
                    value.setAttribute('selected', parameterValueName ?? "false");
                    value.setAttribute('data-parameter-id', parameterID);
                    value.setAttribute("data-audio-group-ref", "audio-mp-browser");
                    value.addEventListener("component-value-changed", (event) => {
                        const newValue = event.detail.value;
                        const parameter = GameSetup.findGameParameter(parameterID);
                        if (parameter) {
                            this.setParameterValue(parameterID, newValue);
                        }
                    });
                    parameterContainer.appendChild(value);
                }
                break;
            case GameSetupDomainType.Text:
            case GameSetupDomainType.Integer:
            case GameSetupDomainType.UnsignedInteger:
                if (parameter.readOnly) {
                    const value = document.createElement('div');
                    value.classList.add('display-flex');
                    if (parameterValueName) {
                        value.setAttribute('data-l10n-id', parameterValueName);
                    }
                    parameterContainer.appendChild(value);
                }
                else {
                    const value = document.createElement('fxs-textbox');
                    value.classList.add('display-flex', 'w-full');
                    value.setAttribute("data-audio-group-ref", "audio-mp-browser");
                    value.setAttribute("max-length", "32");
                    if (parameterValueName) {
                        value.setAttribute('value', parameterValueName);
                    }
                    value.setAttribute('data-parameter-id', parameterID);
                    value.addEventListener("component-value-changed", (event) => {
                        const newValue = event.detail.value.toString();
                        const parameter = GameSetup.findGameParameter(parameterID);
                        if (parameter) {
                            if (parameter.domain.type != GameSetupDomainType.Text) {
                                const numericValue = Number.parseInt(newValue);
                                if (numericValue) {
                                    this.setParameterValue(parameterID, numericValue);
                                }
                            }
                            else {
                                this.setParameterValue(parameterID, newValue);
                            }
                        }
                    });
                    parameterContainer.appendChild(value);
                }
                break;
            case GameSetupDomainType.IntRange:
                // TODO implements slider option
                break;
        }
        const description = GameSetup.resolveString(parameter.description);
        if (description) {
            parameterContainer.setAttribute('data-tooltip-content', description);
            parameterContainer.setAttribute('data-tooltip-alignment', isCompact ? "top-right" : "");
            parameterContainer.setAttribute('data-tooltip-anchor', isCompact ? "left" : "right");
            parameterContainer.setAttribute('data-tooltip-anchor-offset', "10");
            this.tooltipElements.push(parameterContainer);
        }
        content.appendChild(parameterContainer);
        frag.appendChild(row);
    }
    onResize() {
        this.updateTooltipPosition();
        this.updateFrame();
    }
    updateTooltipPosition() {
        const isCompact = Layout.isCompact();
        if (isCompact != this.wasCompact) {
            for (const tooltipElement of this.tooltipElements) {
                tooltipElement.setAttribute('data-tooltip-alignment', isCompact ? "top-right" : "");
                tooltipElement.setAttribute('data-tooltip-anchor', isCompact ? "left" : "right");
            }
            this.wasCompact = isCompact;
        }
    }
    updateFrame() {
        this.frame.setAttribute("outside-safezone-mode", UI.getViewExperience() == UIViewExperience.Mobile ? "full" : "vertical");
    }
}
Controls.define('screen-mp-create-game', {
    createInstance: PanelMPCreateGame,
    description: 'Create game screen for multiplayer.',
    classNames: ['mp-create-game', 'flow-row', 'justify-center', 'absolute'],
    styles: ['fs://game/core/ui/shell/mp-create-game/mp-create-game.css'],
    content: ['fs://game/core/ui/shell/mp-create-game/mp-create-game.html'],
    attributes: []
});

//# sourceMappingURL=file:///core/ui/shell/mp-create-game/mp-create-game.js.map

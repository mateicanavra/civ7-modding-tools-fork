/**
 * @file diplomacy-manager.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Intermediary data organization/retrieval for diplomacy dialog/hub
 */
//TODO Implement the current use case for the custom dialog box as a custom component and then pull out the changes made here for custom dialogs
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import { DisplayHandlerBase, DisplayHideReason } from '/core/ui/context-manager/display-handler.js';
import Panel from '/core/ui/panel-support.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import LeaderModelManager from '/base-standard/ui/diplomacy/leader-model-manager.js';
import { RaiseDiplomacyEventName } from '/base-standard/ui/diplomacy/diplomacy-events.js';
import WorldInput from '/base-standard/ui/world-input/world-input.js';
export var TempDiplomacyActionType;
(function (TempDiplomacyActionType) {
    TempDiplomacyActionType[TempDiplomacyActionType["DECLARE_WAR"] = 0] = "DECLARE_WAR";
    TempDiplomacyActionType[TempDiplomacyActionType["DECLARE_PEACE"] = 1] = "DECLARE_PEACE";
    TempDiplomacyActionType[TempDiplomacyActionType["FORM_ALLIANCE"] = 2] = "FORM_ALLIANCE";
})(TempDiplomacyActionType || (TempDiplomacyActionType = {}));
;
;
;
/**
 * Some diplomacy panels need to handle input in special ways. Extending panel allows us to pass input events down without add additional listeners to the window which would pick up duplicate events
 */
export class DiplomacyInputPanel extends Panel {
    // These will be overridden in diplomacy panels that need to handle input and return if the input is still live or not.
    handleInput(_inputEvent) {
        return true;
    }
    handleNavigation(_navigationEvent) {
        return true;
    }
}
// [PLY] Exporting DiplomacyDialogManagerImpl & DiplomacyDealManagerImpl for XR compatibility
export class DiplomacyDialogManagerImpl extends DisplayHandlerBase {
    constructor() {
        super("DiplomacyDialog", 6000);
    }
    show(request) {
        const isAlreadyInDialog = InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG");
        DiplomacyManager.currentDiplomacyDialogData = request;
        if (isAlreadyInDialog) {
            //If we were already in a dialog, let the diplomacy-dialog panel and leader-model manager know that we have moved on to the next diplomacy dialog
            window.dispatchEvent(new CustomEvent('diplomacy-dialog-next'));
        }
        else {
            InterfaceMode.switchTo("INTERFACEMODE_DIPLOMACY_DIALOG");
        }
    }
    hide(_request, options) {
        DiplomacyManager.hide(options.reason === DisplayHideReason.Suspend);
    }
    isEmpty() {
        return DisplayQueueManager.findAll(this.getCategory()).length == 0;
    }
}
export class DiplomacyDealManagerImpl extends DisplayHandlerBase {
    constructor() {
        super("DiplomacyDeal", 5000);
    }
    show(request) {
        if (!request.blockClose) {
            DiplomacyManager.currentDiplomacyDialogData = null;
            DiplomacyManager.currentDiplomacyDealData = request;
            InterfaceMode.switchTo("INTERFACEMODE_PEACE_DEAL");
        }
    }
    hide(request, options) {
        if (!request.blockClose) {
            DiplomacyManager.hide(options.reason === DisplayHideReason.Suspend);
        }
    }
    isEmpty() {
        return DisplayQueueManager.findAll(this.getCategory()).length == 0;
    }
}
class DiplomacyProjectManagerImpl extends DisplayHandlerBase {
    constructor() {
        super("DiplomaticResponseUIData", 8000);
    }
    show(request) {
        DiplomacyManager.currentProjectReactionRequest = request;
        InterfaceMode.switchTo("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION");
    }
    hide(_request, options) {
        DiplomacyManager.hide(options.reason === DisplayHideReason.Suspend);
    }
    isEmpty() {
        return DisplayQueueManager.findAll(this.getCategory()).length == 0;
    }
}
class DiplomacyManagerImpl {
    constructor() {
        this.beforeUnloadListener = this.onUnload.bind(this);
        this.diplomacyStatementListener = this.onDiplomacyStatement.bind(this);
        this.diplomacySessionClosedListener = this.onDiplomacySessionClosed.bind(this);
        this.actionDetailsClosedListener = this.onActionDetailsClosed.bind(this);
        this.firstMeetReactionClosedListener = this.onFirstMeetReactionClosed.bind(this);
        this.onRaiseDiplomacyHubListener = this.onRaiseDiplomacyHub.bind(this);
        this._selectedPlayerID = PlayerIds.NO_PLAYER;
        this._diplomacyActions = [];
        this._availableProjects = [];
        this._availableEndeavors = [];
        this._availableSanctions = [];
        this._availableEsionage = [];
        this._availableTreaties = [];
        this._selectedProjectData = null;
        this.isClosingActionsPanel = false;
        this._isFirstMeetDiplomacyOpen = false;
        this._isDeclareWarDiplomacyOpen = false;
        this.currentDiplomacyDialogData = null;
        this.selectedActionID = -1;
        this.currentDiplomacyDealData = null;
        this.currentAllyWarData = null;
        this.currentProjectReactionData = null;
        this.currentProjectReactionRequest = null;
        this.showDiplomacyAfterFirstMeet = false;
        this.firstMeetPlayerID = PlayerIds.NO_PLAYER;
        this.currentEspionageData = null;
        this.selectedAttributeType = "";
        //Should we close out of entire diplomacy view or just step back to the diplomacy action panels when closing details
        //True when coming from notifications or clicking on actions on the map
        this.shouldQuickClose = false;
        this.initializeListeners();
        WorldInput.addWarHandler(this.startWarFromMap.bind(this));
    }
    isShowing() {
        return InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_PEACE_DEAL") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION");
    }
    isEmpty() {
        return DiplomacyDealManager.isEmpty() && DiplomacyDialogManager.isEmpty();
    }
    addDealCloseBlocker() {
        // TODO: Make some type of real blocker, instead of hacking it into the queue
        return DiplomacyDealManager.addDisplayRequest({
            category: DiplomacyDealManager.getCategory(),
            blockClose: true,
            addToFront: true
        });
    }
    /**
      * @implements {IDisplayQueue}
      */
    hide(isSuspended) {
        this.selectedActionID = -1;
        if (isSuspended) {
            LeaderModelManager.exitLeaderScene();
        }
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_PEACE_DEAL")) {
            InterfaceMode.switchToDefault();
            return;
        }
        else if (this.firstMeetPlayerID != PlayerIds.NO_PLAYER && DiplomacyProjectManager.isEmpty()) {
            //If we are leaving a first meet dialog, always automatically open diplomacy after
            //TODO: Add a user option to disable this!
            InterfaceMode.switchToDefault();
            setTimeout(
            //Wait 2ms so the context manager can finish advancing and closing down
            () => {
                this.raiseDiplomacyHub(this.firstMeetPlayerID);
                this.firstMeetPlayerID = PlayerIds.NO_PLAYER;
                return;
            }, 2);
            return;
        }
        const blocker = this.addDealCloseBlocker();
        LeaderModelManager.exitLeaderScene();
        if (!isSuspended) {
            setTimeout(() => {
                DisplayQueueManager.close(blocker);
                if (DiplomacyManager.currentDiplomacyDealData == null) {
                    //Don't leave if there is a response
                    //TODO: We need a smoother transition if the AI offers a modified offer
                    InterfaceMode.switchToDefault();
                }
            }, LeaderModelManager.MAX_LENGTH_OF_ANIMATION_EXIT);
        }
        else {
            DisplayQueueManager.close(blocker);
            if (DiplomacyManager.currentDiplomacyDealData == null) {
                //Don't leave if there is a response
                //TODO: We need a smoother transition if the AI offers a modified offer
                InterfaceMode.switchToDefault();
            }
        }
    }
    /// Listeners for system events.
    initializeListeners() {
        engine.on('BeforeUnload', this.beforeUnloadListener);
        engine.on('DiplomacyStatement', this.diplomacyStatementListener);
        engine.on('DiplomacySessionClosed', this.diplomacySessionClosedListener);
        window.addEventListener("first-meet-reaction-closed", this.firstMeetReactionClosedListener);
        window.addEventListener(RaiseDiplomacyEventName, this.onRaiseDiplomacyHubListener);
    }
    cleanup() {
        engine.off('BeforeUnload', this.beforeUnloadListener);
        engine.off('DiplomacyStatement', this.diplomacyStatementListener);
        engine.off('DiplomacySessionClosed', this.diplomacySessionClosedListener);
        window.removeEventListener("first-meet-reaction-closed", this.firstMeetReactionClosedListener);
        window.removeEventListener(RaiseDiplomacyEventName, this.onRaiseDiplomacyHubListener);
    }
    onUnload() {
        this.cleanup();
    }
    get selectedPlayerID() {
        return this._selectedPlayerID;
    }
    get diplomacyActions() {
        return this._diplomacyActions;
    }
    get availableProjects() {
        return this._availableProjects;
    }
    get availableEndeavors() {
        return this._availableEndeavors;
    }
    get availableSanctions() {
        return this._availableSanctions;
    }
    get availableEspionage() {
        return this._availableEsionage;
    }
    get availableTreaties() {
        return this._availableTreaties;
    }
    get selectedProjectData() {
        return this._selectedProjectData;
    }
    get isFirstMeetDiplomacyOpen() {
        return this._isFirstMeetDiplomacyOpen;
    }
    get isDeclareWarDiplomacyOpen() {
        return this._isDeclareWarDiplomacyOpen;
    }
    queryAvailableProjectData(targetPlayer) {
        const availableProjectData = Game.Diplomacy.getProjectDataForUI(GameContext.localPlayerID, (targetPlayer != null) && targetPlayer != GameContext.localPlayerID ? targetPlayer : -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET);
        if (!Players.get(this._selectedPlayerID)?.isMajor) {
            this._availableProjects = availableProjectData.filter((project) => (project.projectStatus == DiplomacyProjectStatus.PROJECT_AVAILABLE || (project.projectStatus == DiplomacyProjectStatus.PROJECT_NO_VIABLE_TARGETS)));
            this._availableEndeavors = [];
            this._availableSanctions = [];
            this._availableEsionage = [];
            this._availableTreaties = [];
            return;
        }
        this._availableProjects = availableProjectData.filter((project) => (project.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_PROJECT && project.projectStatus != DiplomacyProjectStatus.PROJECT_NOT_UNLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_BLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_ACTIVE));
        this._availableEndeavors = availableProjectData.filter((project) => (project.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ENDEAVOR && project.projectStatus != DiplomacyProjectStatus.PROJECT_NOT_UNLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_BLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_ACTIVE));
        this._availableSanctions = availableProjectData.filter((project) => (project.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION && project.projectStatus != DiplomacyProjectStatus.PROJECT_NOT_UNLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_BLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_ACTIVE));
        this._availableEsionage = availableProjectData.filter((project) => (project.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE && project.projectStatus != DiplomacyProjectStatus.PROJECT_NOT_UNLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_BLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_ACTIVE));
        this._availableTreaties = availableProjectData.filter((project) => (project.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_TREATY && project.projectStatus != DiplomacyProjectStatus.PROJECT_NOT_UNLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_BLOCKED && project.projectStatus != DiplomacyProjectStatus.PROJECT_ACTIVE));
    }
    /**
     * Another system is requesting for the diplomacy system to be raised.
     * @param event
     */
    onRaiseDiplomacyHub(event) {
        // Checks (if any) done in called function.
        const playerID = event.detail.playerID;
        this.raiseDiplomacyHub(playerID);
    }
    raiseDiplomacyHub(playerID) {
        if (this.isClosingActionsPanel) {
            return;
        }
        this._selectedPlayerID = playerID;
        if (playerID != GameContext.localPlayerID) {
            this.populateDiplomacyActions();
        }
        if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
            InterfaceMode.switchTo("INTERFACEMODE_DIPLOMACY_HUB");
        }
        else {
            const callback = () => {
                //We have to let the actions panel know we switched leaders
                window.dispatchEvent(new CustomEvent("diplomacy-selected-player-changed"));
            };
            callback();
        }
    }
    lowerDiplomacyHub() {
        const closeCallback = () => {
            this.isClosingActionsPanel = true;
            LeaderModelManager.exitLeaderScene();
            this._selectedPlayerID = PlayerIds.NO_PLAYER;
            setTimeout(() => {
                InterfaceMode.switchToDefault();
                this.isClosingActionsPanel = false;
            }, LeaderModelManager.MAX_LENGTH_OF_ANIMATION_EXIT);
        };
        closeCallback();
    }
    closeCurrentDiplomacyDeal(closeSession, ourDiplomacySession) {
        if (this.currentDiplomacyDealData) {
            const request = this.currentDiplomacyDealData;
            this.currentDiplomacyDealData = null;
            DisplayQueueManager.close(request);
            // It is possible, that we do NOT want to close the session, if we are expecting further statements
            // for the session. i.e. The ACCEPTED / REJECTED response from the AI
            if (closeSession) {
                Game.DiplomacySessions.closeSession(request.SessionID);
            }
        }
        else if (ourDiplomacySession && closeSession) {
            Game.DiplomacySessions.closeSession(ourDiplomacySession);
        }
    }
    closeCurrentDiplomacyProject(closeToDiploHub) {
        if (this.currentProjectReactionRequest && closeToDiploHub == false) {
            const request = this.currentProjectReactionRequest;
            this.currentProjectReactionRequest = null;
            DisplayQueueManager.close(request);
        }
        else if (this.currentProjectReactionRequest) {
            InterfaceMode.switchTo("INTERFACEMODE_DIPLOMACY_HUB");
        }
    }
    addCurrentDiplomacyProject(request) {
        if (request) {
            DiplomacyProjectManager.addDisplayRequest(request);
        }
    }
    // Handle deal a related statement
    // Returns true if the statement was handled and no further processing is needed
    handleDealStatement(data) {
        if (data.values.DealAction && data.values.DealAction != -1) {
            // First see if this is a reponse to asking for an INSPECT of a deal
            if (data.values.RespondingToDealAction && data.values.RespondingToDealAction == DiplomacyDealProposalActions.INSPECT) {
                // We want to signal the active deal what the response was
                window.dispatchEvent(new CustomEvent('diplomacy-deal-proposal-response', { detail: { eventData: data } }));
                return true;
            }
            // If the statement was 'accepted', then this is just a response from the other player
            // that they have accepted the deal.  The deal is already enacted, we can show a positive response if desired.
            if (data.values.DealAction == DiplomacyDealProposalActions.ACCEPTED || data.values.DealAction == DiplomacyDealProposalActions.REJECTED) {
                // Close the the 'deal' panel, without closing the session
                //window.dispatchEvent(new CustomEvent('diplomacy-dialog-request-close'));
                // Say we didn't handle it.  The regular diplomacy system will use the event to show the leader accepting / rejecting.
                return false;
            }
            const newDealData = {
                SessionID: data.sessionId,
                OtherPlayer: data.values.FromPlayer,
                //Incoming deal has already been switched to an outgoing deal for player response
                WorkingDealID: {
                    direction: DiplomacyDealDirection.OUTGOING,
                    player1: GameContext.localPlayerID,
                    player2: data.values.FromPlayer
                },
                DealAction: data.values.DealAction
            };
            DiplomacyDealManager.addDisplayRequest(newDealData);
            return true;
        }
        return false;
    }
    // ------------------------------------------------------------------------
    // Handle the diplomacy statement
    onDiplomacyStatement(data) {
        //Only statements that are sent to the player need to be processed here
        if (data.values && data.values.ToPlayer == GameContext.localPlayerID) {
            // Check if this is a deal related statement
            if (this.handleDealStatement(data)) {
                return;
            }
            // BPF 10_03_23 - For Diplomacy events that involve Independents we don't want to open the major-civ leader screen
            // A screen exists for handling diplomatic projects with Independents but at the time of this change no option for 'Declare War' exists.
            const player = Players.get(data.values.FromPlayer);
            if (player != null) {
                if (player.isIndependent) {
                    return;
                }
            }
            const diplomacyDialogData = this.buildDialogData(data);
            const foundDialogRequests = DisplayQueueManager.findAll((p) => p.SessionID === data.sessionId);
            if (foundDialogRequests.length > 0) {
                // Update existing entry
                for (const foundRequest of foundDialogRequests) {
                    Object.assign(foundRequest, data);
                    if (foundRequest == this.currentDiplomacyDialogData) {
                        window.dispatchEvent(new CustomEvent('diplomacy-dialog-update-response'));
                    }
                }
            }
            else {
                // A new entry is required
                DiplomacyDialogManager.addDisplayRequest(diplomacyDialogData);
            }
        }
    }
    // ------------------------------------------------------------------------
    // Handle a close event from a session
    onDiplomacySessionClosed(data) {
        if (data.sessionId) {
            const foundDialogRequests = DisplayQueueManager.findAll((p) => p.SessionID === data.sessionId);
            if (foundDialogRequests.length > 0) {
                // Update existing entry
                for (const foundRequest of foundDialogRequests) {
                    if (foundRequest == this.currentDiplomacyDialogData ||
                        (foundRequest.category == "DiplomacyDeal" && InterfaceMode.isInInterfaceMode("INTERFACEMODE_PEACE_DEAL"))) {
                        window.dispatchEvent(new CustomEvent('diplomacy-dialog-request-close'));
                    }
                }
            }
        }
    }
    // ------------------------------------------------------------------------
    closeCurrentDiplomacyDialog() {
        if (this.currentDiplomacyDialogData) {
            if (Configuration.getXR()) {
                console.warn("[hansoft://10.1.4.56;Company$20projects;98a65181/Task/308841?ID=731] Calling Game.DiplomacySessions.closeSession()");
            }
            // KWG: This is required, to unblock the player!
            Game.DiplomacySessions.closeSession(this.currentDiplomacyDialogData.SessionID);
            DisplayQueueManager.close(this.currentDiplomacyDialogData);
            if (this.currentProjectReactionRequest) {
                DisplayQueueManager.close(this.currentProjectReactionRequest);
            }
            this.currentDiplomacyDialogData = null;
        }
    }
    // ------------------------------------------------------------------------
    // Take a diplomacy statement event, and pull out some information into 
    // a DiplomacyDialogData structure that we can use to drive the dialog.
    buildDialogData(data) {
        const statementFrame = this.getStatementFrame(data);
        const messageString = this.buildMessageString(data, statementFrame);
        const diplomacyMessageChoices = this.getChoices(statementFrame, data.actingPlayer);
        // The 'other' player is always the non-local player
        const otherPlayer = (data.values.FromPlayer == GameContext.localPlayerID ? data.values.ToPlayer : data.values.FromPlayer);
        const diplomacyDialogData = {
            Message: messageString,
            Choices: diplomacyMessageChoices,
            SessionID: data.sessionId,
            OtherPlayerID: otherPlayer,
            InitiatingPlayerID: data.values.Initiator,
            StatementTypeDef: GameInfo.DiplomacyStatements.lookup(data.values.StatementType),
            StatementFrameDef: statementFrame,
            FocusID: data.values.FocusID,
        };
        if (data.values.DealAction) {
            diplomacyDialogData.DealAction = data.values.DealAction;
        }
        const sStatementTypeName = Game.DiplomacySessions.getKeyNameOrNumber(data.values.StatementType);
        if (sStatementTypeName) {
            if (sStatementTypeName == "DECLARE_SURPRISE_WAR") {
                UI.sendAudioEvent(Audio.getSoundTag('data-audio-leader-war-declared', 'leader-panel'));
            }
            else if (sStatementTypeName == "MAKE_DEAL") {
                UI.sendAudioEvent(Audio.getSoundTag('data-audio-leader-peace-proposed', 'leader-panel'));
            }
        }
        return diplomacyDialogData;
    }
    // ------------------------------------------------------------------------
    buildMessageString(data, statementFrame) {
        const statementDef = GameInfo.DiplomacyStatements.lookup(data.values.StatementType);
        if (!statementDef) {
            console.error("diplomacy-manager: Unable to get diplomacy statement definition during buildMessageString()");
            this.closeCurrentDiplomacyDialog();
            return "";
        }
        const otherPlayer = Players.get(data.values.FromPlayer);
        if (!otherPlayer) {
            console.error("diplomacy-manager: Unable to get playerLibrary for from player ( player ID: " + data.values.FromPlayer + ") during buildMessageString()");
            this.closeCurrentDiplomacyDialog();
            return "";
        }
        const otherLeader = GameInfo.Leaders.lookup(otherPlayer.leaderType);
        if (!otherLeader) {
            console.error("diplomacy-manager: Unable to get leader leaderDefinition for from player ( player ID: " + data.values.FromPlayer + ") during buildMessageString()");
            this.closeCurrentDiplomacyDialog();
            return "";
        }
        const statementType = Game.DiplomacySessions.getKeyNameOrNumber(data.values.StatementType);
        const messageType = this.getResponseTypeName(data.values.ResponseType); //POSITIVE, NEGATIVE, etc
        const otherLeaderName = otherLeader.LeaderType;
        //Find the first LOC string applicable to this statement
        //They should always have at least the statement type defined (i.e. FIRST_MEET_NEAR_INITIATOR)
        //If we have a valid statement frame, use its text as the base, else make the base out of the statement type's name.
        const baseDiplomacyMessageString = (statementFrame && statementFrame.Text) ? statementFrame.Text : "LOC_DIPLO_" + statementType;
        if (data.values.DealAction == DiplomacyDealProposalActions.ACCEPTED) {
            if (Locale.keyExists(baseDiplomacyMessageString + "_ACCEPTED_" + otherLeaderName)) {
                return Locale.compose(baseDiplomacyMessageString + "_ACCEPTED_" + otherLeaderName);
            }
            else {
                return Locale.compose(baseDiplomacyMessageString + "_ACCEPTED_GENERIC");
            }
        }
        else if (data.values.DealAction == DiplomacyDealProposalActions.REJECTED) {
            if (Locale.keyExists(baseDiplomacyMessageString + "_REJECTED_" + otherLeaderName)) {
                return Locale.compose(baseDiplomacyMessageString + "_REJECTED_" + otherLeaderName);
            }
            else {
                return Locale.compose(baseDiplomacyMessageString + "_REJECTED_GENERIC");
            }
        }
        //Try full string with all parameters first (FIRST_MEET_NEAR_INITIATOR + _ + LEADER_AMANI + _ + NEUTRAL)
        //                                          (RESIDENT_EMBASY + _ + LEADER_AMANI + _ + AI_REFUSE_DEAL)
        let diplomacyMessageString = baseDiplomacyMessageString + "_" + otherLeaderName + "_" + messageType;
        if (Locale.keyExists(diplomacyMessageString)) {
            return Locale.compose(diplomacyMessageString);
        }
        //Try the rest of the combinations
        diplomacyMessageString = baseDiplomacyMessageString + "_ANY_" + messageType;
        if (Locale.keyExists(diplomacyMessageString)) {
            return Locale.compose(diplomacyMessageString);
        }
        diplomacyMessageString = baseDiplomacyMessageString + "_" + otherLeaderName + "_ANY";
        if (Locale.keyExists(diplomacyMessageString)) {
            return Locale.compose(diplomacyMessageString);
        }
        //Fallback generic string
        diplomacyMessageString = baseDiplomacyMessageString + "_GENERIC";
        return Locale.compose(diplomacyMessageString);
    }
    getResponseTypeName(responseTypeHash) {
        const str = Game.DiplomacySessions.getKeyName(responseTypeHash);
        if (str) {
            return str;
        }
        return "ANY";
    }
    getStatementFrame(data) {
        // Need the strings for the types.
        const sStatementTypeName = Game.DiplomacySessions.getKeyNameOrNumber(data.values.StatementType);
        const sResponseTypeName = Game.DiplomacySessions.getKeyNameOrNumber(data.values.ResponseType);
        // Find the matching frame
        const statementFrame = GameInfo.DiplomacyStatementFrames.find(v => v.Type == sStatementTypeName && v.Frame == sResponseTypeName);
        return statementFrame;
    }
    getChoices(statementFrame, actingPlayer) {
        const choices = [];
        if (statementFrame) {
            if (statementFrame.Selections) {
                // This will get all the selections that match the type.
                const selections = GameInfo.DiplomacyStatementSelections.filter(v => v.Type == statementFrame.Selections);
                // Sort them by their desired order
                selections.sort((a, b) => a.Sort - b.Sort);
                selections.forEach(selection => {
                    const choiceCallback = () => {
                        //TODO: Once responses are hooked up, start using them instead of force closing the session
                        // Game.DiplomacySessions.sendResponse(event.sessionId, GameContext.localPlayerID, selection.Key);
                        // if (selection.Key == "CHOICE_EXIT") {
                        // 	this.closeCurrentDiplomacyDialog();
                        // }
                        // KWG: This should not be directly calling the LeaderModelManager here.
                        if (this.isFirstMeetDiplomacyOpen) {
                            window.dispatchEvent(new CustomEvent("diplomacy-first-meet-continue"));
                        }
                        if (this.isDeclareWarDiplomacyOpen) {
                            this._isDeclareWarDiplomacyOpen = false;
                            this.closeCurrentDiplomacyDialog();
                        }
                        else {
                            setTimeout(() => { this.closeCurrentDiplomacyDialog(); }, 2000);
                            LeaderModelManager.beginAcknowledgePlayerSequence();
                        }
                    };
                    const choice = { ChoiceString: selection.Text, ChoiceType: selection.Key, Callback: choiceCallback };
                    choices.push(choice);
                });
            }
            //TODO: Temp, these should be coming from the responses/statement data
            if (statementFrame.Selections?.includes("FIRST_MEET")) {
                const choiceCallback = () => {
                    if (!this._isFirstMeetDiplomacyOpen) {
                        this._selectedPlayerID = actingPlayer;
                        this._isFirstMeetDiplomacyOpen = true;
                    }
                };
                const choice = { ChoiceString: Locale.compose("LOC_DIPLOMACY_OPEN_DIPLOMACY"), ChoiceType: "CHOICE_ACKNOWLEDGE", Callback: choiceCallback };
                choices.push(choice);
            }
            else if (statementFrame.Selections == "CHOICES_DECLARE_WAR") {
                const choiceCallback = () => {
                    let warID = -1;
                    const jointEvents = Game.Diplomacy.getJointEvents(GameContext.localPlayerID, actingPlayer, false);
                    if (jointEvents.length > 0) {
                        jointEvents.forEach(jointEvent => {
                            if (jointEvent.actionTypeName == "DIPLOMACY_ACTION_DECLARE_WAR") {
                                warID = jointEvent.uniqueID;
                            }
                            ;
                        });
                    }
                    this.selectedActionID = warID;
                    ContextManager.push("screen-diplomacy-action-details", { singleton: true, createMouseGuard: true });
                    window.addEventListener('diplomacy-action-details-closed', this.actionDetailsClosedListener);
                };
                const choice = { ChoiceString: Locale.compose("LOC_DIPLOMACY_OPEN_WAR_DETAILS"), ChoiceType: "CHOICE_ACKNOWLEDGE", Callback: choiceCallback };
                choices.push(choice);
            }
        }
        //If there are no associated choices, the player can leave this session
        if (choices.length <= 0) {
            const defaultChoiceCallback = () => {
                //TODO: Once responses are hooked up, start using them instead of force closing the session
                //Game.DiplomacySessions.sendResponse(event.sessionId, GameContext.localPlayerID, "CHOICE_EXIT"); ``
                // KWG: This should not be directly calling the LeaderModelManager here.
                LeaderModelManager.beginAcknowledgePlayerSequence();
                setTimeout(() => { this.closeCurrentDiplomacyDialog(); }, 2000);
            };
            const defaultChoice = { ChoiceString: Locale.compose("LOC_DIPLO_GENERIC_EXIT"), ChoiceType: "CHOICE_EXIT", Callback: defaultChoiceCallback };
            choices.push(defaultChoice);
        }
        return choices;
    }
    onActionDetailsClosed() {
        window.removeEventListener('diplomacy-action-details-closed', this.actionDetailsClosedListener);
        this.closeCurrentDiplomacyDialog();
    }
    //Get the localized string corresponding to a specific dialog choice
    // private buildChoiceString(choiceTypeName: string, statementFrame: DiplomacyStatementFrameDefinition | undefined): string {
    // 	if (!statementFrame) {
    // 		console.error("diplomacy-manager: Unable to get diplomacy statement frame definition during buildChoiceString()");
    // 		this.closeCurrentDiplomacyDialog();
    // 		return "";
    // 	}
    // 	const baseChoiceString: string = "LOC_DIPLO_" + statementFrame.Type + "_CHOICE_";
    // 	let choiceString: string = baseChoiceString + choiceTypeName;
    // 	if (Locale.keyExists(choiceString)) {
    // 		return Locale.compose(choiceString);
    // 	}
    // 	choiceString = baseChoiceString + "GENERIC";
    // 	return Locale.compose(choiceString);
    // }
    populateDiplomacyActions() {
        this._diplomacyActions = [];
        const player = Players.get(GameContext.localPlayerID);
        if (player === null) {
            console.error("diplomacy-manager: Attempting to populate available diplomatic actions, but no valid player library!");
            return;
        }
        const playerDiplomacy = player.Diplomacy;
        if (playerDiplomacy == undefined) {
            console.error("diplomacy-manager: Attempting to populate available diplomatic actions, but no valid player diplomacy library!");
            return;
        }
        if (Players.isValid(this._selectedPlayerID) == false) {
            return;
        }
        let thisPlayerID = GameContext.localPlayerID;
        const allianceArgs = {
            Player1: thisPlayerID,
            Player2: this._selectedPlayerID,
            Type: DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE
        };
        let allianceCaption = Locale.compose("LOC_DIPLOMACY_ACTION_FORM_ALLIANCE_NAME");
        let allianceOperationType = PlayerOperationTypes.FORM_ALLIANCE;
        let allianceResults = Game.PlayerOperations.canStart(thisPlayerID, allianceOperationType, allianceArgs, false);
        if (!allianceResults.Success) {
            const localPlayerDiplomacy = Players.get(thisPlayerID)?.Diplomacy;
            if (localPlayerDiplomacy === undefined) {
                console.error("diplomacy-manager: Unable to get local player diplomacy library while updating available actions!");
                return;
            }
            if (localPlayerDiplomacy.hasAllied(this._selectedPlayerID)) {
                allianceCaption = Locale.compose("LOC_DIPLOMACY_ACTION_CANCEL_ALLIANCE_NAME");
                allianceOperationType = PlayerOperationTypes.CANCEL_ALLIANCE;
                allianceResults = Game.PlayerOperations.canStart(thisPlayerID, allianceOperationType, allianceArgs, false);
            }
        }
        let peaceQueryResults = playerDiplomacy.canMakePeaceWith(this._selectedPlayerID);
        let peaceFailureTooltip = "";
        peaceQueryResults.FailureReasons?.forEach(failureReason => {
            peaceFailureTooltip += failureReason;
        });
        if (peaceQueryResults.Success == true) {
            // Disable if there is already a Peace Deal in flight somewhere
            if (Game.DiplomacyDeals.hasPendingDeal(thisPlayerID, this._selectedPlayerID) == true) {
                // We have a deal pending with the other player, we have to wait for that to be resolved
                peaceQueryResults.Success = false;
                peaceFailureTooltip += Locale.compose("LOC_DIPLOMACY_PEACE_DEAL_IS_PENDING");
            }
        }
        const warQueryResults = playerDiplomacy.canDeclareWarOn(this._selectedPlayerID);
        let warFailureTooltip = "";
        warQueryResults.FailureReasons?.forEach(failureReason => {
            warFailureTooltip += failureReason;
        });
        if (warFailureTooltip == "" && !player.isTurnActive) {
            warFailureTooltip = Locale.compose("LOC_DIPLOMACY_WAR_NOT_YOUR_TURN");
        }
        if (peaceFailureTooltip == "" && !player.isTurnActive) {
            peaceFailureTooltip = Locale.compose("LOC_DIPLOMACY_PEACE_NOT_YOUR_TURN");
        }
        const isIndependent = Players.get(this._selectedPlayerID)?.isIndependent;
        const isMajor = Players.get(this._selectedPlayerID)?.isMajor;
        const declareWarCallback = () => {
            if (isIndependent) {
                //If we are trying to declare war against an independent, no need to choose war type
                const dbCallback = (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        this.confirmDeclareWar(this._selectedPlayerID, DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR);
                    }
                };
                const otherLeaderName = Locale.compose(Players.get(this._selectedPlayerID)?.name);
                DialogManager.createDialog_ConfirmCancel({
                    body: Locale.compose("LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_BODY", otherLeaderName),
                    title: "LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_TITLE",
                    displayQueue: "DiplomacyDialog",
                    callback: dbCallback
                });
            }
            else {
                //Declaring war against player, choose war type
                this.raiseWarTypePopup(this._selectedPlayerID);
            }
        };
        const tempDeclareWarAction = {
            actionString: Locale.compose("LOC_DIPLOMACY_ACTION_DECLARE_WAR_NAME"),
            available: (warQueryResults.Success) && player.isTurnActive && player.Diplomacy != undefined && player.Diplomacy.hasMet(this._selectedPlayerID),
            Callback: declareWarCallback,
            disabledTooltip: warFailureTooltip,
            bigButton: true,
            action: TempDiplomacyActionType.DECLARE_WAR,
        };
        const makePeaceCallback = () => {
            if (!peaceQueryResults.Success) {
                return;
            }
            InterfaceMode.switchTo("INTERFACEMODE_PEACE_DEAL");
        };
        const tempMakePeaceAction = {
            actionString: Locale.compose("LOC_DIPLOMACY_ACTION_PROPOSE_PEACE_NAME"),
            available: peaceQueryResults.Success && (isMajor != undefined && isMajor) && player.isTurnActive,
            Callback: makePeaceCallback,
            disabledTooltip: peaceFailureTooltip,
            audioString: "data-audio-propose-peace-release",
            action: TempDiplomacyActionType.DECLARE_PEACE,
        };
        const formAllianceAction = {
            actionString: allianceCaption,
            available: allianceResults.Success && player.isTurnActive,
            Callback: () => { this.raiseAlliancePopup(thisPlayerID, this._selectedPlayerID, allianceOperationType, allianceArgs); },
            disabledTooltip: (allianceResults.FailureReasons != undefined && allianceResults.FailureReasons.length > 0) ? allianceResults.FailureReasons[0] : Locale.compose("LOC_DIPLOMACY_ACTION_FORM_ALLIANCE_DISABLED"),
            audioString: "data-audio-leader-form-alliance",
            action: TempDiplomacyActionType.FORM_ALLIANCE
        };
        if (playerDiplomacy.isAtWarWith(this._selectedPlayerID)) {
            this._diplomacyActions.push(tempMakePeaceAction);
        }
        else {
            this._diplomacyActions.push(formAllianceAction);
        }
        this._diplomacyActions.push(tempDeclareWarAction);
    }
    confirmDeclareWar(playerID, warType) {
        const args = {
            Player1: GameContext.localPlayerID,
            Player2: playerID,
            Type: warType
        };
        const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.DECLARE_WAR, args, false);
        if (result.Success) {
            Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.DECLARE_WAR, args);
        }
        this._isDeclareWarDiplomacyOpen = true;
        //Rather than immediatlely closing diplomacy, give any dialogs that may have come through during action selection a chance to take over
        this.closeCurrentDiplomacyDialog();
    }
    /**
     * Starts the process of a war between to Civilizations (or a Civivilization and IP) from the world.
     * @param warDeclarationTarget target for declaring war
     * @param postDeclareWarAction callback for when war is declared.
     * @returns true if handled, false otherwise
     */
    startWarFromMap(warDeclarationTarget, postDeclareWarAction) {
        const args = {
            Player1: GameContext.localPlayerID,
            Player2: warDeclarationTarget.player,
            Type: DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR
        };
        const playerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
        if (playerDiplomacy == undefined) {
            console.error("diplomacy-manager: Attempting to raise war type popup, but no valid player diplomacy library!");
            return false;
        }
        const surpriseWarResults = playerDiplomacy.canDeclareWarOn(warDeclarationTarget.player);
        if (!surpriseWarResults.Success) {
            return false;
        }
        const targetPlayer = Players.get(warDeclarationTarget.player);
        if (targetPlayer == null) {
            console.error(`diplomacy-manager: The target player was null for player '${warDeclarationTarget.player}'`);
            return false;
        }
        if (targetPlayer.isIndependent) {
            const independentName = targetPlayer.civilizationFullName;
            if (!independentName) {
                console.error("diplomacy-manager: No name for independent at index: " + warDeclarationTarget.independentIndex);
                return false;
            }
            const dbCallback = (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    this._selectedPlayerID = warDeclarationTarget.player;
                    Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.DECLARE_WAR, args);
                    //Now that we are at war, continue the action that we used to start this war
                    postDeclareWarAction();
                }
            };
            DialogManager.createDialog_ConfirmCancel({
                body: Locale.compose("LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_ON_INDEPENDENT_BODY", Locale.compose(independentName)),
                title: Locale.compose("LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_ON_INDEPENDENT_TITLE"),
                displayQueue: "DiplomacyDialog",
                callback: dbCallback
            });
        }
        else {
            if (Players.get(warDeclarationTarget.player)?.isMinor) {
                //This is a City-State: we are declaring war against their suzerain
                const cityStatePlayer = Players.get(warDeclarationTarget.player);
                if (!cityStatePlayer) {
                    console.error("diplomacy-manager: Unable to get PlayerLibrary for suzerain of city-state with id " + warDeclarationTarget.player);
                    return false;
                }
                if (!cityStatePlayer.Influence) {
                    console.error("diplomacy-manager: Unable to get PlayerInfluence object for city-state with id " + warDeclarationTarget.player);
                    return false;
                }
                if (cityStatePlayer.Influence.getSuzerain() == GameContext.localPlayerID) {
                    //Can't declare war on your own city-state
                    return false;
                }
                else {
                    const suzerainPlayer = (Players.get(cityStatePlayer.Influence.getSuzerain()));
                    if (!suzerainPlayer) {
                        console.error("diplomacy-manager: Unable to get PlayerLibrary for suzerain of city-state with id " + warDeclarationTarget.player);
                        return false;
                    }
                    return this.raiseWarTypePopup(suzerainPlayer.id, Locale.compose("LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_FROM_MAP_SUZERAIN_BODY", Locale.compose(cityStatePlayer.civilizationFullName), Locale.compose(suzerainPlayer.name)), postDeclareWarAction);
                }
            }
            const otherLeaderName = Players.get(warDeclarationTarget.player)?.name;
            if (otherLeaderName == undefined) {
                console.error("diplomacy-manager: No name for player with id: " + warDeclarationTarget.player.toString());
                return false;
            }
            return this.raiseWarTypePopup(warDeclarationTarget.player, Locale.compose("LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_FROM_MAP_BODY", otherLeaderName), postDeclareWarAction);
        }
        return true; // handled
    }
    raiseAlliancePopup(currPlayerId, selectedPlayerId, allianceOperationType, allianceOperationArgs) {
        if (allianceOperationType === PlayerOperationTypes.CANCEL_ALLIANCE) {
            Game.PlayerOperations.sendRequest(GameContext.localPlayerID, allianceOperationType, allianceOperationArgs);
            return;
        }
        const allyPlayer = Players.get(selectedPlayerId);
        if (!allyPlayer) {
            console.error("diplomacy-manager: Failed to get ally player library");
            return;
        }
        const potentialEnemies = Players.getAliveMajorIds().filter((playerId) => allyPlayer.Diplomacy && allyPlayer.Diplomacy.isAtWarWith(playerId));
        if (potentialEnemies.length === 0) {
            Game.PlayerOperations.sendRequest(GameContext.localPlayerID, allianceOperationType, allianceOperationArgs);
            return;
        }
        const currPlayer = Players.get(currPlayerId);
        if (!currPlayer) {
            console.error("diplomacy-manager: Failed to get current player library");
            return;
        }
        const playerDiplomacy = currPlayer.Diplomacy;
        if (!playerDiplomacy) {
            console.error("diplomacy-manager: Attempting to raise alliance popup, but no valid player diplomacy library!");
            return;
        }
        const acceptCallback = (eAction) => {
            if (eAction == DialogBoxAction.Confirm) {
                Game.PlayerOperations.sendRequest(GameContext.localPlayerID, allianceOperationType, allianceOperationArgs);
            }
        };
        const alliancePopupWrapper = document.createElement("fxs-vslot");
        const customContent = document.createElement("fxs-vslot");
        const customTitle = document.createElement("fxs-header");
        customTitle.setAttribute('filigree-style', 'small');
        customTitle.setAttribute("title", Locale.compose("LOC_DIPLOMACY_ACTION_FORM_ALLIANCE_NAME").toUpperCase());
        customTitle.classList.add("uppercase", "-mt-4", "panel-diplomacy-declare-war__custom-header");
        customTitle.classList.add("font-title", "text-lg", "tracking-100");
        // If it's going to be a formal war we'll use this text
        const customText = document.createElement("fxs-inner-frame");
        customText.classList.add("mt-4", "p-4", "items-start", "max-w-128");
        customText.innerHTML = `
			<span class="mb-2">${Locale.stylize("LOC_DIPLOMACY_PICK_ALLIANCE_BODY_1", allyPlayer.name)}</span>
			<span>${Locale.stylize("LOC_DIPLOMACY_PICK_ALLIANCE_BODY_2")}</span>
		`;
        customContent.appendChild(customTitle);
        customContent.appendChild(customText);
        const portraitContainer = document.createElement("div");
        portraitContainer.classList.add("flex", "flex-row", "justify-center", "w-full", "mt-2");
        potentialEnemies.forEach(playerId => {
            //The player we want to check is at war with this playerId
            const newEnemy = Players.get(playerId);
            if (newEnemy) {
                const iconURL = Icon.getLeaderPortraitIcon(newEnemy.leaderType);
                const portrait = document.createElement("div");
                portrait.classList.add("panel-diplomacy-actions__ongoing-action-portrait", "pointer-events-auto");
                const portraitBG = document.createElement("div");
                portraitBG.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg");
                portrait.appendChild(portraitBG);
                const portraitBGInner = document.createElement("div");
                portraitBGInner.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg-inner");
                portrait.appendChild(portraitBGInner);
                const portraitIcon = document.createElement("div");
                portraitIcon.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-image");
                portraitIcon.style.backgroundImage = `url(${iconURL})`;
                portrait.appendChild(portraitIcon);
                portraitContainer.appendChild(portrait);
            }
        });
        customContent.appendChild(portraitContainer);
        alliancePopupWrapper.appendChild(customContent);
        alliancePopupWrapper.classList.add("h-3\\/4", "pl-40", "relative");
        const alliancePopupImageWrapper = document.createElement("fxs-vslot");
        alliancePopupImageWrapper.classList.add("w-1\\/3", "-top-26", "-left-22", "absolute");
        const shieldImage = document.createElement("div");
        shieldImage.classList.add("screen-dialog-box__declare-war-shield-bg", "size-72", "bg-cover", "bg-no-repeat");
        alliancePopupImageWrapper.appendChild(shieldImage);
        const formAllianceTitle = Locale.compose("LOC_DIPLOMACY_ACTION_FORM_ALLIANCE_NAME").toUpperCase();
        DialogManager.createDialog_CustomOptions({
            title: formAllianceTitle,
            canClose: true,
            displayQueue: "DiplomacyDialog",
            custom: true,
            styles: true,
            options: [
                {
                    actions: ["accept"],
                    label: formAllianceTitle,
                    callback: acceptCallback
                },
                {
                    actions: ["cancel", "keyboard-escape"],
                    label: Locale.compose("LOC_DIPLOMACY_DEAL_CANCEL").toUpperCase()
                }
            ],
            customOptions: [
                {
                    layoutBodyWrapper: alliancePopupWrapper,
                    layoutImageWrapper: alliancePopupImageWrapper,
                }
            ]
        });
    }
    raiseWarTypePopup(targetPlayerID, bodyString, postDeclareWarAction) {
        const playerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
        if (playerDiplomacy == undefined) {
            console.error("diplomacy-manager: Attempting to raise war type popup, but no valid player diplomacy library!");
            return false;
        }
        const surpriseWarCallback = (eAction) => {
            if (eAction == DialogBoxAction.Confirm) {
                this.confirmDeclareWar(targetPlayerID, DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR);
                if (postDeclareWarAction) {
                    postDeclareWarAction();
                }
            }
        };
        const formalWarCallback = (eAction) => {
            if (eAction == DialogBoxAction.Confirm) {
                this.confirmDeclareWar(targetPlayerID, DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_FORMAL_WAR);
                if (postDeclareWarAction) {
                    postDeclareWarAction();
                }
            }
        };
        const surpriseWarResults = playerDiplomacy.canDeclareWarOn(targetPlayerID);
        const formalWarResults = playerDiplomacy.canDeclareWarOn(targetPlayerID, WarTypes.FORMAL_WAR);
        let ourWarSupport = playerDiplomacy.getTotalWarSupportBonusForPlayer(targetPlayerID, formalWarResults.Success);
        let theirWarSupport = playerDiplomacy.getTotalWarSupportBonusForTarget(targetPlayerID, formalWarResults.Success);
        let theirInfluenceBonus = playerDiplomacy.getWarInfluenceBonusTarget(targetPlayerID, formalWarResults.Success);
        const declareWarWrapper = document.createElement("fxs-vslot");
        const customContent = document.createElement("fxs-vslot");
        const customTitle = document.createElement("fxs-header");
        customTitle.setAttribute('filigree-style', 'small');
        customTitle.setAttribute("title", "LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_TITLE");
        customTitle.classList.add("uppercase", "-mt-4", "panel-diplomacy-declare-war__custom-header");
        customTitle.classList.add("font-title", "text-lg", "tracking-100");
        // If it's going to be a formal war we'll use this text
        const customTextFormal = document.createElement("fxs-inner-frame");
        customTextFormal.classList.add("mt-4", "p-4", "items-start");
        customTextFormal.innerHTML = Locale.stylize("LOC_DIPLOMACY_PICK_WAR_TYPE_FORMAL_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus);
        // If it's going to be a surprise war we'll use this text
        const customTextSurprise = document.createElement("fxs-inner-frame");
        customTextSurprise.classList.add("mt-4", "p-4", "items-start");
        customTextSurprise.innerHTML = Locale.stylize("LOC_DIPLOMACY_PICK_WAR_TYPE_SURPRISE_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus);
        customContent.appendChild(customTitle);
        if (formalWarResults.Success == true) {
            customContent.appendChild(customTextFormal);
        }
        else {
            customContent.appendChild(customTextSurprise);
        }
        declareWarWrapper.appendChild(customContent);
        declareWarWrapper.classList.add("h-3\\/4", "pl-40", "relative");
        const declareWarImageWrapper = document.createElement("fxs-vslot");
        declareWarImageWrapper.classList.add("w-1\\/3", "-top-26", "-left-22", "absolute");
        const shieldImage = document.createElement("div");
        shieldImage.classList.add("screen-dialog-box__declare-war-shield-bg", "size-72", "bg-cover", "bg-no-repeat");
        declareWarImageWrapper.appendChild(shieldImage);
        // chooser items
        const chooserButton = document.createElement("chooser-item");
        chooserButton.classList.add("panel-diplomacy-declare-war__button-declare-war", "chooser-item_unlocked", "w-1\\/2", "min-h-16", "flow-row", "items-center");
        chooserButton.classList.add('mr-4');
        chooserButton.setAttribute('disabled', 'false');
        if (formalWarResults.FailureReasons) {
            if (formalWarResults.FailureReasons[0] != "") {
                chooserButton.setAttribute("data-tooltip-content", formalWarResults.FailureReasons[0]);
            }
            else {
                chooserButton.setAttribute("data-tooltip-content", Locale.stylize("LOC_DIPLOMACY_BONUS_WAR_SUPPORT", ourWarSupport, theirWarSupport, theirInfluenceBonus));
            }
        }
        else {
            chooserButton.setAttribute("data-tooltip-content", Locale.stylize("LOC_DIPLOMACY_BONUS_WAR_SUPPORT", ourWarSupport, theirWarSupport, theirInfluenceBonus));
        }
        waitForLayout(() => chooserButton.removeAttribute("tabindex"));
        // set the button information
        const radialBG = document.createElement("div");
        radialBG.classList.add("panel-diplomacy-declare-war__radial-bg", "absolute", "bg-cover", "size-16", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "opacity-1");
        const radialBGHover = document.createElement("div");
        radialBGHover.classList.add("panel-diplomacy-declare-war__radial-bg-hover", "absolute", "opacity-0", "bg-cover", "size-16", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100");
        chooserButton.appendChild(radialBG);
        chooserButton.appendChild(radialBGHover);
        const declareWarIconWrapper = document.createElement("div");
        declareWarIconWrapper.classList.add("flex", "size-16", "justify-center", "items-center", "panel-diplomacy-declare-war__war-icon-wrapper");
        let declareWarIcon = document.createElement("img");
        declareWarIcon.classList.add("flex", "relative", "size-12");
        if (formalWarResults.Success == true) {
            declareWarIcon.setAttribute("src", UI.getIconURL("DIPLOMACY_DECLARE_FORMAL_WAR_ICON"));
        }
        else {
            declareWarIcon.setAttribute("src", UI.getIconURL("DIPLOMACY_DECLARE_SURPRISE_WAR_ICON"));
        }
        declareWarIconWrapper.appendChild(declareWarIcon);
        chooserButton.appendChild(declareWarIconWrapper);
        const declareWarDescription = document.createElement("div");
        declareWarDescription.classList.add("relative", "ml-2", "flex", "flex-auto", "flex-col", "self-center", "font-title", "uppercase", "font-normal", "tracking-100");
        if (formalWarResults.Success == true) {
            declareWarDescription.setAttribute('data-l10n-id', "LOC_DIPLOMACY_FORMAL_WAR");
        }
        else {
            declareWarDescription.setAttribute('data-l10n-id', "LOC_DIPLOMACY_SURPRISE_WAR");
        }
        // add cost info here
        const warCostWrapper = document.createElement("div");
        warCostWrapper.classList.add("panel-diplomacy-declare-war__cost-wrapper", "text-xs", "font-body", "text-center", "flow-row");
        const warCost = document.createElement("div");
        warCost.classList.value = "font-body self-center";
        warCost.setAttribute("data-l10n-id", "LOC_DIPLOMACY_WAR_COST");
        // end info cost
        chooserButton.appendChild(declareWarDescription);
        if (formalWarResults.Success == true) {
            DialogManager.createDialog_CustomOptions({
                body: bodyString ? bodyString : Locale.compose("LOC_DIPLOMACY_PICK_WAR_TYPE_FORMAL_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus),
                title: "LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_TITLE",
                canClose: true,
                displayQueue: "DiplomacyDialog",
                custom: true,
                styles: true,
                name: "declare-war",
                options: [
                    {
                        actions: [],
                        label: Locale.stylize("LOC_DIPLOMACY_FORMAL_WAR"),
                        callback: formalWarCallback,
                        disabled: !formalWarResults.Success,
                        tooltip: (formalWarResults.FailureReasons != undefined && formalWarResults.FailureReasons.length > 0) ? formalWarResults.FailureReasons[0] : undefined
                    }
                ],
                customOptions: [
                    {
                        layoutBodyWrapper: declareWarWrapper,
                        layoutImageWrapper: declareWarImageWrapper,
                        useChooserItem: true,
                        chooserInfo: chooserButton,
                        cancelChooser: true
                    }
                ]
            });
        }
        else {
            DialogManager.createDialog_CustomOptions({
                body: bodyString ? bodyString : Locale.compose("LOC_DIPLOMACY_PICK_WAR_TYPE_SURPRISE_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus),
                title: "LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_TITLE",
                canClose: true,
                displayQueue: "DiplomacyDialog",
                custom: true,
                styles: true,
                name: "declare-war",
                options: [
                    {
                        actions: [],
                        label: Locale.stylize("LOC_DIPLOMACY_SURPRISE_WAR"),
                        callback: surpriseWarCallback,
                        disabled: !surpriseWarResults.Success,
                        tooltip: (surpriseWarResults.FailureReasons != undefined && surpriseWarResults.FailureReasons.length > 0) ? surpriseWarResults.FailureReasons[0] : undefined
                    }
                ],
                customOptions: [
                    {
                        layoutBodyWrapper: declareWarWrapper,
                        layoutImageWrapper: declareWarImageWrapper,
                        useChooserItem: true,
                        chooserInfo: chooserButton,
                        cancelChooser: true
                    }
                ]
            });
        }
        return true; // handled
    }
    clickStartProject(projectData) {
        //There is more target selection to be done, bring up a separate screen for the player to do this
        this._selectedProjectData = projectData;
        ContextManager.push("screen-diplomacy-target-select", { createMouseGuard: true, singleton: true });
    }
    getRelationshipTypeString(relationship) {
        switch (relationship) {
            case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
                return "PLAYER_RELATIONSHIP_FRIENDLY";
            case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
                return "PLAYER_RELATIONSHIP_HELPFUL";
            case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
                return "PLAYER_RELATIONSHIP_UNFRIENDLY";
            case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
                return "PLAYER_RELATIONSHIP_HOSTILE";
            case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_NEUTRAL:
                return "PLAYER_RELATIONSHIP_NEUTRAL";
            default:
                return "";
        }
    }
    onFirstMeetReactionClosed() {
        setTimeout(() => { this.closeCurrentDiplomacyDialog(); }, 2000);
        LeaderModelManager.beginAcknowledgePlayerSequence();
    }
    getAudioIdForDiploAction(projectData) {
        switch (projectData.actionGroup) {
            case DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_TREATY:
                return ["data-audio-activate-ref", "data-audio-leader-treaty-select"];
            case DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_PROJECT:
                switch (projectData.actionType) {
                    case DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN:
                        return ["data-audio-activate-ref", "data-audio-befriend"];
                    case DiplomacyActionTypes.DIPLOMACY_ACTION_INCITE_RAID:
                        return ["data-audio-activate-ref", "data-audio-incite-raid"];
                    case DiplomacyActionTypes.DIPLOMACY_ACTION_BECOME_SUZERAIN:
                        return ["data-audio-activate-ref", "data-audio-suzerain"];
                    case DiplomacyActionTypes.DIPLOMACY_ACTION_CS_PROMOTE_GROWTH:
                        return ["data-audio-activate-ref", "data-audio-independent-promote-growth"];
                    case DiplomacyActionTypes.DIPLOMACY_ACTION_CS_BOLSTER_MILITARY:
                        return ["data-audio-activate-ref", "data-audio-bolster-military"];
                    case DiplomacyActionTypes.DIPLOMACY_ACTION_CS_LEVY_UNIT:
                        return ["data-audio-activate-ref", "data-audio-levy-unit"];
                    case DiplomacyActionTypes.DIPLOMACY_ACTION_CS_INCORPORATE:
                        return ["data-audio-activate-ref", "data-audio-citystate-incorporate"];
                    default:
                        return ["data-audio-activate-ref", "data-audio-leader-project-select"];
                }
            case DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ENDEAVOR:
                return ["data-audio-activate-ref", "data-audio-leader-endeavor-select"];
            case DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION:
                return ["data-audio-activate-ref", "data-audio-leader-sanction-select"];
            case DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE:
                return ["data-audio-activate-ref", "data-audio-leader-espionage-select"];
            default:
                return ["data-audio-activate-ref", "data-audio-leader-project-select"];
        }
    }
}
const DiplomacyDialogManager = new DiplomacyDialogManagerImpl();
const DiplomacyDealManager = new DiplomacyDealManagerImpl();
const DiplomacyProjectManager = new DiplomacyProjectManagerImpl();
const DiplomacyManager = new DiplomacyManagerImpl();
export { DiplomacyManager as default };
DisplayQueueManager.registerHandler(DiplomacyProjectManager);
DisplayQueueManager.registerHandler(DiplomacyDialogManager);
DisplayQueueManager.registerHandler(DiplomacyDealManager);

//# sourceMappingURL=file:///base-standard/ui/diplomacy/diplomacy-manager.js.map

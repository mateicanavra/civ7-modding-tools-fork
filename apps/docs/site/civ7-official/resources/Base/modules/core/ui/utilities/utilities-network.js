/**
 * @copyright 2021, Firaxis Games
 * @description Shared support data structures for network systems.
 */
import { Framework } from '/core/ui/framework.js';
import { displayRequestUniqueId } from "/core/ui/context-manager/display-handler.js";
import { DisplayQueueManager } from "/core/ui/context-manager/display-queue-manager.js";
import { LegalDocsPlacementAcceptName } from '/core/ui/shell/mp-legal/mp-legal.js';
import { abandonStrToErrorBody, abandonStrToErrorTitle } from '/core/ui/utilities/utilities-network-constants.js';
const socialPanelErrorDialogId = displayRequestUniqueId();
export var NetworkUtilities;
(function (NetworkUtilities) {
    const platformIcons = new Map([
        [HostingType.HOSTING_TYPE_UNKNOWN, "fs://game/core/mp_console_crossplay.png"],
        [HostingType.HOSTING_TYPE_STEAM, "fs://game/core/mp_console_steam.png"],
        [HostingType.HOSTING_TYPE_EOS, "fs://game/core/mp_console_epic.png"],
        [HostingType.HOSTING_TYPE_T2GP, "fs://game/prof_2k_logo.png"],
        [HostingType.HOSTING_TYPE_GAMECENTER, "fs://game/core/mp_console_mac.png"],
        [HostingType.HOSTING_TYPE_NX, "fs://game/core/mp_console_switch.png"],
        [HostingType.HOSTING_TYPE_XBOX, "fs://game/core/mp_console_xbox.png"],
        [HostingType.HOSTING_TYPE_PLAYSTATION, "fs://game/core/mp_console_playstation.png"],
    ]);
    const platformTooltips = new Map([
        [HostingType.HOSTING_TYPE_UNKNOWN, Locale.compose("LOC_PLATFORM_ICON_GENERIC_CROSSPLAY")],
        [HostingType.HOSTING_TYPE_STEAM, Locale.compose("LOC_PLATFORM_ICON_STEAM")],
        [HostingType.HOSTING_TYPE_EOS, Locale.compose("LOC_PLATFORM_ICON_EOS")],
        [HostingType.HOSTING_TYPE_T2GP, Locale.compose("LOC_PLATFORM_ICON_T2GP")],
        [HostingType.HOSTING_TYPE_GAMECENTER, Locale.compose("LOC_PLATFORM_ICON_GAMECENTER")],
        [HostingType.HOSTING_TYPE_NX, Locale.compose("LOC_PLATFORM_ICON_NX")],
        [HostingType.HOSTING_TYPE_XBOX, Locale.compose("LOC_PLATFORM_ICON_XBOX")],
        [HostingType.HOSTING_TYPE_PLAYSTATION, Locale.compose("LOC_PLATFORM_ICON_PLAYSTATION")],
    ]);
    /* Get the displayable platform icon for a given HostingType. We can only display the direct platform icon if
        the platform is the same as the local machine's.  Several consoles require us to not display other platform's icons. */
    function getHostingTypeURL(hostType) {
        const localPlatform = Network.getLocalHostingPlatform();
        if (localPlatform != hostType) {
            hostType = HostingType.HOSTING_TYPE_UNKNOWN;
        }
        return platformIcons.get(hostType);
    }
    NetworkUtilities.getHostingTypeURL = getHostingTypeURL;
    /* Get the displayable platform tooltip for a given HostingType. We can only display the direct platform tooltip if
    the platform is the same as the local machine's.  Several consoles require us to only mention other platforms in a generic, cross-play fashion. */
    function getHostingTypeTooltip(hostType) {
        const localPlatform = Network.getLocalHostingPlatform();
        if (localPlatform != hostType) {
            hostType = HostingType.HOSTING_TYPE_UNKNOWN;
        }
        return platformTooltips.get(hostType);
    }
    NetworkUtilities.getHostingTypeTooltip = getHostingTypeTooltip;
    function areLegalDocumentsConfirmed(unconfirmedCallback) {
        const legalDocuments = Network.getLegalDocuments(LegalDocsPlacementAcceptName);
        if (legalDocuments && legalDocuments.length > 0) {
            // Are any of the documents unaccepted?  If so, the user must see them.
            if (!Network.areAllLegalDocumentsConfirmed()) {
                unconfirmedCallback();
                return false;
            }
        }
        return true;
    }
    NetworkUtilities.areLegalDocumentsConfirmed = areLegalDocumentsConfirmed;
    function multiplayerAbandonReasonToPopup(reason) {
        let returnPopup = {
            title: "LOC_GAME_ABANDONED_CONNECTION_LOST_TITLE",
            body: "LOC_GAME_ABANDONED_CONNECTION_LOST"
        };
        let errorBodyLoc = abandonStrToErrorBody.get(reason);
        let errorTitleLoc = abandonStrToErrorTitle.get(reason);
        // LOC_GAME_ABANDONED_VERSION_MISMATCH has additional data we need to fetch.
        if (errorBodyLoc == "LOC_GAME_ABANDONED_VERSION_MISMATCH") {
            const myVersion = Network.networkVersion;
            const remoteVersion = Network.lastMismatchVersion;
            errorBodyLoc = Locale.compose(errorBodyLoc, myVersion, remoteVersion);
        }
        // LOC_GAME_ABANDONED_MOD_MISSING needs to get the list of missing mods from the Modding library.
        else if (errorBodyLoc == "LOC_GAME_ABANDONED_MOD_MISSING") {
            // Last error message replaces our errorBodyLoc.
            const lastError = Modding.getLastErrorString();
            if (lastError) {
                errorBodyLoc = lastError;
            }
        }
        if (errorBodyLoc) {
            returnPopup.body = errorBodyLoc;
        }
        if (errorTitleLoc) {
            returnPopup.title = errorTitleLoc;
        }
        return returnPopup;
    }
    NetworkUtilities.multiplayerAbandonReasonToPopup = multiplayerAbandonReasonToPopup;
    function openSocialPanel(initialTab) {
        const isUserInput = true;
        const result = Network.triggerNetworkCheck(isUserInput);
        const isConnectedToNetwork = (result.networkResult != NetworkResult.NETWORKRESULT_NO_NETWORK);
        const connectedToNetwork = Network.isConnectedToNetwork();
        const loggedIn = Network.isLoggedIn();
        const fullyLinked = Network.isFullAccountLinked();
        const childAccount = Network.isChildAccount();
        const childPermissions = Network.isChildOnlinePermissionsGranted();
        if ((!isConnectedToNetwork || !connectedToNetwork)) {
            if (DisplayQueueManager.findAll(socialPanelErrorDialogId).length < 1) {
                Framework.DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_NO_INTERNET_CONNECTION_TITLE"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE"), dialogId: socialPanelErrorDialogId });
            }
        }
        else if (!loggedIn) {
            if (DisplayQueueManager.findAll(socialPanelErrorDialogId).length < 1) {
                Framework.DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_OFFLINE_ACCOUNT_BODY"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE"), dialogId: socialPanelErrorDialogId });
            }
        }
        else if (!fullyLinked) {
            if (DisplayQueueManager.findAll(socialPanelErrorDialogId).length < 1) {
                Framework.DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_LINK_ACCOUNT_REQUIRED"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE"), dialogId: socialPanelErrorDialogId });
            }
        }
        else if (childAccount && !childPermissions) {
            if (DisplayQueueManager.findAll(socialPanelErrorDialogId).length < 1) {
                Framework.DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_PARENT_PERMISSION_REQUIRED"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE"), dialogId: socialPanelErrorDialogId });
            }
        }
        else {
            Framework.ContextManager.push('screen-mp-friends', { singleton: true, createMouseGuard: true, attributes: { "tab": initialTab ?? "" } });
        }
    }
    NetworkUtilities.openSocialPanel = openSocialPanel;
})(NetworkUtilities || (NetworkUtilities = {}));
//# sourceMappingURL=file:///core/ui/utilities/utilities-network.js.map

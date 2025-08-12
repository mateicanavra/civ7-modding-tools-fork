/**
 * @file profile-header.ts
 * @copyright 2023-2025, Firaxis Games
 * @description Header that contains the progression header and the social button
 */
import { ActionActivateEvent } from "/core/ui/components/fxs-activatable.js";
import ContextManager from '/core/ui/context-manager/context-manager.js';
import MPFriendsModel from "/core/ui/shell/mp-staging/model-mp-friends.js";
import SocialNotificationsManager, { SocialNotificationIndicatorType } from "/core/ui/social-notifications/social-notifications-manager.js";
import RewardsNotificationManager from "/core/ui/rewards-notifications/rewards-notification-manager.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import { getDefaultPlayerInfo, getPlayerCardInfo } from "/core/ui/utilities/utilities-liveops.js";
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
export const ProfileAccountLoggedOutEventName = 'profile-account-logged-out';
export class ProfileAccountLoggedOutEvent extends CustomEvent {
    constructor() {
        super(ProfileAccountLoggedOutEventName, { bubbles: false, cancelable: true });
    }
}
export const giftboxButtonName = 'screen-giftbox-popup';
export class ProfileHeader extends Component {
    constructor() {
        super(...arguments);
        this.inputHandler = this.Root;
        this.progressionHeaderButtonName = "screen-profile-page";
        this.socialButtonName = "screen-mp-friends";
        this.hideGift = false;
        this.hideSocial = false;
        this.hideProgressionHeader = false;
        this.progressionHeaderActivateListener = this.onProgressionHeaderActivate.bind(this);
        this.socialButtonActivateListener = this.onSocialButtonActivate.bind(this);
        this.giftboxButtonActivateListener = this.onGiftboxButtonActivate.bind(this);
        this.qrCompletedListener = this.onAccountUpdated.bind(this);
        this.accountUnlinkedListener = this.onAccountUpdated.bind(this);
        this.accountUpdatedListener = this.onAccountUpdated.bind(this);
        this.spoPCompleteListener = this.onAccountUpdated.bind(this);
        this.spopHeartBeatReceivedListener = this.onAccountUpdated.bind(this);
        this.accountInfoUpdatedListener = this.onAccountUpdated.bind(this);
        this.accountLoggedOutListener = this.onLogoutResults.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.connectionStatusChangedListener = this.onAccountUpdated.bind(this);
    }
    onInitialize() {
        super.onInitialize();
        this.Root.innerHTML = this.render();
        this.progressionHeader = MustGetElement(".profile-header__progression-header", this.Root);
        this.progressionHeaderButtonContainer = MustGetElement(".profile-header__progression-button-container", this.Root);
        this.socialButtonContainer = MustGetElement(".profile-header__social-button-container", this.Root);
        this.socialButton = MustGetElement(".profile-header__social-button", this.Root);
        this.socialButton.setAttribute("data-audio-press-ref", "data-audio-primary-button-press");
        this.socialButton.setAttribute("data-audio-activate-ref", "none");
        this.socialNotification = MustGetElement(".profile-header__notification-badge", this.Root);
        this.rewardsNotification = MustGetElement(".profile-header__giftbox-notification-icon", this.Root);
        this.giftboxButton = MustGetElement(".profile-header__giftbox-button", this.Root);
        this.giftboxButtonContainer = MustGetElement(".profile-header__giftbox-button-container", this.Root);
        this.giftboxButton.setAttribute("data-audio-press-ref", "data-audio-primary-button-press");
        this.giftboxButton.setAttribute("data-audio-activate-ref", "none");
    }
    onAttach() {
        super.onAttach();
        const profileSelector = this.Root.getAttribute('profile-for') ?? 'fxs-frame';
        if (profileSelector !== '') {
            const inputHandlerElement = this.Root.closest(profileSelector);
            if (!inputHandlerElement) {
                console.error(`profile-header: could not find nav handler for selector ${profileSelector}. Attaching to root element instead, navigation will not work unless profile-header is focused`);
            }
            else {
                this.inputHandler = inputHandlerElement;
            }
        }
        this.inputHandler.addEventListener("engine-input", this.engineInputListener);
        this.inputHandler.addEventListener('navigate-input', this.navigateInputListener);
        this.Root.listenForWindowEvent('user-profile-updated', this.accountInfoUpdatedListener);
        engine.on("SPoPComplete", this.spoPCompleteListener);
        engine.on("SPoPHeartbeatReceived", this.spopHeartBeatReceivedListener);
        engine.on("QrAccountLinked", this.qrCompletedListener);
        engine.on("AccountUnlinked", this.accountUnlinkedListener);
        engine.on("AccountUpdated", this.accountUpdatedListener);
        engine.on("LogoutCompleted", this.accountLoggedOutListener);
        engine.on("ConnectionStatusChanged", this.connectionStatusChangedListener);
        engine.on("UserProfilesUpdated", this.updateProgressionHeader, this);
        engine.on("UserInfoUpdated", this.accountInfoUpdatedListener);
        this.progressionHeader.addEventListener("action-activate", this.progressionHeaderActivateListener);
        this.socialButton.addEventListener("action-activate", this.socialButtonActivateListener);
        this.giftboxButton.addEventListener("action-activate", this.giftboxButtonActivateListener);
        SocialNotificationsManager.setNotificationItem(SocialNotificationIndicatorType.MAINMENU_BADGE, this.socialNotification);
        RewardsNotificationManager.setNotificationItem(this.rewardsNotification);
        this.updateSocialButtonContainer();
        this.updateGiftboxButtonContainer();
        this.updateProgressionHeaderButtonContainer();
        this.updateSocialButton();
        this.updateGiftboxButton();
        this.updateProgressionHeader();
        this.updateSocialNotification();
        this.updateRewardsNotification();
        Online.Social.refreshFriendList();
    }
    onDetach() {
        super.onDetach();
        this.inputHandler.removeEventListener("engine-input", this.engineInputListener);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        engine.off("SPoPComplete", this.spoPCompleteListener);
        engine.off("SPoPHeartbeatReceived", this.spopHeartBeatReceivedListener);
        engine.off("QrAccountLinked", this.qrCompletedListener);
        engine.off("AccountUnlinked", this.accountUnlinkedListener);
        engine.off("AccountUpdated", this.accountUpdatedListener);
        engine.off("LogoutCompleted", this.accountLoggedOutListener);
        engine.off("ConnectionStatusChanged", this.connectionStatusChangedListener);
        engine.off("UserProfilesUpdated", this.updateProgressionHeader, this);
        engine.off("UserInfoUpdated", this.accountInfoUpdatedListener);
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case "player-card-style":
                this.updateProgressionHeader();
                break;
            case "disabled":
                const isDisabled = newValue == "true";
                this.updateProgressionHeader(isDisabled);
                this.updateSocialButton();
                this.updateGiftboxButton();
                break;
            case "hide-progression-header":
                this.hideProgressionHeader = newValue == "true";
                this.updateProgressionHeaderButtonContainer();
                break;
            case "hide-giftbox":
                this.hideGift = newValue == "true";
                this.updateGiftboxButtonContainer();
                break;
            case "hide-social":
                this.hideSocial = newValue == "true";
                this.updateSocialButtonContainer();
                break;
        }
    }
    render() {
        const playerCardStyle = this.Root.getAttribute("player-card-style") ?? "micro";
        return `
			<div class="items-center flex-auto flex flex-row flex-row-reverse flex-nowrap">
				<div class="ml-2 relative profile-header__giftbox-button-container">
					<fxs-activatable class="profile-header__giftbox-button img-prof-btn-bg pointer-events-auto flow-column justify-center items-center w-16 h-16 transition-transform hover\\:scale-110 focus\\:scale-110">
						<div class="img-giftbox-icon pointer-events-none w-16 h-16"></div>
						<fxs-nav-help class="absolute -top-3 -right-4" action-key="inline-cycle-next"></fxs-nav-help>
						<div class="profile-header__giftbox-notification-icon absolute img-notification-badge -bottom-4 w-8 h-8"></div>
					</fxs-activatable>
				</div>
				<div class="ml-2 relative profile-header__social-button-container">
					<fxs-activatable class="profile-header__social-button img-prof-btn-bg pointer-events-auto flow-column justify-center items-center w-16 h-16 transition-transform hover\\:scale-110 focus\\:scale-110" data-tooltip-content="LOC_UI_MP_SOCIAL_BUTTON_LABEL">
						<div class="img-social-icon pointer-events-none w-12 h-12"></div>
						<fxs-nav-help class="absolute -top-3 -right-4" action-key="inline-shell-action-5"></fxs-nav-help>
						<div class="profile-header__notification-badge img-notification-badge absolute -bottom-4 w-8 h-8"></div>
					</fxs-activatable>
				</div>
				<div class="relative profile-header__progression-button-container flex-auto flow-row">
					<progression-header class="pointer-events-auto profile-header__progression-header flex-auto" player-card-style="${playerCardStyle}"></progression-header>
					<fxs-nav-help class="absolute -top-3 -right-4" action-key="inline-sys-menu"></fxs-nav-help>
				</div>
			</div>
		`;
    }
    isFullAccountLinkedOnline() {
        const isUserInput = false;
        const result = Network.triggerNetworkCheck(isUserInput);
        const isConnectedToNetwork = result.networkResult != NetworkResult.NETWORKRESULT_NO_NETWORK;
        return isConnectedToNetwork && Network.isFullAccountLinked() && Network.isLoggedIn() && (!Network.isChildAccount() || (Network.isChildAccount() && Network.isChildOnlinePermissionsGranted()));
    }
    isFullyLoggedIn() {
        return Network.isConnectedToNetwork() && Network.isConnectedToSSO() && Network.isLoggedIn();
    }
    updateGiftboxButton() {
        const disabled = this.Root.getAttribute("disabled");
        const blockedAccessReason = Network.getBlockedAccessReason(Network.isChildAccount(), Network.isChildOnlinePermissionsGranted(), false);
        this.giftboxButton.setAttribute("disabled", disabled ?? "false");
        this.giftboxButton.setAttribute("data-tooltip-content", blockedAccessReason.length > 0 ? blockedAccessReason : "LOC_REWARD_RECEIVED");
        this.giftboxButton.classList.toggle("tint-bg-accent-4", !this.isFullAccountLinkedOnline());
    }
    updateSocialButton() {
        const disabled = this.Root.getAttribute("disabled");
        const blockedAccessReason = Network.getBlockedAccessReason(Network.isChildAccount(), Network.isChildOnlinePermissionsGranted(), false);
        this.socialButton.setAttribute("disabled", disabled ?? "false");
        this.socialButton.setAttribute("data-tooltip-content", blockedAccessReason.length > 0 ? blockedAccessReason : "LOC_UI_MP_SOCIAL_BUTTON_LABEL");
        this.socialButton.classList.toggle("tint-bg-accent-4", !this.isFullAccountLinkedOnline());
    }
    updateSocialButtonContainer() {
        this.socialButtonContainer.classList.toggle("hidden", this.hideSocial);
    }
    updateGiftboxButtonContainer() {
        this.giftboxButtonContainer.classList.toggle("hidden", this.hideGift);
    }
    updateProgressionHeaderButtonContainer() {
        this.progressionHeaderButtonContainer.classList.toggle("hidden", this.hideProgressionHeader);
    }
    updateProgressionHeader(disabled = false) {
        // if it's from UserProfilesUpdated engine event, the type of disabled would be object instead of boolean, so check the type here.
        // if it's from the callback, we would want disabled to be false. 
        if (typeof disabled === "object") {
            disabled = false;
        }
        // still want to disable the profile header if not logged into 2K
        if (!disabled && !this.isFullyLoggedIn() && !Online.Metaprogression.supportsMemento()) {
            disabled = true;
        }
        const playerCardStyle = this.Root.getAttribute("player-card-style") ?? "micro";
        this.progressionHeader.setAttribute("disabled", this.Root.getAttribute("disabled") ?? "false");
        if (Network.isMetagamingAvailable()) {
            this.progressionHeader.removeAttribute("data-tooltip-content");
        }
        else {
            this.progressionHeader.setAttribute("data-tooltip-content", Network.getBlockedAccessReason(false, true, true));
        }
        this.progressionHeader.setAttribute("player-card-style", playerCardStyle);
        // if progression header is disabled. we use the default player info instead
        const playerInfo = disabled ? getDefaultPlayerInfo() : getPlayerCardInfo(undefined, undefined, true);
        this.progressionHeader.setAttribute("data-player-info", JSON.stringify(playerInfo));
    }
    updateSocialNotification() {
        SocialNotificationsManager.setNotificationVisibility(SocialNotificationIndicatorType.ALL_INDICATORS, Online.Social.anyUnreadSocialNotifications());
    }
    updateRewardsNotification() {
        RewardsNotificationManager.setNotificationVisibility(Online.UserProfile.getNewlyUnlockedItems().length > 0);
    }
    onEngineInput(inputEvent) {
        if (this.handleEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    handleEngineInput(inputEvent) {
        if (inputEvent.defaultPrevented) {
            return false;
        }
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return false;
        }
        switch (inputEvent.detail.name) {
            case 'sys-menu':
                if (!this.hideProgressionHeader) {
                    this.onProgressionHeaderActivate(new ActionActivateEvent(0, 0));
                }
                return true;
            case 'shell-action-5':
                if (!this.hideSocial) {
                    this.onSocialButtonActivate(new ActionActivateEvent(0, 0));
                }
                return true;
        }
        return false;
    }
    onNavigateInput(navigationEvent) {
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        const live = this.handleNavigation(navigationEvent);
        if (!live) {
            navigationEvent.preventDefault();
            navigationEvent.stopImmediatePropagation();
        }
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(navigationEvent) {
        const direction = navigationEvent.getDirection();
        switch (direction) {
            case InputNavigationAction.NEXT:
                if (!this.hideGift) {
                    this.onGiftboxButtonActivate();
                    return true;
                }
        }
        return false;
    }
    onAccountUpdated() {
        MPFriendsModel.refreshFriendList();
        this.updateProgressionHeader();
        this.updateSocialButton();
        this.updateGiftboxButton();
    }
    onLogoutResults() {
        const isDisabled = true;
        this.updateProgressionHeader(isDisabled);
        this.updateSocialButton();
        this.updateGiftboxButton();
    }
    onProfileHeaderButtonClicked(popupToOpen) {
        let flags = { isChildAccount: Network.isChildAccount(), isPermittedChild: Network.isChildOnlinePermissionsGranted(), ignoreChildPermissions: false };
        var blockReason = Network.getBlockedAccessReason(flags.isChildAccount, flags.isPermittedChild, flags.ignoreChildPermissions);
        let ignoreAllNetworkBlockReasonsWhenAvailable = false;
        let ignoreUnlinkedAccountBlockReason = false;
        let checkUnlockedRewards = false;
        let popupProperties;
        let isAvailable = false;
        switch (popupToOpen) {
            case this.progressionHeaderButtonName:
                {
                    flags = { isChildAccount: false, isPermittedChild: true, ignoreChildPermissions: true };
                    ignoreAllNetworkBlockReasonsWhenAvailable = true;
                    popupProperties = { singleton: true, createMouseGuard: true, panelOptions: { onlyChallenges: false, onlyLeaderboards: false } };
                    isAvailable = Network.isMetagamingAvailable();
                }
                break;
            case giftboxButtonName:
                {
                    ignoreUnlinkedAccountBlockReason = blockReason == Locale.compose("LOC_UI_LINK_ACCOUNT_REQUIRED");
                    checkUnlockedRewards = true;
                    popupProperties = { singleton: true, createMouseGuard: true };
                    const disabled = this.Root.getAttribute("disabled") == "true";
                    isAvailable = !disabled;
                }
                break;
            case this.socialButtonName:
                {
                    popupProperties = { singleton: true, createMouseGuard: true };
                    const disabled = this.Root.getAttribute("disabled") == "true";
                    isAvailable = !disabled;
                }
                break;
        }
        if ((blockReason == "" || ignoreUnlinkedAccountBlockReason || ignoreAllNetworkBlockReasonsWhenAvailable) && isAvailable) {
            if (checkUnlockedRewards && Online.UserProfile.getNewlyUnlockedItems().length <= 0) {
                this.showDialogBox("LOC_NO_REWARDS_AVAIALBE", "LOC_REWARDS_TITLE");
            }
            else {
                ContextManager.push(popupToOpen, popupProperties);
            }
        }
        else if (blockReason != "") {
            this.showDialogBox(blockReason, "LOC_UI_ACCOUNT_TITLE");
        }
    }
    onProgressionHeaderActivate(_event) {
        if (ContextManager.hasInstanceOf("screen-profile-page")) {
            return;
        }
        this.onProfileHeaderButtonClicked(this.progressionHeaderButtonName);
    }
    onSocialButtonActivate(_event) {
        this.onProfileHeaderButtonClicked(this.socialButtonName);
    }
    onGiftboxButtonActivate() {
        this.onProfileHeaderButtonClicked(giftboxButtonName);
    }
    showDialogBox(boxBody, boxTitle) {
        if (this.profileHeaderPopupDialogID) {
            DialogManager.closeDialogBox(this.profileHeaderPopupDialogID);
        }
        this.profileHeaderPopupDialogID = DialogManager.createDialog_Confirm({ body: Locale.compose(boxBody), title: Locale.compose(boxTitle) });
    }
}
Controls.define('profile-header', {
    createInstance: ProfileHeader,
    description: 'header that contains the progression header and the social button',
    classNames: ['profile-header'],
    attributes: [
        {
            name: 'player-card-style'
        },
        {
            name: 'disabled'
        },
        {
            name: 'hide-progression-header'
        },
        {
            name: 'hide-giftbox'
        },
        {
            name: 'hide-social'
        },
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/profile-header/profile-header.js.map

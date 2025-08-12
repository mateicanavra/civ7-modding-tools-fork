export var SocialNotificationIndicatorType;
(function (SocialNotificationIndicatorType) {
    SocialNotificationIndicatorType[SocialNotificationIndicatorType["MAINMENU_BADGE"] = 0] = "MAINMENU_BADGE";
    SocialNotificationIndicatorType[SocialNotificationIndicatorType["SOCIALTAB_BADGE"] = 1] = "SOCIALTAB_BADGE";
    SocialNotificationIndicatorType[SocialNotificationIndicatorType["ALL_INDICATORS"] = 2] = "ALL_INDICATORS";
})(SocialNotificationIndicatorType || (SocialNotificationIndicatorType = {}));
var SocialNotificationIndicatorReminderType;
(function (SocialNotificationIndicatorReminderType) {
    SocialNotificationIndicatorReminderType[SocialNotificationIndicatorReminderType["REMIND_NONE"] = 0] = "REMIND_NONE";
    SocialNotificationIndicatorReminderType[SocialNotificationIndicatorReminderType["REMIND_VISIBLE"] = 1] = "REMIND_VISIBLE";
    SocialNotificationIndicatorReminderType[SocialNotificationIndicatorReminderType["REMIND_INVISIBLE"] = 2] = "REMIND_INVISIBLE";
})(SocialNotificationIndicatorReminderType || (SocialNotificationIndicatorReminderType = {}));
class SocialNotificationsManagerSingleton {
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!SocialNotificationsManagerSingleton.signletonInstance) {
            SocialNotificationsManagerSingleton.signletonInstance = new SocialNotificationsManagerSingleton();
        }
        return SocialNotificationsManagerSingleton.signletonInstance;
    }
    constructor() {
        this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_NONE;
        this.socialOnFriendRequestReceivedListener = this.socialOnFriendRequestReceived.bind(this);
        this.socialOnFriendRequestSentListener = this.socialOnFriendRequestSent.bind(this);
        this.socialOnOnlineSaveDataLoadedListener = this.socialOnOnlineSaveDataLoaded.bind(this);
        engine.on("SocialOnFriendRequestReceived", this.socialOnFriendRequestReceivedListener);
        engine.on("SocialOnFriendRequestSent", this.socialOnFriendRequestSentListener);
        engine.on("SocialOnOnlineSaveDataLoaded", this.socialOnOnlineSaveDataLoadedListener);
    }
    setNotificationItem(indicatorType, indicator) {
        switch (indicatorType) {
            case SocialNotificationIndicatorType.MAINMENU_BADGE:
                this.mainMenuNotificationBadge = indicator;
                break;
            case SocialNotificationIndicatorType.SOCIALTAB_BADGE:
                this.socialPanelNotificationBadge = indicator;
                break;
        }
    }
    setTabNotificationVisibilityBasedOnReminder() {
        switch (this.remindVisibility) {
            case SocialNotificationIndicatorReminderType.REMIND_NONE:
                this.setNotificationVisibility(SocialNotificationIndicatorType.SOCIALTAB_BADGE, false);
                break;
            case SocialNotificationIndicatorReminderType.REMIND_VISIBLE:
                this.setNotificationVisibility(SocialNotificationIndicatorType.SOCIALTAB_BADGE, true);
                break;
            case SocialNotificationIndicatorReminderType.REMIND_INVISIBLE:
                this.setNotificationVisibility(SocialNotificationIndicatorType.SOCIALTAB_BADGE, false);
                break;
        }
        // clear reminder
        this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_NONE;
    }
    setNotificationVisibility(indicatorType, visibile) {
        if (visibile) {
            switch (indicatorType) {
                case SocialNotificationIndicatorType.MAINMENU_BADGE:
                    this.mainMenuNotificationBadge?.classList.remove("hidden");
                    break;
                case SocialNotificationIndicatorType.SOCIALTAB_BADGE:
                    this.socialPanelNotificationBadge?.classList.remove("hidden");
                    break;
                case SocialNotificationIndicatorType.ALL_INDICATORS:
                    this.setNotificationTypeAll(visibile);
                    break;
            }
        }
        else {
            switch (indicatorType) {
                case SocialNotificationIndicatorType.MAINMENU_BADGE:
                    this.mainMenuNotificationBadge?.classList.add("hidden");
                    break;
                case SocialNotificationIndicatorType.SOCIALTAB_BADGE:
                    this.socialPanelNotificationBadge?.classList.add("hidden");
                    break;
                case SocialNotificationIndicatorType.ALL_INDICATORS:
                    this.setNotificationTypeAll(visibile);
                    break;
            }
        }
    }
    setNotificationTypeAll(visibile) {
        let wasTabVisible = this.isNotificationVisible(SocialNotificationIndicatorType.SOCIALTAB_BADGE);
        if (visibile) {
            this.mainMenuNotificationBadge?.classList.remove("hidden");
            // This maybe undefined if Social Panel hasn't attached yet
            if (this.socialPanelNotificationBadge) {
                this.socialPanelNotificationBadge?.classList.remove("hidden");
                this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_NONE;
            }
            else {
                this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_VISIBLE;
            }
        }
        else {
            this.mainMenuNotificationBadge?.classList.add("hidden");
            // This maybe undefined if Social Panel hasn't attached yet
            if (this.socialPanelNotificationBadge) {
                this.socialPanelNotificationBadge?.classList.add("hidden");
                this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_NONE;
            }
            else {
                this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_INVISIBLE;
            }
            // Limit the clearing to only when there was a notification badge and now clearing
            // As opposed to anytime the tab is set to invisible
            if (wasTabVisible && !visibile) {
                // Clear cached saved unread notifications 
                Online.Social.setReadSocialNotifications();
            }
        }
    }
    isNotificationVisible(indicatorType) {
        switch (indicatorType) {
            case SocialNotificationIndicatorType.MAINMENU_BADGE:
                return this.mainMenuNotificationBadge?.classList.contains("hidden") ? false : true;
            case SocialNotificationIndicatorType.SOCIALTAB_BADGE:
                return this.socialPanelNotificationBadge?.classList.contains("hidden") ? false : true;
        }
        return false;
    }
    socialOnFriendRequestReceived() {
        this.setNotificationVisibility(SocialNotificationIndicatorType.ALL_INDICATORS, true);
    }
    // For future reference on updating list based on callback instead update polling
    socialOnFriendRequestSent() {
    }
    socialOnOnlineSaveDataLoaded() {
        // Listeneter for this event is setup after the event is fired
        // Keep this around in case this changes
        // Keep in mind handling of when account this may fire after account link
    }
}
const SocialNotificationsManager = SocialNotificationsManagerSingleton.getInstance();
export { SocialNotificationsManager as default };

//# sourceMappingURL=file:///core/ui/social-notifications/social-notifications-manager.js.map


export enum SocialNotificationIndicatorType {
	MAINMENU_BADGE,
	SOCIALTAB_BADGE,
	ALL_INDICATORS,
}

enum SocialNotificationIndicatorReminderType {
	REMIND_NONE,
	REMIND_VISIBLE,
	REMIND_INVISIBLE,
}

class SocialNotificationsManagerSingleton {
	private static signletonInstance: SocialNotificationsManagerSingleton;

	private mainMenuNotificationBadge!: HTMLElement;
	private socialPanelNotificationBadge!: HTMLElement;
	private remindVisibility: SocialNotificationIndicatorReminderType = SocialNotificationIndicatorReminderType.REMIND_NONE;

	private socialOnFriendRequestReceivedListener = this.socialOnFriendRequestReceived.bind(this);
	private socialOnFriendRequestSentListener = this.socialOnFriendRequestSent.bind(this);
	private socialOnOnlineSaveDataLoadedListener = this.socialOnOnlineSaveDataLoaded.bind(this);

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
		engine.on("SocialOnFriendRequestReceived", this.socialOnFriendRequestReceivedListener);
		engine.on("SocialOnFriendRequestSent", this.socialOnFriendRequestSentListener);
		engine.on("SocialOnOnlineSaveDataLoaded", this.socialOnOnlineSaveDataLoadedListener);
	}

	public setNotificationItem(indicatorType: SocialNotificationIndicatorType, indicator: HTMLElement) {
		switch (indicatorType) {
			case SocialNotificationIndicatorType.MAINMENU_BADGE:
				this.mainMenuNotificationBadge = indicator;
				break;
			case SocialNotificationIndicatorType.SOCIALTAB_BADGE:
				this.socialPanelNotificationBadge = indicator;
				break;
		}
	}

	public setTabNotificationVisibilityBasedOnReminder() {
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

	public setNotificationVisibility(indicatorType: SocialNotificationIndicatorType, visibile: boolean) {
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
		} else {
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

	private setNotificationTypeAll(visibile: boolean) {
		let wasTabVisible = this.isNotificationVisible(SocialNotificationIndicatorType.SOCIALTAB_BADGE);
		if (visibile) {
			this.mainMenuNotificationBadge?.classList.remove("hidden");
			// This maybe undefined if Social Panel hasn't attached yet
			if (this.socialPanelNotificationBadge) {
				this.socialPanelNotificationBadge?.classList.remove("hidden");
				this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_NONE;
			} else {
				this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_VISIBLE;
			}
		} else {
			this.mainMenuNotificationBadge?.classList.add("hidden");
			// This maybe undefined if Social Panel hasn't attached yet
			if (this.socialPanelNotificationBadge) {
				this.socialPanelNotificationBadge?.classList.add("hidden");
				this.remindVisibility = SocialNotificationIndicatorReminderType.REMIND_NONE;
			} else {
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

	public isNotificationVisible(indicatorType: SocialNotificationIndicatorType): boolean {
		switch (indicatorType) {
			case SocialNotificationIndicatorType.MAINMENU_BADGE:
				return this.mainMenuNotificationBadge?.classList.contains("hidden") ? false : true;
			case SocialNotificationIndicatorType.SOCIALTAB_BADGE:
				return this.socialPanelNotificationBadge?.classList.contains("hidden") ? false : true;
		}
		return false;
	}

	private socialOnFriendRequestReceived() {
		this.setNotificationVisibility(SocialNotificationIndicatorType.ALL_INDICATORS, true);
	}

	// For future reference on updating list based on callback instead update polling
	private socialOnFriendRequestSent() {
	}

	private socialOnOnlineSaveDataLoaded() {
		// Listeneter for this event is setup after the event is fired
		// Keep this around in case this changes
		// Keep in mind handling of when account this may fire after account link
	}
}

const SocialNotificationsManager = SocialNotificationsManagerSingleton.getInstance();
export { SocialNotificationsManager as default };
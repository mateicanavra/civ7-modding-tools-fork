class RewardsNotificationsManagerSingleton {

	private static singletonInstance: RewardsNotificationsManagerSingleton;
	private rewardsNotificationIndicator!: HTMLElement;
	private rewardsIndicatorIsSet = false;

	private rewardReceivedListener = (data: EntitlementsUpdatedData) => { this.onRewardReceived(data); }

	static getInstance() {

		if (!RewardsNotificationsManagerSingleton.singletonInstance) {
			RewardsNotificationsManagerSingleton.singletonInstance = new RewardsNotificationsManagerSingleton();
		}
		return RewardsNotificationsManagerSingleton.singletonInstance;
	}

	constructor() {
		engine.on("EntitlementsUpdated", this.rewardReceivedListener);
	}

	public setNotificationItem(indicator: HTMLElement) {
		this.rewardsNotificationIndicator = indicator;
		this.rewardsIndicatorIsSet = true;
	}

	public setNotificationVisibility(isVisible: boolean) {
		if (this.rewardsIndicatorIsSet) {
			if (isVisible) {
				this.rewardsNotificationIndicator.classList.remove("hidden");
			}
			else {
				this.rewardsNotificationIndicator.classList.add("hidden");
			}
		}
	}

	public isNotificationVisible() {
		return this.rewardsIndicatorIsSet ? this.rewardsNotificationIndicator.classList.contains("hidden") : false;
	}

	private onRewardReceived(data: EntitlementsUpdatedData) {
		if (data) {
			this.setNotificationVisibility(data.keys.length > 0);
		}
	}
}

const RewardsNotificationsManager = RewardsNotificationsManagerSingleton.getInstance();
export { RewardsNotificationsManager as default };
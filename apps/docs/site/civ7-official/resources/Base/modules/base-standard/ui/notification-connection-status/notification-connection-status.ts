const DISPLAY_TIME_MS = 5000;
const HUD_OFFLINE_ICON = "hud_offline_icon";
const HUD_ONLINE_ICON = "hud_online_icon";

export class NotificationConnectionStatus extends Component {
	private onDisconnection = this.showNotification.bind(this, HUD_OFFLINE_ICON);
	private onReconnection = this.showNotification.bind(this, HUD_ONLINE_ICON);

	onInitialize(): void {
		super.onInitialize();
		
		this.Root.className = "relative hidden size-16 ml-2\\.5 bg-contain bg-center bg-no-repeat animate-in-left";
	}

	onAttach() {
		super.onAttach();

		engine.on('NetworkReconnected', this.onReconnection);
		engine.on('NetworkDisconnected', this.onDisconnection);
	}

	onDetach() {
		engine.off('NetworkReconnected', this.onReconnection);
		engine.off('NetworkDisconnected', this.onDisconnection);

		super.onDetach();
	}

	private showNotification(imageName: string) {
		this.Root.style.backgroundImage = `url("${imageName}")`;
		this.Root.classList.replace("hidden", 'flex');
		setTimeout(() => {
			this.Root.classList.replace('flex', "hidden");
		}, DISPLAY_TIME_MS);
	}

}

Controls.define('notification-connection-status', {
	createInstance: NotificationConnectionStatus,
	description: 'Indicator when the connection status changes'
});

import Panel from '/core/ui/panel-support.js';
import { MPLobbyPlayerData } from '/core/ui/shell/mp-staging/model-mp-staging-new.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

class MpStagingPlayerInfoCard extends Panel {

	private playerData: MPLobbyPlayerData = {
		playerID: "",
		isParticipant: false,
		isHost: false,
		isLocal: false,
		isConnected: false,
		statusIcon: "",
		statusIconTooltip: "",
		isReady: false,
		platformIcon: "",
		platformIconTooltip: "",
		leaderPortrait: "",
		leaderName: "",
		foundationLevel: 1,
		badgeURL: "",
		backgroundURL: "",
		playerTitle: "",
		civName: "",
		gamertag: "",
		firstPartyName: "",
		twoKName: "",
		isHuman: false,
		isDistantHuman: false,
		canEverBeKicked: false,
		canBeKickedNow: false,
		kickTooltip: "",
		isKickVoteTarget: false,
		isMuted: false,
		muteTooltip: "",
		playerInfoDropdown: null,
		civilizationDropdown: null,
		teamDropdown: null,
		leaderDropdown: null,
		mementos: [],
		samePlatformAsLocalPlayer: true
	};

	private titleLabel: HTMLElement = MustGetElement(".mspic-title", this.Root);
	private titleIcon: HTMLElement = MustGetElement(".mspic-title-icon", this.Root);
	private isConnectedIcon: HTMLElement = MustGetElement(".mspic-is-connected-icon", this.Root);

	private title2Label: HTMLElement = MustGetElement(".mspic-title2", this.Root);
	private titleIcon2: HTMLElement = MustGetElement(".mspic-title2-icon", this.Root);
	private isConnectedIcon2: HTMLElement = MustGetElement(".mspic-is-connected-icon2", this.Root);

	private subtitleLabel: HTMLElement = MustGetElement(".mspic-subtitle", this.Root);
	private background: HTMLElement = MustGetElement(".mspic-bg", this.Root);
	private badgeComponent: HTMLElement = MustGetElement("progression-badge", this.Root);
	private badgeContainer: HTMLElement = MustGetElement(".mspic-badge-container", this.Root);
	private hostIcon: HTMLElement = MustGetElement(".mspic-host-icon", this.Root);

	private localPlayerFilligree: HTMLElement = MustGetElement(".mspic-local-player-filligree", this.Root);

	private displayPlatformIcon: boolean = Network.supportsSSO();

	constructor(root: ComponentRoot) {
		super(root);

		if (!this.displayPlatformIcon) {
			this.subtitleLabel.classList.remove("ml-9");
		}
	}

	onAttach(): void {
		super.onAttach();
		this.hostIcon.style.backgroundImage = `url('fs://game/core/mpicon_host.png')`;
		this.titleIcon2.style.backgroundImage = `url('fs://game/prof_2k_logo.png')`;
		this.localPlayerFilligree.style.backgroundImage = `url('fs://game/core/mp_player_detail.png')`;
	}

	onAttributeChanged(name: string, _oldValue: string | null, newValue: string | null): void {
		switch (name) {
			case 'data-player-info':
				if (newValue) {
					if (_oldValue !== newValue) {
						this.playerData = JSON.parse(newValue);
						this.refresh();
					}
				}
				break;
		}
	}

	private refresh(): void {
		this.titleLabel.innerHTML = this.playerData.firstPartyName;
		(this.titleLabel.firstChild as HTMLElement)?.classList?.add("font-fit-shrink", "whitespace-nowrap");

		this.title2Label.innerHTML = this.playerData.isHuman ? this.playerData.twoKName : this.playerData.gamertag;
		(this.title2Label.firstChild as HTMLElement)?.classList?.add("font-fit-shrink", "whitespace-nowrap");

		const playerTwoKNameIsEmpty: boolean = this.playerData.isHuman && this.playerData.twoKName == "";
		let firstConnectionIconShown = false;
		if (!this.playerData.isHuman || !this.playerData.isConnected || !this.playerData.samePlatformAsLocalPlayer) {
			this.titleLabel.classList.toggle("hidden", !playerTwoKNameIsEmpty);
			this.titleIcon.classList.toggle("hidden", true);
			this.isConnectedIcon.classList.toggle("hidden", !playerTwoKNameIsEmpty);
		} else {
			this.titleLabel.classList.toggle("hidden", false);
			this.titleIcon.classList.toggle("hidden", !this.displayPlatformIcon);
			this.isConnectedIcon.classList.toggle("hidden", false);
			firstConnectionIconShown = true;
		}

		this.title2Label.classList.toggle("hidden", playerTwoKNameIsEmpty);
		this.titleIcon2.classList.toggle("hidden", playerTwoKNameIsEmpty || !this.playerData.isHuman);
		this.isConnectedIcon2.classList.toggle("hidden", playerTwoKNameIsEmpty || firstConnectionIconShown || !this.playerData.isHuman);

		this.subtitleLabel.classList.toggle("hidden", !this.playerData.isHuman || !this.playerData.isConnected);
		this.badgeContainer.classList.toggle("mr-6", !this.playerData.isHuman);
		this.badgeComponent.classList.toggle("hidden", !this.playerData.isHuman || !this.playerData.isConnected || !Network.isMetagamingAvailable());
		this.badgeComponent.classList.add("ml-1");
		this.hostIcon.classList.toggle("invisible", !this.playerData.isHost);

		if (this.playerData.isHuman) {
			this.subtitleLabel.setAttribute("data-l10n-id", this.playerData.playerTitle);
			this.badgeComponent.setAttribute("data-badge-url", this.playerData.badgeURL);
			this.badgeComponent.setAttribute("data-badge-progression-level", this.playerData.foundationLevel.toString());

			this.titleIcon.style.backgroundImage = `url('${this.playerData.platformIcon}')`;
			this.isConnectedIcon.style.backgroundImage = `url('${this.playerData.isConnected ? "fs://game/core/mpicon_playerstatus_green.png" : "fs://game/core/mpicon_playerstatus_red.png"}')`;
			this.isConnectedIcon2.style.backgroundImage = `url('${this.playerData.isConnected ? "fs://game/core/mpicon_playerstatus_green.png" : "fs://game/core/mpicon_playerstatus_red.png"}')`;
		}

		this.background.style.backgroundImage = this.playerData.isHuman && this.playerData.isConnected ? `url('${this.playerData.backgroundURL}')` : "";
		this.background.classList.toggle("bg-primary-5", !this.playerData.isHuman && !this.playerData.isParticipant);
		this.background.classList.toggle("opacity-50", !this.playerData.isHuman && !this.playerData.isParticipant);
		this.background.classList.toggle("img-mp-lobby-ai-background", (!this.playerData.isHuman && this.playerData.isParticipant) || (this.playerData.isHuman && !this.playerData.isConnected));

		this.setLocalPlayer(this.playerData.isLocal);
	}

	private setLocalPlayer(isLocalPlayer: boolean) {
		this.localPlayerFilligree.classList.toggle("invisible", !isLocalPlayer);
	}
}

Controls.define('mp-staging-player-info-card', {
	createInstance: MpStagingPlayerInfoCard,
	description: 'player info card for the lobby',
	classNames: ['mp-staging-player-info-card', 'min-h-24'],
	styles: ['fs://game/core/ui/shell/mp-staging/mp-staging-player-info-card.css'],
	content: ['fs://game/core/ui/shell/mp-staging/mp-staging-player-info-card.html'],
	attributes: [
		{
			name: 'data-player-info'
		}
	]
});
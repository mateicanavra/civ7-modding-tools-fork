/**
 * @file mp-primary-account-select.ts
 * @copyright 2020-2024, Firaxis Games
 * @description The Primary Account Selection Screen
 */

import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import DialogBoxManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import { UnlockableRewardItems } from '/core/ui/utilities/utilities-liveops.js';
import { Focus } from '/core/ui/input/focus-support.js';

class MpPrimaryAccountSelect extends Panel {

	//TODO: Have these structures populated with real info
	//private currentPrimaryProfile: Partial<DNAUserCardInfo> = {};
	//private currentPlatformProfile: Partial<DNAUserCardInfo> = {};
	private currentPrimaryProfile: DNAUserProfile | null = null;
	private currentPlatformProfile: DNAUserProfile | null = null;

	private currentPrimaryButton!: HTMLElement;
	private currentPlatformButton!: HTMLElement;

	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };
	private profileButtonListener = (useCurrentPrimary: boolean) => { this.onUserProfileSelected(useCurrentPrimary); }
	private isClosing: boolean = false;

	onInitialize() {
		this.currentPrimaryButton = MustGetElement(".mp-primary-account__current-primary-button", this.Root);
		this.currentPlatformButton = MustGetElement(".mp-primary-account__current-platform-button", this.Root);
	}

	onAttach() {
		super.onAttach();
		this.Root.addEventListener('engine-input', this.engineInputListener);
		this.currentPrimaryButton.addEventListener('action-activate', () => { this.profileButtonListener(true); });
		this.currentPlatformButton.addEventListener('action-activate', () => { this.profileButtonListener(false); });

		const profiles = Online.UserProfile.getPlatformUserProfilesData();
		profiles.userProfiles.forEach(profile => {
			if (profile.Status == "primary") {
				this.currentPrimaryProfile = profile;
			}
			else if (profile.Status == "platform") {
				this.currentPlatformProfile = profile;
			}
			else {
				console.warn("No status marked for profile!");
			}
		});

		const currentPrimaryAccountButton: HTMLElement | null = MustGetElement<HTMLElement>('.mp-primary-account-select__primary-account-info', this.Root);
		currentPrimaryAccountButton.innerHTML = this.buildPlayerCard();
		currentPrimaryAccountButton.appendChild(this.buildLastSeenDateAndTimeHTML());

		const currentPlatformAccountButton: HTMLElement | null = MustGetElement<HTMLElement>('.mp-primary-account-select__platform-account-info', this.Root);
		currentPlatformAccountButton.innerHTML = this.buildPlayerCard(true);
		currentPlatformAccountButton.appendChild(this.buildLastSeenDateAndTimeHTML(true));
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericSelect();

		Focus.setContextAwareFocus(MustGetElement(".mp-primary-account-select__buttons-container", this.Root), this.Root);
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}


	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}
	}

	private buildPlayerCard(isPlatformProfile = false): string {

		// Currently stubbing the player card info with dummy info
		const accountType: string = isPlatformProfile ? "platform" : "primary";

		const badgeID: string = isPlatformProfile ? this.currentPlatformProfile?.BadgeId ?? "" : this.currentPrimaryProfile?.BadgeId ?? "";
		const badgeURL = UnlockableRewardItems.getBadge(badgeID).url;

		const bannerID: string = isPlatformProfile ? this.currentPlatformProfile?.BannerId ?? "" : this.currentPrimaryProfile?.BannerId ?? "";
		const bannerURL = UnlockableRewardItems.getBanner(bannerID).url;

		const playerTitle: string = Locale.compose(isPlatformProfile ? this.currentPlatformProfile?.TitleLocKey ?? "" : this.currentPrimaryProfile?.TitleLocKey ?? "");


		const platformIconURL: string = isPlatformProfile ? this.currentPlatformProfile?.InfoIconURL ?? "" : this.currentPrimaryProfile?.InfoIconURL ?? "";
		const platformName: string = isPlatformProfile ? this.currentPlatformProfile?.firstPartyName ?? "" : this.currentPrimaryProfile?.firstPartyName ?? "";

		const foundationLevel: number = isPlatformProfile ? this.currentPlatformProfile?.FoundationLevel ?? 1 : this.currentPrimaryProfile?.FoundationLevel ?? 1;

		return '<div class="mp-primary-account-select__' + accountType + '-account-player-card-background-image relative w-full bg-cover bg-no-repeat h-20" style="background-image: url(' + bannerURL + ');">' + '<br/>' +
			'<fxs-hslot class="mp-primary-account-select__' + accountType + '-account-player-card relative w-full h-full flex flex-row justify-between fxs-hslot" tabindex="-1" slot="true">' + '<br/>' +
			'<div class="mp-primary-account-select__' + accountType + '-account-player-card-data-wrapper flex flex-initial grow">' + '<br/>' +
			'<fsx-hslot class="mp-primary-account-select__' + accountType + '-account-player-card-data flex grow fxs-hslot" tabindex="-1" slot="true">' + '<br/>' +
			'<div class="mp-primary-account-select__' + accountType + '-account-player-card-platform-icon bg-cover bg-no-repeat w-8 h-8" style="background-image: url(' + platformIconURL + ');">' + '</div>' + '<br/>' +
			'<div class="mp-primary-account-select__' + accountType + '-account-player-card-platform-name font-body text-base text-header-4 flex font-fit-shrink">' + platformName + '</div>' + '<br/>' +
			'<div class="mp-primary-account-select__' + accountType + '-account-player-card-title font-body text-sm text-accent-1 flex self-end -mt-2">' + playerTitle + '</div>' +
			'</fsx-hslot>' +
			'</div>' + '<br/>' +
			'<div class="mp-primary-account-select__' + accountType + '-account-player-card-badge flex">' + '<br/>' +
			'<progression-badge class="mp-primary-account-select__' + accountType + '-account-player-card-badge relative flex shrink -mt-4 mx-2" badge-size="micro" data-badge-url="' + badgeURL + '" data-badge-progression-level="' + foundationLevel + '">' + '<br/>' +
			'</progression-badge>' +
			'</div>' +
			'</fxs-hslot>' +
			'</div>';
	}

	private buildLastSeenDateAndTimeHTML(isPlatformProfile = false): Node {
		const playerCard: HTMLElement = document.createElement("div");
		playerCard.className = isPlatformProfile ? "mp-primary-account-select__last-seen-on-current-platform" : "mp-primary-account-select__last-seen-on-current-primary";
		playerCard.classList.add("flex", "items-center", "justify-center", "mt-1", "mb-1", "font-body", "text-center", "text-accent-1", "text-xs", "font-fit-shrink", "tracking-100", "whitespace-nowrap");
		playerCard.textContent = isPlatformProfile ? this.currentPlatformProfile?.LastSeen ?? "" : this.currentPrimaryProfile?.LastSeen ?? "";
		return playerCard;
	}

	private setNewPrimaryAccount(useCurrentPrimary: boolean) {
		Network.completePrimaryAccountSelection(useCurrentPrimary);
	}

	private showWarningPopUp(useCurrentPrimary: boolean) {
		NavTray.clear();
		// if user chooses to use current primary, no need for the warning dialog
		if (useCurrentPrimary) {
			this.setNewPrimaryAccount(useCurrentPrimary);
			this.close();
		}
		else {
			DialogBoxManager.createDialog_ConfirmCancel({
				body: "LOC_UI_PRIMARY_ACCOUNT_SELECT_WARNING",
				title: "LOC_OPTIONS_ARE_YOU_SURE",
				canClose: false,
				callback: (eAction: DialogBoxAction) => { if (eAction == DialogBoxAction.Confirm) { this.setNewPrimaryAccount(useCurrentPrimary); this.close(); } }
			});
		}
	}

	private onUserProfileSelected(useCurrentPrimary: boolean) {
		if (this.isClosing) {
			return;
		}
		this.showWarningPopUp(useCurrentPrimary);
	}

	protected close() {
		this.isClosing = true;
		super.close();
	}
}

Controls.define('screen-mp-primary-account-select', {
	createInstance: MpPrimaryAccountSelect,
	description: 'Screen to select primary account.',
	classNames: ['mp-primary-account-select'],
	content: ['fs://game/core/ui/shell/mp-primary-account-select/mp-primary-account-select.html'],
	tabIndex: -1
});

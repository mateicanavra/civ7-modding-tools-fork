/**
 * @file progression-header.ts
 * @copyright 2020-2024, Firaxis Games
 * @description A flexible card showing the player's meta-progression (aka "Player Card")
 */
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
import { getDefaultPlayerInfo } from '/core/ui/utilities/utilities-liveops.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
class ProgressionHeader extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.cardStyle = "";
        this.playerInfo = getDefaultPlayerInfo();
        this.display2KName = Network.supportsSSO();
    }
    onAttach() {
        super.onAttach();
        engine.on("UserInfoUpdated", this.refreshPlayerCard, this);
    }
    onDetach() {
        super.onDetach();
        engine.off("UserInfoUpdated", this.refreshPlayerCard, this);
    }
    onAttributeChanged(name, oldValue, newValue) {
        super.onAttributeChanged(name, oldValue, newValue);
        switch (name) {
            case 'player-card-style':
                if (newValue) {
                    if (newValue == "social" || newValue == "large" || newValue == "mini" || newValue == "micro") {
                        if (this.cardStyle !== newValue) {
                            this.cardStyle = newValue;
                            this.refreshPlayerCard();
                        }
                    }
                    else {
                        console.error(`progression-header: card-style attribute must be 'social', 'large', 'mini', or 'micro'`);
                    }
                }
                else {
                    console.error(`progression-header: card-style attribute is empty`);
                }
                break;
            case 'data-player-info':
                if (newValue) {
                    const parsed = JSON.parse(newValue);
                    if (this.playerInfo !== parsed) {
                        this.playerInfo = parsed;
                        this.refreshPlayerCard();
                    }
                }
                break;
        }
    }
    refreshPlayerCard() {
        // remove the unknown platform icon of the search result and avoid duplicate 2k icon display
        let firstPartyLogo = null;
        if (this.playerInfo.firstPartyType != HostingType.HOSTING_TYPE_UNKNOWN) {
            if (this.playerInfo.firstPartyType == HostingType.HOSTING_TYPE_T2GP) {
                firstPartyLogo = NetworkUtilities.getHostingTypeURL(Network.getLocalHostingPlatform()) ?? null;
            }
            else {
                firstPartyLogo = NetworkUtilities.getHostingTypeURL(this.playerInfo.firstPartyType) ?? null;
            }
        }
        this.Root.classList.toggle("pointer-events-auto", this.cardStyle != "micro");
        this.Root.classList.toggle("pointer-events-none", this.cardStyle == "micro");
        let firstPartyFriendStatusURL = "";
        const firstPartyID = this.Root.getAttribute('data-friend-id-1p');
        if (firstPartyID && Online.Social.isUserFriendOnPlatform(firstPartyID, FriendListTypes.Immediate)) {
            firstPartyFriendStatusURL = "fs://game/soc_friends.png";
        }
        let t2gpFriendStatusURL = "";
        const friendIdT2gp = this.Root.getAttribute('data-friend-id-t2gp');
        if (friendIdT2gp && Online.Social.isUserFriendOnPlatform(friendIdT2gp, FriendListTypes.Immediate)) {
            t2gpFriendStatusURL = "fs://game/soc_friends.png";
        }
        const displayName1P = this.playerInfo.firstPartyName;
        const displayIcon1P = NetworkUtilities.getHostingTypeURL(this.playerInfo.firstPartyType) ?? "";
        const displayName2K = this.playerInfo.twoKName;
        const displayIcon2K = "fs://game/prof_2k_logo.png";
        switch (this.cardStyle) {
            case "social":
                let twoKLogo = "";
                if (this.playerInfo.twoKName) {
                    twoKLogo = "fs://game/prof_2k_logo.png";
                }
                this.Root.classList.add("ph-use-highlight");
                this.Root.innerHTML = `
				<div class="ph-bg bg-contain bg-no-repeat w-187 h-25" style="background-image: url('${this.playerInfo.BackgroundURL}_soc.png');">
					<div class="relative">
						<fxs-hslot class="ph-hslot relative flex w-full h-full flex-row justify-between">
							${this.playerInfo.LeaderID.length > 0 ? `
							<div class="ph-portrait-container w-20 h-20 self-center">
								<div class="pp-leader-button w-full h-full relative" style="margin-left: 10px;">
								    <div class="pp-leader-button__tintable-bg absolute inset-0 bg-cover bg-no-repeat" style="filter: fxs-color-tint(${this.playerInfo.BackgroundColor})"></div>
									<div class="absolute inset-0 bg-cover bg-no-repeat" style="background-image: url('${this.playerInfo.BorderURL}')""></div>
									<fxs-icon class="absolute inset-0" data-icon-context="LEADER" data-icon-id="${this.playerInfo.LeaderID}"></fxs-icon>
									<div class="pp-leader-button-ring-selected absolute -inset-5"></div>
								</div>
							</div>` : ""}
							${this.playerInfo.BadgeURL.length > 0 ? `
								<div class="ph-badge-container flex h-full">
									<progression-badge badge-size="base" data-badge-url="${this.playerInfo.BadgeURL}" data-badge-progression-level="${this.playerInfo.FoundationLevel}"></progression-badge>
								</div>` : ""}

							<div class="ph-title-container flex flex-auto h-full ml-2">
								<fxs-vslot class="ph-title-sub-container flex self-center">							
									${this.playerInfo.firstPartyName.length > 0 ? `
										<fxs-hslot class="ph-social-data-row mb-2">
											${this.display2KName ? `<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${firstPartyLogo}');"></div>` : ""}
											<div class="ph-title font-body text-lg text-accent-1 text-shadow flex self-center">${this.playerInfo.firstPartyName}</div>
											<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${firstPartyFriendStatusURL}');"></div>
										</fxs-hslot>
										
									${this.display2KName ? `<fxs-hslot class="ph-social-data-row">
											<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${twoKLogo}');"></div>
											<div class="ph-name font-title text-lg text-header-4 text-shadow flex self-center">${this.playerInfo.twoKName}</div>
											<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${t2gpFriendStatusURL}');"></div>
										</fxs-hslot>` : ""}
									` : this.display2KName ? `
										<fxs-hslot class="ph-social-data-row" style="margin-left: 16px;">
											<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${twoKLogo}');"></div>
											<div class="ph-name font-title text-lg text-header-4 text-shadow flex self-center">${this.playerInfo.twoKName}</div>
											<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${t2gpFriendStatusURL}');"></div>
										</fxs-hslot>
									` : ""}
								</fxs-vslot>
							</div>
							<fxs-vslot class="ph-social-right-side flex flex-auto h-full w-20 mr-2 justify-between">
								<div class="ph-status-text flex font-body text-accent-2 text-shadow font-fit-shrink whitespace-nowrap self-end">${this.playerInfo.Status}</div>
								<div class="ph-info-icon w-8 h-8 bg-contain bg-no-repeat self-center" style="background-image: url('${this.playerInfo.InfoIconURL}');"></div>
								<div class="ph-date-text flex font-body text-accent-2 text-shadow h-4 mb-4 self-end">${this.playerInfo.LastSeen}</div>
							</fxs-vslot>
						</fxs-hslot>
						<div class="ph-highlight absolute top-0 bottom-0 left-0 right-0"></div>
					</div>
				</div>
			`;
                break;
            case "large":
                this.Root.classList.add("ph-use-highlight");
                this.Root.innerHTML = `
					<div class="ph-bg bg-cover bg-no-repeat w-full p-2" style="background-image: url('${this.playerInfo.BackgroundURL}');">
						<div class="ph-hslot relative flex w-full flex-row items-center">
							<div class="ph-portrait-container w-25 h-25 self-center">
								<progression-portrait portrait-level="base" data-leader-id="${this.playerInfo.LeaderID}" data-border-url="${this.playerInfo.BorderURL}" data-background-color="${this.playerInfo.BackgroundColor}"></progression-portrait>
							</div>
							<div class="ph-title-container flow-row flex-auto justify-center mx-2">
								<div class="h-full items-stretch max-w-full flow-column">
									<div class="flow-row items-center">
										${this.display2KName ? `<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${displayIcon1P}');"></div>` : ""}
										<div class="flex-auto">
											<div class="ph-name font-title text-2xl text-header-2 text-shadow font-fit-shrink whitespace-nowrap">${displayName1P}</div>
										</div>
									</div>

									${this.display2KName ? `<div class="flow-row items-center">
										<div class="ph-platform-icon w-8 h-8 mr-2 bg-cover bg-no-repeat" style="background-image: url('${displayIcon2K}');"></div>
										<div class="flex-auto">
											<div class="ph-name font-title text-2xl text-header-2 text-shadow font-fit-shrink whitespace-nowrap">${displayName2K}</div>
										</div>
									</div>	` : ""}
																
									<div class="ph-title font-body text-base text-accent-1 text-shadow flex font-fit-shrink whitespace-nowrap" data-l10n-id="${this.playerInfo.playerTitle}"></div>
								</div>
							</div>
							<div class="ph-badge-container flex mr-1">
								<progression-badge badge-size="base" data-badge-url="${this.playerInfo.BadgeURL}" data-badge-progression-level="${this.playerInfo.FoundationLevel}"></progression-badge>
							</div>
						</div>
					</div>
				`;
                break;
            case "mini":
                this.Root.classList.add("ph-use-highlight", "ph-mini-body");
                this.Root.innerHTML = `		
					<div class="ph-bg bg-cover bg-no-repeat w-full h-full p-1" style="background-image: url('${this.playerInfo.BackgroundURL}.png');">
					<div class="ph-hslot relative flex w-full h-full flow-row justify-between">			
						<div class="ph-title-container flex-auto flex-initial h-full">
							<div class="flow-column max-w-full">
								<div class="flow-row items-center">
									${this.display2KName ? `<div class="ph-platform-icon w-7 h-7 mr-2 mb-2 bg-cover bg-no-repeat" style="background-image: url('${displayIcon1P}');"></div>` : ""}
									<div class="flex-auto flow-row items-center mb-2">
										<div class="ph-name font-body text-base text-header-4 text-shadow font-fit-shrink whitespace-nowrap flex">${displayName1P}</div>
									</div>
								</div>
								${this.display2KName ? `<div class="flow-row items-center">
									<div class="ph-platform-icon w-6 h-6 mr-2\\.5 ml-0\\.5 bg-cover bg-no-repeat" style="background-image: url('${displayIcon2K}');"></div>
									<div class="flex-auto flow-row items-center">
										<div class="ph-name font-body text-base text-header-4 text-shadow  font-fit-shrink whitespace-nowrap">${displayName2K}</div>
									</div>
								</div>` : ""}
								<div class="ph-title font-body text-sm text-accent-1 mt-1 flex font-fit-shrink whitespace-nowrap" data-l10n-id="${this.playerInfo.playerTitle}"></div>
							</div>
						</div>
						<div class="ph-badge-container flex h-full -mt-1\\.5 mr-0\\.5">
							<progression-badge badge-size="micro" data-badge-url="${this.playerInfo.BadgeURL}" data-badge-progression-level="${this.playerInfo.FoundationLevel}"></progression-badge>
						</div>
					</div>
				</div>
				`;
                break;
            case "micro":
                this.Root.innerHTML = `
				<fxs-hslot class="progression-info-hslot justify-end">
					<div class="flow-column justify-center progression-info-text pointer-events-none text-right top-1 mr-1 flex-auto">
						<div class="font-body-base text-accent-2 mr-2 font-fit-shrink whitespace-nowrap">${this.playerInfo.firstPartyName}</div>
						${this.display2KName ? `<div class="font-body-base text-accent-2 mr-2 font-fit-shrink whitespace-nowrap">${this.playerInfo.twoKName}</div>` : ""}
						<div class="font-body-xs text-accent-3 mr-2 font-fit-shrink whitespace-nowrap" data-l10n-id="${this.playerInfo.playerTitle}"></div>
					</div>
					<div class="w-22 h-22 img-prof-btn-bg pointer-events-auto relative transition-transform hover\\:scale-110 focus\\:scale-110" data-tooltip-content="${this.playerInfo.twoKName}">
						<div class="absolute inset-0 opacity-30" style="background-color: ${this.playerInfo.BackgroundColor}"></div>
						<progression-badge class="absolute inset-y-0 -inset-x-0\\.5" badge-size="base" data-badge-url="${this.playerInfo.BadgeURL}" data-badge-progression-level="${this.playerInfo.FoundationLevel}"></progression-badge>
					</div>
				</fxs-hslot>
				`;
                break;
        }
    }
}
Controls.define('progression-header', {
    createInstance: ProgressionHeader,
    description: 'Header showing the players meta-progression',
    classNames: ['ph-player-card'],
    styles: ['fs://game/core/ui/progression-header/progression-header.css'],
    tabIndex: -1,
    attributes: [
        {
            name: 'player-card-style'
        },
        {
            name: 'data-player-info'
        },
        {
            name: 'disabled'
        }
    ]
});

//# sourceMappingURL=file:///core/ui/progression-header/progression-header.js.map

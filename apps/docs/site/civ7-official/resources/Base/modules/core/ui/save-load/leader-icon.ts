/**
 * @file leader-icon.ts
 * @copyright 2023, Firaxis Games
 * @description Leader icon component
 */

class LeaderIcon extends Component {
	private leader: string = "UNKNOWN_LEADER";
	private bgColor: string = "#000000";
	private fgColor: string = "#000000";
	private civIconUrl: string = "fs://game/core/ui/civ_sym_unknown";

	private background: HTMLElement | null = null;
	private icon: HTMLElement | null = null;
	private banner: HTMLElement | null = null;
	private bannerContainer: HTMLElement | null = null;
	private civIcon: HTMLElement | null = null;

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	onAttributeChanged(name: string, _oldValue: string, newValue: string): void {
		switch (name) {
			case 'leader':
				this.leader = newValue;

				if (this.icon) {
					this.icon.setAttribute("data-icon-id", this.leader);
				}

				break;
			case 'civ-icon-url':
				this.civIconUrl = newValue;

				this.bannerContainer?.classList.toggle("hidden", !this.civIconUrl);

				if (this.civIcon) {
					this.civIcon.style.backgroundImage = `url('${this.civIconUrl}')`;
				}
				break;
			case 'fg-color':
				this.fgColor = newValue;

				if (this.civIcon) {
					this.civIcon.style.fxsBackgroundImageTint = this.fgColor;
				}

				break;
			case 'bg-color':
				this.bgColor = newValue;

				if (this.background && this.banner) {
					this.background.style.fxsBackgroundImageTint = this.bgColor;
					this.banner.style.fxsBackgroundImageTint = this.bgColor;
				}

				break;
			case 'horizontal-banner-right':
				this.bannerContainer?.style.setProperty("transform", "translate(75%, 0) rotate(270deg)");
				this.civIcon?.style.setProperty("transform", "translateY(5%) rotate(90deg)");

				break;
			case 'horizontal-banner-left':
				this.bannerContainer?.style.setProperty("transform", "translate(-75%, 0) rotate(90deg)");
				this.civIcon?.style.setProperty("transform", "translateY(5%) rotate(270deg)");
		}
	}

	render() {
		const shadow = document.createElement("div");
		shadow.classList.add("absolute", "inset-0", "-top-2", "-bottom-2", "bg-center", "bg-cover", "bg-no-repeat", "img-hex-shadow");
		shadow.style.fxsBackgroundImageTint = "#000000";
		this.Root.appendChild(shadow);

		this.bannerContainer = document.createElement("div");
		this.bannerContainer.classList.add("hidden", "absolute", "inset-0", "flow-row", "items-center", "justify-center");
		this.bannerContainer.style.setProperty("transform", "translate(1px, 75%)");

		const bannerShadow = document.createElement("div");
		bannerShadow.classList.add("absolute", "img-hud-frontbanner-shadow", "inset-0", "-top-2\\.5", "-bottom-2\\.5");
		this.bannerContainer.appendChild(bannerShadow);

		this.banner = document.createElement("div");
		this.banner.classList.add("absolute", "img-hud-frontbanner", "inset-0", "-top-2\\.5", "-bottom-2\\.5");
		this.banner.style.fxsBackgroundImageTint = this.bgColor;
		this.bannerContainer.appendChild(this.banner);

		const bannerOverlay = document.createElement("div");
		bannerOverlay.classList.add("absolute", "img-hud-frontbanner-overlay", "inset-0", "-top-2\\.5", "-bottom-2\\.5");
		this.bannerContainer.appendChild(bannerOverlay);

		const civIconContainer = document.createElement("div");
		civIconContainer.classList.add("absolute", "inset-0", "flow-row", "items-center", "justify-center", "right-px");
		this.bannerContainer.appendChild(civIconContainer);

		this.civIcon = document.createElement("div");
		this.civIcon.classList.add("absolute", "inset-3", "bg-center", "bg-contain", "bg-no-repeat");
		this.civIcon.style.setProperty("transform", "translateY(5%)");
		this.civIcon.style.backgroundImage = `url('${this.civIconUrl}')`;
		this.civIcon.style.fxsBackgroundImageTint = this.fgColor;
		civIconContainer.appendChild(this.civIcon);

		this.Root.appendChild(this.bannerContainer);

		this.background = document.createElement("div");
		this.background.classList.add("absolute", "inset-0\\.5", "bg-center", "bg-cover", "bg-no-repeat", "img-hex-64");
		this.background.style.fxsBackgroundImageTint = this.bgColor;
		this.Root.appendChild(this.background);

		const overlay = document.createElement("div");
		overlay.classList.add("absolute", "-inset-2", "bg-center", "bg-cover", "bg-no-repeat", "img-hex-overlay");
		this.Root.appendChild(overlay);

		const frame = document.createElement("div");
		frame.classList.add("absolute", "inset-0", "-top-2", "-bottom-2", "bg-center", "bg-cover", "bg-no-repeat", "tint-bg-secondary", "img-hex-frame");
		this.Root.appendChild(frame);

		this.icon = document.createElement("fxs-icon");
		this.icon.setAttribute("data-icon-id", this.leader);
		this.icon.setAttribute("data-icon-context", "LEADER");
		this.icon.classList.add("absolute", "-left-3", "-right-3", "-top-5", "-bottom-1\\.5", "w-auto", "h-auto");
		this.Root.appendChild(this.icon);
	}
}

Controls.define('leader-icon', {
	createInstance: LeaderIcon,
	classNames: ["relative", "flow-row", "items-center", "justify-center"],
	images: [
		"fs://game/core/hud_diplo_hex-shadow.png",
		"fs://game/core/Hex_64px.png",
		"fs://game/core/overlay_hex-icon.png",
		"fs://game/core/hud_diplo_hex-frame.png",
	],
	attributes: [
		{
			name: 'leader'
		},
		{
			name: 'bg-color'
		},
		{
			name: 'fg-color'
		},
		{
			name: 'civ-icon-url'
		},
		{
			name: 'horizontal-banner-right'
		},
		{
			name: 'horizontal-banner-left'
		}
	]
});
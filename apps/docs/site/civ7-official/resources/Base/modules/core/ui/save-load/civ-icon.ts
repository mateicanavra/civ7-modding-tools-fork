/**
 * @file civ-icon.ts
 * @copyright 2023, Firaxis Games
 * @description Civ icon component
 */

class CivIcon extends Component {
	private iconUrl: string = "fs://game/civ_sym_unknown.png";
	private bgColor: string = "#000000";
	private fgColor: string = "#000000";

	private background: HTMLElement | null = null;
	private icon: HTMLElement | null = null;

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	onAttributeChanged(name: string, _oldValue: string, newValue: string): void {
		switch (name) {
			case 'icon-url':
				this.iconUrl = newValue;

				if (this.icon) {
					this.icon.style.backgroundImage = `url('${this.iconUrl}')`;
				}
				break;
			case 'bg-color':
				this.bgColor = newValue;

				if (this.background) {
					this.background.style.fxsBackgroundImageTint = this.bgColor;
				}

				break;
			case 'fg-color':
				this.fgColor = newValue;

				if (this.icon) {
					this.icon.style.fxsBackgroundImageTint = this.fgColor;
				}
				break;
		}
	}

	render() {
		const shadow = document.createElement("div");
		shadow.classList.add("absolute", "w-16", "h-20", "bg-center", "bg-cover", "bg-no-repeat", "img-hex-shadow");
		shadow.style.fxsBackgroundImageTint = "#000000";
		this.Root.appendChild(shadow);

		this.background = document.createElement("div");
		this.background.classList.add("absolute", "w-14", "h-14", "bg-center", "bg-cover", "bg-no-repeat", "img-hex-64");
		this.background.style.fxsBackgroundImageTint = this.bgColor;
		this.Root.appendChild(this.background);

		const overlay = document.createElement("div");
		overlay.classList.add("absolute", "w-20", "h-20", "bg-center", "bg-cover", "bg-no-repeat", "img-hex-overlay");
		this.Root.appendChild(overlay);

		const frame = document.createElement("div");
		frame.classList.add("absolute", "w-16", "h-20", "bg-center", "bg-cover", "bg-no-repeat", "tint-bg-secondary", "img-hex-frame");
		this.Root.appendChild(frame);

		this.icon = document.createElement("div");
		this.icon.classList.add("absolute", "w-12", "h-12", "bg-center", "bg-contain", "bg-no-repeat", "bottom-2");
		this.icon.style.backgroundImage = `url('${this.iconUrl}')`;
		this.icon.style.fxsBackgroundImageTint = this.fgColor;
		this.Root.appendChild(this.icon);
	}
}

Controls.define('civ-icon', {
	createInstance: CivIcon,
	classNames: ["relative", "flow-column", "items-center", "justify-center", "w-16", "h-16"],
	images: [
		"fs://game/core/hud_diplo_hex-shadow.png",
		"fs://game/core/Hex_64px.png",
		"fs://game/core/overlay_hex-icon.png",
		"fs://game/core/hud_diplo_hex-frame",
	],
	attributes: [
		{
			name: 'icon-url'
		},
		{
			name: 'bg-color'
		},
		{
			name: 'fg-color'
		}
	]
});
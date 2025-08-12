/**
 * @file progression-portrait.ts
 * @copyright 2020-2023, Firaxis Games
 * @description The player's meta-progression portrait
 */

class ProgressionPortrait extends Component {
	private portraitLevel: string = "base";
	private legendPath: string = "LEADER";
	private leaderLevel: string = "1";
	private borderURL: string = "";
	private displayLevel: boolean = Network.supportsSSO();

	onAttach() {
		super.onAttach();
	}

	onAttributeChanged(name: string, _oldValue: string | null, newValue: string | null) {
		switch (name) {
			case 'portrait-level': {
				if (newValue) {
					if (newValue == "base" || newValue == "mini" || newValue == "micro") {
						this.portraitLevel = newValue;
						this.refreshPortrait();
					} else {
						console.error(`progression-portrait: portrait-level attribute must be 'base', 'mini', or 'micro'`);
					}
				} else {
					console.error(`progression-portrait: portrait-level attribute is empty`);
				}
				break;
			}

			case 'data-leader-id': {
				if (newValue) {
					this.legendPath = newValue;
					this.refreshPortrait();
				} else {
					console.error(`progression-portrait: data-leader-id attribute is empty`);
				}
				break;
			}

			case 'data-border-url': {
				if (newValue) {
					this.borderURL = newValue;
					this.refreshPortrait();
				}
				break;
			}

			case 'data-leader-level': {
				if (newValue) {
					this.leaderLevel = newValue;
					this.refreshPortrait();
				} else {
					console.error(`progression-portrait: data-leader-level attribute is empty`);
				}
				break;
			}
		}
	}

	private refreshPortrait() {
		switch (this.portraitLevel) {
			case "base":
				this.Root.innerHTML = `
					<div class="pp-leader-button w-full h-full relative" style="pointer-events:none">
						<div class="pp-btn-bg absolute inset-0 bg-cover bg-no-repeat" style="background-image: url('${this.borderURL}')"></div>
						<fxs-icon class="pp-btn-icon absolute inset-0" data-icon-context="CIRCLE_MASK" data-icon-id="${this.legendPath}"></fxs-icon>
						<div class="pp-leader-button-ring-selected absolute -inset-5"></div>
						${this.displayLevel ? `<div class="absolute -bottom-1 inset-x-0 flex flex-row justify-center">
							<div class="pp-leader-button-level-circle font-body-sm text-center">${this.leaderLevel}</div>
						</div>`: ""}
					</div>
				`;
				break;

			case "mini":
				break;

			case "micro":
				break;
		}
	}
}

Controls.define('progression-portrait', {
	createInstance: ProgressionPortrait,
	description: 'Player meta-progression portrait',
	requires: ['hex-bord'],
	classNames: ['pp-btn'],
	styles: ['fs://game/core/ui/progression-portrait/progression-portrait.css'],
	attributes: [
		{
			name: 'portrait-level'
		},
		{
			name: 'data-leader-id'
		},
		{
			name: 'data-border-url'
		},
		{
			name: 'data-leader-level'
		}
	]
});

export { ProgressionPortrait as default }
/**
 * @file fxs-inner-frame.ts
 * @copyright 2024, Firaxis Games
 */

/**
 * An inner frame component, designed to be used inside other frame components
 */
export class FxsInnerFrame extends Component {
	onInitialize() {
		super.onInitialize();
		this.render();
	}

	private render() {
		this.Root.insertAdjacentHTML('afterbegin', `
			<div class="absolute inset-0 pointer-events-none">
				<div class="absolute top-0 inset-x-0 filigree-inner-frame-top"></div>
				<div class="absolute bottom-0 inset-x-0 filigree-inner-frame-bottom"></div>
			</div>
		`);
	}
}

Controls.define('fxs-inner-frame', {
	createInstance: FxsInnerFrame,
	description: 'A frame designed to be used inside other frames',
	classNames: ['fxs-inner-frame', 'inner-frame', 'relative', 'flex', 'flex-col', 'items-center'],
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-inner-frame': ComponentRoot<FxsInnerFrame>;
	}
}
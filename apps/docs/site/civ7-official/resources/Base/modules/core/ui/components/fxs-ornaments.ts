/**
 * @file fxs-ornaments.ts
 * @copyright 2020-2021, Firaxis Games
 * @description Various ornamental user interface pieces.
 */

/**
 * Ornament style 1, centered with curls and hex.
 */
export class FxsOrnament1 extends Component {

	onAttach() {
		super.onAttach();

		//TODO: Add behind logging filter. console.log("Attaching FxsOrnament1. tag:",this.Root.tagName);

		this.Root.innerHTML = `<div class='ornamentcontainer'>
		<div class='left'></div>
		<div class='right'></div>
		</div>`;
	}
}

Controls.define('fxs-ornament1', {
	createInstance: FxsOrnament1,
	description: 'Ornament style 1, centered with curls and hex.',
	classNames: ['fxs-ornament1'],
	attributes: []
});

/**
 * Ornament style 2, centered hex with flat wings fading to transparent.',
 */
export class FxsOrnament2 extends Component {
	onAttach() {
		super.onAttach();

		//TODO: Add behind logging filter. console.log("Attaching FxsOrnament2. tag:",this.Root.tagName);

		this.Root.innerHTML = `<img src='fs://game/core/ui/themes/default/img/Ornament_centerDivider_withHex.png'>`;
	}
}

Controls.define('fxs-ornament2', {
	createInstance: FxsOrnament2,
	description: 'Ornament style 2, centered hex with flat wings fading to transparent.',
	classNames: ['fxs-ornament2'],
	attributes: []
});


/**
 * Ornament style 3, simple centered line fading wings to transparent.
 */
export class FxsOrnament3 extends Component {
	onAttach() {
		super.onAttach();

		//TODO: Add behind logging filter. console.log("Attaching FxsOrnament3. tag:",this.Root.tagName);

		this.Root.innerHTML = `<div class='ornamentcontainer'>
		<div class='left'></div>
		<div class='right'></div>
		</div>`;
	}
}

Controls.define('fxs-ornament3', {
	createInstance: FxsOrnament3,
	description: 'Ornament style 3, simple centered line fading wings to transparent.',
	classNames: ['fxs-ornament3'],
	attributes: []
});

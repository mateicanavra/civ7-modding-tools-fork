/**
 * @file fxs-icon.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Icon Primitive
 */
export class FxsIcon extends Component {
	private renderQueued = false;

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();
		this.render();
	}

	onDetach() {
		super.onDetach();
	}

	onAttributeChanged(name: string, _oldValue: string, newValue: string) {
		if (_oldValue != newValue) {
			if (name == 'data-icon-id' || name == 'data-icon-context' || name == 'data-icon-size') {
				// Enqueue a microtask to allow for multiple attributes to be set in this scope.
				if (!this.renderQueued) {
					this.renderQueued = true;
					queueMicrotask(this.render.bind(this));
				}
			}
		}
	}

	private render() {
		this.renderQueued = false;
		const id: string | null = this.Root.getAttribute('data-icon-id');
		const context: string | null = this.Root.getAttribute('data-icon-context');
		if (id) {
			const iconUrl: string = UI.getIconCSS(id, context ? context : undefined);
			this.Root.style.backgroundImage = iconUrl;
		}
	}
}

Controls.define('fxs-icon', {
	createInstance: FxsIcon,
	description: 'An icon primitive',
	skipPostOnAttach: true,
	classNames: ['fxs-icon', 'icon'],
	attributes: [
		{
			name: "data-icon-id",
			description: "The id of the icon to display."
		},
		{
			name: "data-icon-context",
			description: "A ui-specific context field to determine which type of icon should be shown."
		},
		{
			name: "data-icon-size",
			description: "An optional size field hinting which size the image should be."
		},
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-icon': ComponentRoot<FxsIcon>;
	}
}
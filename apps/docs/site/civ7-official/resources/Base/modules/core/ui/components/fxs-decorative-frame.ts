/**
 * FxsDecorativeFrame is a container element that creates a decorative frame around its content.
 * 
 * Usage:
 * ```html
 * <fxs-decorative-frame>
 *   <div>Content</div>
 * </fxs-decorative-frame>
 * ```
 */
export class FxsDecorativeFrame extends Component {
	onInitialize() {
		super.onInitialize();
		const border = document.createElement('div');
		border.classList.add('fxs-decorative-frame__border');
		this.Root.insertBefore(border, this.Root.firstChild);
	}
}

const FxsDecorativeFrameTagName = 'fxs-decorative-frame';
Controls.define(FxsDecorativeFrameTagName, {
	createInstance: FxsDecorativeFrame,
});

declare global {
	interface HTMLElementTagNameMap {
		[FxsDecorativeFrameTagName]: ComponentRoot<FxsDecorativeFrame>;
	}
}
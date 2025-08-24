import ActionHandler, { ActiveDeviceTypeChangedEventName } from "/core/ui/input/action-handler.js";
import { Icon } from "/core/ui/utilities/utilities-image.js";

/**
 * @file fxs-font-icon.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Icon Primitive
 */

/**
 * FxsFontIcon is a standard web component used for displaying icons within text.
 * It does not make use of our component framework due to the fact that this element may be
 * used before the component system has been initialized (e.g the Loading Screen).
 */
class FxsFontIcon extends HTMLElement {

	private refreshId: number;
	private inputContextChangedHandle: EventHandle | null = null;
	private activeDeviceChangedListener = this.onActiveDeviceChange.bind(this);
	private hasDeviceChangedListener = false;


	constructor() {
		super();
		this.refreshId = 0;
	}

	connectedCallback(): void {
		if (this.isConnected) {
			this.refreshIcon();
		}
	}

	disconnectedCallback(): void {
		if (this.inputContextChangedHandle) {
			this.inputContextChangedHandle.clear();
			this.inputContextChangedHandle = null;
		}

		if (this.hasDeviceChangedListener) {
			window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
			this.hasDeviceChangedListener = false;
		}

		if (this.refreshId != 0) {
			cancelAnimationFrame(this.refreshId);
			this.refreshId = 0;
		}
	}

	attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
		if (_oldValue != newValue) {
			if (name == 'data-icon-id' || name == 'data-icon-context' || name == 'data-icon-size') {

				// Since icon data can depend on multiple fields, rather than refresh 3 times, queue a refresh for the following frame.
				if (this.refreshId == 0) {
					this.refreshId = requestAnimationFrame(() => {
						this.refreshIcon();
						this.refreshId = 0;
					})
				}
			}
		}
	}

	private refreshIcon() {
		this.innerHTML = '';
		const id: string | null = this.getAttribute('data-icon-id');
		const context: string | null = this.getAttribute('data-icon-context');
		if (id) {
			let iconURL: string = "";
			if (context == "action") {
				if (this.inputContextChangedHandle == null) {
					this.inputContextChangedHandle = engine.on('InputContextChanged', this.onActiveContextChanged, this);
				}

				if (!this.hasDeviceChangedListener) {
					window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
					this.hasDeviceChangedListener = true;
				}

				iconURL = Icon.getIconFromActionName(id, ActionHandler.deviceType) ?? "";
			} else {
				// TODO - Replace with fallback array or data-driven solution e.g `UI.getIconURL(id, ['FontIcon', ''])` or designate a fallback path in `icons.xml`
				iconURL = UI.getIconURL(id, 'FontIcon');
				if (!iconURL) {
					iconURL = UI.getIconURL(id);
				}
			}

			if (iconURL) {
				const el = document.createElement('img');
				el.src = iconURL;
				//! MAGIC NUMBER WARNING!
				// Background-image is not currently supported in an in-line block as of Coherent Gameface 1.47.0.1
				// % width/height units are not presently supported in an in-line block as of Coherent Gameface 1.47.0.1
				// Images use a separate width/height property that is not tied to CSS or background images.
				// This makes it difficult set the width and height correctly.
				// For now, we'll stick to a fixed size.  However, this needs to be resolved and preferably in a way that will support Background-Image.
				el.style.height = "1.5em";
				el.style.width = "1.5em";
				this.appendChild(el);
			}
		}
	}

	private onActiveContextChanged() {
		this.refreshIcon();
	}

	private onActiveDeviceChange() {
		this.refreshIcon();
	}
}

customElements.define('fxs-font-icon', FxsFontIcon);

declare global {
	interface HTMLElementTagNameMap {
		'fxs-font-icon': FxsFontIcon;
	}
}

export { FxsFontIcon as default }
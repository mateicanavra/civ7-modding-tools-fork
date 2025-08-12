/**
 * @file plot-icons-manager.ts
 * @copyright 2022, Firaxis Games
 * @description Tracks/stores the data needed for plot icons
 */

export interface PlotIconDefine {
	iconType: string;
	location: PlotCoord
	attributes?: Map<string, string>;
};

export interface PlotIcon {

}




type PlotIconAddEventDetail = {
	plot: PlotIconDefine
}
export class PlotIconRootAddEvent extends CustomEvent<PlotIconAddEventDetail> {
	constructor(plot: PlotIconDefine) {
		super('plot-icons-root-add', { detail: { plot }});
	}
}

type PlotIconRemoveEventDetail = {
	plotType: string,
	plotLocation: PlotCoord | null
}
export class PlotIconRootRemoveEvent extends CustomEvent<PlotIconRemoveEventDetail> {
	constructor(detail: PlotIconRemoveEventDetail) {
		super('plot-icons-root-remove', { detail });
	}
}

declare global {
	interface HTMLElementEventMap {
		'plot-icons-root-add': PlotIconRootAddEvent;
		'plot-icons-root-remove': PlotIconRootRemoveEvent;
	}
}

class PlotIconsManagerSingleton {
	private static signletonInstance: PlotIconsManagerSingleton;

	/** The icon root component used to sent events too */
	private iconRoot: Element | null = null;

	/** Queue of custom events used to cache events before the root component is alive */
	private eventQueue: CustomEvent[] = [];

	/** Lookup for plot icons based on location hash */
	private perPlotMap: Map<string, Component> = new Map<string, Component>();

	/** Flag set by debug panel to disable plot icons system. */
	private systemDisabled: boolean = false;

	/** Temporary element used to hold place in DOM when system is disabled. */
	private disabledPlaceholder: HTMLElement | null = null;

	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!PlotIconsManagerSingleton.signletonInstance) {
			PlotIconsManagerSingleton.signletonInstance = new PlotIconsManagerSingleton();
		}
		return PlotIconsManagerSingleton.signletonInstance;
	}

	constructor() {
		engine.whenReady.then(() => {
			// Register debug widget.
			const disablePlotIcons: UIDebugWidgetDefinition = {
				id: 'disablePlotIcons',
				category: 'Systems',
				caption: 'Disable Plot Icons',
				domainType: 'bool',
				value: false,
			};
			UI.Debug.registerWidget(disablePlotIcons);
			engine.on('DebugWidgetUpdated', (id: string, value: boolean) => {
				if (id == 'disablePlotIcons') {
					const systemWasDisabled = this.systemDisabled;
					this.systemDisabled = value;

					// TODO -  This will have change significantly as the tooltip system gets cleaned up.
					if (!systemWasDisabled && value) {
						if (this.disabledPlaceholder == null) {
							const el = document.createElement('div');
							el.style.display = 'none';
							el.setAttribute('data-placeholder', 'plot-icons-root');
							this.disabledPlaceholder = el;
						}

						if (this.iconRoot && this.disabledPlaceholder) {
							const parent = this.iconRoot.parentElement;
							if (parent) {
								parent.insertBefore(this.disabledPlaceholder, this.iconRoot);
								parent.removeChild(this.iconRoot);
								this.perPlotMap.clear();
							}
						}
					}

					if (systemWasDisabled && !value) {

						// Reattach the tooltip root.
						if (this.iconRoot && this.disabledPlaceholder) {
							const parent = this.disabledPlaceholder.parentElement;
							if (parent) {
								parent.insertBefore(this.iconRoot, this.disabledPlaceholder);
								parent.removeChild(this.disabledPlaceholder);
							}
						}
					}
				}
			})
		});
	}

	rootAttached(root: Element) {
		// Once we have our root sent any queued events
		this.eventQueue.forEach((event: CustomEvent) => {
			root.dispatchEvent(event);
		});

		// Cache our root and clear the queue
		this.eventQueue = [];
		this.iconRoot = root;
	}

	/**
	 * @description Called by a plot icon to let manager directly access it's instance.
	 * @param {PlotIcons} stack - plot icons which manager created.
	 */
	addStackForTracking(stack: Component) {
		const x: number = parseInt(stack.Root.getAttribute('x') ?? '-1');
		const y: number = parseInt(stack.Root.getAttribute('y') ?? '-1');
		if (x != -1 && y != -1) {
			const key: string = `${x},${y}`;

			if (this.perPlotMap.has(key)) {
				console.error(`plot-icons-manager: Stack at plot location ${x},${y} already added for tracking.`);
				return;
			}
			this.perPlotMap.set(key, stack);
		}
	}

	/**
	 * Add a plot icon to a specifc plot location with the option attributes
	 * @param {string} type Type of plot icon to be add
	 * @param {PlotCoord} location Location for this plot icon
	 * @param {Map<string, any>} attributes Optional attributes that this icon type needs
	 */
	addPlotIcon(type: string, location: PlotCoord, attributes?: Map<string, string>) {
		const plotIconDefine: PlotIconDefine = {
			iconType: type,
			attributes: attributes,
			location: location
		};

		this.addPlotIconToDataMap(plotIconDefine);
	}

	/**
	 * Removes all plot icons of a specificed type or only that type of icon from the provided plot location
	 * @param type Type of plot icon to be removed
	 * @param location If provide only icons of the provided type will be removed from this location
	 */
	removePlotIcons(type: string, location: PlotCoord | null = null) {
		const event = new PlotIconRootRemoveEvent({ plotType: type, plotLocation: location });
		if (this.iconRoot) {
			this.iconRoot.dispatchEvent(event);
		} else {
			this.eventQueue.push(event);
		}
	}

	getPlotIcon(x: number, y: number): Component | undefined {
		const key = `${x},${y}`;
		return this.perPlotMap.get(key)
	}

	getPlotIcons(): IterableIterator<Component> {
		return this.perPlotMap.values();
	}

	private addPlotIconToDataMap(plotData: PlotIconDefine) {
		const event = new PlotIconRootAddEvent(plotData);
		if (this.iconRoot && !this.systemDisabled) {
			this.iconRoot.dispatchEvent(event);
		} else {
			this.eventQueue.push(event);
		}
	}
}

const PlotIconsManager = PlotIconsManagerSingleton.getInstance();
export { PlotIconsManager as default };
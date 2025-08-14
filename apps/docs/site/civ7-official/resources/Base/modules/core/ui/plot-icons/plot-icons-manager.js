/**
 * @file plot-icons-manager.ts
 * @copyright 2022, Firaxis Games
 * @description Tracks/stores the data needed for plot icons
 */
;
export class PlotIconRootAddEvent extends CustomEvent {
    constructor(plot) {
        super('plot-icons-root-add', { detail: { plot } });
    }
}
export class PlotIconRootRemoveEvent extends CustomEvent {
    constructor(detail) {
        super('plot-icons-root-remove', { detail });
    }
}
class PlotIconsManagerSingleton {
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
        /** The icon root component used to sent events too */
        this.iconRoot = null;
        /** Queue of custom events used to cache events before the root component is alive */
        this.eventQueue = [];
        /** Lookup for plot icons based on location hash */
        this.perPlotMap = new Map();
        /** Flag set by debug panel to disable plot icons system. */
        this.systemDisabled = false;
        /** Temporary element used to hold place in DOM when system is disabled. */
        this.disabledPlaceholder = null;
        engine.whenReady.then(() => {
            // Register debug widget.
            const disablePlotIcons = {
                id: 'disablePlotIcons',
                category: 'Systems',
                caption: 'Disable Plot Icons',
                domainType: 'bool',
                value: false,
            };
            UI.Debug.registerWidget(disablePlotIcons);
            engine.on('DebugWidgetUpdated', (id, value) => {
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
            });
        });
    }
    rootAttached(root) {
        // Once we have our root sent any queued events
        this.eventQueue.forEach((event) => {
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
    addStackForTracking(stack) {
        const x = parseInt(stack.Root.getAttribute('x') ?? '-1');
        const y = parseInt(stack.Root.getAttribute('y') ?? '-1');
        if (x != -1 && y != -1) {
            const key = `${x},${y}`;
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
    addPlotIcon(type, location, attributes) {
        const plotIconDefine = {
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
    removePlotIcons(type, location = null) {
        const event = new PlotIconRootRemoveEvent({ plotType: type, plotLocation: location });
        if (this.iconRoot) {
            this.iconRoot.dispatchEvent(event);
        }
        else {
            this.eventQueue.push(event);
        }
    }
    getPlotIcon(x, y) {
        const key = `${x},${y}`;
        return this.perPlotMap.get(key);
    }
    getPlotIcons() {
        return this.perPlotMap.values();
    }
    addPlotIconToDataMap(plotData) {
        const event = new PlotIconRootAddEvent(plotData);
        if (this.iconRoot && !this.systemDisabled) {
            this.iconRoot.dispatchEvent(event);
        }
        else {
            this.eventQueue.push(event);
        }
    }
}
const PlotIconsManager = PlotIconsManagerSingleton.getInstance();
export { PlotIconsManager as default };

//# sourceMappingURL=file:///core/ui/plot-icons/plot-icons-manager.js.map

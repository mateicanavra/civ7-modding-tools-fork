/**
 * @file city-banners-stress-test.ts
 * @copyright 2023, Firaxis Games
 * @description A debug widget to support stress testing city banners.
 */
import { CityBannerComponent } from '/base-standard/ui/city-banners/city-banners.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
const BANNER_SPAWN_RADIUS = 3;
const state = {
    initialized: false,
    enabled: false,
    cityInitializedHandle: null,
    debugWidgetUpdatedHandle: null,
    fixedWorldAnchorsChangedHandle: null,
    cameraChangedHandle: null,
    container: null,
    _banners: null,
    get banners() {
        if (this._banners) {
            return this._banners;
        }
        if (!this.container) {
            return [];
        }
        const bannerElements = this.container.children;
        this._banners = new Array(bannerElements.length);
        for (let i = 0; i < bannerElements.length; i++) {
            const el = bannerElements[i];
            if (!(el instanceof ComponentRoot) || !(el.component instanceof CityBannerComponent)) {
                throw new Error('Unexcepted element in city banner stress test container.');
            }
            this._banners[i] = el.component;
        }
        return this._banners;
    },
    fixedWorldAnchorUpdateQueued: false,
    cameraChangedUpdateQueued: false,
    zoomLevel: Camera.getState().zoomLevel,
};
const CityBannerDebugWidget = {
    id: 'stressTestCityBanners',
    category: 'Profiling',
    caption: 'Stress Test City Banners',
    domainType: 'bool',
    value: false,
};
/**
 * Init registers the city banner stress test debug widget.
 */
export const Init = () => {
    if (state.initialized) {
        return;
    }
    UI.Debug.registerWidget(CityBannerDebugWidget);
    state.debugWidgetUpdatedHandle = engine.on('DebugWidgetUpdated', onDebugWidgetUpdated);
    state.initialized = true;
};
const onDebugWidgetUpdated = (id, value) => {
    if (id === CityBannerDebugWidget.id) {
        if (value) {
            console.log('Enabling city banner stress test.');
            state.enabled = true;
            start();
        }
        else {
            console.log('Disabling city banner stress test.');
            state.enabled = false;
            stop();
        }
    }
};
/**
 * Start begins spawning the debug city banners.
 */
const start = () => {
    state.container = document.createElement('div');
    state.container.classList.add('city-banners-debug');
    state.cityInitializedHandle = engine.on('CityInitialized', update);
    update();
    document.body.appendChild(state.container);
};
const update = () => {
    const container = state.container;
    if (!container) {
        return;
    }
    // 1. Get all cities
    const cities = [];
    const players = Players.getAlive();
    for (const player of players) {
        const playerCities = player.Cities?.getCities();
        if (!playerCities) {
            continue;
        }
        for (const city of playerCities) {
            cities.push(city);
        }
    }
    // 2. Spawn a copy of the banner in an x plot radius around each city
    container.innerHTML = '';
    state._banners = null;
    const fragment = document.createDocumentFragment();
    for (const city of cities) {
        const nearbyPlots = GameplayMap.getPlotIndicesInRadius(city.location.x, city.location.y, BANNER_SPAWN_RADIUS);
        const cityID = city.id;
        const cityPlotLocation = GameplayMap.getIndexFromLocation(city.location);
        // create a duplicate city banner for each plot
        for (const plot of nearbyPlots) {
            if (plot === cityPlotLocation) {
                continue;
            }
            const banner = document.createElement("city-banner");
            banner.setAttribute('city-id', ComponentID.toString(cityID));
            banner.setAttribute('data-debug-plot-index', plot.toString());
            fragment.appendChild(banner);
        }
    }
    container.appendChild(fragment);
};
const stop = () => {
    console.log('Stopping city banner stress test.');
    state.cityInitializedHandle?.clear();
    state.cityInitializedHandle = null;
    state.fixedWorldAnchorsChangedHandle?.clear();
    state.fixedWorldAnchorsChangedHandle = null;
    state._banners = null;
    state.cameraChangedUpdateQueued = false;
    state.fixedWorldAnchorUpdateQueued = false;
    if (state.container) {
        document.body.removeChild(state.container);
        state.container = null;
    }
};

//# sourceMappingURL=file:///base-standard/ui/debug/city-banners-stress-test.js.map

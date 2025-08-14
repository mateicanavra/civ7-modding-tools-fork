/**
 * @file screen-city-trade.ts
 * @copyright 2021, Firaxis Games
 * @description Panel for managing a City's resources and trade routes.
 */
import CityTradeData from '/base-standard/ui/city-trade/model-city-trade.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
//import { formatStringArrayAsListString } from '/core/ui/utilities/utilities-core-textprovider.js'
import { TradeRoute } from '/core/ui/utilities/utilities-data.js';
class ScreenCityTrade extends Panel {
    constructor() {
        super(...arguments);
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
    }
    onAttach() {
        super.onAttach();
        engine.on('TradeRouteAddedToMap', this.refresh, this);
        engine.on('TradeRouteRemovedFromMap', this.refresh, this);
        engine.on('TradeRouteChanged', this.refresh, this);
        const closeButton = document.createElement('fxs-close-button');
        closeButton.addEventListener('action-activate', () => { this.onClose(); });
        this.Root.appendChild(closeButton);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        const mainContainer = document.getElementById("city-trade-main-container");
        const c = mainContainer.firstElementChild;
        if (c) {
            FocusManager.setFocus(c);
        }
    }
    onDetach() {
        engine.off('TradeRouteAddedToMap', this.refresh, this);
        engine.off('TradeRouteRemovedFromMap', this.refresh, this);
        engine.off('TradeRouteChanged', this.refresh, this);
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        NavTray.addOrUpdateGenericAccept();
        this.refresh();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'cancel') {
            this.onClose();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    //--------------------
    refresh() {
        CityTradeData.update();
        if (CityTradeData.cityID) {
            let city = Cities.get(CityTradeData.cityID);
            if (city) {
                const frame = document.getElementById("screen-city-trade-frame");
                frame.setAttribute("subtitle", Locale.compose(city.name));
                // Clear main container
                const mainContainer = document.getElementById("city-trade-main-container");
                while (mainContainer.firstChild) {
                    mainContainer.removeChild(mainContainer.firstChild);
                }
                if (city.Resources == null) {
                    return;
                }
                // Total Yields section
                {
                    let yieldsContainer = document.createElement('div');
                    yieldsContainer.classList.add('market-item-container');
                    for (let i = 0; i < CityTradeData.yields.length; i++) {
                        const yieldData = CityTradeData.yields[i];
                        if (yieldData.value > 0) {
                            let yieldInfo = GameInfo.Yields.lookup(i);
                            if (yieldInfo) {
                                let yieldItemContainer = document.createElement('div');
                                yieldItemContainer.classList.add('market-yield-container');
                                let yieldValueElem = document.createElement('div');
                                yieldValueElem.classList.add('value');
                                yieldValueElem.innerHTML = "+" + yieldData.value.toFixed(1) + " " + Locale.compose(yieldInfo.Name);
                                yieldItemContainer.appendChild(yieldValueElem);
                                yieldsContainer.appendChild(yieldItemContainer);
                            }
                        }
                    }
                    mainContainer.appendChild(yieldsContainer);
                }
                // City Local Resources Section
                {
                    let cityResourcesLabel = document.createElement('div');
                    cityResourcesLabel.classList.add('section-header');
                    cityResourcesLabel.textContent = Locale.compose("LOC_UI_CITY_TRADE_LOCAL_RESOURCES");
                    mainContainer.appendChild(cityResourcesLabel);
                    let producedResourcesContainer = document.createElement('div');
                    producedResourcesContainer.classList.add('resource-container');
                    // Produced resources
                    let noLocalResources = document.createElement('div');
                    noLocalResources.textContent = Locale.compose("LOC_UI_CITY_TRADE_LOCAL_PRODUCTION");
                    producedResourcesContainer.appendChild(noLocalResources);
                    mainContainer.appendChild(producedResourcesContainer);
                }
                // Trade Partners Section
                let tradePartnersContainer = document.createElement('div');
                tradePartnersContainer.classList.add('resource-container');
                let partnersSubheader = document.createElement('div');
                partnersSubheader.classList.add('section-subheader');
                partnersSubheader.textContent = Locale.compose("LOC_UI_CITY_TRADE_PARTNERS_SUBHEADER");
                tradePartnersContainer.appendChild(partnersSubheader);
                // Routes (1 per partner city)
                let bHasActiveTrade = false;
                const routes = city.Trade.routes;
                if (routes.length > 0) {
                    for (let route of routes) {
                        // Resources from this route? Include partner city and list resource yields
                        const myRoutePayload = TradeRoute.getCityPayload(route, city.id);
                        if (myRoutePayload && myRoutePayload.resourceValues.length > 0) {
                            bHasActiveTrade = true;
                            // Partner city name
                            let partnerCity = TradeRoute.getOppositeCity(route, city.id);
                            if (partnerCity) {
                                let partnerName = document.createElement('div');
                                partnerName.classList.add('resource-name');
                                partnerName.textContent = Locale.compose(partnerCity.name);
                                tradePartnersContainer.appendChild(partnerName);
                            }
                            // Route resources
                            for (let resourceValue of myRoutePayload.resourceValues) {
                                let resourceElem = this.buildResourceElement(resourceValue);
                                tradePartnersContainer.appendChild(resourceElem);
                            }
                        }
                    }
                }
                // If no active routes, or the routes are all empty, show a help tip
                if (!bHasActiveTrade) {
                    let noPartners = document.createElement('div');
                    noPartners.textContent = Locale.compose("LOC_UI_CITY_TRADE_NO_PARTNERS");
                    tradePartnersContainer.appendChild(noPartners);
                }
                mainContainer.appendChild(tradePartnersContainer);
            }
        }
    }
    //--------------------
    buildResourceElement(resource) {
        let resourceContainer = document.createElement('div');
        resourceContainer.classList.add('resource');
        let resourceNameElem = document.createElement('div');
        resourceNameElem.classList.add('resource-name');
        resourceNameElem.textContent = resource.value + " " + Game.Resources.getUniqueResourceName(resource.uniqueResource);
        resourceContainer.appendChild(resourceNameElem);
        // Add full yield value from data
        // TODO: add exposures to get local/imported resource yield values to account for modifiers
        // - Could require additional game values + exposures [dmcdonough 1/24/2022]
        GameInfo.Resource_YieldChanges.forEach(v => {
            const resourceHash = Database.makeHash(v.ResourceType);
            if (resourceHash == resource.uniqueResource.resource) {
                let yieldInfo = GameInfo.Yields.lookup(v.YieldType);
                if (yieldInfo) {
                    let yieldElem = document.createElement('div');
                    yieldElem.classList.add('resource-yield');
                    yieldElem.textContent = (v.YieldChange * resource.value).toFixed(1) + " " + Locale.compose(yieldInfo.Name);
                    resourceContainer.appendChild(yieldElem);
                }
            }
        });
        return resourceContainer;
    }
    onClose() {
        ContextManager.popIncluding(this.Root.tagName);
    }
}
Controls.define('screen-city-trade', {
    createInstance: ScreenCityTrade,
    description: 'View City resources and trade routes',
    classNames: ['screen-city-trade'],
    styles: ['fs://game/base-standard/ui/city-trade/screen-city-trade.css'],
    content: ['fs://game/base-standard/ui/city-trade/screen-city-trade.html']
});

//# sourceMappingURL=file:///base-standard/ui/city-trade/screen-city-trade.js.map

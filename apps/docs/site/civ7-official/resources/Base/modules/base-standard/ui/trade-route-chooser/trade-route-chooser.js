/**
 * @file trade-route-chooser.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Select and get info on trade trade routes
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import CityBannerManager from '/base-standard/ui/city-banners/city-banner-manager.js';
import { TradeRoutesModel } from '/base-standard/ui/trade-route-chooser/trade-routes-model.js';
import WorldInput from '/base-standard/ui/world-input/world-input.js';
class TradeRouteChooser extends Panel {
    static get activeChooser() {
        return this._activeChooser;
    }
    constructor(root) {
        super(root);
        this.isModern = Game.age == Database.makeHash("AGE_MODERN");
        this.frame = document.createElement("fxs-subsystem-frame");
        this.sortOrder = document.createElement("fxs-selector");
        this.routesListEl = document.createElement("fxs-vslot");
        this.selectedUnitID = UI.Player.getHeadSelectedUnit();
        this.confirmButton = document.createElement("fxs-hero-button");
        this.sortMode = "LOC_TRADE_LENS_SORT_DEFAULT";
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.activeDeviceTypeListener = this.updateInputDeviceType.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.interfaceModeListener = this.onInterfaceModeChange.bind(this);
        this.subsystemFrameCloseListener = () => this.close();
        this.tradeRoutes = TradeRoutesModel
            .getProjectedTradeRoutes()
            .map(route => ({ route: route, element: this.createTradeRouteChooserItem(route) }));
        const fragment = document.createDocumentFragment();
        fragment.appendChild(this.frame);
        const title = document.createElement("fxs-header");
        title.setAttribute("data-slot", "header");
        title.setAttribute("title", this.isModern ? "LOC_TRADE_LENS_TITLE_ALT" : "LOC_TRADE_LENS_TITLE");
        title.classList.add("px-18");
        this.frame.appendChild(title);
        const description = document.createElement("div");
        description.classList.add("text-center", "mx-5", "font-body-sm");
        description.setAttribute("data-slot", "header");
        description.innerHTML = this.isModern ? Locale.compose("LOC_TRADE_LENS_DESCRIPTION_ALT") : Locale.compose("LOC_TRADE_LENS_DESCRIPTION");
        this.frame.appendChild(description);
        const sortOptions = [{ label: "LOC_TRADE_LENS_SORT_DEFAULT" }, { label: "LOC_TRADE_LENS_SORT_BY_LEADER" }];
        this.sortOrder.classList.add("m-4", "font-body-lg");
        this.sortOrder.setAttribute("enable-shell-nav", "true");
        this.sortOrder.setAttribute("data-slot", "header");
        this.sortOrder.setAttribute("selected-item-index", "0");
        this.sortOrder.componentCreatedEvent.on((component) => component.updateSelectorItems(sortOptions));
        this.sortOrder.addEventListener("dropdown-selection-change", (ev) => {
            this.sortMode = ev.detail.selectedItem?.label ?? "LOC_TRADE_LENS_SORT_DEFAULT";
            this.applySort();
        });
        this.sortOrder.addEventListener("focus", () => {
            this.selectedEl = null;
            NavTray.removeGenericSelect();
        });
        this.sortOrder.setAttribute("data-audio-focus-ref", "none");
        this.frame.appendChild(this.sortOrder);
        this.routesListEl.setAttribute("disable-focus-allowed", "true");
        this.routesListEl.classList.add("mx-3");
        this.frame.appendChild(this.routesListEl);
        this.confirmButton.classList.add("mx-7", "my-5");
        this.confirmButton.setAttribute("data-slot", "footer");
        this.confirmButton.setAttribute("disabled", "true");
        this.updateConfirmButton();
        this.confirmButton.addEventListener("action-activate", () => this.checkAndStartTradeRoute());
        this.frame.appendChild(this.confirmButton);
        this.updateInputDeviceType();
        this.Root.appendChild(fragment);
    }
    updateConfirmButton() {
        const isTradeRouteValid = this.selectedRoute?.status == TradeRouteStatus.SUCCESS;
        const unit = this.getValidUnitSelection(this.selectedUnitID);
        const targetLocation = this.selectedRoute?.city.location;
        let canStartTradeRoute = false;
        if (unit && targetLocation) {
            this.initializeNavTrayCancelAction();
            const actionParams = { X: targetLocation.x, Y: targetLocation.y };
            canStartTradeRoute = Game.UnitCommands.canStart(unit.id, UnitCommandTypes.MAKE_TRADE_ROUTE, actionParams, false).Success;
        }
        // Show "Confirm" text if we are in modern age or the selected merchant is in range to begin the trade route
        const caption = this.isModern || canStartTradeRoute ? "LOC_TRADE_LENS_CONFIRM_ROUTE" : "LOC_TRADE_LENS_SEND_MERCHANT";
        this.confirmButton.setAttribute("caption", caption);
        const disabled = !unit || !isTradeRouteValid;
        this.confirmButton.setAttribute("disabled", disabled.toString());
        if (unit) {
            if (!this.selectedRoute) {
                this.confirmButton.setAttribute("data-tooltip-content", "LOC_TRADE_LENS_NO_TRADE_ROUTE_SELECTED");
            }
            else {
                this.confirmButton.setAttribute("data-tooltip-content", this.isModern || canStartTradeRoute ? "LOC_TRADE_LENS_CONFIRM_ROUTE_TOOLTIP" : "LOC_TRADE_LENS_SEND_MERCHANT_TOOLTIP");
            }
        }
        else {
            this.confirmButton.setAttribute("data-tooltip-content", "LOC_TRADE_LENS_NO_MERCHANT_SELECTED_TOOLTIP");
        }
    }
    onInitialize() {
        this.applySort();
    }
    onAttach() {
        super.onAttach();
        engine.on('UnitSelectionChanged', this.onUnitSelectionChanged, this);
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        window.addEventListener('interface-mode-changed', this.interfaceModeListener);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.frame.addEventListener('subsystem-frame-close', this.subsystemFrameCloseListener);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        TradeRouteChooser._activeChooser = this;
    }
    onDetach() {
        super.onDetach();
        TradeRouteChooser._activeChooser = undefined;
        TradeRoutesModel.clearTradeRouteVfx();
        this.tradeRouteBanner?.remove();
        engine.off('UnitSelectionChanged', this.onUnitSelectionChanged, this);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        this.frame.removeEventListener('subsystem-frame-close', this.subsystemFrameCloseListener);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        window.removeEventListener('interface-mode-changed', this.interfaceModeListener);
    }
    onUnitSelectionChanged({ selected, unit }) {
        this.handleUnitSelectionChanged(selected ? unit : null);
    }
    handleUnitSelectionChanged(unitID) {
        if (this.getValidUnitSelection(unitID)) {
            this.initializeNavTrayCancelAction();
            this.selectedUnitID = unitID;
        }
        this.updateConfirmButton();
    }
    getValidUnitSelection(unitID) {
        if (!unitID) {
            return null;
        }
        const unit = Units.get(unitID);
        if (!unit) {
            return null;
        }
        const unitDefinition = GameInfo.Units.lookup(unit.type);
        if (!unitDefinition?.MakeTradeRoute) {
            return null;
        }
        return unit;
    }
    initializeNavTrayCancelAction() {
        NavTray.clear();
        const selctedUnit = UI.Player.getHeadSelectedUnit();
        if (selctedUnit && this.isModern) {
            NavTray.addOrUpdateGenericCancel();
        }
        else {
            NavTray.addOrUpdateGenericBack();
        }
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.routesListEl, this.Root);
        // This is a really, really gross way to prevent the unit actions from stealing focus
        waitForLayout(() => {
            waitForLayout(() => {
                Focus.setContextAwareFocus(this.routesListEl, this.Root);
            });
        });
    }
    onLoseFocus() {
        super.onLoseFocus();
        NavTray.clear();
    }
    close(uiViewChangeMethod) {
        super.close(uiViewChangeMethod);
        if (LensManager.getActiveLens() != 'fxs-default-lens') {
            LensManager.setActiveLens("fxs-default-lens");
        }
    }
    // close panel if unit move action is selected
    onInterfaceModeChange(event) {
        if (event.detail.newMode === "INTERFACEMODE_MOVE_TO") {
            this.close();
        }
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'cancel' || inputEvent.detail.name == 'sys-menu') {
            NavTray.clear();
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
            return;
        }
        // close and release focus on right click events
        if (inputEvent.detail.name == 'mousebutton-right') {
            NavTray.clear();
            this.close();
        }
    }
    onNavigateInput(event) {
        if (event.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        const direction = event.getDirection();
        if (direction == InputNavigationAction.SHELL_PREVIOUS) {
            this.sortOrder.component.selectPrevious();
            event.stopPropagation();
        }
        else if (direction == InputNavigationAction.SHELL_NEXT) {
            this.sortOrder.component.selectNext();
            event.stopPropagation();
        }
    }
    updateInputDeviceType() {
        if (this.confirmButton) {
            this.confirmButton.classList.toggle("hidden", ActionHandler.isGamepadActive);
        }
    }
    defaultSort(a, b) {
        return (Number(b.route.status == TradeRouteStatus.SUCCESS) - Number(a.route.status == TradeRouteStatus.SUCCESS))
            || (b.route.importPayloads.length) - (a.route.importPayloads.length);
    }
    leaderSort(a, b) {
        return (Number(b.route.status == TradeRouteStatus.SUCCESS) - Number(a.route.status == TradeRouteStatus.SUCCESS))
            || b.route.leaderName.localeCompare(a.route.leaderName);
    }
    applySort() {
        if (this.sortMode == "LOC_TRADE_LENS_SORT_DEFAULT") {
            this.tradeRoutes.sort(this.defaultSort);
        }
        else if (this.sortMode == "LOC_TRADE_LENS_SORT_BY_LEADER") {
            this.tradeRoutes.sort(this.leaderSort);
        }
        this.routesListEl.innerHTML = "";
        for (const route of this.tradeRoutes) {
            if (route.element) {
                this.routesListEl.appendChild(route.element);
            }
        }
    }
    createTradeRouteChooserItem(tradeRoute) {
        const isInvalidRoute = tradeRoute.status != TradeRouteStatus.SUCCESS;
        const routeEle = document.createElement("fxs-chooser-item");
        routeEle.setAttribute("content-direction", "flex-col");
        routeEle.setAttribute("selectable-when-disabled", "true");
        routeEle.setAttribute("select-on-focus", "true");
        routeEle.setAttribute("select-on-activate", "true");
        routeEle.setAttribute("show-frame-on-hover", "false");
        routeEle.setAttribute("data-tooltip-style", "trade-route");
        routeEle.setAttribute('data-tooltip-anchor', "right");
        routeEle.setAttribute('data-tooltip-anchor-offset', "10");
        routeEle.setAttribute("data-trade-route-index", tradeRoute.index.toString());
        routeEle.setAttribute("data-audio-group-ref", "audio-trade-route-chooser");
        routeEle.setAttribute("disabled", isInvalidRoute.toString());
        routeEle.classList.add("my-1\\.5", "flex", "flex-col", "flex-auto");
        const topInfo = document.createElement("div");
        topInfo.classList.add("flex", "flex-row", "mx-4", "mt-4");
        routeEle.appendChild(topInfo);
        const leftInfo = document.createElement("div");
        leftInfo.classList.add("flex", "flex-col", "flex-auto");
        topInfo.appendChild(leftInfo);
        const cityName = document.createElement("fxs-header");
        cityName.classList.add("text-base");
        cityName.setAttribute("title", tradeRoute.city.name);
        cityName.setAttribute("filigree-style", "none");
        leftInfo.appendChild(cityName);
        const tradeAction = document.createElement("div");
        tradeAction.classList.add("font-body-sm", "mr-2");
        tradeAction.innerHTML = Locale.stylize(tradeRoute.statusText);
        leftInfo.appendChild(tradeAction);
        const rightInfo = document.createElement("div");
        rightInfo.classList.add("flex", "flex-row");
        topInfo.appendChild(rightInfo);
        const routeIcon = document.createElement("fxs-icon");
        routeIcon.classList.add("size-8");
        routeIcon.setAttribute("data-icon-id", tradeRoute.statusIcon);
        routeIcon.setAttribute("data-icon-context", "TRADE");
        rightInfo.appendChild(routeIcon);
        const leaderBg = document.createElement("div");
        leaderBg.classList.add("trade-route-chooser-leader-bg", "size-8", "relative");
        rightInfo.appendChild(leaderBg);
        const playerColor = UI.Color.getPlayerColors(tradeRoute.city.owner)?.primaryColor ?? { r: 0, g: 0, b: 0, a: 1 };
        const playerColorCss = `rgb(${playerColor.r} ${playerColor.g} ${playerColor.b})`;
        const leaderColor = document.createElement("div");
        leaderColor.classList.add("trade-route-chooser-leader-color", "size-8");
        leaderColor.style.filter = `fxs-color-tint(${playerColorCss})`;
        leaderBg.appendChild(leaderColor);
        const leaderIcon = document.createElement("fxs-icon");
        leaderIcon.classList.add("size-8", "absolute", "inset-0");
        leaderIcon.setAttribute("data-icon-id", tradeRoute.leaderIcon);
        leaderIcon.setAttribute("data-icon-context", "CIRCLE_MASK");
        leaderBg.appendChild(leaderIcon);
        const payloadInfo = document.createElement("div");
        payloadInfo.classList.add("flex", "flex-row", "mx-4", "mb-2");
        routeEle.appendChild(payloadInfo);
        for (const payload of tradeRoute.importPayloads) {
            const payloadIcon = document.createElement("fxs-icon");
            payloadIcon.classList.add("size-10", "relative");
            payloadIcon.setAttribute("data-icon-id", payload.ResourceType);
            payloadIcon.setAttribute("data-icon-context", "RESOURCE");
            payloadInfo.appendChild(payloadIcon);
            const payloadType = document.createElement("fxs-icon");
            payloadType.classList.add("size-4", "absolute", "left-0", "bottom-0");
            payloadType.setAttribute("data-icon-id", payload.ResourceClassType);
            payloadType.setAttribute("data-icon-context", "RESOURCECLASS");
            payloadIcon.appendChild(payloadType);
        }
        routeEle.addEventListener("chooser-item-selected", (event) => {
            this.handleTradeRouteSelected(routeEle, tradeRoute);
            event.stopPropagation();
        });
        routeEle.addEventListener("action-activate", () => {
            this.checkAndStartTradeRoute();
        });
        return routeEle;
    }
    handleTradeRouteSelected(routeEle, tradeRoute) {
        UI.sendAudioEvent(Audio.getSoundTag('data-audio-trade-route-activate', 'audio-trade-route-chooser'));
        Camera.lookAtPlot(tradeRoute.cityPlotIndex);
        if (this.selectedEl) {
            if (this.selectedEl == routeEle) {
                // Return because we have already selected this route.
                return;
            }
            this.selectedEl.component.selected = false;
        }
        this.selectedEl = routeEle;
        this.selectedRoute = tradeRoute;
        this.updateConfirmButton();
        const isValidRoute = tradeRoute.status == TradeRouteStatus.SUCCESS;
        if (isValidRoute) {
            NavTray.addOrUpdateGenericSelect();
            this.showTradeRoutePathAndBanner();
        }
    }
    tryIssueMoveCommand(city) {
        const unit = this.getValidUnitSelection(this.selectedUnitID);
        if (!unit) {
            console.error("TradeRouteChooser: No valid unit selected to create a trade route with");
            return false;
        }
        this.initializeNavTrayCancelAction();
        const targetCityPlots = city.getPurchasedPlots();
        // Cache to avoid calculating distance repeatedly
        const distanceCache = new Map();
        const locationCache = new Map();
        // Sort the plots by distance
        targetCityPlots.sort((a, b) => {
            let distA = distanceCache.get(a);
            let distB = distanceCache.get(b);
            if (distA === undefined) {
                let locationA = locationCache.get(a);
                if (!locationA) {
                    locationA = GameplayMap.getLocationFromIndex(a);
                    locationCache.set(a, locationA);
                }
                distA = GameplayMap.getPlotDistance(unit.location.x, unit.location.y, locationA.x, locationA.y);
                distanceCache.set(a, distA);
            }
            if (distB === undefined) {
                let locationB = locationCache.get(b);
                if (!locationB) {
                    locationB = GameplayMap.getLocationFromIndex(b);
                    locationCache.set(b, locationB);
                }
                distB = GameplayMap.getPlotDistance(unit.location.x, unit.location.y, locationB.x, locationB.y);
                distanceCache.set(b, distB);
            }
            return distA - distB;
        });
        // Use the first plot in the sorted list
        for (const plotIndex of targetCityPlots) {
            const location = locationCache.get(plotIndex) ?? GameplayMap.getLocationFromIndex(plotIndex);
            const pathTo = Units.getPathTo(unit.id, location);
            if (pathTo.plots.length === 0) {
                continue;
            }
            const success = WorldInput.requestMoveOperation(unit.id, { X: location.x, Y: location.y });
            if (success) {
                return true;
            }
        }
        return false;
    }
    showTradeRoutePathAndBanner() {
        TradeRoutesModel.clearTradeRouteVfx();
        this.tradeRouteBanner?.remove();
        if (this.selectedRoute) {
            TradeRoutesModel.showTradeRouteVfx(this.selectedRoute.pathPlots);
            this.tradeRouteBanner = document.createElement("trade-route-banner");
            this.tradeRouteBanner.componentCreatedEvent.on((banner) => banner.routeInfo = this.selectedRoute);
            CityBannerManager.instance.Root.appendChild(this.tradeRouteBanner);
        }
    }
    checkAndStartTradeRoute(checkOnly = false) {
        if (!this.selectedRoute) {
            console.log(`TradeRouteChooser: No route to create a trade with`);
            return false;
        }
        const selectedUnitID = UI.Player.getHeadSelectedUnit();
        if (!selectedUnitID) {
            console.log("TradeRouteChooser: No merchant selected to create a trade route with");
            return false;
        }
        const targetLocation = this.selectedRoute.city.location;
        const actionParams = { X: targetLocation.x, Y: targetLocation.y };
        if (checkOnly) {
            return !this.isModern || Game.UnitCommands.canStart(selectedUnitID, UnitCommandTypes.MAKE_TRADE_ROUTE, actionParams, false).Success;
        }
        else {
            let commandValid = Game.UnitCommands.canStart(selectedUnitID, UnitCommandTypes.MAKE_TRADE_ROUTE, actionParams, false).Success;
            if (commandValid) {
                Game.UnitCommands.sendRequest(selectedUnitID, UnitCommandTypes.MAKE_TRADE_ROUTE, actionParams);
            }
            else {
                commandValid = this.tryIssueMoveCommand(this.selectedRoute.city);
            }
            InterfaceMode.switchToDefault();
            this.close();
            return commandValid;
        }
    }
}
Controls.define('trade-route-chooser', {
    createInstance: TradeRouteChooser,
    description: 'Select and get info on trade routes.',
    classNames: ['trade-route-chooser'],
    styles: ['fs://game/base-standard/ui/trade-route-chooser/trade-route-chooser.css'],
    tabIndex: -1
});

//# sourceMappingURL=file:///base-standard/ui/trade-route-chooser/trade-route-chooser.js.map

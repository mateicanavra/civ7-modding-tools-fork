/**
 * @file trade-route-tooltip.ts
 * @copyright 2024, Firaxis Games
 * @description Shows trade route tooltip information.
 */
import { TradeRoutesModel } from "/base-standard/ui/trade-route-chooser/trade-routes-model.js";
import TooltipManager from "/core/ui/tooltips/tooltip-manager.js";
import { RecursiveGetAttribute } from "/core/ui/utilities/utilities-dom.js";
export class TradeRouteTooltip {
    constructor() {
        this.tooltip = document.createElement("fxs-tooltip");
        this.tooltipContents = document.createElement("div");
        this.tradeRouteIndex = "";
        this.tooltip.classList.add("flex", "flex-col", "p-3");
        this.tooltip.appendChild(this.tooltipContents);
    }
    getHTML() {
        return this.tooltip;
    }
    reset() {
        this.tooltipContents.innerHTML = "";
    }
    isUpdateNeeded(target) {
        const newIndex = RecursiveGetAttribute(target, "data-trade-route-index") ?? "";
        const updateRequired = newIndex != this.tradeRouteIndex;
        this.tradeRouteIndex = newIndex;
        return updateRequired;
    }
    update() {
        const tradeRoute = TradeRoutesModel.getTradeRoute(Number.parseInt(this.tradeRouteIndex));
        if (tradeRoute) {
            const isValid = tradeRoute.status == TradeRouteStatus.SUCCESS;
            const fragment = document.createDocumentFragment();
            const cityName = document.createElement("fxs-header");
            cityName.classList.add("text-base");
            cityName.setAttribute("title", tradeRoute.city.name);
            cityName.setAttribute("filigree-style", "none");
            fragment.appendChild(cityName);
            const routeType = document.createElement("div");
            routeType.classList.add("flex", "flex-row", "items-center", "justify-center", "mt-2");
            fragment.appendChild(routeType);
            const routeIcon = document.createElement("fxs-icon");
            routeIcon.classList.add("size-8");
            routeIcon.setAttribute("data-icon-id", tradeRoute.statusIcon);
            routeIcon.setAttribute("data-icon-context", "TRADE");
            routeType.appendChild(routeIcon);
            const routeTypeText = document.createElement("div");
            routeTypeText.innerHTML = Locale.stylize(tradeRoute.statusTooltip);
            routeTypeText.classList.add("font-body-sm", "ml-2");
            routeTypeText.classList.toggle("text-negative", !isValid);
            routeType.appendChild(routeTypeText);
            if (tradeRoute.statusTooltipReason) {
                const routeTypeReason = document.createElement("div");
                routeTypeReason.innerHTML = Locale.stylize(tradeRoute.statusTooltipReason);
                routeTypeReason.classList.add("font-body-sm", "ml-2");
                routeTypeReason.classList.toggle("text-negative", !isValid);
                routeType.appendChild(routeTypeReason);
            }
            if (isValid) {
                const yieldInfo = document.createElement("div");
                yieldInfo.classList.add("font-body-sm", "mt-2");
                yieldInfo.innerHTML = Locale.stylize(tradeRoute.exportYieldsString);
                fragment.appendChild(yieldInfo);
            }
            this.tooltipContents.appendChild(fragment);
        }
    }
    isBlank() {
        return false;
    }
}
TooltipManager.registerType('trade-route', new TradeRouteTooltip());

//# sourceMappingURL=file:///base-standard/ui/trade-route-chooser/trade-route-tooltip.js.map

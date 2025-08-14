/**
 * @file peace-deal-tooltip
 * @copyright 2024, Firaxis Games
 * @description Custom tooltip for Peace Deal settlements.
 */
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { databindRetrieveComponentID } from '/core/ui/utilities/utilities-databinding.js';
import CityYields from '/base-standard/ui/utilities/utilities-city-yields.js';
class PeaceDealTooltipType {
    constructor() {
        this.hoveredNodeID = null;
        this.hoveredElement = document.createElement("div");
        this.occupied = null;
        this.container = document.createElement('fxs-tooltip');
        this.headerContainer = document.createElement("div");
        this.settlementName = document.createElement("div");
        this.settlementNameWrapper = document.createElement("div");
        this.settlementIcon = document.createElement("div");
        this.occupiedWrapper = document.createElement("div");
        this.occupiedIcon = document.createElement("div");
        this.occupiedText = document.createElement("div");
        this.populationWrapper = document.createElement("div");
        this.populationValueWrapper = document.createElement("div");
        this.yieldsTitleWrapper = document.createElement("div");
        this.mainYieldWrapper = document.createElement("div");
        this.resourcesTitleWrapper = document.createElement("div");
        this.resourcesWrapper = document.createElement("div");
        this.wondersTitleWrapper = document.createElement("div");
        this.wondersWrapper = document.createElement("div");
        this.headerContainer.classList.add("peace-deal-tooltip__header-container", "justify-center", "items-center", "flex", "flex-row");
        this.settlementNameWrapper.classList.add("flex", "flex-row", "justify-center", "items-center");
        this.settlementIcon.classList.add("size-8", "bg-contain");
        this.settlementName.classList.add("fxs-header", "text-secondary", "justify-center", "text-center", "align-center", "text-lg");
        this.settlementNameWrapper.appendChild(this.settlementIcon);
        this.settlementNameWrapper.appendChild(this.settlementName);
        this.headerContainer.appendChild(this.settlementNameWrapper);
        this.container.appendChild(this.headerContainer);
        this.occupiedWrapper.classList.add("justify-center", "items-center", "mt-4", "flex", "flex-row", "hidden");
        this.occupiedIcon.classList.add("size-8", "bg-contain", "justify-center");
        this.occupiedIcon.style.backgroundImage = `url(fs://game/dip_icon_conquered.png)`;
        this.occupiedWrapper.appendChild(this.occupiedIcon);
        this.occupiedText.classList.add("font-body", "text-negative", "text-sm", "justify-center", "items-center", "ml-2");
        this.occupiedText.setAttribute("data-l10n-id", "LOC_DIPLOMACY_PEACE_DEAL_CITY_OCCUPIED");
        this.occupiedWrapper.appendChild(this.occupiedText);
        this.container.appendChild(this.occupiedWrapper);
        this.populationWrapper.classList.add("justify-center", "mt-3");
        this.populationValueWrapper.classList.add("text-center", "justify-center", "text-center", "align-center", "font-body", "text-sm");
        this.populationWrapper.appendChild(this.populationValueWrapper);
        this.container.appendChild(this.populationWrapper);
        this.yieldsTitleWrapper.classList.add("font-title", "text-sm", "uppercase", "mt-4", "justify-center", "text-center", "align-center");
        this.yieldsTitleWrapper.setAttribute("data-l10n-id", "LOC_DIPLOMACY_OPTIONS_YIELDS");
        this.container.appendChild(this.yieldsTitleWrapper);
        this.mainYieldWrapper.classList.add("hidden", "flex", "fex-row");
        this.container.appendChild(this.mainYieldWrapper);
        this.resourcesTitleWrapper.classList.add("font-title", "text-sm", "uppercase", "mt-4", "justify-center", "text-center", "align-center", "hidden");
        this.resourcesTitleWrapper.setAttribute("data-l10n-id", "LOC_UI_RESOURCE_ALLOCATION_TITLE");
        this.resourcesWrapper.classList.add("justify-center", "flex", "flex-row");
        this.container.appendChild(this.resourcesTitleWrapper);
        this.container.appendChild(this.resourcesWrapper);
        this.wondersTitleWrapper.classList.add("font-title", "text-sm", "uppercase", "mt-4", "justify-center", "text-center", "align-center", "hidden");
        this.wondersTitleWrapper.setAttribute("data-l10n-id", "LOC_UI_CITY_DETAILS_WONDERS");
        this.container.appendChild(this.wondersTitleWrapper);
        this.container.appendChild(this.wondersWrapper);
        this.wondersWrapper.classList.add("justify-center", "flex", "flex-row");
    }
    getHTML() {
        return this.container;
    }
    reset() {
    }
    isUpdateNeeded(target) {
        const nodeIDString = target.getAttribute("node-id");
        if (target.parentElement) {
            this.occupied = target?.getAttribute("occupied");
        }
        this.hoveredElement = target;
        if (!nodeIDString) {
            this.hoveredNodeID = null;
            if (!this.container) {
                return true;
            }
            return false;
        }
        if (nodeIDString != this.hoveredNodeID || (nodeIDString == this.hoveredNodeID && !this.container)) {
            this.hoveredNodeID = nodeIDString;
            return true;
        }
        return false;
    }
    update() {
        if (!this.hoveredNodeID) {
            console.error("peace-deal-tooltip: Attempting to update Peace Deal info tooltip, but unable to get selected node");
            return;
        }
        const myCityID = databindRetrieveComponentID(this.hoveredElement);
        const myCity = Cities.get(myCityID);
        if (myCity) {
            this.settlementName.setAttribute("data-l10n-id", myCity.name);
            if (myCity.isTown) {
                this.settlementIcon.style.backgroundImage = `url(blp:Yield_Towns)`;
            }
            else {
                this.settlementIcon.style.backgroundImage = `url(blp:Yield_Cities)`;
            }
            this.occupiedWrapper.classList.add("hidden");
            if (this.occupied == "true") {
                this.occupiedWrapper.classList.remove("hidden");
            }
            this.populationValueWrapper.innerHTML = Locale.compose("LOC_UI_CITY_STATUS_POPULATION_TITLE") + ": " + myCity.population;
            const cityYields = CityYields.getCityYieldDetails(myCity.id);
            this.mainYieldWrapper.classList.add("hidden");
            this.mainYieldWrapper.innerHTML = "";
            if (cityYields != null) {
                this.mainYieldWrapper.classList.remove("hidden");
                for (const yieldEntry of cityYields) {
                    if (!yieldEntry.type) {
                        continue;
                    }
                    const yieldWrapper = document.createElement("div");
                    const yieldIconWrapper = document.createElement("div");
                    const yieldIcon = document.createElement("fxs-icon");
                    const yieldText = document.createElement("div");
                    yieldWrapper.classList.add("flex", "flex-col");
                    yieldIconWrapper.classList.add("flex", "flex-col", "mx-2");
                    yieldIcon.classList.add("size-8");
                    yieldIconWrapper.appendChild(yieldIcon);
                    yieldWrapper.appendChild(yieldIconWrapper);
                    yieldText.classList.add("self-center");
                    yieldWrapper.appendChild(yieldText);
                    this.mainYieldWrapper.appendChild(yieldWrapper);
                    yieldIcon.setAttribute("data-icon-id", yieldEntry.type);
                    yieldText.innerHTML = Locale.compose("LOC_UI_YIELD_ONE_DECIMAL_NO_PLUS", yieldEntry.valueNum);
                }
            }
            const city = Cities.get(myCityID);
            const theResources = city?.Resources;
            if (!theResources) {
                console.error(`peace-deal-tooltips: Failed to get city.Yields for ID ${myCityID}`);
                return;
            }
            const cityResources = theResources.getAssignedResources();
            this.resourcesWrapper.innerHTML = "";
            this.resourcesTitleWrapper.classList.add("hidden");
            if (cityResources.length > 0) {
                this.resourcesTitleWrapper.classList.remove("hidden");
            }
            for (const resourceEntry of cityResources) {
                const resourceItemWrapper = document.createElement("fxs-vslot");
                const resourceIconWrapper = document.createElement("div");
                resourceItemWrapper.appendChild(resourceIconWrapper);
                const resourceDefinition = GameInfo.Resources.lookup(resourceEntry.uniqueResource.resource);
                if (resourceDefinition) {
                    const theResourceIcon = resourceDefinition.ResourceType;
                    const resourceIcon = document.createElement("fxs-icon");
                    resourceIcon.classList.add('resource-icon', 'size-13', 'mr-1', 'relative');
                    resourceIcon.setAttribute('data-icon-context', 'RESOURCE');
                    if (theResourceIcon) {
                        resourceIcon.setAttribute('data-icon-id', theResourceIcon);
                    }
                    resourceIconWrapper.appendChild(resourceIcon);
                    this.resourcesWrapper.appendChild(resourceItemWrapper);
                }
            }
            this.wondersTitleWrapper.classList.add("hidden");
            this.wondersWrapper.innerHTML = "";
            if (myCity.Constructibles?.getNumWonders()) {
                if (myCity.Constructibles?.getNumWonders() > 0) {
                    const constructibles = city.Constructibles;
                    this.wondersTitleWrapper.classList.remove("hidden");
                    if (constructibles) {
                        for (const constructibleID of constructibles.getIds()) {
                            const constructible = Constructibles.getByComponentID(constructibleID);
                            if (!constructible) {
                                return;
                            }
                            const constructibleDefinition = GameInfo.Constructibles.lookup(constructible.type);
                            if (!constructibleDefinition) {
                                return;
                            }
                            const constructibleData = {
                                id: constructibleID,
                                location: constructible.location,
                                type: constructibleDefinition.ConstructibleType,
                                name: constructibleDefinition.Name,
                                damaged: constructible.damaged,
                                icon: constructibleDefinition.ConstructibleType,
                                iconContext: constructibleDefinition.ConstructibleClass
                            };
                            if (constructibleDefinition.ConstructibleClass == "WONDER") {
                                const wonderItem = document.createElement("div");
                                const wonderIconValue = constructibleData.icon;
                                const wonderItemIcon = document.createElement("fxs-icon");
                                wonderItemIcon.classList.add('wonder-icon', 'size-13', 'mr-1', 'relative');
                                wonderItemIcon.setAttribute('data-icon-context', 'WONDER');
                                wonderItemIcon.setAttribute("data-icon-id", wonderIconValue);
                                wonderItem.appendChild(wonderItemIcon);
                                this.wondersWrapper.appendChild(wonderItem);
                            }
                        }
                    }
                }
            }
        }
    }
    isBlank() {
        return false;
    }
}
TooltipManager.registerType('peaceDeal', new PeaceDealTooltipType());

//# sourceMappingURL=file:///base-standard/ui/tooltips/peace-deal-tooltip.js.map

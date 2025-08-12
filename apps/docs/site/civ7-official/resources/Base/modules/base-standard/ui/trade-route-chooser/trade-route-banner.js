/**
 * @file trade-route-banner.ts
 * @copyright 2024, Firaxis Games
 * @description Select and get info on trade trade routes
 */
const TRADE_BANNER_OFFSET = { x: 0, y: 0, z: 42 };
export class TradeRouteBanner extends Component {
    set routeInfo(value) {
        this._routeInfo = value;
    }
    get routeInfo() {
        return this._routeInfo;
    }
    constructor(root) {
        super(root);
        this._worldAnchorHandle = null;
    }
    onAttach() {
        super.onAttach();
        if (this._routeInfo) {
            const location = this._routeInfo.city.location;
            this.makeWorldAnchor(location);
            const fragment = document.createDocumentFragment();
            const inner = document.createElement("div");
            inner.classList.add("trade-route-banner-inner", "flex", "flex-col", "p-3");
            inner.classList.toggle("trade-route-banner-city", !this._routeInfo.city.isTown);
            fragment.appendChild(inner);
            const upperInfo = document.createElement("div");
            upperInfo.classList.add("flex", "flex-row");
            inner.appendChild(upperInfo);
            const routeIcon = document.createElement("fxs-icon");
            routeIcon.classList.add("size-8");
            routeIcon.setAttribute("data-icon-id", this._routeInfo.statusIcon);
            routeIcon.setAttribute("data-icon-context", "TRADE");
            upperInfo.appendChild(routeIcon);
            const payloadInfo = document.createElement("div");
            payloadInfo.classList.add("flex", "flex-row");
            upperInfo.appendChild(payloadInfo);
            for (const payload of this._routeInfo.importPayloads) {
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
            const yieldInfo = document.createElement("div");
            yieldInfo.classList.add("font-body-sm", "mt-2");
            yieldInfo.innerHTML = Locale.stylize(this._routeInfo.exportYieldsString);
            inner.appendChild(yieldInfo);
            this.Root.appendChild(fragment);
        }
    }
    onDetach() {
        super.onDetach();
        this.destroyWorldAnchor();
    }
    makeWorldAnchor(location) {
        this._worldAnchorHandle = WorldAnchors.RegisterFixedWorldAnchor(location, TRADE_BANNER_OFFSET);
        if (this._worldAnchorHandle !== null && this._worldAnchorHandle >= 0) {
            this.Root.setAttribute('data-bind-style-transform2d', `{{FixedWorldAnchors.offsetTransforms[${this._worldAnchorHandle}].value}}`);
            this.Root.setAttribute('data-bind-style-opacity', `{{FixedWorldAnchors.visibleValues[${this._worldAnchorHandle}]}}`);
        }
        else {
            console.error(`Failed to create world anchor for location`, location);
        }
    }
    destroyWorldAnchor() {
        if (!this._worldAnchorHandle) {
            return;
        }
        this.Root.removeAttribute('data-bind-style-transform2d');
        this.Root.removeAttribute('data-bind-style-opacity');
        WorldAnchors.UnregisterFixedWorldAnchor(this._worldAnchorHandle);
        this._worldAnchorHandle = null;
    }
}
Controls.define('trade-route-banner', {
    createInstance: TradeRouteBanner,
    description: 'Shows trade and yield information above a city.',
    classNames: ['trade-route-banner', 'absolute'],
    styles: ['fs://game/base-standard/ui/trade-route-chooser/trade-route-banner.css']
});

//# sourceMappingURL=file:///base-standard/ui/trade-route-chooser/trade-route-banner.js.map

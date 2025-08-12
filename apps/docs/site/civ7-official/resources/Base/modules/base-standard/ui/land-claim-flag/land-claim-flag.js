/**
 * @file Land Claim Flag text object
 * @copyright 2021, Firaxis Games
 * @description Land claim flag text object handling
 */
import { PlotCoord } from '/core/ui/utilities/utilities-plotcoord.js';
class LandClaimFlag extends Component {
    constructor() {
        super(...arguments);
        this._worldAnchor = null;
        this.anchorText = "?LCString?";
        this.fixedWorldAnchorsChangedListener = () => { this.onFixedWorldAnchorsChanged(); };
    }
    onAttach() {
        super.onAttach();
        engine.on('FixedWorldAnchorsChanged', this.fixedWorldAnchorsChangedListener);
        let id = this.Root.getAttribute('data-bind-attributes');
        const location = PlotCoord.fromString(id);
        const textString = this.Root.getAttribute('data-string');
        if (textString) {
            this.anchorText = textString;
        }
        this.setupBannerText();
        this.makeWorldAnchor(location);
        this.updateScreenPosition();
    }
    onAttributeChanged(name, _oldValue, newValue) {
        if (name == "data-string") {
            this.anchorText = newValue;
            this.setupBannerText();
        }
    }
    onDetach() {
        engine.off('FixedWorldAnchorsChanged', this.fixedWorldAnchorsChangedListener);
        this.destroyWorldAnchor();
        super.onDetach();
    }
    makeWorldAnchor(location) {
        if (this._worldAnchor) {
            this._worldAnchor.Destroy();
        }
        this._worldAnchor = WorldAnchors.CreateAtPlot({ x: location.x, y: location.y }, 12.0);
    }
    destroyWorldAnchor() {
        if (this._worldAnchor) {
            this._worldAnchor.Destroy();
        }
        this._worldAnchor = null;
    }
    /**
     * Update position based on the associated world anchor.
     */
    updateScreenPosition() {
        if (!this._worldAnchor) {
            return;
        }
        // Update location, show/hide based if off screen.
        const location = this._worldAnchor.PixelPosition();
        const isOffScreen = (location == null);
        const displayStyle = (isOffScreen ? "none" : "flex");
        this.Root.style.display = displayStyle;
        if (!location) { // Off screen (or no world anchor) bail.
            return;
        }
        // Translate by pixels when translating in relation to a 3D world anchor.
        //const bounds = this.Root.getBoundingClientRect();
        //TODO: half width/height is not giving center?: const bounds: DOMRect = this.Root.getBoundingClientRect();
        const bounds = { width: 330, height: 100 };
        const target_x = location.x - (bounds.width * 0.5);
        const target_y = location.y - bounds.height;
        this.Root.style.setTranslate2D(target_x, target_y);
    }
    /**
     * Engine callback
     */
    onFixedWorldAnchorsChanged() {
        this.updateScreenPosition();
    }
    setupBannerText() {
        const nameDiv = this.Root.querySelector('.land-claim-flag-container');
        if (nameDiv) {
            nameDiv.textContent = Locale.compose(this.anchorText);
        }
    }
}
Controls.define('land-claim-flag', {
    createInstance: LandClaimFlag,
    description: 'Land Claim Flag text',
    classNames: ['land-claim-flag'],
    styles: ['fs://game/base-standard/ui/land-claim-flag/land-claim-flag.css'],
    content: ['fs://game/base-standard/ui/land-claim-flag/land-claim-flag.html'],
    attributes: [
        {
            name: 'data-string',
            required: true
        }
    ]
});

//# sourceMappingURL=file:///base-standard/ui/land-claim-flag/land-claim-flag.js.map

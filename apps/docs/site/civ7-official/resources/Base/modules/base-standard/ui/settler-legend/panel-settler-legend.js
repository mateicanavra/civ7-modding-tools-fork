/**
 * @file panel-settler-legend.ts
 * @copyright 2025, Firaxis Games
 * @description Legend to provide information for the Settler lens
 */
import { LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
const SETTLEMENT_BLOCKED_COLOR = "rgb(105, 9, 9)";
const SETTLEMENT_OKAY_COLOR = "rgb(180, 158, 40)";
const SETTLEMENT_GOOD_COLOR = "rgb(40, 238, 190)";
class SettlerLegend extends Component {
    constructor(root) {
        super(root);
        this.activeLensChangedListener = this.onActiveLensChanged.bind(this);
        this.render();
    }
    render() {
        const subsystemFrame = document.createElement("fxs-subsystem-frame");
        subsystemFrame.classList.add("settler-lengend-container", "flex-col", "py-2", "pointer-events-auto", "img-tooltip-bg");
        subsystemFrame.setAttribute("box-style", "b4");
        subsystemFrame.setAttribute("no-close", "true");
        this.Root.appendChild(subsystemFrame);
        const header = document.createElement("fxs-header");
        header.classList.add("mb-2", "font-title", "text-base", "text-secondary");
        header.setAttribute('filigree-style', 'h4');
        header.setAttribute("title", "LOC_UI_SETTLER_LEGEND_HEADER");
        subsystemFrame.appendChild(header);
        subsystemFrame.appendChild(this.addRow("LOC_UI_SETTLER_LEGEND_BAD", "settler-legend-hex", SETTLEMENT_BLOCKED_COLOR));
        subsystemFrame.appendChild(this.addRow("LOC_UI_SETTLER_LEGEND_OKAY", "settler-legend-hex", SETTLEMENT_OKAY_COLOR));
        subsystemFrame.appendChild(this.addRow("LOC_UI_SETTLER_LEGEND_GOOD", "settler-legend-hex", SETTLEMENT_GOOD_COLOR));
        subsystemFrame.appendChild(this.addRow("LOC_UI_SETTLER_LEGEND_FLOOD_RISK", "settler-legend-flood"));
        subsystemFrame.appendChild(this.addRow("LOC_UI_SETTLER_LEGEND_ERUPTION_RISK", "settler-legend-volcano"));
        subsystemFrame.appendChild(this.addRow("LOC_UI_SETTLER_LEGEND_RECOMMENDED", "settler-legend-city-recommend"));
    }
    addRow(text, iconClass, color) {
        const container = document.createElement("div");
        container.classList.add("flex", "items-center");
        this.Root.appendChild(container);
        const iconElement = document.createElement("div");
        iconElement.classList.add(iconClass, "size-16", "bg-contain", "bg-no-repeat");
        if (color) {
            iconElement.style.fxsBackgroundImageTint = color;
        }
        container.appendChild(iconElement);
        const textElement = document.createElement("div");
        textElement.classList.add("font-body", "w-72", "text-xs");
        textElement.innerHTML = Locale.stylize(text);
        container.appendChild(textElement);
        return container;
    }
    onAttach() {
        super.onAttach();
        this.Root.listenForWindowEvent(LensActivationEventName, this.activeLensChangedListener);
    }
    onDetach() {
        super.onDetach();
    }
    onActiveLensChanged(event) {
        const areWeVisible = (event.detail.activeLens == 'fxs-settler-lens');
        this.Root.classList.toggle('hidden', !areWeVisible);
    }
}
Controls.define('panel-settler-legend', {
    createInstance: SettlerLegend,
    description: 'Legend for the Settler lens',
    styles: ['fs://game/base-standard/ui/settler-legend/panel-settler-legend.css'],
    classNames: ["hidden", "absolute"]
});

//# sourceMappingURL=file:///base-standard/ui/settler-legend/panel-settler-legend.js.map

/**
 * @file Tooltip Manager
 * @copyright 2020-2024, Firaxis Games
 * @description Handles the tooltips for the world (plots), and 2D UI pieces.
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import Cursor from '/core/ui/input/cursor.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { PlotCursor } from '/core/ui/input/plot-cursor.js';
import { TooltipController } from '/core/ui/tooltips/tooltip-controller.js';
import { SetTransformTranslateScale } from '/core/ui/utilities/utilities-css.js';
import { RecursiveGetAttribute } from '/core/ui/utilities/utilities-dom.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
var Anchor;
(function (Anchor) {
    Anchor[Anchor["None"] = 0] = "None";
    Anchor["Right"] = "right";
    Anchor["Left"] = "left";
    Anchor["Top"] = "top";
    Anchor["Bottom"] = "bottom";
})(Anchor || (Anchor = {}));
const DEFAULT_DELAY = 200; // Default delay for Gamepad and touch tooltip
export var PlotTooltipPriority;
(function (PlotTooltipPriority) {
    PlotTooltipPriority[PlotTooltipPriority["HIGH"] = 0] = "HIGH";
    PlotTooltipPriority[PlotTooltipPriority["LOW"] = 1] = "LOW";
})(PlotTooltipPriority || (PlotTooltipPriority = {}));
const INVALID = -1;
export class HidePlotTooltipEvent extends CustomEvent {
    constructor() {
        super("ui-hide-plot-tooltips", {
            bubbles: false
        });
    }
}
export class ShowPlotTooltipEvent extends CustomEvent {
    constructor() {
        super("ui-show-plot-tooltips", {
            bubbles: false
        });
    }
}
// ---------------------------------------------------------------------------
class TooltipManagerSingleton {
    get tooltip() { return this._tooltip; }
    set tooltip(newTooltip) {
        if (this._tooltip == newTooltip)
            return;
        if (this._tooltip) {
            if (newTooltip && this._tooltip.classList.contains("tooltip--no-anim")) {
                newTooltip.classList.add("tooltip--no-anim");
            }
            this.root.removeChild(this._tooltip);
            this.tooltipResizeObserver.unobserve(this._tooltip);
        }
        if (newTooltip) {
            this.tooltipResizeObserver.observe(newTooltip);
            this.root.appendChild(newTooltip);
        }
        this._tooltip = newTooltip;
    }
    constructor() {
        this.isShownByTimeout = true; // Will the tooltip auto-show based on timeout?
        this.isToggledOn = ActionHandler.deviceType != InputDeviceType.Touch; // Is the tooltip forced into an on position? (via key/button press)
        this.currentIsToggleOn = false; // isToggledOn after onUpdate 
        this.isAnimating = false; // Is the tooltip in the process of animating?
        this.ttTypeName = "none"; // What is the currently showing tooltip type
        this.x = INVALID;
        this.y = INVALID;
        this.root = document.createElement('div'); // Root element for tooltips
        this._tooltip = null;
        this.types = {};
        this.plotTooltipTypes = {};
        this.orderedPlotTooltipTypes = [];
        this.closeOnNextMove = false;
        this.plotTooltipGlobalHidden = false;
        this.plotTooltipTutorialHidden = false; // Needs to be separate from plotTooltipGlobalHidden because the view mode will change many times during tutorial and change that setting
        this.touchPosition = null;
        this.touchTarget = document.body;
        this.tooltipResizeObserver = new ResizeObserver(this.updateTooltipPosition.bind(this));
        // Used by the debug widget to shutdown tooltips temporarilly.
        this.tooltipsDisabled = false;
        this.disabledPlaceholder = null;
        // Used in conjunction with polling to determine if the user is dragging the camera.
        this.cameraWasDragging = false;
        this.globalPlotTooltipHideListener = this.onGlobalPlotTooltipHide.bind(this);
        this.globalPlotTooltipShowListener = this.onGlobalPlotTooltipShow.bind(this);
        this.tooltipAnimationListener = this.onTooltipAnimationFinished.bind(this);
        this.onEngineInput = (name) => {
            // Hide plot tooltips if any keyboard action is taken. We don't want to show a plot tooltip
            // over another hex once the camera moves.
            const keyboardActions = ['keyboard-nav-up', 'keyboard-nav-down', 'keyboard-nav-left', 'keyboard-nav-right'];
            if (this.ttTypeName === 'plot' && keyboardActions.includes(name)) {
                this.hideTooltips();
            }
            if (this.touchPosition && name != 'touch-complete' && name != 'touch-press') {
                this.isToggledOn = false;
                this.reset();
            }
        };
        this.timeShowStart = performance.now();
        this.root = document.createElement('div');
        this.isShownByTimeout = ActionHandler.deviceType == InputDeviceType.Mouse || ActionHandler.deviceType == InputDeviceType.Keyboard;
        engine.whenReady.then(() => { this.onReady(); });
    }
    get currentTooltip() {
        return ((this.tooltipsDisabled
            || this.tooltip == this.disabledPlaceholder
            || this.tooltip?.classList.contains("invisible"))
            ? null
            : this.tooltip);
    }
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!TooltipManagerSingleton.Instance) {
            TooltipManagerSingleton.Instance = new TooltipManagerSingleton();
        }
        return TooltipManagerSingleton.Instance;
    }
    onReady() {
        if (this.tooltip == undefined) {
            this.tooltip = document.createElement('fxs-tooltip');
        }
        this.root.style.pointerEvents = "none";
        this.root.style.position = "absolute";
        this.root.appendChild(this.tooltip);
        const tooltipsDiv = document.getElementById("tooltips");
        if (tooltipsDiv) {
            tooltipsDiv.appendChild(this.root);
        }
        else {
            console.error("Root is missing a div with label `tooltips` to host the tool tip manager!  Making one off of the document; this may have overlap issues when they show.");
            document.body.appendChild(this.root);
        }
        engine.on('InputAction', this.onEngineInput);
        window.addEventListener('camera-drag-mouse-start', () => this.onMouseDragStart()); // Only relevant if using script dragging
        window.addEventListener('camera-drag-mouse-end', () => this.onMouseDragEnd()); // Only relevant if using script dragging
        window.addEventListener(ActiveDeviceTypeChangedEventName, (event) => this.onActiveDeviceTypeChanged(event));
        window.addEventListener('ui-hide-plot-tooltips', this.globalPlotTooltipHideListener);
        window.addEventListener('ui-show-plot-tooltips', this.globalPlotTooltipShowListener);
        this.root.addEventListener('animationend', this.tooltipAnimationListener);
        engine.on('UpdateFrame', this.onUpdate, this);
        // Register debug widget.
        const disablePlotTooltips = {
            id: 'disablePlotTooltips',
            category: 'Systems',
            caption: 'Disable Plot Tooltips',
            domainType: 'bool',
            value: false,
        };
        UI.Debug.registerWidget(disablePlotTooltips);
        engine.on('DebugWidgetUpdated', (id, value) => {
            console.log(`DebugWidgetUpdated! ${id} ${value}`);
            if (id == 'disablePlotTooltips') {
                const toolTipsWereDisabled = this.tooltipsDisabled;
                this.tooltipsDisabled = value;
                // TODO -  This will have change significantly as the tooltip system gets cleaned up.
                if (!toolTipsWereDisabled && value) {
                    if (this.disabledPlaceholder == null) {
                        const el = document.createElement('div');
                        el.setAttribute('data-placeholder', 'tooltip-root');
                        el.style.display = 'none';
                        this.disabledPlaceholder = el;
                    }
                    // It is not enough to simply disable processing of the tooltip.
                    // Try to strip as much as possible from the DOM.
                    if (this.root && this.disabledPlaceholder) {
                        const parent = this.root.parentElement;
                        if (parent) {
                            parent.insertBefore(this.disabledPlaceholder, this.root);
                            parent.removeChild(this.root);
                        }
                    }
                }
                if (toolTipsWereDisabled && !value) {
                    // Reattach the tooltip root.
                    if (this.root && this.disabledPlaceholder) {
                        const parent = this.disabledPlaceholder.parentElement;
                        if (parent) {
                            parent.insertBefore(this.root, this.disabledPlaceholder);
                            parent.removeChild(this.disabledPlaceholder);
                        }
                    }
                }
            }
        });
    }
    ;
    reset() {
        this.ttTypeName = "none";
        this.closeOnNextMove = false;
        this.touchPosition = null;
        this.touchTarget = document.body;
        if (!this.isShownByTimeout) {
            this.hideTooltips();
        }
    }
    handleInput(inputEvent) {
        let live = true;
        switch (inputEvent.detail.name) {
            case 'toggle-tooltip':
                this.onToggleTooltip(inputEvent.detail.status);
                live = false;
                break;
            case 'touch-press':
                this.isToggledOn = true;
                this.touchPosition = { x: inputEvent.detail.x, y: inputEvent.detail.y };
                const target = document.elementFromPoint(this.touchPosition.x, this.touchPosition.y);
                this.touchTarget = target instanceof HTMLElement && !(target instanceof HTMLHtmlElement) ? target : document.body;
                live = false;
                break;
        }
        return live;
    }
    handleNavigation(_navigationEvent) {
        return true;
    }
    onToggleTooltip(status) {
        if (status == InputActionStatuses.FINISH) {
            this.isToggledOn = !this.isToggledOn;
        }
    }
    hideTooltips() {
        this.tooltip?.classList.add('invisible');
        this.isAnimating = false;
        this.tooltip = null;
    }
    fadeIn() {
        this.tooltip?.classList.remove('invisible');
        this.timeShowStart = performance.now();
        this.isAnimating = true;
    }
    onMouseDragStart() {
        this.hideTooltips();
    }
    onMouseDragEnd() {
        this.reset();
    }
    /** Input has switch to gamepad or kbm */
    onActiveDeviceTypeChanged(event) {
        this.isToggledOn = event.detail.deviceType != InputDeviceType.Touch;
        this.reset();
    }
    /**
         * Per-frame check if tooltip needs update.
         */
    onUpdate() {
        // INVESTIGATE - Consider event-driven instead of polling.
        const cameraIsDragging = Camera.isWorldDragging();
        if (cameraIsDragging != this.cameraWasDragging) {
            if (cameraIsDragging) {
                this.onMouseDragStart();
            }
            else {
                this.onMouseDragEnd();
            }
            this.cameraWasDragging = cameraIsDragging;
        }
        // Fade in animation is being done via script instead of CSS due to not 
        // being able to get CSS to properly invalid as animations are added/removed
        // and to support reading in a configurable delay value from settings.
        if (this.isAnimating) {
            const now = performance.now();
            const delta = (now - this.timeShowStart);
            const delay = (this.isShownByTimeout) ? Configuration.getUser().tooltipDelay : DEFAULT_DELAY;
            if (delta < delay) {
                // Delay to showing.
            }
            else {
                // Fade in
                let amount = (delta - delay) * 0.01;
                if (amount >= 1.0) {
                    this.isAnimating = false;
                }
            }
        }
        // If tooltip is shown only by a button press and not currently "on", leave.
        if (this.isToggledOn && !this.tooltipsDisabled && !this.cameraWasDragging) {
            this.cursorTooltipCheck();
        }
        else {
            this.hideTooltips();
        }
        this.currentIsToggleOn = this.isToggledOn;
    }
    getAnchorPos(element) {
        const pos = { x: 0, y: 0 };
        const elementRect = element.getBoundingClientRect();
        const anchor = RecursiveGetAttribute(element, 'data-tooltip-anchor') ?? Anchor.None;
        const anchorOffset = Layout.pixelsToScreenPixels(parseInt(RecursiveGetAttribute(element, 'data-tooltip-anchor-offset') ?? "0"));
        // X Offset
        switch (anchor) {
            case Anchor.Right:
                pos.x = elementRect.right + anchorOffset;
                break;
            case Anchor.Left:
                pos.x = elementRect.left - anchorOffset;
                break;
            default:
                pos.x = elementRect.left + ((elementRect.right - elementRect.left) / 2);
        }
        // Y Offset
        switch (anchor) {
            case Anchor.Top:
                pos.y = elementRect.top - anchorOffset;
                break;
            case Anchor.Bottom:
                pos.y = elementRect.bottom + anchorOffset;
                break;
            default:
                pos.y = elementRect.top + ((elementRect.bottom - elementRect.top) / 2);
        }
        return pos;
    }
    getTooltipTypeName(targetElement) {
        if (targetElement == document.body && PlotCursor.plotCursorCoords) {
            for (const type of this.orderedPlotTooltipTypes) {
                const ttInstance = this.plotTooltipTypes[type].instance;
                if (ttInstance == null || ttInstance == undefined) {
                    console.error("tooltip-manager: unregistered 'type': ", type);
                    continue;
                }
                const isUpdateNeeded = ttInstance.isUpdateNeeded(PlotCursor.plotCursorCoords);
                if (isUpdateNeeded) {
                    ttInstance.reset();
                    ttInstance.update();
                }
                if (!ttInstance.isBlank()) {
                    return type;
                }
            }
            return "none";
        }
        else {
            return RecursiveGetAttribute(targetElement, 'data-tooltip-style') ?? "none";
        }
    }
    /**
     * Performs the checks necessary to set a new tooltip.
     */
    cursorTooltipCheck() {
        let targetElement;
        if (this.touchPosition) {
            targetElement = this.touchTarget;
        }
        else if (ActionHandler.isGamepadActive && !this.closeOnNextMove) // TODO: Rework needing a special path if gamepad vs mouse.  This could be fixed if the FocusManager tracks the currently focused mouse item.
         {
            // Using Gamepad			
            targetElement = FocusManager.getFocus();
        }
        else {
            // Using Mouse
            targetElement = (Cursor.target instanceof HTMLElement) ? Cursor.target : undefined;
            if (!targetElement) {
                targetElement = document.body;
            }
        }
        const alternativeTargetClass = targetElement.getAttribute('data-tooltip-alternative-target');
        if (alternativeTargetClass) {
            targetElement = this.root.querySelector(`.${alternativeTargetClass}`) ?? targetElement;
        }
        const ttTypeName = this.getTooltipTypeName(targetElement);
        const isTypeChanged = (this.ttTypeName != ttTypeName);
        this.ttTypeName = ttTypeName;
        const isPlotType = this.ttTypeName in this.plotTooltipTypes;
        if (isPlotType && (!this.isToggledOn || this.plotTooltipGlobalHidden || this.plotTooltipTutorialHidden)) {
            this.hideTooltips();
            return; //Ignore plot tooltip updates if we are hiding them
        }
        //DEBUG: console.log("tt: ", targetElement.id, targetElement.className);	// Log the current target.
        // Cases
        //	# from > to				type chng	blank chng	none chng	(content chng)		Visible?
        //	1. none > A					Y			-			Y			-				VIS
        //	2. none > A(blank)			Y			Y			Y			-				VIS
        //	3. A > none					Y			-			Y			-				-
        //	4. A(blank) > none			Y			Y			Y			-				-
        //	5. A > A					-			-			-			Y				VIS
        //	6. A(blank) > A(blank)		-			-			-			-				-
        //	7. A > A(blank)				-			Y			-			Y				-
        //	8. A(blank) > A				-			Y			-			Y				VIS
        //	9. A > B					Y			-			-			-				VIS
        //	10. A > B(blank)			Y			Y			-			-				-
        //	11. A(blank) > B			Y			Y			-			-				VIS
        if (ttTypeName == "none") {
            this.hideTooltips();
            return; // Explicitly saying no tooltip; leaving blank will use default but also will show nothing if there are no contents.
        }
        let ttType;
        let isUpdateNeeded;
        if (ttTypeName in this.plotTooltipTypes && targetElement == document.body) {
            ttType = this.plotTooltipTypes[ttTypeName].instance;
            isUpdateNeeded = this.currentIsToggleOn != this.isToggledOn; // plot tooltips are updated during selection
        }
        else {
            ttType = this.types[ttTypeName];
            isUpdateNeeded = this.currentIsToggleOn != this.isToggledOn || targetElement && ttType.isUpdateNeeded(targetElement);
        }
        if (!ttType) {
            // Only warn if in game as it's fine for unknown tooltip types (e.g., "plot") to exist in other states.
            if (UI.isInGame() && ttTypeName != "none") {
                console.warn("Unable to show tooltips on '" + targetElement + "' due to unknown TooltipType: " + ttTypeName);
            }
            if (isTypeChanged) {
                this.hideTooltips();
            }
            return;
        }
        // Get new tooltip position
        const position = ActionHandler.isGamepadActive ? (ttTypeName == "plot" ? Cursor.gamepad : this.getAnchorPos(targetElement)) : (this.touchPosition ?? Cursor.position);
        const isPositionChanged = (position.x != this.x || position.y != this.y);
        // Force tooltip to update if it just came into view
        if (isPositionChanged && position.x > 0 && position.y > 0 && !this.currentTooltip) {
            isUpdateNeeded = true;
        }
        if (isTypeChanged || isUpdateNeeded) {
            // Check if tooltip has become blank, may early out.
            if (ttType.isBlank()) {
                if (!UI.isCursorLocked()) {
                    // only do this if the pointer isn't over any HTML or is over the HTML body
                    if (!(Cursor.target instanceof HTMLElement)) {
                        UI.setCursorByType(UIHTMLCursorTypes.Default);
                    }
                    else if (Cursor.target.tagName == "BODY") {
                        UI.setCursorByType(UIHTMLCursorTypes.Default);
                    }
                }
                this.hideTooltips();
                return;
            }
            ttType.reset();
            ttType.update();
            this.tooltip = ttType.getHTML();
            this.fadeIn();
        }
        // Move tooltip location.
        if (isPositionChanged) {
            this.setLocation(position.x, position.y);
            if (position.x < 0 || position.y < 0) {
                // selected plot is not visible on screen 
                this.hideTooltips();
            }
            else {
                this.updateTooltipPosition();
                this.fadeIn();
            }
        }
        if (this.closeOnNextMove && isPositionChanged) {
            this.hideTooltips();
            this.isToggledOn = false;
            this.closeOnNextMove = false;
        }
    }
    onGlobalPlotTooltipHide() {
        //Hide the current tooltip if it is a plot tooltip
        if (this.ttTypeName == "plot") {
            this.hideTooltips();
        }
        this.plotTooltipGlobalHidden = true;
    }
    onGlobalPlotTooltipShow() {
        this.plotTooltipGlobalHidden = false;
    }
    hidePlotTooltipForTutorial() {
        //Hide the current tooltip if it is a plot tooltip
        if (this.ttTypeName == "plot") {
            this.hideTooltips();
        }
        this.plotTooltipTutorialHidden = true;
    }
    showPlotTooltipForTutorial() {
        this.plotTooltipTutorialHidden = false;
    }
    /**
     * Register a tooltip style type that can accept an html element.
     * @param type Name of the tooltip style type.
     * @param tooltipInstance Instance of type to use when that style if found. (Instance is recycled for each tooltip of that type.)
     */
    registerType(type, tooltipInstance) {
        if ((this.types[type] != null) && (type != "default")) {
            console.warn("Redefining tooltip style '" + type + "', is that the intention?");
        }
        this.types[type] = tooltipInstance;
    }
    /**
     * Register a tooltip style type that can accept a PlotCoord as a target.
     * @param type Name of the tooltip style type.
     * @param tooltipInstance Instance of type to use when that style if found. (Instance is recycled for each tooltip of that type.)
     */
    registerPlotType(type, priority, instance) {
        if ((this.plotTooltipTypes[type] != null) && (type != "default")) {
            console.warn("Redefining tooltip style '" + type + "', is that the intention?");
        }
        this.plotTooltipTypes[type] = {
            instance,
            priority
        };
        this.orderedPlotTooltipTypes = Object.keys(this.plotTooltipTypes)
            .sort((a, b) => this.plotTooltipTypes[a].priority - this.plotTooltipTypes[b].priority);
    }
    setLocation(point_x, point_y) {
        this.x = point_x;
        this.y = point_y;
    }
    updateTooltipPosition() {
        if (!this.tooltip || this.tooltip.offsetWidth === 0 || this.tooltip.offsetHeight === 0) {
            return;
        }
        const right = this.x + this.tooltip.offsetWidth;
        const bottom = this.y + this.tooltip.offsetHeight;
        // Show the appropriate orientation.
        const position = { x: 0, y: 0 };
        // Scale tooltip to fit on screen
        const scale = Math.min(1, window.innerWidth / this.tooltip.offsetWidth, window.innerHeight / this.tooltip.offsetHeight);
        // offset to account for transform origin being at the center of the tooltip
        const xOffset = (1 - scale) * this.tooltip.offsetWidth / 2;
        const yOffset = (1 - scale) * this.tooltip.offsetHeight / 2;
        //flip tooltip if it goes off the right side of the screen,
        //then ensure that the left side of the tooltip is not off the screen
        if (right > window.innerWidth) {
            position.x = Math.max(0, this.x - this.tooltip.offsetWidth) - xOffset;
            this.tooltip.classList.add("right");
        }
        else {
            position.x = this.x + xOffset;
            this.tooltip.classList.remove("right");
        }
        if (bottom > window.innerHeight) {
            position.y = Math.max(0, this.y - this.tooltip.offsetHeight) - yOffset;
            this.tooltip.classList.add("above");
        }
        else {
            position.y = this.y + yOffset;
            this.tooltip.classList.remove("above");
        }
        SetTransformTranslateScale(this.root, position.x, position.y, scale, scale);
    }
    onTooltipAnimationFinished(event) {
        if (!this.tooltip)
            return;
        if (event.animationName.includes("tooltip-reveal")) {
            this.tooltip.classList.add('tooltip--no-anim');
            this.tooltip.style.animationName = "tooltip-fade";
            this.tooltip.style.animationDuration = "1s";
            this.tooltip.style.animationDelay = "0s";
        }
        if (event.animationName == "tooltip-fade") {
            this.tooltip.classList.remove('tooltip--no-anim');
        }
    }
}
export class Tooltip extends Component {
    constructor() {
        super(...arguments);
        this.shortDelayThreshold = 500;
    }
    onInitialize() {
        super.onInitialize();
        const childNodes = this.Root.children;
        const content = document.createElement('div');
        const showBorderAttr = this.Root.getAttribute('data-show-border');
        if (!showBorderAttr || showBorderAttr === 'true') {
            content.classList.add('img-tooltip-border');
        }
        content.classList.add('tooltip__content', 'img-tooltip-bg');
        for (let i = 0; i < childNodes.length; i++) {
            content.appendChild(childNodes[i]);
        }
        this.Root.appendChild(content);
        // Progress Bar
        // If Shift is held down, cancel out the delay and just show tooltips as quickly as possible (1 ms is several times faster than any possible framerate)
        const tooltipDelay = Input.isShiftDown() ? 1 : Configuration.getUser().tooltipDelay;
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('tooltip__progress');
        const progressBar = document.createElement('div');
        progressBar.classList.add('tooltip__progress-bar');
        progressContainer.appendChild(progressBar);
        if (this.Root.classList.contains("tooltip--no-anim")) {
            content.style.animationDelay = `0ms`;
            content.style.animationDuration = `0ms`;
            progressContainer.style.animationDuration = "0s";
            progressContainer.style.animationDelay = `0s`;
            progressContainer.style.animationName = "none";
            progressBar.style.animationDuration = `0ms`;
            progressBar.style.animationDelay = `0s`;
            this.Root.style.animationName = "tooltip-fade";
            this.Root.style.animationDuration = "1s";
            this.Root.style.animationDelay = "0s";
        }
        else {
            content.style.animationDelay = `${tooltipDelay}ms`;
            progressContainer.style.animationDelay = `0.25s, ${tooltipDelay}ms`;
            progressBar.style.animationDuration = `${tooltipDelay}ms`;
        }
        this.Root.appendChild(progressContainer);
        if (tooltipDelay <= this.shortDelayThreshold) {
            progressContainer.style.animationName = "none";
            content.style.animationName = "tooltip-progress-show";
        }
    }
    // Override
    getSoundTags() {
        // Do nothing so a lookup doesn't occur per tooltip instancing
    }
}
Controls.define('fxs-tooltip', {
    createInstance: Tooltip,
    description: 'Tooltip',
    classNames: ['tooltip'],
    styles: ['fs://game/core/ui/tooltips/tooltip-manager.css'],
});
const TooltipManager = TooltipManagerSingleton.getInstance();
export { TooltipManager as default };
let ttInstance = null;
function initialize() {
    const ttContainer = document.getElementById('tooltip-container') ?? document.body;
    const ttRoot = document.getElementById('tooltip-root');
    const ttContent = document.getElementById('tooltip-root-content');
    if (!ttContainer) {
        throw new Error("Could not find element with id 'tooltip-container'!");
    }
    if (!ttRoot) {
        throw new Error("Could not find element with id 'tooltip-root'!");
    }
    if (!ttContent) {
        throw new Error("Could not find element with id 'tooltip-root-content'!");
    }
    const options = {
        containerElement: ttContainer,
        tooltipRootElement: ttRoot,
        tooltipContentElement: ttContent,
        transitionDelay: 0,
        expirationDelay: 3000,
        resetDelay: 800,
        pointerOffsetX: 16,
        pointerOffsetY: 16,
    };
    ttInstance = new TooltipController(options);
    ttInstance.connect();
    // Register debug widget.
    const disableTooltips = {
        id: 'disableTooltips',
        category: 'Systems',
        caption: 'Disable Tooltips (except Plot)',
        domainType: 'bool',
        value: false,
    };
    UI.Debug.registerWidget(disableTooltips);
    engine.on('DebugWidgetUpdated', (id, value) => {
        console.log(`DebugWidgetUpdated! ${id} ${value}`);
        if (id == 'disableTooltips') {
            if (value) {
                ttInstance?.disconnect();
            }
            else {
                ttInstance?.connect();
            }
        }
    });
}
engine.whenReady.then(() => {
    initialize();
});

//# sourceMappingURL=file:///core/ui/tooltips/tooltip-manager.js.map

/**
 * @file tooltip-controller.js
 * @copyright 2023-2024, Firaxis Games
 *
 * What's left?
 * Driver:
 *  - Gamepad event handling needs to be added.
 *  - Touch points need to be tested, along with the ability to expire tooltips.
 *  - Additional mouse events should be added for when the player moves the mouse *outside* the screen or the window loses focus to hide the tip.
 *
 * Controller:
 *  - Further testing for resized tooltips.
 *  - Add support for showing tooltips above/below or left/right of the context element
 *  - Continue to think about practical applications of multiple controller instances running at once
 *  - Clean up interface with driver and renderer.
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { CursorUpdatedEventName } from '/core/ui/input/cursor.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { RecursiveGetAttribute } from '/core/ui/utilities/utilities-dom.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
/**
 * Values to specify where to align the tooltip relative to the context element.
 */
var Alignment;
(function (Alignment) {
    Alignment["TopLeft"] = "top-left";
    Alignment["TopRight"] = "top-right";
    Alignment["BottomLeft"] = "bottom-left";
    Alignment["BottomRight"] = "bottom-right";
})(Alignment || (Alignment = {}));
const DEFAULT_ALIGNMENT = Alignment.BottomRight;
var Anchor;
(function (Anchor) {
    Anchor[Anchor["None"] = 0] = "None";
    Anchor[Anchor["Right"] = 1] = "Right";
    Anchor[Anchor["Left"] = 2] = "Left";
    Anchor[Anchor["Top"] = 3] = "Top";
    Anchor[Anchor["Bottom"] = 4] = "Bottom";
})(Anchor || (Anchor = {}));
const DEFAULT_ANCHOR = Anchor.None;
const CURSOR_WIDTH = 24;
const CURSOR_HEIGHT = 24;
class DefaultTooltipDriver {
    constructor(controller, root) {
        this.cursorUpdatedListener = this.onCursorUpdated.bind(this);
        this.targetMouseLeaveListener = this.handleMouseLeave.bind(this);
        this.scrollIntoViewListener = this.handleScrollIntoView.bind(this);
        this.cameraChangedListener = this.onCameraChanged.bind(this);
        this.currentFocusListener = this.onCurrentFocusChanged.bind(this);
        this.blurListener = this.onBlur.bind(this);
        this.mouseLeaveTimeout = 0;
        this.scratchContent = '';
        this.scratchElement = null;
        /** The previous event target.  Used to early out. */
        this.previousEventTarget = null;
        /** The previous target.  Used to early out. */
        this.previousTarget = null;
        this.previousContent = '';
        this.isTouchTooltip = false;
        this.tooltipAttributeUpdatedObserver = new MutationObserver(this.onTooltipAttributeMutated.bind(this));
        this.onEngineInput = (name, status, x, y) => {
            if (this.isTouchTooltip && name != 'touch-complete') {
                this.hideTooltip();
            }
            if (name == 'toggle-tooltip' && status == InputActionStatuses.FINISH) {
                this.controller.toggleTooltip();
            }
            if (name == 'touch-press') {
                const element = document.elementFromPoint(x, y);
                if (element instanceof HTMLElement) {
                    if (this.recursiveGetTooltipContent(element)) {
                        if (!this.scratchElement) {
                            throw new Error("RecursiveGetTooltipContent returned true, but no element was set.");
                        }
                        if (!this.scratchContent) {
                            throw new Error("RecursiveGetTooltipContent returned true, but no content was set.");
                        }
                        this.controller.showTooltipElement(this.scratchElement, this.scratchContent);
                        this.isTouchTooltip = true;
                    }
                }
            }
        };
        this.controller = controller;
        this.root = root;
    }
    onTooltipAttributeMutated() {
        if (!this.scratchElement) {
            return;
        }
        this.scratchContent = this.scratchElement.getAttribute("data-tooltip-content") ?? "";
        this.previousContent = this.scratchContent;
        this.controller.showTooltipElement(this.scratchElement, this.scratchContent);
    }
    recursiveGetTooltipContent(target) {
        if (target == null || target == document.body) {
            return false;
        }
        // Sometimes the element to anchor the tooltip is distinct
        // from the focused element: this is the Alternative target.
        const alternativeTargetClass = target.getAttribute('data-tooltip-alternative-target');
        let alternativeTarget = null;
        if (alternativeTargetClass != null) {
            alternativeTarget = this.root.querySelector('.' + alternativeTargetClass);
            if (alternativeTarget == null) {
                console.warn(`tooltip-controller: recursiveGetTooltipContent(): No element with ${alternativeTargetClass} class was found!`);
            }
        }
        const finalTarget = alternativeTarget ?? target;
        const content = finalTarget.getAttribute('data-tooltip-content');
        if (content) {
            this.scratchContent = content;
            this.scratchElement = finalTarget;
            this.tooltipAttributeUpdatedObserver.observe(this.scratchElement, { attributes: true, attributeFilter: ['data-tooltip-content'] });
            return true;
        }
        return this.recursiveGetTooltipContent(target.parentElement);
    }
    connect() {
        // we have to listen going down (with capture mode) because the focus event doesn't bubble
        window.addEventListener('focus', this.currentFocusListener, true);
        window.addEventListener('blur', this.blurListener, true);
        window.addEventListener('scroll-into-view', this.scrollIntoViewListener, true);
        window.addEventListener(CursorUpdatedEventName, this.cursorUpdatedListener);
        engine.on('CameraChanged', this.cameraChangedListener);
        engine.on('InputAction', this.onEngineInput);
        // TODO Engine gamepad/hotkey events.
    }
    disconnect() {
        this.previousTarget?.removeEventListener('mouseleave', this.targetMouseLeaveListener);
        window.removeEventListener('focus', this.currentFocusListener, true);
        window.removeEventListener('blur', this.blurListener, true);
        window.removeEventListener('scroll-into-view', this.scrollIntoViewListener, true);
        window.removeEventListener(CursorUpdatedEventName, this.cursorUpdatedListener);
        engine.off('CameraChanged', this.cameraChangedListener);
        engine.off('InputAction', this.onEngineInput);
        // TODO Engine gamepad/hotkey events.
    }
    onCurrentFocusChanged(event) {
        if (event.target instanceof HTMLElement) {
            if (!ActionHandler.isGamepadActive || !FocusManager.isFocusActive()) {
                this.hideTooltip();
                return;
            }
            const focusedElement = event.target;
            if (!this.previousTarget || this.previousTarget != focusedElement) {
                this.hideTooltip();
                if (this.recursiveGetTooltipContent(focusedElement)) {
                    if (!this.scratchElement) {
                        throw new Error("RecursiveGetTooltipContent returned true, but no element was set.");
                    }
                    if (!this.scratchContent) {
                        throw new Error("RecursiveGetTooltipContent returned true, but no content was set.");
                    }
                    if (this.scratchElement != this.previousTarget) {
                        this.controller.showTooltipElement(this.scratchElement, this.scratchContent);
                        this.previousTarget = this.scratchElement;
                        this.previousContent = this.scratchContent;
                    }
                }
            }
        }
    }
    onCameraChanged() {
        if (!ActionHandler.isGamepadActive || !this.scratchElement || this.scratchContent == "") {
            return;
        }
        // hide tooltip until we stop moving
        this.controller.hideTooltip();
        this.controller.showTooltipElement(this.scratchElement, this.scratchContent);
    }
    onBlur() {
        this.hideTooltip();
    }
    hideTooltip() {
        this.previousTarget?.removeEventListener('mouseleave', this.targetMouseLeaveListener);
        this.controller.hideTooltip();
        this.previousEventTarget = null;
        this.previousTarget = null;
        this.previousContent = '';
        this.scratchElement = null;
        this.scratchContent = "";
        this.isTouchTooltip = false;
    }
    handleMouseLeave(event) {
        // This event is for all intents and purposes a one-shot on the element.
        // If the user mouses over the element again then we can re-register the event.
        event.target?.removeEventListener('mouseleave', this.targetMouseLeaveListener);
        if (event.target == this.previousTarget) {
            this.hideTooltip();
        }
    }
    handleScrollIntoView(event) {
        // Wait a frame for new scroll layout to update, then update the focused tooltip
        waitForLayout(() => {
            if (this.previousTarget) {
                this.controller.showTooltipElement(this.previousTarget, this.previousContent);
            }
        });
        event.stopPropagation();
    }
    onCursorUpdated(event) {
        if (event.detail.target instanceof HTMLElement) {
            if (event.detail.target == this.previousEventTarget && this.previousTarget && this.previousContent) {
                if (this.controller.anchor == Anchor.None) {
                    // Reposition only
                    this.controller.showTooltipCoord(event.detail.x, event.detail.y, this.previousTarget, this.previousContent);
                }
            }
            else {
                if (this.recursiveGetTooltipContent(event.detail.target)) {
                    if (!this.scratchElement) {
                        throw new Error("RecursiveGetTooltipContent returned true, but no element was set.");
                    }
                    if (!this.scratchContent) {
                        throw new Error("RecursiveGetTooltipContent returned true, but no content was set.");
                    }
                    if (this.scratchElement != this.previousTarget) {
                        this.controller.showTooltipCoord(event.detail.x, event.detail.y, this.scratchElement, this.scratchContent);
                    }
                    // Cancel any input timers
                    if (this.mouseLeaveTimeout != 0) {
                        clearTimeout(this.mouseLeaveTimeout);
                        this.mouseLeaveTimeout = 0;
                    }
                    // Swap out the mouseleave event listener trap.
                    this.previousTarget?.removeEventListener('mouseleave', this.targetMouseLeaveListener);
                    this.scratchElement.addEventListener('mouseleave', this.targetMouseLeaveListener);
                    this.previousEventTarget = event.detail.target;
                    this.previousTarget = this.scratchElement;
                    this.previousContent = this.scratchContent;
                }
                else {
                    this.hideTooltip();
                }
            }
        }
        else {
            this.hideTooltip();
        }
    }
    mutatePreviousContent(newContent) {
        this.previousContent = newContent;
    }
}
class DefaultTooltipRenderer {
    constructor() {
        this.previousElementTag = '';
        this.textElement = document.createElement('div');
        this.textElement.style.pointerEvents = 'none';
    }
    render(context, content) {
        const customElement = context.getAttribute('data-tooltip-component');
        if (customElement) {
            if (this.previousElementTag != customElement) {
                const div = document.createElement(customElement);
                div.setAttribute('data-tooltip-content', content);
                this.previousElement = div;
                this.previousElementTag = customElement;
                return div;
            }
            if (!this.previousElement) {
                throw new Error("Expected this.previousElement to not be null.");
            }
            const prevContent = this.previousElement.getAttribute('data-tooltip-content');
            if (prevContent != content) {
                this.previousElement.setAttribute('data-tooltip-content', content);
            }
        }
        else {
            this.textElement.innerHTML = Locale.stylize(content);
            if (this.previousElement != this.textElement) {
                this.previousElement = this.textElement;
                this.previousElementTag = '';
                return this.textElement;
            }
        }
        return null;
    }
    release() {
    }
}
var ToolTipVisibilityState;
(function (ToolTipVisibilityState) {
    ToolTipVisibilityState[ToolTipVisibilityState["Hidden"] = 0] = "Hidden";
    ToolTipVisibilityState[ToolTipVisibilityState["WaitingToShow"] = 1] = "WaitingToShow";
    ToolTipVisibilityState[ToolTipVisibilityState["Shown"] = 2] = "Shown";
    ToolTipVisibilityState[ToolTipVisibilityState["WaitingToExpire"] = 3] = "WaitingToExpire";
    ToolTipVisibilityState[ToolTipVisibilityState["WaitingToReset"] = 4] = "WaitingToReset";
})(ToolTipVisibilityState || (ToolTipVisibilityState = {}));
export class TooltipController {
    get anchor() {
        return this.tooltipAnchor;
    }
    transitionToShown() {
        this.showTimeout = 0;
        this.immediatelyShowTooltip();
        this.state = ToolTipVisibilityState.Shown;
    }
    resetState() {
        this.resetTimeout = 0;
        this.state = ToolTipVisibilityState.Hidden;
    }
    expiration() {
        this.expirationTimeout = 0;
        this.hideTooltip();
    }
    constructor(params) {
        this.observer = null;
        this.observerConfig = { attributes: true, childList: true, subtree: true };
        this.pointerOffsetX = 0;
        this.pointerOffsetY = 0;
        this.fixedPosition = false;
        this.resetDelay = 0;
        this.transitionDelay = 0;
        this.expirationDelay = 0;
        this.useTransitionDelay = true;
        /** Timeout handle for when waiting to 'reset' state. */
        this.resetTimeout = 0;
        /** Timeout handle for when waiting to 'show' tooltip. */
        this.showTimeout = 0;
        /** Timeout handle for when waiting to 'expire' tooltip. */
        this.expirationTimeout = 0;
        /** Timeout handle for when waiting to actually hide tooltip. */
        this.hideTimeout = 0;
        /** Animation frame handle for when the controller detects mutations in the tool-tip content. Queue a reposition in 2 frames. */
        this.mutateRepositionHandle = 0;
        /** Animation frame handle for when the controller is showing a fresh tool-tip.  Delay 2 frames to position properly. */
        this.showingHandle = 0;
        this.state = ToolTipVisibilityState.Hidden;
        this.isToggledOn = true;
        this.tooltipX = 0;
        this.tooltipY = 0;
        this.tooltipContext = null;
        this.tooltipContent = '';
        this.tooltipAlignment = Alignment.BottomRight;
        this.tooltipAnchor = Anchor.None;
        this.transitionToShownHandler = () => { this.transitionToShown(); };
        this.resetStateHandler = () => { this.resetState(); };
        this.expirationHandler = () => { this.expiration(); };
        this.repositionFunction = this.reposition;
        this.activeDeviceChangeListener = this.onActiveDeviceTypeChanged.bind(this);
        if (!this.checkParams(params)) {
            throw new Error("Invalid parameters when constructing TooltipController.");
        }
        this.driver = new DefaultTooltipDriver(this, params.inputRootElement ?? document.body);
        this.renderer = new DefaultTooltipRenderer();
        this.root = params.tooltipRootElement;
        this.content = params.tooltipContentElement ?? params.tooltipRootElement;
        this.container = params.containerElement ?? document.body;
        this.resetDelay = params.resetDelay ?? 0;
        this.transitionDelay = params.transitionDelay ?? 0;
        this.expirationDelay = params.expirationDelay ?? 0;
        this.fixedPosition = params.fixedPosition ?? false;
        this.pointerOffsetX = params.pointerOffsetX ?? 0;
        this.pointerOffsetY = params.pointerOffsetY ?? 0;
    }
    checkParams(params) {
        if (params.tooltipRootElement == null || !(params.tooltipRootElement instanceof HTMLElement)) {
            throw new Error(`tooltipRootElement is a required value.`);
        }
        if (params.fixedPosition == true && params.containerElement != null) {
            throw new Error(`'containerElement' must remain null if 'fixedPosition' is true.`);
        }
        const checkDelay = (v, s) => {
            if (v && (v < 0 || v > 10000)) {
                throw new Error(`Invalid value for ${s}.`);
            }
        };
        checkDelay(params.showDelay, 'showDelay');
        checkDelay(params.transitionDelay, 'transitionDelay');
        checkDelay(params.resetDelay, 'resetDelay');
        checkDelay(params.expirationDelay, 'expirationDelay');
        if (params.resetDelay && params.transitionDelay && params.resetDelay < params.transitionDelay) {
            throw new Error(`'resetDelay' must not be less than 'transitionDelay'`);
        }
        return true;
    }
    connect() {
        this.hideTooltip();
        // If the tooltip will be dynamically positioned, attach a mutation observer to track changes.
        // This observer will allow us to reposition the element and ensure no undesired overlap occurs.
        if (!this.fixedPosition) {
            this.observer = new MutationObserver((mutations) => this.onMutate(mutations));
            if (!this.observer) {
                throw new Error("Could not instantiate MutationObserver.");
            }
            else {
                this.observer.observe(this.content, this.observerConfig);
            }
        }
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangeListener);
        this.driver.connect();
    }
    onActiveDeviceTypeChanged(_event) {
        const forceTooltipOn = true;
        this.toggleTooltip(forceTooltipOn);
    }
    onMutate(_mutations) {
        this.root.style.visibility = 'hidden';
        this.mutateRepositionHandle = requestAnimationFrame(() => {
            this.mutateRepositionHandle = requestAnimationFrame(() => {
                this.mutateRepositionHandle = 0;
                if (this.state != ToolTipVisibilityState.Shown) {
                    throw new Error("Expected State to be 'Shown'!");
                }
                this.repositionFunction();
                this.root.style.visibility = 'visible';
            });
        });
    }
    disconnect() {
        // TODO? When setting this method private it seems never used. To investigate.
        this.hideTooltip();
        this.renderer.release();
        this.driver.disconnect();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangeListener);
    }
    setElementToolTipCoords(contextRect) {
        if (!this.tooltipContext) {
            return;
        }
        switch (this.tooltipAlignment) {
            case Alignment.BottomLeft:
                this.tooltipX = contextRect.x + contextRect.width;
                this.tooltipY = contextRect.y + contextRect.height + this.pointerOffsetY;
                break;
            case Alignment.TopRight:
                this.tooltipX = contextRect.x;
                this.tooltipY = contextRect.y - this.pointerOffsetY;
                break;
            case Alignment.TopLeft:
                this.tooltipX = contextRect.x + contextRect.width;
                this.tooltipY = contextRect.y - this.pointerOffsetY;
                break;
            case Alignment.BottomRight:
                this.tooltipX = contextRect.x;
                this.tooltipY = contextRect.y + contextRect.height + this.pointerOffsetY;
                break;
        }
    }
    repositionTooltipElement() {
        if (!this.tooltipContext) {
            return;
        }
        const rect = this.root.getBoundingClientRect();
        const contextRect = this.tooltipContext.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        this.setElementToolTipCoords(contextRect);
        const prevAlignment = this.tooltipAlignment;
        const newAlignment = this.verifyAlignment(this.tooltipAlignment, this.tooltipX, this.tooltipY, rect.width, rect.height, containerRect);
        if (newAlignment != this.tooltipAlignment) {
            this.tooltipAlignment = newAlignment;
            this.setElementToolTipCoords(contextRect);
        }
        const adjustedTipOffset = this.constrainTipToRect(containerRect);
        this.setTooltipStyle(adjustedTipOffset, prevAlignment);
    }
    showTooltipElement(element, content) {
        this.repositionFunction = this.repositionTooltipElement;
        this.useTransitionDelay = false;
        let x = 0;
        let y = 0;
        const anchorAttr = RecursiveGetAttribute(element, 'data-tooltip-anchor');
        this.tooltipAnchor = anchorAttr ? this.parseAnchor(anchorAttr) : Anchor.None;
        if (this.tooltipAnchor != Anchor.None) {
            const anchorPosition = this.getAnchorPos(element);
            x = anchorPosition.x;
            y = anchorPosition.y;
            this.repositionFunction = this.repositionAnchored;
        }
        this.showTooltip(x, y, element, content);
    }
    showTooltipCoord(x, y, context, content) {
        this.repositionFunction = this.reposition;
        this.useTransitionDelay = true;
        const anchorAttr = RecursiveGetAttribute(context, 'data-tooltip-anchor');
        this.tooltipAnchor = anchorAttr ? this.parseAnchor(anchorAttr) : Anchor.None;
        if (this.tooltipAnchor != Anchor.None) {
            // Show the tooltip anchored to the element by default, so it doesnt jump when repositioned
            this.showTooltipElement(context, content);
        }
        else {
            this.showTooltip(x, y, context, content);
        }
    }
    getAnchorPos(element) {
        let pos = { x: 0, y: 0 };
        const elementRect = element.getBoundingClientRect();
        const anchorOffsetAttr = RecursiveGetAttribute(element, 'data-tooltip-anchor-offset');
        const tooltipAnchorOffset = anchorOffsetAttr ? Layout.pixelsToScreenPixels(parseInt(anchorOffsetAttr)) : 0;
        // X Offset
        switch (this.tooltipAnchor) {
            case Anchor.Right:
                pos.x = elementRect.right + tooltipAnchorOffset;
                break;
            case Anchor.Left:
                pos.x = elementRect.left - tooltipAnchorOffset;
                break;
            default:
                pos.x = elementRect.left + (elementRect.width / 2);
        }
        // Y Offset
        switch (this.tooltipAnchor) {
            case Anchor.Top:
                pos.y = elementRect.top - tooltipAnchorOffset;
                break;
            case Anchor.Bottom:
                pos.y = elementRect.bottom + tooltipAnchorOffset;
                break;
            default:
                pos.y = elementRect.top + (elementRect.height / 2);
        }
        return pos;
    }
    showTooltip(x, y, context, content) {
        this.tooltipX = x;
        this.tooltipY = y;
        const showDelay = Input.isShiftDown() ? 1 : Configuration.getUser().tooltipDelay;
        if (this.hideTimeout != 0) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = 0;
        }
        if (this.state == ToolTipVisibilityState.Hidden ||
            this.state == ToolTipVisibilityState.Shown ||
            this.state == ToolTipVisibilityState.WaitingToExpire ||
            this.state == ToolTipVisibilityState.WaitingToReset) {
            if (this.tooltipContext != context || this.tooltipContent != content || showDelay > 0) {
                // New context! Cancel any timeouts and begin transition.
                // First, determine ideal alignment.
                // If there's any specified override, always use that.
                // Otherwise, if the tooltip is transitioning to a sibling, try and maintain the same alignment.
                // Otherwise, use the default alignment.
                const alignmentAttr = RecursiveGetAttribute(context, 'data-tooltip-alignment');
                if (alignmentAttr) {
                    this.tooltipAlignment = this.parseAlignment(alignmentAttr);
                }
                else if (this.state == ToolTipVisibilityState.Hidden) {
                    this.tooltipAlignment = DEFAULT_ALIGNMENT;
                }
                else if (context.parentElement != this.tooltipContext?.parentElement) {
                    this.tooltipAlignment = DEFAULT_ALIGNMENT;
                }
                const delay = (!this.useTransitionDelay || this.state == ToolTipVisibilityState.Hidden) ? showDelay : this.transitionDelay;
                // Hide the expiring tooltip.
                // ! EXPERIMENTAL CODE !
                // ! 'Flicker' free transitions
                //	this.immediatelyHideTooltip();
                if (delay > 0) {
                    this.immediatelyHideTooltip();
                }
                else {
                    if (this.observer) {
                        this.observer.disconnect();
                    }
                    // Cancel any requested animation frames to avoid tooltip spontaneously showing.
                    if (this.mutateRepositionHandle > 0) {
                        window.cancelAnimationFrame(this.mutateRepositionHandle);
                        this.mutateRepositionHandle = 0;
                    }
                    if (this.showingHandle != 0) {
                        cancelAnimationFrame(this.showingHandle);
                        this.showingHandle = 0;
                    }
                }
                // ! END EXPERIMENT
                // New context! Transition back to shown.
                // and show the control.
                this.tooltipContext = context;
                this.tooltipContent = content;
                // Clear timeouts
                if (this.expirationTimeout != 0) {
                    clearTimeout(this.expirationTimeout);
                    this.expirationTimeout = 0;
                }
                if (this.resetTimeout != 0) {
                    clearTimeout(this.resetTimeout);
                    this.resetTimeout = 0;
                }
                if (this.showTimeout != 0) {
                    clearTimeout(this.showTimeout);
                    this.showTimeout = 0;
                }
                // Switch to a transition.
                if (delay > 0) {
                    this.showTimeout = setTimeout(this.transitionToShownHandler, delay);
                    this.state = ToolTipVisibilityState.WaitingToShow;
                }
                else {
                    this.immediatelyShowTooltip();
                    this.state = ToolTipVisibilityState.Shown;
                }
            }
            else {
                // Same context that is expiring, just reposition.
                this.repositionFunction();
            }
        }
        else if (this.state == ToolTipVisibilityState.WaitingToShow) {
            // Continue waiting, just update information.
            this.tooltipContext = context;
            this.tooltipContent = content;
        }
        else {
            throw new Error('TooltipController - Unhandled state.');
        }
    }
    hideTooltip() {
        this.tooltipContext = null;
        this.tooltipContent = '';
        switch (this.state) {
            case ToolTipVisibilityState.WaitingToExpire:
            case ToolTipVisibilityState.Shown:
                {
                    this.immediatelyHideTooltip();
                    if (this.hideTimeout != 0) {
                        clearTimeout(this.hideTimeout);
                        this.hideTimeout = 0;
                    }
                    if (this.showTimeout != 0) {
                        clearTimeout(this.showTimeout);
                        this.showTimeout = 0;
                    }
                    if (this.expirationTimeout != 0) {
                        clearTimeout(this.expirationTimeout);
                        this.expirationTimeout = 0;
                    }
                    // Transition to next state.
                    if (this.resetDelay > 0) {
                        this.state = ToolTipVisibilityState.WaitingToReset;
                        this.resetTimeout = setTimeout(this.resetStateHandler, this.resetDelay);
                    }
                    else {
                        this.state = ToolTipVisibilityState.Hidden;
                    }
                }
                break;
            case ToolTipVisibilityState.WaitingToShow:
                {
                    clearTimeout(this.showTimeout);
                    this.showTimeout = 0;
                    this.state = ToolTipVisibilityState.Hidden;
                }
                break;
            case ToolTipVisibilityState.Hidden:
            case ToolTipVisibilityState.WaitingToReset:
                // Do nothing.
                break;
            default:
                throw new Error('Unhandled state in TooltipController.');
        }
    }
    expireTooltip() {
        this.tooltipContext = null;
        this.tooltipContent = '';
        switch (this.state) {
            case ToolTipVisibilityState.Shown:
                {
                    if (this.expirationDelay > 0) {
                        this.state = ToolTipVisibilityState.WaitingToExpire;
                        this.expirationTimeout = setTimeout(this.expirationHandler, this.expirationDelay);
                    }
                    else {
                        this.hideTooltip();
                    }
                    this.immediatelyHideTooltip();
                    // Transition to next state.
                    if (this.resetDelay > 0) {
                        this.state = ToolTipVisibilityState.WaitingToReset;
                        this.resetTimeout = setTimeout(this.resetStateHandler, this.resetDelay);
                    }
                    else {
                        this.state = ToolTipVisibilityState.Hidden;
                    }
                }
                break;
            case ToolTipVisibilityState.WaitingToShow:
                {
                    clearTimeout(this.showTimeout);
                    this.showTimeout = 0;
                    this.state = ToolTipVisibilityState.Hidden;
                }
                break;
            case ToolTipVisibilityState.Hidden:
            case ToolTipVisibilityState.WaitingToExpire:
            case ToolTipVisibilityState.WaitingToReset:
                // Do nothing.
                break;
            default:
                throw new Error('Unhandled state in TooltipController.');
        }
    }
    toggleTooltip(force) {
        this.isToggledOn = force ?? !this.isToggledOn;
        if (this.isToggledOn) {
            if (this.tooltipContext) {
                this.immediatelyShowTooltip();
                this.state = ToolTipVisibilityState.Shown;
            }
        }
        else {
            this.immediatelyHideTooltip();
            this.state = ToolTipVisibilityState.Hidden;
        }
    }
    parseAlignment(alignment) {
        switch (alignment) {
            case 'top-left':
                return Alignment.TopLeft;
            case 'top-right':
                return Alignment.TopRight;
            case 'bottom-left':
                return Alignment.BottomLeft;
            case 'bottom-right':
                return Alignment.BottomRight;
            default:
                return DEFAULT_ALIGNMENT;
        }
    }
    parseAnchor(anchor) {
        switch (anchor) {
            case 'right':
                return Anchor.Right;
            case 'left':
                return Anchor.Left;
            case 'top':
                return Anchor.Top;
            case 'bottom':
                return Anchor.Bottom;
            default:
                console.error(`tooltip-controller: Unrecognized 'data-tooltip-anchor' value: ${anchor}`);
                return DEFAULT_ANCHOR;
        }
    }
    verifyAlignment(alignment, x, y, width, height, containerRect) {
        // Compute all intersections for now as I'm thinking about creating some sort of bit-flag system for this.
        const cursorOffset = !ActionHandler.isGamepadActive ? { x: CURSOR_WIDTH, y: CURSOR_HEIGHT } : { x: 0, y: 0 };
        const intersectRight = (x + width + cursorOffset.x > containerRect.right);
        const intersectBottom = (y + height + cursorOffset.y > containerRect.bottom);
        const intersectTop = (y - height < containerRect.top);
        const intersectLeft = (x - width < containerRect.left);
        switch (alignment) {
            case Alignment.BottomRight:
                if (intersectRight) {
                    if (intersectBottom) {
                        return Alignment.TopLeft;
                    }
                    return Alignment.BottomLeft;
                }
                if (intersectBottom) {
                    return Alignment.TopRight;
                }
                break;
            case Alignment.BottomLeft:
                if (intersectLeft) {
                    if (intersectBottom) {
                        return Alignment.TopRight;
                    }
                    return Alignment.BottomRight;
                }
                if (intersectBottom) {
                    return Alignment.TopLeft;
                }
                break;
            case Alignment.TopRight:
                if (intersectRight) {
                    if (intersectTop) {
                        return Alignment.BottomLeft;
                    }
                    return Alignment.TopLeft;
                }
                if (intersectTop) {
                    return Alignment.BottomRight;
                }
                break;
            case Alignment.TopLeft:
                if (intersectLeft) {
                    if (intersectTop) {
                        return Alignment.BottomRight;
                    }
                    return Alignment.TopRight;
                }
                if (intersectTop) {
                    return Alignment.BottomLeft;
                }
                break;
            default:
                throw new Error('Unhandled alignment value!');
        }
        return alignment;
    }
    reposition() {
        if (this.fixedPosition) {
            return;
        }
        const root = this.root;
        const offsetX = this.pointerOffsetX;
        const offsetY = this.pointerOffsetY;
        // Fetch bounding volumes (note: these may be out of date.  If that's the case, oh well.  We always continue to reposition 2 frames after just in case).
        const rect = root.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const prevAlignment = this.tooltipAlignment;
        this.tooltipAlignment = this.verifyAlignment(this.tooltipAlignment, this.tooltipX, this.tooltipY, rect.width + offsetX, rect.height + offsetY, containerRect);
        const adjustedTipOffset = this.constrainTipToRect(containerRect);
        this.setTooltipStyle(adjustedTipOffset, prevAlignment);
    }
    repositionAnchored() {
        if (this.fixedPosition || !this.tooltipContext) {
            return;
        }
        const anchorPosition = this.getAnchorPos(this.tooltipContext);
        this.tooltipX = anchorPosition.x;
        this.tooltipY = anchorPosition.y;
        const root = this.root;
        // Fetch bounding volumes (note: these may be out of date.  If that's the case, oh well.  We always continue to reposition 2 frames after just in case).
        const tipRect = root.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        switch (this.tooltipAnchor) {
            case Anchor.Right:
                this.tooltipY = this.tooltipY - (tipRect.height / 2);
                break;
            case Anchor.Left:
                this.tooltipY = this.tooltipY - (tipRect.height / 2);
                // Because this is left-anchored, code in setTooltipStyle() will set the tooltip's "rightPX" CSS property
                // to offsetX.
                this.tooltipX = this.tooltipX - tipRect.width;
                break;
            case Anchor.Top:
                this.tooltipX = this.tooltipX - (tipRect.width / 2);
                this.tooltipY = this.tooltipY - tipRect.height;
                break;
            case Anchor.Bottom:
                this.tooltipX = this.tooltipX - (tipRect.width / 2);
                break;
            default:
                console.error(`tooltip-controller: Unrecognized anchor type in repositionAnchored ${this.tooltipAnchor}`);
        }
        const prevAlignment = this.tooltipAlignment;
        this.tooltipAlignment = this.verifyAlignment(this.tooltipAlignment, this.tooltipX, this.tooltipY, tipRect.width, tipRect.height, containerRect);
        const adjustedTipOffset = this.constrainTipToRect(containerRect);
        this.setTooltipStyle(adjustedTipOffset, prevAlignment);
    }
    // Constrains the final placement of a tip's rect to the passed in rect. In most cases this will be the screen.
    constrainTipToRect(constrainRect) {
        // const needsCursorOffset = this.tooltipAlignment == Alignment.BottomRight || this.tooltipAlignment == Alignment.TopRight;
        const cursorOffset = !ActionHandler.isGamepadActive && this.tooltipAnchor == Anchor.None ? { x: CURSOR_WIDTH, y: CURSOR_HEIGHT } : { x: 0, y: 0 };
        const tipRect = this.root.getBoundingClientRect();
        const offset = { x: this.tooltipX + cursorOffset.x, y: this.tooltipY + cursorOffset.y };
        // constrain top or bottom
        if (this.tooltipY < constrainRect.top) {
            offset.y = Math.min(constrainRect.top, this.tooltipY + tipRect.height);
        }
        if (this.tooltipY + tipRect.height + cursorOffset.y > constrainRect.bottom) {
            offset.y = Math.max(constrainRect.bottom - tipRect.height, this.tooltipY - tipRect.height);
        }
        //constrain left or right
        if (this.tooltipX < constrainRect.left) {
            offset.x = Math.min(constrainRect.left, this.tooltipX + tipRect.width);
        }
        if (this.tooltipX + tipRect.width + cursorOffset.x > constrainRect.right) {
            offset.x = Math.max(constrainRect.left - tipRect.width, this.tooltipX - tipRect.width);
        }
        const intersectRight = (this.tooltipX + offset.x + tipRect.width > constrainRect.right);
        const intersectBottom = (this.tooltipY + offset.y + tipRect.height > constrainRect.bottom);
        const intersectTop = (this.tooltipY + offset.y < constrainRect.top);
        const intersectLeft = (this.tooltipX + offset.x < constrainRect.left);
        // If we still overflow in both horizontal or both vertical directions we have a bigger problem
        if (intersectBottom && intersectTop || intersectLeft && intersectRight) {
            console.error(`tooltip-controller: ERROR - tip does not fit on the screen! Start conversation with game design or UI design for alternate solutions!`);
            return { x: -1, y: -1 };
        }
        return offset;
    }
    setTooltipStyle(offset, prevAlignment) {
        if (this.tooltipAlignment != prevAlignment) {
            this.root.classList.remove('tooltip-align--top-left', 'tooltip-align--top-right', 'tooltip-align--bottom-left', 'tooltip-align--bottom-right');
            switch (this.tooltipAlignment) {
                case Alignment.TopLeft:
                    this.root.classList.add('tooltip-align--top-left');
                    break;
                case Alignment.TopRight:
                    this.root.classList.add('tooltip-align--top-right');
                    break;
                case Alignment.BottomLeft:
                    this.root.classList.add('tooltip-align--bottom-left');
                    break;
                case Alignment.BottomRight:
                    this.root.classList.add('tooltip-align--bottom-right');
                    break;
                default:
                    throw new Error('Unhandled alignment value.');
            }
        }
        this.root.style.leftPX = offset.x;
        this.root.style.topPX = offset.y;
    }
    immediatelyHideTooltip() {
        // Immediately hide the tooltip.
        this.renderer.release();
        this.root.style.visibility = 'hidden';
        if (this.observer) {
            this.observer.disconnect();
        }
        // Cancel any requested animation frames to avoid tooltip spontaneously showing.
        if (this.mutateRepositionHandle > 0) {
            window.cancelAnimationFrame(this.mutateRepositionHandle);
            this.mutateRepositionHandle = 0;
        }
        if (this.showingHandle != 0) {
            cancelAnimationFrame(this.showingHandle);
            this.showingHandle = 0;
        }
    }
    immediatelyShowTooltip() {
        if (!this.tooltipContext) {
            throw new Error(`Showing tooltip with no context??`);
        }
        if (!this.isToggledOn) {
            return;
        }
        if (this.showingHandle != 0) {
            cancelAnimationFrame(this.showingHandle);
            this.showingHandle = 0;
        }
        // Renderer will return null if there's no new element to attach.
        const newElement = this.renderer.render(this.tooltipContext, this.tooltipContent);
        if (newElement) {
            if (this.observer) {
                this.observer.disconnect();
            }
            this.root.style.visibility = 'hidden';
            while (this.content.hasChildNodes()) {
                this.content.removeChild(this.content.lastChild);
            }
            this.content.appendChild(newElement);
            this.showingHandle = requestAnimationFrame(() => {
                this.showingHandle = requestAnimationFrame(() => {
                    this.showingHandle = 0;
                    if (this.state != ToolTipVisibilityState.Shown) {
                        throw new Error("Expected visibility state to be shown!");
                    }
                    this.repositionFunction();
                    this.root.style.visibility = 'visible';
                    if (this.observer) {
                        this.observer.observe(this.content, this.observerConfig);
                    }
                });
            });
        }
        else {
            this.showingHandle = requestAnimationFrame(() => {
                this.showingHandle = requestAnimationFrame(() => {
                    this.showingHandle = 0;
                    this.repositionFunction();
                    this.root.style.visibility = 'visible';
                });
            });
        }
    }
}

//# sourceMappingURL=file:///core/ui/tooltips/tooltip-controller.js.map

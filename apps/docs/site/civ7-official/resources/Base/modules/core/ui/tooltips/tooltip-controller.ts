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

import ActionHandler, { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { CursorUpdatedEvent, CursorUpdatedEventName } from '/core/ui/input/cursor.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { RecursiveGetAttribute } from '/core/ui/utilities/utilities-dom.js'
import { Layout } from '/core/ui/utilities/utilities-layout.js';


/**
 * Values to specify where to align the tooltip relative to the context element.
 */
enum Alignment {
	TopLeft = 'top-left',
	TopRight = 'top-right',
	BottomLeft = 'bottom-left',
	BottomRight = 'bottom-right'
}
const DEFAULT_ALIGNMENT = Alignment.BottomRight;

enum Anchor {
	None = 0,
	Right,
	Left,
	Top,
	Bottom
}
const DEFAULT_ANCHOR: Anchor = Anchor.None;
const CURSOR_WIDTH = 24;
const CURSOR_HEIGHT = 24;

export interface TooltipControllerInitializationParams {

	/** 
	 * The root element of the tooltip.
	 * This is the element that will be positioned and shown by the tool-tip controller.
	 */
	tooltipRootElement: HTMLElement;

	/**
	 * The content element of the tooltip.
	 * This is the element that will contain the content of the tooltip.
	 * It typically should be a child of tooltipRootElement.
	 */
	tooltipContentElement: HTMLElement;

	/** 
	 * The containing element for the tooltip.
	 * Usually this is an inner element that is positioned within the safe-margins of the display.
	 * If undefined, this element will be the document.body.
	 * 
	 * Setting this value implies `fixedPosition = false`;
	 */
	containerElement?: HTMLElement;

	/**
	 * The root element to listen to input events on.
	 * If not provided, this will be `document.body`.
	 */
	inputRootElement?: HTMLElement;

	/**
	 * When true, the tooltip will not be repositioned based on the controller.
	 * Only the contents of the root and the visibility will be managed.
	 * 
	 * This value is considered false if undefined.
	 */
	fixedPosition?: boolean;

	/**
	 * The time(ms) to wait before showing the tooltip if it has been hidden.
	 * This number must be within the range of 0-10000.  Any other value is considered an error.
	 * By default, this value is 0.
	 */
	showDelay?: number;

	/**
	 * The time(ms) to wait before showing a transitioned tooltip.
	 * During a transition, hiding the previous tooltip is immediate, but a delay may be set before showing the next tip.
	 * This number must be within the range of 0-10000.  Any other value is considered an error.
	 * This value must not be larger than `resetDelay`.
	 * By default, this value is 0.
	 */
	transitionDelay?: number;

	/**
	 * The time(ms) to wait before resetting and no longer treating the following tooltip as a transition.
	 * This number must be within the range of 0-10000.  Any other value is considered an error.
	 * This value must be greater than or equal to transitionDelay.
	 * By default this value is 0.
	 */
	resetDelay?: number;

	/** 
	 * The time(ms) to wait before hiding a tooltip after it has expired.
	 * This number must be within the range of 0-10000.  Any other value is considered an error.
	 * By default this value is 0.
	 */
	expirationDelay?: number;

	/**
	 * The horizontal offset for the tooltip when attached to a pointer.
	 * Default 0.
	 */
	pointerOffsetX?: number;

	/**
	 * The vertical offset for the tooltip when attached to a pointer.
	 * Default 0.
	 */
	pointerOffsetY?: number;
}

type TooltipRepositionFunction = () => void;

class DefaultTooltipDriver {

	private readonly controller: TooltipController;

	/**
	 * The root containing all of the elements that we care about for the tooltip.
	 */
	private readonly root: HTMLElement;

	private readonly cursorUpdatedListener = this.onCursorUpdated.bind(this);
	private readonly targetMouseLeaveListener: EventListener = this.handleMouseLeave.bind(this);
	private readonly scrollIntoViewListener = this.handleScrollIntoView.bind(this);
	private readonly cameraChangedListener = this.onCameraChanged.bind(this);

	private currentFocusListener: EventListener = this.onCurrentFocusChanged.bind(this);
	private blurListener: EventListener = this.onBlur.bind(this);

	private mouseLeaveTimeout: number = 0;

	private scratchContent: string = '';
	private scratchElement: HTMLElement | null = null;

	/** The previous event target.  Used to early out. */
	private previousEventTarget: HTMLElement | null = null;

	/** The previous target.  Used to early out. */
	private previousTarget: HTMLElement | null = null;
	private previousContent: string = '';

	private isTouchTooltip: boolean = false;

	private readonly tooltipAttributeUpdatedObserver = new MutationObserver(this.onTooltipAttributeMutated.bind(this));

	constructor(controller: TooltipController, root: HTMLElement) {
		this.controller = controller;
		this.root = root;
	}

	private onTooltipAttributeMutated() {
		if (!this.scratchElement) {
			return;
		}
		this.scratchContent = this.scratchElement.getAttribute("data-tooltip-content") ?? "";
		this.previousContent = this.scratchContent;
		this.controller.showTooltipElement(this.scratchElement, this.scratchContent);
	}

	private recursiveGetTooltipContent(target: HTMLElement | null): boolean {
		if (target == null || target == document.body) {
			return false;
		}

		// Sometimes the element to anchor the tooltip is distinct
		// from the focused element: this is the Alternative target.
		const alternativeTargetClass: string | null = target.getAttribute('data-tooltip-alternative-target');
		let alternativeTarget: HTMLElement | null = null;
		if (alternativeTargetClass != null) {
			alternativeTarget = this.root.querySelector<HTMLElement>('.' + alternativeTargetClass);
			if (alternativeTarget == null) {
				console.warn(`tooltip-controller: recursiveGetTooltipContent(): No element with ${alternativeTargetClass} class was found!`);
			}
		}

		const finalTarget: HTMLElement = alternativeTarget ?? target;

		const content: string | null = finalTarget.getAttribute('data-tooltip-content');
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

	private onEngineInput = (name: string, status: InputActionStatuses, x: number, y: number) => {

		if (this.isTouchTooltip && name != 'touch-complete') {
			this.hideTooltip();
		}

		if (name == 'toggle-tooltip' && status == InputActionStatuses.FINISH) {
			this.controller.toggleTooltip();
		}

		if (name == 'touch-press') {
			const element: Element | null = document.elementFromPoint(x, y);

			if (element instanceof HTMLElement) {

				if (this.recursiveGetTooltipContent(element)) {
					if (!this.scratchElement) {
						throw new Error("RecursiveGetTooltipContent returned true, but no element was set.");
					}

					if (!this.scratchContent) {
						throw new Error("RecursiveGetTooltipContent returned true, but no content was set.")
					}

					this.controller.showTooltipElement(this.scratchElement, this.scratchContent);
					this.isTouchTooltip = true;
				}
			}
		}
	}

	private onCurrentFocusChanged(event: CustomEvent) {
		if (event.target instanceof HTMLElement) {
			if (!ActionHandler.isGamepadActive || !FocusManager.isFocusActive()) {
				this.hideTooltip();

				return;
			}

			const focusedElement: HTMLElement = event.target;

			if (!this.previousTarget || this.previousTarget != focusedElement) {
				this.hideTooltip();

				if (this.recursiveGetTooltipContent(focusedElement)) {
					if (!this.scratchElement) {
						throw new Error("RecursiveGetTooltipContent returned true, but no element was set.");
					}

					if (!this.scratchContent) {
						throw new Error("RecursiveGetTooltipContent returned true, but no content was set.")
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

	private onCameraChanged() {
		if (!ActionHandler.isGamepadActive || !this.scratchElement || this.scratchContent == "") {
			return;
		}

		// hide tooltip until we stop moving
		this.controller.hideTooltip();
		this.controller.showTooltipElement(this.scratchElement, this.scratchContent);
	}

	private onBlur() {
		this.hideTooltip();
	}

	private hideTooltip() {
		this.previousTarget?.removeEventListener('mouseleave', this.targetMouseLeaveListener);
		this.controller.hideTooltip();
		this.previousEventTarget = null;
		this.previousTarget = null;
		this.previousContent = ''
		this.scratchElement = null;
		this.scratchContent = "";
		this.isTouchTooltip = false;
	}

	private handleMouseLeave(event: MouseEvent) {
		// This event is for all intents and purposes a one-shot on the element.
		// If the user mouses over the element again then we can re-register the event.
		event.target?.removeEventListener('mouseleave', this.targetMouseLeaveListener);
		if (event.target == this.previousTarget) {
			this.hideTooltip();
		}
	}

	private handleScrollIntoView(event: CustomEvent) {
		// Wait a frame for new scroll layout to update, then update the focused tooltip
		waitForLayout(() => {
			if (this.previousTarget) {
				this.controller.showTooltipElement(this.previousTarget, this.previousContent);
			}
		});

		event.stopPropagation();
	}

	private onCursorUpdated(event: CursorUpdatedEvent) {
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
						throw new Error("RecursiveGetTooltipContent returned true, but no content was set.")
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

	mutatePreviousContent(newContent: string) {
		this.previousContent = newContent;
	}
}

class DefaultTooltipRenderer {

	/** Cached element for stylized text. */
	private textElement: HTMLElement;
	private previousElement?: HTMLElement;
	private previousElementTag: string = '';

	constructor() {
		this.textElement = document.createElement('div');
		this.textElement.style.pointerEvents = 'none';
	}

	render(context: HTMLElement, content: string): HTMLElement | null {
		const customElement: string | null = context.getAttribute('data-tooltip-component');
		if (customElement) {
			if (this.previousElementTag != customElement) {
				const div: HTMLElement = document.createElement(customElement);
				div.setAttribute('data-tooltip-content', content);
				this.previousElement = div;
				this.previousElementTag = customElement;
				return div;
			}

			if (!this.previousElement) {
				throw new Error("Expected this.previousElement to not be null.");
			}

			const prevContent: string | null = this.previousElement.getAttribute('data-tooltip-content');
			if (prevContent != content) {
				this.previousElement.setAttribute('data-tooltip-content', content);
			}
		} else {
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

enum ToolTipVisibilityState {
	Hidden,
	WaitingToShow,
	Shown,
	WaitingToExpire,
	WaitingToReset,
}

export class TooltipController {

	private observer: MutationObserver | null = null;
	private readonly observerConfig = { attributes: true, childList: true, subtree: true };

	private pointerOffsetX: number = 0;
	private pointerOffsetY: number = 0;

	private readonly fixedPosition: boolean = false;

	private readonly resetDelay: number = 0;
	private readonly transitionDelay: number = 0;
	private readonly expirationDelay: number = 0;

	private useTransitionDelay = true;

	/** Timeout handle for when waiting to 'reset' state. */
	private resetTimeout: number = 0;

	/** Timeout handle for when waiting to 'show' tooltip. */
	private showTimeout: number = 0;

	/** Timeout handle for when waiting to 'expire' tooltip. */
	private expirationTimeout: number = 0;

	/** Timeout handle for when waiting to actually hide tooltip. */
	private hideTimeout: number = 0;

	/** Animation frame handle for when the controller detects mutations in the tool-tip content. Queue a reposition in 2 frames. */
	private mutateRepositionHandle: number = 0;

	/** Animation frame handle for when the controller is showing a fresh tool-tip.  Delay 2 frames to position properly. */
	private showingHandle: number = 0;

	private readonly root: HTMLElement;
	private readonly content: HTMLElement;
	private readonly container: HTMLElement;
	private readonly driver: DefaultTooltipDriver;
	private readonly renderer: DefaultTooltipRenderer;

	private state = ToolTipVisibilityState.Hidden;
	private isToggledOn: boolean = true;

	private tooltipX: number = 0;
	private tooltipY: number = 0;
	private tooltipContext: HTMLElement | null = null;
	private tooltipContent: string = '';
	private tooltipAlignment: Alignment = Alignment.BottomRight;

	private tooltipAnchor: Anchor = Anchor.None;
	public get anchor() {
		return this.tooltipAnchor;
	}

	private transitionToShownHandler: TimerHandler = () => { this.transitionToShown() };
	private resetStateHandler: TimerHandler = () => { this.resetState() };
	private expirationHandler: TimerHandler = () => { this.expiration() };

	private repositionFunction: TooltipRepositionFunction = this.reposition;

	private activeDeviceChangeListener = this.onActiveDeviceTypeChanged.bind(this);

	private transitionToShown() {
		this.showTimeout = 0;
		this.immediatelyShowTooltip();
		this.state = ToolTipVisibilityState.Shown;
	}

	private resetState() {
		this.resetTimeout = 0;
		this.state = ToolTipVisibilityState.Hidden;
	}

	private expiration() {
		this.expirationTimeout = 0;
		this.hideTooltip();
	}

	constructor(params: TooltipControllerInitializationParams) {
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

	private checkParams(params: TooltipControllerInitializationParams) {
		if (params.tooltipRootElement == null || !(params.tooltipRootElement instanceof HTMLElement)) {
			throw new Error(`tooltipRootElement is a required value.`);
		}

		if (params.fixedPosition == true && params.containerElement != null) {
			throw new Error(`'containerElement' must remain null if 'fixedPosition' is true.`);
		}

		const checkDelay: (v: number | undefined, s: string) => void = (v: number | undefined, s: string) => {
			if (v && (v < 0 || v > 10000)) {
				throw new Error(`Invalid value for ${s}.`);
			}
		}

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
				this.observer.observe(this.content, this.observerConfig)
			}
		}

		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangeListener);

		this.driver.connect();
	}

	private onActiveDeviceTypeChanged(_event: ActiveDeviceTypeChangedEvent) {
		const forceTooltipOn = true;
		this.toggleTooltip(forceTooltipOn);
	}

	private onMutate(_mutations: MutationRecord[]) {
		this.root.style.visibility = 'hidden';
		this.mutateRepositionHandle = requestAnimationFrame(() => {
			this.mutateRepositionHandle = requestAnimationFrame(() => {
				this.mutateRepositionHandle = 0;

				if (this.state != ToolTipVisibilityState.Shown) {
					throw new Error("Expected State to be 'Shown'!");
				}

				this.repositionFunction();
				this.root.style.visibility = 'visible';
			})
		})
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

	private setElementToolTipCoords(contextRect: DOMRect) {
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

	private repositionTooltipElement() {
		if (!this.tooltipContext) {
			return;
		}

		const rect: DOMRect = this.root.getBoundingClientRect();
		const contextRect: DOMRect = this.tooltipContext.getBoundingClientRect();
		const containerRect: DOMRect = this.container.getBoundingClientRect();

		this.setElementToolTipCoords(contextRect);
		const prevAlignment = this.tooltipAlignment;
		const newAlignment: Alignment = this.verifyAlignment(this.tooltipAlignment, this.tooltipX, this.tooltipY, rect.width, rect.height, containerRect);

		if (newAlignment != this.tooltipAlignment) {
			this.tooltipAlignment = newAlignment;
			this.setElementToolTipCoords(contextRect);
		}
		const adjustedTipOffset = this.constrainTipToRect(containerRect);

		this.setTooltipStyle(adjustedTipOffset, prevAlignment);
	}

	showTooltipElement(element: HTMLElement, content: string) {
		this.repositionFunction = this.repositionTooltipElement;
		this.useTransitionDelay = false;

		let x: number = 0;
		let y: number = 0;

		const anchorAttr = RecursiveGetAttribute(element, 'data-tooltip-anchor');
		this.tooltipAnchor = anchorAttr ? this.parseAnchor(anchorAttr) : Anchor.None;

		if (this.tooltipAnchor != Anchor.None) {
			const anchorPosition: float2 = this.getAnchorPos(element);
			x = anchorPosition.x;
			y = anchorPosition.y;
			this.repositionFunction = this.repositionAnchored;
		}

		this.showTooltip(x, y, element, content);
	}

	showTooltipCoord(x: number, y: number, context: HTMLElement, content: string) {
		this.repositionFunction = this.reposition;
		this.useTransitionDelay = true;

		const anchorAttr = RecursiveGetAttribute(context, 'data-tooltip-anchor');
		this.tooltipAnchor = anchorAttr ? this.parseAnchor(anchorAttr) : Anchor.None;

		if (this.tooltipAnchor != Anchor.None) {
			// Show the tooltip anchored to the element by default, so it doesnt jump when repositioned
			this.showTooltipElement(context, content);
		} else {
			this.showTooltip(x, y, context, content);
		}
	}

	private getAnchorPos(element: HTMLElement): float2 {
		let pos: float2 = { x: 0, y: 0 };

		const elementRect: DOMRect = element.getBoundingClientRect();
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

	private showTooltip(x: number, y: number, context: HTMLElement, content: string) {
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

				const delay: number = (!this.useTransitionDelay || this.state == ToolTipVisibilityState.Hidden) ? showDelay : this.transitionDelay;

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

	toggleTooltip(force?: boolean) {
		this.isToggledOn = force ?? !this.isToggledOn;
		if (this.isToggledOn) {
			if (this.tooltipContext) {
				this.immediatelyShowTooltip();
				this.state = ToolTipVisibilityState.Shown;
			}
		} else {
			this.immediatelyHideTooltip();
			this.state = ToolTipVisibilityState.Hidden;
		}
	}

	private parseAlignment(alignment: string): Alignment {
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

	private parseAnchor(anchor: string): Anchor {
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

	private verifyAlignment(alignment: Alignment, x: number, y: number, width: number, height: number, containerRect: DOMRect): Alignment {
		// Compute all intersections for now as I'm thinking about creating some sort of bit-flag system for this.
		const cursorOffset = !ActionHandler.isGamepadActive ? { x: CURSOR_WIDTH, y: CURSOR_HEIGHT } : { x: 0, y: 0 }
		const intersectRight: boolean = (x + width + cursorOffset.x > containerRect.right);
		const intersectBottom: boolean = (y + height + cursorOffset.y > containerRect.bottom);
		const intersectTop: boolean = (y - height < containerRect.top);
		const intersectLeft: boolean = (x - width < containerRect.left);

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

	private reposition() {
		if (this.fixedPosition) {
			return;
		}

		const root: HTMLElement = this.root;
		const offsetX: number = this.pointerOffsetX;
		const offsetY: number = this.pointerOffsetY;

		// Fetch bounding volumes (note: these may be out of date.  If that's the case, oh well.  We always continue to reposition 2 frames after just in case).
		const rect: DOMRect = root.getBoundingClientRect();
		const containerRect: DOMRect = this.container.getBoundingClientRect();
		const prevAlignment = this.tooltipAlignment;
		this.tooltipAlignment = this.verifyAlignment(this.tooltipAlignment, this.tooltipX, this.tooltipY, rect.width + offsetX, rect.height + offsetY, containerRect);
		const adjustedTipOffset = this.constrainTipToRect(containerRect);
		this.setTooltipStyle(adjustedTipOffset, prevAlignment);
	}

	private repositionAnchored() {
		if (this.fixedPosition || !this.tooltipContext) {
			return;
		}

		const anchorPosition: float2 = this.getAnchorPos(this.tooltipContext);
		this.tooltipX = anchorPosition.x;
		this.tooltipY = anchorPosition.y;

		const root: HTMLElement = this.root;

		// Fetch bounding volumes (note: these may be out of date.  If that's the case, oh well.  We always continue to reposition 2 frames after just in case).
		const tipRect: DOMRect = root.getBoundingClientRect();
		const containerRect: DOMRect = this.container.getBoundingClientRect();

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
	private constrainTipToRect(constrainRect: DOMRect): float2 {
		// const needsCursorOffset = this.tooltipAlignment == Alignment.BottomRight || this.tooltipAlignment == Alignment.TopRight;
		const cursorOffset = !ActionHandler.isGamepadActive && this.tooltipAnchor == Anchor.None ? { x: CURSOR_WIDTH, y: CURSOR_HEIGHT } : { x: 0, y: 0 };
		const tipRect: DOMRect = this.root.getBoundingClientRect();
		const offset: float2 = { x: this.tooltipX + cursorOffset.x, y: this.tooltipY + cursorOffset.y };

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

		const intersectRight: boolean = (this.tooltipX + offset.x + tipRect.width > constrainRect.right);
		const intersectBottom: boolean = (this.tooltipY + offset.y + tipRect.height > constrainRect.bottom);
		const intersectTop: boolean = (this.tooltipY + offset.y < constrainRect.top);
		const intersectLeft: boolean = (this.tooltipX + offset.x < constrainRect.left);

		// If we still overflow in both horizontal or both vertical directions we have a bigger problem
		if (intersectBottom && intersectTop || intersectLeft && intersectRight) {
			console.error(`tooltip-controller: ERROR - tip does not fit on the screen! Start conversation with game design or UI design for alternate solutions!`);
			return { x: -1, y: -1 };
		}

		return offset;
	}

	private setTooltipStyle(offset: float2, prevAlignment: Alignment) {
		if (this.tooltipAlignment != prevAlignment) {
			this.root.classList.remove(
				'tooltip-align--top-left',
				'tooltip-align--top-right',
				'tooltip-align--bottom-left',
				'tooltip-align--bottom-right'
			);

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

	private immediatelyHideTooltip() {
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

	private immediatelyShowTooltip() {
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
		const newElement: HTMLElement | null = this.renderer.render(this.tooltipContext, this.tooltipContent);
		if (newElement) {
			if (this.observer) {
				this.observer.disconnect();
			}

			this.root.style.visibility = 'hidden';
			while (this.content.hasChildNodes()) {
				this.content.removeChild(this.content.lastChild!);
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

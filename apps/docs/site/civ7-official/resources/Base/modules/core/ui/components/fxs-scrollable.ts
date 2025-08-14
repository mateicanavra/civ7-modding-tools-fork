/**
 * @file fxs-scrollable.ts
 * @copyright 2020-2023, Firaxis Games
 * @description UI control for a scrollable area
 */

import { utils } from '/core/ui/graph-layout/utils.js';
import { InputEngineEvent, InputEngineEventName, NavigateInputEvent } from '/core/ui/input/input-support.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';

export enum resizeThumb {
	NONE = '0',
	RESIZE = '1'
}

/**
 * ScrollIntoViewEvent is fired when a child element is scrolled into view due to a focus change
 */
export class ScrollIntoViewEvent extends CustomEvent<never> {
	constructor() {
		super('scroll-into-view', { bubbles: true, cancelable: false });
	}
}

/**
 * ScrollAtBottomEvent is fired when the scrollable area is scrolled to the bottom.
 */
export class ScrollAtBottomEvent extends CustomEvent<never> {
	constructor() {
		super('scroll-at-bottom', { bubbles: true, cancelable: false });
	}
}

/**
 * ScrollExitBottomEvent is fired when the scrollable area is no longer at the bottom.
 */
export class ScrollExitBottomEvent extends CustomEvent<never> {
	constructor() {
		super('scroll-exit-bottom', { bubbles: true, cancelable: false });
	}
}

export class FxsScrollable extends Component {
	private static readonly MIN_SIZE_PIXELS = 24;
	private static readonly MIN_SIZE_OVERFLOW = 2;
	private static readonly DECORATION_SIZE = 24;

	/** scrollArea is the container that grows unbounded (important for ResizeObserver) */
	private scrollArea: HTMLElement;

	/** scrollAreaContainer is the container that scrolls and is the max height of its parent. */
	private scrollAreaContainer: HTMLElement;
	private scrollbarTrack: HTMLElement;
	private scrollbarThumb: HTMLElement;
	private thumbHighlight: HTMLElement;
	private thumbActive: HTMLElement;
	private navHelp: HTMLElement | null = null;

	private isDraggingScroll: boolean = false;
	private isMouseOver: boolean = false;
	private allowScroll: boolean = true;
	private scrollbarPrevVisibility = false;
	private isHandleGamepadPan: boolean = false;
	private allowMousePan: boolean = false;
	private allowScrollOnResizeWhenBottom: boolean = false;

	// #region Gamepad Pan Data
	private isPanning = false;
	private gamepadPanAnimationId = -1;
	private gamepadPanY = 0;
	private isStillPanningCheck = 0;
	private lastPanTimestamp = 0;
	private panRate = 0.75;
	// #endregion

	private mouseMoveListener = this.onMouseMove.bind(this);
	private mouseUpListener = this.onMouseUp.bind(this);
	private mouseEnterListener = this.onMouseEnter.bind(this);
	private mouseLeaveListener = this.onMouseLeave.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private scrollBarEngineInputListener = this.onScrollBarEngineInput.bind(this);
	private gamepadPanAnimationCallback = this.onGamepadPanUpdate.bind(this);
	private resizeObserver = new ResizeObserver(this.onResize.bind(this));

	private windowEngineInputListener = this.onWindowEngineInput.bind(this);

	private engineInputProxy?: HTMLElement;
	private scrollableAreaSize: number = 0;
	private scrollableContentSize: number = 0;
	private thumbRect?: DOMRect;

	private thumbSize: number = 0;
	private thumbDelta = {
		x: 0,
		y: 0
	};

	private maxScroll: number = 0;
	private scrollPosition: number = 0;
	private maxThumbPosition: number = 0;
	private thumbScrollPosition: number = 0;

	private dragInProgress: boolean = false;
	private touchDragY: number = 0;

	private isScrollAtBottom: boolean = true;

	private get proxyMouse() {
		return this.Root.getAttribute("proxy-mouse") == "true";
	}

	constructor(root: ComponentRoot) {
		super(root);

		const flexAttribute = this.Root.getAttribute('flex');
		const flexClass = flexAttribute && flexAttribute == 'initial' ? 'flex-initial' : 'flex-auto';

		this.Root.setAttribute("resize-thumb", resizeThumb.NONE);

		this.scrollbarThumb = document.createElement('div');
		this.scrollbarThumb.classList.add('fxs-scrollbar__thumb--vertical');

		const thumbInner = document.createElement('div');
		thumbInner.classList.add('fxs-scrollbar__thumb-bg--vertical', 'absolute', 'inset-0');
		this.scrollbarThumb.appendChild(thumbInner);

		this.thumbHighlight = document.createElement('div');
		this.thumbHighlight.classList.add('fxs-scrollbar__thumb-bg-highlight--vertical', 'absolute', 'inset-0');
		this.scrollbarThumb.appendChild(this.thumbHighlight);

		this.thumbActive = document.createElement('div');
		this.thumbActive.classList.add('fxs-scrollbar__thumb-bg-active--vertical', 'absolute', 'inset-0');
		this.scrollbarThumb.appendChild(this.thumbActive);

		this.scrollbarTrack = document.createElement('div');
		this.scrollbarTrack.className = 'fxs-scrollbar__track--vertical w-4 my-6';
		this.scrollbarTrack.appendChild(this.scrollbarThumb);

		const contentClass = this.Root.getAttribute('content-class') ?? '';
		this.scrollArea = document.createElement('div');
		this.scrollArea.classList.add('flex', 'flex-col', 'justify-start', 'pointer-events-auto', 'fxs-scrollable-content', 'pointer-events-auto');
		this.scrollArea.style.flexShrink = '0'; // if the scrollArea shrinks to fit its parent, we won't receive ResizeObserver events
		if (contentClass) {
			this.scrollArea.classList.add(...contentClass.split(' '));
		}
		this.scrollAreaContainer = document.createElement('div');
		this.scrollAreaContainer.classList.add('flex', 'flex-col', flexClass, 'fxs-scrollable-content-container', 'max-w-full', 'max-h-full', 'overflow-y-scroll');
		this.scrollAreaContainer.appendChild(this.scrollArea);

		this.attachChildEventListeners();
	}

	onInitialize() {
		// TODO Need a better way of classifying child content for the container.
		while (this.Root.hasChildNodes()) {
			const node = this.Root.firstChild;
			if (node) {
				this.scrollArea.appendChild(node);
			}
			else {
				break;
			}
		}

		this.Root.classList.add('relative', 'max-h-full', 'max-w-full', 'pointer-events-auto');
		if (this.scrollArea.lastElementChild) {
			this.scrollArea.lastElementChild.classList.add('fxs-scrollable-content--last');
		}
		this.Root.append(
			this.scrollAreaContainer,
			this.scrollbarTrack
		);

		if (!this.Root.hasAttribute('handle-gamepad-pan')) {
			this.Root.setAttribute('handle-gamepad-pan', 'true');
		}

		if (!this.Root.hasAttribute('attached-scrollbar')) {
			this.Root.setAttribute('attached-scrollbar', 'false');
		}
	}

	onAttach() {
		super.onAttach();

		// Hide the scrollbar on attach so that it will only show when there is valid data.
		this.hide();

		// Setups the visual since children are already attached...
		delayByFrame(this.resizeScrollThumb.bind(this), 2);

		// update when the scrollArea resizes
		// we need to observe the scrollArea because it is the one that grows unbounded
		// resizeObserver will only trigger if an element's clientHeight changes, not its scrollHeight
		this.resizeObserver.observe(this.scrollArea, { box: 'border-box' });

		window.addEventListener(InputEngineEventName, this.windowEngineInputListener);
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null) {
		if (name == "scrollpercent") {
			const value = newValue ? parseFloat(newValue) : 0;
			this.scrollToPercentage(value * this.maxScroll);
		}
		else if (name == "handle-gamepad-pan") {
			this.isHandleGamepadPan = newValue == "true";
			this.showScrollNavHelpElement(this.isHandleGamepadPan);
		}
		else if (name == "attached-scrollbar" && oldValue != newValue) {
			this.setIsAttachedLayout(newValue == "true");
		}
		else if (name == "allow-mouse-panning" && oldValue != newValue) {
			this.allowMousePan = newValue == "true";
		}
		else if (name == "scroll-on-resize-when-bottom") {
			this.allowScrollOnResizeWhenBottom = newValue == "true";
		}
	}

	onDetach() {
		this.resizeObserver.disconnect();

		window.removeEventListener(InputEngineEventName, this.windowEngineInputListener);

		if (this.engineInputProxy) {
			this.engineInputProxy.removeEventListener('engine-input', this.engineInputListener);
		}

		super.onDetach();
	}

	/**
	 * Sets a proxy for engine input events so they can be listened to without this element being in the focus tree.
	 * @param proxy The element to listen to engine input events on
	 */
	public setEngineInputProxy(proxy: HTMLElement | null) {
		if (this.engineInputProxy) {
			this.engineInputProxy.removeEventListener('engine-input', this.engineInputListener);
		}

		if (proxy) {
			this.engineInputProxy = proxy;
			this.engineInputProxy.addEventListener('engine-input', this.engineInputListener);
		}
	}

	private get currentScrollOnScrollAreaInPixels() {
		return this.scrollAreaContainer.scrollTop;
	}

	private set currentScrollOnScrollAreaInPixels(value) {
		this.scrollAreaContainer.scrollTop = value;
	}

	private get maxScrollOnScrollAreaInPixels() {
		return this.scrollArea.scrollHeight;
	}

	private get maxScrollTop() {
		return this.scrollAreaContainer.scrollHeight - this.scrollAreaContainer.clientHeight;
	}

	private getActiveDimension(rect: { height: number, width: number }) {
		return rect.height;
	}

	private onResize(_entries: ResizeObserverEntry[], _observer: ResizeObserver) {
		// the scroll area changed, so resize the scroll thumb
		const scrollWasAtbottom = this.isScrollAtBottom;
		this.isScrollAtBottom = false;
		delayByFrame(() => {
			this.resizeScrollThumb();
			if (this.allowScrollOnResizeWhenBottom && scrollWasAtbottom) {
				delayByFrame(() => {
					this.scrollToPercentage(1);
				}, 4);
			}
		}, 2);
	}

	/**
	 * Converts the mouse coordinates to a scroll percentage.
	 * @param event
	 */
	private mouseCoordinatesToScroll(event: MouseEvent): number {
		const mouseAreaRect: DOMRect = this.scrollbarTrack.getBoundingClientRect();
		return (event.clientY - mouseAreaRect.y + this.thumbDelta.y) / mouseAreaRect.height;
	}

	private onWindowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == "touch-complete") {
			this.thumbActive.classList.remove("opacity-100");
			this.isDraggingScroll = false;
			this.dragInProgress = false;
			inputEvent.preventDefault();
			inputEvent.stopPropagation();
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {

		if (inputEvent.detail.name == "scroll-pan" && this.isHandleGamepadPan) {
			if (this.allowScroll) {
				this.onGamepadPan(inputEvent);
			}

			inputEvent.stopPropagation();
			inputEvent.preventDefault();
			return;
		}

		// This needs START DRAG AND FINISH EVENT so needs to be done before the FINISH only check
		if (inputEvent.detail.name == "touch-pan" || (this.allowMousePan && inputEvent.detail.name == "mousebutton-left")) {
			this.onTouchOrMousePan(inputEvent);
			return;
		}

		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		const isProxy = inputEvent.target == this.engineInputProxy;

		const shouldHandleMouseWheel = this.isMouseOver || (this.proxyMouse && isProxy);
		const isMouseWheelEvent = inputEvent.detail.name == "mousewheel-up" || inputEvent.detail.name == "mousewheel-down";

		if (shouldHandleMouseWheel && isMouseWheelEvent) {
			if (this.allowScroll) {
				// If this is a proxy we need to apply the scroll
				if (isProxy) {
					const oldScroll = this.currentScrollOnScrollAreaInPixels;
					const newScroll = utils.clamp(oldScroll - inputEvent.detail.x, 0, this.maxScrollTop);
					this.currentScrollOnScrollAreaInPixels = newScroll;
				}

				this.setScrollThumbPosition();
				inputEvent.stopPropagation();
			}
			inputEvent.preventDefault();
		}

		// Only process camera pan and mouse wheel for input proxy
		if (isProxy) {
			return;
		}

		if (inputEvent.detail.name == 'mousebutton-left') {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onScrollBarEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == "touch-pan") {
			this.thumbActive.classList.add("opacity-100");
			const x: number = inputEvent.detail.x;
			const y: number = inputEvent.detail.y;
			const status: InputActionStatuses = inputEvent.detail.status;
			const thumbRect = this.scrollbarThumb.getBoundingClientRect();

			switch (status) {
				case InputActionStatuses.START:
					this.isDraggingScroll = true;
					this.thumbDelta.x = thumbRect.x - x;
					this.thumbDelta.y = thumbRect.y - y;
					inputEvent.preventDefault();
					inputEvent.stopPropagation();
					break;
				case InputActionStatuses.DRAG:
					if (this.isDraggingScroll) {
						const mouseAreaRect: DOMRect = this.scrollbarTrack.getBoundingClientRect();
						const scrollPercentage = (y - mouseAreaRect.y + this.thumbDelta.y) / mouseAreaRect.height;
						this.scrollToPercentage(scrollPercentage);
						inputEvent.preventDefault();
						inputEvent.stopPropagation();
					}
					break;
				default:
					break;
			}
			return;
		}
	}

	/**
	 * Attaches all event listeners for the component.
	 */
	private attachChildEventListeners() {
		this.scrollbarTrack.addEventListener('click', (event: MouseEvent) => {
			event.stopImmediatePropagation();
		});

		// Scroll
		this.Root.addEventListener('engine-input', this.engineInputListener);

		this.Root.addEventListener('mouseenter', this.mouseEnterListener);
		this.Root.addEventListener('mouseleave', this.mouseLeaveListener);

		// Clicking on the scrollbar container
		this.scrollbarTrack.addEventListener('mousedown', (event: MouseEvent) => {
			const scrollPercentage = this.mouseCoordinatesToScroll(event);
			this.scrollToPercentage(scrollPercentage);
		});
		this.scrollbarTrack.addEventListener(InputEngineEventName, this.scrollBarEngineInputListener)

		// Dragging the scroll widget
		this.scrollbarThumb.addEventListener('mousedown', (event: MouseEvent) => {
			this.scrollbarThumb.classList.add('fxs-scrollable-thumb--active');
			this.isDraggingScroll = true;

			const thumbRect = this.scrollbarThumb.getBoundingClientRect();
			this.thumbDelta.x = thumbRect.x - event.clientX;
			this.thumbDelta.y = thumbRect.y - event.clientY;

			window.addEventListener('mousemove', this.mouseMoveListener);
			// body and HtmlHtmlElement are ignored from gamecore (AppUI_ViewListener.cpp), cancelling the bubbling event.
			// We 'useCapture' here to always call the 'mouseup' event
			window.addEventListener('mouseup', this.mouseUpListener, true);
		});

		this.scrollbarThumb.addEventListener('mouseleave', () => {
			if (!this.isDraggingScroll) {
				this.scrollbarThumb.classList.add('fxs-scrollable-thumb--hover-off');
			}
		});

		this.scrollArea.addEventListener('focus', (event: FocusEvent) => {
			const target: HTMLElement | null = event.target as HTMLElement;
			if (target) {
				//TODO: we need to flag when and when not to use scrollInToView() somehow. Very tall items need to use keydown up and down to move scroll visual area instead. 

				// The scrolling to see the focused element should NOT happen if the said element is a slot (FxsSlot) because it is not the final focused element.
				// A FxsSlot always transfers the focus to one of its focusable element (cf. FxsSlot.onFocus()).
				// So we should wait for that child element to be focused before updating the scrolling (if needed / if the child element is not in the viewport).
				if (!target.hasAttribute('slot')) {
					//console.log(`Debugging help: scroll container sees a focus happening on ${target.className}`);
					this.scrollIntoView(target);
				}
			}
		}, true); //Use the capture phase, since focus does not bubble. 
	}

	/**
	 * Shows the scrollbar
	 */
	private show() {
		this.allowScroll = true;
		this.scrollbarTrack.classList.remove('hidden');
		this.scrollbarPrevVisibility = true;
	}

	/**
	 * Hides the scrollbar
	 */
	private hide() {
		this.allowScroll = false;
		this.scrollbarTrack.classList.add('hidden');
		this.scrollbarPrevVisibility = false;
	}

	/**
	 * On key down we scroll by the needed amount.
	 * @param {KeyboardEvent} event
	 */
	/** //TODO: When we update action-handler input cascade, we need to actually flow in to the
		  scrollables, to be able to scroll when not dependent on focus.  */
	/*onKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLTextAreaElement) {
			this.setScrollThumbPosition();
			return;
		}

		if (event.keyCode === KeyboardKeys.Home) {
			this.scrollToPercentage(0);
			return;
		}

		if (event.keyCode === KeyboardKeys.End) {
			this.scrollToPercentage(1);
			return;
		}

		const verticalScroll = Number(event.keyCode === KeyboardKeys.DownArrow) - Number(event.keyCode === KeyboardKeys.UpArrow);
		const horizontalScroll = Number(event.keyCode === KeyboardKeys.RightArrow) - Number(event.keyCode === KeyboardKeys.LeftArrow);

		const scrollChange = this.isVertical ? verticalScroll : horizontalScroll;

		if (scrollChange == 0) {
			return;
		}

		this.scrollToPercentage(this.scrollPosition + scrollChange / 100);
	}*/

	private onMouseMove(event: MouseEvent) {
		if (this.isDraggingScroll) {
			const scrollPercentage = this.mouseCoordinatesToScroll(event);
			this.scrollToPercentage(scrollPercentage);
		}
	}

	private onMouseUp(event: MouseEvent) {
		this.isDraggingScroll = false;
		window.removeEventListener('mousemove', this.mouseMoveListener);
		window.removeEventListener('mouseup', this.mouseUpListener);
		event.stopPropagation();
		this.reset();
	}

	private onMouseEnter(): void {
		this.isMouseOver = true;
	}

	private onMouseLeave(): void {
		this.isMouseOver = false;
	}

	private setIsAttachedLayout(isAttached: boolean) {
		this.Root.classList.toggle("flex", isAttached);
		this.Root.classList.toggle("flex-row", isAttached);

		this.scrollbarTrack.classList.toggle("absolute", !isAttached);
		this.scrollbarTrack.classList.toggle("inset-y-0", !isAttached);
		this.scrollbarTrack.classList.toggle("-right-1\\.5", !isAttached);
		this.scrollbarTrack.classList.toggle("relative", isAttached);

		this.scrollAreaContainer.classList.toggle("flex-auto", isAttached);
	}

	/**
	 * Scrolls to a given percentage.
	 * @param {number} position - Position in percentage - from 0 to 1.
	 */
	scrollToPercentage(position: number) {
		this.scrollPosition = utils.clamp(position, 0, isNaN(this.maxScroll) ? 0 : this.maxScroll);
		this.thumbScrollPosition = utils.clamp(position, 0, isNaN(this.maxThumbPosition) ? 0 : this.maxThumbPosition);

		const calcScrollPosition: number = this.scrollPosition / this.maxScroll;
		if (!isNaN(calcScrollPosition)) {
			this.scrollArea.setAttribute("current-scroll-position", (calcScrollPosition).toString());
		}

		// Here ~~ is a faster alternative to Math.floor
		const scrollPositionInPixels = ~~(this.maxScrollOnScrollAreaInPixels * this.scrollPosition);

		this.currentScrollOnScrollAreaInPixels = scrollPositionInPixels;
		requestAnimationFrame(() => {
			const parentRect = this.scrollbarThumb.parentElement?.getBoundingClientRect();
			const offset = this.thumbScrollPosition * (parentRect?.height ?? 0);
			this.scrollbarThumb.style.transform = `translateY(${offset}px)`;
			//this.scrollbarThumb.style.topPERCENT = this.thumbScrollPosition * 100;
		})

		this.resolveIsScrollAtBottom();
	}

	private setScrollThumbPosition() {

		if (this.maxScrollOnScrollAreaInPixels == 0) {
			this.scrollPosition = 0;
			this.thumbScrollPosition = 0;
			this.scrollbarThumb.style.transform = 'none';
		}
		else {
			this.scrollPosition = this.currentScrollOnScrollAreaInPixels / this.maxScrollOnScrollAreaInPixels;
			this.thumbScrollPosition = utils.clamp(this.scrollPosition, 0, isNaN(this.maxThumbPosition) ? 0 : this.maxThumbPosition);

			const parentRect = this.scrollbarThumb.parentElement?.getBoundingClientRect();
			const offset = this.thumbScrollPosition * (parentRect?.height ?? 0);
			this.scrollbarThumb.style.transform = `translateY(${offset}px)`;
		}

		this.resolveIsScrollAtBottom();
	}

	scrollIntoView(target: HTMLElement) {
		const areaRect: DOMRect = this.Root.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();

		// empty scrollableContentSize means we called resizeScrollThumb when the scrollable was not yet visible
		// we need to call resizeScrollThumb again to get the correct scrollableContentSize
		if (this.scrollableContentSize === 0) {
			this.resizeScrollThumb();
		}

		if (targetRect.top < areaRect.top || targetRect.bottom > areaRect.bottom) {
			let distToMove: number = 0;

			if (targetRect.top < areaRect.top) {
				distToMove = targetRect.top - areaRect.top; // will be negative 
			}

			if (targetRect.bottom > areaRect.bottom) {
				distToMove = targetRect.bottom - areaRect.bottom;
			}

			const anchorAsPercent: number = distToMove / this.scrollableContentSize;
			this.scrollToPercentage(this.scrollPosition + anchorAsPercent);

			target.dispatchEvent(new ScrollIntoViewEvent());
		}
	}

	/**
	 * Resets the styles and thumb delta.
	 */
	private reset() {
		if (this.isDraggingScroll) {
			this.scrollbarThumb.classList.remove('fxs-scrollable-thumb--active');
			this.isDraggingScroll = false;
		}

		this.thumbDelta.x = 0;
		this.thumbDelta.y = 0;
	}

	private setScrollBoundaries() {
		this.thumbRect = this.scrollbarThumb.getBoundingClientRect();
		this.thumbSize = this.getActiveDimension(this.thumbRect);

		this.maxScroll = (this.scrollableContentSize - this.thumbSize) / this.scrollableContentSize;

		const scrollTrackAreaSize = this.getActiveDimension(this.scrollbarTrack.getBoundingClientRect());
		this.maxThumbPosition = (scrollTrackAreaSize - this.thumbSize) / scrollTrackAreaSize;

		this.Root.dispatchEvent(new CustomEvent('scroll-is-ready', { bubbles: true }));
	}

	private setScrollData() {
		this.setScrollBoundaries();
		this.setScrollThumbPosition();
	}

	/**
	 * Resizes the scrollbar thumb
	 * @param shouldSetScrollPositionFromLayout
	 * 
	 */
	resizeScrollThumb() {
		const newScrollSize = this.scrollAreaContainer.clientHeight;

		if (this.scrollableAreaSize != newScrollSize) {
			this.scrollableAreaSize = newScrollSize;
		}

		this.scrollableContentSize = this.getActiveDimension({
			width: this.scrollAreaContainer.scrollWidth,
			height: this.scrollAreaContainer.scrollHeight
		});

		const scrollTrackAreaSize = newScrollSize - (Layout.pixelsToScreenPixels(FxsScrollable.DECORATION_SIZE) * 2);
		const scrollbarRatio = (this.scrollableAreaSize / this.maxScrollOnScrollAreaInPixels);
		const scrollbarSize = Math.max(scrollTrackAreaSize * scrollbarRatio, Layout.pixelsToScreenPixels(FxsScrollable.MIN_SIZE_PIXELS));

		const showScrollbar = scrollTrackAreaSize - scrollbarSize >= FxsScrollable.MIN_SIZE_OVERFLOW;
		if (showScrollbar != this.scrollbarPrevVisibility) {
			if (showScrollbar) {
				this.show();
			} else {
				this.hide();
			}
		}

		if (showScrollbar) {
			// using a percentage size here means the scrollbar will always be the same size relative to the scrollArea
			// even if the parent container changes size
			this.scrollbarThumb.style.heightPERCENT = scrollbarRatio * 100;
		}

		// We need to delay setting the scroll data to know how big the scrollbar thumb will be.
		delayByFrame(() => {
			// Due to the delay, this component may no longer be attached to the DOM.
			if (this.Root.isConnected) {
				this.setScrollData();
			}
		}, 3);
	}

	private onTouchOrMousePan(inputEvent: InputEngineEvent) {
		const x: number = inputEvent.detail.x;
		const y: number = inputEvent.detail.y;
		const status: InputActionStatuses = inputEvent.detail.status;
		this.thumbActive.classList.add("opacity-100");

		switch (status) {
			case InputActionStatuses.START:
				const scrollAreaRect: DOMRect = this.scrollArea.getBoundingClientRect();
				if (x >= scrollAreaRect.left && x <= scrollAreaRect.right &&
					y >= scrollAreaRect.top && y <= scrollAreaRect.bottom) {
					this.touchDragY = y;
					this.dragInProgress = true;
					inputEvent.preventDefault();
					inputEvent.stopPropagation();
				}
				break;
			case InputActionStatuses.DRAG:
				if (this.dragInProgress && !this.isDraggingScroll) {
					this.currentScrollOnScrollAreaInPixels += this.touchDragY - y;
					this.setScrollThumbPosition();
					this.touchDragY = y;
					inputEvent.preventDefault();
					inputEvent.stopPropagation();
				}
				if (this.isDraggingScroll) {
					const mouseAreaRect: DOMRect = this.scrollbarTrack.getBoundingClientRect();
					const scrollPercentage = (y - mouseAreaRect.y + this.thumbDelta.y) / mouseAreaRect.height;
					this.scrollToPercentage(scrollPercentage);
					inputEvent.preventDefault();
					inputEvent.stopPropagation();
				}
				break;
			default:
				break;
		}
	}

	private onGamepadPan(inputEvent: InputEngineEvent | NavigateInputEvent): boolean {
		switch (inputEvent.detail.status) {
			case InputActionStatuses.START:
				this.lastPanTimestamp = performance.now();
				this.isPanning = true;
				this.gamepadPanY = inputEvent.detail.y;
				if (this.gamepadPanAnimationId == -1) {
					this.gamepadPanAnimationId = requestAnimationFrame(this.gamepadPanAnimationCallback);
				}
				break;
			case InputActionStatuses.UPDATE:
				this.gamepadPanY = inputEvent.detail.y;
				break;
			case InputActionStatuses.FINISH:
				this.isPanning = false;
				this.gamepadPanY = 0;
				this.isStillPanningCheck = 0;
				break
		}

		return false;
	}

	/**
	 * onGamepadPanUpdate updates the scroll position at every frame until the pan is finished
	 * 
	 * This results in smoother scrolling when using a gamepad, as UPDATE input events are not sent out every frame.
	 */
	private onGamepadPanUpdate(timestamp: DOMHighResTimeStamp) {
		// Check if we are still panning every 10 frames
		if (this.isStillPanningCheck >= 10) {
			// We are still panning if the active element (focus) is still within the scrollable
			this.isPanning = this.Root == document.activeElement || this.Root.contains(document.activeElement);
			this.isStillPanningCheck = 0;
		}

		if (this.isPanning) {
			if (this.engineInputProxy == undefined) {
				this.isStillPanningCheck += 1;
			}
			this.gamepadPanAnimationId = requestAnimationFrame(this.gamepadPanAnimationCallback);
			const diff = timestamp - this.lastPanTimestamp;
			this.lastPanTimestamp = timestamp;
			this.currentScrollOnScrollAreaInPixels -= (this.gamepadPanY * diff * this.panRate);
			this.setScrollThumbPosition();
		} else {
			this.isStillPanningCheck = 0;
			this.gamepadPanY = 0;
			this.gamepadPanAnimationId = -1;
		}
	}

	getIsScrollAtBottom(): boolean {
		return this.isScrollAtBottom;
	}

	private resolveIsScrollAtBottom() {
		if (this.isScrollAtBottom && (this.currentScrollOnScrollAreaInPixels < this.maxScrollTop)) {
			this.isScrollAtBottom = false;
			this.Root.dispatchEvent(new ScrollExitBottomEvent());
		} else if (!this.isScrollAtBottom && this.currentScrollOnScrollAreaInPixels >= this.maxScrollTop) {
			this.isScrollAtBottom = true;
			this.Root.dispatchEvent(new ScrollAtBottomEvent());
		}
	}

	private showScrollNavHelpElement(enabled: boolean) {
		if (enabled) {
			if (!this.navHelp) {
				this.navHelp = document.createElement('fxs-nav-help');
				this.navHelp.setAttribute('hide-if-not-allowed', 'true');
				this.navHelp.classList.add("absolute", "top-1\\/2", "-left-1\\.5", "-translate-y-1\\/2")
			}
			this.scrollbarThumb.append(this.navHelp);
			this.navHelp.setAttribute("action-key", 'inline-scroll-pan');
		} else {
			this.navHelp?.remove();
		}
	}
}

Controls.define('fxs-scrollable', {
	createInstance: FxsScrollable,
	description: 'A scrollable container that shows a scrollbar',
	classNames: ['fxs-scrollable', 'fxs-scrollable-container'],
	attributes: [
		{
			name: 'scrollpercent'
		},
		{
			name: 'handle-gamepad-pan'
		},
		{
			name: 'allow-mouse-panning',
			description: "If set to 'true', this will enable scrolling by dragging with the mosue on the background"
		},
		{
			name: 'attached-scrollbar',
			description: "if set to 'true', the scrollbar will be attached to the container and take up space, instead of floating a set distance away"
		},
		{
			name: 'scroll-on-resize-when-bottom',
			description: "if the scroll is at bottom, we auto scroll at bottom on resize mutation observer"
		},
		{
			name: 'scroll-on-child-change-when-bottom',
			description: "if the scroll is at bottom, we auto scroll at bottom on child change mutation observer"
		}
	],
	images: [
		'fs://game/base_scrollbar-track.png',
		'fs://game/base_scrollbar-handle-focus.png',
		'fs://game/base_scrollbar-handle.png'
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-scrollable': ComponentRoot<FxsScrollable>
	}
	interface HTMLElementEventMap {
		'scroll-at-bottom': ScrollAtBottomEvent;
		'scroll-exit-bottom': ScrollExitBottomEvent;
	}
}
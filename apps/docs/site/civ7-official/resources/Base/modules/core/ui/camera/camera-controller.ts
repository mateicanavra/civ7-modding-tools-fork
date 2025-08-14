/**
 * @file Camera Controller
 * @copyright 2021-2025, Firaxis Games
 * @description Handles camera movement triggered by input actions
 */
import { IEngineInputHandler, InputEngineEvent, InputEngineEventName, NavigateInputEvent } from '/core/ui/input/input-support.js';
import ViewManager from '/core/ui/views/view-manager.js';

enum DragType {
	None,
	Pan,
	Rotate,
	Swipe
};

const cameraSwipeMinimumVelocity: number = 5;
const zoomRate: number = 0.3;
const panModifier: number = 10;

enum PanDirection {
	None = 0b00000000,
	Up = 0b00000001,
	Down = 0b00000010,
	Left = 0b00000100,
	Right = 0b00001000
}

enum ZoomType {
	None,
	In,
	Out
}

class CameraControllerSingleton implements IEngineInputHandler {

	private static instance: CameraControllerSingleton;

	private keyboardPanDirection = PanDirection.None;
	private zoomInProgress = ZoomType.None;

	private currentDragType: DragType = DragType.None;
	private lastMouseDragPos: float2 = { x: 0, y: 0 };
	private keyboardCameraModifierActive: boolean = false;
	private gamepadCameraPan: float2 = { x: 0, y: 0 };

	private panSpeed: number = this.getModifiedPanSpeed();

	private swipeVelocity: float2 = { x: 0, y: 0 };

	private engineInputListener = this.onEngineInput.bind(this);
	private updateFrameListener = this.onUpdateFrame.bind(this);
	private updateFrameEventHandle: EventHandle | null = null;;

	private constructor() {
		engine.whenReady.then(() => { this.onReady(); });
	}

	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!CameraControllerSingleton.instance) {
			CameraControllerSingleton.instance = new CameraControllerSingleton();
		}
		return CameraControllerSingleton.instance;
	}

	private onReady() {
		window.addEventListener(InputEngineEventName, this.engineInputListener);
		window.addEventListener('camera-drag-mouse', (event: CustomEvent) => { this.dragMouse(event) });
		window.addEventListener('camera-drag-mouse-start', (event: CustomEvent) => { this.dragMouseStart(event) });
		window.addEventListener('camera-drag-mouse-end', () => { this.dragMouseEnd() });
		window.addEventListener('camera-drag-mouse-swipe', (event: CustomEvent) => { this.dragMouseSwipe(event) });
	}

	/**
	 * Get the configuration pan speed and modify it to an appropriate value
	 */
	private getModifiedPanSpeed(): number {
		return Configuration.getUser().cameraPanningSpeed * panModifier;
	}

	/**
	 * Starts listening for UpdateFrame so we can start panning
	 */
	private startPanning() {
		if (this.updateFrameEventHandle) {
			// Started panning
			return;
		}
		this.panSpeed = this.getModifiedPanSpeed();
		if (!this.updateFrameEventHandle) {
			this.updateFrameEventHandle = engine.on('UpdateFrame', this.updateFrameListener);
		}
	}

	/**
	 * Per frame update as long as pan button is pressed.
	 */
	private onUpdateFrame(frameDelta: DOMHighResTimeStamp) {
		if (!ViewManager.isWorldInputAllowed) {
			this.updateFrameEventHandle?.clear();
			this.updateFrameEventHandle = null;
			return;
		}

		// Only make subsquent frame request if a pan operation is occurring
		if (this.keyboardPanDirection != PanDirection.None) {
			let panAmount = { x: 0, y: 0 };
			const panSpeed = this.panSpeed * frameDelta;
			if ((this.keyboardPanDirection & PanDirection.Up) == PanDirection.Up) { panAmount.y = panAmount.y + panSpeed };
			if ((this.keyboardPanDirection & PanDirection.Down) == PanDirection.Down) { panAmount.y = panAmount.y - panSpeed };
			if ((this.keyboardPanDirection & PanDirection.Left) == PanDirection.Left) { panAmount.x = panAmount.x - panSpeed };
			if ((this.keyboardPanDirection & PanDirection.Right) == PanDirection.Right) { panAmount.x = panAmount.x + panSpeed };
			if (panAmount.x != 0 || panAmount.y != 0) {
				Camera.panFocus(panAmount);
			}
		} else if (this.gamepadCameraPan.x != 0 || this.gamepadCameraPan.y != 0) {
			const panSpeed: number = this.panSpeed * frameDelta;
			const panAmount: float2 = { x: this.gamepadCameraPan.x * panSpeed, y: this.gamepadCameraPan.y * panSpeed };
			Camera.panFocus(panAmount);
		} else if (this.currentDragType == DragType.Swipe) {
			this.handleSwipe(frameDelta);
		} else {
			this.updateFrameEventHandle?.clear();
			this.updateFrameEventHandle = null;
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		switch (inputEvent.detail.name) {
			case 'keyboard-camera-modifier':
				this.onKeyboardCameraModifier(inputEvent.detail.status);
				break;
		}
	}

	private handleSwipe(timeStampDiff: number) {
		let panAmount = { x: 0, y: 0 };

		panAmount.x = this.swipeVelocity.x != 0 ? this.swipeVelocity.x * timeStampDiff / 1000 : 0;
		panAmount.y = this.swipeVelocity.y != 0 ? this.swipeVelocity.y * timeStampDiff / 1000 : 0;

		if ((Math.abs(panAmount.x) + Math.abs(panAmount.y)) < cameraSwipeMinimumVelocity) {
			this.currentDragType = DragType.None;
		} else {
			this.swipeVelocity.x -= panAmount.x;
			this.swipeVelocity.y -= panAmount.y;

			Camera.panFocus(panAmount);
		}
	}

	private onKeyboardCameraModifier(status: InputActionStatuses) {
		if (status == InputActionStatuses.START) {
			this.keyboardCameraModifierActive = true;
		} else if (status == InputActionStatuses.FINISH) {
			this.keyboardCameraModifierActive = false;
		}
	}

	private onGamepadCameraPan(status: number, panDir: float2) {
		switch (status) {
			case InputActionStatuses.START:
			case InputActionStatuses.UPDATE:
				this.gamepadCameraPan = panDir;
				this.startPanning();
				break;
			case InputActionStatuses.FINISH:
				this.gamepadCameraPan = { x: 0, y: 0 };
				break;
		}
	}

	private keyboardPanUp(event: CustomEvent) {
		const status: InputActionStatuses = event.detail.status;
		if (status == InputActionStatuses.START) {
			this.keyboardPanDirection |= PanDirection.Up;
			this.startPanning();
		} else if (status == InputActionStatuses.FINISH) {
			this.keyboardPanDirection ^= PanDirection.Up;
		}
	}

	private keyboardPanDown(event: CustomEvent) {
		const status: InputActionStatuses = event.detail.status;
		if (status == InputActionStatuses.START) {
			this.keyboardPanDirection |= PanDirection.Down;
			this.startPanning();
		} else if (status == InputActionStatuses.FINISH) {
			this.keyboardPanDirection ^= PanDirection.Down;
		}
	}

	private keyboardPanLeft(event: CustomEvent) {
		const status: InputActionStatuses = event.detail.status;
		if (status == InputActionStatuses.START) {
			this.keyboardPanDirection |= PanDirection.Left;
			this.startPanning();
		} else if (status == InputActionStatuses.FINISH) {
			this.keyboardPanDirection ^= PanDirection.Left;
		}
	}

	private keyboardPanRight(event: CustomEvent) {
		const status: InputActionStatuses = event.detail.status;
		if (status == InputActionStatuses.START) {
			this.keyboardPanDirection |= PanDirection.Right;
			this.startPanning();
		} else if (status == InputActionStatuses.FINISH) {
			this.keyboardPanDirection ^= PanDirection.Right;
		}
	}

	private cameraRotate(status: number, x: number) {
		if (!ViewManager.isWorldInputAllowed) {
			return;
		}
		if (status == InputActionStatuses.FINISH) {
			Camera.rotate(0, false);
		} else {
			Camera.rotate(x, true);
		}
	}

	private cameraZoomIn(status: InputActionStatuses, x: number) {
		if (!ViewManager.isWorldInputAllowed || this.zoomInProgress == ZoomType.Out) {
			return;
		}

		this.zoomInProgress = ZoomType.In;
		let zoomValue: number = x;

		if ((status == InputActionStatuses.START || status == InputActionStatuses.UPDATE) && zoomValue == 0) {
			// zoom can be zero if we use buttons for the camera zoom actions (eg switch ZL/ZR) so set it to 1 in this case
			zoomValue = 1;
		}

		const cameraState: CameraState = Camera.getState();
		const amount: number = Math.max(cameraState.zoomLevel - (zoomRate * zoomValue), 0.0);
		Camera.zoom(amount);

		if (status == InputActionStatuses.FINISH) {
			this.zoomInProgress = ZoomType.None;
		}
	}

	private cameraZoomOut(status: number, x: number) {
		if (!ViewManager.isWorldInputAllowed || this.zoomInProgress == ZoomType.In) {
			return;
		}

		this.zoomInProgress = ZoomType.Out;
		let zoomValue: number = x;

		if ((status == InputActionStatuses.START || status == InputActionStatuses.UPDATE) && zoomValue == 0) {
			// zoom can be zero if we use buttons for the camera zoom actions (eg switch ZL/ZR) so set it to 1 in this case
			zoomValue = 1;
		}

		const cameraState: CameraState = Camera.getState();
		const amount: number = Math.min(cameraState.zoomLevel + (zoomRate * zoomValue), 1.0);
		Camera.zoom(amount);

		if (status == InputActionStatuses.FINISH) {
			this.zoomInProgress = ZoomType.None;
		}
	}

	private panToMouse(event: CustomEvent) {
		if (event.detail.x && event.detail.y && event.detail.status == InputActionStatuses.FINISH && ViewManager.isWorldInputAllowed) {
			const plotCoords: PlotCoord | null = Camera.pickPlotFromPoint(event.detail.x, event.detail.y);
			if (plotCoords) {
				Camera.lookAtPlot(plotCoords);
			}
		}
	}

	private dragMouse(event: CustomEvent) {
		if (event.detail.x && event.detail.y) {
			if (this.currentDragType == DragType.Pan) {
				// Pan the camera
				const nx: number = event.detail.x / window.innerWidth;
				const ny: number = event.detail.y / window.innerHeight;
				const newMouseDragPos: float2 = { x: nx, y: ny };
				Camera.dragFocus(this.lastMouseDragPos, newMouseDragPos);
				this.lastMouseDragPos = newMouseDragPos;
			}
		}
	}

	private isOnUI(x: number, y: number): boolean {
		const target: Element | null = document.elementFromPoint(x, y);
		return !(target == document.documentElement || target == document.body || target == null || target.hasAttribute("data-pointer-passthrough"));
	}

	private dragMouseStart(event: CustomEvent) {
		if (event.detail.x && event.detail.y) {
			if (this.isOnUI(event.detail.x, event.detail.y)) {
				return;
			}

			if (this.keyboardCameraModifierActive) {
				// Do rotate drag if the modifier is active
				this.currentDragType = DragType.Rotate;
			} else {
				// Else do normal pan drag
				this.currentDragType = DragType.Pan;
				const nx: number = event.detail.x / window.innerWidth;
				const ny: number = event.detail.y / window.innerHeight;
				this.lastMouseDragPos = { x: nx, y: ny };
			}
		}
	}

	private dragMouseEnd() {
		this.currentDragType = DragType.None;
	}

	private dragMouseSwipe(event: CustomEvent) {
		this.swipeVelocity.x = -event.detail.x;
		this.swipeVelocity.y = event.detail.y;

		this.currentDragType = DragType.Swipe;
		this.startPanning();
	}

	private handleTouchPan(inputEvent: InputEngineEvent) {
		switch (inputEvent.detail.status) {
			case InputActionStatuses.START:
				this.dragMouseStart(inputEvent);
				break;
			case InputActionStatuses.DRAG:
				this.dragMouse(inputEvent);
				break;
			case InputActionStatuses.FINISH:
				this.dragMouseEnd();
				break;
			default:
				break;
		}
	}

	/**
	 *  @returns true if still live, false if input should stop.
	 */
	handleInput(inputEvent: InputEngineEvent): boolean {
		switch (inputEvent.detail.name) {
			case 'mousebutton-middle':
				this.panToMouse(inputEvent);
				return false;
			case 'keyboard-nav-up':
				this.keyboardPanUp(inputEvent);
				return false;
			case 'keyboard-nav-down':
				this.keyboardPanDown(inputEvent);
				return false;
			case 'keyboard-nav-right':
				this.keyboardPanRight(inputEvent);
				return false;
			case 'keyboard-nav-left':
				this.keyboardPanLeft(inputEvent);
				return false;
			case 'camera-pan':
				this.onGamepadCameraPan(inputEvent.detail.status, { x: inputEvent.detail.x, y: inputEvent.detail.y });
				return false;
			case 'camera-rotate':
				this.cameraRotate(inputEvent.detail.status, inputEvent.detail.x);
				return false;
			case 'camera-zoom-in':
			case 'touch-pinch-in':
				this.cameraZoomIn(inputEvent.detail.status, inputEvent.detail.x);
				return false;
			case 'camera-zoom-out':
			case 'touch-pinch-out':
				this.cameraZoomOut(inputEvent.detail.status, inputEvent.detail.x);
				return false;
			case 'touch-pan':
				this.handleTouchPan(inputEvent);
				return false;
			case 'touch-swipe':
				this.dragMouseSwipe(inputEvent);
				return false;
			case 'touch-touch':
				this.dragMouseEnd();
				return true;
		}

		return true;
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	handleNavigation(_navigationEvent: NavigateInputEvent): boolean {
		return true;
	}
}

const CameraController = CameraControllerSingleton.getInstance();
export { CameraController as default };

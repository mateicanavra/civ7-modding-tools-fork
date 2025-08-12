/**
 * @file utilities-frame.ts
 * @copyright 2023, Firaxis Games
 * @description Utilties for customizing UI frames
 */
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import FocusManager from '/core/ui/input/focus-manager.js';
/**
 * Add this to any panel extension to add the ability to drag the window around the screen by grabbing the header with Right Click. Returns a function to remove event listeners.
 * @param root the root of the element you wish to make draggable. All that is required is a header.
 * @param selector the query of the element you wish to click and drag for dragability.
 */
export function MakeDraggable(root, selector) {
    //setup
    let prevX;
    let prevY;
    let draggable;
    let dragArea;
    requestAnimationFrame(() => {
        dragArea = root.querySelector(selector);
        if (!dragArea) {
            console.error("MakeDraggable cannot grab class of passed in, even after animation frame.", selector);
        }
        else {
            dragArea.style.pointerEvents = "auto";
            updateNavTray();
        }
    });
    const updateNavTray = () => {
        NavTray.clear();
        NavTray.addOrUpdateToggleTooltip(draggable ? "LOC_UI_DRAG_STOP" : "LOC_UI_DRAG_START");
    };
    //header check
    const onMouseDown = (event) => {
        if (event.target instanceof HTMLElement) {
            draggable = dragArea === event.target;
        }
        event.preventDefault();
        event.stopPropagation();
    };
    const endDrag = () => {
        draggable = false;
        updateNavTray();
    };
    const onInputAction = (name, status, x, y) => {
        if (name.substr(0, 4) == "nav-" && draggable) {
            const rect = root.getBoundingClientRect();
            const startLeft = rect.left;
            const startTop = rect.top;
            // How many pixels the joystick movement allows
            const PX_FACTOR = 120;
            if (!prevX) {
                prevX = startLeft;
                prevY = startTop;
            }
            else {
                const newX = -(x * PX_FACTOR);
                const newY = y * PX_FACTOR;
                root.style.leftPX = startLeft - newX;
                prevX = newX;
                root.style.topPX = startTop - newY;
                prevY = newY;
                if (root.style.right != "initial") {
                    root.style.right = "initial";
                }
            }
        }
        if (name != "mousebutton-right" || status != InputActionStatuses.DRAG || !draggable) {
            return;
        }
        if (!prevX) {
            prevX = x;
            prevY = y;
        }
        else {
            const newX = prevX - x;
            const newY = prevY - y;
            const rect = root.getBoundingClientRect();
            root.style.leftPX = rect.left - newX;
            prevX = x;
            root.style.topPX = rect.top - newY;
            prevY = y;
            if (root.style.right != "initial") {
                root.style.right = "initial";
            }
        }
    };
    const toggleFocus = () => {
        if (draggable) {
            // blocks the plot cursor on dragging 
            root.setAttribute("tabindex", "-1");
            FocusManager.setFocus(root);
        }
        else {
            FocusManager.SetWorldFocused();
        }
        updateNavTray();
    };
    // Prevents below screens taking the drag action as closing the view/panel
    const onEngineInput = (inputEvent) => {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == "mousebutton-right" && dragArea === inputEvent.target) {
            inputEvent.preventDefault();
            inputEvent.stopPropagation();
        }
        if (inputEvent.detail.name == "toggle-tooltip") {
            draggable = !draggable;
            toggleFocus();
            inputEvent.preventDefault();
            inputEvent.stopPropagation();
        }
    };
    engine.on("InputAction", onInputAction);
    root.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', endDrag, true);
    window.addEventListener(ActiveDeviceTypeChangedEventName, endDrag);
    window.addEventListener(InputEngineEventName, onEngineInput);
    return () => {
        engine.off("InputAction", onInputAction);
        root.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', endDrag);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, endDrag);
        window.removeEventListener(InputEngineEventName, onEngineInput);
    };
}
/**
 * Add this to any panel extension to add the ability to resize the window by clicking on the bottom-right corner. Returns a function to remove event listeners.
 * @param root the root of the element you wish to make draggable.
 */
export function MakeResizeable(root) {
    let prevX;
    let prevY;
    let draggable;
    let dx;
    let dy;
    const resizer = document.createElement("div");
    resizer.classList.add("resizer");
    root.appendChild(resizer);
    let onMouseDown = (event) => {
        prevX = null;
        prevY = null;
        if (event.target instanceof HTMLElement) {
            draggable = event.target.classList.contains("resizer");
        }
    };
    root.addEventListener('mousedown', onMouseDown);
    engine.on("InputAction", (name, status, x, y) => {
        if (name != "mousebutton-right" || status != InputActionStatuses.DRAG || !draggable || root.querySelector(".minimized-frame")) {
            return;
        }
        let rect = root.getBoundingClientRect();
        let startWidth = rect.width;
        let startHeight = rect.height;
        if (prevX && prevY) {
            dx = x - prevX;
            dy = y - prevY;
        }
        else {
            dx = 0;
            dy = 0;
        }
        root.style.width = `${startWidth + dx}px`;
        root.style.height = `${startHeight + dy}px`;
        prevX = x;
        prevY = y;
    });
    return () => {
        root.removeEventListener('mousedown', onMouseDown);
    };
}

//# sourceMappingURL=file:///core/ui/utilities/utilities-frame.js.map

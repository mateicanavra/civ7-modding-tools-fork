let contextManager = null;
let focusManager = null;
let dialogManager = null;
const Framework = {
    get ContextManager() {
        throw new Error("ContextManager must be set prior to using.");
    },
    get FocusManager() {
        throw new Error("FocusManager must be set prior to using.");
    },
    get DialogManager() {
        throw new Error("DialogManager must be set prior to using.");
    },
};
export function setContextManager(value) {
    contextManager = value;
    Object.defineProperty(Framework, 'ContextManager', {
        get: () => contextManager,
    });
}
export function setFocusManager(value) {
    focusManager = value;
    Object.defineProperty(Framework, 'FocusManager', {
        get: () => focusManager,
    });
}
export function setDialogManager(value) {
    dialogManager = value;
    Object.defineProperty(Framework, 'DialogManager', {
        get: () => dialogManager,
    });
}
export { Framework };
//# sourceMappingURL=file:///core/ui/framework.js.map

/**
 * @file editor-calibrate-hdr.ts
 * @copyright 2024, Firaxis Games
 * @description Displays and sets the HDR options.
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Options from '/core/ui/options/model-options.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
export const EditorCalibrateHDROpenedEventName = 'editor-calibrate-hdr-opened';
class EditorCalibrateHDROpenedEvent extends CustomEvent {
    constructor() {
        super(EditorCalibrateHDROpenedEventName, { bubbles: false, cancelable: true });
    }
}
export const EditorCalibrateHDRClosedEventName = 'editor-calibrate-hdr-closed';
class EditorCalibrateHDRClosedEvent extends CustomEvent {
    constructor() {
        super(EditorCalibrateHDRClosedEventName, { bubbles: false, cancelable: true });
    }
}
class EditorCalibrateHDR extends Panel {
    constructor() {
        super(...arguments);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.confirmButtonListener = this.close.bind(this);
        this.hdrSliderChangedListener = this.onHdrOptionChanged.bind(this);
        this.contrastBar = document.createElement('fxs-slider');
        this.brightness3dBar = document.createElement('fxs-slider');
        this.uiBrightnessBar = document.createElement('fxs-slider');
        this.CalibrateHDRSceneModels = null;
        this.isClosing = false;
        this.onDiscard = () => {
            const cancelCallback = (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    Options.restore("graphics"); // restore previous values
                    this.close();
                }
            };
            DialogManager.createDialog_ConfirmCancel({
                body: "LOC_OPTIONS_REVERT_DESCRIPTION",
                title: "LOC_OPTIONS_CANCEL_CHANGES",
                canClose: false,
                displayQueue: "SystemMessage",
                addToFront: true,
                callback: cancelCallback
            });
        };
    }
    onInitialize() {
    }
    onAttach() {
        super.onAttach();
        const hdrOptionPage = this.Root.querySelector('.editor-calibrate-hdr_main-content');
        if (!hdrOptionPage) {
            console.error('editor-calibrate-hrd: Error: no main-content element found');
            return;
        }
        window.dispatchEvent(new EditorCalibrateHDROpenedEvent());
        ContextManager.pop("screen-options");
        const centerBars = document.createElement('fxs-inner-frame');
        centerBars.classList.add('sliders-container', 'flow-column', 'justify-center', 'items-center', 'relative', 'p-4', 'mb-6');
        const settingContrast = document.createElement('div');
        settingContrast.classList.add('flex', 'editor-calibrate-hdr__row');
        const contrastTitle = document.createElement('div');
        contrastTitle.setAttribute('data-l10n-id', 'LOC_OPTIONS_HDR_CONSTRAST');
        contrastTitle.classList.add('uppercase', 'font-title', 'text-lg', 'w-56');
        this.contrastBar = document.createElement('fxs-slider');
        this.contrastBar.id = 'contrast-slider';
        this.contrastBar.classList.add('w-194', 'ml-10', 'editor-calibrate-hdr__slider');
        const contrastValue = Options.graphicsOptions.hdrContrast;
        this.contrastBar.setAttribute('option', 'contrast');
        this.contrastBar.setAttribute('min', '0.1');
        this.contrastBar.setAttribute('max', '5');
        this.contrastBar.setAttribute('value', contrastValue.toString());
        this.contrastBar.addEventListener('component-value-changed', this.hdrSliderChangedListener);
        settingContrast.appendChild(contrastTitle);
        settingContrast.appendChild(this.contrastBar);
        const setting3dBrightness = document.createElement('div');
        setting3dBrightness.classList.add('flex', 'editor-calibrate-hdr__row');
        const brightness3dTitle = document.createElement('div');
        brightness3dTitle.setAttribute('data-l10n-id', 'LOC_OPTIONS_HDR_3D_BRIGHTNESS');
        brightness3dTitle.classList.add('uppercase', 'font-title', 'text-lg', 'mr-10', 'w-56');
        this.brightness3dBar = document.createElement('fxs-slider');
        this.brightness3dBar.id = 'brightness-3d-slider';
        this.brightness3dBar.classList.add('w-194', 'editor-calibrate-hdr__slider');
        const brightness3DValue = GraphicsOptions.linearToPq(Options.graphicsOptions.hdrWhitePoint3D);
        this.brightness3dBar.setAttribute('option', '3dBrightness');
        this.brightness3dBar.setAttribute('min', '0.25');
        this.brightness3dBar.setAttribute('max', '1');
        this.brightness3dBar.setAttribute('value', brightness3DValue.toString());
        this.brightness3dBar.addEventListener('component-value-changed', this.hdrSliderChangedListener);
        setting3dBrightness.appendChild(brightness3dTitle);
        setting3dBrightness.appendChild(this.brightness3dBar);
        const settingUiBrightness = document.createElement('div');
        settingUiBrightness.classList.add('flex', 'editor-calibrate-hdr__row');
        const uiBrightnessTitle = document.createElement('div');
        uiBrightnessTitle.setAttribute('data-l10n-id', 'LOC_OPTIONS_HDR_UI_BRIGHTNESS');
        uiBrightnessTitle.classList.add('uppercase', 'font-title', 'text-lg', 'mr-10', 'w-56');
        this.uiBrightnessBar.id = 'brightness-ui-slider';
        this.uiBrightnessBar.classList.add('w-194', 'editor-calibrate-hdr__slider');
        const brightnessUIValue = GraphicsOptions.linearToPq(Options.graphicsOptions.hdrWhitePointUI);
        this.uiBrightnessBar.setAttribute('option', 'UiBrightness');
        this.uiBrightnessBar.setAttribute('min', '0.25');
        this.uiBrightnessBar.setAttribute('max', '1');
        this.uiBrightnessBar.setAttribute('value', brightnessUIValue.toString());
        this.uiBrightnessBar.addEventListener('component-value-changed', this.hdrSliderChangedListener);
        settingUiBrightness.appendChild(uiBrightnessTitle);
        settingUiBrightness.appendChild(this.uiBrightnessBar);
        centerBars.appendChild(settingContrast);
        centerBars.appendChild(setting3dBrightness);
        centerBars.appendChild(settingUiBrightness);
        const buttonContainer = document.createElement('fxs-hslot');
        buttonContainer.classList.add('buttons-container', 'w-full', 'shrink', 'justify-center');
        buttonContainer.setAttribute("data-bind-class-toggle", "hidden:{{g_NavTray.isTrayRequired}}");
        const saveChangesButton = document.createElement('fxs-button');
        saveChangesButton.setAttribute('caption', "LOC_OPTIONS_HDR_CONFIRM");
        saveChangesButton.addEventListener('action-activate', this.confirmButtonListener);
        const resetChangesButton = document.createElement('fxs-button');
        resetChangesButton.classList.add('mx-10');
        resetChangesButton.setAttribute('caption', "LOC_OPTIONS_RESET_TO_DEFAULTS");
        resetChangesButton.addEventListener('action-activate', this.onReset);
        const discardChangesButton = document.createElement('fxs-button');
        discardChangesButton.setAttribute('caption', "LOC_GENERIC_BACK");
        discardChangesButton.addEventListener('action-activate', this.onDiscard);
        buttonContainer.appendChild(discardChangesButton);
        buttonContainer.appendChild(resetChangesButton);
        buttonContainer.appendChild(saveChangesButton);
        hdrOptionPage.appendChild(centerBars);
        hdrOptionPage.appendChild(buttonContainer);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.isClosing = false;
        this.build3DScene();
    }
    onReset() {
        const defaultContrast = 0.799;
        const defaultBrightness3D = 330;
        const defaultBrightnessUI = 330;
        // I do not know why I have to query the DOM instead of using the fields of this class
        // but the fields of the class seem to be null or not in the dom or something when you
        // press reset
        const contrastBar = document.getElementById('contrast-slider');
        const brightness3dBar = document.getElementById('brightness-3d-slider');
        const brightnessUIBar = document.getElementById('brightness-ui-slider');
        contrastBar?.setAttribute('value', defaultContrast.toString());
        brightness3dBar?.setAttribute('value', GraphicsOptions.linearToPq(defaultBrightness3D).toString());
        brightnessUIBar?.setAttribute('value', GraphicsOptions.linearToPq(defaultBrightnessUI).toString());
        Options.graphicsOptions.hdrContrast = defaultContrast;
        Options.graphicsOptions.hdrWhitePoint3D = defaultBrightness3D;
        Options.graphicsOptions.hdrWhitePointUI = defaultBrightnessUI;
        Options.commitOptions("graphics");
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        NavTray.clear();
        ContextManager.push("screen-options", { singleton: true, createMouseGuard: true, attributes: { "selected-tab": "3" } });
        super.onDetach();
    }
    onReceiveFocus() {
        FocusManager.setFocus(this.contrastBar);
        NavTray.clear();
        NavTray.addOrUpdateGenericCancel();
        NavTray.addOrUpdateShellAction1("LOC_OPTIONS_CONFIRM_CHANGES");
    }
    onLoseFocus() {
        NavTray.clear();
    }
    close() {
        this.isClosing = true;
        this.clear3DScene();
        window.dispatchEvent(new EditorCalibrateHDRClosedEvent());
        super.close();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput()) {
            this.onDiscard();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        switch (inputEvent.detail.name) {
            case 'shell-action-1':
                this.close();
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
        }
    }
    onHdrOptionChanged(sliderEvent) {
        if (!(sliderEvent.target instanceof HTMLElement)) {
            return;
        }
        const option = sliderEvent.target.getAttribute('option');
        if (!option) {
            return;
        }
        switch (option) {
            case "contrast":
                Options.graphicsOptions.hdrContrast = sliderEvent.detail.value;
                break;
            case "3dBrightness":
                Options.graphicsOptions.hdrWhitePoint3D = GraphicsOptions.pqToLinear(Math.max(0.1, sliderEvent.detail.value));
                break;
            case "UiBrightness":
                Options.graphicsOptions.hdrWhitePointUI = GraphicsOptions.pqToLinear(Math.max(0.1, sliderEvent.detail.value));
                break;
            default:
                break;
        }
        // TODO: Use real time setters instead of committing options.
        Options.commitOptions("graphics");
    }
    build3DScene() {
        waitForLayout(() => {
            if (!this.isClosing) {
                Camera.pushCamera({ x: 285, y: 80, z: 255 }, { x: 0, y: -95, z: -20 });
                this.CalibrateHDRSceneModels = WorldUI.createModelGroup("HDRCalibrationScene");
                this.CalibrateHDRSceneModels.addModelAtPos("Calibration_Scene", { x: 0, y: -95, z: 0 }, { initialState: "IDLE", angle: -225, scale: 2.5 });
            }
        });
    }
    clear3DScene() {
        if (this.CalibrateHDRSceneModels) {
            this.CalibrateHDRSceneModels.destroy();
            this.CalibrateHDRSceneModels = null;
            Camera.popCamera();
        }
    }
}
const EditorCalibrateHDRTagName = 'editor-calibrate-hdr';
Controls.define(EditorCalibrateHDRTagName, {
    createInstance: EditorCalibrateHDR,
    description: 'Displays and sets the HDR options',
    classNames: ['editor-calibrate-hdr', 'flex-auto', 'w-full', 'h-full', 'absolute'],
    styles: ['fs://game/core/ui/options/editors/calibrateHDR/editor-calibrate-hdr.css'],
    content: ['fs://game/core/ui/options/editors/calibrateHDR/editor-calibrate-hdr.html'],
    attributes: [],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/options/editors/calibrateHDR/editor-calibrate-hdr.js.map

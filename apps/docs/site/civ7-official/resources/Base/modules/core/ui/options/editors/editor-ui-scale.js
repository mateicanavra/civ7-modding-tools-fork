/**
 * @file screen-options-ui-scale-editor.ts
 * @copyright 2023, Firaxis Games
 * @description The UI Scale Editor within the interface options. Allows the user to see their scale changes as they make them.
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import { MAX_UI_SCALE, MIN_UI_SCALE, MustGetElement, SetUIScale } from '/core/ui/utilities/utilities-dom.js';
import { CategoryData, CategoryType } from '/core/ui/options/options-helpers.js';
/**
 * Display and modify the UI scaling.
 */
class ScreenOptionsUiScaleEditor extends Panel {
    constructor() {
        super(...arguments);
        // TODO: screen-pause-menu is declared in base-standard, so type inferencing for it doesn't work here
        this.pauseMenu = document.querySelector("screen-pause-menu");
        this.optionsMenu = document.querySelector("screen-options");
        this.commitOnApply = this.Root.getAttribute('editor-commit-on-apply') === 'true';
        this.initialScale = Configuration.getUser().uiScale;
        this._currentScale = this.initialScale;
        this.onNavigationInput = (inputEvent) => {
            if (inputEvent.detail.status != InputActionStatuses.FINISH) {
                return;
            }
            switch (inputEvent.detail.name) {
                case 'nav-next':
                    this.increaseUiScale();
                    inputEvent.stopPropagation();
                    break;
                case 'nav-previous':
                    this.decreaseUiScale();
                    inputEvent.stopPropagation();
                    break;
            }
        };
        this.onEngineInput = (inputEvent) => {
            if (inputEvent.detail.status != InputActionStatuses.FINISH) {
                return;
            }
            switch (inputEvent.detail.name) {
                case 'cancel':
                case 'keyboard-escape':
                    this.closeScaleEditor(true);
                    inputEvent.stopPropagation();
            }
        };
        this.increaseUiScale = () => {
            this.currentScale += 25;
        };
        this.decreaseUiScale = () => {
            this.currentScale -= 25;
        };
        this.onAcceptButtonPressed = (_event) => {
            // Close the window and SAVE changes
            this.closeScaleEditor(false);
        };
        this.onCancelButtonPressed = (_event) => {
            // Close the window and DISCARD changes
            this.closeScaleEditor(true);
        };
    }
    get currentScale() {
        return this._currentScale;
    }
    set currentScale(scale) {
        scale = Math.max(MIN_UI_SCALE, Math.min(scale, MAX_UI_SCALE));
        if (scale === this._currentScale) {
            return;
        }
        this._currentScale = scale;
        this.onUiScaleUpdate();
        Configuration.getUser().setUiScale(scale);
        SetUIScale(scale);
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('engine-input', this.onEngineInput);
        this.Root.addEventListener('navigate-input', this.onNavigationInput);
        this.plusButton.addEventListener("action-activate", this.increaseUiScale);
        this.minusButton.addEventListener("action-activate", this.decreaseUiScale);
        this.acceptButton.addEventListener("action-activate", this.onAcceptButtonPressed);
        this.cancelButton.addEventListener("action-activate", this.onCancelButtonPressed);

        // Remove the other visible menus + their mouse guards
        this.hideParentMenu(this.pauseMenu);
        this.hideParentMenu(this.optionsMenu);
        FocusManager.setFocus(this.cancelButton);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.onEngineInput);
        this.Root.removeEventListener('navigate-input', this.onNavigationInput);
    }
    onUiScaleUpdate() {
        this.scaleDisplay.textContent = `${this.currentScale}%`;
        this.plusButton.setAttribute("disabled", this.currentScale >= 200 ? 'true' : 'false');
        this.minusButton.setAttribute("disabled", this.currentScale <= 50 ? 'true' : 'false');
    }
    /**
     * Close the scale editor window and return to the main options window
     * @param revert Revert back to the last save checkpoint?
     */
    closeScaleEditor(revert) {
        ContextManager.pop(this.Root);
        if (revert) {
            this.currentScale = this.initialScale;
        }
        else if (this.commitOnApply) {
            Configuration.getUser().saveCheckpoint();
        }
        this.showParentMenu(this.pauseMenu);
        this.showParentMenu(this.optionsMenu);
    }
    showParentMenu(element) {
        element?.style.removeProperty('display');
        // show mouse guard
        if (element?.previousSibling instanceof HTMLElement) {
            element.previousSibling.style.removeProperty('display');
        }
    }
    hideParentMenu(element) {
        element?.style.setProperty('display', 'none');
        // hide mouse guard
        if (element?.previousSibling instanceof HTMLElement) {
            element.previousSibling.style.setProperty('display', 'none');
        }
    }
    render() {
        this.Root.innerHTML = `
			<fxs-frame title="LOC_OPTIONS_UI_SCALE" subtitle="${CategoryData[CategoryType.Interface].title}" class="outerfill fxs-center-panel ui-scale-editor">
				<fxs-spatial-slot>
					<div class="scale-controls">
						<fxs-minus-plus id="minus" type="minus" action-key="inline-cycle-previous"></fxs-minus-plus>
						<div class="scale-display"></div>
						<fxs-minus-plus id="plus" type="plus" action-key="inline-cycle-next"></fxs-minus-plus>
					</div>
					<fxs-button-group>
						<fxs-button id="accept" caption="LOC_OPTIONS_UI_SCALE_EDIT_ACCEPT"></fxs-button>
						<fxs-button id="cancel" caption="LOC_OPTIONS_UI_SCALE_EDIT_CANCEL" action-key="inline-cancel"></fxs-button>
					</fxs-button-group>
				</fxs-spatial-slot>
			</fxs-frame>
		`;
        this.scaleDisplay = MustGetElement(".scale-display", this.Root);
        this.plusButton = MustGetElement("#plus", this.Root);
        this.minusButton = MustGetElement("#minus", this.Root);
        this.acceptButton = MustGetElement("#accept", this.Root);
        this.cancelButton = MustGetElement("#cancel", this.Root);
        this.onUiScaleUpdate();
    }
}
const ScreenOptionsUiScaleEditorTagName = 'editor-ui-scale';
Controls.define(ScreenOptionsUiScaleEditorTagName, {
    createInstance: ScreenOptionsUiScaleEditor,
    description: 'Screen for adjusting UI scale within the options menu.',
    classNames: ['editor-ui-scale'],
    styles: ['fs://game/core/ui/options/editors/editor-ui-scale.css']
});

//# sourceMappingURL=editor-ui-scale.js.map

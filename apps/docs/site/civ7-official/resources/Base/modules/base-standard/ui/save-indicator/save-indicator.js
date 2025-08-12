/**
 * @file save-indicator.ts
 * @copyright 2024, Firaxis Games
 * @description Panel that indicated that a save is currently in progress.
 */
import Panel from '/core/ui/panel-support.js';
class SaveIndicator extends Panel {
    constructor() {
        super(...arguments);
        this.timeoutID = 0;
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        engine.on('StartSaveRequest', this.onStartSaveRequest, this);
        engine.on("SaveComplete", this.onSaveComplete, this);
    }
    onDetach() {
        engine.off('StartSaveRequest', this.onStartSaveRequest, this);
        engine.off("SaveComplete", this.onSaveComplete, this);
        super.onDetach();
    }
    onStartSaveRequest() {
        this.timeoutID = setTimeout(() => {
            this.Root.classList.add("opacity-100");
        }, 1000); // Only show if 1 second has passed.
    }
    onSaveComplete() {
        clearTimeout(this.timeoutID);
        this.Root.classList.remove("opacity-100");
    }
    render() {
        this.Root.innerHTML = `
			<div class="font-title text-secondary no-pad-margin self-end text-shadow" data-l10n-id="LOC_SAVE_INDICATOR_TITLE"></div>
			<div class="ml-2 w-8 h-8 img-ba-default"></div>
		`;
    }
}
Controls.define('save-indicator', {
    createInstance: SaveIndicator,
    description: 'Panel that indicated that a save is currently in progress',
    classNames: ['save-indicator', 'flow-row', 'opacity-0', 'transition-opacity'],
});

//# sourceMappingURL=file:///base-standard/ui/save-indicator/save-indicator.js.map

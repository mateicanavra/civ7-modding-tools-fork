/**
 * @file quest-chooser.ts
 * @copyright 2023, Firaxis Games
 * @description Side panel-sized list of quest items.
 */
import Panel from "/core/ui/panel-support.js";
class QuestChooser extends Panel {
    onAttach() {
        super.onAttach();
    }
    onDetach() {
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
    }
    onLoseFocus() {
        super.onLoseFocus();
    }
}
Controls.define('quest-chooser', {
    createInstance: QuestChooser,
    description: 'Full side panel for showing quest items.',
    classNames: ['quest-chooser'],
    styles: ['fs://game/base-standard/ui/quest-tracker/quest-chooser.css'],
    content: ['fs://game/base-standard/ui/quest-tracker/quest-chooser.html'],
    attributes: []
});

//# sourceMappingURL=file:///base-standard/ui/quest-tracker/quest-chooser.js.map

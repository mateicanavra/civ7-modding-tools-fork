"use strict";
// @copyright 2020-2022, Firaxis Games
class TurnIcon extends Component {
    constructor(root) {
        super(root);
    }
    onUpdate() {
        // Placeholder for if this needs to call something on an update schedule
    }
    onAttributeChanged(name, _oldValue, _newValue) {
        if (name == "turns") {
            this.refreshTurns();
        }
    }
    refreshTurns() {
        // change the turns displayed
    }
}
Controls.define('turn-icon', {
    createInstance: TurnIcon,
    description: 'Standardized icon/number for indicating how many turns something will take',
    classNames: ['turn-icon'],
    styles: ['fs://game/base-standard/ui/turn-icon/turn-icon.css'],
    content: ['fs://game/base-standard/ui/turn-icon/turn-icon.html'],
    attributes: [
        {
            name: 'turns',
            required: true
        }
    ]
});

//# sourceMappingURL=file:///base-standard/ui/turn-icon/turn-icon.js.map

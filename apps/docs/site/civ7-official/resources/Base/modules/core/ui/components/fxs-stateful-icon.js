/**
 * @file fxs-icon-group.ts
 * @copyright 2024, Firaxis Games
 * @description A component that uses the icon-group utility to create a group of icons that can be toggled between states.
 */
import { StatefulIcon } from '/core/ui/stateful-icon/index.js';
/**
 * FxsStatefulIcon creates a non activatable icon group where the you can supply a separate icon for each button state.
 *
 * @example
 * <fxs-stateful-icon
 * 	data-icon="icon-default.png"
 * 	data-icon-hover="icon-hover.png"
 * 	data-icon-focus="icon-focus.png"
 * 	data-icon-active="icon-active.png"
 * 	data-icon-disabled="icon-disabled.png"
 * </fxs-stateful-icon>
 */
export class FxsStatefulIcon extends Component {
    constructor(root) {
        super(root);
        const [, controller] = StatefulIcon.FromElement(root, true);
        this.controller = controller;
    }
    onInitialize() {
        this.Root.classList.add('flex', 'items-center');
        for (const iconElement of Object.values(this.controller.elements)) {
            iconElement.classList.add('flex-initial', 'max-h-full', 'max-w-full', "size-full");
        }
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'data-state':
                if (this.controller.isValidState(newValue)) {
                    this.controller.state = newValue;
                }
                break;
            default:
                super.onAttributeChanged(name, oldValue, newValue);
        }
        super.onAttributeChanged(name, oldValue, newValue);
    }
}
Controls.define('fxs-stateful-icon', {
    createInstance: FxsStatefulIcon,
    attributes: [
        {
            name: 'data-state'
        }
    ]
});

//# sourceMappingURL=file:///core/ui/components/fxs-stateful-icon.js.map

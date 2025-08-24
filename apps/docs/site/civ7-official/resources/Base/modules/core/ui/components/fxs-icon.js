/**
 * @file fxs-icon.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Icon Primitive
 */
export class FxsIcon extends Component {
    constructor(root) {
        super(root);
        this.renderQueued = false;
    }
    onAttach() {
        super.onAttach();
        this.render();
    }
    onDetach() {
        super.onDetach();
    }
    onAttributeChanged(name, _oldValue, newValue) {
        if (_oldValue != newValue) {
            if (name == 'data-icon-id' || name == 'data-icon-context' || name == 'data-icon-size') {
                // Enqueue a microtask to allow for multiple attributes to be set in this scope.
                if (!this.renderQueued) {
                    this.renderQueued = true;
                    queueMicrotask(this.render.bind(this));
                }
            }
        }
    }
    render() {
        this.renderQueued = false;
        const id = this.Root.getAttribute('data-icon-id');
        const context = this.Root.getAttribute('data-icon-context');
        if (id) {
            const iconUrl = UI.getIconCSS(id, context ? context : undefined);
            this.Root.style.backgroundImage = iconUrl;
        }
    }
}
Controls.define('fxs-icon', {
    createInstance: FxsIcon,
    description: 'An icon primitive',
    skipPostOnAttach: true,
    classNames: ['fxs-icon', 'icon'],
    attributes: [
        {
            name: "data-icon-id",
            description: "The id of the icon to display."
        },
        {
            name: "data-icon-context",
            description: "A ui-specific context field to determine which type of icon should be shown."
        },
        {
            name: "data-icon-size",
            description: "An optional size field hinting which size the image should be."
        },
    ]
});

//# sourceMappingURL=file:///core/ui/components/fxs-icon.js.map

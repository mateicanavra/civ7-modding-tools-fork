/**
 * @file fxs-frame.ts
 * @copyright 2025, Firaxis Games
 * @description A visual frame container.
 *
 * Creates a styled frame of content, varying in size from popups to full menus (e.g.  the Confirm Exit to Desktop popup)
 */
import { ActionActivateEventName } from "/core/ui/components/fxs-activatable.js";
/**
 *
 * FxsFrame provides a styled frame for content.
 *
 * Use the content-as attribute to specify the type of the content element (e.g. fxs-vslot).
 * Use the content-class attribute to specify the classes of the content element.
 *
 * Usage (composition):
 *
 * <fxs-frame content-as="fxs-vslot">
 *   <my-item></my-item>
 *   <my-item></my-item>
 * </fxs-frame>
 *
 */
export const FrameCloseEventName = 'frame-closed';
export class FrameCloseEvent extends CustomEvent {
    constructor(x, y) {
        super(FrameCloseEventName, { bubbles: false, cancelable: true, detail: { x, y } });
    }
}
export class FxsFrame extends Component {
    constructor() {
        super(...arguments);
        this._content = null;
        this.contentAs = 'div';
        this.contentClass = '';
    }
    get content() {
        if (!this._content) {
            this._content = document.createElement(this.contentAs);
            this._content.className = this.contentClass;
            this.Root.appendChild(this._content);
        }
        return this._content;
    }
    onInitialize() {
        super.onInitialize();
        const contentAs = this.Root.getAttribute('content-as');
        const contentClass = this.Root.getAttribute('content-class');
        this.contentAs = contentAs || this.contentAs;
        this.contentClass = contentClass ?? this.contentClass;
        // Look for close button added in the immediate content, if one exists, and bring it to this level so it can be positioned relative to the frame
        // This avoids a lot of unwieldy per-menu close button positioning hacks
        // TODO: remove, the close button should be managed by the frame
        let closeButton = this.Root.querySelector('fxs-close-button');
        if (!closeButton && (this.Root.getAttribute('can-close') ?? 'false') == 'true') {
            closeButton = document.createElement('fxs-close-button');
            closeButton.addEventListener(ActionActivateEventName, (event) => {
                this.Root.dispatchEvent(new FrameCloseEvent(event.detail.x, event.detail.y));
            });
        }
        if (closeButton) {
            this.Root.appendChild(closeButton);
            closeButton.classList.add("right-2", "top-2");
        }
        // Push all other children into fragment to be added into a "content" div
        const originalfragment = document.createDocumentFragment();
        while (this.Root.hasChildNodes()) {
            const c = this.Root.firstChild;
            if (c == closeButton) {
                break;
            }
            if (c && c != closeButton) {
                originalfragment.appendChild(c);
            }
        }
        ;
        this.content.appendChild(originalfragment);
        const frameAdditionalStyling = this.Root.getAttribute('override-styling') ?? 'relative flex max-w-full max-h-full pt-14 px-10 pb-10';
        this.Root.classList.add('z-0', 'pointer-events-auto', ...frameAdditionalStyling.split(' '));
        const style = this.Root.getAttribute("frame-style") ?? "f1";
        const noFiligree = this.Root.getAttribute("no-filigree") == "true";
        if (style !== "simple" && !noFiligree) {
            const filigreeClass = this.Root.getAttribute('filigree-class') ?? 'mt-8';
            this.Root.insertAdjacentHTML('afterbegin', `
				<div class="absolute top-0 left-4 bottom-0 h-1\\/2 w-64 ${filigreeClass} img-frame-filigree pointer-events-none"></div>
				<div class="absolute top-0 right-4 bottom-0 h-1\\/2 w-64 ${filigreeClass} rotate-y-180 img-frame-filigree pointer-events-none"></div>
			`);
        }
        // WORKAROUND: Using a separate element for the border image prevents the modified properties assertion
        this.frameBg = document.createElement('div');
        this.Root.appendChild(this.frameBg);
        this.updateFrameBg();
        const borderStyle = this.Root.getAttribute("top-border-style");
        if (borderStyle) {
            const borderContainer = document.createElement("div");
            borderContainer.classList.value = "flex absolute self-stretch w-full";
            const borderImage = document.createElement("div");
            this.Root.appendChild(borderContainer);
            borderContainer.appendChild(borderImage);
            switch (borderStyle) {
                case "b1":
                    borderImage.classList.value = "flex -mt-7 filigree-panel-top-pedia grow -mr-20";
                    break;
                case "b2":
                    borderImage.classList.value = "flex -mt-3 filigree-panel-top-simplified grow -ml-6 -mr-22";
                    break;
                default:
                    break;
            }
        }
        this.content.classList.value = 'flex flex-col flex-auto' + (this.contentClass ? ' ' + this.contentClass : '');
        this.Root.appendChild(this.content);
    }
    onAttributeChanged(name, _oldValue, _newValue) {
        switch (name) {
            case "outside-safezone-mode":
                this.updateFrameBg();
                break;
            case "frame-style":
                this.updateFrameBg();
                break;
        }
    }
    updateFrameBg() {
        const style = this.Root.getAttribute("frame-style") ?? "f1";
        const outsideSafezoneMode = this.Root.getAttribute("outside-safezone-mode") ?? "none";
        this.frameBg.className = `-z-1 absolute inset-0 ${this.Root.getAttribute("bg-class") ?? ""}`;
        switch (style) {
            case "f1":
                this.frameBg.classList.add('img-frame-f1');
                break;
            case "f2":
                this.frameBg.classList.add('img-frame-f2');
                break;
            case "simple":
                this.frameBg.classList.add('img-frame-f2');
                break;
        }
        switch (outsideSafezoneMode) {
            case "vertical":
                this.frameBg.classList.add('fullscreen-outside-safezone-y');
                break;
            case "horizontal":
                this.frameBg.classList.add('fullscreen-outside-safezone-x');
                break;
            case "full":
                this.frameBg.classList.add('fullscreen-outside-safezone');
                break;
        }
    }
}
Controls.define('fxs-frame', {
    createInstance: FxsFrame,
    description: 'A visual frame container.',
    classNames: ['fxs-frame'],
    images: [
        'fs://game/base_frame-filigree.png',
        'fs://game/base_frame-bg.png',
        'fs://game/hud_squarepanel-bg.png',
        'fs://game/pedia_top_header.png'
    ],
    attributes: [
        {
            name: "outside-safezone-mode",
        },
        {
            name: "frame-style",
        },
        {
            name: "can-close",
        }
    ]
});

//# sourceMappingURL=file:///core/ui/components/fxs-frame.js.map

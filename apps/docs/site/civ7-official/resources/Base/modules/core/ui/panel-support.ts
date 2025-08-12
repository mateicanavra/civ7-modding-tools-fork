/**
 * @file panel-support.ts
 * @description Definition for Panel, main class for UI contexts.
 * @copyright 2020-2021, Firaxis Games
 */


import { Framework } from '/core/ui/framework.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
/**
 *  0 = None    1 = Absolute
 *  ___ _____ _____ _____ ___
 * |   |     |     |     |   |
 * |   |  2  |  3  |  4  |   |
 * |   |_____|_____|_____|   |
 * |   |     |     |     |   |
 * |11 |  5  |  6  |  7  | 12|
 * |   |_____|_____|_____|   |
 * |   |     |     |     |   |
 * |   |  8  |  9  | 10  |   |
 * |___|_____|_____|_____|___|
 * 
 */
export enum AnchorType {
    None = 0,
    Absolute = 1,
    RelativeToTopLeft = 2,
    RelativeToTop = 3,
    RelativeToTopRight = 4,
    RelativeToLeft = 5,
    RelativeToCenter = 6,
    RelativeToRight = 7,
    RelativeToBottomLeft = 8,
    RelativeToBottom = 9,
    RelativeToBottomRight = 10,
    SidePanelLeft = 11,
    SidePanelRight = 12,
    Auto = 15,
    Fade = 16,
};

export default class Panel extends Component {

    protected animateInType: AnchorType = AnchorType.None;
    protected animateOutType: AnchorType = AnchorType.None;
    protected enableOpenSound = false;
    protected enableCloseSound = false;

    private documentClosePanelListener: EventListener = this.close.bind(this, UIViewChangeMethod.PlayerInteraction);

    private static animInStyleMap: Map<AnchorType, Array<string>> = new Map<AnchorType, Array<string>>();
    private static animOutStyleMap: Map<AnchorType, Array<string>> = new Map<AnchorType, Array<string>>();

    inputContext: InputContext = InputContext.Shell;

    /** CTOR */
    constructor(root: ComponentRoot) {
        super(root);

        // Build static tables of enum to class styles if they aren't yet created.
        if (Panel.animInStyleMap.size == 0) {
            Panel.animInStyleMap.set(AnchorType.None, []);
            Panel.animInStyleMap.set(AnchorType.Auto, []);
            Panel.animInStyleMap.set(AnchorType.RelativeToTopLeft, ['animate-in-left']);
            Panel.animInStyleMap.set(AnchorType.RelativeToTop, ['animate-in-top']);
            Panel.animInStyleMap.set(AnchorType.RelativeToTopRight, ['animate-in-right']);
            Panel.animInStyleMap.set(AnchorType.RelativeToLeft, ['animate-in-left']);
            Panel.animInStyleMap.set(AnchorType.RelativeToCenter, []);
            Panel.animInStyleMap.set(AnchorType.RelativeToRight, ['animate-in-right']);
            Panel.animInStyleMap.set(AnchorType.RelativeToBottomLeft, ['animate-in-left']);
            Panel.animInStyleMap.set(AnchorType.RelativeToBottom, ['animate-in-bottom']);
            Panel.animInStyleMap.set(AnchorType.RelativeToBottomRight, ['animate-in-right']);
            Panel.animInStyleMap.set(AnchorType.Fade, ['animate-in-fade']);

        }
        if (Panel.animOutStyleMap.size == 0) {
            Panel.animOutStyleMap.set(AnchorType.None, []);
            Panel.animOutStyleMap.set(AnchorType.Auto, []);
            Panel.animOutStyleMap.set(AnchorType.RelativeToTopLeft, ['animate-out-left']);
            Panel.animOutStyleMap.set(AnchorType.RelativeToTop, ['animate-out-top']);
            Panel.animOutStyleMap.set(AnchorType.RelativeToTopRight, ['animate-out-right']);
            Panel.animOutStyleMap.set(AnchorType.RelativeToLeft, ['animate-out-left']);
            Panel.animOutStyleMap.set(AnchorType.RelativeToCenter, []);
            Panel.animOutStyleMap.set(AnchorType.RelativeToRight, ['animate-out-right']);
            Panel.animOutStyleMap.set(AnchorType.RelativeToBottomLeft, ['animate-out-left']);
            Panel.animOutStyleMap.set(AnchorType.RelativeToBottom, ['animate-out-bottom']);
            Panel.animOutStyleMap.set(AnchorType.RelativeToBottomRight, ['animate-out-right']);
            Panel.animOutStyleMap.set(AnchorType.Fade, ['animate-out-fade']);
        }
    }

    static override onDefined(name: string) {
        super.onDefined(name);

        UI.Control.register(name)
    }

    /** Called once per creation, and immediately before the first time the component is initialized. */
    onInitialize() {
        super.onInitialize();

        // If auto animation is set, attempt to set animation based on attached anchoring.
        const anchor: AnchorType = this.getAnimationByInspectingClasses();
        if (this.animateInType == AnchorType.Auto) {
            this.animateInType = anchor;
        }
        if (this.animateOutType == AnchorType.Auto) {
            this.animateOutType = anchor;
        }
    }

    /** Called each time the component is re-attached to the DOM */
    override onAttach() {
        super.onAttach();

        // Close events can only happen for Panel components
        UI.Control.notifyAttached(this.Root.typeName, true);
        engine.on(`close-${this.Root.typeName}`, this.requestClose, this);

        document.addEventListener('close-panel', this.documentClosePanelListener);
        if (this.animateInType != AnchorType.None) {
            this.applyDefaultAnimateIn();
        }
        this.playAnimateInSound();
    }

    override onDetach() {
        document.removeEventListener('close-panel', this.documentClosePanelListener);

        // Close events can only happen for Panel components
        engine.off(`close-${this.Root.typeName}`, undefined, this);
        UI.Control.notifyAttached(this.Root.typeName, false);

        super.onDetach();
    }

    generateOpenCallbacks(_callbacks: Record<string, OptionalOpenCallback>): void {
        // Intended to be overridden
    }


    protected requestClose(inputEvent?: InputEngineEvent) {
        inputEvent?.stopPropagation();
        inputEvent?.preventDefault();

        this.close();
    }

    protected close(uiViewChangeMethod: UIViewChangeMethod = UIViewChangeMethod.Unknown) {
        this.playAnimateOutSound();

        if (this.animateOutType != AnchorType.None) {
            this.applyDefaultAnimateOut();
            setTimeout(() => {      //TODO: remove wrapping with a setTimeout() cause of timing issues! (fix by working against concrete signals)
                Framework.ContextManager.pop(this.Root.tagName, { viewChangeMethod: uiViewChangeMethod });
            }, 200);
        }
        else {
            Framework.ContextManager.pop(this.Root.tagName, { viewChangeMethod: uiViewChangeMethod });
        }
    }

    /** Called if the panel was pushed in the Context Manager with a panelOptions object */
    setPanelOptions(_panelOptions: object) {
        console.warn("panel-support: panel was passed panelOptions but doesn't have a handler");
    }

    public getPanelContent(): string {
        return "";
    }

    /**
     * Plays the animate in sound assigned to this object.
     */
    protected playAnimateInSound() {
        // Does not call super.playAnimateInSound() intentionally
        if (this.enableOpenSound) {
            this.playSound('data-audio-showing');
            if (UI.isAudioCursorEnabled()) {
                UI.lockCursor(true);
                UI.setCursorByType(UIHTMLCursorTypes.Text);
                setTimeout(() => {
                    UI.lockCursor(false);
                }, 3000);
            }
        }
    }

    /**
     * Plays the animate out sound assigned to this object.
     */
    playAnimateOutSound() {
        // Does not call super.playAnimateOutSound() intentionally
        if (this.enableCloseSound) {
            this.playSound('data-audio-hiding');
            if (UI.isAudioCursorEnabled()) {
                UI.lockCursor(true);
                UI.setCursorByType(UIHTMLCursorTypes.Text);
                setTimeout(() => {
                    UI.lockCursor(false);
                }, 3000);
            }
        }
    }

    // --------------------------------------------------------------------------
    //                          ANIMATION 
    // --------------------------------------------------------------------------

    /** Apply CSS classes to animate this panel in. */
    protected applyDefaultAnimateIn() {
        const animOutStyles: Array<string> | undefined = Panel.animOutStyleMap.get(this.animateOutType);
        if (animOutStyles) {
            for (let style of animOutStyles) {
                this.Root.classList.remove(style);
            }
        }
        const animInStyles: Array<string> | undefined = Panel.animInStyleMap.get(this.animateInType);
        if (animInStyles) {
            for (let style of animInStyles) {
                this.Root.classList.add(style);
            }
        }
    }

    /** Apply CSS classes to animate this panel out. */
    protected applyDefaultAnimateOut() {
        const animInStyles: Array<string> | undefined = Panel.animInStyleMap.get(this.animateInType);
        if (animInStyles) {
            for (let style of animInStyles) {
                this.Root.classList.remove(style);
            }
        }
        const animOutStyles: Array<string> | undefined = Panel.animOutStyleMap.get(this.animateOutType);
        if (animOutStyles) {
            for (let style of animOutStyles) {
                this.Root.classList.add(style);
            }
        }
    }

    /**
     * Determine an animation type to assicate with this panel based on
     * how it is decorated by style classes.
     * @returns {AnchorType} Type of animation enum based on classes.
     */
    private getAnimationByInspectingClasses(): AnchorType {
        const isRight: boolean | undefined =
            this.Root.parentElement?.classList.contains("right_panel") ||
            this.Root.parentElement?.classList.contains("right") ||
            this.Root.parentElement?.parentElement?.classList.contains("right");

        const isLeft: boolean | undefined =
            this.Root.parentElement?.classList.contains("left_panel") ||
            this.Root.parentElement?.classList.contains("left") ||
            this.Root.parentElement?.parentElement?.classList.contains("left");

        const isCenter: boolean = (isLeft == isRight);   // Both or neither set.

        const isTop: boolean | undefined =
            this.Root.parentElement?.classList.contains("top") ||
            this.Root.parentElement?.parentElement?.classList.contains("top");

        const isBottom: boolean | undefined =
            this.Root.parentElement?.classList.contains("bottom") ||
            this.Root.parentElement?.parentElement?.classList.contains("bottom");

        const isMiddle: boolean = (isTop == isBottom); // Both or neither set.

        // Outer checks are horizontal, inner checks are vertical...
        if (isCenter) {                                         // Check center first
            if (isMiddle) return AnchorType.RelativeToCenter;  // Check middle first
            if (isBottom) return AnchorType.RelativeToBottom;
            return AnchorType.RelativeToTop;
        }
        if (isRight) {
            if (isMiddle) return AnchorType.RelativeToRight;  // Check middle first
            if (isBottom) return AnchorType.RelativeToBottomRight;
            return AnchorType.RelativeToTopRight;
        }
        if (isMiddle) return AnchorType.RelativeToLeft;  // Check middle first
        if (isBottom) return AnchorType.RelativeToBottom;
        if (isTop) return AnchorType.RelativeToTop;
        return AnchorType.None;
    }

    /** Return debugging human-friendly string of info. */
    toString(): string {
        let msg: string = "Panel:";
        msg += this.Root.tagName;
        return msg;
    }
}

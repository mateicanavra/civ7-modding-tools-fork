/**
 * @file panel-support.ts
 * @description Definition for Panel, main class for UI contexts.
 * @copyright 2020-2021, Firaxis Games
 */
import { Framework } from '/core/ui/framework.js';
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
export var AnchorType;
(function (AnchorType) {
    AnchorType[AnchorType["None"] = 0] = "None";
    AnchorType[AnchorType["Absolute"] = 1] = "Absolute";
    AnchorType[AnchorType["RelativeToTopLeft"] = 2] = "RelativeToTopLeft";
    AnchorType[AnchorType["RelativeToTop"] = 3] = "RelativeToTop";
    AnchorType[AnchorType["RelativeToTopRight"] = 4] = "RelativeToTopRight";
    AnchorType[AnchorType["RelativeToLeft"] = 5] = "RelativeToLeft";
    AnchorType[AnchorType["RelativeToCenter"] = 6] = "RelativeToCenter";
    AnchorType[AnchorType["RelativeToRight"] = 7] = "RelativeToRight";
    AnchorType[AnchorType["RelativeToBottomLeft"] = 8] = "RelativeToBottomLeft";
    AnchorType[AnchorType["RelativeToBottom"] = 9] = "RelativeToBottom";
    AnchorType[AnchorType["RelativeToBottomRight"] = 10] = "RelativeToBottomRight";
    AnchorType[AnchorType["SidePanelLeft"] = 11] = "SidePanelLeft";
    AnchorType[AnchorType["SidePanelRight"] = 12] = "SidePanelRight";
    AnchorType[AnchorType["Auto"] = 15] = "Auto";
    AnchorType[AnchorType["Fade"] = 16] = "Fade";
})(AnchorType || (AnchorType = {}));
;
class Panel extends Component {
    /** CTOR */
    constructor(root) {
        super(root);
        this.animateInType = AnchorType.None;
        this.animateOutType = AnchorType.None;
        this.enableOpenSound = false;
        this.enableCloseSound = false;
        this.documentClosePanelListener = this.close.bind(this, UIViewChangeMethod.PlayerInteraction);
        this.inputContext = InputContext.Shell;
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
    static onDefined(name) {
        super.onDefined(name);
        UI.Control.register(name);
    }
    /** Called once per creation, and immediately before the first time the component is initialized. */
    onInitialize() {
        super.onInitialize();
        // If auto animation is set, attempt to set animation based on attached anchoring.
        const anchor = this.getAnimationByInspectingClasses();
        if (this.animateInType == AnchorType.Auto) {
            this.animateInType = anchor;
        }
        if (this.animateOutType == AnchorType.Auto) {
            this.animateOutType = anchor;
        }
    }
    /** Called each time the component is re-attached to the DOM */
    onAttach() {
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
    onDetach() {
        document.removeEventListener('close-panel', this.documentClosePanelListener);
        // Close events can only happen for Panel components
        engine.off(`close-${this.Root.typeName}`, undefined, this);
        UI.Control.notifyAttached(this.Root.typeName, false);
        super.onDetach();
    }
    generateOpenCallbacks(_callbacks) {
        // Intended to be overridden
    }
    requestClose(inputEvent) {
        inputEvent?.stopPropagation();
        inputEvent?.preventDefault();
        this.close();
    }
    close(uiViewChangeMethod = UIViewChangeMethod.Unknown) {
        this.playAnimateOutSound();
        if (this.animateOutType != AnchorType.None) {
            this.applyDefaultAnimateOut();
            setTimeout(() => {
                Framework.ContextManager.pop(this.Root.tagName, { viewChangeMethod: uiViewChangeMethod });
            }, 200);
        }
        else {
            Framework.ContextManager.pop(this.Root.tagName, { viewChangeMethod: uiViewChangeMethod });
        }
    }
    /** Called if the panel was pushed in the Context Manager with a panelOptions object */
    setPanelOptions(_panelOptions) {
        console.warn("panel-support: panel was passed panelOptions but doesn't have a handler");
    }
    getPanelContent() {
        return "";
    }
    /**
     * Plays the animate in sound assigned to this object.
     */
    playAnimateInSound() {
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
    applyDefaultAnimateIn() {
        const animOutStyles = Panel.animOutStyleMap.get(this.animateOutType);
        if (animOutStyles) {
            for (let style of animOutStyles) {
                this.Root.classList.remove(style);
            }
        }
        const animInStyles = Panel.animInStyleMap.get(this.animateInType);
        if (animInStyles) {
            for (let style of animInStyles) {
                this.Root.classList.add(style);
            }
        }
    }
    /** Apply CSS classes to animate this panel out. */
    applyDefaultAnimateOut() {
        const animInStyles = Panel.animInStyleMap.get(this.animateInType);
        if (animInStyles) {
            for (let style of animInStyles) {
                this.Root.classList.remove(style);
            }
        }
        const animOutStyles = Panel.animOutStyleMap.get(this.animateOutType);
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
    getAnimationByInspectingClasses() {
        const isRight = this.Root.parentElement?.classList.contains("right_panel") ||
            this.Root.parentElement?.classList.contains("right") ||
            this.Root.parentElement?.parentElement?.classList.contains("right");
        const isLeft = this.Root.parentElement?.classList.contains("left_panel") ||
            this.Root.parentElement?.classList.contains("left") ||
            this.Root.parentElement?.parentElement?.classList.contains("left");
        const isCenter = (isLeft == isRight); // Both or neither set.
        const isTop = this.Root.parentElement?.classList.contains("top") ||
            this.Root.parentElement?.parentElement?.classList.contains("top");
        const isBottom = this.Root.parentElement?.classList.contains("bottom") ||
            this.Root.parentElement?.parentElement?.classList.contains("bottom");
        const isMiddle = (isTop == isBottom); // Both or neither set.
        // Outer checks are horizontal, inner checks are vertical...
        if (isCenter) { // Check center first
            if (isMiddle)
                return AnchorType.RelativeToCenter; // Check middle first
            if (isBottom)
                return AnchorType.RelativeToBottom;
            return AnchorType.RelativeToTop;
        }
        if (isRight) {
            if (isMiddle)
                return AnchorType.RelativeToRight; // Check middle first
            if (isBottom)
                return AnchorType.RelativeToBottomRight;
            return AnchorType.RelativeToTopRight;
        }
        if (isMiddle)
            return AnchorType.RelativeToLeft; // Check middle first
        if (isBottom)
            return AnchorType.RelativeToBottom;
        if (isTop)
            return AnchorType.RelativeToTop;
        return AnchorType.None;
    }
    /** Return debugging human-friendly string of info. */
    toString() {
        let msg = "Panel:";
        msg += this.Root.tagName;
        return msg;
    }
}
Panel.animInStyleMap = new Map();
Panel.animOutStyleMap = new Map();
export default Panel;

//# sourceMappingURL=file:///core/ui/panel-support.js.map

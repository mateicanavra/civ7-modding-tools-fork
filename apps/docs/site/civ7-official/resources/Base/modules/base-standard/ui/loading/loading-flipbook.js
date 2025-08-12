"use strict";
/**
 * @file loading-flipbook.ts
 * @copyright 2024, Firaxis Games
 * @description Flipbook animation component, bare metal version for loading screens.
 */
class FlipBook extends HTMLElement {
    /** Get current animation frame */
    get getFrame() { return this.frame; }
    /**
     * @remarks This will not add the flipbook to DOM, only register the texture atlas data.
     * @param atlas Either a single texture atlas or multiple atlases
     * @param fps Frames per second of the animation
     */
    constructor() {
        super();
        /** Internal representation of each atlas and their corresponding HTML element */
        this.atlas = [];
        /** Current shown atlas. -1 means it has not yet initialized */
        this.atlasIndex = -1;
        /** Current frame (out of FlipBook.nFrames, not per atlas frames*/
        this.frame = 0;
        /** Is the flipbook animating or not */
        this.isRunning = false;
        this.fps = 15;
        this.nFrames = 0;
    }
    /** Callback for when this is added to DOM. Will automatically draw the first frame. */
    connectedCallback() {
        const attribute = this.getAttribute("data-flipbook-definition");
        if (attribute) {
            const flipbookDef = JSON.parse(attribute);
            if (!Array.isArray(flipbookDef.atlas[0])) {
                flipbookDef.atlas = [flipbookDef.atlas];
            }
            // copy and format into this.atlas
            flipbookDef.atlas.forEach(a => {
                const _atlas = {
                    src: a[0],
                    sprite: { width: a[1], height: a[2] },
                    size: a[3],
                    nFrames: a[4] ? a[4] : -1,
                    countMax: { x: 0, y: 0 }
                };
                this.atlas.push({ element: undefined, data: _atlas });
            });
            // calc nFrames (per atlas and in total) as well as occupied size of each atlas
            let f = 0;
            this.atlas.forEach(a => {
                let nX = a.data.size / a.data.sprite.width;
                let nY = a.data.size / a.data.sprite.height;
                if (!Number.isInteger(nX) || !Number.isInteger(nY)) {
                    console.warn(`Atlas (${a.data.src}, ${a.data.size} x ${a.data.size}) is not evenly divided by child sprites (${a.data.sprite})`);
                    nX = Math.floor(nY);
                    nY = Math.floor(nY);
                }
                // should be max number of frames
                if (a.data.nFrames == -1)
                    a.data.nFrames = nY * nX;
                a.data.countMax = { x: nX, y: nY };
                f += a.data.nFrames;
            });
            this.nFrames = f;
            this.fps = flipbookDef.fps;
        }
        if (this.root == null) {
            const el = document.createElement('div');
            el.classList.add('flipbook-root');
            el.style.position = 'relative';
            this.appendChild(el);
            this.root = el;
        }
        this.root.style.width = GlobalScaling.pixelsToRem(this.atlas[0].data.sprite.width) + 'rem';
        this.root.style.height = GlobalScaling.pixelsToRem(this.atlas[0].data.sprite.height) + 'rem';
        this.atlas.forEach(atlas => {
            const animation = document.createElement('div');
            animation.style.position = 'absolute';
            animation.style.willChange = 'transform';
            animation.style.width = GlobalScaling.pixelsToRem(atlas.data.sprite.width) + 'rem';
            animation.style.height = GlobalScaling.pixelsToRem(atlas.data.sprite.height) + 'rem';
            animation.style.backgroundImage = `url(${atlas.data.src})`;
            animation.style.visibility = 'hidden'; // toggle between multiple atlases via their visibility
            atlas.element = animation;
            this.root.appendChild(animation);
        });
        this.drawFrame(0);
        this.run();
    }
    disconnectedCallback() {
        clearInterval(this.intervalId);
        this.isRunning = false;
    }
    /** Start the animation. If the animation is already running, {@link FlipBook.restart | restart}. */
    run() {
        if (this.isRunning) {
            console.warn("Trying to run an already playing flipbook. Restarting instead.");
            this.restart();
        }
        else {
            this.isRunning = true;
            this.spawnInterval();
        }
    }
    /** Restarts the animation. */
    restart() {
        clearInterval(this.intervalId);
        this.frame = 0;
        this.isRunning = true;
        this.spawnInterval();
    }
    /** Creates the internal update loop. */
    spawnInterval() {
        this.intervalId = setInterval(() => {
            try {
                this.drawFrame(this.frame);
            }
            catch (e) {
                console.error(e);
                this.isRunning = false;
                clearInterval(this.intervalId);
                return;
            }
            this.frame++;
            if (this.frame == this.nFrames)
                this.frame = 0;
        }, 1000 / this.fps);
    }
    /**
     * Renders a frame on screen.
     * @param f Frame to render
     */
    drawFrame(f) {
        // check if we need to render a new atlas
        let prevFrameCount = 0;
        let correctAtlasIndex = -1;
        for (let i = 0; i < this.atlas.length; i++) {
            prevFrameCount += this.atlas[i].data.nFrames;
            if (prevFrameCount > f) {
                prevFrameCount -= this.atlas[i].data.nFrames;
                correctAtlasIndex = i;
                break;
            }
        }
        // frame is on new atlas, show it
        if (correctAtlasIndex != this.atlasIndex) {
            this.atlasIndex = correctAtlasIndex;
            this.atlas.forEach(atlas => {
                if (!atlas.element)
                    console.error(`Flipbook is trying to access a non-existing element for ${atlas.data.src}`);
                else
                    atlas.element.style.visibility = 'hidden';
            });
            this.atlas[this.atlasIndex].element.style.visibility = 'visible';
            if (!this.root)
                console.warn("This should never happen! Trying to draw frame before initialization");
            else {
                this.root.style.width = GlobalScaling.pixelsToRem(this.atlas[this.atlasIndex].data.sprite.width) + 'rem';
                this.root.style.height = GlobalScaling.pixelsToRem(this.atlas[this.atlasIndex].data.sprite.height) + 'rem';
            }
        }
        // assumes frame 0 is top left and moves left to right, top to bottom
        const internalFrame = f - prevFrameCount;
        const y = Math.floor(internalFrame / this.atlas[this.atlasIndex].data.countMax.x);
        const x = this.frame - y * this.atlas[this.atlasIndex].data.countMax.y;
        if (!this.atlas[this.atlasIndex].element)
            console.error(`Flipbook is trying to access a non-existing element for ${this.atlas[this.atlasIndex].data.src}`);
        else {
            const ele = this.atlas[this.atlasIndex].element;
            ele.style.backgroundPositionX = GlobalScaling.pixelsToRem(-x * this.atlas[this.atlasIndex].data.sprite.width) + 'rem';
            ele.style.backgroundPositionY = GlobalScaling.pixelsToRem(-y * this.atlas[this.atlasIndex].data.sprite.height) + 'rem';
            ele.style.backgroundSize = GlobalScaling.pixelsToRem(this.atlas[this.atlasIndex].data.size) + "rem";
        }
    }
}
customElements.define('flip-book', FlipBook);

//# sourceMappingURL=file:///base-standard/ui/loading/loading-flipbook.js.map

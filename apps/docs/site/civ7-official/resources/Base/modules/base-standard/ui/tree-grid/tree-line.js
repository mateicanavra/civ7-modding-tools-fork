/**
 * @file tree-line.ts
 * @copyright 2024, Firaxis Games
 * @description Component for a line connecting two tree-cards
 */
import { UpdateLinesEventName } from '/base-standard/ui/tree-grid/tree-support.js';
import { TreeClassSelector, TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
const TREE_LINE_DEBUG = false;
class TreeLine extends Component {
    constructor(root) {
        super(root);
        this.from = "";
        this.to = "";
        this.locked = true;
        this.dummy = true;
        this.collisionOffset = 0;
        this.direction = TreeGridDirection.HORIZONTAL;
        this.isFromNodeDummy = false;
        this.isToNodeDummy = false;
        this.GENERAL_LINE_CLASS = "absolute h-6 tree-grid-line ";
        this.GENERAL_CORNER_CLASS = "absolute size-6 tree-grid-line-corner bg-cover bg-center ";
        // Calculations
        this.LINE_WIDTH = 8;
        this.LINE_PROPORTION = 8 / 16; // has to be less than one (used as conversion factor)
        this.CORNER_SIZE = 24;
        this.OFFSET_TO_CENTER = 12; // How much we want to squeeze the line into the center
        this.CENTER_LINE_ASSET_CORRECTION = (this.LINE_WIDTH / 2);
        this.LINE_OUTSET_OFFSET = 4;
        this.LEVEL_LINE_ELONGATION = 64;
        // Only used in vertical lines
        this.SEPARATION_FROM_CENTER = 8;
        this.ARROW_SIZE = 10;
        this.GAP_SIZE = 5;
        this.boundRender = this.render.bind(this);
        this.onUpdateLinesEventListener = this.queueRender.bind(this);
        this.waitingToRender = false;
    }
    onInitialize() {
        this.initializeAttributes();
        this.queueRender();
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener(UpdateLinesEventName, this.onUpdateLinesEventListener);
    }
    onDetach() {
        this.Root.removeEventListener(UpdateLinesEventName, this.onUpdateLinesEventListener);
        super.onDetach();
    }
    initializeAttributes() {
        const from = this.Root.getAttribute("from");
        if (from) {
            this.from = from;
        }
        const to = this.Root.getAttribute("to");
        if (to) {
            this.to = to;
        }
        const locked = this.Root.getAttribute("locked");
        if (locked) {
            this.locked = locked == 'true';
        }
        const dummy = this.Root.getAttribute("dummy");
        if (dummy) {
            this.dummy = dummy == 'true';
        }
        const direction = this.Root.getAttribute("direction");
        if (direction) {
            this.direction = +direction;
        }
    }
    queueRender() {
        if (!this.waitingToRender) {
            this.waitingToRender = true;
            this.Root.classList.add("hidden");
            delayByFrame(this.boundRender, 3);
        }
    }
    render() {
        this.waitingToRender = false;
        if (this.Root.isConnected) {
            if (this.direction == TreeGridDirection.HORIZONTAL) {
                this.createHorizontalLine();
            }
            else {
                this.createVerticalLine();
            }
        }
        this.Root.classList.remove("hidden");
    }
    getConnectingNodes() {
        if (!this.from || !this.to) {
            console.warn("tree-line: No 'from' or 'to' attribute available to create this line");
            return;
        }
        const treeContainer = this.Root.closest('.tree-container');
        if (!treeContainer) {
            console.warn("tree-line: No tree container found to query card elements from.");
            return;
        }
        const fromElement = treeContainer.querySelector(`.${TreeClassSelector.CARD}[type="${this.from}"]`);
        const toElement = treeContainer.querySelector(`.${TreeClassSelector.CARD}[type="${this.to}"]`);
        if (!fromElement || !toElement) {
            console.warn("tree-line: No 'from' or 'to' element available to create this line");
            return;
        }
        return [fromElement, toElement];
    }
    setDummyNodesData(fromElement, toElement) {
        if (this.dummy && fromElement.classList.contains("dummy")) {
            this.isFromNodeDummy = true;
            if (TREE_LINE_DEBUG) {
                this.Root.setAttribute("from-dummy", "true");
            }
        }
        if (this.dummy && toElement.classList.contains("dummy")) {
            this.isToNodeDummy = true;
            if (TREE_LINE_DEBUG) {
                this.Root.setAttribute("to-dummy", "true");
            }
        }
    }
    getHorizontalCalculations(fromElement, toElement) {
        //Try to originate the arrows from the parent nodes on the card
        let fromElementParentNode = fromElement.querySelector(".tree-card-bg");
        let toElementParentNode = toElement.querySelector(".tree-card-bg");
        let fromTopHeightOffset = fromElementParentNode ? (fromElementParentNode.offsetHeight / 2) : (fromElement.offsetHeight / 2);
        let toTopHeightOffset = toElementParentNode ? (toElementParentNode.offsetHeight / 2) : (toElement.offsetHeight / 2);
        const uiScale = 1;
        const leftLineHeightProportion = this.LINE_PROPORTION * uiScale;
        const rightLineHeightProportion = 1 - leftLineHeightProportion;
        // Get positions and sizes from target and source nodes.
        let fromTop = fromElement.offsetTop + fromTopHeightOffset;
        let toTop = toElement.offsetTop + toTopHeightOffset;
        const fromLeft = fromElementParentNode && !this.dummy ? fromElement.offsetLeft + fromElement.offsetWidth : fromElement.offsetLeft;
        const toLeft = toElement.offsetLeft;
        const verticalLength = Math.round(Math.abs(toTop - fromTop));
        const horizontalLength = Math.round(Math.abs(toLeft - fromLeft));
        const leftWidth = Math.round(horizontalLength * leftLineHeightProportion);
        const rightWidth = Math.round(horizontalLength * rightLineHeightProportion);
        // Total vertical height minus each half of corner and asset correction
        let centerHeight = verticalLength - Layout.pixelsToScreenPixels(this.CORNER_SIZE) - Layout.pixelsToScreenPixels(this.CENTER_LINE_ASSET_CORRECTION);
        if (centerHeight <= Layout.pixelsToScreenPixels(this.LINE_WIDTH)) {
            fromTop = toTop;
            centerHeight = 0;
        }
        const calculations = {
            fromTop,
            toTop,
            fromLeft,
            toLeft,
            centerHeight,
            leftWidth,
            rightWidth,
            verticalLength,
            horizontalLength
        };
        if (TREE_LINE_DEBUG) {
            console.log(`Line calculations for nodes ${this.from} to ${this.to}`);
            console.table(calculations);
        }
        return calculations;
    }
    createHorizontalLine() {
        while (this.Root.hasChildNodes()) {
            this.Root.removeChild(this.Root.children[0]);
        }
        const connectingNodes = this.getConnectingNodes();
        if (!connectingNodes) {
            return;
        }
        const [fromElement, toElement] = connectingNodes;
        this.setDummyNodesData(fromElement, toElement);
        const { fromTop, toTop, fromLeft, centerHeight, leftWidth, rightWidth, verticalLength, horizontalLength } = this.getHorizontalCalculations(fromElement, toElement);
        // Scenario 1: source down and left, target: up and right
        if (fromTop > toTop && centerHeight > 0) {
            if (TREE_LINE_DEBUG) {
                this.Root.setAttribute("up-line", "true");
            }
            // Create line and corner with set sizes
            const fromLine = document.createElement("div");
            fromLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 -left-13";
            fromLine.style.bottomPX = -Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            const fromCorner = document.createElement("div");
            fromCorner.classList.value = this.GENERAL_CORNER_CLASS + "rotate-180";
            fromCorner.style.bottomPX = -Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            this.Root.appendChild(fromLine);
            this.Root.appendChild(fromCorner);
            const nodeDummyReset = horizontalLength - (Layout.pixelsToScreenPixels(this.CORNER_SIZE) * 2);
            // The center height is enough to make a center line
            if (Math.abs(centerHeight) > Layout.pixelsToScreenPixels(this.LINE_OUTSET_OFFSET) * 2) {
                const centerLine = document.createElement("div");
                centerLine.classList.value = this.GENERAL_LINE_CLASS + "origin-top-left rotate-90";
                centerLine.style.widthPX = centerHeight;
                centerLine.style.topPX = -centerHeight - (Layout.pixelsToScreenPixels(this.CORNER_SIZE) / 2) - Layout.pixelsToScreenPixels(this.CENTER_LINE_ASSET_CORRECTION);
                centerLine.style.leftPX = leftWidth;
                if (this.isFromNodeDummy) {
                    centerLine.style.leftPX = nodeDummyReset + Layout.pixelsToScreenPixels(this.CORNER_SIZE);
                }
                if (this.isToNodeDummy) {
                    centerLine.style.leftPX = nodeDummyReset + Layout.pixelsToScreenPixels(this.CORNER_SIZE);
                }
                this.Root.appendChild(centerLine);
            }
            const toCorner = document.createElement("div");
            toCorner.classList.value = this.GENERAL_CORNER_CLASS;
            toCorner.style.bottomPX = verticalLength - Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            const toLine = document.createElement("div");
            toLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 -right-13";
            this.Root.appendChild(toCorner);
            toCorner.appendChild(toLine);
            if (this.isFromNodeDummy) {
                fromLine.style.leftPX = nodeDummyReset;
                fromLine.style.widthPX = leftWidth;
                fromLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 rotate-180 origin-left";
                fromCorner.style.leftPX = nodeDummyReset;
                toCorner.style.leftPX = nodeDummyReset;
                toLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 left-7";
                toLine.style.widthPX = rightWidth;
            }
            if (this.isToNodeDummy) {
                fromLine.style.leftPX = nodeDummyReset;
                fromLine.classList.add("rotate-180", "origin-left");
                fromCorner.style.leftPX = nodeDummyReset;
                toCorner.style.leftPX = nodeDummyReset;
                toLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 left-7";
                toLine.style.widthPX = rightWidth;
            }
        }
        // Scenario 2: source up and left, target: down and right
        else if (fromTop < toTop && centerHeight > 0) {
            if (TREE_LINE_DEBUG) {
                this.Root.setAttribute("down-line", "true");
            }
            const fromLine = document.createElement("div");
            fromLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 -left-13";
            fromLine.style.topPX = -Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            const fromCorner = document.createElement("div");
            fromCorner.classList.value = this.GENERAL_CORNER_CLASS + "rotate-90";
            fromCorner.style.topPX = -Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            this.Root.appendChild(fromLine);
            this.Root.appendChild(fromCorner);
            const nodeDummyReset = horizontalLength - (Layout.pixelsToScreenPixels(this.CORNER_SIZE) * 2);
            if (Math.abs(centerHeight) > Layout.pixelsToScreenPixels(this.LINE_OUTSET_OFFSET) * 2) {
                const centerLine = document.createElement("div");
                centerLine.classList.value = this.GENERAL_LINE_CLASS + "origin-top-left rotate-90";
                centerLine.style.widthPX = centerHeight;
                centerLine.style.topPX = (Layout.pixelsToScreenPixels(this.CORNER_SIZE) / 2) + Layout.pixelsToScreenPixels(this.CENTER_LINE_ASSET_CORRECTION);
                centerLine.style.leftPX = leftWidth;
                if (this.isFromNodeDummy) {
                    centerLine.style.leftPX = nodeDummyReset + Layout.pixelsToScreenPixels(this.CORNER_SIZE);
                    centerLine.style.widthPX = centerHeight - Layout.pixelsToScreenPixels(this.CENTER_LINE_ASSET_CORRECTION);
                }
                if (this.isToNodeDummy) {
                    centerLine.style.leftPX = nodeDummyReset + Layout.pixelsToScreenPixels(this.CORNER_SIZE);
                }
                this.Root.appendChild(centerLine);
            }
            const toCorner = document.createElement("div");
            toCorner.classList.value = this.GENERAL_CORNER_CLASS + "-rotate-90";
            toCorner.style.topPX = verticalLength - Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            const toLine = document.createElement("div");
            toLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 rotate-90 -bottom-10 -left-3";
            this.Root.appendChild(toCorner);
            toCorner.appendChild(toLine);
            if (this.isFromNodeDummy) {
                fromLine.style.leftPX = nodeDummyReset;
                fromLine.style.widthPX = leftWidth;
                fromLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 rotate-180 origin-left";
                fromCorner.style.leftPX = nodeDummyReset;
                toCorner.style.leftPX = nodeDummyReset;
                toLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 rotate-90 origin-bottom-left";
                toLine.style.widthPX = rightWidth;
            }
            if (this.isToNodeDummy) {
                fromLine.style.leftPX = nodeDummyReset;
                fromCorner.style.leftPX = nodeDummyReset;
                toCorner.style.leftPX = nodeDummyReset;
                toLine.classList.value = this.GENERAL_LINE_CLASS + "w-12 rotate-90 origin-bottom-left";
                toLine.style.widthPX = rightWidth;
            }
        }
        // Scenario 3: source, target: next to each other
        else {
            if (TREE_LINE_DEBUG) {
                this.Root.setAttribute("level-line", "true");
            }
            const centerLine = document.createElement("div");
            centerLine.classList.value = this.GENERAL_LINE_CLASS + "origin-top-left";
            centerLine.style.topPX = -Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            this.Root.appendChild(centerLine);
            if (this.isFromNodeDummy && this.isToNodeDummy) {
                this.LEVEL_LINE_ELONGATION = 0;
            }
            centerLine.style.widthPX = leftWidth + rightWidth + Layout.pixelsToScreenPixels(this.LEVEL_LINE_ELONGATION);
            if (this.isFromNodeDummy && this.isToNodeDummy) {
                centerLine.style.leftPX = leftWidth - Layout.pixelsToScreenPixels(this.CORNER_SIZE);
            }
            else if (this.isFromNodeDummy) {
                centerLine.style.topPX = -verticalLength - Layout.pixelsToScreenPixels(this.OFFSET_TO_CENTER);
            }
            else if (this.isToNodeDummy) {
                centerLine.style.leftPX = leftWidth - Layout.pixelsToScreenPixels(this.CORNER_SIZE);
            }
            else {
                centerLine.classList.add("-left-10");
            }
        }
        this.Root.classList.toggle("locked", this.locked);
        this.Root.attributeStyleMap.set('top', CSS.px(fromTop));
        this.Root.attributeStyleMap.set('left', CSS.px(fromLeft + this.collisionOffset));
    }
    createVerticalLine() {
        this.Root.innerHTML = '';
        const connectingNodes = this.getConnectingNodes();
        if (!connectingNodes) {
            return;
        }
        const [fromElement, toElement] = connectingNodes;
        const uiScale = 1;
        const topLineHeightProportion = this.LINE_PROPORTION * uiScale;
        const bottomLineHeightProportion = 1 - topLineHeightProportion;
        // Get positions and sizes from target and source nodes.
        const fromTop = fromElement.offsetTop + fromElement.offsetHeight + Layout.pixelsToScreenPixels(this.GAP_SIZE);
        const toTop = toElement.offsetTop - Layout.pixelsToScreenPixels(this.ARROW_SIZE);
        let fromLeft = fromElement.offsetLeft + fromElement.offsetWidth / 2;
        const toLeft = toElement.offsetLeft + toElement.offsetWidth / 2;
        const widthOffset = Layout.pixelsToScreenPixels(this.LINE_WIDTH);
        const verticalLength = Math.round(Math.abs(toTop - fromTop));
        const horizontalLength = Math.round(Math.abs(toLeft - fromLeft));
        // Normalize rounding errors (by line width)
        if (horizontalLength <= (Layout.pixelsToScreenPixels(this.LINE_WIDTH / 2))) {
            fromLeft = toLeft;
        }
        let singleLine = false;
        const topWidth = Math.round(verticalLength * topLineHeightProportion);
        const bottomWidth = Math.round(verticalLength * bottomLineHeightProportion);
        const topLineSplit = document.createElement("div");
        topLineSplit.classList.add("top-split");
        const topLineSplitStyle = topLineSplit.style;
        const centerLineSplit = document.createElement("div");
        centerLineSplit.classList.add("center-split");
        const centerLineSplitStyle = centerLineSplit.style;
        const bottomLineSplit = document.createElement("div");
        bottomLineSplit.classList.add("bottom-split");
        const bottomLineSplitStyle = bottomLineSplit.style;
        const arrowHead = document.createElement("div");
        arrowHead.classList.value = "tree-line-arrow absolute -bottom-1 -right-3";
        bottomLineSplit.appendChild(arrowHead);
        const centerHeight = horizontalLength - Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER) - (Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER) - widthOffset);
        // Scenario 1: source right and up, target: left and down
        if (fromLeft > toLeft && centerHeight > 0) {
            topLineSplitStyle.heightPX = topWidth;
            topLineSplitStyle.topPX = 0;
            topLineSplitStyle.leftPX = -Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER);
            centerLineSplitStyle.heightPX = centerHeight;
            centerLineSplitStyle.topPX = topWidth - widthOffset;
            centerLineSplitStyle.leftPX = widthOffset - Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER);
            bottomLineSplitStyle.heightPX = bottomWidth;
            bottomLineSplitStyle.topPX = topWidth;
            bottomLineSplitStyle.leftPX = -centerHeight - Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER) + widthOffset;
            if (this.dummy) {
                topLineSplitStyle.heightPX = topWidth;
                topLineSplitStyle.topPX = 0;
                topLineSplitStyle.leftPX = 0;
                centerLineSplitStyle.heightPX = centerHeight;
                centerLineSplitStyle.topPX = topWidth - widthOffset;
                centerLineSplitStyle.leftPX = widthOffset;
                bottomLineSplitStyle.heightPX = bottomWidth;
                bottomLineSplitStyle.topPX = topWidth;
                bottomLineSplitStyle.leftPX = -centerHeight + widthOffset;
            }
        }
        // Scenario 2: source left and up, target: right and down
        else if (fromLeft < toLeft && centerHeight > 0) {
            topLineSplitStyle.heightPX = topWidth;
            topLineSplitStyle.topPX = 0;
            topLineSplitStyle.leftPX = Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER);
            centerLineSplitStyle.heightPX = centerHeight;
            centerLineSplitStyle.topPX = topWidth - widthOffset;
            centerLineSplitStyle.leftPX = centerHeight + Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER);
            bottomLineSplitStyle.heightPX = bottomWidth;
            bottomLineSplitStyle.topPX = topWidth;
            bottomLineSplitStyle.leftPX = centerHeight + Layout.pixelsToScreenPixels(this.SEPARATION_FROM_CENTER) - widthOffset;
            if (this.dummy) {
                topLineSplitStyle.heightPX = topWidth;
                topLineSplitStyle.topPX = 0;
                topLineSplitStyle.leftPX = 0;
                centerLineSplitStyle.heightPX = horizontalLength + widthOffset;
                centerLineSplitStyle.topPX = topWidth - widthOffset;
                centerLineSplitStyle.leftPX = horizontalLength + widthOffset;
                bottomLineSplitStyle.heightPX = bottomWidth;
                bottomLineSplitStyle.topPX = topWidth;
                bottomLineSplitStyle.leftPX = horizontalLength;
            }
        }
        // Scenario 3: source, target: next to each other
        else {
            singleLine = true;
            bottomLineSplit.style.heightPX = topWidth + bottomWidth;
        }
        this.Root.classList.toggle("locked", this.locked);
        if (!singleLine) {
            this.Root.appendChild(topLineSplit);
            this.Root.appendChild(centerLineSplit);
        }
        this.Root.appendChild(bottomLineSplit);
        const rootStyle = this.Root.style;
        rootStyle.widthPX = Layout.pixelsToScreenPixels(this.LINE_WIDTH);
        rootStyle.topPX = fromTop;
        rootStyle.leftPX = fromLeft;
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'from':
                this.from = newValue;
                break;
            case 'to':
                this.to = newValue;
                break;
            case 'locked':
                this.locked = newValue == 'true';
                break;
            case 'dummy':
                this.dummy = newValue == 'true';
                break;
            case 'collision-offset':
                this.collisionOffset = Number(newValue);
                break;
            case 'direction':
                this.direction = +newValue;
                break;
        }
        this.queueRender();
    }
}
Controls.define('tree-line', {
    createInstance: TreeLine,
    description: 'Single line connecting two cards',
    classNames: ['tree-line'],
    styles: ["fs://game/base-standard/ui/tree-grid/tree-components.css"],
    attributes: [
        {
            name: 'from',
            description: 'Line\'s origin card type'
        },
        {
            name: 'to',
            description: 'Line\'s target card type'
        },
        {
            name: 'locked',
            description: 'Boolean to know if the line is on locked state'
        },
        {
            name: 'dummy',
            description: 'Boolean to know if the line is on locked state'
        },
        {
            name: 'collision-offset',
            description: 'Collision offset to move lines. Number in pixels'
        },
        {
            name: 'direction',
            description: 'Allows to create a variant for vertical or horizontal trees'
        },
    ]
});

//# sourceMappingURL=file:///base-standard/ui/tree-grid/tree-line.js.map

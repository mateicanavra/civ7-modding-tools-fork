/**
 * tree-grid.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Contains tree data for models to use.
*/
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
export var LineDirection;
(function (LineDirection) {
    LineDirection[LineDirection["UP_LINE"] = 0] = "UP_LINE";
    LineDirection[LineDirection["SAME_LEVEL_LINE"] = 1] = "SAME_LEVEL_LINE";
    LineDirection[LineDirection["DOWN_LINE"] = 2] = "DOWN_LINE";
})(LineDirection || (LineDirection = {}));
export var TreeGridDirection;
(function (TreeGridDirection) {
    TreeGridDirection[TreeGridDirection["HORIZONTAL"] = 0] = "HORIZONTAL";
    TreeGridDirection[TreeGridDirection["VERTICAL"] = 1] = "VERTICAL";
})(TreeGridDirection || (TreeGridDirection = {}));
// Using an enum instead of a const string because we probably want more selectors on future skinning
export var TreeClassSelector;
(function (TreeClassSelector) {
    TreeClassSelector["CARD"] = "tree-card-selector";
})(TreeClassSelector || (TreeClassSelector = {}));
// Base class for a card that needs tree-component support
export class TreeCardBase extends Component {
    constructor(root) {
        super(root);
        this.cardClass = TreeClassSelector.CARD;
        this.Root.classList.add(this.cardClass);
    }
}
export const UpdateLinesEventName = 'update-tree-lines';
export class UpdateLinesEvent extends CustomEvent {
    constructor() {
        super(UpdateLinesEventName, { bubbles: false, cancelable: true });
    }
}
export const ScaleTreeCardEventName = 'scale-tree-card';
export class ScaleTreeCardEvent extends CustomEvent {
    constructor(scale) {
        super(ScaleTreeCardEventName, { bubbles: false, cancelable: true, detail: { scale } });
    }
}
export class TreeCardScaleBoundary {
    get currentCardScale() {
        return this._currentCardScale;
    }
    set currentCardScale(value) {
        this._currentCardScale = value;
        this.updateCardLines();
    }
    constructor(container, minScale, maxScale) {
        this._currentCardScale = 1;
        // 70% of original tree card is the lower limit for scaling
        this.MIN_SCALE = 0.7;
        this.MAX_SCALE = 1;
        this.linesContainer = null;
        this.resizeEventListener = this.onResize.bind(this);
        this.currentGrid = container;
        if (minScale) {
            this.MIN_SCALE = minScale;
        }
        if (maxScale) {
            this.MAX_SCALE = maxScale;
        }
        window.addEventListener('resize', this.resizeEventListener);
    }
    resetScale() {
        this.currentCardScale = this.MAX_SCALE;
    }
    updateCardLines() {
        window.dispatchEvent(new ScaleTreeCardEvent(this.currentCardScale));
        this.linesContainer = this.currentGrid.querySelector('.lines-container');
        if (!this.linesContainer) {
            console.warn("updateCardLines(): No lines container to update lines from");
            return;
        }
        this.linesContainer.querySelectorAll('tree-line')?.forEach(c => {
            c.dispatchEvent(new UpdateLinesEvent());
        });
    }
    onResize() {
        this.checkBoundaries();
    }
    checkBoundaries() {
        this.resetScale();
        waitForLayout(() => {
            const treeContainer = this.currentGrid.querySelector('.tree-container');
            if (!treeContainer) {
                console.warn("screen-tech-tree: checkBoundaries(): No tree container found, focus is not posible");
                return;
            }
            const children = treeContainer.children;
            let totalParentHeight = 0;
            let biggestChildHeight = 0;
            // Get the biggest child
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const childHeight = child.offsetHeight;
                const parent = child.parentElement;
                if (!parent) {
                    continue;
                }
                const parentHeight = parent.offsetHeight;
                totalParentHeight = parentHeight;
                if (childHeight > parentHeight && childHeight > biggestChildHeight) {
                    biggestChildHeight = childHeight;
                }
            }
            // Calculate scaling from proportions on bigger child and container
            if (totalParentHeight > 0 && biggestChildHeight > 0) {
                const scalingPercentage = totalParentHeight / biggestChildHeight;
                const currentCardScale = Math.round(Math.max(this.MIN_SCALE, scalingPercentage) * 100) / 100;
                this.currentCardScale = currentCardScale;
            }
        });
    }
    removeListeners() {
        window.removeEventListener('resize', this.resizeEventListener);
    }
}
export var TreeSupport;
(function (TreeSupport) {
    /**
     * Creates a grid element for a given tree from a model.
     * Static because access comes from model, not from instantiation.
     * @param tree
     * @param direction
     * @param createCardFn
     * @returns
     */
    function getGridElement(tree, direction, createCardFn) {
        if (direction == TreeGridDirection.HORIZONTAL) {
            return createGridElementHorizontal(tree, createCardFn);
        }
        else {
            return createGridElementVertical(tree, createCardFn);
        }
    }
    TreeSupport.getGridElement = getGridElement;
    const SMALL_SCREEN_MODE_MAX_HEIGHT = 800;
    const SMALL_SCREEN_MODE_MAX_WIDTH = 1000;
    function isSmallScreen() {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        return isMobileViewExperience || window.innerHeight <= Layout.pixelsToScreenPixels(SMALL_SCREEN_MODE_MAX_HEIGHT) || window.innerWidth <= Layout.pixelsToScreenPixels(SMALL_SCREEN_MODE_MAX_WIDTH);
    }
    TreeSupport.isSmallScreen = isSmallScreen;
    /**
     *
     * @param tree The model tree string identifier
     * @param createCardFn The function to create a specific card element
     * @returns And object with the container for the tree content and the card scaling object to manage resize.
     */
    function createGridElementHorizontal(tree, createCardFn) {
        const scrollable = document.createElement('fxs-scrollable-horizontal');
        scrollable.classList.add("w-full", "flex-auto");
        const treeContainer = document.createElement("div");
        treeContainer.classList.add("tree-container", "items-center", "flex", "flex-row", "m-6");
        treeContainer.addEventListener('navigate-input', TreeNavigation.Horizontal.onNavigateInput);
        const cardsColumn = document.createElement('div');
        cardsColumn.classList.add("tree-grid-column");
        Databind.for(cardsColumn, `${tree}.treeGrid.grid`, 'column');
        {
            const cardDiv = document.createElement("div");
            Databind.for(cardDiv, 'column', 'card');
            {
                const card = document.createElement("div");
                card.classList.add("tree-grid-card");
                Databind.attribute(card, "row", "card.row");
                Databind.attribute(card, "column", "card.column");
                createCardFn(card);
                cardDiv.appendChild(card);
            }
            cardsColumn.appendChild(cardDiv);
        }
        treeContainer.appendChild(cardsColumn);
        scrollable.appendChild(treeContainer);
        waitForLayout(() => {
            const linesContainer = document.createElement('div');
            linesContainer.classList.add("lines-container");
            const cardLineDiv = document.createElement("div");
            Databind.for(cardLineDiv, `${tree}.treeGrid.lines`, 'line');
            {
                const cardLine = document.createElement("tree-line");
                cardLine.setAttribute('direction', `${TreeGridDirection.HORIZONTAL}`);
                Databind.attribute(cardLine, 'from', 'line.from');
                Databind.attribute(cardLine, 'to', 'line.to');
                Databind.attribute(cardLine, 'locked', 'line.locked');
                Databind.attribute(cardLine, 'dummy', 'line.dummy');
                Databind.attribute(cardLine, 'collision-offset', 'line.collisionOffset');
                cardLineDiv.appendChild(cardLine);
            }
            linesContainer.appendChild(cardLineDiv);
            treeContainer.appendChild(linesContainer);
        });
        const cardScaling = new TreeCardScaleBoundary(scrollable);
        cardScaling.checkBoundaries();
        return { scrollable, cardScaling };
    }
    function createGridElementVertical(tree, createCardFn) {
        const scrollable = document.createElement('fxs-scrollable');
        scrollable.classList.add("w-full", "flex-auto", "mx-5");
        scrollable.setAttribute('handle-gamepad-pan', 'true');
        const treeContainer = document.createElement("div");
        treeContainer.classList.add("tree-container", "items-center", "flex", "flex-col", "m-6");
        treeContainer.addEventListener('navigate-input', TreeNavigation.Vertical.onNavigateInput);
        const cardsRow = document.createElement('div');
        cardsRow.classList.add("tree-grid-row");
        Databind.for(cardsRow, `${tree}.treeGrid.grid`, 'row');
        {
            const cardDiv = document.createElement("div");
            Databind.for(cardDiv, 'row', 'card');
            {
                const card = document.createElement("div");
                card.classList.add("tree-grid-card");
                Databind.attribute(card, "row", "card.row");
                Databind.attribute(card, "column", "card.column");
                createCardFn(card);
                cardDiv.appendChild(card);
            }
            cardsRow.appendChild(cardDiv);
        }
        // TODO: Complete vertical lines and vertical navigation (attributes tree and promotions tree)
        const linesContainer = document.createElement('div');
        linesContainer.classList.add("lines-container", "vertical");
        const cardLineDiv = document.createElement("div");
        Databind.for(cardLineDiv, `${tree}.treeGrid.lines`, 'line');
        {
            const cardLine = document.createElement("tree-line");
            cardLine.setAttribute('direction', `${TreeGridDirection.VERTICAL}`);
            Databind.attribute(cardLine, 'from', 'line.from');
            Databind.attribute(cardLine, 'to', 'line.to');
            Databind.attribute(cardLine, 'locked', 'line.locked');
            Databind.attribute(cardLine, 'dummy', 'line.dummy');
            cardLineDiv.appendChild(cardLine);
        }
        linesContainer.appendChild(cardLineDiv);
        treeContainer.appendChild(linesContainer);
        treeContainer.appendChild(cardsRow);
        scrollable.appendChild(treeContainer);
        return { scrollable, cardScaling: null };
    }
})(TreeSupport || (TreeSupport = {}));
var TreeNavigation;
(function (TreeNavigation) {
    let Horizontal;
    (function (Horizontal) {
        let lastMoveCoordY = 0; // used to find the next target to focus given a navigation direction
        function onNavigateInput(navigationEvent) {
            const live = treeNavigation(navigationEvent);
            if (!live) {
                navigationEvent.preventDefault();
                navigationEvent.stopImmediatePropagation();
            }
        }
        Horizontal.onNavigateInput = onNavigateInput;
        function treeNavigation(navigationEvent) {
            if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
                if (navigationEvent.detail.name == 'nav-move') {
                    lastMoveCoordY = navigationEvent.detail.y;
                }
                return true;
            }
            const originElement = FocusManager.getFocus();
            const isFocusCard = originElement.classList.contains(TreeClassSelector.CARD);
            const originCard = isFocusCard ? originElement : originElement.closest(`.${TreeClassSelector.CARD}`);
            if (!originCard) {
                console.error("tree-support: Horizontal::treeNavigation(): Tree card not found");
                return true;
            }
            if (!originCard.parentElement) {
                console.error("tree-support: Horizontal::treeNavigation(): current focus parent element not found.");
                return true;
            }
            const originRowAttribute = originCard.parentElement.getAttribute('row');
            const originColAttribute = originCard.parentElement.getAttribute('column');
            if (!originRowAttribute || !originColAttribute) {
                console.error("tree-support: Horizontal::treeNavigation(): coordinates not found for the current focus.");
                return true;
            }
            const originTree = originCard.closest('.tree-container');
            if (!originTree) {
                console.error("tree-support: Horizontal::treeNavigation(): No .tree-container parent were found!");
                return true;
            }
            const cards = originTree.querySelectorAll(`.${TreeClassSelector.CARD}`);
            if (cards.length <= 0) {
                console.error("tree-support: Horizontal::treeNavigation(): There is no card within that tree!");
                return true;
            }
            let nextTarget = { x: -1, y: -1 };
            const origin = { x: parseInt(originColAttribute), y: parseInt(originRowAttribute) };
            for (let i = 0; i < cards.length; ++i) {
                const card = cards[i];
                const isDummy = card.classList.contains("dummy");
                if (isDummy) {
                    continue;
                }
                if (!card.parentElement) {
                    console.error("tree-support: Horizontal::treeNavigation(): Current card parent element not found.");
                    return true;
                }
                const candidateRowAttribute = card.parentElement.getAttribute('row');
                const candidateColAttribute = card.parentElement.getAttribute('column');
                if (!candidateRowAttribute || !candidateColAttribute) {
                    console.error("tree-support: Horizontal::treeNavigation(): coordinates not found for the candidate!");
                    return true;
                }
                const candidate = { x: parseInt(candidateColAttribute), y: parseInt(candidateRowAttribute) };
                if (candidate.x == origin.x && candidate.y == origin.y) {
                    continue;
                }
                switch (navigationEvent.getDirection()) {
                    case InputNavigationAction.DOWN:
                        nextTarget = bestDownTarget(origin, nextTarget, candidate);
                        break;
                    case InputNavigationAction.UP:
                        nextTarget = bestUpTarget(origin, nextTarget, candidate);
                        break;
                    case InputNavigationAction.LEFT:
                        nextTarget = bestLeftTarget(origin, nextTarget, candidate);
                        break;
                    case InputNavigationAction.RIGHT:
                        nextTarget = bestRightTarget(origin, nextTarget, candidate);
                        break;
                    default:
                        // If navigation is not the previous options, delegate
                        return true;
                }
            }
            if (nextTarget.x != -1) {
                const card = originTree.querySelector(`div[row="${nextTarget.y}"][column="${nextTarget.x}"] .${TreeClassSelector.CARD}`);
                if (card) {
                    FocusManager.setFocus(card);
                }
            }
            lastMoveCoordY = 0;
            return false;
        }
        /**
         * Choose the best target for a down navigation,
         * so the target the closest below the origin on the same column
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestDownTarget(origin, current, candidate) {
            // only try to navigate to the same column and below 
            if (candidate.y > origin.y && candidate.x == origin.x) {
                // this is a valid candidate
                if (current.y == -1 || current.y > candidate.y) {
                    // it is closer so a better target
                    return candidate;
                }
            }
            return current;
        }
        /**
         * Choose the best target for a up navigation,
         * so the target the closest above the origin on the same column
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestUpTarget(origin, current, candidate) {
            // only try to navigate to the same column and above
            if (candidate.y < origin.y && candidate.x == origin.x) {
                // this is a valid candidate
                if (current.y == -1 || current.y < candidate.y) {
                    // it is closer so a better target
                    return candidate;
                }
            }
            return current;
        }
        /**
         * Choose the best target for a left navigation
         * It will choose the one on the closest column
         * then the one on the same column if possible otherwise:
         *
         * if using dpad:
         * 	the closest to the origin vertically.
         *	if two cards are at the same distance prioritize the one on top.
         * if using stick:
         *  the closest to the origin vertically on top or bottom depending on the stick direction.
         *
         * We prioritize on the column first as if we choose a candidate on the same row but farther we will jump columns
         * and it can be hard/impossible to select a card that is not aligned with another one.
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestLeftTarget(origin, current, candidate) {
            if (candidate.x >= origin.x) {
                return current;
            }
            if (current.y == -1) {
                // No existing target
                return candidate;
            }
            if (current.x < candidate.x) {
                // Closer column
                return candidate;
            }
            if (current.x == candidate.x) {
                if (candidate.y == origin.y) {
                    return candidate;
                }
                if (lastMoveCoordY < 0) { // Y stick coordinates are reversed compared to grid coordinates
                    // priority to target below and closer to the origin row
                    // then above and closer
                    if (candidate.y > origin.y) {
                        // below so check we are closer
                        if (current.y < origin.y || candidate.y < current.y) {
                            return candidate;
                        }
                    }
                    else {
                        // above so only replace if current target is above this one and the origin
                        if (current.y < origin.y && current.y < candidate.y) {
                            return candidate;
                        }
                    }
                }
                else if (lastMoveCoordY > 0) {
                    // priority to target above and closer to the origin row
                    // then below and closer
                    if (candidate.y < origin.y) {
                        // above so check we are closer
                        if (current.y > origin.y || candidate.y > current.y) {
                            return candidate;
                        }
                    }
                    else {
                        // below so only replace if current target is below this one and the origin
                        if (current.y > origin.y && current.y > candidate.y) {
                            return candidate;
                        }
                    }
                }
                else {
                    const currentRowDiff = Math.abs(current.y - origin.y);
                    const candidateRowDiff = Math.abs(candidate.y - origin.y);
                    if (currentRowDiff > candidateRowDiff) {
                        // Closer row
                        return candidate;
                    }
                    if (currentRowDiff == candidateRowDiff) {
                        // same row difference choose the one on top
                        if (candidate.y < current.y) {
                            return candidate;
                        }
                    }
                }
            }
            return current;
        }
        /**
         * Choose the better target for a left navigation
         * It will choose the one on the closest column
         * then the one on the same column if possible otherwise:
         *
         * if using dpad:
         * 	the closest to the origin vertically
         *	if two cards are at the same distance prioritize the one on top.
         * if using stick:
         *  the closest to the origin vertically on top or bottom depending on the stick direction.
         *
         * We prioritize on the column first as if we choose a candidate on the same row but farther we will jump columns
         * and it can be hard/impossible to select a card that is not aligned with another one.
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestRightTarget(origin, current, candidate) {
            if (candidate.x <= origin.x) {
                return current;
            }
            if (current.y == -1) {
                // No existing target
                return candidate;
            }
            if (current.x > candidate.x) {
                // Closer column
                return candidate;
            }
            if (current.x == candidate.x) {
                if (candidate.y == origin.y) {
                    // TODO should we give priority to card above if stick is close to 45 degree angle?
                    return candidate;
                }
                if (lastMoveCoordY < 0) { // Y stick coordinates are reversed compared to grid coordinates
                    // priority to target below and closer to the origin row
                    // then above and closer
                    if (candidate.y > origin.y) {
                        // below so check we are closer
                        if (current.y < origin.y || candidate.y < current.y) {
                            return candidate;
                        }
                    }
                    else {
                        // above so only replace if current target is above this one and the origin
                        if (current.y < origin.y && current.y < candidate.y) {
                            return candidate;
                        }
                    }
                }
                else if (lastMoveCoordY > 0) {
                    // priority to target above and closer to the origin row
                    // then below and closer
                    if (candidate.y < origin.y) {
                        // above so check we are closer
                        if (current.y > origin.y || candidate.y > current.y) {
                            return candidate;
                        }
                    }
                    else {
                        // below so only replace if current target is below this one and the origin
                        if (current.y > origin.y && current.y > candidate.y) {
                            return candidate;
                        }
                    }
                }
                else {
                    const currentRowDiff = Math.abs(current.y - origin.y);
                    const candidateRowDiff = Math.abs(candidate.y - origin.y);
                    if (currentRowDiff > candidateRowDiff) {
                        // Closer row
                        return candidate;
                    }
                    if (currentRowDiff == candidateRowDiff) {
                        // same row difference choose the one on top
                        if (candidate.y < current.y) {
                            return candidate;
                        }
                    }
                }
            }
            return current;
        }
    })(Horizontal = TreeNavigation.Horizontal || (TreeNavigation.Horizontal = {}));
    let Vertical;
    (function (Vertical) {
        let lastMoveCoordX = 0; // used to find the next target to focus given a navigation direction
        function onNavigateInput(navigationEvent) {
            const live = treeNavigation(navigationEvent);
            if (!live) {
                navigationEvent.preventDefault();
                navigationEvent.stopImmediatePropagation();
            }
        }
        Vertical.onNavigateInput = onNavigateInput;
        /**
         * @returns true if still live, false if input should stop.
        */
        function treeNavigation(navigationEvent) {
            if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
                if (navigationEvent.detail.name == 'nav-move') {
                    lastMoveCoordX = navigationEvent.detail.x;
                }
                return true;
            }
            const originElement = FocusManager.getFocus();
            const isFocusCard = originElement.classList.contains(TreeClassSelector.CARD);
            const originCard = isFocusCard ? originElement : originElement.closest(`.${TreeClassSelector.CARD}`);
            if (!originCard) {
                console.error("tree-support: Vertical::treeNavigation(): Tree card not found");
                return true;
            }
            if (!originCard.parentElement) {
                console.error("tree-support: Vertical::treeNavigation(): current focus parent element not found.");
                return true;
            }
            const originRowAttribute = originCard.parentElement.getAttribute('row');
            const originColAttribute = originCard.parentElement.getAttribute('column');
            if (!originRowAttribute || !originColAttribute) {
                console.error("tree-support: Vertical::treeNavigation(): Coordinates not found for the origin (current focus)!");
                return true;
            }
            const originTree = originCard.closest('.tree-container');
            if (!originTree) {
                console.error("tree-support: Vertical::treeNavigation(): No .tree-container parent were found!");
                return true;
            }
            const cards = originTree.querySelectorAll(`.${TreeClassSelector.CARD}`);
            if (cards.length <= 0) {
                console.error("tree-support: Vertical::treeNavigation(): There is no card within that tree!");
                return true;
            }
            let nextTarget = { x: -1, y: -1 };
            const origin = { x: parseInt(originColAttribute), y: parseInt(originRowAttribute) };
            for (let i = 0; i < cards.length; ++i) {
                const card = cards[i];
                const isDummy = card.classList.contains("dummy");
                if (isDummy) {
                    continue;
                }
                if (!card.parentElement) {
                    console.error("tree-support: Vertical::treeNavigation(): Current card parent element not found.");
                    return true;
                }
                const candidateRowAttribute = card.parentElement.getAttribute('row');
                const candidateColAttribute = card.parentElement.getAttribute('column');
                if (!candidateRowAttribute || !candidateColAttribute) {
                    console.error("culture-rectangular-grid: Vertical::treeNavigation(): coordinates not found for the candidate!");
                    return true;
                }
                const candidate = { x: parseInt(candidateColAttribute), y: parseInt(candidateRowAttribute) };
                if (candidate.x == origin.x && candidate.y == origin.y) {
                    continue;
                }
                switch (navigationEvent.getDirection()) {
                    case InputNavigationAction.DOWN:
                        nextTarget = bestDownTarget(origin, nextTarget, candidate);
                        break;
                    case InputNavigationAction.UP:
                        nextTarget = bestUpTarget(origin, nextTarget, candidate);
                        break;
                    case InputNavigationAction.LEFT:
                        nextTarget = bestLeftTarget(origin, nextTarget, candidate);
                        break;
                    case InputNavigationAction.RIGHT:
                        nextTarget = bestRightTarget(origin, nextTarget, candidate);
                        break;
                    default:
                        // If navigation is not the previous options, delegate
                        return true;
                }
            }
            if (nextTarget.x != -1) {
                const card = originTree.querySelector(`div[row="${nextTarget.y}"][column="${nextTarget.x}"] .${TreeClassSelector.CARD}`);
                if (card) {
                    FocusManager.setFocus(card);
                }
            }
            lastMoveCoordX = 0;
            return false;
        }
        /**
         * Choose the best target for a right navigation,
         * so the target the closest to the right of the origin on the same row
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestRightTarget(origin, current, candidate) {
            // only try to navigate to the same row and to the rigth 
            if (candidate.x > origin.x && candidate.y == origin.y) {
                // this is a valid candidate
                if (current.x == -1 || current.x > candidate.x) {
                    // it is closer so a better target
                    return candidate;
                }
            }
            return current;
        }
        /**
         * Choose the best target for a left navigation,
         * so the target the closest to the left of the origin on the same row
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestLeftTarget(origin, current, candidate) {
            // only try to navigate to the same row and to the left 
            if (candidate.x < origin.x && candidate.y == origin.y) {
                // this is a valid candidate
                if (current.x == -1 || current.x < candidate.x) {
                    // it is closer so a better target
                    return candidate;
                }
            }
            return current;
        }
        /**
         * Choose the best target for a up navigation
         * It will choose the one on the closest row
         * then the one on the same row if possible otherwise:
         *
         * if using dpad:
         * 	the closest to the origin horizontally.
         *	if two cards are at the same distance prioritize the one on the left.
         * if using stick:
         *  the closest to the origin horizontally on the left or the right depending on the stick direction.
         *
         * We prioritize on the row first as if we choose a candidate on the same column but farther we will jump rows
         * and it can be hard/impossible to select a card that is not aligned with another one.
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestUpTarget(origin, current, candidate) {
            if (candidate.y >= origin.y) {
                return current;
            }
            if (current.x == -1) {
                // No existing target
                return candidate;
            }
            if (current.y < candidate.y) {
                // Closer row
                return candidate;
            }
            if (current.y == candidate.y) {
                if (candidate.x == origin.x) {
                    return candidate;
                }
                if (lastMoveCoordX > 0) {
                    // priority to target on the right and closer to the origin column
                    // then on the left and closer
                    if (candidate.x > origin.x) {
                        // on the right so check we are closer
                        if (current.x < origin.x || candidate.x < current.x) {
                            return candidate;
                        }
                    }
                    else {
                        // on the left so only replace if current target is on the left of this one and the origin
                        if (current.x < origin.x && current.x < candidate.x) {
                            return candidate;
                        }
                    }
                }
                else if (lastMoveCoordX < 0) {
                    // priority to target on the left and closer to the origin column
                    // then on the right and closer
                    if (candidate.x < origin.x) {
                        // on the left so check we are closer
                        if (current.x > origin.x || candidate.x > current.x) {
                            return candidate;
                        }
                    }
                    else {
                        // on the right so only replace if current target is on the right of this one and the origin
                        if (current.x > origin.x && current.x > candidate.x) {
                            return candidate;
                        }
                    }
                }
                else {
                    const currentColumnDiff = Math.abs(current.x - origin.x);
                    const candidateColumnDiff = Math.abs(candidate.x - origin.x);
                    if (currentColumnDiff > candidateColumnDiff) {
                        // Closer column
                        return candidate;
                    }
                    if (currentColumnDiff == candidateColumnDiff) {
                        // same column difference choose the one on the left
                        if (candidate.x < current.x) {
                            return candidate;
                        }
                    }
                }
            }
            return current;
        }
        /**
         * Choose the better target for a down navigation
         * It will choose the one on the closest row
         * then the one on the same row if possible otherwise:
         *
         * if using dpad:
         * 	the closest to the origin horizontally
         *	if two cards are at the same distance prioritize the one on the left.
         * if using stick:
         *  the closest to the origin horizontally on the left or the right depending on the stick direction.
         *
         * We prioritize on the row first as if we choose a candidate on the same column but farther we will jump rows
         * and it can be hard/impossible to select a card that is not aligned with another one.
         *
         * @param origin The currently focused card coordinates
         * @param current The current best candidate coordinates
         * @param candidate The next candidate coordinates
         * @returns The best candidate coordinates
         */
        function bestDownTarget(origin, current, candidate) {
            if (candidate.y <= origin.y) {
                return current;
            }
            if (current.x == -1) {
                // No existing target
                return candidate;
            }
            if (current.y > candidate.y) {
                // Closer row
                return candidate;
            }
            if (current.y == candidate.y) {
                if (candidate.x == origin.x) {
                    // TODO should we give priority to card to the left if stick is close to 45 degree angle?
                    return candidate;
                }
                if (lastMoveCoordX > 0) {
                    // priority to target on the right and closer to the origin column
                    // then on the left and closer
                    if (candidate.x > origin.x) {
                        // on the right so check we are closer
                        if (current.x < origin.x || candidate.x < current.x) {
                            return candidate;
                        }
                    }
                    else {
                        // on the left so only replace if current target is on the left of this one and the origin
                        if (current.x < origin.x && current.x < candidate.x) {
                            return candidate;
                        }
                    }
                }
                else if (lastMoveCoordX < 0) {
                    // priority to target above and closer to the origin column
                    // then on the right and closer
                    if (candidate.x < origin.x) {
                        // on the left so check we are closer
                        if (current.x > origin.x || candidate.x > current.x) {
                            return candidate;
                        }
                    }
                    else {
                        // on the right so only replace if current target is on the right of this one and the origin
                        if (current.x > origin.x && current.x > candidate.x) {
                            return candidate;
                        }
                    }
                }
                else {
                    const currentColumnDiff = Math.abs(current.x - origin.x);
                    const candidateColumnDiff = Math.abs(candidate.x - origin.x);
                    if (currentColumnDiff > candidateColumnDiff) {
                        // Closer column
                        return candidate;
                    }
                    if (currentColumnDiff == candidateColumnDiff) {
                        // same column difference choose the one on the left
                        if (candidate.x < current.x) {
                            return candidate;
                        }
                    }
                }
            }
            return current;
        }
    })(Vertical = TreeNavigation.Vertical || (TreeNavigation.Vertical = {}));
})(TreeNavigation || (TreeNavigation = {}));
export var TreeNodesSupport;
(function (TreeNodesSupport) {
    function getReplaceUnits(unit) {
        const replaceUnits = GameInfo.UnitReplaces.filter(o => o.ReplacesUnitType == unit.UnitType);
        if (!replaceUnits) {
            console.warn("TreeNodesSupport: getReplaceUnits(): Missing replace data.");
            return;
        }
        return replaceUnits.map(r => r.CivUniqueUnitType);
    }
    /**
     *
     * @param unlocks List of unlock to filter out the unique units
     * @returns A collection of strings with the units that are supposed to replace a unit in the unlocks.
     */
    function getRepeatedUniqueUnits(unlocks) {
        const unitsMap = {};
        for (const unlock of unlocks) {
            const unitInfo = GameInfo.Units.find(o => o.UnitType == unlock.TargetType);
            if (unitInfo) {
                const uniqueUnits = getReplaceUnits(unitInfo);
                if (uniqueUnits) {
                    uniqueUnits.forEach(unit => {
                        unitsMap[unit] = unitInfo.UnitType;
                    });
                }
            }
        }
        const result = [];
        for (const unlock of unlocks) {
            if (unitsMap.hasOwnProperty(unlock.TargetType)) {
                result.push(unitsMap[unlock.TargetType]);
            }
        }
        return result;
    }
    TreeNodesSupport.getRepeatedUniqueUnits = getRepeatedUniqueUnits;
    function getUnlocksByDepthStateText(state) {
        if (state.isCompleted) {
            return `[${Locale.compose("LOC_UI_COMPLETED_TREE")}]`;
        }
        else if (state.isCurrent) {
            return `[${Locale.compose("LOC_UI_RESEARCHING_TREE")}]`;
        }
        else if (state.isLocked) {
            return `[${Locale.compose("LOC_UI_LOCKED_TREE")}]`;
        }
        return "";
    }
    TreeNodesSupport.getUnlocksByDepthStateText = getUnlocksByDepthStateText;
    function getValidNodeUnlocks(nodeData) {
        const nodeDefinitions = [];
        for (let i = 0; i < nodeData.unlockIndices.length; i++) {
            const index = nodeData.unlockIndices[i];
            const unlockInfo = GameInfo.ProgressionTreeNodeUnlocks[index];
            if (!unlockInfo || unlockInfo.Hidden) {
                // Not valid unlock definition
                continue;
            }
            nodeDefinitions.push(unlockInfo);
        }
        return nodeDefinitions;
    }
    TreeNodesSupport.getValidNodeUnlocks = getValidNodeUnlocks;
})(TreeNodesSupport || (TreeNodesSupport = {}));

//# sourceMappingURL=file:///base-standard/ui/tree-grid/tree-support.js.map

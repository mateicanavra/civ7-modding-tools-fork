/**
 * tree-grid.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Contains tree data for models to use.
*/

import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { NavigateInputEvent } from '/core/ui/input/input-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Graph } from '/core/ui/graph-layout/graph.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { FxsScrollableHorizontal } from '/core/ui/components/fxs-scrollable-horizontal.js';
import { FxsScrollable } from '/core/ui/components/fxs-scrollable.js';

export interface GridCard {
	column: number;
	row: number;
}

export interface GridCardLine {
	from: ProgressionTreeNodeType;
	to: ProgressionTreeNodeType;
	locked: boolean;
	dummy: boolean;
	level: number;
	position: number;
	direction: LineDirection;
	aliasTo?: string;
	aliasFrom?: string;
	collisionOffset?: number;
}

export enum LineDirection {
	UP_LINE,
	SAME_LEVEL_LINE,
	DOWN_LINE
}

export interface TreeGridCard extends GridCard {
	// Data
	nodeType: ProgressionTreeNodeType;
	name: string;
	icon: string;
	description: string;
	cost?: number;
	progress?: number;
	progressPercentage: number;
	turns: number;
	queueOrder: string;
	// Unlocks
	currentDepthUnlocked: number; //RE: mastery level of this node
	maxDepth: number; //RE: mastery level of this node
	repeatedDepth: number; //RE: mastery level of this node
	unlocks: NodeUnlockDisplayData[];
	unlocksByDepth?: TreeGridDepthInfo[];
	unlocksByDepthString: string;
	// States
	nodeState: ProgressionTreeNodeState;
	canBegin: boolean;
	isAvailable: boolean;
	isCurrent: boolean;
	isCompleted: boolean;
	isLocked: boolean;
	isRepeatable: boolean;
	isQueued: boolean;
	isHoverQueued: boolean;
	// Tree
	isDummy: boolean;
	treeDepth: number; //RE: how many child-levels deep in this specific tree 	
	connectedNodeTypes: ProgressionTreeNodeType[];
	hasData: boolean; // Does this card contain gameplay info vs an empty card.

	// Visibility
	canPurchase: boolean;
	isContent: boolean;

	// Legend
	lockedReason?: string;

	// Queue 
	queuePriority?: number;
}

export interface TreeGridData {
	//Topographical information: 
	rows: number;
	dataHeight: number;
	layoutHeight: number;

	columns: number;
	dataWidth: number;
	layoutWidth: number;

	extraRows: number;
	extraColumns: number;
	originRow: number;
	originColumn: number;

	graphLayout: Graph;
	horizontalCardSeparation: number;
	verticalCardSeparation: number;

	nodesAtDepth: ProgressionTreeNodeType[][];

	// Contents: 
	cards: Array<TreeGridCard>;
}

export interface TreeGridDepthInfo {
	header: string;
	unlocks: NodeUnlockDisplayData[];
	isCompleted: boolean;
	isCurrent: boolean;
	isLocked: boolean;
	depthLevel: object[];
	iconURL: string;
}

export enum TreeGridDirection {
	HORIZONTAL,
	VERTICAL,
}

// Using an enum instead of a const string because we probably want more selectors on future skinning
export enum TreeClassSelector {
	CARD = "tree-card-selector"
}

interface ITreeCard {
	cardClass: TreeClassSelector;
}

export type PanelContentElementReferences = {
	root: HTMLElement;
	scrollable: ComponentRoot<FxsScrollableHorizontal> | ComponentRoot<FxsScrollable>;
	cardDetailContainer: HTMLDivElement;
	cardScaling: TreeCardScaleBoundary | null;
}

// Base class for a card that needs tree-component support
export class TreeCardBase extends Component implements ITreeCard {
	cardClass: TreeClassSelector = TreeClassSelector.CARD;
	constructor(root: ComponentRoot) {
		super(root);
		this.Root.classList.add(this.cardClass);
	}
}

export const UpdateLinesEventName = 'update-tree-lines' as const;
export class UpdateLinesEvent extends CustomEvent<{}> {
	constructor() {
		super(UpdateLinesEventName, { bubbles: false, cancelable: true });
	}
}

export const ScaleTreeCardEventName = 'scale-tree-card' as const;
export class ScaleTreeCardEvent extends CustomEvent<{}> {
	constructor(scale: number) {
		super(ScaleTreeCardEventName, { bubbles: false, cancelable: true, detail: { scale } });
	}
}

export class TreeCardScaleBoundary {
	private currentGrid: HTMLElement;
	private _currentCardScale: number = 1;
	// 70% of original tree card is the lower limit for scaling
	private MIN_SCALE: number = 0.7;
	private MAX_SCALE: number = 1;

	private linesContainer: HTMLElement | null = null;

	private resizeEventListener = this.onResize.bind(this);

	get currentCardScale() {
		return this._currentCardScale;
	}

	set currentCardScale(value: number) {
		this._currentCardScale = value;
		this.updateCardLines();
	}

	constructor(container: HTMLElement, minScale?: number, maxScale?: number) {
		this.currentGrid = container;
		if (minScale) {
			this.MIN_SCALE = minScale;
		}
		if (maxScale) {
			this.MAX_SCALE = maxScale;
		}

		window.addEventListener('resize', this.resizeEventListener);
	}

	private resetScale() {
		this.currentCardScale = this.MAX_SCALE;
	}

	private updateCardLines() {
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

	private onResize() {
		this.checkBoundaries();
	}

	checkBoundaries() {
		this.resetScale();
		waitForLayout(() => {
			const treeContainer = this.currentGrid.querySelector<HTMLElement>('.tree-container');

			if (!treeContainer) {
				console.warn("screen-tech-tree: checkBoundaries(): No tree container found, focus is not posible");
				return;
			}

			const children = treeContainer.children;
			let totalParentHeight = 0;
			let biggestChildHeight = 0;
			// Get the biggest child
			for (let i = 0; i < children.length; i++) {
				const child = children[i] as HTMLElement;
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

export namespace TreeSupport {

	/**
	 * Creates a grid element for a given tree from a model.
	 * Static because access comes from model, not from instantiation.
	 * @param tree 
	 * @param direction 
	 * @param createCardFn 
	 * @returns 
	 */
	export function getGridElement(tree: string, direction: TreeGridDirection, createCardFn: (container: HTMLElement) => void) {
		if (direction == TreeGridDirection.HORIZONTAL) {
			return createGridElementHorizontal(tree, createCardFn);
		} else {
			return createGridElementVertical(tree, createCardFn);
		}
	}

	const SMALL_SCREEN_MODE_MAX_HEIGHT = 800;
	const SMALL_SCREEN_MODE_MAX_WIDTH = 1000;
	export function isSmallScreen() {
		const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
		return isMobileViewExperience || window.innerHeight <= Layout.pixelsToScreenPixels(SMALL_SCREEN_MODE_MAX_HEIGHT) || window.innerWidth <= Layout.pixelsToScreenPixels(SMALL_SCREEN_MODE_MAX_WIDTH)
	}

	/**
	 * 
	 * @param tree The model tree string identifier
	 * @param createCardFn The function to create a specific card element
	 * @returns And object with the container for the tree content and the card scaling object to manage resize.
	 */
	function createGridElementHorizontal(tree: string, createCardFn: (container: HTMLElement) => void) {
		const scrollable = document.createElement('fxs-scrollable-horizontal');
		scrollable.classList.add("w-full", "flex-auto");

		const treeContainer = document.createElement("div");
		treeContainer.classList.add("tree-container", "items-center", "flex", "flex-row", "m-6");

		treeContainer.addEventListener('navigate-input', TreeNavigation.Horizontal.onNavigateInput);

		const cardsColumn: HTMLDivElement = document.createElement('div');
		cardsColumn.classList.add("tree-grid-column");

		Databind.for(cardsColumn, `${tree}.treeGrid.grid`, 'column');
		{

			const cardDiv: HTMLDivElement = document.createElement("div");
			Databind.for(cardDiv, 'column', 'card');
			{
				const card: HTMLDivElement = document.createElement("div");
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
			const linesContainer: HTMLDivElement = document.createElement('div');
			linesContainer.classList.add("lines-container");

			const cardLineDiv: HTMLElement = document.createElement("div");
			Databind.for(cardLineDiv, `${tree}.treeGrid.lines`, 'line')
			{
				const cardLine: HTMLElement = document.createElement("tree-line");

				cardLine.setAttribute('direction', `${TreeGridDirection.HORIZONTAL}`)
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

	function createGridElementVertical(tree: string, createCardFn: (container: HTMLElement) => void) {
		const scrollable = document.createElement('fxs-scrollable');
		scrollable.classList.add("w-full", "flex-auto", "mx-5");
		scrollable.setAttribute('handle-gamepad-pan', 'true');

		const treeContainer = document.createElement("div");
		treeContainer.classList.add("tree-container", "items-center", "flex", "flex-col", "m-6");

		treeContainer.addEventListener('navigate-input', TreeNavigation.Vertical.onNavigateInput);

		const cardsRow: HTMLDivElement = document.createElement('div');
		cardsRow.classList.add("tree-grid-row");

		Databind.for(cardsRow, `${tree}.treeGrid.grid`, 'row');
		{

			const cardDiv: HTMLDivElement = document.createElement("div");
			Databind.for(cardDiv, 'row', 'card');
			{
				const card: HTMLDivElement = document.createElement("div");
				card.classList.add("tree-grid-card");

				Databind.attribute(card, "row", "card.row");
				Databind.attribute(card, "column", "card.column");

				createCardFn(card);

				cardDiv.appendChild(card);
			}

			cardsRow.appendChild(cardDiv);
		}

		// TODO: Complete vertical lines and vertical navigation (attributes tree and promotions tree)
		const linesContainer: HTMLDivElement = document.createElement('div');
		linesContainer.classList.add("lines-container", "vertical");

		const cardLineDiv: HTMLElement = document.createElement("div");
		Databind.for(cardLineDiv, `${tree}.treeGrid.lines`, 'line')
		{
			const cardLine: HTMLElement = document.createElement("tree-line");

			cardLine.setAttribute('direction', `${TreeGridDirection.VERTICAL}`)
			Databind.attribute(cardLine, 'from', 'line.from');
			Databind.attribute(cardLine, 'to', 'line.to');
			Databind.attribute(cardLine, 'locked', 'line.locked');
			Databind.attribute(cardLine, 'dummy', 'line.dummy');

			cardLineDiv.appendChild(cardLine)
		}
		linesContainer.appendChild(cardLineDiv);

		treeContainer.appendChild(linesContainer);
		treeContainer.appendChild(cardsRow);
		scrollable.appendChild(treeContainer);

		return { scrollable, cardScaling: null };
	}
}

namespace TreeNavigation {

	export namespace Horizontal {
		let lastMoveCoordY: number = 0; // used to find the next target to focus given a navigation direction

		export function onNavigateInput(navigationEvent: NavigateInputEvent) {
			const live: boolean = treeNavigation(navigationEvent);
			if (!live) {
				navigationEvent.preventDefault();
				navigationEvent.stopImmediatePropagation();
			}
		}

		function treeNavigation(navigationEvent: NavigateInputEvent) {
			if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
				if (navigationEvent.detail.name == 'nav-move') {
					lastMoveCoordY = navigationEvent.detail.y;
				}

				return true;
			}

			const originElement: HTMLElement = FocusManager.getFocus();
			const isFocusCard: boolean = originElement.classList.contains(TreeClassSelector.CARD)
			const originCard = isFocusCard ? originElement : originElement.closest(`.${TreeClassSelector.CARD}`);

			if (!originCard) {
				console.error("tree-support: Horizontal::treeNavigation(): Tree card not found");
				return true;
			}

			if (!originCard.parentElement) {
				console.error("tree-support: Horizontal::treeNavigation(): current focus parent element not found.");
				return true;
			}

			const originRowAttribute: string | null = originCard.parentElement.getAttribute('row');
			const originColAttribute: string | null = originCard.parentElement.getAttribute('column');

			if (!originRowAttribute || !originColAttribute) {
				console.error("tree-support: Horizontal::treeNavigation(): coordinates not found for the current focus.");
				return true;
			}

			const originTree: HTMLElement | null = originCard.closest('.tree-container');
			if (!originTree) {
				console.error("tree-support: Horizontal::treeNavigation(): No .tree-container parent were found!");
				return true;
			}

			const cards: NodeListOf<HTMLElement> = originTree.querySelectorAll<HTMLElement>(`.${TreeClassSelector.CARD}`);
			if (cards.length <= 0) {
				console.error("tree-support: Horizontal::treeNavigation(): There is no card within that tree!");
				return true;
			}

			let nextTarget: float2 = { x: -1, y: -1 };
			const origin: float2 = { x: parseInt(originColAttribute), y: parseInt(originRowAttribute) };

			for (let i = 0; i < cards.length; ++i) {
				const card: HTMLElement = cards[i];

				const isDummy: boolean = card.classList.contains("dummy");
				if (isDummy) {
					continue;
				}

				if (!card.parentElement) {
					console.error("tree-support: Horizontal::treeNavigation(): Current card parent element not found.");
					return true;
				}

				const candidateRowAttribute: string | null = card.parentElement.getAttribute('row');
				const candidateColAttribute: string | null = card.parentElement.getAttribute('column');

				if (!candidateRowAttribute || !candidateColAttribute) {
					console.error("tree-support: Horizontal::treeNavigation(): coordinates not found for the candidate!");
					return true;
				}

				const candidate: float2 = { x: parseInt(candidateColAttribute), y: parseInt(candidateRowAttribute) };
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
				const card: HTMLElement | null = originTree.querySelector<HTMLElement>(`div[row="${nextTarget.y}"][column="${nextTarget.x}"] .${TreeClassSelector.CARD}`);
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
		function bestDownTarget(origin: float2, current: float2, candidate: float2): float2 {
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
		function bestUpTarget(origin: float2, current: float2, candidate: float2): float2 {
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
		function bestLeftTarget(origin: float2, current: float2, candidate: float2): float2 {
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
					} else {
						// above so only replace if current target is above this one and the origin
						if (current.y < origin.y && current.y < candidate.y) {
							return candidate;
						}
					}
				} else if (lastMoveCoordY > 0) {
					// priority to target above and closer to the origin row
					// then below and closer
					if (candidate.y < origin.y) {
						// above so check we are closer
						if (current.y > origin.y || candidate.y > current.y) {
							return candidate;
						}
					} else {
						// below so only replace if current target is below this one and the origin
						if (current.y > origin.y && current.y > candidate.y) {
							return candidate;
						}
					}
				} else {
					const currentRowDiff: number = Math.abs(current.y - origin.y);
					const candidateRowDiff: number = Math.abs(candidate.y - origin.y);

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
		function bestRightTarget(origin: float2, current: float2, candidate: float2): float2 {
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
					} else {
						// above so only replace if current target is above this one and the origin
						if (current.y < origin.y && current.y < candidate.y) {
							return candidate;
						}
					}
				} else if (lastMoveCoordY > 0) {
					// priority to target above and closer to the origin row
					// then below and closer
					if (candidate.y < origin.y) {
						// above so check we are closer
						if (current.y > origin.y || candidate.y > current.y) {
							return candidate;
						}
					} else {
						// below so only replace if current target is below this one and the origin
						if (current.y > origin.y && current.y > candidate.y) {
							return candidate;
						}
					}
				} else {
					const currentRowDiff: number = Math.abs(current.y - origin.y);
					const candidateRowDiff: number = Math.abs(candidate.y - origin.y);

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
	}

	export namespace Vertical {
		let lastMoveCoordX: number = 0; // used to find the next target to focus given a navigation direction

		export function onNavigateInput(navigationEvent: NavigateInputEvent) {
			const live: boolean = treeNavigation(navigationEvent);
			if (!live) {
				navigationEvent.preventDefault();
				navigationEvent.stopImmediatePropagation();
			}
		}

		/**
		 * @returns true if still live, false if input should stop.
		*/
		function treeNavigation(navigationEvent: NavigateInputEvent): boolean {
			if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
				if (navigationEvent.detail.name == 'nav-move') {
					lastMoveCoordX = navigationEvent.detail.x;
				}

				return true;
			}

			const originElement: HTMLElement = FocusManager.getFocus();
			const isFocusCard: boolean = originElement.classList.contains(TreeClassSelector.CARD)
			const originCard = isFocusCard ? originElement : originElement.closest(`.${TreeClassSelector.CARD}`);

			if (!originCard) {
				console.error("tree-support: Vertical::treeNavigation(): Tree card not found");
				return true;
			}

			if (!originCard.parentElement) {
				console.error("tree-support: Vertical::treeNavigation(): current focus parent element not found.");
				return true;
			}

			const originRowAttribute: string | null = originCard.parentElement.getAttribute('row');
			const originColAttribute: string | null = originCard.parentElement.getAttribute('column');

			if (!originRowAttribute || !originColAttribute) {
				console.error("tree-support: Vertical::treeNavigation(): Coordinates not found for the origin (current focus)!");
				return true;
			}

			const originTree: HTMLElement | null = originCard.closest('.tree-container');
			if (!originTree) {
				console.error("tree-support: Vertical::treeNavigation(): No .tree-container parent were found!");
				return true;
			}

			const cards: NodeListOf<HTMLElement> = originTree.querySelectorAll<HTMLElement>(`.${TreeClassSelector.CARD}`);
			if (cards.length <= 0) {
				console.error("tree-support: Vertical::treeNavigation(): There is no card within that tree!");
				return true;
			}

			let nextTarget: float2 = { x: -1, y: -1 };
			const origin: float2 = { x: parseInt(originColAttribute), y: parseInt(originRowAttribute) };

			for (let i = 0; i < cards.length; ++i) {
				const card: HTMLElement = cards[i];

				const isDummy: boolean = card.classList.contains("dummy");
				if (isDummy) {
					continue;
				}

				if (!card.parentElement) {
					console.error("tree-support: Vertical::treeNavigation(): Current card parent element not found.");
					return true;
				}

				const candidateRowAttribute: string | null = card.parentElement.getAttribute('row');
				const candidateColAttribute: string | null = card.parentElement.getAttribute('column');

				if (!candidateRowAttribute || !candidateColAttribute) {
					console.error("culture-rectangular-grid: Vertical::treeNavigation(): coordinates not found for the candidate!");
					return true;
				}

				const candidate: float2 = { x: parseInt(candidateColAttribute), y: parseInt(candidateRowAttribute) };
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
				const card: HTMLElement | null = originTree.querySelector<HTMLElement>(`div[row="${nextTarget.y}"][column="${nextTarget.x}"] .${TreeClassSelector.CARD}`);
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
		function bestRightTarget(origin: float2, current: float2, candidate: float2): float2 {
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
		function bestLeftTarget(origin: float2, current: float2, candidate: float2): float2 {
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
		function bestUpTarget(origin: float2, current: float2, candidate: float2): float2 {
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
					} else {
						// on the left so only replace if current target is on the left of this one and the origin
						if (current.x < origin.x && current.x < candidate.x) {
							return candidate;
						}
					}
				} else if (lastMoveCoordX < 0) {
					// priority to target on the left and closer to the origin column
					// then on the right and closer
					if (candidate.x < origin.x) {
						// on the left so check we are closer
						if (current.x > origin.x || candidate.x > current.x) {
							return candidate;
						}
					} else {
						// on the right so only replace if current target is on the right of this one and the origin
						if (current.x > origin.x && current.x > candidate.x) {
							return candidate;
						}
					}
				} else {
					const currentColumnDiff: number = Math.abs(current.x - origin.x);
					const candidateColumnDiff: number = Math.abs(candidate.x - origin.x);

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
		function bestDownTarget(origin: float2, current: float2, candidate: float2): float2 {
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
					} else {
						// on the left so only replace if current target is on the left of this one and the origin
						if (current.x < origin.x && current.x < candidate.x) {
							return candidate;
						}
					}
				} else if (lastMoveCoordX < 0) {
					// priority to target above and closer to the origin column
					// then on the right and closer
					if (candidate.x < origin.x) {
						// on the left so check we are closer
						if (current.x > origin.x || candidate.x > current.x) {
							return candidate;
						}
					} else {
						// on the right so only replace if current target is on the right of this one and the origin
						if (current.x > origin.x && current.x > candidate.x) {
							return candidate;
						}
					}
				} else {
					const currentColumnDiff: number = Math.abs(current.x - origin.x);
					const candidateColumnDiff: number = Math.abs(candidate.x - origin.x);

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
	}
}

export namespace TreeNodesSupport {

	function getReplaceUnits(unit: UnitDefinition): string[] | undefined {
		const replaceUnits: UnitReplaceDefinition[] = GameInfo.UnitReplaces.filter(o => o.ReplacesUnitType == unit.UnitType);
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
	export function getRepeatedUniqueUnits(unlocks: ProgressionTreeNodeUnlockDefinition[]): string[] {
		const unitsMap: { [id: string]: string; } = {};
		for (const unlock of unlocks) {
			const unitInfo = GameInfo.Units.find(o => o.UnitType == unlock.TargetType);
			if (unitInfo) {
				const uniqueUnits: string[] | undefined = getReplaceUnits(unitInfo);
				if (uniqueUnits) {
					uniqueUnits.forEach(unit => {
						unitsMap[unit] = unitInfo.UnitType;
					});
				}
			}
		}

		const result: string[] = [];
		for (const unlock of unlocks) {
			if (unitsMap.hasOwnProperty(unlock.TargetType)) {
				result.push(unitsMap[unlock.TargetType]);
			}
		}

		return result;
	}

	export function getUnlocksByDepthStateText(state: TreeGridDepthInfo): string {
		if (state.isCompleted) {
			return `[${Locale.compose("LOC_UI_COMPLETED_TREE")}]`
		} else if (state.isCurrent) {
			return `[${Locale.compose("LOC_UI_RESEARCHING_TREE")}]`
		} else if (state.isLocked) {
			return `[${Locale.compose("LOC_UI_LOCKED_TREE")}]`
		}
		return "";
	}

	export function getValidNodeUnlocks(nodeData: ProgressionTreeNode): ProgressionTreeNodeUnlockDefinition[] {
		const nodeDefinitions: ProgressionTreeNodeUnlockDefinition[] = [];
		for (let i: number = 0; i < nodeData.unlockIndices.length; i++) {
			const index = nodeData.unlockIndices[i];
			const unlockInfo: ProgressionTreeNodeUnlockDefinition = GameInfo.ProgressionTreeNodeUnlocks[index];
			if (!unlockInfo || unlockInfo.Hidden) {
				// Not valid unlock definition
				continue;
			}
			nodeDefinitions.push(unlockInfo);
		}
		return nodeDefinitions;
	}
}
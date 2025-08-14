/**
 * @file tree-card.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Component tree card (used in civic and tech trees)
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { TreeGridDepthInfo, ScaleTreeCardEventName, TreeCardBase } from '/base-standard/ui/tree-grid/tree-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

export enum TreeCardStates {
	COMPLETE,
	RESEARCHING,
	AVAILABLE,
	LOCKED
}

export const TreeCardHoveredEventName = 'tree-card-hovered' as const;
export type TreeCardHoveredEventDetail = { type: string, level: string };
export class TreeCardHoveredEvent extends CustomEvent<TreeCardHoveredEventDetail> {
	constructor(detail: TreeCardHoveredEventDetail) {
		super(TreeCardHoveredEventName, { bubbles: false, cancelable: true, detail });
	}
}

export const TreeCardDehoveredEventName = 'tree-card-dehovered' as const;
export type TreeCardDehoveredEventDetail = { type: string, level: string };
export class TreeCardDehoveredEvent extends CustomEvent<TreeCardActivatedEventDetail> {
	constructor(detail: TreeCardDehoveredEventDetail) {
		super(TreeCardDehoveredEventName, { bubbles: false, cancelable: true, detail });
	}
}

export const TreeCardActivatedEventName = 'tree-card-activated' as const;
export type TreeCardActivatedEventDetail = { type: string, level: string };
export class TreeCardActivatedEvent extends CustomEvent<TreeCardActivatedEventDetail> {
	constructor(detail: TreeCardActivatedEventDetail) {
		super(TreeCardActivatedEventName, { bubbles: false, cancelable: true, detail });
	}
}

type ElementCard = Array<HTMLElement>;

class TreeCard extends TreeCardBase {

	private mainContainer!: HTMLElement;
	private mainCard: ElementCard = [];
	private tiers: Array<ElementCard> = [];

	private readonly masteryIconPath = "fs://game/techtree_icon-II.png";

	private scale: number = 1;
	private onScaleCardListener = this.onCardScale.bind(this);
	private onCardHoverListener = this.onCardHover.bind(this);
	private onCardDehoverListener = this.onCardDehover.bind(this);
	private onCardActivateListener = this.onCardActivate.bind(this);
	private focusListener = this.onFocus.bind(this);

	get dummy(): boolean {
		return this.Root.getAttribute("dummy") == "true";
	}

	get type(): string {
		return this.Root.getAttribute("type") || "";
	}

	get name(): string {
		return this.Root.getAttribute("name") || "";
	}

	get queueOrder(): string {
		return this.Root.getAttribute("queue-order") || "";
	}

	get progress(): number {
		const attributeProgress = this.Root.getAttribute("progress");
		return attributeProgress != null ? +attributeProgress : 0;
	}

	get turns(): number {
		const attributeTurns = this.Root.getAttribute("turns");
		return attributeTurns != null ? +attributeTurns : 0;
	}

	get tooltipType(): string {
		return this.Root.getAttribute("tooltip-type") || "";
	}

	get unlocksByDepth(): Array<TreeGridDepthInfo> {
		const unlocksByDepthAttribute: string | null = this.Root.getAttribute("unlocks-by-depth");
		if (unlocksByDepthAttribute) {
			return JSON.parse(unlocksByDepthAttribute);
		} else {
			return [];
		}
	}

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	onAttach() {
		super.onAttach();
		window.addEventListener(ScaleTreeCardEventName, this.onScaleCardListener);
		this.Root.addEventListener('focus', this.focusListener);
	}

	onDetach(): void {
		window.removeEventListener(ScaleTreeCardEventName, this.onScaleCardListener);
		this.Root.removeEventListener('focus', this.focusListener);
		super.onDetach();
	}

	private onFocus(event: CustomEvent) {
		const target = event.target as HTMLElement;
		const hitBoxes = target.querySelector("fxs-vslot");

		if (hitBoxes) {
			// Focus the first available card
			for (let i: number = 0; i < target.children.length; i++) {
				const currentChild = target.children[i];
				if (currentChild.getAttribute("level-complete") != "true") {
					FocusManager.setFocus(currentChild);
					return;
				}
			}
			// focus default if all completed
			FocusManager.setFocus(target);
		}
	}

	private onCardHover(event: CustomEvent) {
		const target = event.target as HTMLElement;
		const type = target.getAttribute("type");
		const level = target.getAttribute("level");

		if (!type) {
			console.warn("tree-card: onCardHover(): Failed to find matching card for hover");
			return;
		}

		if (!level) {
			console.warn("tree-card: onCardHover(): Failed to find matching card level");
			return;
		}

		this.Root.dispatchEvent(new TreeCardHoveredEvent({ type, level }));
	}

	private onCardDehover(event: CustomEvent) {
		const target = event.target as HTMLElement;
		const type = target.getAttribute("type");
		const level = target.getAttribute("level");

		if (!type) {
			console.warn("tree-card: onCardDehover(): Failed to find matching card for hover");
			return;
		}

		if (!level) {
			console.warn("tree-card: onCardDehover(): Failed to find matching card level");
			return;
		}

		this.Root.dispatchEvent(new TreeCardDehoveredEvent({ type, level }));
	}

	private onCardActivate(event: CustomEvent) {
		const target = event.target as HTMLElement;
		const type = target.getAttribute("type");
		const level = target.getAttribute("level");

		if (!type) {
			console.warn("tree-card: onCardActivate(): Failed to find matching card for hover");
			return;
		}

		if (!level) {
			console.warn("tree-card: onCardActivate(): Failed to find matching card level");
			return;
		}

		this.Root.dispatchEvent(new TreeCardActivatedEvent({ type, level }));
	}

	private onCardScale(event: CustomEvent) {
		this.scale = event.detail.scale;
		this.Root.style.fontSize = `${this.scale}rem`;
	}

	private render() {
		this.Root.innerHTML = `
			<fxs-vslot class="main-container flex flex-col flex-auto pointer-events-none items-center"
				disable-focus-allowed="true">
			</fxs-vslot>
		`;

		this.Root.classList.add("min-h-10", 'w-96');
		this.Root.style.fontSize = `${this.scale}rem`;
		this.mainContainer = MustGetElement('.main-container', this.Root);
		const mainCard = this.createCard(this.name, 0);
		this.mainCard = [...mainCard];
		const [mainCardHitbox] = this.mainCard;
		this.mainContainer.appendChild(mainCardHitbox);
	}

	private createCard(name: string, level: number, isMastery?: boolean) {
		// Used for gamepad focus navigation
		const cardHitbox = document.createElement('fxs-activatable');
		cardHitbox.classList.add("pointer-events-auto", "relative", "tree-card-hitbox");
		cardHitbox.setAttribute("tabindex", '-1');
		cardHitbox.setAttribute("level", `${level}`);
		cardHitbox.setAttribute("type", `${this.type}`);
		cardHitbox.id = "tree-card-type-" + this.type;
		cardHitbox.setAttribute('data-tooltip-style', `${this.tooltipType}`);
		cardHitbox.addEventListener('mouseenter', this.onCardHoverListener);
		cardHitbox.addEventListener('mouseleave', this.onCardDehoverListener);
		cardHitbox.addEventListener('focus', this.onCardHoverListener);
		cardHitbox.addEventListener('action-activate', this.onCardActivateListener);

		const parentGroupRef = this.Root.getAttribute("data-audio-group-ref");
		if (parentGroupRef) {
			cardHitbox.setAttribute("data-audio-group-ref", parentGroupRef);
		}
		const activateRef = this.Root.getAttribute("data-audio-activate-ref");
		if (activateRef) {
			cardHitbox.setAttribute("data-audio-activate-ref", activateRef);
		}
		const focusRef = this.Root.getAttribute("data-audio-focus");
		if (focusRef) {
			cardHitbox.setAttribute("data-audio-focus", focusRef);
		}

		const cardBackgroundBase = document.createElement("div");
		cardBackgroundBase.classList.value = "absolute bg-center bg-no-repeat pointer-events-none";
		if (!isMastery) {
			cardBackgroundBase.classList.add("tree-card__bg--base", "tree-card-background", "pt-px");
		} else {
			cardBackgroundBase.classList.add("tree-card__child-bg--base", "tree-card-child-background");
			cardHitbox.classList.add("relative", "-top-3");
		}
		cardHitbox.appendChild(cardBackgroundBase);

		const cardBG = document.createElement("div");
		cardBG.classList.value = "card-background bg-center bg-no-repeat relative flex flex-row pointer-events-none";
		if (!isMastery) {
			cardBG.classList.add("tree-card-bg", "pt-px");
		} else {
			cardBG.classList.add("tree-card-child-bg");
			cardHitbox.classList.add("relative", "-top-3");
		}
		cardHitbox.appendChild(cardBG);

		const progressContainer = document.createElement('div');
		progressContainer.classList.value = "tree-card-progress flex flex-col items-center justify-center pointer-events-none relative";

		const ringContainer = document.createElement("div");
		ringContainer.classList.value = "flex relative justify-center items-center";

		progressContainer.appendChild(ringContainer);

		const cardInfoContainer = document.createElement('div');
		cardInfoContainer.classList.add("tree-card-name-unlocks", "flex", "flex-col", "flex-initial", "w-full", "justify-between");
		const nameContainer = document.createElement('div');
		nameContainer.classList.add("tree-card-name-container", "relative", "flex", "flex-row", "justify-between", "items-center");

		const nameText = document.createElement('div');
		nameText.classList.add("tree-card-name", "font-title", "text-base", "flex-initial", "tracking-150", "truncate", "font-fit-shrink");
		nameText.innerHTML = Locale.compose(name);
		nameContainer.append(nameText);

		const queueOrder = document.createElement("div");
		if (level == 0) {
			queueOrder.classList.add("tree-card-queue-order", "font-body", "text-xs", "text-accent-2", "mr-1", "hidden");
			queueOrder.innerHTML = this.queueOrder;
			nameContainer.appendChild(queueOrder);
		}

		const turnText = document.createElement('div');

		turnText.classList.add("turn-text", "font-body", "text-xs", 'shrink-0', 'ml-2', 'mr-1');
		turnText.innerHTML = Locale.compose("LOC_NARRATIVE_TURN_TIMER", this.turns);
		nameContainer.append(turnText);

		cardInfoContainer.appendChild(nameContainer);

		const ringMeter = document.createElement('fxs-ring-meter');
		ringMeter.classList.add("ring-size", "card-ring", "flex", "justify-center", "bg-contain", "bg-center", "flex-auto", "items-center", "absolute");
		ringMeter.setAttribute("max-value", "100");
		ringContainer.appendChild(ringMeter)

		const nodeIcon = document.createElement("div");
		nodeIcon.classList.value = "tree-node-icon bg-cover bg-center self-center";
		ringMeter.appendChild(nodeIcon);

		const progress: number = isMastery ? 0 : this.progress;
		ringMeter.setAttribute("value", progress.toString());

		const unlocksContainer = document.createElement('div');
		unlocksContainer.classList.add("tree-card-unlocks", "flex", "items-center", "mt-1", "pointer-events-none", "relative");

		cardBG.appendChild(progressContainer);
		cardInfoContainer.appendChild(unlocksContainer);
		cardBG.appendChild(cardInfoContainer);

		if (!isMastery) {
			cardHitbox.classList.add("parent-node");
		}

		return [cardHitbox, nameText, turnText, queueOrder, ringMeter];
	}

	private updateUnlockData() {
		if (this.unlocksByDepth && this.unlocksByDepth.length <= 0) {
			return;
		}

		if (this.mainCard) {
			const mainDepth = this.unlocksByDepth[0];
			const [hitbox] = this.mainCard;
			if (!hitbox) {
				console.error("Unable to get hitbox from main card in unlock data.")
			} else {
				this.updateUnlockInfo(hitbox, mainDepth);
			}
		}

		// If no tiers, create them from unlocks
		if (!this.tiers || this.tiers.length <= 0) {
			// Next depths are children cards
			for (let i: number = 1; i < this.unlocksByDepth.length; i++) {
				const depth: TreeGridDepthInfo = this.unlocksByDepth[i];

				const tierDepthCard = this.createCard("LOC_UI_TREE_MASTERY", i, true);
				const [hitbox] = tierDepthCard;
				if (!hitbox) {
					console.error(`Unable to get hitbox for a tree masterty for '${i}'.`);
					continue;
				}
				this.tiers.push(tierDepthCard);
				this.updateUnlockInfo(hitbox, depth, true);
				this.mainContainer.appendChild(hitbox);
			}
		} else {
			// If there's tiers then just update the unlocks
			for (let i: number = 0; i < this.tiers.length; i++) {
				const depth: TreeGridDepthInfo = this.unlocksByDepth[i + 1]
				const tier = this.tiers[i];
				const [hitbox] = tier;
				if (!hitbox) {
					console.error(`Failed to get get hitbox for tier '${i}'`);
				}
				this.updateUnlockInfo(hitbox, depth, true);
			}
		}
	}

	private updateUnlockInfo(container: HTMLElement, depth: TreeGridDepthInfo, isMastery?: boolean) {
		const treeType = this.Root.getAttribute("tree-type");
		container.classList.add(treeType == 'culture' ? 'tree-type-culture' : 'tree-type-tech');

		container.classList.remove("current-research");
		container.classList.remove("completed");

		if (depth.isCurrent) {
			container.classList.add("current-research");
		}

		if (depth.isCompleted) {
			container.classList.add("completed");
			// If the level is completed add a flag
			container.setAttribute("level-complete", "true");

			const cardBG = container.querySelector<HTMLElement>(".card-background");
			if (cardBG) {
				const checkmarkBG = document.createElement("div");
				checkmarkBG.style.backgroundImage = 'url("fs://game/techtree-icon-empty")';
				checkmarkBG.classList.value = "check-icon flex absolute size-6 bg-no-repeat bg-center bg-contain right-4 top-3 justify-center items-center";
				cardBG.appendChild(checkmarkBG);

				const checkmark = document.createElement("div");
				checkmark.classList.value = "size-4 bg-center bg-contain bg-no-repeat";
				checkmark.style.backgroundImage = 'url("fs://game/techtree_icon-checkmark")';
				checkmarkBG.appendChild(checkmark);
			}

			const nameText = container.querySelector<HTMLElement>(".tree-card-name");
			if (nameText) {
				nameText.classList.add("pr-6");
			}
		}

		const turnText = container.querySelector<HTMLElement>(".turn-text");
		if (turnText) {
			if (depth.isCurrent) {
				turnText.classList.toggle("hidden", false);
			}
			turnText.classList.toggle("hidden", depth.isLocked || depth.isCompleted);
		}

		// Append unlocks
		const unlocksContainer = container.querySelector<HTMLElement>(".tree-card-unlocks");
		if (unlocksContainer) {
			unlocksContainer.innerHTML = "";
			depth.unlocks.forEach(unlock => {
				const unlockItem = document.createElement('div');
				unlockItem.classList.add("unlock-item", "bg-no-repeat", "bg-contain", "bg-center", "mr-1");
				if (unlock.icon) {
					unlockItem.style.backgroundImage = `url(${unlock.icon})`;
				}
				unlocksContainer.appendChild(unlockItem);
			});
		}

		const nodeIcon = container.querySelector<HTMLElement>(".tree-node-icon");
		if (nodeIcon) {
			if (isMastery) {
				container.classList.add("tree-card--mastery");
				nodeIcon.style.backgroundImage = `url(${this.masteryIconPath})`;
			} else {
				nodeIcon.style.backgroundImage = `url(${depth.iconURL})`;
				container.classList.add("parent-node");
			}
		}

		if (depth.isLocked) {
			container.setAttribute("focus-disabled", 'true');
			container.setAttribute("disable-focus-allowed", 'true');
		}
	}

	private updateProgress() {
		if (!this.mainCard) {
			console.log("tree-card: updateProgress(): No mainCard found.");
			return;
		}

		if (this.unlocksByDepth && this.unlocksByDepth.length <= 0) {
			return;
		}

		const mainDepth = this.unlocksByDepth[0];
		const [_hitbox, _name, _turns, _queueOrder, ringMeter] = this.mainCard;
		const progressValue: string = mainDepth.isCompleted ? "100" : mainDepth.isLocked ? "0" : this.progress.toString();
		ringMeter.setAttribute("value", progressValue);

		if (this.tiers.length <= 0) {
			return;
		}
		for (let i: number = 0; i < this.tiers.length; i++) {
			const tier = this.tiers[i];
			const depth = this.unlocksByDepth[i + 1];
			const [_hitbox, _name, _turns, _queueOrder, ringMeter] = tier;
			const progressValue: string = depth.isCompleted ? "100" : depth.isLocked ? "0" : this.progress.toString();
			ringMeter.setAttribute("value", progressValue);
		}
	}

	private updateQueueOrder() {
		if (!this.mainCard) {
			console.warn("tree-card: updateQueueOrder(): No mainCard found.");
			return;
		}

		const [_hitbox, _name, _turns, queueOrder, _ringMeter] = this.mainCard;
		if (queueOrder) {
			queueOrder.innerHTML = Locale.compose(this.queueOrder);
		}
	}

	private updateTurns() {
		if (!this.mainCard) {
			console.warn("tree-card: updateTurns(): No mainCard found.");
			return;
		}

		const [_hitbox, _name, turns, _queueOrder, _ringMeter] = this.mainCard;
		turns.innerHTML = Locale.compose("LOC_NARRATIVE_TURN_TIMER", this.turns);

		if (this.tiers.length <= 0) {
			return;
		}
		for (let i: number = 0; i < this.tiers.length; i++) {
			const tier = this.tiers[i];

			const [_hitbox, _name, turns, _queueOrder, _ringMeter] = tier;
			turns.innerHTML = Locale.compose("LOC_NARRATIVE_TURN_TIMER", this.turns);
		}
	}

	private updateName() {
		if (!this.mainCard) {
			console.warn("tree-card: updateName(): No mainCard found.");
			return;
		}

		const [_, nameText] = this.mainCard;
		if (nameText) {
			nameText.innerHTML = Locale.compose(this.name);
		}
	}

	private updateTooltipType() {
		if (!this.mainCard) {
			console.warn("tree-card: updateProgress(): No mainCard found.");
			return;
		}
		const [hitbox] = this.mainCard;
		hitbox.setAttribute('data-tooltip-style', `${this.tooltipType}`);

		if (this.tiers.length <= 0) {
			return;
		}
		for (let i: number = 0; i < this.tiers.length; i++) {
			const tier = this.tiers[i];
			const [hitbox] = tier;
			hitbox.setAttribute('data-tooltip-style', `${this.tooltipType}`);
		}
	}

	private updateType() {
		if (!this.mainCard) {
			console.warn("tree-card: updateProgress(): No mainCard found.");
			return;
		}
		const [hitbox] = this.mainCard;
		hitbox.setAttribute("type", `${this.type}`);
		hitbox.id = "tree-card-type-" + this.type;

		if (this.tiers.length <= 0) {
			return;
		}
		for (let i: number = 0; i < this.tiers.length; i++) {
			const tier = this.tiers[i];
			const [hitbox] = tier;
			hitbox.setAttribute('data-tooltip-style', `${this.tooltipType}`);
			hitbox.setAttribute("type", `${this.type}`);
			hitbox.id = "tree-card-type-" + this.type;
		}
	}

	private updateDummy() {
		if (!this.mainCard) {
			console.warn("tree-card: updateProgress(): No mainCard found.");
			return;
		}
		const [hitbox] = this.mainCard;
		hitbox.classList.toggle("hidden", this.dummy);
		this.Root.classList.toggle("dummy", this.dummy);
	}

	onAttributeChanged(name: string, _oldValue: string, _newValue: string) {
		switch (name) {
			case 'dummy':
				this.updateDummy();
				break;
			case 'name':
				this.updateName();
				break;
			case 'type':
				this.updateType();
				break;
			case 'progress':
				this.updateProgress();
				break;
			case 'turns':
				this.updateTurns();
				break;
			case 'queue-order':
				this.updateQueueOrder();
				break;
			case 'tooltip-type':
				this.updateTooltipType();
				break;
			case 'unlocks-by-depth':
				this.updateUnlockData();
				this.updateProgress();
				break;
		}
	}
}

Controls.define('tree-card', {
	createInstance: TreeCard,
	description: 'Single tree card element',
	classNames: ['tree-card'],
	styles: ["fs://game/base-standard/ui/tree-grid/tree-components.css"],
	images: ['fs://game/techtree_parent-node_selected_hover.png', 'fs://game/techtree_parent-node_hover.png', 'fs://game/techtree_parent-node_inactive.png', 'fs://game/techtree_parent-node_selected.png', 'fs://game/techtree_child-node_selected_hover.png', 'fs://game/techtree_child-node_hover.png', 'fs://game/techtree_child-node_inactive.png', 'fs://game/techtree_child-node_selected.png'],
	attributes: [
		{
			name: 'dummy',
			description: 'If true, hide all the content'
		},
		{
			name: 'type',
			description: 'Card type to identify each card'
		},
		{
			name: 'name',
			description: 'Main card node name'
		},
		{
			name: 'progress',
			description: 'Progress for this node as percentage, used in the ring meter component'
		},
		{
			name: 'turns',
			description: 'How many turns are left to unlock the node'
		},
		{
			name: 'tooltip-type',
			description: 'Type for tooltip component'
		},
		{
			name: 'unlocks-by-depth',
			description: 'Unlocks arranged in levels to create child cards'
		},
		{
			name: 'queue-order',
			description: 'What order this is in the current progression tree queue'
		}
	],
	tabIndex: -1
});
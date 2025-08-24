/**
 * @file tree-detail.ts
 * @copyright 2024, Firaxis Games
 * @description Details card for 720p tree grid version (replacing tooltip)
 */
import { TreeGridDepthInfo, TreeNodesSupport } from '/base-standard/ui/tree-grid/tree-support.js';
import { quickFormatProgressionTreeNodeUnlocks } from '/core/ui/utilities/utilities-core-textprovider.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'

const getWonderPlayerId = (wonderType: string | number): PlayerId | null => {
	wonderType = typeof wonderType == 'string' ? Database.makeHash(wonderType) : wonderType;

	const players = Players.getEverAlive();
	for (const player of players) {
		const wonders = player.Constructibles?.getWonders(player.id);
		if (!wonders) continue;
		for (const wonder of wonders) {
			const constructible = Constructibles.getByComponentID(wonder);
			if (constructible?.type === wonderType && constructible?.complete) {
				return player.id;
			}
		}
	}

	return null;
}

export class TreeDetail extends Component {
	private readonly nameContainer = document.createElement('fxs-header');
	private readonly lockedOverlay: HTMLElement = document.createElement('div');
	private readonly lockedOverlayText: HTMLElement = document.createElement('div');
	private readonly stateText = document.createElement("div");
	private readonly descriptionContainer = document.createElement('div');
	private readonly unlocksContainer = document.createElement('div');
	private readonly scrollableContent = document.createElement('div');
	public readonly scrollable = document.createElement('fxs-scrollable');
	private readonly progressContainer = document.createElement('div');
	private readonly nodeIcon = document.createElement("div");
	private readonly ringMeter = document.createElement('fxs-ring-meter');
	private readonly turnContainer = document.createElement('div');
	private readonly chooserItem = document.createElement('attribute-small-card');
	private readonly chooserContainer = document.createElement('div');
	private readonly ringContent = document.createElement('div');
	private readonly repeatedCount: HTMLElement = document.createElement('div');

	get type(): number {
		const type = this.Root.getAttribute("type");
		return type != null ? +type : 0;
	}

	get name(): string {
		return this.level > 0 ? "LOC_UI_TREE_MASTERY" : this.Root.getAttribute("name") ?? "";
	}

	get lockedReason(): string {
		return this.Root.getAttribute("locked-reason") ?? "";
	}
	get hasLockedReason(): boolean {
		return this.lockedReason.length > 0;
	}

	get level(): number {
		const attributeLevel = this.Root.getAttribute("level");
		return attributeLevel != null ? +attributeLevel : 0;
	}

	get progress(): string {
		return this.Root.getAttribute("progress") ?? "0";
	}

	get turns(): number {
		const attributeTurns = this.Root.getAttribute("turns");
		return attributeTurns != null ? +attributeTurns : 0;
	}

	get icon(): string {
		return this.Root.getAttribute("icon") ?? "";
	}

	get detailed(): boolean {
		return this.Root.getAttribute("detailed") == "true";
	}

	get repeated(): number {
		const repeatedTimes = this.Root.getAttribute("repeated");
		return repeatedTimes != null ? +repeatedTimes : 0;
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

	private render() {
		const mainContainer = document.createElement('fxs-inner-frame');
		mainContainer.classList.add('flex', 'flex-auto', 'pointer-events-none', 'px-6', 'py-4');
		//? Weird bug: Exception here for the fxs-inner-frame component working very slow with a scrollable.
		waitForLayout(() => mainContainer.classList.remove('flex-col'));

		const detailContainer = document.createElement('div');
		detailContainer.classList.add("flex", "flex-col", "flex-auto");

		this.scrollable.classList.add("flex-auto");
		this.scrollable.setAttribute("attached-scrollbar", "true");
		const contentContainer = document.createElement('div');
		contentContainer.classList.add("flex", "items-start");

		this.progressContainer.classList.add("flex", "flex-col", "items-center");
		this.turnContainer.classList.add("font-body", "text-base");

		this.nameContainer.setAttribute('title', this.name);
		this.nameContainer.setAttribute('font-fit-mode', 'shrink');
		this.nameContainer.classList.add("my-5", "flex-auto", "flex");

		this.stateText.classList.add('mb-1', 'text-secondary', 'text-xs', 'font-body', 'tracking-100', 'flex', 'justify-center');

		this.descriptionContainer.classList.add("font-body", "text-base", "description-container");
		this.unlocksContainer.classList.add("flex", "flex-col", "justify-center", "max-w-full", "font-body", "text-sm", "mr-3");

		this.scrollable.appendChild(this.scrollableContent);
		this.scrollableContent.appendChild(this.unlocksContainer);

		this.progressContainer.appendChild(this.turnContainer);
		contentContainer.appendChild(this.progressContainer);
		contentContainer.appendChild(this.nameContainer);

		detailContainer.appendChild(contentContainer);
		detailContainer.appendChild(this.stateText);
		detailContainer.appendChild(this.scrollable);
		mainContainer.appendChild(detailContainer);

		this.scrollableContent.appendChild(this.repeatedCount);
		this.repeatedCount.classList.add('relative', 'mt-3', 'text-base', 'font-body', 'flex', 'justify-center');
		if (this.repeated > 0) {
			this.repeatedCount.innerHTML = Locale.compose('LOC_UI_ATTRIBUTE_TREES_BOUGHT_TIMES', this.repeated);
		}

		this.updateDetailed();

		this.lockedOverlay.classList.add("absolute", "inset-0", "flex", "items-center", "justify-center");
		const lockedOverlayBackground: HTMLElement = document.createElement('div');
		lockedOverlayBackground.classList.add("absolute", "inset-0", "bg-primary-5", "opacity-95");

		this.lockedOverlayText.classList.add("absolute", "inset-0", "flex", "items-center", "justify-center", "p-12", "text-center");
		this.lockedOverlay.classList.toggle("hidden", !this.hasLockedReason);
		this.lockedOverlayText.innerHTML = Locale.stylize(this.lockedReason || "");
		this.lockedOverlay.appendChild(lockedOverlayBackground);
		this.lockedOverlay.appendChild(this.lockedOverlayText);

		mainContainer.appendChild(this.lockedOverlay);

		this.Root.appendChild(mainContainer);

		this.chooserContainer.classList.add("flex", "justify-center", "items-center", "relative", "mb-4");
		this.ringContent.classList.add("ring-content", "font-bold", "font-title", "text-xl", "flex", "justify-center", "items-center", "flex-auto")
	}

	private readonly updateDetailedUpdateGate = new UpdateGate(this.updateDetailed.bind(this));
	private updateDetailed() {
		if (this.detailed) {
			this.descriptionContainer.classList.remove("text-primary-1");
			this.descriptionContainer.classList.add("text-accent-1");
			this.unlocksContainer.classList.remove("font-body", "text-sm");
			this.unlocksContainer.classList.add("font-body", "text-base");

			this.nameContainer.classList.add("uppercase", "tracking-100", "font-title", "text-xl");
			this.nameContainer.setAttribute('filigree-style', 'none');


			this.chooserItem.classList.add("pointer-events-none", "size-26");
			this.chooserItem.setAttribute('image-path', this.icon);
			this.chooserContainer.appendChild(this.chooserItem);

			this.ringMeter.classList.remove("detail-ring", "size-14", "justify-center", "bg-contain", "bg-center", "flex-auto", "relative", "flex", "items-center", "justify-center");

			if (!this.scrollableContent.contains(this.chooserContainer)) {
				this.scrollableContent.insertAdjacentElement('afterbegin', this.chooserContainer);
			}

			if (this.progressContainer.contains(this.ringMeter)) {
				this.progressContainer.removeChild(this.ringMeter);
			}
		} else {
			this.descriptionContainer.classList.remove("text-accent-1");
			this.descriptionContainer.classList.add("text-primary-1");
			this.unlocksContainer.classList.remove("font-body", "text-base");
			this.unlocksContainer.classList.add("font-body", "text-sm");

			this.nameContainer.classList.remove("uppercase", "tracking-100", "font-title", "text-xl");
			this.nameContainer.setAttribute('filigree-style', 'none');

			this.ringMeter.classList.add("detail-ring", "size-16", "justify-center", "bg-contain", "bg-center", "flex-auto", "relative", "flex", "items-center", "justify-center");
			this.ringMeter.setAttribute("max-value", "100");
			this.ringMeter.setAttribute("value", this.progress);

			this.nodeIcon.classList.value = "bg-cover bg-center self-center absolute";
			this.nodeIcon.style.backgroundImage = this.icon;
			this.ringMeter.appendChild(this.nodeIcon);

			this.ringMeter.appendChild(this.ringContent);

			if (!this.progressContainer.contains(this.ringMeter)) {
				this.progressContainer.insertBefore(this.ringMeter, this.turnContainer);
			}
		}
	}

	private readonly updateUnlocksUpdateGate = new UpdateGate(this.updateUnlocks.bind(this));
	private updateUnlocks() {
		this.unlocksContainer.innerHTML = "";

		const depth = this.unlocksByDepth[this.level];
		if (depth) {
			this.stateText.textContent = TreeNodesSupport.getUnlocksByDepthStateText(depth);
		}

		const unlocks: NodeUnlockDisplayData[] | undefined = this.unlocksByDepth[this.level]?.unlocks;
		unlocks?.forEach(unlock => {
			if (!unlock.name && !unlock.description) {
				console.warn("tree-detail: No content for this unlock, skipping");
				return;
			}

			const unlockItem: HTMLElement = document.createElement('div');
			unlockItem.classList.add("flex", "my-2", "flex-auto");

			if (this.detailed) {
				unlockItem.classList.add("flex-col", "items-center");
			}

			const unlockIcon: HTMLElement = document.createElement('div');
			unlockIcon.classList.add("unlock-icon", "bg-no-repeat", "bg-contain", "bg-center", "size-7", "mx-2", "mb-2");
			if (unlock.icon) {
				unlockIcon.style.backgroundImage = `url(${unlock.icon})`;
			}

			const unlockContent: HTMLElement = document.createElement('div');
			unlockContent.classList.add("unlock-content", "flex-col", "flex-auto");

			const unlockName: HTMLElement = document.createElement('div');
			unlockName.classList.add("unlock-name", "tracking-150", "text-accent-1", "font-title", "text-base");
			unlockName.textContent = Locale.compose(unlock.name);

			if (unlock.kind === "KIND_CONSTRUCTIBLE") {
				const constructible = GameInfo.Constructibles.lookup(unlock.type);
				if (constructible) {
					const classTypeHash = Database.makeHash(constructible.ConstructibleClass)
					if (classTypeHash === ConstructibleClasses.WONDER) {
						const owningPlayerId = getWonderPlayerId(unlock.type);
						if (owningPlayerId != null) {
							const text = owningPlayerId === GameContext.localPlayerID ? "LOC_UI_TREE_WONDER_BUILT_BY_YOU" : "LOC_UI_TREE_WONDER_BUILT_BY_OTHER";
							const unlockItemNamePlayerBuildText = document.createElement("div");
							unlockItemNamePlayerBuildText.classList.add('ml-2', 'text-secondary', 'text-uppercase', 'text-xs', 'font-body', 'font-bold', 'tracking-25', 'flex', 'flex-auto');
							unlockItemNamePlayerBuildText.setAttribute("data-l10n-id", text);
							unlockName.appendChild(unlockItemNamePlayerBuildText);
						}
					}
				}
			}

			const unlockDescription: HTMLElement = document.createElement('div');
			if (this.detailed) {
				unlockDescription.classList.add("text-accent-1");
			} else {
				unlockDescription.classList.add("text-primary-1");
			}
			unlockDescription.innerHTML = Locale.stylize(unlock.description);

			unlockContent.appendChild(unlockName);
			unlockContent.appendChild(unlockDescription);

			unlockItem.appendChild(unlockIcon);
			unlockItem.appendChild(unlockContent);
			this.unlocksContainer.appendChild(unlockItem);
		});

		if (!unlocks) {
			this.unlocksContainer.appendChild(this.descriptionContainer);
		}
	}

	private readonly updateProgressUpdateGate = new UpdateGate(this.updateProgress.bind(this));
	private updateProgress() {
		const depth: TreeGridDepthInfo | undefined = this.unlocksByDepth[this.level];
		if (depth) {
			const progressValue: string = depth.isCompleted ? "100" : depth.isLocked ? "0" : this.progress;
			this.ringMeter.setAttribute("value", progressValue);
		}
	}

	private readonly updateDetailImageUpdateGate = new UpdateGate(this.updateDetailImage.bind(this));
	private updateDetailImage() {
		if (this.level > 0) {
			this.nodeIcon.classList.remove("size-8");
			this.nodeIcon.classList.add("size-5");
			this.nodeIcon.style.backgroundImage = `url("fs://game/techtree_icon-II.png")`;
		} else {
			this.nodeIcon.classList.remove("size-5");
			this.nodeIcon.classList.add("size-8");
			this.nodeIcon.style.backgroundImage = `url(${this.icon})`;
		}
	}

	onAttributeChanged(name: string, _oldValue: string, _newValue: string) {
		switch (name) {
			case 'type':
				const nodeDef: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(this.type);
				if (!nodeDef) {
					console.warn("attribute-card: onAttach(): Node definition not found, using attribute 'type'");
					return;
				}
				const progressionTreeDescription: string = quickFormatProgressionTreeNodeUnlocks(nodeDef);
				this.descriptionContainer.setAttribute('data-l10n-id', progressionTreeDescription);
				break;
			case 'name':
				this.nameContainer.setAttribute('title', this.name);
				break;
			case 'locked-reason':
				this.lockedOverlay.classList.toggle("hidden", !this.hasLockedReason);
				this.lockedOverlayText.innerHTML = Locale.stylize(this.lockedReason || "");
				break;
			case 'level':
				this.nameContainer.setAttribute('title', this.name);
				this.updateUnlocksUpdateGate.call('onAttributeChanged');
				this.updateDetailImageUpdateGate.call('onAttributeChanged');
				this.updateProgressUpdateGate.call('onAttributeChanged');
				break;
			case 'progress':
				this.updateProgressUpdateGate.call('onAttributeChanged');
				break;
			case 'turns':
				this.turnContainer.textContent = this.turns > 0 ? this.turns.toString() : "";
				break;
			case 'icon':
				this.updateDetailImageUpdateGate.call('onAttributeChanged');
				this.chooserItem.setAttribute('image-path', this.icon);
				break;
			case 'detailed':
				this.updateDetailedUpdateGate.call('onAttributeChanged');
				break;
			case 'unlocks-by-depth':
				this.updateUnlocksUpdateGate.call('onAttributeChanged');
				this.updateProgressUpdateGate.call('onAttributeChanged');
				break;
			case 'repeated':
				this.repeatedCount.classList.toggle('hidden', this.repeated <= 0);
				if (this.repeated > 0) {
					this.repeatedCount.innerHTML = Locale.compose('LOC_UI_ATTRIBUTE_TREES_BOUGHT_TIMES', this.repeated);
				}
				break;
		}
	}
}

Controls.define('tree-detail', {
	createInstance: TreeDetail,
	description: 'Tooltip-like component to show information on a selected card',
	classNames: ['tree-detail', 'max-h-full', 'flex-auto'],
	styles: ["fs://game/base-standard/ui/tree-grid/tree-components.css"],
	attributes: [
		{
			name: 'type',
			description: 'Main card node type'
		},
		{
			name: 'name',
			description: 'Main card node name'
		},
		{
			name: 'locked-reason',
		},
		{
			name: 'level',
			description: 'Unlocks level to show'
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
			name: 'unlocks-by-depth',
			description: 'Unlocks arranged in levels to create child cards'
		},
		{
			name: 'icon',
			description: 'Icon path for the main detail icon'
		},
		{
			name: 'detailed',
			description: 'If true, changes style to be centered and bigger'
		},
		{
			name: 'repeated',
			description: 'Number of repeated purchases. Only for repeatable nodes.'
		},
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'tree-detail': ComponentRoot<TreeDetail>;
	}
}
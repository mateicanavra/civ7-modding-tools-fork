/**
 * @file tech-civic-popup-manager.ts
 * @copyright 2022, Firaxis Games
 * @description Manages the data and queue for tech and civic completed popups
 */

import ContextManager from '/core/ui/context-manager/context-manager.js'
import { DisplayHandlerBase, DisplayHideOptions, IDisplayRequestBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { TutorialLevel } from '/base-standard/ui/tutorial/tutorial-item.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';

export enum ProgressionTreeTypes {
	TECH = "TECH",
	CULTURE = "CULTURE"
}

export interface TechCivicPopupData extends IDisplayRequestBase {
	node?: ProgressionTreeNodeDefinition,
	treeType: ProgressionTreeTypes,
}

class TechCivicPopupManagerClass extends DisplayHandlerBase<TechCivicPopupData> {
	private static instance: TechCivicPopupManagerClass | null = null;

	private techNodeCompletedListener = this.onTechNodeCompleted.bind(this);
	private cultureNodeCompletedListener = this.onCultureNodeCompleted.bind(this);

	currentTechCivicPopupData: TechCivicPopupData | null = null;

	isFirstCivic: boolean = true;
	isFirstTech: boolean = true;

	constructor() {
		super("TechCivicPopup", 8000);

		if (TechCivicPopupManagerClass.instance) {
			console.error("Only one instance of the TechCivicPopup manager class can exist at a time!")
		}
		TechCivicPopupManagerClass.instance = this;

		this.initializeListeners();
	}

	private initializeListeners(): void {
		if (!Configuration.getGame().isAnyMultiplayer) {
			engine.on('TechNodeCompleted', this.techNodeCompletedListener);
			engine.on('CultureNodeCompleted', this.cultureNodeCompletedListener);
		}
	}

	isShowing(): boolean {
		return ContextManager.hasInstanceOf("screen-tech-civic-complete");
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	show(request: TechCivicPopupData): void {
		this.currentTechCivicPopupData = request;
		InterfaceMode.switchToDefault();
		ContextManager.push("screen-tech-civic-complete", { createMouseGuard: true, singleton: true });
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	hide(_request: TechCivicPopupData, _options?: DisplayHideOptions): void {
		this.currentTechCivicPopupData = null;
		ContextManager.pop("screen-tech-civic-complete");

		if (DisplayQueueManager.findAll(this.getCategory()).length === 1) {
			this.isFirstCivic = true;
			this.isFirstTech = true;
			this.currentTechCivicPopupData = null;
		}
	}

	closePopup = () => {
		if (this.currentTechCivicPopupData) {
			DisplayQueueManager.close(this.currentTechCivicPopupData);
		}
	}

	override setRequestIdAndPriority(request: TechCivicPopupData): void {
		super.setRequestIdAndPriority(request);

		if (request.treeType == ProgressionTreeTypes.TECH) {
			request.subpriority! += 1000;
		}
	}

	private onTechNodeCompleted(data: PlayerProgressionTree_EventData): void {
		if (ContextManager.shouldShowPopup(data.player)) {
			const node: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(data.activeNode);
			if (!node) {
				console.error("tech-civic-popup-manager: Unable to retrieve node definition for tech node " + data.activeNode.toString() + " in tree " + data.tree);
				return;
			}

			// BPF: For purposes of the Tutorial, we don't want to show this tech pop-up
			if (node.ProgressionTreeNodeType == "NODE_TECH_AQ_AGRICULTURE") {
				if ((Configuration.getUser().tutorialLevel > TutorialLevel.None) && !Online.Metaprogression.isPlayingActiveEvent()) {
					return;
				}
			}

			const techCivicPopupData: TechCivicPopupData = {
				category: this.getCategory(),
				node: node,
				treeType: ProgressionTreeTypes.TECH
			}

			this.addDisplayRequest(techCivicPopupData);
		}
	}

	private onCultureNodeCompleted(data: PlayerProgressionTree_EventData): void {
		if (ContextManager.shouldShowPopup(data.player)) {
			const node: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(data.activeNode);
			if (!node) {
				console.error("tech-civic-popup-manager: Unable to retrieve node definition for culture node " + data.activeNode.toString() + " in tree " + data.tree);
				return;
			}

			// BPF: For purposes of the Tutorial, we don't want to show this civic pop-up

			if (node.ProgressionTreeNodeType == "NODE_CIVIC_AQ_MAIN_CHIEFDOM") {
				if ((Configuration.getUser().tutorialLevel > TutorialLevel.None) && !Online.Metaprogression.isPlayingActiveEvent()) {
					return;
				}
			}

			const techCivicPopupData: TechCivicPopupData = {
				category: this.getCategory(),
				node: node,
				treeType: ProgressionTreeTypes.CULTURE
			}

			this.addDisplayRequest(techCivicPopupData);
		}
	}
}

const TechCivicPopupManager = new TechCivicPopupManagerClass();
export { TechCivicPopupManager as default }

DisplayQueueManager.registerHandler(TechCivicPopupManager);
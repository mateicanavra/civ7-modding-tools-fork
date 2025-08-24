import { AdvisorRecommendations } from "/base-standard/ui/tutorial/tutorial-support.js";

export interface AvailableTreeChooserNode {
	id: ProgressionTreeNodeType;
	name: string;
	branchDescription?: string
	branchIcon?: string;
	primaryIcon: string;
	description: string;
	turns: number;
	currentDepthUnlocked: number;
	maxDepth: number;
	unlocks: NodeUnlockDisplayData[];
	unlocksByDepth: TreeChooserDepthInfo[];
	isInProgress?: boolean;
	isRecommended?: boolean;
	depthSlots: boolean[];
	percentComplete: number;
	percentCompleteLabel: string;
	showPercentComplete: boolean;
	treeType: ProgressionTreeType;
	isLocked: false;
	recommendations: AdvisorRecommendations[];
	cost?: number;
}

export interface LockedTreeChooserNode {
	treeType: ProgressionTreeType;
	reqStatuses: string;
	current: number;
	total: number;
	percentCompleteLabel: string;
	percentComplete: string;
	name: string;
	icon: string;
	isLocked: true;
}

export type TreeChooserNode = AvailableTreeChooserNode | LockedTreeChooserNode;

export interface TreeChooserDepthInfo {
	header: string;
	unlocks: NodeUnlockDisplayData[];
	isCompleted: boolean;
	isCurrent: boolean;
	depthLevel: object[];
}
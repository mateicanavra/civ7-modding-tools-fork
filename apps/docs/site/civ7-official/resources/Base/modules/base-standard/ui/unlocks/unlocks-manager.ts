import ContextManager from "/core/ui/context-manager/context-manager.js";
import { DisplayHandlerBase, IDisplayRequestBase } from "/core/ui/context-manager/display-handler.js";
import { DisplayQueueManager } from "/core/ui/context-manager/display-queue-manager.js";

export interface UnlockRequirementData {
	description: string;
	narrative: string | undefined;
}

export interface UnlockPopupData extends IDisplayRequestBase {
	name: string,
	icon: string,
	requirements: UnlockRequirementData[];
}

class UnlocksPopupManagerClass extends DisplayHandlerBase<UnlockPopupData> {
	public static readonly instance: UnlocksPopupManagerClass = new UnlocksPopupManagerClass();

	private rewardUnlockedListener = this.onRewardUnlocked.bind(this);

	currentUnlockedRewardData: UnlockPopupData | null = null;

	private constructor() {
		super("UnlockPopup", 8000);

		engine.on('PlayerUnlockChanged', this.rewardUnlockedListener);
	}

	show(request: UnlockPopupData): void {
		this.currentUnlockedRewardData = request;
		ContextManager.push("screen-reward-unlocked", { createMouseGuard: true, singleton: true });
	}

	hide(_request: UnlockPopupData): void {
		this.currentUnlockedRewardData = null;
		ContextManager.pop("screen-reward-unlocked");
	}

	closePopup = () => {
		if (this.currentUnlockedRewardData) {
			DisplayQueueManager.close(this.currentUnlockedRewardData);
		}
	}

	private onRewardUnlocked(data: PlayerUnlockChanged_EventData) {
		if (ContextManager.shouldShowPopup(data.player)) {
			let unlockedReward: UnlockRewardDefinition | null = null;
			for (let i: number = 0; i < GameInfo.UnlockRewards.length; i++) {
				if (data.unlock == Database.makeHash(GameInfo.UnlockRewards[i].UnlockType)) {
					unlockedReward = GameInfo.UnlockRewards[i];
					break;
				}
			}

			if (!unlockedReward) {
				console.error("unlocks-manager: Unable to retrieve unlocked reward data");
				return;
			}

			if (unlockedReward.UnlockRewardKind != "KIND_CIVILIZATION") {
				return;
			}

			const unlockRewardData: UnlockPopupData = {
				category: this.getCategory(),
				name: unlockedReward.Name,
				icon: unlockedReward.Icon || "",
				requirements: this.rewardRequirementsCompleted(unlockedReward.UnlockType),
			}

			if (unlockRewardData.requirements.length > 0) {
				this.addDisplayRequest(unlockRewardData);
			}
		}
	}

	/**
	 * 
	 * @param unlockType string version of the unlock type. For Example UNLOCK_CIVILIZATION_ABBASID
	 * @returns array of all the descriptions of conditions met to unlock
	 */
	private rewardRequirementsCompleted(unlockType: string): UnlockRequirementData[] {
		const requirements = GameInfo.UnlockRequirements.filter(req => req.UnlockType === unlockType);
		const progressStatus = Game.Unlocks.getProgressForPlayer(unlockType, GameContext.localPlayerID);
		const progressRequirements: UnlockRequirementData[] = [];
		requirements.forEach(requirment => {
			const progress = progressStatus?.progress.find(status => status.requirementSetId == requirment.RequirementSetId);
			if (progress && progress.state == RequirementState.Met) {
				const newRequirement: UnlockRequirementData = {
					description: requirment.Description || '',
					narrative: requirment.NarrativeText
				}
				progressRequirements.push(newRequirement);
			}
		});
		return progressRequirements;
	}


}


export const UnlockPopupManager = UnlocksPopupManagerClass.instance;

DisplayQueueManager.registerHandler(UnlockPopupManager);
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { DisplayHandlerBase } from "/core/ui/context-manager/display-handler.js";
import { DisplayQueueManager } from "/core/ui/context-manager/display-queue-manager.js";
class UnlocksPopupManagerClass extends DisplayHandlerBase {
    constructor() {
        super("UnlockPopup", 8000);
        this.rewardUnlockedListener = this.onRewardUnlocked.bind(this);
        this.currentUnlockedRewardData = null;
        this.closePopup = () => {
            if (this.currentUnlockedRewardData) {
                DisplayQueueManager.close(this.currentUnlockedRewardData);
            }
        };
        engine.on('PlayerUnlockChanged', this.rewardUnlockedListener);
    }
    show(request) {
        this.currentUnlockedRewardData = request;
        ContextManager.push("screen-reward-unlocked", { createMouseGuard: true, singleton: true });
    }
    hide(_request) {
        this.currentUnlockedRewardData = null;
        ContextManager.pop("screen-reward-unlocked");
    }
    onRewardUnlocked(data) {
        if (ContextManager.shouldShowPopup(data.player)) {
            let unlockedReward = null;
            for (let i = 0; i < GameInfo.UnlockRewards.length; i++) {
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
            const unlockRewardData = {
                category: this.getCategory(),
                name: unlockedReward.Name,
                icon: unlockedReward.Icon || "",
                requirements: this.rewardRequirementsCompleted(unlockedReward.UnlockType),
            };
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
    rewardRequirementsCompleted(unlockType) {
        const requirements = GameInfo.UnlockRequirements.filter(req => req.UnlockType === unlockType);
        const progressStatus = Game.Unlocks.getProgressForPlayer(unlockType, GameContext.localPlayerID);
        const progressRequirements = [];
        requirements.forEach(requirment => {
            const progress = progressStatus?.progress.find(status => status.requirementSetId == requirment.RequirementSetId);
            if (progress && progress.state == RequirementState.Met) {
                const newRequirement = {
                    description: requirment.Description || '',
                    narrative: requirment.NarrativeText
                };
                progressRequirements.push(newRequirement);
            }
        });
        return progressRequirements;
    }
}
UnlocksPopupManagerClass.instance = new UnlocksPopupManagerClass();
export const UnlockPopupManager = UnlocksPopupManagerClass.instance;
DisplayQueueManager.registerHandler(UnlockPopupManager);

//# sourceMappingURL=file:///base-standard/ui/unlocks/unlocks-manager.js.map

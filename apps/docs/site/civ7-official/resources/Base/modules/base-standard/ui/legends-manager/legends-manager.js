/**
 * legends-manager.ts
 * @copyright 2024, Firaxis Games
 * @description Unified manager object to query legend and challenges data
 */
import { ChallengeClass } from '../../../core/ui/utilities/utilities-metaprogression.js';
class LegendsManagerImpl {
    getData() {
        const data = {
            progressItems: [],
            completedFoundationChallenge: [],
            completedLeaderChallenge: [],
            unlockedFoundationRewards: [],
            unlockedLeaderRewards: []
        };
        const currentlyPlayedLeader = Configuration.getPlayer(GameContext.localPlayerID).leaderName;
        let leaderName = currentlyPlayedLeader ? currentlyPlayedLeader.replace("LOC_", "") : "";
        leaderName = leaderName.replace("_NAME", "");
        Online.Metaprogression.getLegendPathsData().forEach(item => {
            if (item.legendPathLoc.includes("FOUNDATION") || currentlyPlayedLeader == item.legendPathLoc) {
                const gainedXP = item.legendPathLoc.includes("FOUNDATION") ? Online.Achievements.getGainedFoundationXP() : Online.Achievements.getGainedLeaderXP("CHALLENGE_CATEGORY_" + leaderName);
                const portraitKey = item.legendPathLoc.includes("FOUNDATION") ? "FOUNDATION" : leaderName;
                var progressItem = {
                    progressItemType: item.legendPathType,
                    leader: portraitKey,
                    title: item.legendPathLoc,
                    startLevel: item.currentLevel,
                    nextLevel: item.currentLevel + 1,
                    previousXP: item.currentXp - gainedXP,
                    gainedXP: gainedXP,
                    previousLevelXP: item.prevLevelXp,
                    nextLevelXP: item.nextLevelXp
                };
                const leveledUp = (item.currentXp - gainedXP) <= item.prevLevelXp;
                if (leveledUp) {
                    item.rewards?.forEach(reward => {
                        if (reward.level == item.currentLevel) {
                            var unlockedMemento = {
                                title: reward.title,
                                description: reward.desc,
                                url: "fs://game/" + reward.reward,
                            };
                            if (item.legendPathLoc.includes("FOUNDATION")) {
                                data.unlockedFoundationRewards.push(unlockedMemento);
                            }
                            else {
                                data.unlockedLeaderRewards.push(unlockedMemento);
                            }
                        }
                    });
                }
                const ItemIndex = data.progressItems.findIndex(x => x.progressItemType == item.legendPathType);
                if (ItemIndex == -1) {
                    data.progressItems.push(progressItem);
                }
                else {
                    data.progressItems[ItemIndex] = progressItem;
                }
            }
        });
        const completedFoundationChallengeData = Online.Achievements.getCompletedFoundationChallengeData();
        if (completedFoundationChallengeData) {
            completedFoundationChallengeData.forEach(item => {
                if (item.challengeClass == ChallengeClass.CHALLENGE_CLASS_FOUNDATION) {
                    var challengeChallengeItem = {
                        title: item.name,
                        description: item.description,
                        points: item.xp,
                        rewardIcon: item.rewardURL
                    };
                    data.completedFoundationChallenge.push(challengeChallengeItem);
                }
            });
        }
        const completedLeaderChallengeData = Online.Achievements.getCompletedLeaderChallengeData("CHALLENGE_CATEGORY_" + leaderName);
        if (completedLeaderChallengeData) {
            completedLeaderChallengeData.forEach(item => {
                if (item.challengeClass == ChallengeClass.CHALLENGE_CLASS_LEADER) {
                    const categoryData = Online.Metaprogression.getChallengeCategoryData(item.challengeCategory);
                    if (categoryData.id && categoryData.id.includes(leaderName)) {
                        var challengeleaderItem = {
                            title: item.name,
                            description: item.description,
                            points: item.xp,
                            rewardIcon: item.rewardURL
                        };
                        data.completedLeaderChallenge.push(challengeleaderItem);
                    }
                }
            });
        }
        Online.Achievements.getUnlockedRewards().forEach(challengereward => {
            if (challengereward.rewardType == ChallengeRewardType.CHALLENGE_REWARD_UNLOCKABLE) {
                const allRewards = Online.UserProfile.getRewardEntries();
                const item = allRewards.find((r) => r.iconName === challengereward.reward);
                if (item) {
                    var unlockedReward = {
                        title: item.name,
                        description: item.description,
                        url: "fs://game/" + challengereward.reward,
                    };
                    data.unlockedFoundationRewards.push(unlockedReward);
                }
            }
        });
        return data;
    }
    getDummyData() {
        const data = {
            progressItems: [],
            completedFoundationChallenge: [],
            completedLeaderChallenge: [],
            unlockedFoundationRewards: [],
            unlockedLeaderRewards: []
        };
        const currentlyPlayedLeader = Configuration.getPlayer(GameContext.localPlayerID).leaderName;
        let leaderName = currentlyPlayedLeader ? currentlyPlayedLeader.replace("LOC_", "") : "";
        leaderName = leaderName.replace("_NAME", "");
        for (let i = 0; i < 5; i++) {
            var progressItem = {
                progressItemType: 0,
                leader: i % 2 == 1 ? "FOUNDATION" : leaderName,
                title: "Fish" + i,
                startLevel: 1,
                nextLevel: 2,
                previousXP: 0,
                gainedXP: 100,
                previousLevelXP: 0,
                nextLevelXP: 128
            };
            data.progressItems.push(progressItem);
        }
        //Dummy unlocked leader rewards
        data.unlockedLeaderRewards.push({
            title: "Unlocked Leader Reward 4 u",
            description: "Ya did it :)",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedLeaderRewards.push({
            title: "Trout",
            description: "A mysterious form of fish",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedLeaderRewards.push({
            title: "flex-auto",
            description: "It's magic!",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedLeaderRewards.push({
            title: "Vendor Trash",
            description: "Sell to Sid Buyer for a nice profit",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedLeaderRewards.push({
            title: "Green Sweater",
            description: "Bradford really misses it",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        //Dummy completed foundation challenges
        data.completedFoundationChallenge.push({
            title: "Completed foundation reward",
            description: ":O",
            points: 128,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedFoundationChallenge.push({
            title: "The Dream of Flight",
            description: "Flew a plane with Sid Flyer",
            points: 128,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedFoundationChallenge.push({
            title: "No",
            description: "Declined a trade route with England",
            points: 128,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedFoundationChallenge.push({
            title: "It's Actually Really Simple!",
            description: "Figured out how to play UFO Defense",
            points: 128,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedFoundationChallenge.push({
            title: "Rigged Game",
            description: "Failed three espionage actions in a row",
            points: 128,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        //Dummy completed leader challenges
        data.completedLeaderChallenge.push({
            title: "Completed leader challenge",
            description: "0.1% of users have this achievement.",
            points: 1337,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedLeaderChallenge.push({
            title: "Dino Egg",
            description: "Finished Sid Meier's Dinosaurs! on the highest difficulty",
            points: 1337,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedLeaderChallenge.push({
            title: "My Sword is Backed by JUSTICE",
            description: "Parried Gandhi's Nuke",
            points: 1337,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedLeaderChallenge.push({
            title: "Tank Diff",
            description: "Defeated a Tank with a Spearman",
            points: 1337,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.completedLeaderChallenge.push({
            title: "This Start Sucks...",
            description: "Deleted your Founder",
            points: 1337,
            rewardIcon: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        //Dummy unlocked foundation rewards
        data.unlockedFoundationRewards.push({
            title: "Unlocked foundation reward Fish",
            description: "It swims",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedFoundationRewards.push({
            title: "Singing diploma",
            description: "Earned for participating in the Sid Choir.",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedFoundationRewards.push({
            title: "Third half of a life",
            description: "It was right here the whole time!",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedFoundationRewards.push({
            title: "Nuclear Birb",
            description: "CAUTION!!! CAUTION!!! CAUTION!!!",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        data.unlockedFoundationRewards.push({
            title: "S-Coin",
            description: "Can be exchanged for prizes at the end of the dev cycle",
            url: "fs://game/base-standard/leader_portrait_unknown.png"
        });
        return data;
    }
}
const LegendsManager = new LegendsManagerImpl();
export { LegendsManager as default };

//# sourceMappingURL=file:///base-standard/ui/legends-manager/legends-manager.js.map

/**
 * model-victory-progress.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Gathers the score data for the era victory conditions
 */
import UpdateGate from "/core/ui/utilities/utilities-update-gate.js";
class PlayerUnlockModel {
    constructor() {
        this._legacyCurrency = [];
        this.updateGate = new UpdateGate(() => { this.update(); });
        this._localPlayer = null;
    }
    contructor() {
        this.updateGate.call('constructor');
    }
    update() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer) {
            console.error(`model-unlocks: Failed to retrieve PlayerLibrary for Player ${GameContext.localPlayerID}`);
            return [];
        }
        this._localPlayer = localPlayer;
        if (this.onUpdate) {
            this.onUpdate(this);
        }
        return;
    }
    get legacyCurrency() {
        return this._legacyCurrency;
    }
    get localPlayer() {
        return this._localPlayer;
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    getLegacyCurrency() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer) {
            console.error(`model-unlocks: Failed to retrieve PlayerLibrary for Player ${GameContext.localPlayerID}`);
            return [];
        }
        const playerAdvancedStart = localPlayer.AdvancedStart;
        if (!playerAdvancedStart) {
            console.error(`model-unlocks: Failed to retrieve Resources for Player ${GameContext.localPlayerID}`);
            return [];
        }
        return playerAdvancedStart.getLegacyPoints();
    }
    getRewardItems() {
        const unlockRewards = [];
        const localPlayer = Players.get(GameContext.localPlayerID);
        const playerLegacyPath = localPlayer?.LegacyPaths;
        if (playerLegacyPath) {
            const legacyRewards = playerLegacyPath.getRewards();
            legacyRewards.forEach(reward => {
                const rewardDetails = GameInfo.AgeProgressionRewards.lookup(reward);
                if (rewardDetails) {
                    unlockRewards.push(rewardDetails);
                }
            });
        }
        return unlockRewards;
    }
    getAgelessCommanderItems() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        const armies = localPlayer?.Units?.getUnits();
        const commanders = [];
        armies?.forEach(unit => {
            if (unit.isArmyCommander || unit.isAerodromeCommander || unit.isFleetCommander || unit.isSquadronCommander) {
                const unitInfo = GameInfo.Units.lookup(unit.type);
                if (unitInfo) {
                    const commander = {
                        name: unit.name,
                        level: unit.Experience?.getLevel || 1,
                        unitTypeName: unitInfo.Name,
                        type: unitInfo.UnitType
                    };
                    commanders.push(commander);
                }
            }
        });
        return commanders;
    }
    getAgelessConstructsAndImprovements() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        const playerConstructs = localPlayer?.Constructibles?.getConstructibles();
        const playersAgelessConstructs = [];
        const agelessItems = [];
        GameInfo.TypeTags.forEach(tag => {
            if (tag.Tag == "AGELESS") {
                agelessItems.push(tag);
            }
        });
        agelessItems.forEach(typeTag => {
            const constructableAgeless = GameInfo.Constructibles.lookup(typeTag.Type);
            if (constructableAgeless != undefined) {
                const agelessConstruct = {
                    name: constructableAgeless.Name,
                    quantity: 0,
                    description: "",
                    type: constructableAgeless.ConstructibleType
                };
                playerConstructs?.forEach(construct => {
                    const constructType = GameInfo.Constructibles.lookup(construct.type);
                    if (constructType?.ConstructibleType === constructableAgeless.ConstructibleType) {
                        agelessConstruct.quantity++;
                        agelessConstruct.description = constructType.Description ?? "";
                    }
                });
                if (agelessConstruct.quantity > 0) {
                    playersAgelessConstructs.push(agelessConstruct);
                }
            }
        });
        return playersAgelessConstructs;
    }
    getAgelessWonders() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        const playerWonders = localPlayer?.Constructibles?.getWonders(GameContext.localPlayerID);
        const agelessWondersOwned = [];
        playerWonders?.forEach(wonder => {
            const constructibleInfo = Constructibles.getByComponentID(wonder);
            if (constructibleInfo) {
                const wonderDefinition = GameInfo.Constructibles.lookup(constructibleInfo?.type);
                if (wonderDefinition) {
                    agelessWondersOwned.push(wonderDefinition);
                }
            }
        });
        return agelessWondersOwned;
    }
    getAgelessTraditions() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        const playerTraditions = localPlayer?.Culture?.getUnlockedTraditions();
        const unlockedTraditions = [];
        playerTraditions?.forEach(traditionHash => {
            const traditionInfo = GameInfo.Traditions.lookup(traditionHash);
            // Only show Civilization unique traditions.
            if (traditionInfo && traditionInfo.TraitType) {
                unlockedTraditions.push(traditionInfo);
            }
        });
        return unlockedTraditions;
    }
}
const PlayerUnlocks = new PlayerUnlockModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(PlayerUnlocks);
    };
    engine.createJSModel('g_PlayerUnlocks', PlayerUnlocks);
    PlayerUnlocks.updateCallback = updateModel;
});
export { PlayerUnlocks as default };

//# sourceMappingURL=file:///base-standard/ui/unlocks/model-unlocks.js.map

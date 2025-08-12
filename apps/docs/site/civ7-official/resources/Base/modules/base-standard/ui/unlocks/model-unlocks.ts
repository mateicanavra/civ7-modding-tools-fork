/**
 * model-victory-progress.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Gathers the score data for the era victory conditions
 */

import UpdateGate from "/core/ui/utilities/utilities-update-gate.js";

export type UnlockLegacies = {
	name: string;
	description: string;
	unlockRequirements?: string[];
	icon?: string;
}

export type AgelessConstructs = {
	name: string;
	quantity: number;
	description: string;
	type: string;
}

export type AgelessCommander = {
	name: string;
	icon?: string;
	level: number;
	unitTypeName: string;
	type: string;
}

class PlayerUnlockModel {
	private onUpdate?: (model: PlayerUnlockModel) => void;
	private _legacyCurrency: CardCategoryInstance[] = [];
	private updateGate: UpdateGate = new UpdateGate(() => { this.update(); });
	private _localPlayer: PlayerLibrary | null = null;
	contructor() {
		this.updateGate.call('constructor');
	}

	private update() {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
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

	get legacyCurrency(): CardCategoryInstance[] {
		return this._legacyCurrency;
	}

	get localPlayer(): PlayerLibrary | null {
		return this._localPlayer;
	}


	set updateCallback(callback: (model: PlayerUnlockModel) => void) {
		this.onUpdate = callback;
	}

	getLegacyCurrency(): CardCategoryInstance[] {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error(`model-unlocks: Failed to retrieve PlayerLibrary for Player ${GameContext.localPlayerID}`);
			return [];
		}
		const playerAdvancedStart: PlayerAdvancedStart | undefined = localPlayer.AdvancedStart;
		if (!playerAdvancedStart) {
			console.error(`model-unlocks: Failed to retrieve Resources for Player ${GameContext.localPlayerID}`);
			return [];
		}

		return playerAdvancedStart.getLegacyPoints();
	}

	getRewardItems(): AgeProgressionRewardDefinition[] {
		const unlockRewards: AgeProgressionRewardDefinition[] = [];
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const playerLegacyPath: PlayerLegacyPaths | undefined = localPlayer?.LegacyPaths;
		if (playerLegacyPath) {
			const legacyRewards = playerLegacyPath.getRewards();
			legacyRewards.forEach(reward => {
				const rewardDetails: AgeProgressionRewardDefinition | null = GameInfo.AgeProgressionRewards.lookup(reward);
				if (rewardDetails) {
					unlockRewards.push(rewardDetails);
				}
			})
		}
		return unlockRewards;
	}

	getAgelessCommanderItems(): AgelessCommander[] {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const armies = localPlayer?.Units?.getUnits();
		const commanders: AgelessCommander[] = [];
		armies?.forEach(unit => {
			if (unit.isArmyCommander || unit.isAerodromeCommander || unit.isFleetCommander || unit.isSquadronCommander) {
				const unitInfo = GameInfo.Units.lookup(unit.type);
				if (unitInfo) {
					const commander: AgelessCommander = {
						name: unit.name,
						level: unit.Experience?.getLevel || 1,
						unitTypeName: unitInfo.Name,
						type: unitInfo.UnitType
					}
					commanders.push(commander);
				}
			}
		});
		return commanders;
	}

	getAgelessConstructsAndImprovements(): AgelessConstructs[] {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const playerConstructs = localPlayer?.Constructibles?.getConstructibles();

		const playersAgelessConstructs: AgelessConstructs[] = [];
		const agelessItems: TypeTagDefinition[] = [];

		GameInfo.TypeTags.forEach(tag => {
			if (tag.Tag == "AGELESS") {
				agelessItems.push(tag);
			}
		});

		agelessItems.forEach(typeTag => {
			const constructableAgeless = GameInfo.Constructibles.lookup(typeTag.Type);
			if (constructableAgeless != undefined) {
				const agelessConstruct: AgelessConstructs = {
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

	getAgelessWonders(): ConstructibleDefinition[] {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const playerWonders = localPlayer?.Constructibles?.getWonders(GameContext.localPlayerID);
		const agelessWondersOwned: ConstructibleDefinition[] = [];
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

	getAgelessTraditions(): TraditionDefinition[] {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const playerTraditions = localPlayer?.Culture?.getUnlockedTraditions();
		const unlockedTraditions: TraditionDefinition[] = [];
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
	}

	engine.createJSModel('g_PlayerUnlocks', PlayerUnlocks);
	PlayerUnlocks.updateCallback = updateModel;
});

export { PlayerUnlocks as default }
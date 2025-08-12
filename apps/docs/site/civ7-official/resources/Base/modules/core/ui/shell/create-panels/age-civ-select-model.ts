/**
 * @file age-civ-select-model.ts		
 * @copyright 2024, Firaxis Games
 * @description Age and civ support functions/classes used by shell screens
 */

import LiveEventManager from "/core/ui/shell/live-event-logic/live-event-logic.js";

export interface CivBonusData {
	title: string;
	icon: string;
	text: string;
	description: string;
	kind: string;
}

export interface UnlockedByData {
	text: string;
	isUnlocked: boolean;
}

export interface CivData {
	civID: string;
	name: string;
	description: string;
	icon: string;
	image: string;
	abilityTitle: string;
	abilityText: string;
	bonuses: CivBonusData[];
	tags: string[];
	unlocks: string[];
	unlockedBy: UnlockedByData[];
	isHistoricalChoice: boolean;
	historicalChoiceReason: string | null;
	historicalChoiceType: string | null;
	isLocked: boolean;
	isOwned: boolean;
	unlockCondition: string; // TODO
	sortIndex: number;
}

export interface AgeData {
	type: string,
	domain: string,
	name: string
}

export function GetAgeMap(): Map<string, AgeData> {
	const ageMap = new Map<string, AgeData>();
	const ageParameter = GameSetup.findGameParameter('Age');

	for (const age of ageParameter?.domain.possibleValues ?? []) {
		const type = age.value?.toString();
		const domain = GameSetup.resolveString(age.originDomain);
		const name = GameSetup.resolveString(age.name);

		if (type && domain && name) {
			ageMap.set(type, { type, name, domain });
		}
	}

	return ageMap;
}

function resolveBonusIcon(bonus: { Kind: string, Type: string, Icon?: string }) {
	return (bonus.Kind === "KIND_QUARTER"
		? "CITY_UNIQUE_QUARTER"
		: bonus.Type);
}

export function GetCivilizationData(): CivData[] {
	const results: CivData[] = [];
	const playerCivilizations = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerCivilization');

	if (playerCivilizations) {

		// Additional queries.
		const civItemData = Database.query('config', 'select * from CivilizationItems order by SortIndex') ?? [];
		const civTagData = Database.query('config', 'select * from CivilizationTags inner join Tags on CivilizationTags.TagType = Tags.TagType inner join TagCategories on Tags.TagCategoryType = TagCategories.TagCategoryType') ?? [];
		const civUnlockData = Database.query('config', 'select * from CivilizationUnlocks order by SortIndex') ?? [];
		const civBiasData = (Database.query('config', 'select * from LeaderCivilizationBias') ?? []);
		const civLeaderPairingData = (Database.query('config', 'select * from LeaderCivParings') ?? []);

		const ageMap = GetAgeMap();

		const leaderParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
		const leaderType = leaderParameter ? leaderParameter.value.value as string : '';
		const leaderDomain = leaderParameter ? GameSetup.resolveString(leaderParameter.value.originDomain) ?? '' : '';
		const leaderUnlocks = Database.query('config', 'select * from LeaderUnlocks order by SortIndex') ?? [];

		const prevCivCount: number = Configuration.getPlayer(GameContext.localPlayerID).previousCivilizationCount;
		const previousCivs = new Set<number>();

		for (let i = 0; i < prevCivCount; ++i) {
			previousCivs.add(Configuration.getPlayer(GameContext.localPlayerID).getPreviousCivilization(i))
		}

		for (const civData of playerCivilizations.domain.possibleValues ?? []) {
			const civID = civData.value?.toString();
			if (!civID) {
				continue;
			}

			const name = GameSetup.resolveString(civData.name);

			if (!name) {
				continue;
			}

			const image = GameSetup.resolveString(civData.icon);

			if (!image) {
				console.error(`age-civ-select-model: DB icon reference for civ ${name} is null`);
				continue;
			}

			const icon = UI.getIconURL(civID == "RANDOM" ? "CIVILIZATION_RANDOM" : civID, "");
			const domain = GameSetup.resolveString(civData.originDomain);
			const description = GameSetup.resolveString(civData.description);

			const valueUnlocks = civUnlockData
				.filter(unlock => unlock.CivilizationType == civID
					&& unlock.CivilizationDomain == domain
					&& (unlock.AgeDomain == null || ageMap.get(unlock.AgeType as string)?.domain == unlock.AgeDomain)
				);

			let civBiasForCivAndLeader = civBiasData.filter(row =>
				row.CivilizationType == civID
				&& row.CivilizationDomain == domain
				&& row.LeaderType == leaderType
				&& row.LeaderDomain == leaderDomain);

			const tags = civTagData
				.filter(tag => !tag.HideInDetails && tag.CivilizationType == civID && tag.CivilizationDomain == domain)
				.map(t => Locale.compose(t.Name as string));

			valueUnlocks.sort((a, b) => (a.AgeType as string == b.AgeType as string) ?
				Locale.compare(a.Type as string, b.Type as string) :
				Locale.compare(a.AgeType as string, b.AgeType as string));
			const unlocks: string[] = valueUnlocks.map(unlock => {
				const age = unlock.AgeDomain ? ageMap.get(unlock.AgeType as string) : null;
				return age
					? Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM_IN_AGE', unlock.Name as string, age.name)
					: Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM', unlock.Name as string);
			});

			// TODO: These should probably somehow be getting pulled from the UnlockRequirements database which is not available in the shell
			const unlocksByCiv: UnlockedByData[] = civUnlockData
				.filter(unlock => unlock.Type == civID
					&& (unlock.AgeDomain == null || ageMap.get(unlock.AgeType as string)?.domain == unlock.AgeDomain)
				).map(civ => {
					const civInfo = Database.query('config', `select CivilizationName from Civilizations where CivilizationType='${civ.CivilizationType}'`)?.[0];
					const civId = Database.makeHash(civ.CivilizationType as string ?? "");
					return {
						text: Locale.compose("LOC_AGE_TRANSITION_PLAY_AS", (civInfo?.CivilizationName ?? "") as string),
						isUnlocked: previousCivs.has(civId)
					};
				});
			const unlocksByLeader: UnlockedByData[] = leaderUnlocks
				.filter(unlock => unlock.Type == civID
					&& (unlock.AgeDomain == null || ageMap.get(unlock.AgeType as string)?.domain == unlock.AgeDomain)
				).map(unlock => {
					const leader = Database.query('config', `select LeaderName from Leaders where LeaderType='${unlock.LeaderType}'`)?.[0];
					return {
						text: Locale.compose("LOC_AGE_TRANSITION_PLAY_AS", (leader?.LeaderName ?? "") as string),
						isUnlocked: leaderType == unlock.LeaderType
					};
				});
			const unlockedBy = [...unlocksByCiv, ...unlocksByLeader];

			const civItems = civItemData.filter(item => item.CivilizationType == civID && item.CivilizationDomain == domain);
			const ability = civItems.find(item => item.Kind == "KIND_TRAIT");
			const bonusItems: CivBonusData[] = civItems
				.filter(item => item.Kind == 'KIND_BUILDING' || item.Kind == 'KIND_IMPROVEMENT' || item.Kind == 'KIND_UNIT' || item.Kind == 'KIND_QUARTER' || item.Kind == 'KIND_ROUTE')
				.map(item => ({
					title: Locale.stylize(item.Name as string ?? ""),
					icon: resolveBonusIcon(item as { Kind: string, Type: string, Icon?: string }),
					text: Locale.stylize(item.Description as string ?? ""),
					description: item.Description as string ?? "",
					kind: item.Kind as string ?? ""
				}));

			// check if restricted leader live event is running, then only show fixed civ
			if (LiveEventManager.restrictToPreferredCivs()) {
				let civLeaderFixed = civLeaderPairingData.filter(row => row.CivilizationType == civID && row.LeaderType == leaderType);

				if (civLeaderFixed.length == 0 && !UI.isMultiplayer()) // different behavior for MP because of tooltips data
					continue;
			} else {
				civBiasForCivAndLeader = civBiasForCivAndLeader.filter(row => row.ReasonType as string != 'LOC_REASON_LIVE_EVENT_DESCRIPTION');
			}

			const isHistoricalChoice = civBiasForCivAndLeader.length > 0;

			const isLocked = civData.invalidReason != GameSetupDomainValueInvalidReason.Valid;
			const isOwned = civData.invalidReason != GameSetupDomainValueInvalidReason.NotValidOwnership;

			const civHistoricalChoiceReason = civBiasForCivAndLeader.filter(row => row.ReasonType != null)
				.map(row => Locale.compose(row.ReasonType as string))
				.join(", ");

			const civHistoricalChoiceType = civBiasForCivAndLeader.filter(row => row.ChoiceType != null)
				.map(row => Locale.compose(row.ChoiceType as string))
				.join(", ");

			results.push({
				civID: civID,
				name: Locale.stylize(name),
				description: Locale.stylize(description as string ?? ''),
				icon: icon ?? '',
				image: image ?? '',
				abilityTitle: Locale.stylize(ability?.Name as string ?? ''),
				abilityText: Locale.stylize(ability?.Description as string ?? ''),
				bonuses: bonusItems,
				tags: tags,
				unlocks: unlocks,
				unlockedBy: unlockedBy,
				historicalChoiceReason: civHistoricalChoiceReason,
				historicalChoiceType: civHistoricalChoiceType,
				isHistoricalChoice: isHistoricalChoice,
				isLocked: isLocked,
				isOwned: isOwned,
				unlockCondition: "", // TODO
				sortIndex: civData.sortIndex
			});
		}
	}

	results.sort((a, b) => {
		if (a.sortIndex != b.sortIndex) {
			return a.sortIndex - b.sortIndex;
		}
		else {
			return Locale.compare(a.name, b.name);
		}
	})

	return results;
} 
/**
 * Text Provider utility funcitons
 * @copyright 2020-2024, Firaxis Games
 * 
 * Helpers for finding, composing, and formatting text for all purposes.
 */

/** ================================================================
 *
 *  FORMATTING
 *
 * =============================================================== */
export function formatStringArrayAsListString(strings: string[], separator: string = "."): string {
	let output: string = "";

	for (let str of strings) {
		let locStr = Locale.compose(str);
		if (output == "") {
			output = locStr;
		} else {
			output += separator + " " + locStr;
		}
	}

	return output;
}

export function formatStringArrayAsNewLineText(strings: string[], lineBreaks: number = 1): string {
	let output: string = "";

	for (let str of strings) {
		let locStr = Locale.stylize(str);
		if (output == "") {
			output = locStr;
		} else {
			for (let i = 0; i < lineBreaks; i++) {
				output += Locale.stylize("[n]");
			}
			output += locStr;
		}
	}

	return output;
}

/** ================================================================
 *
 *  CONSTRUCTIBLE PARSING
 *
 * =============================================================== */
export function composeConstructibleDescription(constructible: ConstructibleType, city: City | null = null): string {
	let desc: string = "";

	const constructibleDef = GameInfo.Constructibles.lookup(constructible);
	if (constructibleDef) {
		// Get core effects for the constructible
		const { baseYield, adjacencies, effects } = getConstructibleEffectStrings(constructible, city);
		const effectStrings: string[] = baseYield ? [baseYield, ...adjacencies, ...effects] : [...adjacencies, ...effects];

		// Append custom description, if any
		if (constructibleDef.Tooltip) {
			effectStrings.push(constructibleDef.Tooltip);
		}

		desc = Locale.compose(effectStrings.map(s => Locale.compose(s)).join('[N]'));
	}

	return desc;
}

export function getConstructibleEffectStrings(constructible: ConstructibleType, city: City | null = null) {

	// Core yield
	let baseYield: string | undefined;
	const baseYieldStrings: string[] = [];
	GameInfo.Constructible_YieldChanges.forEach(element => {
		if (element.ConstructibleType == constructible) {
			let s = parseConstructibleYield(element);
			if (s) {
				baseYieldStrings.push(s);
			}
		}
	});

	if (baseYieldStrings.length > 0) {
		baseYield = Locale.compose('LOC_UI_PRODUCTION_BASE_YIELD', baseYieldStrings.join(" "));
	}


	const adjacencies: string[] = [];
	// Adjacency yield
	for (let element of GameInfo.Constructible_Adjacencies) {
		//GameInfo.Constructible_Adjacencies.forEach(element => {
		if (element.ConstructibleType == constructible) {
			const yieldChangeDef = GameInfo.Adjacency_YieldChanges.find(o => o.ID == element.YieldChangeId);
			if (yieldChangeDef) {
				// If the yield change requires an unlock, check city-constructibles for validity
				if (element.RequiresActivation) {
					if (!city) {
						continue;
					}
					if (!city.Constructibles) {
						continue;
					}
					if (!city.Constructibles.isAdjacencyUnlocked(yieldChangeDef.ID)) {
						continue;
					}
				}
				let s = parseConstructibleAdjacency(yieldChangeDef);
				if (s) {
					adjacencies.push(s);
				}
			}
		}
	}

	// Modifiers
	const effects: string[] = [];
	GameInfo.ConstructibleModifiers.forEach(element => {
		if (element.ConstructibleType == constructible) {
			let s = getModifierTextByContext(element.ModifierId, "Description");
			if (s) {
				effects.push(s);
			}
		}
	});

	// Buildings-only effects
	const buildingDef = GameInfo.Buildings.lookup(constructible);
	if (buildingDef) {
		// Movable
		if (buildingDef.Movable) {
			adjacencies.push(Locale.compose("LOC_UI_CONSTRUCTIBLE_MOVABLE_DESC"));
		}
	}

	return {
		baseYield,
		adjacencies,
		effects,
	};
}

function parseConstructibleYield(def: Constructible_YieldChangeDefinition): string {
	let yieldInfo = GameInfo.Yields.lookup(def.YieldType);
	if (!yieldInfo) {
		return "[ERR] Invalid YieldType";
	}
	const result = Locale.compose("LOC_UI_POS_YIELD", def.YieldChange, yieldInfo!.Name);
	return result;
}

export function parseConstructibleAdjacency(def: Adjacency_YieldChangeDefinition): string {
	const amount: number = def.YieldChange;
	const yieldName: string = GameInfo.Yields.lookup(def.YieldType)!.Name;
	let result: string = '';

	if (amount == 0) {
		// No need to show changes with no amount
		return result;
	}

	// Compose by adjacency type
	if (def.AdjacentTerrain) {
		const terrainName = GameInfo.Terrains.lookup(def.AdjacentTerrain)?.Name;
		if (terrainName) {
			result = Locale.compose("LOC_UI_ADJACENCY_INFO_TERRAIN", amount, yieldName, terrainName);
		}
	}
	else if (def.AdjacentBiome) {
		const biomeName = GameInfo.Biomes.lookup(def.AdjacentBiome)?.Name;
		if (biomeName) {
			result = Locale.compose("LOC_UI_ADJACENCY_INFO_BIOME", amount, yieldName, biomeName);
		}
	}
	else if (def.AdjacentFeature) {
		const featureName = GameInfo.Features.lookup(def.AdjacentFeature)?.Name;
		if (featureName) {
			result = Locale.compose("LOC_UI_ADJACENCY_INFO_FEATURE", amount, yieldName, featureName);
		}
	}
	else if (def.AdjacentFeatureClass) {
		const featureClassAdj = GameInfo.FeatureClasses.lookup(def.AdjacentFeatureClass)?.Adjective;
		if (featureClassAdj) {
			result = Locale.compose("LOC_UI_ADJACENCY_INFO_FEATURE", amount, yieldName, featureClassAdj);
		}
	}
	else if (def.AdjacentDistrict) {
		if (def.AdjacentDistrict == "DISTRICT_WONDER") {
			result = Locale.compose("LOC_UI_ADJACENCY_INFO_WONDERS", amount, yieldName);
		} else {
			let districtName = GameInfo.Districts.lookup(def.AdjacentDistrict)?.Name;
			if (districtName) {
				result = Locale.compose("LOC_UI_ADJACENCY_INFO_DISTRICT", amount, yieldName, districtName);
			}
		}
	}
	else if (def.AdjacentConstructible) {
		const objectName = GameInfo.Constructibles.lookup(def.AdjacentConstructible)?.Name;
		if (objectName) {
			result = Locale.compose("LOC_UI_ADJACENCY_INFO_OBJECT", amount, yieldName, objectName);
		}
	}
	else if (def.AdjacentConstructibleTag) {
		result = Locale.compose("LOC_UI_ADJACENCY_INFO_CONSTRUCTIBLE_TAG", amount, yieldName, "LOC_TAG_CONSTRUCTIBLE_" + def.AdjacentConstructibleTag);
	}
	else if (def.AdjacentNavigableRiver) {
		result = Locale.compose("LOC_UI_ADJACENCY_INFO_OBJECT", amount, yieldName, "LOC_NAVIGABLE_RIVER_NAME");
	}
	else if (def.AdjacentNaturalWonder) {
		result = Locale.compose("LOC_UI_ADJACENCY_INFO_NATURAL_WONDER", amount, yieldName);
	}
	else if (def.AdjacentUniqueQuarter) {
		if (def.AdjacentUniqueQuarterType) {
			const quarterName = GameInfo.UniqueQuarters.lookup(def.AdjacentUniqueQuarterType)?.Name;
			if (quarterName) {
				result = Locale.compose("LOC_UI_ADJACENCY_INFO_OBJECT", amount, yieldName, quarterName);
			}
		}
		else {
			result = Locale.compose("LOC_UI_ADJACENCY_INFO_UNIQUE_QUARTERS", amount, yieldName);
		}
	}
	else if (def.AdjacentQuarter) {
		result = Locale.compose("LOC_UI_ADJACENCY_INFO_QUARTERS", amount, yieldName);
	}
	else if (def.AdjacentResource) {
		result = Locale.compose("LOC_UI_ADJACENCY_INFO_RESOURCES", amount, yieldName);
	}
	else if (def.AdjacentRiver) {
		result = Locale.compose("LOC_UI_ADJACENCY_INFO_RIVERS", amount, yieldName);
	}
	else if (def.AdjacentLake) {
		result = Locale.compose("LOC_UI_ADJACENCY_INFO_LAKE", amount, yieldName);
	}
	else {
		console.warn(`utilities-core-textprovider: parseConstructibleAdjacency: Failed to display a non-zero adjacency bonus with id ${def.ID}!`);
	}

	// No adjacency bonus is a valid possibility
	return result;
}


// TODO: Consider moving to base-standard since this is tree related.
/**
 * Progression Tree Parsing
 * @param node 
 * @param unlocks 
 * @returns 
 */
export function composeProgressionTreeNodeUnlocks(node: NodeDisplayData, unlocks?: NodeUnlockDisplayData[]): any[] {
	let results: any[] = [];
	if (!unlocks) {
		return results;
	}

	for (var i = 1; i <= node.maxDepth; ++i) {

		let header = (i <= node.currentDepthUnlocked ? "[DONE] " : "") + "Unlock " + i;
		let descriptionsAtDepth: string[] = [];
		for (let unlock of unlocks) {
			if (unlock.depth == i) {
				let fullText: string = unlock.name ? unlock.name + ": " + unlock.description : unlock.description;
				descriptionsAtDepth.push(fullText);
			}
		}
		let unlocksAtDepth = {
			label: header,
			descriptions: descriptionsAtDepth,
		}
		results.push(unlocksAtDepth);
	}

	// If only one depth, rename first element
	if (node.maxDepth == 1) {
		results[0].label = "All Unlocks";
	}

	return results;
}

// TODO: Move with other tree methods since it is not only text (returns an object with unlocks)
export function composeProgressionTreeNodeUnlocksSplit(node: NodeDisplayData, unlocks?: NodeUnlockDisplayData[]): any[] {
	let results: any[] = [];
	if (!unlocks) {
		return results;
	}

	for (var i = 1; i <= node.maxDepth; ++i) {

		let header = (i <= node.currentDepthUnlocked ? "[DONE] " : "") + "Unlock " + i;
		let contentAtDepth: NodeUnlockDisplayData[] = [];
		for (let unlock of unlocks) {
			if (unlock.depth == i) {
				contentAtDepth.push(unlock);
			}
		}
		let unlocksAtDepth = {
			header: header,
			unlocks: contentAtDepth,
		}
		results.push(unlocksAtDepth);
	}

	// If only one depth, rename first element
	if (node.maxDepth == 1) {
		results[0].header = "All Unlocks";
	}

	return results;
}

export function quickFormatProgressionTreeNodeUnlocks(nodeDef: ProgressionTreeNodeDefinition): string {
	let strings: string[] = [];
	GameInfo.ProgressionTreeNodeUnlocks.filter(n => { return n.ProgressionTreeNodeType == nodeDef.ProgressionTreeNodeType; }).forEach(unlock => {
		if (unlock.TargetKind == "KIND_MODIFIER") {
			let modText = getModifierTextByContext(unlock.TargetType, "Description");
			strings.push(modText);
		}
	});
	return formatStringArrayAsNewLineText(strings);
}

/**
 * Modifier Parsing
 * @param modifierId 
 * @param context 
 * @returns 
 */
export function getModifierTextByContext(modifierId: string, context: string): string {
	const modifierStringInfo = GameInfo.ModifierStrings.find(o => o.ModifierId == modifierId && o.Context == context);
	return modifierStringInfo ? modifierStringInfo.Text : "";
}

/**
 * Round a floating point number to two decimal places.
 * @param {number} v the value to round
 * @returns The same number but rounded to two decimal places (hundreds).
 */
export function roundTo2(v: number | undefined): number {
	if (v == undefined) {
		return 0;
	}
	else {
		return Math.round((v + Number.EPSILON) * 100) / 100;
	}
}
import { XmlElement } from "jstoxml";
import * as lodash from "lodash";
import { randomUUID } from "node:crypto";

import { TClassProperties, TObjectValues } from "../types";
import {
    ACTION_GROUP_ACTION,
    AGE,
    BIOME, BUILDING_CULTURES,
    FEATURE_CLASS,
    KIND,
    RESOURCE,
    TAG_TRAIT,
    TRAIT,
    UNIT_CULTURE
} from "../constants";
import { CivilizationLocalization } from "../localizations";
import { locale } from "../utils";

import { ActionGroupBundle } from "./ActionGroupBundle";
import { Base } from "./Base";
import { CivilizationItem } from "./CivilizationItem";
import { Constructible } from "./Constructible";
import { FileImport } from "./FileImport";
import { FileXml } from "./FileXml";
import { Icon } from "./Icon";
import { Unit } from "./Unit";

type TCivilization = TClassProperties<Civilization>;

export class Civilization extends Base<TCivilization> implements TCivilization {
    domain = '';
    name: string = randomUUID();
    trait: string = '';
    traitAbility: string = '';
    type: string = '';

    startBiasBiomes: { biome: TObjectValues<typeof BIOME>, score: number }[] = [];
    startBiasResources: { resource: TObjectValues<typeof RESOURCE>, score: number }[] = [];
    startBiasTerrains: { terrain: TObjectValues<typeof RESOURCE>, score: number }[] = [];
    startBiasFeatureClasses: { featureClass: TObjectValues<typeof FEATURE_CLASS>, score: number }[] = [];

    icons: { main?: Icon } = {};

    age: TObjectValues<typeof AGE> = AGE.ANTIQUITY
    civilizationTags: TObjectValues<typeof TAG_TRAIT>[] = [];
    civilizationTraits: TObjectValues<typeof TRAIT>[] = [];
    civilizationBuildingCultures: TObjectValues<typeof BUILDING_CULTURES>[] = [BUILDING_CULTURES.ANT_MUD];
    civilizationUnitCulture: TObjectValues<typeof UNIT_CULTURE> = UNIT_CULTURE.EURO;

    actionGroupBundle = new ActionGroupBundle();
    civilizationItems: CivilizationItem[] = [];
    localizations: CivilizationLocalization[] = [];

    constructor(payload: Partial<TCivilization> = {}) {
        super();
        this.fill(payload);

        const typeName = lodash.snakeCase(this.name).toLocaleUpperCase()
        const typePrefix = 'CIVILIZATION_';
        if (!this.type) {
            this.type = `${typePrefix}${typeName}`;
        }
        if (!this.type.startsWith(typePrefix)) {
            this.type = `${typePrefix}${this.type}`;
        }

        const traitPrefix = 'TRAIT_';
        if (!this.trait) {
            this.trait = this.type.replace(typePrefix, traitPrefix);
        }
        if (!this.trait.startsWith(traitPrefix)) {
            this.trait = `${traitPrefix}${this.trait}`;
        }

        const traitAbilityPostfix = '_ABILITY';
        if (!this.traitAbility) {
            this.traitAbility = `${this.trait}${traitAbilityPostfix}`;
        }
        if (!this.traitAbility.endsWith(traitAbilityPostfix)) {
            this.traitAbility = `${this.traitAbility}${traitAbilityPostfix}`;
        }

        if (!this.domain) {
            this.domain = {
                [AGE.ANTIQUITY]: 'AntiquityAgeCivilizations',
                [AGE.EXPLORATION]: 'ExplorationAgeCivilizations',
                [AGE.MODERN]: 'ModernAgeCivilizations',
            }[this.age];
        }

        if(this.icons?.main){
            this.icons.main.fill({
                id: this.type,
                path: `civ_sym_${lodash.snakeCase(this.name)}`
            });
        }
    }

    bind(items: (Unit | Constructible)[]) {
        items.forEach(item => {
            if (item instanceof Unit) {
                item.fill({ traitType: this.trait })
            }
            if (item instanceof Constructible) {
                item.fill({ traitType: this.trait })
            }
        })
    }

    private toShell() {
        return {
            Database: {
                Civilizations: {
                    _name: 'Row',
                    _attrs: {
                        Domain: this.domain,
                        CivilizationType: this.type,
                        CivilizationName: locale(this.type, 'Name'),
                        CivilizationFullName: locale(this.type, 'FullName'),
                        CivilizationDescription: locale(this.type, 'Description'),
                        CivilizationIcon: this.type
                    }
                },
                CivilizationTags: this.civilizationTags.map(civilizationTag => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationDomain: this.domain,
                        CivilizationType: this.type,
                        TagType: civilizationTag,
                    }
                })),
                CivilizationItems: this.civilizationItems.map(civilizationItem => {
                    return civilizationItem.fill({
                        civilizationType: this.type,
                        civilizationDomain: this.domain
                    }).toXmlElement();
                })
            }
        }
    }

    private toLocalization(): XmlElement {
        if(!this.localizations.length){
            return null;
        }
        return {
            Database: this.localizations.map(localization => {
                return localization.fill({ prefix: this.type }).toXmlElement();
            })
        }
    }

    private toLegacy(): XmlElement {
        return {
            Database: {
                Types: [{
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Kind: KIND.CIVILIZATION
                    }
                }],
                LegacyCivilizations: [{
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        Name: locale(this.type, 'Name'),
                        FullName: locale(this.type, 'FullName'),
                        Adjective: locale(this.type, 'Adjective'),
                        Age: this.age,
                    }
                }],
                LegacyCivilizationTraits: [{
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        TraitType: this.trait
                    }
                }]
            }
        }
    }

    private toGame() {
        const cityNamesLength = Math.max(...this.localizations.map(localization => localization.cityNames.length));
        return {
            Database: {
                Types: [{
                    _name: 'Row',
                    _attrs: {
                        Type: this.trait,
                        Kind: KIND.TRAIT
                    }
                }, {
                    _name: 'Row',
                    _attrs: {
                        Type: this.traitAbility,
                        Kind: KIND.TRAIT
                    }
                }],
                Traits: [{
                    _name: 'Row',
                    _attrs: {
                        TraitType: this.trait,
                        InternalOnly: "true"
                    }
                }, {
                    _name: 'Row',
                    _attrs: {
                        TraitType: this.traitAbility,
                        Name: locale(this.traitAbility, 'Name'),
                        Description: locale(this.traitAbility, 'Description'),
                        InternalOnly: "true"
                    }
                }],
                Civilizations: [{
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        Name: locale(this.type, 'Name'),
                        FullName: locale(this.type, 'FullName'),
                        Description: locale(this.type, 'Description'),
                        Adjective: locale(this.type, 'Adjective'),
                        CapitalName: locale(this.type, 'cityNames0'),
                        StartingCivilizationLevelType: 'CIVILIZATION_LEVEL_FULL_CIV',
                        RandomCityNameDepth: '10',
                    }
                }],
                CivilizationTraits: [{
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        TraitType: this.trait
                    }
                }, {
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        TraitType: this.traitAbility
                    }
                }, ...this.civilizationTraits.map(civilizationTrait => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        TraitType: civilizationTrait,
                    }
                }))],
                CityNames: Array.from(Array(cityNamesLength)).map((_, i) => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        CityName: locale(this.type, `cityNames${i}`),
                    }
                })),
                StartBiasBiomes: this.startBiasBiomes.map(startBiasBiome => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        BiomeType: startBiasBiome.biome,
                        Score: startBiasBiome.score,
                    }
                })),
                StartBiasResources: this.startBiasResources.map(startBiasResource => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        ResourceType: startBiasResource.resource,
                        Score: startBiasResource.score,
                    }
                })),
                StartBiasTerrains: this.startBiasTerrains.map(startBiasTerrain => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        TerrainType: startBiasTerrain.terrain,
                        Score: startBiasTerrain.score,
                    }
                })),
                StartBiasFeatureClasses: this.startBiasFeatureClasses.map(startBiasFeatureClass => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        FeatureClassType: startBiasFeatureClass.featureClass,
                        Score: startBiasFeatureClass.score,
                    }
                })),
                VisArt_CivilizationBuildingCultures: this.civilizationBuildingCultures.map(civilizationBuildingCulture => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        BuildingCulture: civilizationBuildingCulture,
                    }
                })),
                VisArt_CivilizationUnitCultures: {
                    _name: 'Row',
                    _attrs: {
                        CivilizationType: this.type,
                        BuildingCulture: this.civilizationUnitCulture,
                    }
                }
            }
        };
    }

    private toIconDefinitions(): XmlElement {
        const icons = Object.values(this.icons).filter(icon => !!icon);

        if(!icons.length){
            return  null;
        }

        return {
            Database: {
                IconDefinitions: icons.map(icon => icon.toXmlElement())
            }
        }
    }

    getFiles() {
        const directory = `/civilization/${lodash.kebabCase(this.name)}/`;

        return [
            new FileXml({
                name: `shell.xml`,
                path: directory,
                content: this.toShell(),
                actionGroups: [this.actionGroupBundle.shell],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new FileXml({
                name: `game.xml`,
                path: directory,
                content: this.toGame(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new FileXml({
                name: `legacy.xml`,
                path: directory,
                content: this.toLegacy(),
                actionGroups: [this.actionGroupBundle.game],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new FileXml({
                name: `localization.xml`,
                path: directory,
                content: this.toLocalization(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.game],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_TEXT]
            }),
            new FileXml({
                path: directory,
                name: `icons.xml`,
                content: this.toIconDefinitions(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.game],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_ICONS]
            }),
            ...Object.values(this.icons).filter(icon => !!icon && icon.isExternal).map(icon => FileImport.from(icon))
        ];
    }
}
import * as lodash from 'lodash';
import { XmlElement } from "jstoxml";
import { randomUUID } from "node:crypto";

import {
    ACTION_GROUP_ACTION,
    CORE_CLASS,
    DOMAIN,
    FORMATION_CLASS,
    KIND,
    UNIT_CLASS,
    UNIT_MOVEMENT_CLASS
} from "../constants";
import { locale } from "../utils";
import { TClassProperties, TObjectValues } from "../types";
import { UnitLocalization } from "../localizations";

import { ActionGroupBundle } from "./ActionGroupBundle";
import { Base } from "./Base";
import { UnitCost } from "./UnitCost";
import { UnitStat } from "./UnitStat";
import { File } from "./File";
import { FileXml } from "./FileXml";
import { Icon } from "./Icon";
import { FileImport } from "./FileImport";

type TUnit = TClassProperties<Unit>;

export class Unit extends Base<TUnit> implements TUnit {
    name: string = randomUUID();
    type: string = '';
    tag = '';
    baseSightRange: number = 2;
    baseMoves: number = 2;
    zoneOfControl: boolean = true;
    unitReplace: string = '';
    visualRemap: string = '';
    traitType: string = '';
    icons: { main?: Icon } = {};

    unitMovementClass: TObjectValues<typeof UNIT_MOVEMENT_CLASS> = UNIT_MOVEMENT_CLASS.FOOT;
    domain: TObjectValues<typeof DOMAIN> = DOMAIN.LAND;
    coreClass: TObjectValues<typeof CORE_CLASS> = CORE_CLASS.MILITARY;
    formationClass: TObjectValues<typeof FORMATION_CLASS> = FORMATION_CLASS.LAND_COMBAT;
    typeTags: TObjectValues<typeof UNIT_CLASS>[] = [];

    actionGroupBundle = new ActionGroupBundle();
    unitStat = new UnitStat();
    unitCost = new UnitCost();
    localizations: UnitLocalization[] = [];

    constructor(payload: Partial<TUnit> = {}) {
        super();
        this.fill(payload);

        const typePrefix = 'UNIT_';
        const typeName = lodash.snakeCase(this.name).toLocaleUpperCase();
        if (!this.type) {
            this.type = `${typePrefix}${typeName}`;
        }
        if (!this.type.startsWith(typePrefix)) {
            this.type = `${typePrefix}${this.type}`;
        }

        const tagPrefix = 'UNIT_CLASS_';
        if (!this.tag) {
            this.tag = this.type.replace(typePrefix, tagPrefix);
        }
        if (!this.tag.startsWith(tagPrefix)) {
            this.tag = `${tagPrefix}${this.tag}`;
        }
    }

    private toGame(): XmlElement {
        return {
            Database: {
                Types: {
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Kind: KIND.UNIT,
                    },
                },
                Units: {
                    _name: 'Row',
                    _attrs: {
                        Name: locale(this.type, 'Name'),
                        Description: locale(this.type, 'Description'),
                        UnitType: this.type,
                        BaseSightRange: this.baseSightRange,
                        BaseMoves: this.baseMoves,
                        UnitMovementClass: this.unitMovementClass,
                        Domain: this.domain,
                        CoreClass: this.coreClass,
                        FormationClass: this.formationClass,
                        ZoneOfControl: this.zoneOfControl ? "true" : "false",
                        TraitType: this.traitType
                    },
                },
                Tags: [{
                    _name: 'Row',
                    _attrs: {
                        Tag: this.tag,
                        Category: 'UNIT_CLASS',
                    }
                }],
                TypeTags: [{
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Tag: this.tag,
                    }
                }, ...this.typeTags.map(typeTag => ({
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Tag: typeTag,
                    }
                }))],
                Unit_Stats: [this.unitStat.fill({ unitType: this.type }).toXmlElement()],
                Unit_Costs: [this.unitCost.fill({ unitType: this.type }).toXmlElement()],
                ...(this.unitReplace ? {
                    UnitReplaces: {
                        _name: 'Row',
                        _attrs: {
                            CivUniqueUnitType: this.type,
                            ReplacesUnitType: this.unitReplace,
                        }
                    }
                } : {})
            }
        }
    }

    private toVisualRemaps(): XmlElement {
        if(!this.visualRemap){
            return null;
        }
        return {
            Database: {
                VisualRemaps: {
                    Row: {
                        ID: `REMAP_${this.type}`,
                        DisplayName: locale(this.type, 'Name'),
                        Kind: 'UNIT',
                        From: this.type,
                        To: this.visualRemap
                    }
                }
            }
        }
    }

    private toLocalization(): XmlElement {
        if(!this.localizations){
            return null;
        }
        return {
            Database: this.localizations.map(localization => {
                return localization.fill({ prefix: this.type }).toXmlElement();
            })
        }
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
        const directory = `/units/${lodash.kebabCase(this.name)}/`;

        return [
            new FileXml({
                path: directory,
                name: `game.xml`,
                content: this.toGame(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new FileXml({
                path: directory,
                name: `icons.xml`,
                content: this.toIconDefinitions(),
                actionGroups: [this.actionGroupBundle.current, this.actionGroupBundle.shell],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_ICONS]
            }),
            new FileXml({
                path: directory,
                name: `visual-remap.xml`,
                content: this.toVisualRemaps(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_VISUAL_REMAPS]
            }),
            new FileXml({
                name: `localization.xml`,
                path: directory,
                content: this.toLocalization(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.game],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_TEXT]
            }),
            ...Object.values(this.icons).filter(icon => !!icon && icon.isExternal).map(icon => FileImport.from(icon))
        ];
    }
}
import { v4 as uuid } from 'uuid';
import * as lodash from 'lodash';
import { XmlElement } from "jstoxml";

import {
    ACTIONS_GROUPS_ACTION,
    CORE_CLASS,
    DOMAIN,
    FORMATION_CLASS,
    KIND,
    UNIT_CLASS,
    UNIT_MOVEMENT_CLASS
} from "../constants";
import { locale } from "../utils";
import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { XmlFile } from "./XmlFile";
import { ActionGroupBundle } from "./ActionGroupBundle";
import { UnitStat } from "./UnitStat";
import { UnitCost } from "./UnitCost";
import { UnitLocalization } from "../localizations";
import { Civilization } from "./Civilization";

type TUnit = TClassProperties<Unit>;

export class Unit extends Base<TUnit> implements TUnit {
    actionGroupBundle = new ActionGroupBundle();
    name: string = uuid();
    type: string = '';
    tag = '';
    baseSightRange: number = 2;
    baseMoves: number = 2;
    unitMovementClass: TObjectValues<typeof UNIT_MOVEMENT_CLASS> = UNIT_MOVEMENT_CLASS.FOOT;
    domain: TObjectValues<typeof DOMAIN> = DOMAIN.LAND;
    coreClass: TObjectValues<typeof CORE_CLASS> = CORE_CLASS.MILITARY;
    formationClass: TObjectValues<typeof FORMATION_CLASS> = FORMATION_CLASS.LAND_COMBAT;
    zoneOfControl: boolean = true;
    unitStat = new UnitStat();
    unitCost = new UnitCost();
    unitReplace: string = '';
    typeTags: TObjectValues<typeof UNIT_CLASS>[] = [];
    visualRemap: string = '';
    traitType: string = '';
    icon: string = '';
    localizations: UnitLocalization[] = [];

    constructor(payload: Partial<TUnit> = {}) {
        super();
        this.fill(payload);
        const typedName = lodash.snakeCase(this.name).toLocaleUpperCase();

        if(!this.type){
            this.type = `UNIT_${typedName}`;
        }
        if(!this.type.startsWith('UNIT_')){
            this.type = `UNIT_${this.type}`;
        }
        if (!this.tag) {
            this.tag = this.type.replace('UNIT_', 'UNIT_CLASS_');
        }
        if(!this.tag.startsWith('UNIT_CLASS_')){
            this.tag = `UNIT_CLASS_${this.tag}`;
        }
    }

    bindToCivilization(civilization: Civilization) {
        this.traitType = civilization.trait;
        return this;
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

    private toIconDefinitions(): XmlElement {
        return {
            Database: {
                IconDefinitions: {
                    Row: {
                        ID: this.type,
                        Path: this.icon,
                    }
                }
            }
        }
    }

    private toLocalization(): XmlElement {
        return {
            Database: this.localizations.map(localization => {
                return localization.fill({ prefix: this.type }).toXmlElement();
            })
        }
    }

    build() {
        const directory = `/units/${lodash.kebabCase(this.name)}/`;

        const files: XmlFile[] = [(
            new XmlFile({
                filename: `game.xml`,
                filepath: directory,
                content: this.toGame(),
                actionGroups: [
                    this.actionGroupBundle.current.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_DATABASE]
                    })
                ]
            })
        )];

        if (this.icon) {
            files.push(new XmlFile({
                filename: `icon.xml`,
                filepath: directory,
                content: this.toIconDefinitions(),
                actionGroups: [
                    this.actionGroupBundle.game.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_ICONS]
                    }),
                    this.actionGroupBundle.shell.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_ICONS]
                    }),
                ]
            }));
        }

        if (this.visualRemap) {
            files.push(new XmlFile({
                filename: `visual-remap.xml`,
                filepath: directory,
                content: this.toVisualRemaps(),
                actionGroups: [
                    this.actionGroupBundle.current.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_VISUAL_REMAPS]
                    })
                ]
            }));
        }

        if (this.localizations.length > 0) {
            files.push(new XmlFile({
                filename: `localization.xml`,
                filepath: directory,
                content: this.toLocalization(),
                actionGroups: [
                    this.actionGroupBundle.shell.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_TEXT]
                    }),
                    this.actionGroupBundle.game.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_TEXT]
                    })
                ]
            }));
        }

        return files;
    }
}
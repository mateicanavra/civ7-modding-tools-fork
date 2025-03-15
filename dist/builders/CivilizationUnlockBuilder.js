"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CivilizationUnlockBuilder = void 0;
const nodes_1 = require("../nodes");
const files_1 = require("../files");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const BaseBuilder_1 = require("./BaseBuilder");
class CivilizationUnlockBuilder extends BaseBuilder_1.BaseBuilder {
    constructor(payload = {}) {
        super();
        this._current = new nodes_1.DatabaseNode();
        this.from = {
            civilizationType: 'CIVILIZATION_FROM',
            ageType: constants_1.AGE.ANTIQUITY,
        };
        this.to = {
            civilizationType: 'CIVILIZATION_TO',
            ageType: constants_1.AGE.EXPLORATION,
        };
        this.localizations = [];
        this.fill(payload);
    }
    migrate() {
        const unlockType = `UNLOCK_${this.to.civilizationType}`;
        const requirementSetId = `REQSET_CIV_IS_${(0, utils_1.trim)(this.from.civilizationType)}`;
        const requirementId = `REQ_CIV_IS_${(0, utils_1.trim)(this.from.civilizationType)}`;
        this._current.fill({
            kinds: [new nodes_1.KindNode({ kind: constants_1.KIND.UNLOCK }).insertOrIgnore()],
            types: [new nodes_1.TypeNode({ type: unlockType }).insertOrIgnore()],
            unlocks: [new nodes_1.UnlockNode({ unlockType }).insertOrIgnore()],
            unlockRewards: [new nodes_1.UnlockRewardNode({
                    unlockType,
                    civUnlock: true,
                    name: (0, utils_1.locale)(this.to.civilizationType, 'NAME'),
                    description: (0, utils_1.locale)(this.to.civilizationType, 'DESCRIPTION'),
                    icon: this.to.civilizationType,
                }).insertOrIgnore()],
            requirementSets: [new nodes_1.RequirementSetNode({
                    requirementSetId,
                    requirementSetType: constants_1.REQUIREMENT_SET.TEST_ALL
                }).insertOrIgnore()],
            requirements: [new nodes_1.RequirementNode({
                    requirementId,
                    requirementType: constants_1.REQUIREMENT.PLAYER_CIVILIZATION_TYPE_MATCHES
                }).insertOrIgnore()],
            requirementArguments: [new nodes_1.RequirementArgumentNode({
                    requirementId,
                    name: 'CivilizationType',
                    value: this.from.civilizationType,
                }).insertOrIgnore()],
            requirementSetRequirements: [new nodes_1.RequirementSetRequirementNode({
                    requirementSetId,
                    requirementId,
                }).insertOrIgnore()],
            unlockRequirements: [new nodes_1.UnlockRequirementNode({
                    unlockType,
                    requirementSetId,
                    description: (0, utils_1.locale)(`UNLOCK_${this.from.civilizationType}_${this.to.civilizationType}`, 'description'),
                    tooltip: (0, utils_1.locale)(`UNLOCK_${this.from.civilizationType}_${this.to.civilizationType}`, 'tooltip'),
                }).insertOrIgnore()],
            unlockConfigurationValues: [new nodes_1.UnlockConfigurationValueNode({
                    unlockType,
                    configurationValue: this.to.civilizationType
                }).insertOrIgnore()]
        });
        return this;
    }
    build() {
        const name = `${(0, utils_1.trim)(this.from.civilizationType).replace('_', '-').toLocaleLowerCase()}-${this.to.civilizationType.replace('CIVILIZATION_', '').replace('_', '-').toLocaleLowerCase()}`;
        const path = `/unlocks/${name}/`;
        return [
            new files_1.XmlFile({
                path,
                name: `current.xml`,
                content: this._current.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
        ];
    }
}
exports.CivilizationUnlockBuilder = CivilizationUnlockBuilder;
//# sourceMappingURL=CivilizationUnlockBuilder.js.map
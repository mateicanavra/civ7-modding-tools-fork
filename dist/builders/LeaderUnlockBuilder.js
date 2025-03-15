"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderUnlockBuilder = void 0;
const lodash_1 = require("lodash");
const nodes_1 = require("../nodes");
const localizations_1 = require("../localizations");
const constants_1 = require("../constants");
const BaseBuilder_1 = require("./BaseBuilder");
const files_1 = require("../files");
const utils_1 = require("../utils");
class LeaderUnlockBuilder extends BaseBuilder_1.BaseBuilder {
    constructor(payload = {}) {
        super();
        this._current = new nodes_1.DatabaseNode();
        this._localizations = new nodes_1.DatabaseNode();
        this.leaderUnlock = {
            leaderType: 'LEADER_',
            type: 'CIVILIZATION_',
            ageType: constants_1.AGE.ANTIQUITY,
        };
        this.leaderCivilizationBias = {};
        this.localizations = [];
        this.fill(payload);
    }
    migrate() {
        this._localizations.fill({
            englishText: this.localizations.map(item => {
                return new localizations_1.LeaderUnlockLocalization(Object.assign({ prefix: `PLAY_AS_${(0, utils_1.trim)(this.leaderUnlock.leaderType)}_${(0, utils_1.trim)(this.leaderUnlock.type)}` }, item));
            }).flatMap(item => item.getNodes())
        });
        const unlockType = `UNLOCK_${this.leaderUnlock.type}`;
        const requirementSetId = `REQSET_LEADER_IS_${(0, utils_1.trim)(this.leaderUnlock.leaderType)}`;
        const requirementId = `REQ_LEADER_IS_${(0, utils_1.trim)(this.leaderUnlock.leaderType)}`;
        this._current.fill({
            kinds: [new nodes_1.KindNode({ kind: constants_1.KIND.UNLOCK }).insertOrIgnore()],
            types: [new nodes_1.TypeNode({ kind: constants_1.KIND.UNLOCK, type: unlockType }).insertOrIgnore()],
            unlocks: [new nodes_1.UnlockNode({ unlockType }).insertOrIgnore()],
            unlockRewards: [new nodes_1.UnlockRewardNode({
                    unlockType,
                    civUnlock: true,
                    name: (0, utils_1.locale)(this.leaderUnlock.type, 'name'),
                    description: (0, utils_1.locale)(this.leaderUnlock.type, 'description'),
                    icon: this.leaderUnlock.type,
                }).insertOrIgnore()],
            unlockRequirements: [new nodes_1.UnlockRequirementNode({
                    unlockType,
                    requirementSetId,
                    description: (0, utils_1.locale)(`UNLOCK_PLAY_AS_${(0, utils_1.trim)(this.leaderUnlock.leaderType)}_${(0, utils_1.trim)(this.leaderUnlock.type)}`, 'description'),
                    tooltip: (0, utils_1.locale)(`UNLOCK_PLAY_AS_${(0, utils_1.trim)(this.leaderUnlock.leaderType)}_${(0, utils_1.trim)(this.leaderUnlock.type)}`, 'tooltip'),
                }).insertOrIgnore()],
            unlockConfigurationValues: [new nodes_1.UnlockConfigurationValueNode({
                    unlockType,
                    configurationValue: this.leaderUnlock.type
                }).insertOrIgnore()],
            requirementSets: [new nodes_1.RequirementSetNode({
                    requirementSetId,
                    requirementSetType: constants_1.REQUIREMENT_SET.TEST_ALL,
                }).insertOrIgnore()],
            requirementSetRequirements: [new nodes_1.RequirementSetRequirementNode({
                    requirementSetId,
                    requirementId,
                }).insertOrIgnore()],
            requirements: [new nodes_1.RequirementNode({
                    requirementId,
                    requirementType: constants_1.REQUIREMENT.PLAYER_LEADER_TYPE_MATCHES,
                }).insertOrIgnore()],
            requirementArguments: [new nodes_1.RequirementArgumentNode({
                    requirementId,
                    name: 'LeaderType',
                    value: this.leaderUnlock.leaderType
                }).insertOrIgnore()]
        });
        return this;
    }
    build() {
        const name = `${(0, lodash_1.kebabCase)((0, utils_1.trim)(this.leaderUnlock.leaderType))}-${(0, lodash_1.kebabCase)((0, utils_1.trim)(this.leaderUnlock.type))}`;
        const path = `/unlocks/${name}/`;
        return [
            new files_1.XmlFile({
                path,
                name: 'always.xml',
                content: this._current.toXmlElement(),
                actionGroups: [this.actionGroupBundle.always],
                actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new files_1.XmlFile({
                path,
                name: 'localization.xml',
                content: this._localizations.toXmlElement(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.always],
                actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_TEXT]
            }),
        ];
    }
}
exports.LeaderUnlockBuilder = LeaderUnlockBuilder;
//# sourceMappingURL=LeaderUnlockBuilder.js.map
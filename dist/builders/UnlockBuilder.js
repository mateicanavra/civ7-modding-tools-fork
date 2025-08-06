"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockBuilder = void 0;
const lodash_1 = require("lodash");
const nodes_1 = require("../nodes");
const constants_1 = require("../constants");
const BaseBuilder_1 = require("./BaseBuilder");
const files_1 = require("../files");
const utils_1 = require("../utils");
class UnlockBuilder extends BaseBuilder_1.BaseBuilder {
    constructor(payload = {}) {
        super();
        this._database = new nodes_1.DatabaseNode();
        this._localizations = new nodes_1.DatabaseNode();
        this.actionGroups = [];
        this.unlockConfigurationValue = {
            configurationValue: 'CIVILIZATION_'
        };
        this.unlockReward = {};
        this.requirementSet = {
            requirementSetType: constants_1.REQUIREMENT_SET.TEST_ALL,
        };
        this.localizations = [];
        this.fill(payload);
    }
    migrate() {
        var _a;
        if (this.actionGroups.length === 0) {
            this.actionGroups = [this.actionGroupBundle.always];
        }
        if (!this.unlockConfigurationValue.unlockType) {
            this.unlockConfigurationValue.unlockType = `UNLOCK_${this.unlockConfigurationValue.configurationValue}`;
        }
        this._database.fill({
            kinds: [new nodes_1.KindNode({ kind: constants_1.KIND.UNLOCK }).insertOrIgnore()],
            types: [new nodes_1.TypeNode({ kind: constants_1.KIND.UNLOCK, type: this.unlockConfigurationValue.unlockType }).insertOrIgnore()],
            unlocks: [new nodes_1.UnlockNode({ unlockType: this.unlockConfigurationValue.unlockType }).insertOrIgnore()],
            unlockRewards: [new nodes_1.UnlockRewardNode(Object.assign(Object.assign({ name: (0, utils_1.locale)(this.unlockConfigurationValue.configurationValue, 'name'), description: (0, utils_1.locale)(this.unlockConfigurationValue.configurationValue, 'description'), icon: this.unlockConfigurationValue.configurationValue }, this.unlockConfigurationValue), this.unlockReward)).insertOrIgnore()],
            unlockConfigurationValues: [new nodes_1.UnlockConfigurationValueNode(Object.assign({}, this.unlockConfigurationValue)).insertOrIgnore()],
        });
        const requirementSet = new nodes_1.RequirementSetNode(this.requirementSet).insertOrIgnore();
        this._database.requirementSets.push(requirementSet);
        (_a = this.requirementSet.requirements) === null || _a === void 0 ? void 0 : _a.forEach(req => {
            var _a;
            const requirement = new nodes_1.RequirementNode(req).insertOrIgnore();
            this._database.requirements.push(requirement);
            this._database.requirementSetRequirements.push(new nodes_1.RequirementSetRequirementNode(Object.assign(Object.assign({}, requirementSet), requirement)).insertOrIgnore());
            this._database.unlockRequirements.push(new nodes_1.UnlockRequirementNode(Object.assign(Object.assign(Object.assign({}, requirementSet), this.unlockConfigurationValue), { description: (0, utils_1.locale)(this.unlockConfigurationValue.unlockType, 'description'), tooltip: (0, utils_1.locale)(this.unlockConfigurationValue.unlockType, 'tooltip'), narrativeText: (0, utils_1.locale)(this.unlockConfigurationValue.unlockType, 'narrative') })).insertOrIgnore());
            (_a = req.requirementArguments) === null || _a === void 0 ? void 0 : _a.forEach(arg => {
                this._database.requirementArguments.push(new nodes_1.RequirementArgumentNode(Object.assign(Object.assign({}, requirement), arg)).insertOrIgnore());
            });
        });
        // this._localizations.fill({
        //     englishText: this.localizations.map(item => {
        //         return new LeaderUnlockLocalization({
        //             prefix: `PLAY_AS_${trim(this.leaderUnlock.leaderType)}_${trim(this.leaderUnlock.type)}`,
        //             ...item
        //         });
        //     }).flatMap(item => item.getNodes())
        // });
        return this;
    }
    build() {
        const name = `${(0, lodash_1.kebabCase)((0, utils_1.trim)(this.unlockConfigurationValue.configurationValue))}`;
        const path = `/unlocks/${name}/`;
        return [
            new files_1.XmlFile({
                path,
                name: 'unlock.xml',
                content: this._database.toXmlElement(),
                actionGroups: this.actionGroups,
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
exports.UnlockBuilder = UnlockBuilder;
//# sourceMappingURL=UnlockBuilder.js.map
import { ACTION_GROUP_BUNDLE, AGE, CivilizationBuilder, REQUIREMENT, REQUIREMENT_SET, RESOURCE, UnlockBuilder } from "@civ7/sdk";
import { Mod } from "@civ7/sdk";

const mod = new Mod({ id: 'mod-test', version: '1' });
const civilization = new CivilizationBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  civilization: { domain: 'AntiquityAgeCivilizations', civilizationType: 'CIVILIZATION_GONDOR' }
});

const civilizationUnlock = new UnlockBuilder({
    unlockConfigurationValue: {
        configurationValue: civilization.civilization.civilizationType
    },
    requirementSet: {
        requirementSetType: REQUIREMENT_SET.TEST_ALL,
        requirements: [{
            requirementType: REQUIREMENT.PLAYER_TOTAL_IMPROVED_RESOURCES,
            requirementArguments: [
                { name: 'Amount', value: 3 },
                { name: 'ResourceType', value: RESOURCE.IRON }
            ]
        }]
    }
});

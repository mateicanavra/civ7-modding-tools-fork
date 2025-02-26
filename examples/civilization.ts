import { ACTION_GROUP_BUNDLE, CivilizationBuilder, Mod, TAG_TRAIT } from "./src";

let mod = new Mod({
    id: 'mod-test',
    version: '1',
});

const civilization = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        domain: 'AntiquityAgeCivilizations',
        civilizationType: 'CIVILIZATION_GONDOR'
    },
    civilizationTags: [TAG_TRAIT.CULTURAL, TAG_TRAIT.ECONOMIC],
    icon: {
        path: `fs://game/${mod.id}/civ_sym_gondor`
    },
    localizations: [
        { name: 'Custom civilization', description: 'test description', fullName: 'test full name', adjective: 'test adjective' }
    ]
})


mod = mod.add([
    civilization,
]);

mod.build('./dist');

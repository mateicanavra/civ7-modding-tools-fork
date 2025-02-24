import { Criteria } from "../classes";
import { AGES } from "./AGES";
import { CriteriaBundle } from "../classes/CriteriaBundle";

const always = new Criteria({ id: 'always' })
const ageAntiquity = new Criteria({ id: 'age-antiquity' })
const ageExploration = new Criteria({ id: 'age-exploration' })
const ageModern = new Criteria({ id: 'age-modern' })
const ageAntiquityExist = new Criteria({
    id: 'age-antiquity-exist',
    isAny: true,
    ages: Object.values(AGES)
});
const ageExplorationExist = new Criteria({
    id: 'age-exploration-exist',
    isAny: true,
    ages: [AGES.AGE_EXPLORATION, AGES.AGE_MODERN]
});

export const CRITERIA_BUNDLES: Record<keyof typeof AGES, CriteriaBundle> = {
    [AGES.AGE_ANTIQUITY]: new CriteriaBundle({
        always: always,
        current: ageAntiquity,
        exist: ageAntiquityExist,
    }),
    [AGES.AGE_EXPLORATION]: new CriteriaBundle({
        always: always,
        current: ageExploration,
        exist: ageExplorationExist
    }),
    [AGES.AGE_MODERN]: new CriteriaBundle({
        always: always,
        current: ageModern,
        exist: ageModern
    })
} as const;

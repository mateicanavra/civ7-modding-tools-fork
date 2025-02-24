import { Criteria } from "../classes";
import { AGES } from "./AGES";
import { TCriteriasBundle } from "../types";

const always = new Criteria({ id: 'always' })
const ageAntiquity = new Criteria({ id: 'age-antiquity' })
const ageExploration = new Criteria({ id: 'age-exploration' })
const ageModern = new Criteria({ id: 'age-modern' })
const ageAntiquityExist = new Criteria({
    id: 'antiquity-age',
    isAny: true,
    ages: Object.values(AGES)
});
const ageExplorationExist = new Criteria({
    id: 'antiquity-exploration',
    isAny: true,
    ages: [AGES.AGE_EXPLORATION, AGES.AGE_MODERN]
});

export const CRITERIAS: Record<keyof typeof AGES, TCriteriasBundle> = {
    [AGES.AGE_ANTIQUITY]: {
        ALWAYS: always,
        CURRENT: ageAntiquity,
        EXIST: ageAntiquityExist,
    } as const,
    [AGES.AGE_EXPLORATION]: {
        ALWAYS: always,
        CURRENT: ageExploration,
        EXIST: ageExplorationExist
    } as const,
    [AGES.AGE_MODERN]: {
        ALWAYS: always,
        CURRENT: ageModern,
        EXIST: ageModern
    } as const
} as const;

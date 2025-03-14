export const trim = (string: string | null | undefined): string => {
    if (!string) {
        return '';
    }

    const prefixes = [
        'CIVILIZATION_',
        'LEADER_',
        'QUARTER_',
        'BUILDING_',
        'MODIFIER_',
        'WONDER_',
        'IMPROVEMENT_',
        'UNIT_',
        'TREE_',
        'TRADITION_',
        'CONSTRUCTIBLE_',
    ];
    for (const prefix of prefixes) {
        if (string.startsWith(prefix)) {
            return string.substring(prefix.length);
        }
    }

    return string;
}

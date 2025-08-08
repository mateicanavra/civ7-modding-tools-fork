export const trim = (string: string | null | undefined, prefix?: string): string => {
    if (!string) {
        return '';
    }

    if (prefix && string.startsWith(prefix)) {
        return string.substring(prefix.length);
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
        'UNLOCK_',
    ];
    for (const prefix of prefixes) {
        if (string.startsWith(prefix)) {
            return string.substring(prefix.length);
        }
    }

    return string;
}

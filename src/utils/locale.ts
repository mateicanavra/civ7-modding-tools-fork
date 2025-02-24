export const locale = (prefix: string, variables: string[]): Record<string, string> => {
    return variables.reduce((prev, current) => {
        return {
            ...prev,
            [current]: `LOC_${prefix}_${current.toLocaleUpperCase()}`
        }
    }, {});
}
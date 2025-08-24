import * as lodash from 'lodash-es';

export const locale = (prefix: string | null | undefined, variable: string): string => {
    return `LOC_${prefix || ''}_${lodash.snakeCase(variable).toLocaleUpperCase()}`;
}

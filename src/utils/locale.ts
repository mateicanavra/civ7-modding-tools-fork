import * as lodash from 'lodash';

export const locale = (prefix: string, variable: string): string => {
    return `LOC_${prefix}_${lodash.snakeCase(variable).toLocaleUpperCase()}`;
}
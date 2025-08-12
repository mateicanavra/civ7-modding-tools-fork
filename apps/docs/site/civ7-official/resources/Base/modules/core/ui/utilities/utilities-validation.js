/**
 * @file utilities-validation.ts
 * @copyright 2023, Firaxis Games
 * @description Simple functions for validating data. We likely don't need many validation utilities, but if we find this growing large we should consider moving to a library.
 */
/**
 * number returns a validated number based on the provided parameters.
 *
 * Useful for parsing numbers stored in strings, such as attributes.
 *
 * @example
 * ```ts
 * const index = Validation.number({ value: element.getAttribute('index'), min: 0, max: 10, defaultValue: 0 });
 * ```
 */
export const number = ({ value, min, max, defaultValue = 0 }) => {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    value = typeof value === 'number' ? value : parseInt(value);
    if (typeof value === 'string') {
        value = parseInt(value);
    }
    if (isNaN(value)) {
        value = defaultValue;
    }
    if (min !== undefined) {
        value = Math.max(min, value);
    }
    if (max !== undefined) {
        value = Math.min(max, value);
    }
    return value;
};

//# sourceMappingURL=file:///core/ui/utilities/utilities-validation.js.map

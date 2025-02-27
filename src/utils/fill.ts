export function fill<T>(payload: Partial<T> = {}) {
    for (const [key, value] of Object.entries(payload)) {
        if (this.hasOwnProperty(key)) {
            this[key] = value;
        }
    }
    return this;
}

export class BaseBuilder<T extends Object = object> {
    constructor(payload: Partial<T> = {}) {
        this.fill(payload);
    }

    fill(payload: Partial<T> = {}) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
        return this;
    }

    // this should return files
    build(): any {

    }
}
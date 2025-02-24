import { XmlElement } from "jstoxml";

import { XmlFile } from "./XmlFile";

export class Base<T extends Object> {
    fill(payload?: Partial<T>) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
        return this;
    }

    toXmlElement(): XmlElement | XmlElement[] {
        return [];
    }

    clone(): this {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }

    build(): XmlFile[] {
        return [];
    }
}
import { XmlElement } from "jstoxml";

import { XmlFile } from "./XmlFile";

export class Base<T extends Object> {
    fill(payload?: Partial<T>) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
    }

    toXmlElement(): XmlElement | XmlElement[] {
        return [];
    }

    build(): XmlFile[] {
        return [];
    }
}
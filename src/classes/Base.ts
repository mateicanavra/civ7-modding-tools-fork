import { toXML, XmlElement } from "jstoxml";
import { XMLFile } from "./XMLFile";

export class Base<T extends Object> {
    fill(payload?: Partial<T>) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
    }

    build(): XMLFile[] {
        return [];
    }
}
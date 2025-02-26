import { XmlElement } from "jstoxml";
import * as lodash from "lodash";


export class BaseNode<T extends Object = object> {
    _name: string = 'Row';

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

    private getAttributes(){
        const result: Record<string, string | number> = {};
        Object.keys(this)
            .filter(key => !key.startsWith('_'))
            .forEach(key => {
                if(this[key] === null || this[key] === undefined){
                    return;
                }
                if(typeof this[key] === 'boolean'){
                    result[key] = this[key] ? 'true' : 'false';
                    return;
                }
                let nodeAttributeName = lodash.startCase(key).replace(/ /g,"")
                result[nodeAttributeName] = this[key]
            });
        return result;
    }

    toXmlElement(): XmlElement | XmlElement[] {
        return {
            _name: this._name,
            _attrs: this.getAttributes(),
        };
    }
}
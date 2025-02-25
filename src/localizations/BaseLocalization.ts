import * as lodash from "lodash";

import { TObjectValues } from "../types";
import { LANGUAGE } from "../constants";
import { XmlElement } from "jstoxml";
import { locale } from "../utils";

export class BaseLocalization<T> {
    locale: TObjectValues<typeof LANGUAGE> = LANGUAGE.en_US;
    prefix = '';

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

    toXmlElement(): XmlElement | XmlElement[] {
        const keys = lodash.without(Object.keys(this), 'prefix', 'locale');

        const node = this.locale === LANGUAGE.en_US ? 'EnglishText' : 'LocalizedText';
        return {
            [node]: (keys as string[]).flatMap((key) => {
                if (Array.isArray(this[key])) {
                    return this[key].map((value, index) => ({
                        _name: 'Row',
                        _attrs: {
                            Tag: locale(this.prefix, `${key}${index}`),
                        },
                        _content: {
                            Text: value
                        }
                    }))
                }
                return {
                    _name: 'Row',
                    _attrs: {
                        Tag: locale(this.prefix, key),
                    },
                    _content: {
                        Text: this[key]
                    }
                }
            })
        }
    }
}
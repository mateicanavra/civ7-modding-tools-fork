import * as lodash from "lodash-es";

import { TObjectValues } from "../types";
import { LANGUAGE } from "../constants";
import { locale } from "../utils";
import { EnglishTextNode } from "../nodes";

export class BaseLocalization<T> {
    locale?: TObjectValues<typeof LANGUAGE> | null = LANGUAGE.en_US;
    prefix?: string | null = null;

    constructor(payload: Partial<T> = {}) {
        this.fill(payload);
    }

    fill<T>(payload: Partial<T> = {}) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
        return this;
    }

    getNodes(): EnglishTextNode[] {
        const keys = lodash.without(Object.keys(this), 'prefix', 'locale');

        if (this.locale === LANGUAGE.en_US) {
            return (keys as string[]).flatMap((key) => {
                if (!this[key]) {
                    return null;
                }

                if (Array.isArray(this[key])) {
                    return this[key].map((value, index) => {
                        return new EnglishTextNode({
                            tag: locale(this.prefix || '', `${key}_${index + 1}`),
                            text: value
                        })
                    });
                }

                return new EnglishTextNode({
                    tag: locale(this.prefix || '', key),
                    text: this[key]
                });
            }).filter(item => !!item);
        }

        return [];
    }
}

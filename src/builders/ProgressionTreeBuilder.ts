import * as fs from "node:fs";

import { TClassProperties } from "../types";
import { ACTION_GROUP_ACTION } from "../constants";

import { BaseBuilder } from "./BaseBuilder";

type TProgressionTreeBuilder = TClassProperties<ProgressionTreeBuilder>

export class ProgressionTreeBuilder extends BaseBuilder<TProgressionTreeBuilder> {


    constructor(payload: Partial<TProgressionTreeBuilder> = {}) {
        super();
        this.fill(payload);
    }

    build() {

        return [

        ]
    }
}

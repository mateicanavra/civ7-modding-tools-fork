import { TClassProperties } from "../types";
import { BaseBuilder } from "./BaseBuilder";
import { Database } from "../nodes";


type TUnitBuilder = TClassProperties<UnitBuilder>

export class UnitBuilder extends BaseBuilder<TUnitBuilder> {
    game: Database | null = null;

    constructor(payload: Partial<TUnitBuilder> = {}) {
        super();
        this.fill(payload);
    }
}

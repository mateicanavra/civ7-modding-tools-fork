import { BaseNode } from "../BaseNode";
import { CivilizationNode } from "../CivilizationNode";

export type TShellCivilizationNodeSlice = Pick<ShellCivilizationNodeSlice,
    "domain" |
    "civilizationType" |
    "civilizationName" |
    "civilizationFullName" |
    "civilizationDescription" |
    "civilizationIcon"
>;

export class ShellCivilizationNodeSlice extends BaseNode<TShellCivilizationNodeSlice> {
    domain: string = '';
    civilizationType: string = '';
    civilizationName: string = '';
    civilizationFullName: string = '';
    civilizationDescription: string = '';
    civilizationIcon: string = '';

    constructor(payload: Partial<TShellCivilizationNodeSlice> = {}) {
        super();
        this.fill(payload);
    }

    static from(civilization: CivilizationNode) {
        return new ShellCivilizationNodeSlice({
            ...civilization,
            civilizationIcon: civilization.civilizationType,
            civilizationName: civilization.name,
            civilizationFullName: civilization.fullName,
            civilizationDescription: civilization.description
        })
    }
}

import { BaseNode } from "./BaseNode";
import { CivilizationNode } from "./CivilizationNode";

export type TShellCivilizationNode = Pick<ShellCivilizationNode,
    "domain" |
    "civilizationType" |
    "civilizationName" |
    "civilizationFullName" |
    "civilizationDescription" |
    "civilizationIcon"
>;

export class ShellCivilizationNode extends BaseNode<TShellCivilizationNode> {
    domain: string = '';
    civilizationType: string = '';
    civilizationName: string = '';
    civilizationFullName: string = '';
    civilizationDescription: string = '';
    civilizationIcon: string = '';

    constructor(payload: Partial<TShellCivilizationNode> = {}) {
        super();
        this.fill(payload);
    }

    static from(civilization: CivilizationNode) {
        return new ShellCivilizationNode({
            ...civilization,
            civilizationIcon: civilization.civilizationType,
            civilizationName: civilization.name,
            civilizationFullName: civilization.fullName,
            civilizationDescription: civilization.description
        })
    }
}
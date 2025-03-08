import { BaseNode } from "../BaseNode";
import { CivilizationNode } from "../CivilizationNode";
export type TShellCivilizationNodeSlice = Pick<ShellCivilizationNodeSlice, "domain" | "civilizationType" | "civilizationName" | "civilizationFullName" | "civilizationDescription" | "civilizationIcon">;
export declare class ShellCivilizationNodeSlice extends BaseNode<TShellCivilizationNodeSlice> {
    domain: string | null;
    civilizationType: string | null;
    civilizationName: string | null;
    civilizationFullName: string | null;
    civilizationDescription: string | null;
    civilizationIcon: string | null;
    constructor(payload?: Partial<TShellCivilizationNodeSlice>);
    static from(civilization: CivilizationNode): ShellCivilizationNodeSlice;
}

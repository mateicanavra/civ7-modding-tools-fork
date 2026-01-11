import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

const implementations = {} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

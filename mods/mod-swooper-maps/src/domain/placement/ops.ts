import { createDomain } from "@swooper/mapgen-core/authoring";

import domain from "./index.js";
import implementations from "./ops/index.js";

export default createDomain(domain, implementations);

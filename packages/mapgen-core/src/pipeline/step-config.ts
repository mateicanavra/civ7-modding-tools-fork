import { Type } from "typebox";

export const EmptyStepConfigSchema = Type.Object(
  {},
  { additionalProperties: false, default: {} }
);

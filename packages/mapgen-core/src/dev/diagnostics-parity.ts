import type { DevLogConfig } from "./flags.js";
import type { FoundationDiagnosticsConfig } from "../config/index.js";

type KnownKeys<T> = {
  [K in keyof T]: string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K;
}[keyof T];

type DevKeys = KnownKeys<DevLogConfig>;
type SchemaKeys = KnownKeys<FoundationDiagnosticsConfig>;

type MissingInDev = Exclude<SchemaKeys, DevKeys>;
type MissingInSchema = Exclude<DevKeys, SchemaKeys>;

type Assert<T extends true> = T;

type _AssertNoMissingInDev = Assert<MissingInDev extends never ? true : false>;
type _AssertNoMissingInSchema = Assert<MissingInSchema extends never ? true : false>;


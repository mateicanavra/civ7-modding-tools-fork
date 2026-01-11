import type { Static, TSchema, DomainOp, StrategySelection } from "@swooper/mapgen-core/authoring";
import type { NormalizeContext } from "@swooper/mapgen-core/engine";
import type { CompileErrorItem } from "@swooper/mapgen-core/compiler/recipe-compile";
import { normalizeStrict } from "@swooper/mapgen-core/compiler/normalize";

const DEFAULT_NORMALIZE_CTX: NormalizeContext = { env: {}, knobs: {} };

export class TestCompileError extends Error {
  readonly errors: CompileErrorItem[];

  constructor(message: string, errors: CompileErrorItem[]) {
    const details = errors.map((err) => `${err.code} ${err.path}: ${err.message}`).join("\n");
    super(`${message}\n${details}`);
    this.name = "TestCompileError";
    this.errors = errors;
  }
}

export function normalizeStrictOrThrow<TSchemaT extends TSchema>(
  schema: TSchemaT,
  rawValue: unknown,
  path: string
): Static<TSchemaT> {
  const { value, errors } = normalizeStrict<Static<TSchemaT>>(schema, rawValue, path);
  if (errors.length > 0) throw new TestCompileError(`normalizeStrict failed at ${path}`, errors);
  return value;
}

export function normalizeOpSelectionOrThrow<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends Record<string, { config: TSchema }>,
>(
  op: DomainOp<InputSchema, OutputSchema, Strategies>,
  rawSelection: unknown,
  options?: Readonly<{ path?: string; ctx?: NormalizeContext }>
): StrategySelection<Strategies> {
  const path = options?.path ?? `/ops/${op.id}`;
  const ctx = options?.ctx ?? DEFAULT_NORMALIZE_CTX;

  const first = normalizeStrict<StrategySelection<Strategies>>(op.config, rawSelection, path);
  if (first.errors.length > 0) {
    throw new TestCompileError(`normalizeStrict(op.config) failed at ${path}`, first.errors);
  }

  const normalizedByStrategy = op.normalize(first.value, ctx);
  const second = normalizeStrict<StrategySelection<Strategies>>(op.config, normalizedByStrategy, path);
  if (second.errors.length > 0) {
    throw new TestCompileError(`post-normalize revalidation failed at ${path}`, second.errors);
  }

  return second.value;
}

export function runOpValidated<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends Record<string, { config: TSchema }>,
>(
  op: DomainOp<InputSchema, OutputSchema, Strategies>,
  input: Static<InputSchema>,
  rawSelection: unknown,
  options?: Readonly<{ path?: string; ctx?: NormalizeContext }>
): Static<OutputSchema> {
  const selection = normalizeOpSelectionOrThrow(op, rawSelection, options);
  return op.run(input, selection);
}


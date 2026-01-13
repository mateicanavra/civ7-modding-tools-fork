import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

import type {
  ArtifactContract,
  ArtifactReadValueOf,
  ArtifactValueOf,
} from "./contract.js";

export class ArtifactMissingError extends Error {
  public readonly artifactId: string;
  public readonly artifactName: string;
  public readonly consumerStepId: string;

  constructor(args: { artifactId: string; artifactName: string; consumerStepId: string }) {
    super(
      `Missing artifact ${args.artifactId} (${args.artifactName}) required by step ${args.consumerStepId}`
    );
    this.name = "ArtifactMissingError";
    this.artifactId = args.artifactId;
    this.artifactName = args.artifactName;
    this.consumerStepId = args.consumerStepId;
  }
}

export class ArtifactDoublePublishError extends Error {
  public readonly artifactId: string;
  public readonly artifactName: string;
  public readonly producerStepId: string;

  constructor(args: { artifactId: string; artifactName: string; producerStepId: string }) {
    super(
      `Artifact ${args.artifactId} (${args.artifactName}) is already published; write-once violated by step ${args.producerStepId}`
    );
    this.name = "ArtifactDoublePublishError";
    this.artifactId = args.artifactId;
    this.artifactName = args.artifactName;
    this.producerStepId = args.producerStepId;
  }
}

export class ArtifactValidationError extends Error {
  public readonly artifactId: string;
  public readonly artifactName: string;
  public readonly producerStepId: string;
  public readonly issues: readonly { message: string }[];
  public readonly cause?: unknown;

  constructor(args: {
    artifactId: string;
    artifactName: string;
    producerStepId: string;
    issues: readonly { message: string }[];
    cause?: unknown;
  }) {
    super(
      `Artifact ${args.artifactId} (${args.artifactName}) rejected by validation in step ${args.producerStepId}`
    );
    this.name = "ArtifactValidationError";
    this.artifactId = args.artifactId;
    this.artifactName = args.artifactName;
    this.producerStepId = args.producerStepId;
    this.issues = args.issues;
    this.cause = args.cause;
  }
}

type ArtifactsByName<T extends readonly ArtifactContract[]> = {
  [Name in T[number]["name"] & string]: Extract<T[number], { name: Name }>;
};

export type RequiredArtifactRuntime<
  C extends ArtifactContract,
  TContext extends ExtendedMapContext,
> = Readonly<{
  contract: C;
  /**
   * Read an artifact as a readonly view.
   *
   * IMPORTANT:
   * - This does not perform runtime snapshotting/copying in production.
   * - Consumers must treat the returned value as immutable and must not mutate it.
   * - If mutation is needed, callers must copy first (caller-owned copy).
   */
  read: (context: TContext) => ArtifactReadValueOf<C>;
  tryRead: (context: TContext) => ArtifactReadValueOf<C> | null;
}>;

export type ProvidedArtifactRuntime<
  C extends ArtifactContract,
  TContext extends ExtendedMapContext,
> = RequiredArtifactRuntime<C, TContext> &
  Readonly<{
    /**
     * Publish an artifact (write-once).
     *
     * IMPORTANT:
     * - Publishing stores the provided value reference (no deep freeze, no snapshotting in prod).
     * - Producers should treat published values as immutable once stored.
     */
    publish: (context: TContext, value: ArtifactValueOf<C>) => ArtifactReadValueOf<C>;
    satisfies: DependencyTagDefinition<TContext>["satisfies"];
  }>;

export type ArtifactRuntimeImpl<C extends ArtifactContract, TContext extends ExtendedMapContext> =
  Readonly<{
    validate?: (value: ArtifactValueOf<C>, context: TContext) => readonly { message: string }[];
    satisfies?: DependencyTagDefinition<TContext>["satisfies"];
  }>;

function resolveStepId(context: ExtendedMapContext): string {
  const trace = context.trace as { stepId?: string } | null | undefined;
  return trace?.stepId ?? "unknown";
}

function assertUniqueContracts(provides: readonly ArtifactContract[]): void {
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const contract of provides) {
    if (names.has(contract.name)) {
      throw new Error(`duplicate artifact name "${contract.name}" in provides list`);
    }
    if (ids.has(contract.id)) {
      throw new Error(`duplicate artifact id "${contract.id}" in provides list`);
    }
    names.add(contract.name);
    ids.add(contract.id);
  }
}

function readStored<C extends ArtifactContract>(context: ExtendedMapContext, contract: C): {
  hasValue: boolean;
  value: ArtifactValueOf<C> | undefined;
} {
  const hasValue = context.artifacts.has(contract.id);
  const value = hasValue ? (context.artifacts.get(contract.id) as ArtifactValueOf<C>) : undefined;
  return { hasValue, value };
}

function buildDefaultSatisfies<C extends ArtifactContract, TContext extends ExtendedMapContext>(
  contract: C,
  impl: ArtifactRuntimeImpl<C, TContext>
): DependencyTagDefinition<TContext>["satisfies"] {
  return (context: TContext) => {
    const { hasValue, value } = readStored(context, contract);
    if (!hasValue) return false;
    if (!impl.validate) return true;
    try {
      const issues = impl.validate(value as ArtifactValueOf<C>, context) ?? [];
      return issues.length === 0;
    } catch {
      return false;
    }
  };
}

function normalizeIssues(error: unknown): readonly { message: string }[] {
  if (error instanceof Error) {
    return [{ message: error.message }];
  }
  return [{ message: String(error) }];
}

export function implementArtifacts<
  TContext extends ExtendedMapContext,
  const Provides extends readonly ArtifactContract[],
>(
  provides: Provides,
  impl: {
    [K in keyof ArtifactsByName<Provides> & string]: ArtifactRuntimeImpl<
      ArtifactsByName<Provides>[K],
      TContext
    >;
  }
): {
  [K in keyof ArtifactsByName<Provides> & string]: ProvidedArtifactRuntime<
    ArtifactsByName<Provides>[K],
    TContext
  >;
} {
  assertUniqueContracts(provides);

  const runtimes = {} as {
    [K in keyof ArtifactsByName<Provides> & string]: ProvidedArtifactRuntime<
      ArtifactsByName<Provides>[K],
      TContext
    >;
  };

  for (const contract of provides) {
    const runtimeImpl = impl[contract.name as keyof ArtifactsByName<Provides>] as ArtifactRuntimeImpl<
      typeof contract,
      TContext
    >;
    const satisfies = runtimeImpl.satisfies ?? buildDefaultSatisfies(contract, runtimeImpl);

    (runtimes as any)[contract.name as keyof ArtifactsByName<Provides>] = {
      contract,
      read: (context) => {
        const { hasValue, value } = readStored(context, contract);
        if (!hasValue) {
          throw new ArtifactMissingError({
            artifactId: contract.id,
            artifactName: contract.name,
            consumerStepId: resolveStepId(context),
          });
        }
        return value as ArtifactReadValueOf<typeof contract>;
      },
      tryRead: (context) => {
        const { hasValue, value } = readStored(context, contract);
        return hasValue ? (value as ArtifactReadValueOf<typeof contract>) : null;
      },
      publish: (context, value) => {
        if (context.artifacts.has(contract.id)) {
          throw new ArtifactDoublePublishError({
            artifactId: contract.id,
            artifactName: contract.name,
            producerStepId: resolveStepId(context),
          });
        }

        let issues: readonly { message: string }[] = [];
        let cause: unknown;
        if (runtimeImpl.validate) {
          try {
            issues = runtimeImpl.validate(value as ArtifactValueOf<typeof contract>, context) ?? [];
          } catch (error) {
            cause = error;
            issues = normalizeIssues(error);
          }
        }

        if (issues.length > 0) {
          throw new ArtifactValidationError({
            artifactId: contract.id,
            artifactName: contract.name,
            producerStepId: resolveStepId(context),
            issues,
            cause,
          });
        }

        context.artifacts.set(contract.id, value);
        return value as ArtifactReadValueOf<typeof contract>;
      },
      satisfies,
    } as ProvidedArtifactRuntime<typeof contract, TContext>;
  }

  return runtimes;
}

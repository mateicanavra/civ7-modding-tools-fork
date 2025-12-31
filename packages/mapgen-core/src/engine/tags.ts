import type { EngineContext, GenerationPhase } from "@mapgen/engine/types.js";
import {
  DuplicateDependencyTagError,
  InvalidDependencyTagDemoError,
  InvalidDependencyTagError,
  UnknownDependencyTagError,
} from "@mapgen/engine/errors.js";

export type DependencyTagKind = "artifact" | "field" | "effect";

type SatisfactionState = {
  satisfied: ReadonlySet<string>;
};

export interface TagOwner {
  pkg: string;
  phase: GenerationPhase;
  stepId?: string;
}

export interface DependencyTagDefinition<TContext = EngineContext> {
  id: string;
  kind: DependencyTagKind;
  owner?: TagOwner;
  satisfies?: (context: TContext, state: SatisfactionState) => boolean;
  demo?: unknown;
  validateDemo?: (demo: unknown) => boolean;
}

export class TagRegistry<TContext = EngineContext> {
  private readonly tags = new Map<string, DependencyTagDefinition<TContext>>();

  registerTag(definition: DependencyTagDefinition<TContext>): void {
    if (this.tags.has(definition.id)) {
      throw new DuplicateDependencyTagError(definition.id);
    }
    if (!isTagKindCompatible(definition.id, definition.kind)) {
      throw new InvalidDependencyTagError(definition.id);
    }
    if (definition.demo !== undefined) {
      if (!definition.validateDemo || !definition.validateDemo(definition.demo)) {
        throw new InvalidDependencyTagDemoError(definition.id);
      }
    }
    this.tags.set(definition.id, definition);
  }

  registerTags(definitions: readonly DependencyTagDefinition<TContext>[]): void {
    for (const definition of definitions) {
      this.registerTag(definition);
    }
  }

  get(tag: string): DependencyTagDefinition<TContext> {
    this.validateTag(tag);
    return this.tags.get(tag) as DependencyTagDefinition<TContext>;
  }

  has(tag: string): boolean {
    return this.tags.has(tag);
  }

  validateTag(tag: string): void {
    if (typeof tag !== "string" || tag.length === 0) {
      throw new InvalidDependencyTagError(String(tag));
    }
    if (!this.tags.has(tag)) {
      throw new UnknownDependencyTagError(tag);
    }
  }

  validateTags(tags: readonly string[]): void {
    for (const tag of tags) {
      this.validateTag(tag);
    }
  }
}

export function validateDependencyTag<TContext>(tag: string, registry: TagRegistry<TContext>): void {
  registry.validateTag(tag);
}

export function validateDependencyTags<TContext>(
  tags: readonly string[],
  registry: TagRegistry<TContext>
): void {
  registry.validateTags(tags);
}

export function isDependencyTagSatisfied<TContext>(
  tag: string,
  context: TContext,
  state: SatisfactionState,
  registry: TagRegistry<TContext>
): boolean {
  const definition = registry.get(tag);
  if (!state.satisfied.has(tag)) return false;
  if (definition.satisfies) return definition.satisfies(context, state);
  return true;
}

export function computeInitialSatisfiedTags<TContext>(_context: TContext): Set<string> {
  // Tags become satisfied only when explicitly provided.
  return new Set<string>();
}

function isTagKindCompatible(id: string, kind: DependencyTagKind): boolean {
  if (kind === "artifact") return id.startsWith("artifact:");
  if (kind === "field") return id.startsWith("field:");
  if (kind === "effect") return id.startsWith("effect:");
  return false;
}

export class StepRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StepRegistryError";
  }
}

export class DuplicateStepError extends StepRegistryError {
  constructor(stepId: string) {
    super(`Step "${stepId}" is already registered.`);
    this.name = "DuplicateStepError";
  }
}

export class UnknownStepError extends StepRegistryError {
  constructor(stepId: string) {
    super(`Unknown step "${stepId}".`);
    this.name = "UnknownStepError";
  }
}

export class DependencyTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DependencyTagError";
  }
}

export class InvalidDependencyTagError extends DependencyTagError {
  constructor(tag: string) {
    super(`Invalid dependency tag "${tag}".`);
    this.name = "InvalidDependencyTagError";
  }
}

export class UnknownDependencyTagError extends DependencyTagError {
  constructor(tag: string) {
    super(`Unknown dependency tag "${tag}".`);
    this.name = "UnknownDependencyTagError";
  }
}

export class DuplicateDependencyTagError extends DependencyTagError {
  constructor(tag: string) {
    super(`Dependency tag "${tag}" is already registered.`);
    this.name = "DuplicateDependencyTagError";
  }
}

export class InvalidDependencyTagDemoError extends DependencyTagError {
  constructor(tag: string) {
    super(`Invalid demo payload for dependency tag "${tag}".`);
    this.name = "InvalidDependencyTagDemoError";
  }
}

export class MissingDependencyError extends Error {
  readonly stepId: string;
  readonly missing: readonly string[];
  readonly satisfied: readonly string[];

  constructor(options: {
    stepId: string;
    missing: readonly string[];
    satisfied: readonly string[];
  }) {
    const missingList = options.missing.join(", ");
    super(`Missing dependency for "${options.stepId}": ${missingList}`);
    this.name = "MissingDependencyError";
    this.stepId = options.stepId;
    this.missing = options.missing;
    this.satisfied = options.satisfied;
  }
}

export class UnsatisfiedProvidesError extends Error {
  readonly stepId: string;
  readonly missingProvides: readonly string[];

  constructor(stepId: string, missingProvides: readonly string[]) {
    super(
      `Step "${stepId}" did not satisfy declared provides: ${missingProvides.join(", ")}`
    );
    this.name = "UnsatisfiedProvidesError";
    this.stepId = stepId;
    this.missingProvides = missingProvides;
  }
}

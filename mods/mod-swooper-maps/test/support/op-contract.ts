type RunValidated = (
  input: unknown,
  config: unknown,
  opts?: { validateOutput?: boolean }
) => unknown;

export type OpContract = {
  runValidated: RunValidated;
};

export function runOpValidatedWithOutput(
  op: OpContract,
  input: unknown,
  config: unknown
): unknown {
  return op.runValidated(input, config, { validateOutput: true });
}

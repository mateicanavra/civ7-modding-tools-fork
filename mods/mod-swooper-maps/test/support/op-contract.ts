type Run = (input: unknown, config: unknown) => unknown;

export type OpContract = {
  run: Run;
};

export function runOpWithOutput(op: OpContract, input: unknown, config: unknown): unknown {
  return op.run(input, config);
}

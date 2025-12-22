export interface RunnerInput {
  prompt: string;
  cwd: string;
  schemaPath?: string;
  logPath: string;
  stderrPath: string;
}

export interface RunnerOutput<T> {
  result: T;
  exitCode: number;
  rawEventsPath?: string;
}

export interface Runner {
  run<T>(input: RunnerInput): Promise<RunnerOutput<T>>;
}

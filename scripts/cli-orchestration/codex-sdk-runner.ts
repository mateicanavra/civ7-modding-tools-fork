import { createWriteStream, promises as fs } from "node:fs";
import { dirname } from "node:path";
import { Codex } from "@openai/codex-sdk";
import { buildAdditionalDirectories } from "./git-utils.js";
import type { Runner, RunnerInput, RunnerOutput } from "./runner.js";

async function loadSchema(schemaPath?: string): Promise<unknown | undefined> {
  if (!schemaPath) {
    return undefined;
  }
  const raw = await fs.readFile(schemaPath, "utf8");
  return JSON.parse(raw) as unknown;
}

async function ensureParentDir(path: string) {
  await fs.mkdir(dirname(path), { recursive: true });
}

export class CodexSdkRunner implements Runner {
  private codex: Codex;

  constructor() {
    this.codex = new Codex();
  }

  async run<T>(input: RunnerInput): Promise<RunnerOutput<T>> {
    await ensureParentDir(input.logPath);
    await ensureParentDir(input.stderrPath);

    const logStream = createWriteStream(input.logPath, { flags: "w" });
    let exitCode = 0;

    try {
      const additionalDirectories = await buildAdditionalDirectories(input.cwd);
      const thread = this.codex.startThread({
        workingDirectory: input.cwd,
        approvalPolicy: "never",
        sandboxMode: "workspace-write",
        networkAccessEnabled: true,
        additionalDirectories: additionalDirectories.length ? additionalDirectories : undefined,
      });

      const outputSchema = await loadSchema(input.schemaPath);
      const { events } = await thread.runStreamed(input.prompt, { outputSchema });

      let finalMessage: string | undefined;
      for await (const event of events) {
        const line = `${JSON.stringify(event)}\n`;
        logStream.write(line);
        process.stdout.write(line);
        if (event.type === "item.completed" && event.item.type === "agent_message") {
          finalMessage = event.item.text;
        }
      }

      logStream.end();

      if (!finalMessage) {
        throw new Error("Codex SDK did not return a final agent message.");
      }

      const result = JSON.parse(finalMessage) as T;
      return { result, exitCode, rawEventsPath: input.logPath };
    } catch (error) {
      exitCode = 1;
      logStream.end();
      const message = error instanceof Error ? error.message : String(error);
      await fs.writeFile(input.stderrPath, `${message}\n`, "utf8");
      throw error;
    }
  }
}

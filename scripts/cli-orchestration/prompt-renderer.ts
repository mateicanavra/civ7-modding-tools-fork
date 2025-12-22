import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface OrchContext {
  issueId: string;
  issueDocPath: string;
  milestoneId: string;
  milestoneDocPath: string;
  branchName: string;
  worktreePath: string;
  maxReviewCycles: number;
  reviewCycle: number;
  priorFixSummary?: string;
  reviewResult?: unknown;
}

const FRONT_MATTER_BOUNDARY = "---";

function stripFrontMatter(content: string): string {
  if (!content.startsWith(FRONT_MATTER_BOUNDARY)) {
    return content;
  }
  const endIndex = content.indexOf(`\n${FRONT_MATTER_BOUNDARY}`, FRONT_MATTER_BOUNDARY.length);
  if (endIndex === -1) {
    return content;
  }
  return content.slice(endIndex + FRONT_MATTER_BOUNDARY.length + 1);
}

function promptDir(): string {
  return process.env.CODEX_PROMPTS_DIR ?? join(homedir(), ".codex", "prompts");
}

export async function loadPromptTemplate(name: string): Promise<string> {
  const path = join(promptDir(), `${name}.md`);
  return fs.readFile(path, "utf8");
}

export async function renderPrompt(name: string, context: OrchContext): Promise<string> {
  const template = await loadPromptTemplate(name);
  const body = stripFrontMatter(template).trim();
  const contextBlock = `ORCH_CONTEXT:\n${JSON.stringify(context)}`;
  return `${contextBlock}\n\n${body}`;
}

import { describe, expect, it, mock } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deriveBranchName, issueWorktreePath } from "../worktree.js";

mock.module("@openai/codex-sdk", () => ({
  Codex: class {
    startThread() {
      return {
        runStreamed: async () => ({ events: [] }),
      };
    }
  },
}));

mock.module("yaml", () => ({
  parse: (raw: string) => {
    const result: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const separatorIndex = trimmed.indexOf(":");
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
      result[key] = value;
    }
    return result;
  },
}));

const { formatIssuePlan, planOrchestration } = await import("../orchestrator.js");

async function writeDoc(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function withTempRepo<T>(fn: (repoRoot: string) => Promise<T>) {
  const root = await mkdtemp(join(tmpdir(), "orch-dry-run-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function issueFrontMatter(id: string, title: string, project: string, milestone: string) {
  return [
    "---",
    `id: ${id}`,
    `title: "${title}"`,
    `project: ${project}`,
    `milestone: ${milestone}`,
    "---",
    "",
  ].join("\n");
}

describe("dry-run plan", () => {
  it("prints selected issues and avoids worktree lifecycle calls", async () => {
    await withTempRepo(async (repoRoot) => {
      const project = "cli-orchestration-v0";
      const milestone = "M1";
      const docsRoot = join(repoRoot, "docs", "projects", project);
      await writeDoc(
        join(docsRoot, "milestones", "M1-cli-orchestration-v0.md"),
        "# Milestone\n",
      );
      await writeDoc(
        join(docsRoot, "issues", "ISSUE-1.md"),
        issueFrontMatter("ISSUE-1", "First issue", project, milestone),
      );
      await writeDoc(
        join(docsRoot, "issues", "ISSUE-2.md"),
        issueFrontMatter("ISSUE-2", "Second issue", project, milestone),
      );

      let ensureCalls = 0;
      let removeCalls = 0;
      const plan = await planOrchestration(
        {
          repoRoot,
          logsRoot: join(repoRoot, "logs"),
          maxReviewCycles: 1,
          baseBranch: "main",
        },
        { milestoneId: milestone, projectId: project },
        {
          deriveBranchName,
          issueWorktreePath,
          ensureWorktree: () => {
            ensureCalls += 1;
          },
          removeWorktree: () => {
            removeCalls += 1;
          },
        },
      );

      const output = formatIssuePlan(plan);
      expect(plan.plan.map((entry) => entry.issue.id)).toEqual(["ISSUE-1", "ISSUE-2"]);
      expect(output).toContain("ISSUE-1");
      expect(output).toContain("ISSUE-2");
      expect(output).toContain(plan.plan[0].issue.path);
      expect(output).toContain(plan.plan[0].worktreePath);
      expect(ensureCalls).toBe(0);
      expect(removeCalls).toBe(0);
    });
  });
});

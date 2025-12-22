import { promises as fs } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { IssueDoc } from "./types.js";

const FRONT_MATTER_BOUNDARY = "---";

function extractFrontMatter(content: string): { frontMatter: unknown; body: string } {
  if (!content.startsWith(FRONT_MATTER_BOUNDARY)) {
    throw new Error("Missing front matter boundary.");
  }

  const endIndex = content.indexOf(`\n${FRONT_MATTER_BOUNDARY}`, FRONT_MATTER_BOUNDARY.length);
  if (endIndex === -1) {
    throw new Error("Unterminated front matter block.");
  }

  const raw = content.slice(FRONT_MATTER_BOUNDARY.length, endIndex).trim();
  const body = content.slice(endIndex + FRONT_MATTER_BOUNDARY.length + 1);
  return { frontMatter: parseYaml(raw), body };
}

function normalizeArray(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  return [String(value)];
}

async function findIssueDocs(root: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "issues") {
        const issueEntries = await fs.readdir(fullPath, { withFileTypes: true });
        for (const issueEntry of issueEntries) {
          if (issueEntry.isFile() && issueEntry.name.endsWith(".md")) {
            results.push(join(fullPath, issueEntry.name));
          }
        }
      } else {
        results.push(...(await findIssueDocs(fullPath)));
      }
    }
  }

  return results;
}

export async function loadIssuesByMilestone(repoRoot: string, milestoneId: string): Promise<IssueDoc[]> {
  const docsRoot = join(repoRoot, "docs", "projects");
  const issuePaths = await findIssueDocs(docsRoot);

  const issues: IssueDoc[] = [];
  for (const path of issuePaths) {
    const content = await fs.readFile(path, "utf8");
    const { frontMatter } = extractFrontMatter(content);
    const data = frontMatter as Record<string, unknown>;

    const issue: IssueDoc = {
      id: String(data.id ?? ""),
      title: String(data.title ?? ""),
      project: String(data.project ?? ""),
      milestone: data.milestone ? String(data.milestone) : undefined,
      blocked_by: normalizeArray(data.blocked_by),
      blocked: normalizeArray(data.blocked),
      path,
    };

    if (!issue.id || !issue.title || !issue.project) {
      continue;
    }

    if (issue.milestone === milestoneId) {
      issues.push(issue);
    }
  }

  return issues;
}

export function orderIssuesLinear(issues: IssueDoc[]): IssueDoc[] {
  return [...issues].sort((a, b) => a.id.localeCompare(b.id));
}

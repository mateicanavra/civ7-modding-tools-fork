import { promises as fs } from "node:fs";
import { basename, join, relative, sep } from "node:path";
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

async function findMilestoneDocs(root: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "milestones") {
        const milestoneEntries = await fs.readdir(fullPath, { withFileTypes: true });
        for (const milestoneEntry of milestoneEntries) {
          if (milestoneEntry.isFile() && milestoneEntry.name.endsWith(".md")) {
            results.push(join(fullPath, milestoneEntry.name));
          }
        }
      } else {
        results.push(...(await findMilestoneDocs(fullPath)));
      }
    }
  }

  return results;
}

function matchesMilestoneId(fileName: string, milestoneId: string): boolean {
  const base = fileName.replace(/\.md$/i, "");
  return base === milestoneId || base.startsWith(`${milestoneId}-`) || base.startsWith(`${milestoneId}_`);
}

export async function resolveMilestoneDoc(
  repoRoot: string,
  milestoneId: string,
  projectId?: string,
): Promise<{ id: string; path: string; project: string }> {
  const docsRoot = join(repoRoot, "docs", "projects");
  const searchRoot = projectId ? join(docsRoot, projectId) : docsRoot;
  let milestonePaths: string[];
  try {
    milestonePaths = await findMilestoneDocs(searchRoot);
  } catch (error) {
    if (projectId && error instanceof Error && "code" in error) {
      const errno = error as NodeJS.ErrnoException;
      if (errno.code === "ENOENT") {
        throw new Error(`Project ${projectId} not found under docs/projects.`);
      }
    }
    throw error;
  }
  const matches = milestonePaths.filter((path) => matchesMilestoneId(basename(path), milestoneId));

  if (matches.length === 0) {
    const scope = projectId ? ` in project ${projectId}` : "";
    throw new Error(`No milestone doc found for ${milestoneId}${scope}.`);
  }
  if (matches.length > 1) {
    const guidance = projectId ? "" : " Pass --project to disambiguate.";
    throw new Error(`Multiple milestone docs found for ${milestoneId}: ${matches.join(", ")}.${guidance}`);
  }

  const milestonePath = matches[0];
  const parts = relative(repoRoot, milestonePath).split(sep);
  if (parts.length < 5 || parts[0] !== "docs" || parts[1] !== "projects" || parts[3] !== "milestones") {
    throw new Error(`Milestone doc path ${milestonePath} is not under docs/projects/<project>/milestones.`);
  }

  if (projectId && parts[2] !== projectId) {
    throw new Error(`Milestone ${milestoneId} is under project ${parts[2]}, not ${projectId}.`);
  }

  return { id: milestoneId, path: milestonePath, project: parts[2] };
}

export async function loadIssuesByMilestone(
  repoRoot: string,
  milestoneId: string,
  projectId: string,
): Promise<IssueDoc[]> {
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

    if (issue.project !== projectId) {
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

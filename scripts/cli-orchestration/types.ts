export type Phase = "dev" | "review" | "fix";

export type DevStatus = "pass" | "failed" | "deferred";
export type ReviewStatus = "pass" | "changes_required" | "blocked";

export interface PhaseBase {
  phase: Phase;
  status: string;
  issueId: string;
  milestoneId: string;
  branch: string;
  worktreePath: string;
  summary: string;
}

export interface TestRun {
  command: string;
  status: "pass" | "fail" | "skipped";
  notes?: string;
}

export interface ReviewIssue {
  severity: "low" | "medium" | "high";
  title: string;
  details: string;
  evidence?: string;
}

export interface DevResult extends PhaseBase {
  phase: "dev" | "fix";
  status: DevStatus;
  testsRun?: TestRun[];
  docsUpdated?: string[];
  draftPrs?: string[];
  stackBranches?: string[];
  deferred?: string[];
  openQuestions?: string[];
}

export interface ReviewResult extends PhaseBase {
  phase: "review";
  status: ReviewStatus;
  issues?: ReviewIssue[];
  requiredActions?: string[];
  followups?: string[];
  reviewDocPath?: string;
  confidence?: "low" | "medium" | "high";
}

export interface IssueDoc {
  id: string;
  title: string;
  project: string;
  milestone?: string;
  blocked_by?: string[];
  blocked?: string[];
  path: string;
}

export interface MilestoneDoc {
  id: string;
  path: string;
}

export interface IssuePlan {
  issue: IssueDoc;
  branchName: string;
  worktreePath: string;
}

export interface OrchestratorConfig {
  repoRoot: string;
  logsRoot: string;
  maxReviewCycles: number;
}

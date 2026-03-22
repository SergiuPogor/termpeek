// ─── Core Types ────────────────────────────────────────────────────────────────

export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: Date;
  timestamp: number;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface Branch {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  lastCommitHash: string;
  lastCommitMessage: string;
  lastCommitDate: Date;
  upstream?: string;
  aheadBehind?: { ahead: number; behind: number };
  type: 'main' | 'develop' | 'feature' | 'bugfix' | 'release' | 'hotfix' | 'other';
}

export interface Author {
  name: string;
  email: string;
  commits: number;
  insertions: number;
  deletions: number;
  firstCommitDate: Date;
  lastCommitDate: Date;
}

export interface RepoStats {
  totalCommits: number;
  totalFiles: number;
  totalContributors: number;
  totalBranches: number;
  totalTags: number;
  lastCommitDate: Date | null;
  firstCommitDate: Date | null;
  activeDays: number;
  streakDays: number;
  longestStreak: number;
  description: string;
  language: string;
  license: string;
  openIssues: number;
  openPullRequests: number;
  readmeSize: number;
}

export interface LanguageStat {
  name: string;
  files: number;
  lines: number;
  percentage: number;
  color: string;
}

export interface ContributionDay {
  date: Date;
  count: number;
  insertions: number;
  deletions: number;
}

export interface WeekData {
  weekStart: Date;
  days: ContributionDay[];
  total: number;
}

export interface HeatmapData {
  weeks: WeekData[];
  totalContributions: number;
  longestStreak: number;
  currentStreak: number;
  peakDay: { date: Date; count: number };
  authorStats: Map<string, Author>;
}

export interface DiffStat {
  path: string;
  insertions: number;
  deletions: number;
  filesChanged: number;
}

export interface TimelinePoint {
  date: Date;
  weekNumber: number;
  author: string;
  commits: number;
  insertions: number;
  deletions: number;
}

export interface TimelineData {
  points: TimelinePoint[];
  authors: string[];
  weeklyTotals: Map<string, number>;
}

export type ThemeName = 'dark' | 'dracula' | 'monokai' | 'nord' | 'gruvbox' | 'catppuccin';

export type OutputFormat = 'svg' | 'json' | 'png';

export interface CardOptions {
  repoPath: string;
  theme: ThemeName;
  showSparkline: boolean;
  showLanguages: boolean;
  showContributors: boolean;
  width: number;
}

export interface HeatmapOptions {
  repoPath: string;
  theme: ThemeName;
  weeks: number;
  showAuthor: boolean;
  cellSize: number;
  cellGap: number;
}

export interface DonutOptions {
  repoPath: string;
  theme: ThemeName;
  width: number;
  height: number;
  innerRadius: number;
  outerRadius: number;
  showLegend: boolean;
}

export interface BadgeOptions {
  type: 'commits' | 'lines' | 'contributors' | 'branches' | 'languages' | 'last-commit';
  period?: 'week' | 'month' | 'year' | 'all';
  theme: ThemeName;
  label?: string;
  color?: string;
  prefix?: string;
  suffix?: string;
}

export interface BranchTreeOptions {
  repoPath: string;
  theme: ThemeName;
  maxDepth: number;
  showRemote: boolean;
  showMessages: boolean;
  width: number;
}

export interface Theme {
  name: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentAlt: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  heatmap: string[];
  languages: Record<string, string>;
  fonts: { mono: string; sans: string; emoji: string };
}

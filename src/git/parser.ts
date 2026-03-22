import { execSync, spawnSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve, join, extname, basename } from 'path';
import type {
  Commit,
  Branch,
  Author,
  RepoStats,
  LanguageStat,
  ContributionDay,
  WeekData,
  HeatmapData,
  TimelineData,
  TimelinePoint,
} from '../types.js';

// ─── Repo Validation ───────────────────────────────────────────────────────────

export function assertGitRepo(repoPath: string): void {
  const resolved = resolve(repoPath);
  if (!existsSync(resolved)) throw new Error(`Path does not exist: ${resolved}`);
  if (!existsSync(join(resolved, '.git'))) throw new Error(`Not a git repository: ${resolved}`);
}

export function isGitRepo(repoPath: string): boolean {
  return existsSync(resolve(repoPath, '.git'));
}

// ─── Commit Parsing ────────────────────────────────────────────────────────────

export function getCommits(repoPath: string, maxCount?: number): Commit[] {
  const limit = maxCount ? `-n${maxCount}` : '--all';
  const fmt = '%H|%h|%s|%an|%ae|%aI|%ct|%cD|%aD';
  let out: string;

  try {
    out = execSync(`git log ${limit} --format="${fmt}"`, {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 100 * 1024 * 1024,
      encoding: 'utf-8',
    });
  } catch {
    return [];
  }

  return out.trim().split('\n').filter(Boolean).map(line => {
    // Unwrap quoted format
    const unwrapped = line.replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
    const parts = unwrapped.split('|');
    if (parts.length < 9) return null;

    const [hash, shortHash, ...rest] = parts;
    const dateStr = rest.pop() ?? '';
    const timestamp = parseInt(rest.pop() ?? '0', 10);
    const authorEmail = rest.pop() ?? '';
    const author = rest.pop() ?? '';
    const message = rest.join('|');

    return {
      hash,
      shortHash,
      message: message.replace(/"/g, ''),
      author,
      authorEmail,
      date: new Date(dateStr),
      timestamp,
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
    } as Commit;
  }).filter(Boolean) as Commit[];
}

export function getCommitsSince(repoPath: string, sinceDate: Date): Commit[] {
  const fmt = '%H|%h|%s|%an|%ae|%aI|%ct|%cD|%aD';
  let out: string;
  try {
    out = execSync(
      `git log --since="${sinceDate.toISOString()}" --format="${fmt}"`,
      { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' }
    );
  } catch { return []; }

  return out.trim().split('\n').filter(Boolean).map(line => {
    const unwrapped = line.replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
    const parts = unwrapped.split('|');
    if (parts.length < 9) return null;
    const [hash, shortHash, message, author, authorEmail, isoDate, timestamp, ...rest] = parts;
    const dateStr = rest.pop() ?? '';
    return {
      hash,
      shortHash,
      message: message.replace(/"/g, ''),
      author,
      authorEmail,
      date: new Date(dateStr),
      timestamp: parseInt(timestamp, 10),
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
    } as Commit;
  }).filter(Boolean) as Commit[];
}

export function getCommitDiffStats(repoPath: string, hash: string): { filesChanged: number; insertions: number; deletions: number } {
  try {
    const out = execSync(`git show ${hash} --stat --pretty=""`, {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });
    const lines = out.trim().split('\n').filter(Boolean);
    let insertions = 0;
    let deletions = 0;
    let filesChanged = 0;
    for (const line of lines) {
      const m = line.match(/(\d+)\s+insertion/i);
      if (m) insertions = parseInt(m[1], 10);
      const d = line.match(/(\d+)\s+deletion/i);
      if (d) deletions = parseInt(d[1], 10);
      if (line.includes('|')) filesChanged++;
    }
    return { filesChanged, insertions, deletions };
  } catch { return { filesChanged: 0, insertions: 0, deletions: 0 }; }
}

export function getCommitsWithStats(repoPath: string, maxCount = 500): Commit[] {
  const commits = getCommits(repoPath, maxCount);
  // Only get diff stats for recent commits to avoid performance hit
  for (const commit of commits.slice(0, 50)) {
    const stats = getCommitDiffStats(repoPath, commit.hash);
    commit.filesChanged = stats.filesChanged;
    commit.insertions = stats.insertions;
    commit.deletions = stats.deletions;
  }
  return commits;
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export function getBranches(repoPath: string, includeRemote = false): Branch[] {
  const flags = includeRemote ? '-a' : '';
  let out: string;
  try {
    out = execSync(
      `git branch ${flags} --format="%(HEAD)|%(refname:short)|%(upstream:short)|%(objectname:short)|%(subject)|%(committerdate:iso8601)"`,
      { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }
    );
  } catch { return []; }

  return out.trim().split('\n').filter(Boolean).map(line => {
    const parts = line.split('|');
    const head = parts[0] ?? '';
    const rawName = (parts[1] ?? '').trim();
    const upstream = parts[2] ?? '';
    const hash = parts[3] ?? '';
    const message = parts[4] ?? '';
    const dateStr = parts[5] ?? '';

    const isCurrent = head.trim() === '*';
    const isRemote = rawName.startsWith('remotes/') || rawName.startsWith('origin/');
    const cleanName = rawName.replace(/^remotes\//, '');

    return {
      name: cleanName,
      isRemote,
      isCurrent,
      lastCommitHash: hash,
      lastCommitMessage: message.trim(),
      lastCommitDate: new Date(dateStr || Date.now()),
      upstream: upstream || undefined,
      aheadBehind: undefined,
      type: classifyBranch(cleanName),
    } as Branch;
  });
}

// ─── Authors ───────────────────────────────────────────────────────────────────

export function getAuthors(repoPath: string): Author[] {
  let out: string;
  try {
    out = execSync(
      'git log --all --format="%an|%ae|%aI|%cI" | sort -u',
      { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch { return []; }

  const authorMap = new Map<string, Author>();

  for (const line of out.trim().split('\n').filter(Boolean)) {
    const parts = line.split('|');
    const name = parts[0] ?? '';
    const email = parts[1] ?? '';
    const firstCommit = new Date(parts[2] ?? Date.now());
    const lastCommit = new Date(parts[3] ?? Date.now());
    const key = email.toLowerCase();

    if (!authorMap.has(key)) {
      authorMap.set(key, { name, email, commits: 0, insertions: 0, deletions: 0, firstCommitDate: firstCommit, lastCommitDate: lastCommit });
    } else {
      const a = authorMap.get(key)!;
      if (firstCommit < a.firstCommitDate) a.firstCommitDate = firstCommit;
      if (lastCommit > a.lastCommitDate) a.lastCommitDate = lastCommit;
    }
  }

  // Count commits per author
  try {
    const commitOut = execSync(
      'git log --all --format="%ae"',
      { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    const counts = new Map<string, number>();
    for (const email of commitOut.trim().split('\n').filter(Boolean)) {
      counts.set(email.toLowerCase(), (counts.get(email.toLowerCase()) ?? 0) + 1);
    }
    for (const [email, author] of authorMap) {
      author.commits = counts.get(email) ?? 0;
    }
  } catch { /* ignore */ }

  return Array.from(authorMap.values()).sort((a, b) => b.commits - a.commits);
}

// ─── Languages ─────────────────────────────────────────────────────────────────

const LANG_EXTENSIONS: Array<[string, string[]]> = [
  ['TypeScript', ['.ts', '.tsx', '.mts', '.cts']],
  ['JavaScript', ['.js', '.jsx', '.mjs', '.cjs']],
  ['Python', ['.py', '.pyw', '.pyx']],
  ['Rust', ['.rs']],
  ['Go', ['.go']],
  ['Java', ['.java']],
  ['C++', ['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.h']],
  ['C', ['.c', '.h']],
  ['C#', ['.cs']],
  ['Ruby', ['.rb']],
  ['PHP', ['.php']],
  ['Swift', ['.swift']],
  ['Kotlin', ['.kt', '.kts']],
  ['Dart', ['.dart']],
  ['Scala', ['.scala', '.sc']],
  ['Elixir', ['.ex', '.exs']],
  ['Clojure', ['.clj', '.cljs', '.cljc']],
  ['Haskell', ['.hs', '.lhs']],
  ['Lua', ['.lua']],
  ['R', ['.r', '.R', '.Rmd']],
  ['Julia', ['.jl']],
  ['Shell', ['.sh', '.bash', '.zsh']],
  ['HTML', ['.html', '.htm']],
  ['CSS', ['.css']],
  ['SCSS', ['.scss', '.sass']],
  ['Vue', ['.vue']],
  ['Svelte', ['.svelte']],
  ['Astro', ['.astro']],
  ['Markdown', ['.md', '.mdx', '.markdown']],
  ['JSON', ['.json']],
  ['YAML', ['.yaml', '.yml']],
  ['TOML', ['.toml']],
  ['XML', ['.xml']],
  ['SQL', ['.sql']],
  ['GraphQL', ['.graphql', '.gql']],
  ['Dockerfile', ['Dockerfile']],
  ['Makefile', ['Makefile', 'makefile', '.mk']],
  ['Nix', ['.nix']],
  ['Vim script', ['.vim', 'vimrc']],
  ['Zig', ['.zig']],
  ['Terraform', ['.tf', '.tfvars']],
  ['CMake', ['CMakeLists.txt', '.cmake']],
];

export function getLanguages(repoPath: string): LanguageStat[] {
  const resolved = resolve(repoPath);
  let allFiles: string[];

  try {
    allFiles = execSync('git ls-files', { cwd: resolved, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' })
      .trim().split('\n').filter(Boolean);
  } catch { return []; }

  // Skip binaries, generated, and vendor files
  const skipDirs = ['node_modules', 'vendor', 'dist', 'build', 'target', '__pycache__', '.git', '.venv', 'venv', '.tox'];
  const skipExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.tar', '.gz', '.mp3', '.mp4', '.exe', '.dll', '.so', '.dylib', '.lock', '.sum', '.pyc']);

  const langCounts = new Map<string, { files: number; lines: number }>();

  for (const file of allFiles) {
    const fullPath = join(resolved, file);
    const ext = extname(file).toLowerCase();
    const base = basename(file).toLowerCase();

    if (skipExts.has(ext)) continue;
    if (skipDirs.some(d => file.includes(d))) continue;

    // Find language
    let lang: string | null = null;
    for (const [name, exts] of LANG_EXTENSIONS) {
      if (exts.some(e => file.endsWith(e))) { lang = name; break; }
    }
    if (base === 'dockerfile') lang = 'Dockerfile';
    if (base === 'makefile' || base === '.mk') lang = 'Makefile';
    if (!lang) lang = 'Other';

    if (!langCounts.has(lang)) langCounts.set(lang, { files: 0, lines: 0 });

    // Count lines (only text files)
    try {
      const stat = statSync(fullPath);
      if (stat.isFile() && stat.size < 1_000_000) { // skip files > 1MB
        const lines = execSync(`wc -l`, { input: execSync(`git show HEAD:${file}`, { cwd: resolved, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 }), encoding: 'utf-8' }).trim();
        const lc = parseInt(lines.split(' ')[0], 10) || 0;
        const count = langCounts.get(lang)!;
        count.files++;
        count.lines += lc;
      }
    } catch { /* skip unreadable */ }
  }

  const totalLines = Array.from(langCounts.values()).reduce((s, c) => s + c.lines, 0);

  return Array.from(langCounts.entries())
    .map(([name, { files, lines }]) => ({
      name,
      files,
      lines,
      percentage: totalLines > 0 ? (lines / totalLines) * 100 : 0,
      color: '#8b949e',
    }))
    .sort((a, b) => b.lines - a.lines);
}

// ─── Repo Stats ────────────────────────────────────────────────────────────────

export function getRepoStats(repoPath: string): RepoStats {
  const resolved = resolve(repoPath);

  let totalCommits = 0;
  try {
    totalCommits = parseInt(execSync('git rev-list --count HEAD', { cwd: resolved, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim(), 10);
  } catch { /* empty repo */ }
  const commits = getCommits(repoPath, 1);

  const branches = getBranches(repoPath);
  const authors = getAuthors(repoPath);

  const lastCommit = commits[0] ?? null;
  const firstCommitDate = commits.length > 0
    ? new Date(execSync('git log --reverse --format="%aI" | head -1', { cwd: resolved, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }).trim())
    : null;

  const description = (() => {
    try {
      const desc = execSync('git config remote.origin.url', { cwd: resolved, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }).trim();
      return desc.replace(/.*[\/:]([^\/]+\/[^\/]+?)(?:\.git)?$/, '$1');
    } catch { return basename(resolved); }
  })();

  return {
    totalCommits,
    totalFiles: 0,
    totalContributors: authors.length,
    totalBranches: branches.filter(b => !b.isRemote).length,
    totalTags: 0,
    lastCommitDate: lastCommit?.date ?? null,
    firstCommitDate,
    activeDays: 0,
    streakDays: 0,
    longestStreak: 0,
    description,
    language: '',
    license: '',
    openIssues: 0,
    openPullRequests: 0,
    readmeSize: 0,
  };
}

// ─── Contribution Heatmap ─────────────────────────────────────────────────────

export function getContributionHeatmap(repoPath: string, weeks = 52): HeatmapData {
  const resolved = resolve(repoPath);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - weeks * 7);

  let out: string;
  try {
    out = execSync(
      `git log --since="${sinceDate.toISOString()}" --format="%aI" --all`,
      { cwd: resolved, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch { return { weeks: [], totalContributions: 0, longestStreak: 0, currentStreak: 0, peakDay: { date: new Date(), count: 0 }, authorStats: new Map() }; }

  const commitDates = out.trim().split('\n').filter(Boolean).map(d => new Date(d));

  // Group by day — use UTC date string to match cell keys built from UTC startDate
  const dayMap = new Map<string, { count: number; date: Date }>();
  for (const date of commitDates) {
    // Use local date components to avoid UTC-shifted keys
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d2 = String(date.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d2}`;
    const existing = dayMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      dayMap.set(key, { count: 1, date: new Date(key) });
    }
  }

  // Build weeks
  const result: WeekData[] = [];
  // Normalize to midnight UTC to ensure consistent day keys
  const startDate = new Date(sinceDate);
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay()); // start from Sunday UTC

  let totalContributions = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const todayCount = dayMap.get(today)?.count ?? 0;

  for (let w = 0; w <= weeks; w++) {
    const days: ContributionDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate.getTime() + (w * 7 + d) * 86400000);
      const y = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const dy = String(date.getDate()).padStart(2, '0');
      const key = `${y}-${mo}-${dy}`;
      const data = dayMap.get(key) ?? { count: 0, date };
      days.push({ date, count: data.count, insertions: 0, deletions: 0 });
      totalContributions += data.count;
    }
    const weekTotal = days.reduce((s, d) => s + d.count, 0);
    result.push({ weekStart: days[0].date, days, total: weekTotal });
  }

  // Streaks
  const sortedDays = Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  for (let i = 0; i < sortedDays.length; i++) {
    const [key] = sortedDays[i];
    const prev = sortedDays[i - 1];
    const daysDiff = prev ? (new Date(prev[0]).getTime() - new Date(key).getTime()) / 86400000 : 0;
    if (daysDiff === 1) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runningStreak);
  }
  if (todayCount > 0) {
    let s = 0;
    for (const [key, data] of sortedDays) {
      if (key === today || s > 0) { s++; } else break;
    }
    currentStreak = s;
  }

  const peakDay = Array.from(dayMap.entries()).reduce(
    (max, [key, val]) => (val.count > max.count ? { date: new Date(key), count: val.count } : max),
    { date: new Date(), count: 0 }
  );

  return { weeks: result, totalContributions, longestStreak, currentStreak, peakDay, authorStats: new Map() };
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export function getTimeline(repoPath: string, weeks = 52): TimelineData {
  const resolved = resolve(repoPath);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - weeks * 7);

  let out: string;
  try {
    out = execSync(
      `git log --since="${sinceDate.toISOString()}" --format="%aI|%an" --all`,
      { cwd: resolved, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch { return { points: [], authors: [], weeklyTotals: new Map() }; }

  const authorSet = new Set<string>();
  const weekMap = new Map<string, Map<string, number>>();

  for (const line of out.trim().split('\n').filter(Boolean)) {
    const idx = line.indexOf('|');
    const dateStr = line.substring(0, idx);
    const author = line.substring(idx + 1);
    authorSet.add(author);

    const date = new Date(dateStr);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().substring(0, 10);

    if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map());
    const week = weekMap.get(weekKey)!;
    week.set(author, (week.get(author) ?? 0) + 1);
  }

  const points: TimelinePoint[] = [];
  for (const [weekKey, authorCounts] of weekMap) {
    const weekStart = new Date(weekKey);
    const weekNum = getWeekNumber(weekStart);
    for (const [author, commits] of authorCounts) {
      points.push({ date: weekStart, weekNumber: weekNum, author, commits, insertions: 0, deletions: 0 });
    }
  }

  const weeklyTotals = new Map<string, number>();
  for (const [week, authors] of weekMap) {
    weeklyTotals.set(week, Array.from(authors.values()).reduce((s, c) => s + c, 0));
  }

  return {
    points: points.sort((a, b) => a.date.getTime() - b.date.getTime()),
    authors: Array.from(authorSet).sort(),
    weeklyTotals,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function classifyBranch(name: string): Branch['type'] {
  const clean = name.replace(/^remotes\//, '').replace(/^origin\//, '');
  if (clean === 'main' || clean === 'master') return 'main';
  if (clean === 'develop' || clean === 'development') return 'develop';
  if (clean.startsWith('feature/') || clean.startsWith('feat/')) return 'feature';
  if (clean.startsWith('bugfix/') || clean.startsWith('fix/')) return 'bugfix';
  if (clean.startsWith('release/')) return 'release';
  if (clean.startsWith('hotfix/')) return 'hotfix';
  return 'other';
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

export function getRepoName(repoPath: string): string {
  return basename(resolve(repoPath));
}

export function getRepoOwner(repoPath: string): string {
  try {
    const url = execSync('git remote get-url origin', { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }).trim();
    const m = url.match(/[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    return m ? m[1] : 'unknown';
  } catch { return 'unknown'; }
}

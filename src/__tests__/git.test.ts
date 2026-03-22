import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import {
  getCommits,
  getBranches,
  getAuthors,
  getLanguages,
  getContributionHeatmap,
  getRepoStats,
  isGitRepo,
} from '../git/parser.js';

describe('Git Parser', () => {
  let testRepo: string;

  beforeAll(() => {
    testRepo = join(tmpdir(), `termpeek-test-${Date.now()}`);
    mkdirSync(testRepo, { recursive: true });
    execSync('git init', { cwd: testRepo, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testRepo, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testRepo, stdio: 'pipe' });
    // Set default branch to main
    execSync('git checkout -b main', { cwd: testRepo, stdio: 'pipe' });

    for (let i = 0; i < 5; i++) {
      const file = `file${i}.ts`;
      writeFileSync(join(testRepo, file), `// file ${i}\nconsole.log('hello');\n`);
      execSync(`git add ${file}`, { cwd: testRepo, stdio: 'pipe' });
      execSync(`git commit -m "feat: add ${file}"`, { cwd: testRepo, stdio: 'pipe' });
    }

    writeFileSync(join(testRepo, 'script.py'), 'print("hello")\n'.repeat(10));
    execSync('git add script.py', { cwd: testRepo, stdio: 'pipe' });
    execSync('git commit -m "add python script"', { cwd: testRepo, stdio: 'pipe' });

    execSync('git checkout -b feature/test-branch', { cwd: testRepo, stdio: 'pipe' });
    writeFileSync(join(testRepo, 'feature.ts'), '// feature\n');
    execSync('git add feature.ts', { cwd: testRepo, stdio: 'pipe' });
    execSync('git commit -m "feat: feature file"', { cwd: testRepo, stdio: 'pipe' });
    execSync('git checkout main', { cwd: testRepo, stdio: 'pipe' });
  });

  afterAll(() => {
    rmSync(testRepo, { recursive: true, force: true });
  });

  test('isGitRepo returns true for valid repo', () => {
    expect(isGitRepo(testRepo)).toBe(true);
  });

  test('isGitRepo returns false for non-repo', () => {
    expect(isGitRepo('/tmp')).toBe(false);
  });

  test('getCommits returns array of commits', () => {
    const commits = getCommits(testRepo);
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0]).toHaveProperty('hash');
    expect(commits[0]).toHaveProperty('shortHash');
    expect(commits[0]).toHaveProperty('message');
    expect(commits[0]).toHaveProperty('author');
    expect(commits[0]).toHaveProperty('date');
  });

  test('getCommits respects maxCount', () => {
    const commits = getCommits(testRepo, 2);
    expect(commits.length).toBeLessThanOrEqual(2);
  });

  test('getBranches returns array of branches', () => {
    const branches = getBranches(testRepo);
    expect(branches.length).toBeGreaterThan(0);
    const names = branches.map(b => b.name);
    expect(names).toContain('main');
    expect(names).toContain('feature/test-branch');
  });

  test('getBranches includes current branch indicator', () => {
    const branches = getBranches(testRepo);
    const current = branches.find(b => b.isCurrent);
    expect(current?.name).toBe('main');
  });

  test('getAuthors returns author stats', () => {
    const authors = getAuthors(testRepo);
    expect(authors.length).toBeGreaterThan(0);
    expect(authors[0]).toHaveProperty('name');
    expect(authors[0]).toHaveProperty('email');
    expect(authors[0].commits).toBeGreaterThan(0);
  });

  test('getLanguages returns language breakdown', () => {
    const langs = getLanguages(testRepo);
    expect(langs.length).toBeGreaterThan(0);
    const names = langs.map(l => l.name);
    expect(names).toContain('TypeScript');
    const tsLang = langs.find(l => l.name === 'TypeScript');
    expect(tsLang?.lines).toBeGreaterThan(0);
    expect(tsLang?.percentage).toBeGreaterThan(0);
  });

  test('getContributionHeatmap returns heatmap data', () => {
    const heatmap = getContributionHeatmap(testRepo, 52);
    expect(heatmap.weeks.length).toBeGreaterThan(0);
    expect(heatmap.totalContributions).toBeGreaterThan(0);
    expect(heatmap.currentStreak).toBeGreaterThanOrEqual(0);
    expect(heatmap.longestStreak).toBeGreaterThanOrEqual(0);
  });

  test('getContributionHeatmap respects week count', () => {
    const hm52 = getContributionHeatmap(testRepo, 52);
    const hm10 = getContributionHeatmap(testRepo, 10);
    expect(hm52.weeks.length).toBeGreaterThan(hm10.weeks.length);
  });

  test('getRepoStats returns complete stats', () => {
    const stats = getRepoStats(testRepo);
    expect(stats.totalCommits).toBeGreaterThan(0);
    expect(stats.totalContributors).toBeGreaterThan(0);
    expect(stats.totalBranches).toBeGreaterThan(0);
    expect(stats.lastCommitDate).toBeTruthy();
  });
});

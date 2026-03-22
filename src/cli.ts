#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { assertGitRepo, getCommits, getBranches, getAuthors, getLanguages, getRepoStats, getContributionHeatmap, getRepoName, getRepoOwner, getRelativeTime } from './git/parser.js';
import { renderCard } from './svg/card.js';
import { renderHeatmap } from './svg/heatmap.js';
import { renderDonut } from './svg/donut.js';
import { renderBadge } from './svg/badge.js';
import { renderBranchTree } from './svg/branches.js';
import { getTheme, THEMES } from './themes.js';
import type { ThemeName } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

// ─── Helpers ───────────────────────────────────────────────────────────────────

function resolveRepo(repo?: string): string {
  return repo ? resolve(repo) : process.cwd();
}

function openInBrowser(svgPath: string): void {
  const url = `file://${svgPath}`;
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(opener, [url], { detached: true, stdio: 'ignore' }).unref();
}

async function saveOutput(svg: string, outputPath?: string): Promise<string> {
  if (!outputPath) {
    outputPath = join(process.cwd(), `termpeek-${Date.now()}.svg`);
  }
  writeFileSync(outputPath, svg, 'utf-8');
  return outputPath;
}

// ─── card ─────────────────────────────────────────────────────────────────────

program
  .command('card')
  .description('Generate repository health card SVG')
  .option('-r, --repo <path>', 'Path to git repository', '.')
  .option('-o, --output <file>', 'Output SVG file path')
  .option('-t, --theme <name>', `Theme: ${Object.keys(THEMES).join(' | ')}`, 'dark')
  .option('--no-sparkline', 'Hide sparkline')
  .option('--no-languages', 'Hide language bars')
  .option('--no-contributors', 'Hide contributor avatars')
  .option('--open', 'Open SVG in browser after generation')
  .option('-w, --width <px>', 'Card width in pixels', '620')
  .action(async (opts) => {
    try {
      const repoPath = resolveRepo(opts.repo);
      assertGitRepo(repoPath);

      const theme = getTheme(opts.theme as ThemeName);
      const stats = getRepoStats(repoPath);
      const commits = getCommits(repoPath, 500);
      const recentCommits = commits.slice(0, 14);
      const languages = getLanguages(repoPath);
      const authors = getAuthors(repoPath);
      const heatmap = getContributionHeatmap(repoPath, 14);
      const sparklineData = heatmap.weeks.map(w => w.total);

      const svg = renderCard({
        repoName: getRepoName(repoPath),
        repoOwner: getRepoOwner(repoPath),
        stats,
        recentCommits,
        languages,
        authors,
        sparklineData,
        theme,
        width: parseInt(opts.width, 10),
      });

      const outputPath = await saveOutput(svg, opts.output);
      console.log(`✅ Card saved to: ${outputPath}`);
      if (opts.open) openInBrowser(outputPath);
    } catch (err) {
      console.error(`❌ ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ─── graph ────────────────────────────────────────────────────────────────────

program
  .command('graph')
  .alias('heatmap')
  .description('Generate contribution heatmap SVG (GitHub-style)')
  .option('-r, --repo <path>', 'Path to git repository', '.')
  .option('-o, --output <file>', 'Output SVG file path')
  .option('-t, --theme <name>', `Theme: ${Object.keys(THEMES).join(' | ')}`, 'dark')
  .option('-w, --weeks <n>', 'Number of weeks to show', '52')
  .option('--no-month-labels', 'Hide month labels')
  .option('--no-day-labels', 'Hide day labels')
  .option('--no-legend', 'Hide legend')
  .option('--open', 'Open SVG in browser after generation')
  .option('--cell-size <px>', 'Cell size in pixels', '11')
  .option('--cell-gap <px>', 'Gap between cells', '3')
  .action(async (opts) => {
    try {
      const repoPath = resolveRepo(opts.repo);
      assertGitRepo(repoPath);

      const theme = getTheme(opts.theme as ThemeName);
      const heatmap = getContributionHeatmap(repoPath, parseInt(opts.weeks, 10));

      const svg = renderHeatmap({
        data: heatmap,
        theme,
        weeks: parseInt(opts.weeks, 10),
        cellSize: parseInt(opts.cellSize, 10),
        cellGap: parseInt(opts.cellGap, 10),
        showMonthLabels: opts.monthLabels,
        showDayLabels: opts.dayLabels,
        showLegend: opts.legend,
      });

      const outputPath = await saveOutput(svg, opts.output);
      console.log(`✅ Heatmap saved to: ${outputPath}`);
      if (opts.open) openInBrowser(outputPath);
    } catch (err) {
      console.error(`❌ ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ─── langs ────────────────────────────────────────────────────────────────────

program
  .command('langs')
  .description('Generate language breakdown donut chart')
  .option('-r, --repo <path>', 'Path to git repository', '.')
  .option('-o, --output <file>', 'Output SVG file path')
  .option('-t, --theme <name>', 'Theme', 'dark')
  .option('-s, --size <px>', 'Chart diameter', '200')
  .option('--open', 'Open SVG in browser after generation')
  .action(async (opts) => {
    try {
      const repoPath = resolveRepo(opts.repo);
      assertGitRepo(repoPath);

      const theme = getTheme(opts.theme as ThemeName);
      const languages = getLanguages(repoPath);
      const svg = renderDonut({ languages, theme, size: parseInt(opts.size, 10) });

      const outputPath = await saveOutput(svg, opts.output);
      console.log(`✅ Donut chart saved to: ${outputPath}`);
      if (opts.open) openInBrowser(outputPath);
    } catch (err) {
      console.error(`❌ ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ─── branches ─────────────────────────────────────────────────────────────────

program
  .command('branches')
  .alias('branch')
  .description('Generate branch tree visualization')
  .option('-r, --repo <path>', 'Path to git repository', '.')
  .option('-o, --output <file>', 'Output SVG file path')
  .option('-t, --theme <name>', 'Theme', 'dark')
  .option('--open', 'Open SVG in browser after generation')
  .option('--remote', 'Include remote branches')
  .action(async (opts) => {
    try {
      const repoPath = resolveRepo(opts.repo);
      assertGitRepo(repoPath);

      const theme = getTheme(opts.theme as ThemeName);
      const branches = getBranches(repoPath, opts.remote);
      const svg = renderBranchTree({ branches, theme });

      const outputPath = await saveOutput(svg, opts.output);
      console.log(`✅ Branch tree saved to: ${outputPath}`);
      if (opts.open) openInBrowser(outputPath);
    } catch (err) {
      console.error(`❌ ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ─── badge ────────────────────────────────────────────────────────────────────

program
  .command('badge <type>')
  .description('Generate individual stat badge (commits | contributors | branches | languages | last-commit)')
  .option('-r, --repo <path>', 'Path to git repository', '.')
  .option('-o, --output <file>', 'Output SVG file path')
  .option('-t, --theme <name>', 'Theme', 'dark')
  .option('-l, --label <text>', 'Custom label text')
  .option('-p, --period <week|month|year|all>', 'Time period', 'all')
  .option('--color <hex>', 'Custom badge color')
  .option('--open', 'Open SVG in browser after generation')
  .action(async (type, opts) => {
    try {
      const validTypes = ['commits', 'contributors', 'branches', 'languages', 'last-commit'];
      if (!validTypes.includes(type)) {
        console.error(`Invalid type. Choose: ${validTypes.join(' | ')}`);
        process.exit(1);
      }

      const repoPath = resolveRepo(opts.repo);
      assertGitRepo(repoPath);

      const theme = getTheme(opts.theme as ThemeName);
      const stats = getRepoStats(repoPath);
      const languages = getLanguages(repoPath);

      let label = opts.label ?? type;
      let value = '';
      let labelBg: string | undefined;

      const period = opts.period ?? 'all';
      const since = new Date();
      if (period === 'week') since.setDate(since.getDate() - 7);
      else if (period === 'month') since.setMonth(since.getMonth() - 1);
      else if (period === 'year') since.setFullYear(since.getFullYear() - 1);

      const commitsInPeriod = getCommits(repoPath, 0).filter(c => c.date >= since);

      switch (type) {
        case 'commits': {
          const commits = getCommits(repoPath, 10000);
          const inPeriod = commits.filter(c => c.date >= since);
          value = period === 'all' ? `${stats.totalCommits}` : `${inPeriod.length}`;
          label = opts.label ?? (period === 'all' ? 'commits' : `commits (${period})`);
          break;
        }
        case 'contributors':
          value = `${stats.totalContributors}`;
          labelBg = theme.success;
          break;
        case 'branches':
          value = `${stats.totalBranches}`;
          labelBg = theme.accent;
          break;
        case 'languages':
          value = `${languages.length}`;
          labelBg = theme.warning;
          break;
        case 'last-commit':
          value = stats.lastCommitDate ? getRelativeTime(stats.lastCommitDate) : 'N/A';
          labelBg = theme.danger;
          break;
      }

      const svg = renderBadge({ label, value, theme, labelBg, valueBg: theme.surface });

      const outputPath = await saveOutput(svg, opts.output);
      console.log(`✅ Badge saved to: ${outputPath}`);
      if (opts.open) openInBrowser(outputPath);
    } catch (err) {
      console.error(`❌ ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ─── init ─────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Create a termpeek config file in current directory')
  .action(() => {
    const config = {
      theme: 'dark',
      defaultCommands: ['card', 'graph', 'langs', 'branches'],
      outputDir: './termpeek-output',
      openAfterGenerate: false,
    };
    writeFileSync('./termpeek.json', JSON.stringify(config, null, 2));
    console.log('✅ Config created: termpeek.json');
  });

// ─── Global options ────────────────────────────────────────────────────────────

program.option('-t, --theme <name>', `Set default theme for all commands: ${Object.keys(THEMES).join(' | ')}`);

program.on('option:theme', (opts) => {
  // Theme is set per-command, this just documents it
});

program
  .name('termpeek')
  .description('Beautiful SVG visualizations for git repositories')
  .version(pkg.version);

program.parse();

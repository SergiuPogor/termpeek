import { svgHeader, svgFooter, rect, text, circle, line } from './renderer.js';
import type { Theme } from '../types.js';
import type { Branch } from '../types.js';
import { getRelativeTime } from '../git/parser.js';

const BRANCH_COLORS: Record<string, string> = {
  main: '#3fb950',
  develop: '#58a6ff',
  feature: '#a855f7',
  bugfix: '#f97316',
  release: '#14b8a6',
  hotfix: '#ef4444',
  other: '#8b949e',
};

export interface BranchTreeSvgOptions {
  branches: Branch[];
  theme: Theme;
  width?: number;
  maxBranches?: number;
}

export function renderBranchTree(opts: BranchTreeSvgOptions): string {
  const { branches, theme, width = 700, maxBranches = 30 } = opts;

  const topBranches = branches.filter(b => !b.isRemote).slice(0, maxBranches);
  const ROW_H = 32;
  const PADDING = 16;
  const LABEL_X = 100;
  const INFO_X = LABEL_X + 220;
  const DOT_X = 40;
  const height = PADDING * 2 + topBranches.length * ROW_H;

  const svg = [
    svgHeader(width, height, theme),
    text(PADDING, PADDING + 14, 'Branch', { fontSize: 11, fill: theme.textMuted, fontWeight: '600' }),
    text(LABEL_X, PADDING + 14, 'Last Commit', { fontSize: 11, fill: theme.textMuted, fontWeight: '600' }),
    text(INFO_X, PADDING + 14, 'Message', { fontSize: 11, fill: theme.textMuted, fontWeight: '600' }),
    line(PADDING, PADDING + 18, width - PADDING, PADDING + 18, { stroke: theme.border, strokeWidth: 1 }),
    ...topBranches.map((branch, i) => {
      const y = PADDING + 24 + i * ROW_H;
      const color = BRANCH_COLORS[branch.type] ?? BRANCH_COLORS.other;
      const name = branch.name.length > 30 ? branch.name.substring(0, 27) + '...' : branch.name;
      const msg = branch.lastCommitMessage.length > 50 ? branch.lastCommitMessage.substring(0, 47) + '...' : branch.lastCommitMessage;

      return [
        // Current indicator
        branch.isCurrent
          ? circle(DOT_X, y + 6, 5, { fill: theme.accent })
          : circle(DOT_X, y + 6, 4, { fill: color }),
        // Branch name
        text(LABEL_X, y + 10, (branch.isCurrent ? '● ' : '  ') + name, {
          fontSize: 12, fill: branch.isCurrent ? theme.accent : theme.text, fontWeight: branch.isCurrent ? '600' : '400',
        }),
        // Hash
        text(LABEL_X + 170, y + 10, branch.lastCommitHash, {
          fontSize: 10, fill: theme.textMuted, fontFamily: theme.fonts.mono,
        }),
        // Relative time
        text(INFO_X + 180, y + 10, getRelativeTime(branch.lastCommitDate), {
          fontSize: 10, fill: theme.textMuted,
        }),
        // Message
        text(INFO_X, y + 10, msg, {
          fontSize: 11, fill: theme.text,
        }),
        // Separator
        line(PADDING, y + ROW_H - 2, width - PADDING, y + ROW_H - 2, { stroke: theme.border, strokeWidth: 0.5, opacity: 0.5 }),
      ];
    }),
    svgFooter(),
  ];

  return svg.flat().join('\n');
}

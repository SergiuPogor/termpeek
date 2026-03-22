import { svgHeader, svgFooter, rect, text, circle, line, roundedRect } from './renderer.js';
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
  const { branches, theme, width = 720, maxBranches = 30 } = opts;

  const MARGIN = 20;
  const ROW_H = 32;
  const topBranches = branches.filter(b => !b.isRemote).slice(0, maxBranches);
  const totalH = MARGIN + (topBranches.length + 1) * ROW_H + MARGIN;
  const W_INNER = width - MARGIN * 2;

  const parts: string[] = [];
  parts.push(svgHeader(width, totalH, theme));
  // Header bar
  parts.push(roundedRect(MARGIN - 4, MARGIN - 4, W_INNER + 8, ROW_H + 8, 8, {
    fill: theme.surface, stroke: theme.border, strokeWidth: 1,
  }));
  parts.push(text(MARGIN, MARGIN + 14, 'Branch', { fontSize: 11, fill: theme.textMuted, fontWeight: '600' }));
  parts.push(text(MARGIN + 180, MARGIN + 14, 'Last Commit', { fontSize: 11, fill: theme.textMuted, fontWeight: '600' }));
  parts.push(text(MARGIN + 440, MARGIN + 14, 'Message', { fontSize: 11, fill: theme.textMuted, fontWeight: '600' }));

  for (let i = 0; i < topBranches.length; i++) {
    const branch = topBranches[i];
    const y = MARGIN + ROW_H + 4 + i * ROW_H;
    const color = BRANCH_COLORS[branch.type] ?? BRANCH_COLORS.other;
    const name = branch.name.length > 26 ? branch.name.substring(0, 23) + '…' : branch.name;
    const msg = branch.lastCommitMessage.length > 45 ? branch.lastCommitMessage.substring(0, 42) + '…' : branch.lastCommitMessage;

    parts.push(line(MARGIN, y, width - MARGIN, y, { stroke: theme.border, strokeWidth: 0.5 }));
    if (branch.isCurrent) {
      parts.push(circle(MARGIN + 8, y + 10, 5, { fill: theme.accent }));
    } else {
      parts.push(circle(MARGIN + 8, y + 10, 4, { fill: color }));
    }
    parts.push(text(MARGIN + 24, y + 14, name, {
      fontSize: 12, fill: branch.isCurrent ? theme.accent : theme.text,
      fontWeight: branch.isCurrent ? '600' : '400',
    }));
    parts.push(text(MARGIN + 210, y + 14, branch.lastCommitHash, {
      fontSize: 10, fill: theme.textMuted, fontFamily: theme.fonts.mono,
    }));
    parts.push(text(MARGIN + 440, y + 14, msg, { fontSize: 11, fill: theme.text }));
    parts.push(text(MARGIN + 560, y + 14, getRelativeTime(branch.lastCommitDate), {
      fontSize: 10, fill: theme.textMuted,
    }));
  }

  parts.push(svgFooter());
  return parts.join('\n');
}

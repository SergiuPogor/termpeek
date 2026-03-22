import { svgHeader, svgFooter, rect, text, roundedRect } from './renderer.js';
import type { Theme } from '../types.js';

export interface BadgeSvgOptions {
  label: string;
  value: string;
  theme: Theme;
  labelBg?: string;
  valueBg?: string;
  height?: number;
  radius?: number;
}

export function renderBadge(opts: BadgeSvgOptions): string {
  const { label, value, theme, height = 20, radius = height / 2 } = opts;
  const labelBg = opts.labelBg ?? theme.accent;
  const valueBg = opts.valueBg ?? theme.surface;

  const labelWidth = Math.max(label.length * 6.5 + 14, 40);
  const valueWidth = Math.max(value.length * 7.5 + 14, 40);
  const totalWidth = labelWidth + valueWidth;

  return [
    svgHeader(totalWidth, height + 4, theme),
    roundedRect(0, 2, labelWidth, height, radius, { fill: labelBg }),
    roundedRect(labelWidth - radius, 2, valueWidth + radius, height, radius, { fill: valueBg }),
    text(labelWidth / 2, height / 2 + 4, label, { fontSize: 10, fill: '#fff', textAnchor: 'middle', fontWeight: '500' }),
    text(labelWidth + valueWidth / 2, height / 2 + 4, value, { fontSize: 10, fill: theme.text, textAnchor: 'middle', fontWeight: '600' }),
    svgFooter(),
  ].join('\n');
}

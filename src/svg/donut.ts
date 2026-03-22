import { svgHeader, svgFooter, rect, text, donutSlice } from './renderer.js';
import type { Theme } from '../types.js';
import type { LanguageStat } from '../types.js';
import { langColor } from '../themes.js';

export interface DonutSvgOptions {
  languages: LanguageStat[];
  theme: Theme;
  size?: number;
  innerRadius?: number;
  showLegend?: boolean;
}

export function renderDonut(opts: DonutSvgOptions): string {
  const { languages, theme, size = 200, innerRadius = 55, showLegend = true } = opts;
  const MARGIN = 20;
  const outerRadius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const legendWidth = showLegend ? 140 : 0;
  const totalWidth = MARGIN + size + legendWidth + MARGIN;
  const totalHeight = size + MARGIN * 2;

  const topLangs = languages.slice(0, 8);
  if (topLangs.length === 0) return svgHeader(totalWidth, totalHeight, theme) + svgFooter();

  const slices: string[] = [];
  let currentAngle = 0;
  for (const lang of topLangs) {
    const angle = (lang.percentage / 100) * 360;
    const color = langColor(lang.name, theme);
    slices.push(donutSlice(cx, cy, innerRadius, outerRadius, currentAngle, currentAngle + angle, color));
    currentAngle += angle;
  }

  const legendX = MARGIN + size + 16;
  const legendItems = topLangs.map((lang, i) => {
    const ly = MARGIN + i * 22 + 14;
    const color = langColor(lang.name, theme);
    return [
      rect(legendX, ly - 10, 10, 10, { fill: color, rx: 2 }),
      text(legendX + 16, ly, lang.name, { fontSize: 12, fill: theme.text }),
      text(totalWidth - MARGIN, ly, `${lang.percentage.toFixed(1)}%`, { fontSize: 12, fill: theme.textMuted, textAnchor: 'end' }),
    ];
  });

  const svg = [
    svgHeader(totalWidth, totalHeight, theme),
    ...slices,
    text(cx, cy - 8, `${topLangs[0].percentage.toFixed(0)}%`, { fontSize: 22, fontWeight: '700', fill: theme.text, textAnchor: 'middle' }),
    text(cx, cy + 12, topLangs[0].name, { fontSize: 10, fill: theme.textMuted, textAnchor: 'middle' }),
    text(cx, cy + 28, `${topLangs.length} languages`, { fontSize: 9, fill: theme.textMuted, textAnchor: 'middle' }),
    ...legendItems.flat(),
    svgFooter(),
  ];

  return svg.flat().join('\n');
}

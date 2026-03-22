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
  const outerRadius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const legendWidth = showLegend ? 130 : 0;
  const totalWidth = size + legendWidth + 20;

  const topLangs = languages.slice(0, 8);
  if (topLangs.length === 0) return svgHeader(totalWidth, size, theme) + svgFooter();

  const slices: string[] = [];
  let currentAngle = 0;

  for (const lang of topLangs) {
    const angle = (lang.percentage / 100) * 360;
    const color = langColor(lang.name, theme);
    slices.push(donutSlice(cx, cy, innerRadius, outerRadius, currentAngle, currentAngle + angle, color));
    currentAngle += angle;
  }

  const legendItems = topLangs.map((lang, i) => {
    const ly = 20 + i * 20;
    const color = langColor(lang.name, theme);
    return [
      rect(size + 15, ly, 10, 10, { fill: color, rx: 2 }),
      text(size + 30, ly + 10, lang.name, { fontSize: 11, fill: theme.text }),
      text(size + legendWidth - 5, ly + 10, `${lang.percentage.toFixed(1)}%`, { fontSize: 11, fill: theme.textMuted, textAnchor: 'end' }),
    ];
  });

  const svg = [
    svgHeader(totalWidth, size, theme),
    ...slices,
    // Center text
    text(cx, cy - 6, `${topLangs[0].percentage.toFixed(0)}%`, { fontSize: 20, fontWeight: '700', fill: theme.text, textAnchor: 'middle' }),
    text(cx, cy + 12, topLangs[0].name, { fontSize: 9, fill: theme.textMuted, textAnchor: 'middle' }),
    // Legend
    ...legendItems.flat(),
    svgFooter(),
  ];

  return svg.flat().join('\n');
}

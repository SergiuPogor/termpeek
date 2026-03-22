import { svgHeader, svgFooter, rect, text } from './renderer.js';
import type { Theme } from '../types.js';
import type { HeatmapData } from '../types.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface HeatmapSvgOptions {
  data: HeatmapData;
  theme: Theme;
  weeks?: number;
  cellSize?: number;
  cellGap?: number;
  showMonthLabels?: boolean;
  showDayLabels?: boolean;
  showLegend?: boolean;
}

export function renderHeatmap(opts: HeatmapSvgOptions): string {
  const {
    data, theme,
    weeks = 52,
    cellSize = 12,
    cellGap = 3,
    showMonthLabels = true,
    showDayLabels = true,
    showLegend = true,
  } = opts;

  const MARGIN = 20;
  const LEGEND_W = showLegend ? 140 : 0;
  const DAY_LABEL_W = showDayLabels ? 28 : 0;
  const MONTH_LABEL_H = showMonthLabels ? 20 : 0;
  const FOOTER_H = 32;

  const weeksToShow = Math.min(data.weeks.length, weeks);
  const gridW = weeksToShow * (cellSize + cellGap);
  const totalW = MARGIN + DAY_LABEL_W + gridW + cellGap + LEGEND_W + MARGIN;
  const totalH = MARGIN + MONTH_LABEL_H + 7 * (cellSize + cellGap) + cellGap + FOOTER_H + MARGIN;

  // Month label positions
  const monthLabels: Array<{ x: number; label: string }> = [];
  let lastMonth = -1;
  for (let w = 0; w < weeksToShow; w++) {
    const week = data.weeks[w];
    const month = week.weekStart.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        x: MARGIN + DAY_LABEL_W + w * (cellSize + cellGap),
        label: MONTH_NAMES[month],
      });
      lastMonth = month;
    }
  }

  function heatColor(count: number): string {
    if (count === 0) return theme.heatmap[0];
    if (count <= 2) return theme.heatmap[1];
    if (count <= 5) return theme.heatmap[2];
    if (count <= 9) return theme.heatmap[3];
    return theme.heatmap[4];
  }

  const gridX = MARGIN + DAY_LABEL_W;
  const gridY = MARGIN + MONTH_LABEL_H;

  const svg: string[] = [
    svgHeader(totalW, totalH, theme),
    // Title
    text(MARGIN, MARGIN + 14, 'Contribution Activity', {
      fontSize: 14, fontWeight: '700', fill: theme.text,
    }),
    // Month labels
    ...monthLabels.map(m =>
      text(m.x, MARGIN + MONTH_LABEL_H - 4, m.label, { fontSize: 10, fill: theme.textMuted })
    ),
    // Day labels
    ...(showDayLabels ? [0, 2, 4, 6].map(i =>
      text(MARGIN, gridY + i * (cellSize + cellGap) + cellSize / 2 + 4, DAY_LABELS[i], {
        fontSize: 9, fill: theme.textMuted,
      })
    ) : []),
    // Cells
    ...Array.from({ length: weeksToShow }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const week = data.weeks[w];
        if (!week) return '';
        const day = week.days[d];
        if (!day) return '';
        const x = gridX + w * (cellSize + cellGap);
        const y = gridY + d * (cellSize + cellGap);
        const col = heatColor(day.count);
        const tooltip = `${day.count} contribution${day.count !== 1 ? 's' : ''} on ${day.date.toDateString()}`;
        return `<g><title>${tooltip}</title>${rect(x, y, cellSize, cellSize, { fill: col, rx: 2 })}</g>`;
      })
    ).flat().filter(Boolean),
    // Stats row
    text(MARGIN, totalH - MARGIN - FOOTER_H + 14,
      `${data.totalContributions} contributions · ${data.currentStreak} day current streak · ${data.longestStreak} day longest streak`,
      { fontSize: 10, fill: theme.textMuted }
    ),
  ];

  // Legend
  if (showLegend) {
    const lx = totalW - MARGIN - LEGEND_W;
    const ly = MARGIN;
    svg.push(
      text(lx, ly + 10, 'Less', { fontSize: 9, fill: theme.textMuted }),
      ...([0, 1, 2, 3, 4] as const).map((level, i) =>
        rect(lx + 32 + i * (cellSize + 2), ly, cellSize, cellSize, { fill: theme.heatmap[level], rx: 2 })
      ),
      text(lx + 32 + 5 * (cellSize + 2) + 4, ly + 10, 'More', { fontSize: 9, fill: theme.textMuted }),
      text(lx, ly + 24, `Current: ${data.currentStreak}d 🔥`, { fontSize: 10, fill: theme.warning }),
      text(lx, ly + 38, `Longest: ${data.longestStreak}d 📈`, { fontSize: 10, fill: theme.success }),
      text(lx, ly + 52, `Peak: ${data.peakDay.count} on ${data.peakDay.date.toLocaleDateString()}`, { fontSize: 10, fill: theme.textMuted }),
    );
  }

  svg.push(svgFooter());
  return svg.flat().join('\n');
}

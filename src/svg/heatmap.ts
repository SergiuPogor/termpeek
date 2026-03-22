import { svgHeader, svgFooter, rect, text } from './renderer.js';
import { grid } from './renderer.js';
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
  const { data, theme, weeks = 52, cellSize = 11, cellGap = 3, showMonthLabels = true, showDayLabels = true, showLegend = true } = opts;

  const paddingLeft = showDayLabels ? 30 : 0;
  const paddingTop = showMonthLabels ? 20 : 0;
  const legendWidth = showLegend ? 120 : 0;

  const weeksToShow = Math.min(data.weeks.length, weeks);
  const width = paddingLeft + weeksToShow * (cellSize + cellGap) + cellGap + legendWidth + 20;
  const height = paddingTop + 7 * (cellSize + cellGap) + cellGap + 30;

  // Month label positions
  const monthLabels: Array<{ x: number; label: string }> = [];
  let lastMonth = -1;
  for (let w = 0; w < weeksToShow; w++) {
    const week = data.weeks[w];
    const month = week.weekStart.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ x: paddingLeft + w * (cellSize + cellGap), label: MONTH_NAMES[month] });
      lastMonth = month;
    }
  }

  // Grid positions
  const cells: Array<{ x: number; y: number; count: number }> = [];
  for (let w = 0; w < weeksToShow; w++) {
    const week = data.weeks[w];
    for (let d = 0; d < 7; d++) {
      const day = week.days[d];
      const [gx, gy] = [paddingLeft + w * (cellSize + cellGap), paddingTop + d * (cellSize + cellGap)];
      cells.push({ x: gx, y: gy, count: day.count });
    }
  }

  // Heatmap color based on count
  function heatColor(count: number): string {
    if (count === 0) return theme.heatmap[0];
    if (count <= 2) return theme.heatmap[1];
    if (count <= 5) return theme.heatmap[2];
    if (count <= 9) return theme.heatmap[3];
    return theme.heatmap[4];
  }

  const svg = [
    svgHeader(width, height, theme),
    // Title
    text(20, 14, 'Contribution Activity', { fontSize: 13, fontWeight: '600', fill: theme.text }),
    // Month labels
    ...monthLabels.map(m => text(m.x, paddingTop - 4, m.label, { fontSize: 10, fill: theme.textMuted })),
    // Day labels
    ...(showDayLabels ? [0, 2, 4, 6].map(i => text(0, paddingTop + i * (cellSize + cellGap) + cellSize / 2 + 4, DAY_LABELS[i], { fontSize: 9, fill: theme.textMuted })) : []),
    // Cells
    ...cells.map(c => {
      const [x, y] = [c.x, c.y];
      const col = heatColor(c.count);
      const tooltip = `${c.count} contribution${c.count !== 1 ? 's' : ''}`;
      return `<g><title>${tooltip}</title>${rect(x, y, cellSize, cellSize, { fill: col, rx: 2 })}</g>`;
    }),
    // Stats row
    text(paddingLeft, height - 8, `${data.totalContributions} contributions in the last ${weeks} weeks`, { fontSize: 10, fill: theme.textMuted }),
    // Streak info
    showLegend ? [
      text(width - legendWidth - 10, 14, 'Less', { fontSize: 9, fill: theme.textMuted }),
      ...([0, 1, 2, 3, 4] as const).map((level, i) =>
        rect(width - legendWidth - 10 + 30 + i * (cellSize + 2), 4, cellSize, cellSize, { fill: theme.heatmap[level], rx: 2 })
      ),
      text(width - legendWidth + 10 + 5 * (cellSize + 2), 14, 'More', { fontSize: 9, fill: theme.textMuted }),
      text(width - legendWidth - 10, 28, `🔥 ${data.currentStreak} day streak`, { fontSize: 10, fill: theme.warning }),
      text(width - legendWidth - 10, 42, `📈 ${data.longestStreak} day best`, { fontSize: 10, fill: theme.success }),
    ].flat() : [],
    svgFooter(),
  ].flat();

  return svg.join('\n');
}

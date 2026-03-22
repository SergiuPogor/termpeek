import type { Theme } from '../types.js';

// ─── SVG Base ─────────────────────────────────────────────────────────────────

export function svgHeader(width: number, height: number, theme: Theme, id = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
  style="background:${theme.background};font-family:${theme.fonts.sans};">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap');
      .text { fill: ${theme.text}; font-family: ${theme.fonts.sans}; }
      .text-muted { fill: ${theme.textMuted}; font-family: ${theme.fonts.sans}; }
      .text-mono { fill: ${theme.text}; font-family: ${theme.fonts.mono}; }
      .text-accent { fill: ${theme.accent}; }
      .border { stroke: ${theme.border}; }
    </style>
  </defs>`;
}

export function svgFooter(): string {
  return `</svg>`;
}

export function rect(
  x: number, y: number, w: number, h: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number; ry?: number; opacity?: number } = {}
): string {
  const { fill, stroke, strokeWidth = 0, rx = 0, ry, opacity } = opts;
  const parts = [`x="${x}"`, `y="${y}"`, `width="${w}"`, `height="${h}"`];
  if (fill) parts.push(`fill="${fill}"`);
  if (stroke) parts.push(`stroke="${stroke}"`, `stroke-width="${strokeWidth}"`);
  if (rx) parts.push(`rx="${rx}"`);
  if (ry) parts.push(`ry="${ry ?? rx}"`);
  if (opacity !== undefined) parts.push(`opacity="${opacity}"`);
  return `<rect ${parts.join(' ')}/>`;
}

export function text(
  x: number, y: number, content: string,
  opts: { fontSize?: number; fontWeight?: string; fill?: string; fontFamily?: string; textAnchor?: string; dominantBaseline?: string; letterSpacing?: string } = {}
): string {
  const { fontSize = 12, fontWeight = '400', fill = '#e6edf3', fontFamily = 'inherit', textAnchor = 'start', dominantBaseline = 'auto', letterSpacing } = opts;
  const parts = [`x="${x}"`, `y="${y}"`, `font-size="${fontSize}"`, `font-weight="${fontWeight}"`, `fill="${fill}"`, `font-family="${fontFamily}"`, `text-anchor="${textAnchor}"`, `dominant-baseline="${dominantBaseline}"`];
  if (letterSpacing) parts.push(`letter-spacing="${letterSpacing}"`);
  return `<text ${parts.join(' ')}>${escapeXml(content)}</text>`;
}

export function tspan(x: number, dy: number, content: string, opts: { fontSize?: number; fontWeight?: string; fill?: string } = {}): string {
  const { fontSize = 12, fontWeight = '400', fill = 'inherit' } = opts;
  return `<tspan x="${x}" dy="${dy}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${escapeXml(content)}</tspan>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, opts: { stroke?: string; strokeWidth?: number; strokeDasharray?: string; opacity?: number } = {}): string {
  const { stroke = '#30363d', strokeWidth = 1, strokeDasharray, opacity } = opts;
  const parts = [`x1="${x1}"`, `y1="${y1}"`, `x2="${x2}"`, `y2="${y2}"`, `stroke="${stroke}"`, `stroke-width="${strokeWidth}"`];
  if (strokeDasharray) parts.push(`stroke-dasharray="${strokeDasharray}"`);
  if (opacity !== undefined) parts.push(`opacity="${opacity}"`);
  return `<line ${parts.join(' ')}/>`;
}

export function path(d: string, opts: { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number } = {}): string {
  const { fill = 'none', stroke, strokeWidth = 1, opacity } = opts;
  const parts = [`d="${d}"`, `fill="${fill}"`];
  if (stroke) parts.push(`stroke="${stroke}"`, `stroke-width="${strokeWidth}"`);
  if (opacity !== undefined) parts.push(`opacity="${opacity}"`);
  return `<path ${parts.join(' ')}/>`;
}

export function circle(cx: number, cy: number, r: number, opts: { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number } = {}): string {
  const { fill = '#58a6ff', stroke, strokeWidth = 0, opacity } = opts;
  const parts = [`cx="${cx}"`, `cy="${cy}"`, `r="${r}"`, `fill="${fill}"`];
  if (stroke) parts.push(`stroke="${stroke}"`, `stroke-width="${strokeWidth}"`);
  if (opacity !== undefined) parts.push(`opacity="${opacity}"`);
  return `<circle ${parts.join(' ')}/>`;
}

export function roundedRect(
  x: number, y: number, w: number, h: number, r: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number } = {}
): string {
  const { fill = '#161b22', stroke, strokeWidth = 1, opacity } = opts;
  const parts = [`x="${x}"`, `y="${y}"`, `width="${w}"`, `height="${h}"`, `rx="${r}"`, `fill="${fill}"`];
  if (stroke) parts.push(`stroke="${stroke}"`, `stroke-width="${strokeWidth}"`);
  if (opacity !== undefined) parts.push(`opacity="${opacity}"`);
  return `<rect ${parts.join(' ')}/>`;
}

export function link(href: string, text: string, x: number, y: number, opts: { fontSize?: number; fill?: string } = {}): string {
  const { fontSize = 12, fill = '#58a6ff' } = opts;
  return `<a xlink:href="${href}" target="_blank" rel="noopener noreferrer">` +
    `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" text-decoration="underline">${escapeXml(text)}</text></a>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Common UI Components ─────────────────────────────────────────────────────

export function badge(
  label: string, value: string,
  x: number, y: number,
  opts: { labelColor?: string; valueColor?: string; bg?: string; radius?: number; height?: number } = {}
): string {
  const { labelColor = '#8b949e', valueColor, bg = '#21262d', height = 20, radius = height / 2 } = opts;
  const vColor = valueColor ?? labelColor;
  const labelWidth = label.length * 7 + 16;
  const valueWidth = value.length * 8 + 16;
  const totalWidth = labelWidth + valueWidth;
  const labelBg = bg;
  const valueBg = bg;

  return [
    rect(x, y, labelWidth, height, { fill: labelBg, rx: radius }),
    rect(x + labelWidth, y, valueWidth, height, { fill: valueBg, rx: radius }),
    text(x + 8, y + height / 2 + 4, label, { fontSize: 11, fill: labelColor }),
    text(x + labelWidth + 8, y + height / 2 + 4, value, { fontSize: 11, fill: vColor }),
  ].join('\n');
}

export function progressBar(
  x: number, y: number, w: number, h: number,
  percentage: number,
  opts: { bg?: string; fill?: string; showLabel?: boolean; theme: Theme }
): string {
  const { bg, fill = opts.theme.accent, showLabel = true } = opts;
  const fillW = Math.min(percentage, 100) / 100 * w;

  return [
    rect(x, y, w, h, { fill: bg ?? opts.theme.surface, rx: h / 2 }),
    rect(x, y, fillW, h, { fill, rx: h / 2 }),
    ...(showLabel ? [text(x + w + 8, y + h / 2 + 4, `${Math.round(percentage)}%`, { fontSize: 11, fill: opts.theme.textMuted })] : []),
  ].join('\n');
}

export function langBar(
  x: number, y: number, w: number, h: number,
  langs: Array<{ name: string; percentage: number; color: string }>,
  theme: Theme
): string {
  const parts: string[] = [rect(x, y, w, h, { fill: theme.surface, rx: h / 2 })];

  let cx = x;
  for (const lang of langs) {
    const sw = (lang.percentage / 100) * w;
    if (sw < 1) continue;
    parts.push(rect(cx, y, sw, h, { fill: lang.color, rx: h / 2 }));
    cx += sw;
  }

  return parts.join('\n');
}

export function avatarInitials(x: number, y: number, r: number, name: string, theme: Theme, index: number): string {
  const colors = [theme.accent, theme.accentAlt, theme.success, theme.warning, theme.danger, '#a855f7', '#ec4899'];
  const color = colors[index % colors.length];
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return [
    circle(x, y, r, { fill: color }),
    text(x, y + r / 2 + 4, initials, { fontSize: r * 0.7, fill: '#fff', textAnchor: 'middle' }),
  ].join('\n');
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

export function sparkline(
  x: number, y: number, w: number, h: number,
  data: number[],
  theme: Theme,
  opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  if (data.length === 0) return '';

  const { stroke = theme.success, strokeWidth = 1.5, fill = `${theme.success}33` } = opts;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const stepX = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => [x + i * stepX, y + h - ((v - min) / range) * h]);

  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    // Smooth curve
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev[0] + curr[0]) / 2;
    d += ` C ${cpX},${prev[1]} ${cpX},${curr[1]} ${curr[0]},${curr[1]}`;
  }

  // Fill area
  const areaD = d + ` L ${pts[pts.length - 1][0]},${y + h} L ${pts[0][0]},${y + h} Z`;

  return [
    `<path d="${areaD}" fill="${fill}" opacity="0.4"/>`,
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('\n');
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function grid(rows: number, cols: number, cellW: number, cellH: number, gap: number, offsetX: number, offsetY: number): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result.push([offsetX + c * (cellW + gap), offsetY + r * (cellH + gap)]);
    }
  }
  return result;
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

export function donutSlice(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
  color: string
): string {
  const toRad = (a: number) => (a * Math.PI) / 180;

  const x1o = cx + outerR * Math.cos(toRad(startAngle - 90));
  const y1o = cy + outerR * Math.sin(toRad(startAngle - 90));
  const x2o = cx + outerR * Math.cos(toRad(endAngle - 90));
  const y2o = cy + outerR * Math.sin(toRad(endAngle - 90));
  const x1i = cx + innerR * Math.cos(toRad(endAngle - 90));
  const y1i = cy + innerR * Math.sin(toRad(endAngle - 90));
  const x2i = cx + innerR * Math.cos(toRad(startAngle - 90));
  const y2i = cy + innerR * Math.sin(toRad(startAngle - 90));

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `<path d="M ${x1o},${y1o} A ${outerR},${outerR} 0 ${largeArc},1 ${x2o},${y2o} L ${x1i},${y1i} A ${innerR},${innerR} 0 ${largeArc},0 ${x2i},${y2i} Z" fill="${color}"/>`;
}

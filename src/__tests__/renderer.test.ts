import { svgHeader, svgFooter, rect, text, sparkline, donutSlice, roundedRect } from '../svg/renderer.js';
import { THEMES, getTheme, langColor, LANGUAGE_COLORS } from '../themes.js';
import { getRelativeTime, classifyBranch, getRepoName } from '../git/parser.js';

describe('SVG Renderer', () => {
  const darkTheme = THEMES.dark;

  test('svgHeader generates valid SVG opening tag', () => {
    const header = svgHeader(100, 100, darkTheme);
    expect(header).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(header).toContain('width="100"');
    expect(header).toContain('height="100"');
    expect(header).toContain(`background:${darkTheme.background}`);
  });

  test('svgFooter closes SVG properly', () => {
    expect(svgFooter()).toBe('</svg>');
  });

  test('rect renders with correct attributes', () => {
    const r = rect(10, 20, 100, 50, { fill: '#ff0000', rx: 4 });
    expect(r).toContain('x="10"');
    expect(r).toContain('y="20"');
    expect(r).toContain('width="100"');
    expect(r).toContain('height="50"');
    expect(r).toContain('fill="#ff0000"');
    expect(r).toContain('rx="4"');
  });

  test('rect handles optional stroke', () => {
    const r = rect(0, 0, 50, 50, { fill: '#000', stroke: '#fff', strokeWidth: 2 });
    expect(r).toContain('stroke="#fff"');
    expect(r).toContain('stroke-width="2"');
  });

  test('text renders with correct position and content', () => {
    const t = text(50, 60, 'Hello World', { fontSize: 16, fill: '#fff' });
    expect(t).toContain('x="50"');
    expect(t).toContain('y="60"');
    expect(t).toContain('Hello World');
    expect(t).toContain('font-size="16"');
    expect(t).toContain('fill="#fff"');
  });

  test('text escapes XML special characters', () => {
    const t = text(0, 0, 'A & B < C > D "E"', {});
    expect(t).toContain('&amp;');
    expect(t).toContain('&lt;');
    expect(t).toContain('&gt;');
    expect(t).toContain('&quot;');
  });

  test('sparkline handles empty data', () => {
    const s = sparkline(0, 0, 100, 20, [], darkTheme);
    expect(s).toBe('');
  });

  test('sparkline generates valid path for data', () => {
    const s = sparkline(0, 0, 100, 20, [1, 3, 2, 5, 4], darkTheme);
    expect(s).toContain('<path');
    expect(s).toContain('fill="none"');
    expect(s).toContain('stroke=');
  });

  test('donutSlice generates arc path', () => {
    const slice = donutSlice(100, 100, 50, 80, 0, 90, '#ff0000');
    expect(slice).toContain('<path');
    expect(slice).toContain('fill="#ff0000"');
    expect(slice).toContain('M ');
    expect(slice).toContain('A ');
  });

  test('roundedRect creates rect with rx attribute', () => {
    const r = roundedRect(0, 0, 200, 100, 12, { fill: '#161b22', stroke: '#30363d', strokeWidth: 1 });
    expect(r).toContain('rx="12"');
    expect(r).toContain('fill="#161b22"');
  });
});

describe('Themes', () => {
  test('all 6 themes exist', () => {
    expect(Object.keys(THEMES)).toHaveLength(6);
    expect(THEMES.dark).toBeDefined();
    expect(THEMES.dracula).toBeDefined();
    expect(THEMES.monokai).toBeDefined();
    expect(THEMES.nord).toBeDefined();
    expect(THEMES.gruvbox).toBeDefined();
    expect(THEMES.catppuccin).toBeDefined();
  });

  test('getTheme returns correct theme', () => {
    expect(getTheme('dracula').name).toBe('Dracula');
    expect(getTheme('nord').name).toBe('Nord');
  });

  test('getTheme falls back to dark for unknown theme', () => {
    expect(getTheme('unknown' as any).name).toBe('Dark');
  });

  test('each theme has required color fields', () => {
    for (const theme of Object.values(THEMES)) {
      expect(theme.background).toBeTruthy();
      expect(theme.text).toBeTruthy();
      expect(theme.accent).toBeTruthy();
      expect(theme.heatmap).toHaveLength(5);
      expect(theme.fonts).toHaveProperty('mono');
      expect(theme.fonts).toHaveProperty('sans');
    }
  });

  test('langColor returns color from theme languages', () => {
    const color = langColor('TypeScript', THEMES.dark);
    expect(color).toBe(LANGUAGE_COLORS['TypeScript']);
  });

  test('langColor returns fallback for unknown language', () => {
    const color = langColor('Brainfuck', THEMES.dark);
    expect(color).toBe('#8b949e');
  });
});

describe('Helper Functions', () => {
  test('getRelativeTime formats seconds', () => {
    expect(getRelativeTime(new Date(Date.now() - 30_000))).toContain('s ago');
  });
  test('getRelativeTime formats minutes', () => {
    expect(getRelativeTime(new Date(Date.now() - 90_000))).toContain('m ago');
  });
  test('getRelativeTime formats hours', () => {
    expect(getRelativeTime(new Date(Date.now() - 2 * 3_600_000))).toContain('h ago');
  });
  test('getRelativeTime formats days', () => {
    expect(getRelativeTime(new Date(Date.now() - 5 * 86_400_000))).toContain('d ago');
  });
  test('getRelativeTime formats months', () => {
    expect(getRelativeTime(new Date(Date.now() - 60 * 86_400_000))).toContain('mo ago');
  });

  test('classifyBranch returns main for main/master', () => {
    expect(classifyBranch('main')).toBe('main');
    expect(classifyBranch('master')).toBe('main');
  });
  test('classifyBranch returns develop', () => {
    expect(classifyBranch('develop')).toBe('develop');
  });
  test('classifyBranch returns feature', () => {
    expect(classifyBranch('feature/add-login')).toBe('feature');
  });
  test('classifyBranch returns bugfix', () => {
    expect(classifyBranch('bugfix/correct-typo')).toBe('bugfix');
  });
  test('classifyBranch returns release', () => {
    expect(classifyBranch('release/v1.0')).toBe('release');
  });
  test('classifyBranch returns hotfix', () => {
    expect(classifyBranch('hotfix/security-patch')).toBe('hotfix');
  });
  test('classifyBranch returns other for unknown', () => {
    expect(classifyBranch('random-branch-name')).toBe('other');
  });

  test('getRepoName extracts basename', () => {
    expect(getRepoName('/home/user/projects/my-repo')).toBe('my-repo');
  });
});

describe('Language Colors', () => {
  test('common languages have assigned colors', () => {
    expect(LANGUAGE_COLORS['TypeScript']).toBe('#3178c6');
    expect(LANGUAGE_COLORS['JavaScript']).toBe('#f1e05a');
    expect(LANGUAGE_COLORS['Python']).toBe('#3572A5');
    expect(LANGUAGE_COLORS['Rust']).toBe('#dea584');
    expect(LANGUAGE_COLORS['Go']).toBe('#00ADD8');
  });

  test('language color map has entries', () => {
    expect(Object.keys(LANGUAGE_COLORS).length).toBeGreaterThan(20);
  });
});

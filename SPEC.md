# termpeek — SPEC.md

## What It Is

**termpeek** generates beautiful, shareable SVG visualizations from any git repository. One command produces an SVG badge, graph, or card — embeddable anywhere.

```
$ termpeek card
→ generates repo-health.svg with commits, branches, contributors, last commit

$ termpeek graph --weeks 52
→ generates contribution heatmap for the full year

$ termpeek branches
→ generates branch tree visualization

$ termpeek langs
→ generates language breakdown donut chart

$ termpeek timeline --authors
→ generates commit timeline by author

$ termpeek badge commits --period week
→ generates "42 commits this week" badge
```

---

## Visual Themes

All outputs support `--theme`:
- `dark` (default) — deep navy `#0d1117`, GitHub-style greens
- `dracula` — dark purple theme
- `monokai` — warm orange/blue
- `nord` — cool arctic blue
- `gruvbox` — retro earthy
- `catppuccin` — modern pastel

---

## Commands & Outputs

### 1. `termpeek card` — Repository Health Card

Single SVG card with all key stats:

```
┌─────────────────────────────────────────────────────────┐
│  🔥 termpeek / SergiuPogor/secret-sweep                 │
│                                                         │
│  ████████████████████░░░░░  147 commits                 │
│                                                         │
│  📂 12 branches  ·  👥 3 contributors  ·  📅 3 days ago │
│                                                         │
│  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐         │
│  │  │██│██│██│██│██│  │██│██│██│██│██│██│██│         │
│  ├──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┤         │
│  └─────────────────────────────────────────┘         │
│                                                         │
│  🟢 TypeScript  52%  ████████████████                  │
│  🔵 JavaScript  38%  █████████████                    │
│  🟡 Other       10%  ████                              │
└─────────────────────────────────────────────────────────┘
```

Stats included:
- Total commits
- Active branches (with names)
- Contributors (avatars)
- Last commit date + relative time
- Contribution sparkline (last 14 weeks)
- Language breakdown bar

### 2. `termpeek graph` — Contribution Heatmap

Full GitHub-style contribution graph with:
- Configurable weeks (26 / 52 / all time)
- Day-of-week column headers (M W F)
- Month labels
- Color intensity scale (5 levels)
- Hover data on each cell
- Total contributions count + streak stats
- Fully customizable via CSS variables

### 3. `termpeek branches` — Branch Tree Visualizer

SVG tree showing:
- All local and remote branches
- Merge topology
- Current HEAD indicator
- Ahead/behind status per branch vs origin
- Branch colors by type (feature, bugfix, release)
- Commit messages on key nodes

### 4. `termpeek langs` — Language Breakdown

- Donut chart with language colors (per GitHub linguist)
- Percentage + line count per language
- Configurable: top N languages, exclude patterns
- Legend with color swatches

### 5. `termpeek timeline` — Commit Timeline

- Area chart: commits over time
- Breakdown by author (stacked area)
- Weekly or monthly granularity
- Shows contribution velocity trends

### 6. `termpeek badge [type]` — Individual Badges

Individual stat badges (like shields.io but live-generated):
- `badge commits --period week|month|year|all`
- `badge lines` — lines added/removed
- `badge contributors` — contributor count
- `badge branches` — branch count
- `badge size` — repo size
- `badge last-commit` — relative time
- `badge languages` — top language

### 7. `termpeek diff-stats` — Diff Summary

- Commits with most changes
- Files with most changes
- Lines added/removed bars

### 8. `termpeek ci-status` — CI Status Badge

- Shows passing/failing CI status
- Pipeline breakdown
- Support for: GitHub Actions, GitLab CI, CircleCI

---

## Architecture

```
src/
  cli.ts          ← Commander CLI (main entry)
  git/
    parser.ts     ← git log, git ls-files, git branch, git diff parsing
    analyzer.ts   ← commit analysis, author stats, language detection
    language.ts   ← .gitignore-based + file-extension language mapping
  svg/
    renderer.ts   ← SVG generation engine
    card.ts       ← Repo health card renderer
    heatmap.ts    ← Contribution graph renderer
    branches.ts   ← Branch tree renderer
    donut.ts      ← Language donut chart
    timeline.ts   ← Timeline chart renderer
    badge.ts      ← Individual badge renderers
    sparkline.ts  ← Tiny sparkline renderer
  themes.ts       ← Theme definitions (colors, fonts, styles)
  types.ts        ← All TypeScript interfaces
```

---

## Output Formats

- `--format svg` — output as .svg file
- `--format json` — output as JSON data
- `--format png` — output as PNG (via svg-to-png)
- `--open` — open result in browser automatically
- `--upload` — upload to termpeek.dev and return URL (future)

---

## Theming API

```typescript
interface Theme {
  name: string;
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  accentAlt: string;
  border: string;
  heatmap: string[]; // 5 color values for 0-4+ commits
  languages: Record<string, string>; // language → color
  fonts: { mono: string; sans: string };
}
```

---

## CLI Examples

```bash
# Card for current repo
termpeek card

# Card for specific repo
termpeek card --repo /path/to/repo

# Full year contribution graph
termpeek graph --weeks 52 --theme dracula --open

# Language donut chart
termpeek langs --top 5

# Custom badge
termpeek badge commits --period month --theme nord

# Output to specific file
termpeek card --output my-repo-card.svg

# Dark themed branch tree
termpeek branches --theme gruvbox --show-remote

# JSON output for scripting
termpeek card --format json | jq '.commits'
```

---

## Power Features

### Batch Generation
```bash
termpeek batch --template "badges/{stat}.svg" --stats commits,branches,contributors,languages
```

### Programmatic API
```typescript
import { generateCard, generateHeatmap, generateBadge } from 'termpeek';

const svg = await generateCard({ repo: '/path/to/repo', theme: 'dracula' });
const heatmap = await generateHeatmap({ repo: '/path/to/repo', weeks: 52 });
const badge = await generateBadge({ type: 'commits', period: 'week' });
```

### Watch Mode
```bash
termpeek card --watch --output live-card.svg
# Updates every 60s or on git push
```

### Dashboard Mode
```bash
termpeek dashboard --port 3000
# Opens web UI at localhost:3000
# Shows all repos in a directory as live-updating cards
```

---

## Technical Decisions

- **Pure SVG generation** — no canvas, no puppeteer. Clean vector output.
- **No external API calls** — reads git data entirely from local .git directory
- **Streaming git parsing** — handles repos with 50k+ commits without memory blowup
- **CSS variables in SVG** — theme switching without regenerating geometry
- **Parallel git queries** — multiple stats fetched simultaneously via git commands

---

## Non-Goals (v1)

- No server-side hosting / URL generation (keep it local CLI)
- No authentication / accounts
- No GitHub API integration (pure git reads)

---

## Success Criteria

- `termpeek card --open` produces something a developer would genuinely want to put in their README
- The heatmap rivals GitHub's in accuracy and beauty
- Language detection matches GitHub linguist within 2% accuracy
- CLI is discoverable enough that `termpeek --help` makes everything clear

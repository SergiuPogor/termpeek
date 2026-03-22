# termpeek

> **Beautiful SVG visualizations for git repositories** — contribution heatmaps, repo cards, language breakdowns, branch trees, and more.

```
npm install -g termpeek
termpeek card --open
```

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="version">
  <img src="https://img.shields.io/badge/node-%3E%3D18-green?style=for-the-badge" alt="node">
  <img src="https://img.shields.io/badge/license-MIT-purple?style=for-the-badge" alt="license">
</p>

---

## ✨ Features

| Command | Description | Output |
|---------|-------------|--------|
| `termpeek card` | Repository health card with all key stats | SVG |
| `termpeek graph` | GitHub-style contribution heatmap | SVG |
| `termpeek langs` | Language breakdown donut chart | SVG |
| `termpeek branches` | Branch tree with last commits | SVG |
| `termpeek badge` | Individual stat badges | SVG |

**6 themes** — Dark, Dracula, Monokai, Nord, Gruvbox, Catppuccin.

**Pure SVG** — no canvas, no puppeteer, no external services. Reads directly from your `.git` directory.

---

## 📦 Install

```bash
npm install -g termpeek
```

Or via `npx` (no install needed):

```bash
npx termpeek card
```

---

## 🚀 Quick Start

```bash
# Generate a repo health card
termpeek card

# Open the SVG in your browser automatically
termpeek card --open

# Full-year contribution heatmap
termpeek graph --weeks 52

# Language breakdown
termpeek langs

# Branch tree
termpeek branches

# Specific theme
termpeek card --theme dracula

# Output to a file
termpeek graph --output my-heatmap.svg

# Any git repository
termpeek card --repo /path/to/project
```

---

## 🎨 Themes

```
--theme dark       # GitHub-inspired deep navy (default)
--theme dracula    # Dark purple with vibrant accents
--theme monokai    # Classic warm orange
--theme nord       # Cool arctic blue
--theme gruvbox    # Retro earthy tones
--theme catppuccin # Modern pastel palette
```

---

## 📊 Commands

### `termpeek card`

Repository health card — a single SVG with everything your README needs.

```
termpeek card --repo . --open
```

Shows:
- Total commits, active branches, contributor count
- Last commit with relative time
- 14-week commit sparkline
- Language breakdown bars
- Top contributor avatars

### `termpeek graph`

GitHub-style contribution heatmap.

```
termpeek graph --weeks 52 --theme nord --open
```

Shows:
- Day-by-day contribution cells (color intensity)
- Month column labels
- Current streak and longest streak
- Total contributions count

### `termpeek langs`

Language breakdown as a donut chart.

```
termpeek langs --size 300 --theme catppuccin
```

Shows:
- Top languages by line count
- Percentage per language
- Color-coded legend

### `termpeek branches`

All local branches with last commit info.

```
termpeek branches --theme dracula --remote
```

Shows:
- Branch name with type indicator (feature, bugfix, main, etc.)
- Last commit hash and message
- Time since last commit
- Current branch highlighted

### `termpeek badge <type>`

Individual stat badges — perfect for embedding in other documents.

```
termpeek badge commits --period month       # "47 commits (month)"
termpeek badge contributors                 # "3 contributors"
termpeek badge branches                    # "12 branches"
termpeek badge languages                   # "8 languages"
termpeek badge last-commit                 # "2h ago"
```

Custom label and color:
```bash
termpeek badge commits --label "This Week" --color "#f97316"
```

---

## 🔧 Programmatic API

```typescript
import { renderCard, renderHeatmap, renderDonut, renderBadge } from 'termpeek';

const svg = await renderCard({
  repoPath: '/path/to/repo',
  theme: 'dracula',
  showSparkline: true,
  showLanguages: true,
});
```

---

## 🎯 All Options

### Global

| Option | Description | Default |
|--------|-------------|---------|
| `--repo, -r` | Path to git repository | `.` (current dir) |
| `--theme, -t` | Color theme | `dark` |
| `--output, -o` | Output file path | `termpeek-{timestamp}.svg` |
| `--open` | Open in browser after generation | `false` |

### Heatmap

| Option | Description | Default |
|--------|-------------|---------|
| `--weeks, -w` | Number of weeks to show | `52` |
| `--cell-size` | Cell size in pixels | `11` |
| `--cell-gap` | Gap between cells | `3` |
| `--no-month-labels` | Hide month labels | `false` |
| `--no-day-labels` | Hide day labels | `false` |
| `--no-legend` | Hide legend | `false` |

### Card

| Option | Description | Default |
|--------|-------------|---------|
| `--no-sparkline` | Hide sparkline | `false` |
| `--no-languages` | Hide language bars | `false` |
| `--no-contributors` | Hide contributor avatars | `false` |
| `--width` | Card width in pixels | `620` |

---

## 🏗️ Architecture

```
src/
  cli.ts              # Commander.js CLI (5 commands)
  types.ts            # All TypeScript interfaces
  themes.ts           # 6 theme definitions + language colors
  git/
    parser.ts         # git log, branch, ls-files, show parsing
  svg/
    renderer.ts       # Core SVG primitives (rect, text, path, etc.)
    card.ts           # Repo health card renderer
    heatmap.ts        # Contribution graph renderer
    donut.ts          # Language donut chart
    badge.ts          # Individual stat badges
    branches.ts       # Branch tree renderer
```

---

## 🤝 Contributing

Issues and PRs welcome. Please read the SPEC.md before making significant changes.

---

## 📜 License

MIT © Serghei Pogor

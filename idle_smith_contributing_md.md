# CONTRIBUTING.md

Thanks for helping make **IdleSmith** better! This guide explains how to set up the project, propose changes, and ship releases. If anything is unclear, open an issue.

---

## Table of contents
- [Project setup](#project-setup)
- [Branching model](#branching-model)
- [Commit style (Conventional Commits)](#commit-style-conventional-commits)
- [Pull requests](#pull-requests)
- [Coding standards](#coding-standards)
- [UI & game design principles](#ui--game-design-principles)
- [Testing](#testing)
- [Performance notes](#performance-notes)
- [Release process](#release-process)
- [Versioning & changelog](#versioning--changelog)
- [Save compatibility & migrations](#save-compatibility--migrations)
- [Steam desktop roadmap](#steam-desktop-roadmap)
- [Issue labels](#issue-labels)

---

## Project setup

**Prereqs**: Node LTS, Git.

```bash
# clone your fork
git clone https://github.com/<YOUR_USERNAME>/idlesmith.git
cd idlesmith

# install deps
npm install

# dev server
npm run dev
```

Tailwind v4 is configured via `@tailwindcss/postcss` with a single CSS import in `src/index.css`:

```css
@import "tailwindcss";
```

---

## Branching model

We use a light **trunk-based** flow:

- `main` is always releasable.
- Create short-lived feature branches off `main`:
  - `feat/<short-desc>`
  - `fix/<short-desc>`
  - `chore/<short-desc>`
- Rebase or merge `main` frequently; open small PRs.

---

## Commit style (Conventional Commits)

Use Conventional Commits to keep history tidy and generate changelogs:

```
<type>(optional scope): <summary>

[optional body]
[optional footer]
```

**Common types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `chore`, `ci`.

**Examples**:
- `feat(upgrades): add Blacksmith Guild tier with bulk buy`
- `fix(save): guard against corrupted localStorage`
- `perf(loop): throttle RAF on background tab`

A **breaking change** must include `!` or a `BREAKING CHANGE:` footer.

---

## Pull requests

- Keep PRs under ~300 lines when possible.
- Link to an issue and describe **why** + **how**.
- Include screenshots/GIFs for UI changes.
- Add/adjust tests if behavior changes.
- Pass CI (lint/build). Example local checks:

```bash
npm run build
# (optional) run lints/tests once added
```

---

## Coding standards

- React function components, hooks only.
- Component files in `src/` with **PascalCase** names.
- Prefer pure functions and derived state selectors.
- Keep game constants in one place (e.g., `UPGRADE_DEFS`).
- Avoid magic numbers in logic—add named constants.
- Accessibility: semantic buttons, ARIA labels where needed.

---

## UI & game design principles

- Keep numbers readable (e.g., `1.23K`, `4.56M`).
- Upgrades must feel meaningful; avoid 0.001% increments early.
- Idle progress should respect a cap (e.g., 8h) to balance returns.
- Prestige should unlock at an understandable milestone and feel like a step change.
- Avoid hard paywalls; reward active + idle loops fairly.

---

## Testing

(Coming soon) Suggested levels:
- **Unit**: math helpers, prestige calc, upgrade costs.
- **Integration**: save/load, offline progress application.
- **Playwright** (optional): smoke test UI mounts and can click/earn gold.

---

## Performance notes

- Use a single RAF loop and accumulate seconds.
- Cap delta time to guard against tab hibernation.
- Batch `setState` updates and compute derived values via `useMemo`.
- Keep object allocations minimal in hot paths.

---

## Release process

1. Ensure `main` builds locally.
2. Update `CHANGELOG.md` under **Unreleased** → new version.
3. Bump version:
   ```bash
   # choose one
   npm version patch   # bug fixes
   npm version minor   # backwards-compatible features
   npm version major   # breaking changes
   ```
4. Push with tags:
   ```bash
   git push && git push --tags
   ```
5. Create a GitHub Release from the tag and paste changelog entry.

> Tip: we can add a GitHub Action later to build and attach desktop bundles.

---

## Versioning & changelog

We follow **Semantic Versioning** (MAJOR.MINOR.PATCH) and **Keep a Changelog** style. See `CHANGELOG.md`.

---

## Save compatibility & migrations

- Save files currently live in `localStorage` as JSON.
- If fields change, write a migration in `loadSave()` that:
  1) detects old `version`, 2) transforms data, 3) writes new version.
- Never silently drop user progress; default missing fields safely.

---

## Steam desktop roadmap

Goal: ship IdleSmith as a desktop app on Steam while sharing most code with the web build.

**Packaging options** (choose one later):
- **Electron** (mature, larger footprint). Use a minimal Electron shell that loads the Vite build.
- **Tauri** (lightweight, Rust-backed). Smaller download size; good for idle games.

**Key tasks**
- **Abstract storage**: replace `localStorage` with a storage layer that supports both browser and desktop (e.g., file-based JSON at `%APPDATA%/IdleSmith/save.json`, `~/Library/Application Support/IdleSmith/save.json`, `~/.local/share/IdleSmith/save.json`).
- **Steamworks integration**: achievements, stats, cloud saves, rich presence. (Hook after we pick Electron/Tauri and a compatible Steamworks binding.)
- **Windowing**: add window controls, menu, and proper icons.
- **Auto-updates**: optional, via the chosen packager ecosystem.
- **Controller input** (nice-to-have): map space/enter to click, D‑pad for nav.

**Steam readiness checklist**
- [ ] Packaging script (`npm run desktop:build`)
- [ ] Save path abstraction + migration from web
- [ ] Achievements mapped to game milestones
- [ ] Cloud save integration
- [ ] Crash handling + safe-save-on-exit
- [ ] Configurable settings (audio, animations, UI scale)
- [ ] App metadata/assets (capsule art, icon, screenshots, trailer)

Create a **Steam** issue label and track these in milestone `Steam MVP`.

---

## Issue labels

- `good first issue` – tiny, well-scoped tasks
- `help wanted` – community contributions welcome
- `bug` – defects, regressions
- `feat` – feature requests
- `perf` – performance improvements
- `docs` – documentation work
- `steam` – desktop/Steam specific items

Be kind and respectful—assume good intent. (If needed, we’ll add a CODE_OF_CONDUCT.)

---

# CHANGELOG.md

All notable changes to this project will be documented here.

The format is based on **Keep a Changelog** and this project adheres to **Semantic Versioning**.

## [Unreleased]
### Added
- Achievements framework (pending)
- Ore/Smelting second‑resource loop (pending)
- Random events & temporary buffs (pending)

### Changed
- Balance passes on upgrade costs (pending)

### Fixed
- N/A

---

## [1.0.0] – 2025-08-27
### Added
- Initial public release: **IdleSmith v1**
  - Clicking + idle gold/sec
  - Upgrades: Hammer, Anvil, Forge, Apprentice
  - Prestige with Essence (+2% permanent income)
  - Autosave to localStorage + offline progress (8h cap)
  - Import/Export save, manual save, hard reset
  - Tailwind v4 UI

### Changed
- N/A

### Fixed
- N/A

---

## [0.1.0] – 2025-08-27
### Added
- Prototype single‑file component created and tested in dev


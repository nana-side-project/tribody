# TriBody — Architecture & Working Agreement

TriBody（トライボディ）は、トライアスリートが「どこが痛いのか」から
**実際に何が傷んでいるのか（筋・腱・滑液包・骨）** を視覚的に理解し、
**どこをどう補強・ストレッチすれば予防・改善できるか** を学べるモバイルファーストのWebアプリ（PWA）です。

- 対象ユーザー: 日本語話者のエイジグループ・トライアスリート（医療者ではない）。主にスマホ（Android/iPhone）で使う。
- UI言語: 日本語。コード・コメントは英語でよい。
- 医療上の診断はしない。「可能性」「受診の目安」を示す教育ツール。

## Tech stack

- Vite 7 + React 19 + TypeScript (strict), `react-router-dom` 7 (**HashRouter**, so it works on static hosting and as a single file).
- three.js 0.187 for the 3D anatomy viewer (lazy-loaded).
- Hand-authored SVG (React components) for the 2D body map and region diagrams.
- No UI framework. Plain CSS with design tokens (CSS variables). No CSS-in-JS libs.
- vitest for data-integrity tests.
- Do **not** add npm dependencies. Everything needed is installed. (If you are truly blocked, say so in your final report instead.)

Commands:

| command | what |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | typecheck everything (safe to run in parallel) |
| `npm run validate` / `OWNER=B npm run validate` | content integrity (all / one owner); `STRICT=1` also fails on warnings |
| `npm run build` / `npm run build:single` | orchestrator only: static site in `dist/` / one self-contained HTML in `dist-single/` |
| `VITE_CACHE_DIR=node_modules/.vite-<PORT> npx vite --port <PORT> --strictPort` | dev server (use YOUR assigned port) |
| `node scripts/shot.mjs <url> shots/<you>/<name>.png [--w 390 --h 844 --wait 1500 --full --dark --click sel]` | screenshot + prints console errors |

## Rules for parallel agents (important)

Several agents work in this same checkout at the same time.

1. **Only edit files you own** (table below). If you need a change in someone else's file, describe it in your final report.
2. **Never run `npm run build` / `vite build`** (writes `dist/`, collides). Typecheck with `tsc --noEmit`; verify visually with your own dev server.
3. **Dev server**: use only the port you were assigned, and `VITE_CACHE_DIR=node_modules/.vite-<PORT>`. Start it in the background, and **kill it when you finish** (`pkill -f "port <PORT>"`).
4. Screenshots go to `shots/<your-agent-name>/`. Look at them with the Read tool (it shows images). Verify on a 390×844 phone viewport.
5. Typecheck errors in files you don't own are not yours — ignore them (other agents are mid-edit), but your files must be clean.
6. **No git commits / pushes.** The orchestrator commits.
7. Do not rename or remove ids in `src/data/registry.ts`. Need a new id? Report it; don't add it.

## Directory layout & ownership

```
docs/ARCHITECTURE.md, docs/CONTENT_GUIDE.md      orchestrator
docs/ENGINE.md                                   3D engine agent
src/data/registry.ts, types.ts, index.ts, validate*.ts   orchestrator (read-only for others)
src/data/content/shoulder.ts     content A  (肩・首)
src/data/content/hip.ts          content B  (股関節・お尻)
src/data/content/knee-calf.ts    content C  (膝・ふくらはぎ・すね)
src/data/content/ankle-foot.ts   content D  (足首・足部)
src/data/content/global.ts       content E  (regions, pain spots, structures, guides, 腰・体幹)
src/three/contract.ts            orchestrator (public 3D contract — stable)
src/three/index.tsx              orchestrator (lazy wrapper)
src/three/**  (everything else)  3D engine agent, then rigging agents in their own files:
  src/three/rig-data/muscles-*.ts, structures-*.ts   muscle-rigging agents (per file)
  src/three/clips/*.ts                              clip agents (per file)
src/svg/types.ts                 orchestrator (2D contract — stable)
src/svg/BodyMap.tsx (+ src/svg/bodymap/**)        body-map agent
src/svg/regions/<region>.tsx                      region-diagram agents (per file)
src/svg/regions/index.ts                          region-diagram agents append their entry (one line each)
src/App.tsx, src/main.tsx, src/pages/**, src/components/**, src/styles/**, src/lib/**, public/**   UI agent
dev/*.html, dev/*.tsx            dev harness pages; name them after yourself (dev/engine.html, dev/diagrams-knee.html…)
scripts/shot.mjs                 orchestrator
```

## Data model (read `src/data/types.ts` and `src/data/registry.ts`)

- **registry.ts** lists every id (muscles, structures, conditions, exercises, pain spots, guides, regions) with its owner.
  All cross-references are typed with these ids, so a typo is a type error.
- **types.ts** defines `Region`, `PainSpot`, `Structure`, `Muscle`, `Condition` (3 rehab phases: calm → build → return),
  `Exercise`, `Guide`.
- **index.ts** aggregates owners' arrays and offers lookups (`getCondition`, `exercisesForMuscle`, …). The UI imports from `src/data`.
- **validate.ts** checks completeness and cross-links (pain spot ⇄ condition, muscle ⇄ exercise…).

## 3D anatomy viewer (`src/three`)

Public contract: `src/three/contract.ts` (`AnatomyViewerProps`). The UI only uses `import { AnatomyViewer } from '../three'`.

Concept: a clean **mannequin** (semi-transparent skin made of capsules/ellipsoids) with simplified bones and
**muscles drawn as tapered "strands" between their real attachment points** (origin → via points → insertion),
in the spirit of musculoskeletal-model visualisations. Because strands are attached to bones, posing the skeleton
automatically shows each muscle **shortening (contraction) or lengthening (stretch)** — this is the core teaching idea
("筋肉がどこから始まり、どこに付着し、どう収縮するのか").

- Attachments are expressed via **named bony landmarks** (e.g. `femur:greater_trochanter`, `pelvis:asis`), defined once
  per bone by the engine, so rigging agents can write muscles anatomically by name. Muscles are defined for the
  right side and mirrored to the left automatically.
- Muscle modes: `muscle` page → loop rest → action pose (収縮) → rest → stretch pose (伸張);
  `exercise` page → play the exercise clip (keyframed joint angles + root transform, props like band/step/wall),
  with target muscles highlighted; `highlights` → condition pages (injured part glowing).
- Colours: origin marker vs insertion marker consistent with the 2D style (see below). Length ratio drives
  strand thickness and colour (shorter → thicker & deeper red; longer → thinner & lighter).
- The engine agent documents everything rigging/clip agents need in `docs/ENGINE.md`.

## 2D illustrations (`src/svg`)

Contract: `src/svg/types.ts`.
- `BodyMap` — front / back / sole silhouettes with tappable hotspots for every pain spot (`PAIN_SPOTS[].views`).
  Symmetric: hotspots on both left and right; `onSelect(id, side)`.
- Region diagrams — one module per region exporting a `RegionDiagram` (views, which parts appear in which view,
  which spots have hotspots, and the React component). Every muscle/structure shape carries `data-part="<id>"`
  so highlighting works by id. Hotspots carry `data-spot="<id>"`.

## UI (`src/pages`, `src/components`)

Routes (HashRouter):

| route | page |
|---|---|
| `/` | ホーム: body map (前/後/足裏) → tap a spot → sheet with candidate conditions; region chips |
| `/region/:id` | 部位: region diagram with spots, conditions, key muscles, how swim/bike/run load it |
| `/condition/:id` | 障害: what happens (2D highlight + 3D), why in triathlon, symptoms, self-checks, red flags, 3-phase plan, training tips |
| `/muscles`, `/muscle/:id` | 筋肉図鑑: list by region; detail with 3D contraction/stretch animation, 起始・停止・作用・神経支配 |
| `/exercises`, `/exercise/:id` | エクササイズ: filterable library; detail with 3D animation, steps, cues, dose, add to menu |
| `/menu` | マイメニュー + 痛みログ (localStorage) |
| `/guides`, `/guide/:id` | ガイド: pain monitoring, load management, red flags… |
| `/about` | 使い方・免責事項 |

Bottom tab bar: からだ / 筋肉 / エクササイズ / マイメニュー / ガイド.

Mobile first: design for 360–430 px width, 16 px side gutters, no horizontal scroll, tap targets ≥ 44 px,
max content width ~640 px centred on desktop. Respect `prefers-reduced-motion` (no autoplay loops; user can press play).

`localStorage` must always be wrapped in try/catch (it can throw in private mode / previews); the app must work without it.

### Design tokens (CSS variables on `:root`)

Light (default) and dark. Dark mode is defined **twice**: under
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` and under `:root[data-theme="dark"] { … }`.
`body` gets an explicit `background: var(--bg)`.

| token | light | dark | use |
|---|---|---|---|
| `--bg` | `#f6f3ef` | `#151312` | page |
| `--surface` | `#ffffff` | `#1e1b19` | cards |
| `--surface-2` | `#efeae4` | `#282421` | chips, insets |
| `--text` | `#1e1b18` | `#f2ede7` | |
| `--text-2` | `#5f5852` | `#b5ada5` | secondary |
| `--text-3` | `#6e6761` | `#9a928b` | tertiary text (≥ 4.5:1 on bg / surface / surface-2) |
| `--border` | `#e3dcd4` | `#3a3531` | |
| `--accent` | `#b5524c` | `#e07d75` | brand / muscle red |
| `--accent-soft` | `#f3dcd9` | `#4a2a27` | |
| `--accent-ink` | `#a2433d` | `#e07d75` | accent used as text (≥ 4.5:1); `--accent` stays for fills |
| `--mix-ink` | `55%` | `80%` | share of a colour in tinted text: `color-mix(in srgb, c var(--mix-ink), var(--text))` |
| `--muscle` | `#b9504a` | `#d8675f` | muscle fill |
| `--muscle-light` | `#e6a49e` | `#9c4c46` | lengthened / secondary |
| `--tendon` | `#e9dcc0` | `#bfae8a` | tendons, fascia |
| `--bone` | `#e4e1dc` | `#8f8a84` | bone fill |
| `--bone-ink` | `#6f6a64` | `#d8d3cc` | outlines |
| `--origin` | `#d9772b` | `#f0954d` | 起始 marker (orange) |
| `--insertion` | `#3f6fd1` | `#7aa2ff` | 停止 marker (blue) |
| `--injured` | `#e0342b` | `#ff5a4f` | injured highlight (with glow/pulse) |
| `--involved` | `#e0a23b` | `#f0b450` | involved (non-injured) highlight — amber, same as diagrams & 3D |
| `--nerve` | `#e2b93b` | `#f3cf5a` | nerves |
| `--bursa` | `#8fb8de` | `#6f9cc8` | bursae |
| `--swim` | `#2a7ab8` | `#5aa9e6` | discipline colours |
| `--bike` | `#d4861b` | `#f0a640` | |
| `--run` | `#2f9a5d` | `#4fc282` | |
| `--danger` | `#c62828` | `#ff6b6b` | red flags |
| `--ok` | `#2e7d32` | `#66bb6a` | |

Font: system stack `"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", system-ui, sans-serif`.

## Visual style (2D and 3D share it)

Clean educational medical illustration, inspired by modern anatomy references: **bones** light warm grey with a darker
grey outline; **muscles** matte brick red with subtle fibre lines showing fibre direction; **tendons/fascia** cream;
**bursae** soft blue; **nerves** yellow; **origin** = orange dot, **insertion** = blue dot (always with a legend
「● 起始 ● 停止」). Injured part = brighter red with a soft glow / gentle pulse. Labels: small (11–12 px) dark grey
Japanese text with thin leader lines. Generous whitespace, rounded cards (radius 16), soft shadows.
Never copy images or artwork from other products; everything is drawn by us.

## Safety principles (apply everywhere in the UI)

- Show a short disclaimer on condition pages: 「この情報は一般的な教育目的です。診断ではありません。」 with a link to `/about`.
- Red flags (受診の目安) are always visible (not hidden behind a tap) on condition pages, styled with `--danger`.
- Exercises show the pain rule (e.g. 「運動中の痛みは10段階で3以下、翌朝に悪化していなければOK」).

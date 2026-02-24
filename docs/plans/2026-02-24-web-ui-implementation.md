# Web UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Balatro-inspired React web UI for the System Design card game, wrapping the existing pure-TypeScript engine.

**Architecture:** Vite + React 19 + Zustand store wrapping `src/engine/` functions. State-machine screen navigation (no router). Browser-compatible data loader imports JSON directly via Vite. Engine code (`src/engine/`, `src/schemas/`) stays unchanged.

**Tech Stack:** React 19, Vite, Zustand, Tailwind CSS v4, Framer Motion

---

## Critical Context

- **Engine API**: All game logic lives in `src/engine/*.ts`. Functions are pure (except `GameState` mutations in `shop.ts`). The web store is a thin wrapper — it calls engine functions and updates React state.
- **Data loading**: `src/data/loader.ts` uses Node.js `fs` (won't work in browser). Task 2 creates `src/data/loader-web.ts` that imports JSON directly via Vite.
- **Module resolution**: Engine files use `.js` extensions in imports (e.g., `from '../schemas/index.js'`). Vite resolves these to `.ts` files automatically.
- **Game flow** (from `src/game/full-game.ts`): Title → Draft (N rounds) → [Phase: BlindSelect → Deploy → Events → Settlement → Shop] × 3 → GameOver
- **Screen navigation**: Zustand `currentScreen` field, no React Router.

---

## Phase 1: Foundation (Tasks 1-4)

### Task 1: Vite + React Project Setup

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/web/main.tsx`
- Create: `src/web/App.tsx`
- Create: `tsconfig.web.json`
- Modify: `package.json` (add dependencies + scripts)

**Step 1: Install web dependencies**

```bash
cd /Volumes/Crucial/projects/turing-system-design
npm install react react-dom zustand framer-motion
npm install -D @vitejs/plugin-react tailwindcss @tailwindcss/vite @types/react @types/react-dom
```

**Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  build: {
    outDir: 'dist-web',
  },
});
```

**Step 3: Create `tsconfig.web.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist-web",
    "noEmit": true
  },
  "include": ["src"]
}
```

**Step 4: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System Design Card Game</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/web/main.tsx"></script>
</body>
</html>
```

**Step 5: Create `src/web/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Step 6: Create `src/web/App.tsx`** (placeholder)

```tsx
export default function App() {
  return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <h1 className="text-4xl">System Design Card Game</h1>
  </div>;
}
```

**Step 7: Create `src/web/styles/globals.css`**

```css
@import "tailwindcss";
```

**Step 8: Add scripts to `package.json`**

Add to scripts:
```json
"dev:web": "vite",
"build:web": "vite build",
"preview:web": "vite preview"
```

**Step 9: Verify**

Run: `npm run dev:web`
Expected: Browser opens, shows "System Design Card Game" centered on dark background.

**Step 10: Commit**

```bash
git add -A && git commit -m "feat: add Vite + React project setup"
```

---

### Task 2: Browser-Compatible Data Loader

**Files:**
- Create: `src/data/loader-web.ts`

**Context:** The existing `loader.ts` uses `readFileSync` and `__dirname` (Node.js only). The web loader imports JSON directly — Vite handles JSON imports natively. It still validates with Zod schemas.

**Step 1: Create `src/data/loader-web.ts`**

```typescript
import { z } from 'zod';
import {
  ComponentSchema,
  ScenarioSchema,
  JokerSchema,
  EventSchema,
  PatternSchema,
  SuperPatternSchema,
  SchoolSchema,
  BossRuleSchema,
  TarotSchema,
} from '../schemas/index.js';

import componentsJson from '../../gamedata/components.json';
import scenariosJson from '../../gamedata/scenarios.json';
import jokersJson from '../../gamedata/jokers.json';
import eventsJson from '../../gamedata/events.json';
import patternsJson from '../../gamedata/patterns.json';
import superPatternsJson from '../../gamedata/super_patterns.json';
import schoolsJson from '../../gamedata/schools.json';
import bossRulesJson from '../../gamedata/boss_rules.json';
import tarotsJson from '../../gamedata/tarots.json';

function parseArray<T>(data: unknown, schema: z.ZodType<T>): T[] {
  return z.array(schema).parse(data);
}

let cached: ReturnType<typeof loadGameDataWeb> | null = null;

export function loadGameDataWeb() {
  if (cached) return cached;
  cached = {
    components: parseArray(componentsJson, ComponentSchema),
    scenarios: parseArray(scenariosJson, ScenarioSchema),
    jokers: parseArray(jokersJson, JokerSchema),
    events: parseArray(eventsJson, EventSchema),
    patterns: parseArray(patternsJson, PatternSchema),
    superPatterns: parseArray(superPatternsJson, SuperPatternSchema),
    schools: parseArray(schoolsJson, SchoolSchema),
    bossRules: parseArray(bossRulesJson, BossRuleSchema),
    tarots: parseArray(tarotsJson, TarotSchema),
  };
  return cached;
}

export type GameData = ReturnType<typeof loadGameDataWeb>;
```

**Step 2: Verify** — import it in App.tsx temporarily:

```tsx
import { loadGameDataWeb } from '../data/loader-web';
const data = loadGameDataWeb();
console.log('Loaded', data.components.length, 'components');
```

Run `npm run dev:web`, check browser console shows "Loaded 42 components".

Remove the temporary import after verification.

**Step 3: Commit**

```bash
git add src/data/loader-web.ts && git commit -m "feat: add browser-compatible game data loader"
```

---

### Task 3: Zustand Game Store

**Files:**
- Create: `src/web/store/gameStore.ts`
- Create: `src/web/store/types.ts`

**Context:** The store is the ONLY layer that imports from `engine/`. It wraps engine functions and manages screen transitions. Components access state via `useGameStore()` hook.

**Step 1: Create `src/web/store/types.ts`**

```typescript
export type Screen =
  | 'title'
  | 'draft'
  | 'blindSelect'
  | 'play'
  | 'settlement'
  | 'shop'
  | 'gameOver';
```

**Step 2: Create `src/web/store/gameStore.ts`**

This is the core file. It wraps ALL engine interactions.

```typescript
import { create } from 'zustand';
import { loadGameDataWeb, type GameData } from '../../data/loader-web.js';
import { createGameState, type GameState } from '../../engine/state.js';
import { generateDraftChoices, applyDraftChoice } from '../../engine/draft.js';
import { runPhase, type PhaseSettlement } from '../../engine/phase-runner.js';
import { validateDeployment } from '../../engine/deploy.js';
import { computeRiskExposure, type RiskReport } from '../../engine/risk.js';
import { selectEvents, rollTarotDropFromEvent } from '../../engine/event-selection.js';
import {
  generateShopInventory,
  buyComponent,
  sellComponent,
  buyJoker,
  sellJoker,
  buyTarot,
  removeComponent,
  calculatePhaseReward,
  calculateInterest,
  type ShopInventory,
} from '../../engine/shop.js';
import { applySchoolFreeComponents, applyVibeCodingStartBonuses } from '../../engine/joker-specials.js';
import { detectPatterns } from '../../engine/patterns.js';
import type { Component, Joker, Tarot, Event, School, Phase } from '../../schemas/index.js';
import type { Panel } from '../../engine/scoring.js';
import type { Screen } from './types.js';

function getBaseline(school: School): Panel {
  const ov = (school.modifiers.baseline_overrides ?? {}) as Record<string, number>;
  return { perf: ov.perf ?? 2, rel: ov.rel ?? 2, cx: ov.cx ?? 2 };
}

interface GameStore {
  // ── Data ──
  gameData: GameData;
  gameState: GameState | null;
  currentScreen: Screen;

  // ── Draft ──
  draftRound: number;
  draftChoices: Component[];

  // ── Play ──
  selectedForDeploy: string[]; // component IDs toggled for deploy
  riskPreview: RiskReport | null;
  patternPreview: string[];    // triggered pattern names
  currentEvents: Event[];
  settlement: PhaseSettlement | null;

  // ── Shop ──
  shopInventory: ShopInventory | null;

  // ── Actions ──
  startGame(schoolId: string, scenarioId: string): void;
  generateDraft(): void;
  pickDraftComponent(component: Component): void;
  finishDraft(): void;

  skipBlind(): void;
  startPlay(): void;
  toggleDeploy(componentId: string): void;
  updatePreview(): void;
  runCurrentPhase(): void;

  continueAfterSettlement(): void;

  openShop(): void;
  shopBuyComponent(component: Component): void;
  shopSellComponent(component: Component): void;
  shopBuyJoker(joker: Joker): void;
  shopSellJoker(joker: Joker): void;
  shopBuyTarot(tarot: Tarot): void;
  shopRemoveComponent(component: Component): void;
  closeShop(): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ── Initial state ──
  gameData: loadGameDataWeb(),
  gameState: null,
  currentScreen: 'title',
  draftRound: 0,
  draftChoices: [],
  selectedForDeploy: [],
  riskPreview: null,
  patternPreview: [],
  currentEvents: [],
  settlement: null,
  shopInventory: null,

  // ── Actions ──

  startGame(schoolId, scenarioId) {
    const { gameData } = get();
    const school = gameData.schools.find(s => s.id === schoolId)!;
    const scenario = gameData.scenarios.find(s => s.id === scenarioId)!;
    const state = createGameState(scenario, school);
    applySchoolFreeComponents(state, gameData.components);
    applyVibeCodingStartBonuses(state, gameData.jokers, gameData.tarots);
    set({ gameState: state, currentScreen: 'draft', draftRound: 0 });
    get().generateDraft();
  },

  generateDraft() {
    const { gameData, gameState } = get();
    if (!gameState) return;
    const options = gameState.school.modifiers.draft_options ?? 3;
    const choices = generateDraftChoices(gameData.components, options);
    set(s => ({ draftChoices: choices, draftRound: s.draftRound + 1 }));
  },

  pickDraftComponent(component) {
    const { gameState, draftRound } = get();
    if (!gameState) return;
    applyDraftChoice(gameState, component);
    const totalRounds = gameState.school.modifiers.draft_rounds;
    if (draftRound >= totalRounds) {
      set({ gameState: { ...gameState }, currentScreen: 'blindSelect', draftChoices: [] });
    } else {
      set({ gameState: { ...gameState }, draftChoices: [] });
      get().generateDraft();
    }
  },

  finishDraft() {
    set({ currentScreen: 'blindSelect' });
  },

  skipBlind() {
    const { gameState } = get();
    if (!gameState) return;
    const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
    gameState.phaseResults.push({
      blind: phase.blind,
      score: 0,
      targetScore: phase.target_score,
      passed: false,
      skipped: true,
    });
    gameState.currentPhaseIndex++;
    if (gameState.currentPhaseIndex >= 3) {
      set({ gameState: { ...gameState }, currentScreen: 'gameOver' });
    } else {
      set({ gameState: { ...gameState }, currentScreen: 'blindSelect' });
    }
  },

  startPlay() {
    set({ currentScreen: 'play', selectedForDeploy: [], riskPreview: null, patternPreview: [], settlement: null });
  },

  toggleDeploy(componentId) {
    set(s => {
      const selected = s.selectedForDeploy.includes(componentId)
        ? s.selectedForDeploy.filter(id => id !== componentId)
        : [...s.selectedForDeploy, componentId];
      return { selectedForDeploy: selected };
    });
    // Trigger preview update after state change
    setTimeout(() => get().updatePreview(), 0);
  },

  updatePreview() {
    const { gameState, gameData, selectedForDeploy } = get();
    if (!gameState) return;
    const deployed = gameState.componentPool.filter(c => selectedForDeploy.includes(c.id));
    const riskPreview = computeRiskExposure(deployed);
    const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
    const patternPreview = detectPatterns(deployedTags, gameData.patterns).map(p => p.name);
    set({ riskPreview, patternPreview });
  },

  runCurrentPhase() {
    const { gameState, gameData, selectedForDeploy } = get();
    if (!gameState) return;
    const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
    const deployed = gameState.componentPool.filter(c => selectedForDeploy.includes(c.id));

    // Select events
    const eventCount = phase.blind === 'boss' ? 2 : 1;
    const events = selectEvents(gameData.events, phase.event_pool_severity, eventCount);

    // Look up boss rule
    const bossRuleId = phase.boss_rule;
    const bossRule = bossRuleId
      ? gameData.bossRules.find(br => br.id === bossRuleId || br.id === `boss_${bossRuleId}`)
      : undefined;

    const settlement = runPhase({
      phase,
      deployed,
      school: gameState.school,
      baseline: getBaseline(gameState.school),
      jokers: gameState.jokerSlots,
      patterns: gameData.patterns,
      superPatterns: gameData.superPatterns,
      events,
      bossRule,
    });

    // Record result
    gameState.phaseResults.push({
      blind: phase.blind,
      score: settlement.finalScore,
      targetScore: settlement.targetScore,
      passed: settlement.passed,
      skipped: false,
    });

    // Gold reward
    const reward = calculatePhaseReward(settlement.passed, phase.blind);
    gameState.gold += reward;

    // Tarot drops
    for (const evt of events) {
      if (rollTarotDropFromEvent(evt.severity)) {
        const shuffled = [...gameData.tarots].sort(() => Math.random() - 0.5);
        if (shuffled[0] && gameState.tarotHand.length < gameState.tarotHandMax) {
          gameState.tarotHand.push(shuffled[0]);
        }
      }
    }

    set({
      gameState: { ...gameState },
      settlement,
      currentEvents: events,
      currentScreen: 'settlement',
    });
  },

  continueAfterSettlement() {
    const { gameState } = get();
    if (!gameState) return;
    gameState.currentPhaseIndex++;
    if (gameState.currentPhaseIndex >= 3) {
      set({ gameState: { ...gameState }, currentScreen: 'gameOver' });
    } else {
      // Shop after Small and Big blinds (phases 0 and 1)
      if (gameState.currentPhaseIndex <= 2) {
        get().openShop();
      } else {
        set({ gameState: { ...gameState }, currentScreen: 'blindSelect' });
      }
    }
  },

  openShop() {
    const { gameState, gameData } = get();
    if (!gameState) return;
    const interest = calculateInterest(gameState.gold);
    gameState.gold += interest;
    const inventory = generateShopInventory(
      gameData.components,
      gameData.jokers,
      gameData.tarots,
      gameState.componentPool.map(c => c.id),
      gameState.jokerSlots.map(j => j.id),
    );
    set({ gameState: { ...gameState }, shopInventory: inventory, currentScreen: 'shop' });
  },

  shopBuyComponent(component) {
    const { gameState } = get();
    if (!gameState) return;
    buyComponent(gameState, component);
    set({ gameState: { ...gameState } });
  },

  shopSellComponent(component) {
    const { gameState } = get();
    if (!gameState) return;
    sellComponent(gameState, component);
    set({ gameState: { ...gameState } });
  },

  shopBuyJoker(joker) {
    const { gameState } = get();
    if (!gameState) return;
    buyJoker(gameState, joker);
    set({ gameState: { ...gameState } });
  },

  shopSellJoker(joker) {
    const { gameState } = get();
    if (!gameState) return;
    sellJoker(gameState, joker);
    set({ gameState: { ...gameState } });
  },

  shopBuyTarot(tarot) {
    const { gameState } = get();
    if (!gameState) return;
    buyTarot(gameState, tarot);
    set({ gameState: { ...gameState } });
  },

  shopRemoveComponent(component) {
    const { gameState } = get();
    if (!gameState) return;
    removeComponent(gameState, component);
    set({ gameState: { ...gameState } });
  },

  closeShop() {
    set({ currentScreen: 'blindSelect', shopInventory: null });
  },
}));
```

**Step 3: Verify** — import in App.tsx:

```tsx
import { useGameStore } from './store/gameStore';
export default function App() {
  const { gameData, currentScreen } = useGameStore();
  return <div className="min-h-screen bg-gray-900 text-white p-8">
    <p>Screen: {currentScreen}</p>
    <p>Components: {gameData.components.length}</p>
    <p>Schools: {gameData.schools.map(s => s.name).join(', ')}</p>
  </div>;
}
```

Run `npm run dev:web`. Verify data loads and renders.

**Step 4: Commit**

```bash
git add src/web/store/ && git commit -m "feat: add Zustand game store with engine integration"
```

---

### Task 4: App Shell + Screen Router

**Files:**
- Modify: `src/web/App.tsx`
- Create: `src/web/screens/TitleScreen.tsx` (placeholder)
- Create: `src/web/screens/DraftScreen.tsx` (placeholder)
- Create: `src/web/screens/BlindSelectScreen.tsx` (placeholder)
- Create: `src/web/screens/PlayScreen.tsx` (placeholder)
- Create: `src/web/screens/SettlementScreen.tsx` (placeholder)
- Create: `src/web/screens/ShopScreen.tsx` (placeholder)
- Create: `src/web/screens/GameOverScreen.tsx` (placeholder)

**Step 1: Create placeholder screens** — each screen exports a component with its name displayed. Example:

```tsx
// src/web/screens/TitleScreen.tsx
export default function TitleScreen() {
  return <div className="flex items-center justify-center h-full">
    <h2 className="text-3xl">Title Screen</h2>
  </div>;
}
```

Create all 7 screens as placeholders.

**Step 2: Update `App.tsx`** with screen-switching:

```tsx
import { useGameStore } from './store/gameStore';
import TitleScreen from './screens/TitleScreen';
import DraftScreen from './screens/DraftScreen';
import BlindSelectScreen from './screens/BlindSelectScreen';
import PlayScreen from './screens/PlayScreen';
import SettlementScreen from './screens/SettlementScreen';
import ShopScreen from './screens/ShopScreen';
import GameOverScreen from './screens/GameOverScreen';

function ScreenRouter() {
  const currentScreen = useGameStore(s => s.currentScreen);
  switch (currentScreen) {
    case 'title': return <TitleScreen />;
    case 'draft': return <DraftScreen />;
    case 'blindSelect': return <BlindSelectScreen />;
    case 'play': return <PlayScreen />;
    case 'settlement': return <SettlementScreen />;
    case 'shop': return <ShopScreen />;
    case 'gameOver': return <GameOverScreen />;
  }
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ScreenRouter />
    </div>
  );
}
```

**Step 3: Verify** — `npm run dev:web` shows "Title Screen".

**Step 4: Commit**

```bash
git add src/web/ && git commit -m "feat: add app shell with screen router"
```

---

## Phase 2: Shared UI (Tasks 5-6)

### Task 5: Design Tokens + Global Styles

**Files:**
- Modify: `src/web/styles/globals.css`
- Create: `src/web/styles/felt-texture.css`

**Context:** Balatro aesthetic = dark green felt, neon amber/cyan scores, card shadows, monospace numbers. Use CSS variables for the theme. The felt texture is a CSS noise pattern (no image files needed).

**Design tokens to implement:**

```css
:root {
  /* Felt & background */
  --color-felt: #1a472a;
  --color-felt-dark: #0f2d1a;
  --color-surface: #1a1a2e;
  --color-surface-light: #252542;

  /* Neon scores */
  --color-chips: #f5a623;
  --color-mult: #e74c3c;
  --color-gold: #ffd700;

  /* Card borders by type */
  --color-functional: #2ecc71;
  --color-defensive: #3498db;
  --color-rare: #f1c40f;
  --color-uncommon: #9b59b6;

  /* Panel dimensions */
  --color-perf: #e74c3c;
  --color-rel: #3498db;
  --color-cx: #9b59b6;

  /* Text */
  --color-text: #e8e8e8;
  --color-text-muted: #8a8a8a;
}
```

**Fonts:** Import via Google Fonts in index.html:
- Display/scores: `JetBrains Mono` (monospace, bold, for numbers/scores)
- UI text: `Noto Sans SC` (Chinese + Latin support)

**Background:** CSS noise pattern layered over `--color-felt` gradient.

**Step 1:** Update `globals.css` with the design tokens, base styles, utility classes.

**Step 2:** Create felt texture CSS using `background-image` radial gradient noise approximation.

**Step 3:** Add Google Fonts link to `index.html`.

**Step 4: Verify** — background shows felt texture, fonts load.

**Step 5: Commit**

```bash
git add src/web/styles/ index.html && git commit -m "feat: add design tokens and felt-texture background"
```

---

### Task 6: Shared Card & Panel Components

**Files:**
- Create: `src/web/components/ComponentCard.tsx`
- Create: `src/web/components/JokerCard.tsx`
- Create: `src/web/components/TarotCard.tsx`
- Create: `src/web/components/ScorePanel.tsx`
- Create: `src/web/components/GoldDisplay.tsx`
- Create: `src/web/components/PatternBadge.tsx`
- Create: `src/web/components/RiskBadge.tsx`

**Context:** All components are PRESENTATIONAL — they receive data via props and render it. They never import from `engine/`. They use Tailwind + CSS variables for styling.

Key component specs:

**ComponentCard** — The main visual element. Shows:
- Name (top)
- Tags as small pills
- Delta values (perf/rel/cx) with signed coloring
- Capacity cost badge (bottom-right)
- Border color by rarity (common=gray, uncommon=purple, rare=gold)
- Category indicator (functional=green dot, defensive=blue dot)
- Selected state (glow + scale)
- Use `framer-motion` for hover lift and select animation

```tsx
interface ComponentCardProps {
  component: Component;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}
```

**JokerCard** — Horizontal card showing name, multiplier (x1.2), condition summary, active/inactive state.

**TarotCard** — Similar to component card but with different visual treatment (mystical/dark theme).

**ScorePanel** — Left sidebar panel showing:
- Chips value (amber)
- Mult value (red)
- Target score
- Current final score

**GoldDisplay** — `$XX` in gold color with coin icon (emoji or CSS).

**PatternBadge** — Pill showing triggered pattern name with green glow.

**RiskBadge** — Pill showing risk name, red=exposed, green=sealed.

**Step 1:** Create each component file with Tailwind styling.

**Step 2: Verify** — temporarily render sample cards in `TitleScreen.tsx` to check visual appearance.

**Step 3: Commit**

```bash
git add src/web/components/ && git commit -m "feat: add shared card and panel components"
```

---

## Phase 3: Screens (Tasks 7-12)

### Task 7: Title Screen

**Files:**
- Modify: `src/web/screens/TitleScreen.tsx`

**Context:** Two-step selection: School → Scenario. Use the data from store. Call `startGame(schoolId, scenarioId)` when both are selected.

**Layout:**
- Game title at top
- School cards in a grid (click to select, shows description + modifiers)
- After school selected, show Scenario cards (name, desc, 3 phase previews)
- Start button when both selected

**Step 1:** Implement with school/scenario selection state.

**Step 2:** Wire up `startGame` action.

**Step 3: Verify** — select school → scenario → start transitions to Draft screen.

**Step 4: Commit**

```bash
git add src/web/screens/TitleScreen.tsx && git commit -m "feat: add title screen with school and scenario selection"
```

---

### Task 8: Draft Screen

**Files:**
- Modify: `src/web/screens/DraftScreen.tsx`

**Context:** Shows `draftChoices` (2-3 ComponentCards). Player clicks one → `pickDraftComponent()`. Round counter shows progress. After final round, auto-transitions to BlindSelect.

**Layout:**
- Round counter: "Draft Round 3/10"
- 3 (or 2 for Vibe Coding) component cards in a row, use `framer-motion` `AnimatePresence` for card entrance
- Component pool display at bottom showing already-drafted cards (smaller)
- Clicking a card triggers selection animation → pool update

**Step 1:** Implement draft screen.

**Step 2: Verify** — draft all rounds, verify pool grows, transitions to blind select.

**Step 3: Commit**

```bash
git add src/web/screens/DraftScreen.tsx && git commit -m "feat: add draft screen"
```

---

### Task 9: Blind Selection Screen

**Files:**
- Modify: `src/web/screens/BlindSelectScreen.tsx`

**Context:** Shows 3 phase cards (Small/Big/Boss). Current phase highlighted. For skippable phases, shows a skip button with reward preview.

**Layout (from Balatro image-1):**
- Left: score summary / run info
- Center: 3 blind cards arranged horizontally
  - Dim the ones already played or not yet reachable
  - Current one is bright + animated
  - Shows: blind type, subtitle, target score, capacity budget, weights
  - Boss card shows boss rule warning in red
- Bottom: "Play" and "Skip" buttons (Skip only if `phase.skippable`)

**Step 1:** Implement blind select screen.

**Step 2: Verify** — current blind highlighted, clicking Play goes to PlayScreen, clicking Skip advances.

**Step 3: Commit**

```bash
git add src/web/screens/BlindSelectScreen.tsx && git commit -m "feat: add blind selection screen"
```

---

### Task 10: Play Screen (Main)

**Files:**
- Modify: `src/web/screens/PlayScreen.tsx`
- Create: `src/web/components/DeployZone.tsx`
- Create: `src/web/components/HandZone.tsx`
- Create: `src/web/components/TopBar.tsx`

**Context:** This is the most complex screen. Follows the layout from the design doc. Player selects components from hand to deploy, sees live preview of risk/patterns, then clicks "Run Phase".

**Layout:**
```
+--------------------------------------------------+
| TopBar: [Jokers] [Phase: Big Blind] [Gold: $22]  |
+--------------+-----------------------------------+
| ScorePanel   | DeployZone (selected cards)        |
|  Chips: --   |                                    |
|  Mult: --    +------------------------------------+
|  Target: 48  | HandZone (pool cards, click=toggle) |
|              |                                    |
| PatternBadges| [Run Phase]                        |
| RiskBadges   |                                    |
+--------------+------------------------------------+
```

**Key behavior:**
- Clicking a card in HandZone calls `toggleDeploy(componentId)` and `updatePreview()`
- Selected cards appear in DeployZone (top) and are dimmed in HandZone
- ScorePanel shows live capacity usage, risk preview, pattern preview
- "Run Phase" button calls `runCurrentPhase()`, transitions to Settlement

**Step 1:** Create TopBar, DeployZone, HandZone components.

**Step 2:** Implement PlayScreen layout.

**Step 3: Verify** — toggle components between hand/deploy, see live preview, run phase.

**Step 4: Commit**

```bash
git add src/web/screens/PlayScreen.tsx src/web/components/ && git commit -m "feat: add play screen with deploy mechanics"
```

---

### Task 11: Settlement Screen

**Files:**
- Modify: `src/web/screens/SettlementScreen.tsx`

**Context:** Shows the `PhaseSettlement` result from the store. Animated score breakdown. Display: panel values → chips → mult → penalties → final score. Pass/fail with target comparison.

**Layout:**
- Center: large score display with animated counter
- Left column: Panel (Perf / Rel / Cx bars)
- Right column: Chips × Mult formula breakdown
- Bottom: triggered patterns, super patterns, event results
- Large PASS/FAIL indicator
- "Continue" button → calls `continueAfterSettlement()`

**Key animations** (framer-motion):
- Score counter ticks up from 0 to final
- Pattern badges fade in sequentially
- Pass/fail stamp animation

**Step 1:** Implement settlement screen.

**Step 2: Verify** — after running a phase, see settlement breakdown, click Continue.

**Step 3: Commit**

```bash
git add src/web/screens/SettlementScreen.tsx && git commit -m "feat: add settlement screen with score breakdown"
```

---

### Task 12: Shop Screen

**Files:**
- Modify: `src/web/screens/ShopScreen.tsx`

**Context:** Shows `shopInventory` from store. Player can buy/sell components, jokers, tarots. Shows gold balance. "Next Round" button advances to next blind.

**Layout (from Balatro image-2):**
- Left sidebar: Gold display, inventory count, interest earned
- Top row: Joker + Tarot cards for sale (with prices)
- Bottom row: Component cards for sale (with prices)
- Below inventory: "Sell" section with owned items
- Bottom: "Next Round" button → calls `closeShop()`

**Step 1:** Implement shop screen.

**Step 2: Verify** — buy/sell items, gold updates, close shop advances to next blind.

**Step 3: Commit**

```bash
git add src/web/screens/ShopScreen.tsx && git commit -m "feat: add shop screen"
```

---

### Task 13: Game Over Screen + Full Flow Polish

**Files:**
- Modify: `src/web/screens/GameOverScreen.tsx`
- Modify: `src/web/App.tsx` (add AnimatePresence for screen transitions)

**Context:** Show final results: 3 phase outcomes, Victory/Defeat. "Play Again" button resets to title.

**Step 1:** Implement GameOverScreen.

**Step 2:** Add `AnimatePresence` wrapper in App.tsx for screen transition fade.

**Step 3:** Full playthrough test: Title → Draft → Blind → Play → Settlement → Shop → ... → GameOver.

**Step 4: Commit**

```bash
git add src/web/ && git commit -m "feat: add game over screen and screen transition animations"
```

---

## Dependency Graph

```
Task 1 (Vite setup) → Task 2 (web loader) → Task 3 (Zustand store) → Task 4 (app shell)
                                                                          ↓
                                                Task 5 (design tokens) → Task 6 (shared components)
                                                                          ↓
                                        Task 7 (title) → Task 8 (draft) → Task 9 (blind select)
                                                                          ↓
                                        Task 10 (play) → Task 11 (settlement) → Task 12 (shop)
                                                                          ↓
                                                                    Task 13 (game over + polish)
```

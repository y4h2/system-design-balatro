# Web UI Design: System Design Card Game

## Goal

Build a Balatro-inspired web UI for the existing CLI card game. The game engine (`src/engine/`) is pure TypeScript with no UI coupling — the web UI wraps it with React.

## Aesthetic Direction: "Neon Poker Table"

- Dark green felt background with noise texture
- Glowing neon score counters (chips x mult in amber/cyan)
- Component cards styled as architecture diagram tiles with mini-icons
- Color coding: functional = green border, defensive = blue, rare = gold shimmer
- Bold monospace display font for scores, clean sans-serif for card text
- Card animations: deal/fan, deploy slide-up, score tick-up, pattern trigger flash

## Architecture

```
src/engine/          <- Pure game logic (UNCHANGED, zero web dependencies)
src/web/
  store/             <- Zustand store: thin wrapper around engine functions
  hooks/             <- React hooks for UI concerns (animations, timers)
  components/        <- Presentational components (Card, ScorePanel, etc.)
  screens/           <- Screen compositions (PlayScreen, ShopScreen, etc.)
  layouts/           <- Shared layout shells
  assets/            <- Icons, fonts, textures
```

### Logic/UI Separation

The Zustand store is the only layer that imports from `engine/`. React components never call engine functions directly.

```
[React Component] -> useGameStore() -> [Zustand Store] -> engine/*.ts
```

### Screen Navigation

State-machine driven, no router. A single `currentScreen` field in the store controls which screen renders.

```typescript
type Screen = 'title' | 'draft' | 'blindSelect' | 'play' | 'settlement' | 'shop';
```

## Screens

### 1. Title Screen
- School selection (6 schools with descriptions)
- Scenario selection (3 scenarios with phase previews)
- Start button

### 2. Draft Screen
- Shows 3 (or 2 for Vibe Coding) component cards per round
- Player picks 1, it animates into the pool
- Round counter (e.g., "Round 3/10")
- Running pool display at bottom

### 3. Blind Selection Screen
- Shows 3 phases: Small / Big / Boss
- Current phase highlighted, target score + rewards shown
- Skip button with skip reward preview (for skippable phases)
- Boss rule warning on boss phase

### 4. Play Screen (Main)
```
+--------------------------------------------------+
| [Joker Slots]           [Phase Info]    [Gold: $] |
+--------------+-----------------------------------+
|              |                                    |
|  Score       |   Deploy Zone                      |
|  Panel       |   (deployed component cards)       |
|              |                                    |
|  Chips: 12   |                                    |
|  Mult: x5    |------------------------------------+
|  ----------  |                                    |
|  Target: 48  |   Component Pool (hand)            |
|              |   (selectable cards, drag/click)    |
|  [Patterns]  |                                    |
|  [Risks]     |   [Deploy] [Undeploy] [Run Phase]  |
+--------------+------------------------------------+
```

- Left sidebar: score panel, triggered patterns, risk report
- Center top: deployed cards
- Center bottom: hand (component pool), action buttons
- Top bar: joker slots, phase info, gold
- Tarot button (use before/after deploy)

### 5. Settlement Screen
- Animated score breakdown (panel -> chips -> mult -> penalties -> final)
- Pass/fail result with target comparison
- Triggered patterns and super patterns highlighted
- Event result (if any)
- "Continue" or "Repair" button

### 6. Shop Screen
- Top row: joker/tarot cards for sale
- Bottom row: component cards for sale
- Left sidebar: gold, inventory summary
- Buy/sell/remove actions
- Reroll button
- "Next Round" button

## State Management (Zustand)

```typescript
interface GameStore {
  // Data
  gameData: GameData | null;
  gameState: GameState | null;
  currentScreen: Screen;

  // Phase
  draftChoices: Component[];
  selectedForDeploy: Component[];
  settlement: PhaseSettlement | null;
  currentEvent: Event | null;

  // Shop
  shopInventory: ShopInventory | null;

  // Actions
  init(): void;
  selectSchoolAndScenario(schoolId: string, scenarioId: string): void;
  generateDraft(): void;
  pickDraftComponent(component: Component): void;
  toggleDeployComponent(component: Component): void;
  runPhase(): void;
  repair(component: Component): void;
  skipBlind(): void;
  openShop(): void;
  buyComponent(component: Component): void;
  sellComponent(component: Component): void;
  buyJoker(joker: Joker): void;
  sellJoker(joker: Joker): void;
  buyTarot(tarot: Tarot): void;
  useTarot(tarotIndex: number): void;
  removeComponent(component: Component): void;
  nextPhase(): void;
}
```

## Tech Stack

- React 19 + Vite
- Zustand (state)
- Tailwind CSS v4 (styling)
- Framer Motion (card animations)
- No router needed

## Component Hierarchy

```
App
  TitleScreen
    SchoolCard
    ScenarioCard
  DraftScreen
    DraftChoiceCard
    ComponentPoolPreview
  BlindSelectScreen
    BlindCard (x3)
  PlayScreen
    TopBar (JokerSlots, PhaseInfo, GoldDisplay)
    ScorePanel (ChipsDisplay, MultDisplay, PatternList, RiskReport)
    DeployZone (ComponentCard[])
    HandZone (ComponentCard[], ActionButtons)
    TarotButton
  SettlementScreen
    ScoreBreakdown
    EventResultPanel
    PatternHighlights
  ShopScreen
    ShopItemRow (jokers/tarots)
    ShopItemRow (components)
    ShopSidebar (gold, inventory)
```

## Key Presentational Components

- **ComponentCard** — shows name, tags, delta (perf/rel/cx), capacity cost, rarity border color
- **JokerCard** — shows name, condition summary, multiplier, active/inactive state
- **TarotCard** — shows name, effect description
- **ScorePanel** — chips x mult with animated counters
- **PatternBadge** — triggered pattern with glow effect
- **RiskBadge** — exposed/sealed risk indicators

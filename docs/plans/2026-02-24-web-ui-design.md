# Web UI Design: System Design Card Game

## Goal

Build a Balatro-inspired web UI for the existing CLI card game. The game engine (`src/engine/`) is pure TypeScript with no UI coupling — the web UI wraps it with React.

## Aesthetic Direction: "Neon Poker Table"

- Dark green felt background with noise texture
- Glowing neon score counters (chips x mult in amber/cyan)
- Component cards styled as poker-style cards with technology brand icons
- Color coding by domain: compute=blue, data=green, network=amber, defense=red, platform=purple
- Bold monospace display font for scores, clean sans-serif for card text
- Card animations: fan arc, deploy slide-up, score tick-up, pattern trigger flash

## Architecture

```
src/engine/          <- Pure game logic (UNCHANGED, zero web dependencies)
src/web/
  store/             <- Zustand store: thin wrapper around engine functions
  icons/             <- Icon mappings (Iconify card icons, domain suits)
  components/        <- Presentational components (Card, ScorePanel, etc.)
  screens/           <- Screen compositions (PlayScreen, ShopScreen, etc.)
```

### Logic/UI Separation

The Zustand store is the only layer that imports from `engine/`. React components never call engine functions directly.

```
[React Component] -> useGameStore() -> [Zustand Store] -> engine/*.ts
```

### Screen Navigation

State-machine driven, no router. A single `currentScreen` field in the store controls which screen renders.

```typescript
type Screen = 'title' | 'blindSelect' | 'play' | 'settlement' | 'shop' | 'gameOver';
```

## Card Design

### Component Card (160×240px)

Poker-style layout with technology brand icons from Iconify API:

```
┌─────────────────────┐
│ 🔵 COMPUTE          │  ← Domain suit icon + domain label
│                     │
│    ┌───────────┐    │
│    │  [BRAND]  │    │  ← Center: brand logo (48px)
│    │   LOGO    │    │     e.g. logos:aws-ec2, devicon:redis
│    └───────────┘    │
│                     │
│      EC2 实例       │  ← Card name (centered)
│    compute  async   │  ← Tags (fixed 2-row height)
│                     │
│  +3 筹码 P+1 R+0    │  ← Stats: chips + delta values
│  容量: 8            │  ← Footer: capacity cost + price
│                  🔵 │  ← Bottom-right: domain suit (faded)
└─────────────────────┘
```

- **Domain icons** (corner suits): Lucide icons colored per domain
- **Brand icons** (center): Iconify API — `logos:*`, `devicon:*`, `mdi:*`, `lucide:*`
- **Rarity**: Indicated by border glow (common/uncommon/rare)
- **Sizes**: md=160×240px, sm=120×160px — all cards uniform

### Joker Card (160×240px)

Same dimensions as component cards. Shows name, multiplier, description.

### Tarot Card (160×240px)

Same dimensions as component cards. Shows name, type badge (reveal/modify), description.

### Icon Mapping

- **File**: `src/web/icons/cardIcons.ts`
- `domainIcons` — 5 domain suit icons (lucide)
- `domainColors` — domain color palette
- `cardIcons` — brand icon per card ID (60 cards mapped)
- `getCardIconUrl()` — builds Iconify REST API URL

### Icon Components

- `CardIcon.tsx` — renders `<img>` from Iconify API, fallback on error
- `DomainSuit.tsx` — small domain suit icon with color + glow

## Screens

### 1. Title Screen
- School selection with descriptions
- Scenario selection with phase previews
- Start button

### 2. Blind Selection Screen
- Shows 3 phases: Small / Big / Boss
- Current phase highlighted, target score + rewards shown
- Skip button for skippable phases
- Boss rule warning on boss phase

### 3. Play Screen (Main)

```
┌──────────┬──────────────────────────────────────────────┐
│          │  [Joker Slots]            [Tarot Slots →]    │
│  Score   │  (160×240 each)           (160×240, right)   │
│  Panel   ├──────────────────────────────────────────────┤
│  (w-80)  │                                              │
│          │  Deploy Zone (deployed cards)                 │
│ ┌──────┐ │                                              │
│ │Blind │ ├──────────────────────────────────────┬───────┤
│ │Info  │ │                                      │       │
│ └──────┘ │  Hand Zone (fan arc layout)          │ Deck  │
│          │  ╭─ ─ ─ ─ ─ ─ ─ ─ ─ ─╮             │ Pile  │
│ P R CX   │  │ cards with arc     │             │       │
│ Chips    │  │ rotation, overlap,  │             │       │
│ ×        │  │ selected pop up    │              │       │
│ Mult     │  ╰─ ─ ─ ─ ─ ─ ─ ─ ─ ─╯             │       │
│ Score    │                                      │       │
│ Target   │  [ 弃牌 (n/5) [3] ]  [ 出牌 (n/5) ] │       │
│          │                                      │       │
│ Gold     ├──────────────────────────────────────┴───────┤
│ Hand/弃  │                                              │
│ Constr.  │                                              │
│ Patterns │                                              │
└──────────┴──────────────────────────────────────────────┘
```

#### Layout Details

- **Left sidebar** (w-80 = 320px):
  - Blind info (highlighted box at top of ScorePanel)
  - Score panel: P/R/CX bars, chips, mult, score, target
  - Gold display
  - Hand count / discard remaining
  - Constraints
  - Pattern preview

- **Top bar** (full width, col-span-2):
  - Joker slots (left, 160×240 each)
  - Tarot slots (right-aligned, 160×240 each)

- **Center**: Deploy zone → Hand zone → Action buttons

- **Hand zone** (Balatro-style fan):
  - Cards overlap horizontally (min 60px visible per card, fits 10 in ~900px)
  - Arc layout: cards rotate along a curve (±10° spread, cos-based vertical offset)
  - Click to select → card pops up 30px (stays in fan)
  - Hover → card lifts 16px, z-index 200 (keeps rotation)
  - Selected cards have z-index 100+ (above unselected)

- **Action buttons**:
  - **弃牌** (discard): max 5 cards per action, shows `(selected/5) [remaining]`
  - **出牌** (deploy): max deploy-slots cards, shows `(selected/max)` — immediately runs phase and goes to settlement

- **No separate discard zone** — all interaction happens in the hand

### 4. Settlement Screen
- Animated score breakdown (panel → chips → mult → penalties → final)
- Pass/fail result with target comparison
- Triggered patterns and super patterns highlighted
- "Continue" button

### 5. Shop Screen
- Top row: joker/tarot cards for sale
- Bottom row: component cards for sale
- Left sidebar: gold, inventory summary
- Buy/sell actions
- "Next Round" button

### 6. Game Over Screen
- Final results: phases passed, scores
- "Play Again" button

## State Management (Zustand)

```typescript
interface GameStore {
  // Data
  gameData: GameData;
  gameState: GameState | null;
  currentScreen: Screen;

  // Play
  handState: HandState | null;
  selectedForDeploy: string[];   // cards in deploy zone
  selectedInHand: string[];      // cards selected (popped up) in hand
  patternPreview: string[];
  scorePreview: ScorePreview | null;
  settlement: PhaseSettlement | null;

  // Shop
  shopInventory: ShopInventory | null;

  // Actions
  startGame(schoolId, scenarioId): void;
  skipBlind(): void;
  startPlay(): void;
  toggleHandSelect(componentId): void;  // select/deselect in hand
  deploySelected(): void;               // deploy + run phase
  toggleDeploy(componentId): void;      // undeploy from deploy zone
  executeDiscard(): void;               // discard selected + draw
  updatePreview(): void;
  // ... shop actions, tarot, etc.
}
```

## Tech Stack

- React 19 + Vite
- Zustand (state)
- Tailwind CSS v4 (styling)
- Framer Motion (card animations)
- Iconify REST API (card icons — no npm package needed)
- @dnd-kit (drag and drop)
- No router needed

## Component Hierarchy

```
App
  TitleScreen
    SchoolCard, ScenarioCard
  BlindSelectScreen
    BlindCard (×3)
  PlayScreen
    ScorePanel (blind info, P/R/CX, chips, mult, score, target)
    GoldDisplay
    JokerCard[] + TarotCard[] (top bar)
    DeployZone → ComponentCard[]
    HandZone → DraggableCard[] (fan arc layout)
    DeckPile
    ActionButtons (弃牌 / 出牌)
  SettlementScreen
    ScoreBreakdown, PatternHighlights
  ShopScreen
    ShopItemRow (jokers/tarots/components)
    ShopSidebar (gold, inventory)
  GameOverScreen
```

## Key Components

- **ComponentCard** — poker-style card: domain suit icon, brand logo center, name, tags (2 rows fixed), stats, capacity. 160×240px uniform.
- **CardIcon** — renders Iconify API `<img>`, fallback on error
- **DomainSuit** — small domain icon (16px) with domain color
- **JokerCard** — 160×240px, name, multiplier, description
- **TarotCard** — 160×240px, name, type badge, description
- **HandZone** — fan arc layout with overlap, select-to-pop-up interaction
- **DeployZone** — shows deployed cards with animated enter/exit
- **ScorePanel** — blind info + chips × mult with animated counters
- **PatternBadge** — triggered pattern with glow effect

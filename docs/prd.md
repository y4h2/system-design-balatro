# System Design 小丑牌（Balatro-like）PRD v2

## 1. 背景与目标

### 1.1 背景
System Design 本质是「约束下的构建与取舍」。小丑牌（Balatro-like）的核心爽点是：
- **基础分 Chips**：打牌的"底子"
- **倍率 Mult**：通过组合/协同获得爆发
- **Joker**：组合引擎，多张 Joker 之间产生协同效应

本游戏将 System Design 设计成一套可重复游玩的卡牌策略游戏，让玩家在一局内反复经历：
**选流派 → Draft 组件 → 部署方案 → 被事件打脸 → 修补 → Shop 补强 → 下一阶段更难**。

每一局模拟同一个系统从 MVP 到生产级的演进过程，玩家在容量约束和风险暴露中反复做取舍。

### 1.2 产品目标
- 让玩家在「玩」的过程中掌握常见系统设计套路（缓存/削峰/高可用/可观测/合规/幂等等）。
- 提供可扩展的数据驱动卡牌与规则框架（JSON 牌库），便于持续迭代平衡与关卡扩展。
- 输出可解释的评审结论（类似"逆转裁判式论证链"），让玩家理解每次得分/扣分的原因。
- 提供"低门槛、高上限"的体验：新手能通过玩学到系统设计套路，老手能在策略深度中找到 build 乐趣。

### 1.3 非目标（Non-goals）
- 不追求完全还原 Balatro 的全部牌型与数值复杂度。
- 不追求 100% 真实世界建模（例如精确容量规划），先用可解释的抽象评分跑通体验。

---

## 2. 核心玩法概述

### 2.1 核心映射
- **Chips = 架构基本盘**：性能 Perf、可靠性 Rel、复杂度 Cx 三维面板
- **Mult = 组合增益**：通过牌型（系统设计套路）加法叠加 + 超级牌型阈值爆发 + Joker 小倍数
- **Joker = 组合引擎**：3-5 张 Joker 在 Shop 中收集，跨阶段保留，提供小倍数（×1.2~×1.5）
- **架构流派 = Balatro Deck**：开局选择，定义整局规则偏移（容量/槽位/修补次数等）
- **容量点数 = 资源预算**：取代传统 Cost 维度，每个组件消耗不同点数，总预算有限
- **风险暴露面 = 取舍代价**：每个组件在提供能力的同时暴露风险向量
- **Tarot = 一次性消耗品**：信息揭示（用户调研/竞品分析）或状态修改（技术 Spike/紧急扩容），手牌上限 2-3 张，用完即弃

### 2.2 三维评分面板
- **Perf（性能）**：吞吐、P99 延迟、热点抗性
- **Rel（可靠性）**：SLA、容灾、降级、背压
- **Cx（复杂度）**：认知负担、故障面、调试难度、演进难度

场景包的每个阶段为三维设置不同权重：
- `Chips = wP × Perf + wR × Rel - wX × Cx`

### 2.3 两层取舍张力
1. **容量点数**：组件消耗 6~25 不等的容量点，总预算有限且逐阶段递减。你想要的东西放不下，必须砍。
2. **风险暴露面**：每个组件暴露 1-2 个风险向量，事件会攻击特定风险。放进去也有代价，不存在"白拿"的组件。

---

## 3. 一局结构（15-20 分钟/局）

一局 = 1 个场景包，包含三个阶段，模拟同一系统的生命周期演进：

```
选架构流派 → 展示场景包（含三阶段需求 + Boss 规则预览）
  ↓
初始 Draft（构建组件池）
  ↓
Small Blind - MVP → [挑战] 或 [跳过: 获得 Tarot 奖励，但跳过 Shop 1]
  → 部署 → 风险报告 → 事件 → 修补 → 结算
  ↓
Shop 1（买卖组件 / Joker / Tarot）
  ↓
Big Blind - Beta → [挑战] 或 [跳过: 获得 Joker 直选，但跳过 Shop 2]
  → 部署 → 风险报告 → 事件 → 修补 → 结算
  ↓
Shop 2（买卖组件 / Joker / Tarot）
  ↓
Boss Blind - 生产压测（不可跳过）
  → 部署 → 风险报告 → 事件×2 → 修补 → 最终结算
```

### 3.1 开局：选架构流派 + 场景预览

玩家从可用流派中选择 1 个，贯穿整局。流派定义底层规则偏移（详见第 9 章）。

选定流派后，展示完整场景包信息，包括：
- 三个阶段的需求概要（subtitle、约束、权重）
- **Boss 规则始终可见**：玩家从开局就知道 Boss 阶段的特殊限制，可以提前规划

### 3.2 初始 Draft

组件牌 3 选 1，重复 N 次（默认 10 次，流派可调整），生成本局可用组件池 `componentPool`。

### 3.3 三阶段递进

每个阶段代表同一系统的不同生命周期：

- **Small Blind（MVP）**：容量预算宽裕，约束宽松，事件温和。先跑起来。
- **Big Blind（Beta）**：容量预算收紧，新增 SLA/合规约束，事件升级。用户开始付费了。
- **Boss Blind（生产压测）**：容量预算最紧，所有约束拉满，附加 Boss 规则，双事件打击。大促来了。**不可跳过。**

### 3.4 跳过 Blind（Skip）

玩家可以选择跳过 Small Blind 或 Big Blind（Boss 不可跳过）。跳过意味着：
- **不进行该阶段的部署和事件**（省时间、避风险）
- **同时跳过该阶段后的 Shop**（失去购买机会）
- **获得跳过奖励**：

| 跳过目标 | 奖励 | 设计意图 |
|---|---|---|
| Small Blind | 获得 2 张 Tarot（从 4 张中选 2） | 用情报/消耗品弥补失去的 Shop 机会 |
| Big Blind | 从全 Joker 牌库中直选 1 张（不受 Shop 随机限制） | 高价值奖励，但失去了 Beta 阶段的组件和经验积累 |

**策略取舍**：
- 跳过 Small → 省时间拿 Tarot，但 MVP 阶段没有磨合方案的机会，直接面对 Beta 的更高要求
- 跳过 Big → 拿到精准 Joker，但失去了 Beta 阶段的 Shop（买组件/Joker 的最后机会），且没有中间事件的修补经验
- 两个都跳 → 高风险高回报，2 张 Tarot + 1 张精选 Joker，但直接带着初始 Draft 的组件池硬刚 Boss

### 3.5 阶段间递进逻辑

- **容量预算递减**：MVP 宽裕 → Boss 紧缩
- **权重递进**：MVP 阶段 Rel 权重低（能用就行）→ Boss 阶段拉满（不能挂）
- **约束递增**：MVP 无合规要求 → Boss 要求 high compliance
- **事件烈度递增**：MVP severity 1-2 → Boss severity 4-5
- **组件池持续积累**：通过 Shop 购买新组件，组件库越来越大，但每阶段能部署的在变少
- **Boss 规则始终可见**：从开局就可以围绕 Boss 规则做长线规划

教学价值：MVP 时偷懒的决策会在 Boss 阶段变成技术债的代价。跳过阶段模拟了"跳过验证直接上线"的真实风险。

---

## 4. 单个阶段内的流程

```
1. 展示阶段需求（subtitle / 目标分 / 约束 / Boss 规则）
2. 从组件池中选组件部署（容量预算内）
3. 系统显示风险报告：
   ┌─ 风险报告 ────────────────────────┐
   │ 容量：62/100 已用                  │
   │ 当前牌型：读优化 ✓                 │
   │ 风险敞口：                         │
   │   ⚠ cache_avalanche (未封堵)       │
   │   ⚠ data_inconsistency (未封堵)    │
   │ 超级牌型距离：                      │
   │   铜墙铁壁 → 还需封堵 2 个风险      │
   │   刀尖跳舞 → 还需 1 个风险敞口      │
   └────────────────────────────────────┘
4. 触发事件（Boss 阶段触发 2 次）
5. 每次事件后允许 1 次修补动作（流派可调整次数）：
   a) 替换 1 张组件（退回容量，换入新组件）
   b) 加入 1 张封堵组件（消耗容量）
   c) 不操作
6. 结算：Chips × Mult - Penalty，对比目标分
```

每个阶段设有**目标分数**，达到才算通过（像 Balatro 的 Blind 目标）。

---

## 5. Shop 阶段

阶段之间的 Shop，玩家可执行：

- **购买组件**：从随机 3 张组件中选购（消耗金币）→ 加入组件池
- **出售组件**：卖掉不需要的组件（回收部分金币）
- **购买 Joker**：从随机 3 张 Joker 中选购（消耗金币）
- **出售 Joker**：卖掉 Joker（回收金币）
- **购买 Tarot**：从随机 2 张 Tarot 中选购（消耗金币）→ 加入手牌（上限 2-3 张）
- **移除组件**：花钱移除池中不想要的牌（提高后续部署精度）

---

## 6. Tarot 系统（一次性消耗品）

### 6.1 概述

Tarot 是一次性消耗品，用完即弃。分为两类：
- **信息揭示型**：获取情报优势，降低不确定性（如提前看到事件、Boss 规则）
- **状态修改型**：直接改变方案状态（如封堵风险、增加容量、修改组件属性）

### 6.2 手牌规则

- 手牌上限：2-3 张（流派可调整，Vibe Coding 流派初始 +1）
- 使用时机：部署阶段（出牌时）、事件后修补阶段、Shop 阶段均可使用
- 用完即弃，不跨阶段保留未使用的 Tarot（Shop 中新买的除外）

### 6.3 获取来源

- **Shop 购买**：每次 Shop 展示 2 张随机 Tarot
- **事件存活奖励**：存活高 severity 事件后有概率获得 1 张
- **Draft 偶尔出现**：Draft 轮中低概率（约 10%）出现 Tarot 替代组件选项
- **流派奖励**：部分流派开局赠送 Tarot

### 6.4 Tarot 卡牌字段

- `id, name, desc`
- `type`: `info_reveal` / `state_modify`
- `effect`: 具体效果描述
- `shop_cost`: 购买价格
- `rarity`: `common` / `uncommon` / `rare`

---

## 7. 卡牌体系

### 7.1 场景包（Scenario Pack）

场景包取代原来的单张场景卡，包含三个阶段递进：

字段：
- `id, name, desc`
- `tags`: 场景标签（`read_heavy` / `audit_required` 等）
- `initial`: `target_qps, peak_factor, data_gb`（背景信息，用于展示）
- `phases[]`: 三个阶段，每个阶段包含：
  - `blind`: `small` / `big` / `boss`
  - `subtitle`: 阶段描述
  - `capacity_budget`: 容量预算
  - `target_score`: 目标分数
  - `weights`: `{ perf, rel, cx }`
  - `constraints`: `{ sla, budget_cost_max, compliance_level, delivery_weeks_max }`
  - `event_pool_severity`: 事件严重级别范围
  - `skippable`: 是否可跳过（Small/Big 为 true，Boss 为 false）
  - `skip_reward`: 跳过奖励 `{ type, params }`
  - `boss_rule`（仅 Boss 阶段）: Boss 特殊规则 ID（开局即对玩家可见）

### 7.2 组件牌（Component Card）

组件分为两类：**功能组件**（提供面板加分 + 暴露风险）和**封堵组件**（封堵风险 + 低面板加分）。

字段：
- `id, name, desc`
- `tags`: 用于牌型检测与事件交互
- `delta`: 对三维面板的增减 `{ perf, rel, cx }`
- `capacity_cost`: 容量消耗（6~25）
- `exposes`: 暴露的风险向量列表
- `seals`: 封堵的风险向量列表（封堵组件专用）
- `requires_tags`: 前置依赖
- `conflicts_tags`: 冲突标签
- `rarity`: `common` / `uncommon` / `rare`
- `category`: `functional` / `defensive`（功能组件/封堵组件）

### 7.3 Joker（组合引擎）

Joker 在 Shop 阶段收集，3-5 个槽位（流派可调整），跨阶段保留。

字段：
- `id, name, desc, rarity`
- `multiplier`: 小倍数值（×1.1 ~ ×1.5）
- `condition`: 触发条件
  - `require_all_tags`: 方案必须包含所有这些 tags
  - `require_any_tags`: 方案必须包含其中至少一个 tag
- `reduce_event_penalty`: 事件惩罚减免 `[{ event_id, factor }]`
- `shop_cost`: 购买价格

### 7.4 事件牌（Event Card）

事件攻击特定风险向量，而非笼统扣分：

字段：
- `id, name, desc, severity`
- `targets_risks`: 攻击的风险向量列表
- `penalty`: 对三维面板的惩罚（当风险被暴露时生效）
- `flavor_text`: 叙事文本（教学用）

事件判定逻辑：
- 方案暴露了 `targets_risks` 中的风险 → 吃满 `penalty`
- 风险已被封堵（有封堵组件 `seals` 覆盖）→ 完全免疫
- 方案不涉及该风险（没用相关组件）→ 事件无效

### 7.5 Tarot（一次性消耗品）

详见第 6 章。字段：
- `id, name, desc`
- `type`: `info_reveal` / `state_modify`
- `effect`: 具体效果
- `shop_cost`: 购买价格
- `rarity`: `common` / `uncommon` / `rare`

### 7.6 Boss 规则（Boss Rule）

字段：
- `id, name, desc`
- `effect`: 规则效果描述（用于 UI 展示）
- `modifier`: 具体机制修改

---

## 8. 牌型系统

### 8.1 基础牌型（Patterns）

牌型通过部署方案的 tags 检测，提供 Mult 加法加成：

字段：
- `id, name, desc`
- `requires_all_tags`: 必须全部包含
- `requires_any_tags`: 至少包含一个
- `effects`:
  - `mult_add`: 倍率加成（+1 ~ +3）
  - `delta`: 三维面板额外加成

示例牌型：
- **读优化（Read Beast）**：`cache + (cdn | read_replica)` → mult +2
- **削峰填谷（Shock Absorber）**：`rate_limit + queue + worker` → mult +2
- **高可用（Always On）**：`multi_az + health_check + (circuit_breaker | failover)` → mult +3
- **可观测闭环（Debug Loop）**：`metrics + tracing + alerting` → mult +1 + 全事件惩罚减免

### 8.2 超级牌型（Super Patterns / 阈值爆发）

当满足高难度条件时触发，奖励类型各不相同（不只是加 Mult）：

| 超级牌型 | 触发条件 | 奖励类型 | 效果 |
|---|---|---|---|
| **全栈架构师** | 同时触发 3 个基础牌型 | **Mult 爆发** | mult +8 |
| **刀尖跳舞** | 触发任意牌型 + 风险敞口 ≥ 3 个未封堵 | **容量返还** | 返还 20 点容量，可立即补塞组件 |
| **铜墙铁壁** | 触发任意牌型 + 风险敞口 = 0 | **事件免疫** | 本阶段剩余事件惩罚全部归零 |
| **极简主义** | 容量使用不到预算 60% + 触发任意牌型 | **维度翻转** | Cx 从扣分项变为加分项 |

设计意图——四种超级牌型对应四种玩家风格：
- **全栈架构师** → 追天花板（贪心玩家，凑最多牌型）
- **刀尖跳舞** → 追滚雪球（高风险高回报，用风险换空间）
- **铜墙铁壁** → 追确定性（分数下限极高，事件打不穿）
- **极简主义** → 追逆向思维（少即是多，复杂度反转为收益）

---

## 9. 架构流派（= Balatro Deck）

开局选 1 个，贯穿整局，定义底层规则偏移：

| 流派 | 规则偏移 | 映射的工程文化 |
|---|---|---|
| **SRE 流派** | 可靠性组件容量消耗 -30%，但事件 severity +1 | "我们不怕贵，怕的是挂" |
| **创业流派** | 总容量预算 +20，但交付约束减半 | "先上线再说" |
| **极简流派** | 总容量只有 70，但 Cx 不作为扣分项 | "less is more" |
| **合规流派** | 免费预装 Audit Log + Encryption（不占容量），但 Joker 槽位 -1 | "合规先行" |
| **性能流派** | 性能组件容量消耗 -30%，但 Rel 基线从 2 降到 1 | "快就是正义" |
| **Vibe Coding 流派** | 开局随机获得 1 张 Joker + 1 张 Tarot；Draft 轮数 +2 但每轮随机淘汰 1 个选项（只剩 2 选 1）；每个组件部署时 30% 概率容量打 7 折，20% 概率额外暴露 1 个随机风险 | "ship it, vibes only" |

流派可调整的核心资源：
- Draft 轮数（默认 10）
- 修补次数（默认每次事件后 1 次）
- Joker 槽位数（默认 4）
- 容量预算偏移
- 维度基线

---

## 10. 容量点数系统

### 10.1 机制

- 每个阶段给定容量预算（由场景包定义，流派可偏移）
- 每个组件有固定的 `capacity_cost`（6~25），反映真实资源占用差异
- 部署时总消耗不能超预算
- 超预算罚分：`(已用点数 - 预算上限) × 惩罚系数`，进入 ConstraintPenalty

### 10.2 容量参考值

| 组件类型 | 容量消耗范围 | 示例 |
|---|---|---|
| 轻量 | 5~8 | Health Check (5), Rate Limiter (6), CDN (8) |
| 中等 | 10~18 | Message Queue (12), Redis Cache (15), Observability (18) |
| 重型 | 20~25 | SQL DB (20), Multi-AZ (25) |
| 封堵 | 6~10 | Dead Letter Queue (6), Cache Warm-up (8), Consistency Checker (8) |

设计意图：容量预算逐阶段递减 + 组件池通过 Shop 不断变大 = 你拥有的零件越来越多，但能部署的越来越少，逼你每个阶段做更精准的取舍。

---

## 11. 风险暴露面系统

### 11.1 机制

每个功能组件在提供能力的同时暴露 1-2 个风险向量。封堵组件可以封堵（seals）对应的风险。

### 11.2 风险向量列表

| 风险向量 | 来源（哪些组件暴露） | 封堵（哪些组件封堵） |
|---|---|---|
| `cache_avalanche` | Redis Cache | Cache Warm-up |
| `data_inconsistency` | Redis Cache, Read Replica | Consistency Checker |
| `replication_lag` | Read Replica | Consistency Checker |
| `message_loss` | Message Queue | Dead Letter Queue |
| `ordering_violation` | Message Queue | Idempotency Key |
| `network_partition` | Multi-AZ | （需高可用牌型自带减免） |
| `cost_explosion` | Multi-AZ | （容量预算系统自然制约） |
| `false_tripping` | Circuit Breaker | （Observability 可辅助识别） |
| `duplicate_submit` | （外部触发） | Idempotency Key |

### 11.3 核心矛盾

封堵组件占容量但贡献低面板分，不参与牌型触发。玩家必须在"火力"（凑牌型）和"安全"（堵风险）之间做取舍：

- **激进路线**：不带封堵组件，省容量凑更多牌型，赌事件不打弱点 → 可触发"刀尖跳舞"
- **稳健路线**：带封堵组件堵住所有风险，牺牲牌型深度 → 可触发"铜墙铁壁"

---

## 12. 评分与结算

### 12.1 基础面板
- 面板初值（基线）：`{ perf: 2, rel: 2, cx: 2 }`（流派可调整）
- 组件 delta 累加后 clamp 到 `[0, 10]`

### 12.2 Chips
```
Chips = wP × Perf + wR × Rel - wX × Cx
```

### 12.3 Mult（三层叠加）
```
Mult = (1 + Σ pattern_mult_add + super_pattern_bonus) × Π joker_multipliers
```

- **基础倍率**：从 1 开始
- **牌型加法**：每个触发的基础牌型贡献 +1 ~ +3
- **超级牌型 bonus**：满足阈值条件时 +4 ~ +8（仅"全栈架构师"贡献 Mult，其他超级牌型奖励不同）
- **Joker 乘法**：所有满足条件的 Joker 倍数相乘（×1.1 ~ ×1.5 每张，上限自然约束）

### 12.4 事件惩罚
事件通过风险暴露面系统判定：
- 暴露了被攻击的风险 → 应用 penalty（对面板的负数修正）
- 风险已封堵 → 免疫
- 不涉及 → 无效

Joker 可提供额外的事件惩罚减免（`reduce_event_penalty`）。

### 12.5 约束扣分（ConstraintPenalty）

#### SLA 分档规则
- `≥ 99.99`：HA 组件 ≥ 2/3（multi_az, health_check, circuit_breaker/failover）且 `rel ≥ 6`，否则罚 20
- `≥ 99.95`：HA 组件 ≥ 1 且 `rel ≥ 5`，否则罚 12
- `≥ 99.9`：`rel ≥ 4` 或具备 `health_check / multi_az`，否则罚 8
- 低 SLA：`rel ≥ 3`，否则罚 5

#### 容量超预算
```
罚分 = (已用容量 - 预算上限) × 5
```

#### 合规
- `high` 合规阶段若缺 `audit_log` 或 `encryption` → 罚 15

### 12.6 最终分
```
Final = round(Chips × Mult - ConstraintPenalty)
```

每个阶段需达到目标分数才算通过。

---

## 13. 合同条款（硬约束）

场景包的每个阶段给出不同的硬约束组合，逐阶段递增：

- **SLA**：使用分档规则校验
- **容量预算**：由容量点数系统约束
- **合规等级**：`low` / `medium` / `high`（high 需要 `audit_log + encryption`）
- **交付周期**：可用于限制容量预算或 Draft 轮数

不满足则扣分（不直接失败，便于学习与复盘）。

---

## 14. Boss 规则

Boss 阶段附加一条特殊规则，强迫玩家适应变化：

| Boss 规则 ID | 名称 | 效果 |
|---|---|---|
| `cache_disabled` | 缓存禁用 | cache 标签组件容量消耗翻倍 |
| `budget_halved` | 预算腰斩 | 容量上限减半 |
| `blind_review` | 盲审 | 不显示风险报告 |
| `tech_debt_explosion` | 技术债爆发 | 所有已部署组件额外暴露 1 个随机风险 |
| `single_point` | 单点故障 | 不允许同 tag 出现在 2 张组件上 |

---

## 15. 数据驱动牌库（JSON）

### 15.1 目录结构
```text
/gamedata
  schema.json
  scenarios.json          # 场景包（含三阶段）
  components.json         # 功能组件 + 封堵组件
  jokers.json
  events.json
  tarots.json             # Tarot 一次性消耗品
  patterns.json           # 基础牌型
  super_patterns.json     # 超级牌型
  schools.json            # 架构流派
  boss_rules.json
```

### 15.2 统一 Schema
> 详见 `/gamedata/schema.json`（由代码端可用 TS/Zod 或 Go struct 校验）

---

## 16. MVP 牌库规模建议

目标规模：
- 场景包：5 个
- 功能组件：36 张
- 封堵组件：10 张
- Joker：15 张
- 事件牌：20 张
- Tarot：15 张
- 基础牌型：5-8 个
- 超级牌型：4 个
- 架构流派：6 个
- Boss 规则：5 个

当前原型可用最小集合：
- 场景包：3
- 功能组件：36
- 封堵组件：6
- Joker：6
- 事件牌：8
- Tarot：10（4 信息揭示 + 6 状态修改）
- 基础牌型：4
- 超级牌型：4
- 架构流派：6（含 Vibe Coding）
- Boss 规则：5

---

## 17. 示例牌库

> 以下示例用于快速跑通原型；后续请迁移至 `/gamedata/*.json`。

### 17.1 架构流派（Schools）
```json
[
  {
    "id": "school_sre",
    "name": "SRE 流派",
    "desc": "我们不怕贵，怕的是挂",
    "modifiers": {
      "capacity_discount_tags": ["multi_az", "health_check", "circuit_breaker", "failover"],
      "capacity_discount_factor": 0.7,
      "event_severity_offset": 1,
      "draft_rounds": 10,
      "repair_count": 1,
      "joker_slots": 4,
      "capacity_budget_offset": 0,
      "baseline_overrides": {}
    }
  },
  {
    "id": "school_startup",
    "name": "创业流派",
    "desc": "先上线再说",
    "modifiers": {
      "capacity_discount_tags": [],
      "capacity_discount_factor": 1.0,
      "event_severity_offset": 0,
      "draft_rounds": 12,
      "repair_count": 1,
      "joker_slots": 4,
      "capacity_budget_offset": 20,
      "baseline_overrides": {},
      "constraint_overrides": { "delivery_weeks_factor": 0.5 }
    }
  },
  {
    "id": "school_minimalist",
    "name": "极简流派",
    "desc": "less is more",
    "modifiers": {
      "capacity_discount_tags": [],
      "capacity_discount_factor": 1.0,
      "event_severity_offset": 0,
      "draft_rounds": 8,
      "repair_count": 2,
      "joker_slots": 5,
      "capacity_budget_offset": -30,
      "baseline_overrides": {},
      "scoring_overrides": { "cx_as_positive": true }
    }
  },
  {
    "id": "school_compliance",
    "name": "合规流派",
    "desc": "合规先行",
    "modifiers": {
      "capacity_discount_tags": [],
      "capacity_discount_factor": 1.0,
      "event_severity_offset": 0,
      "draft_rounds": 10,
      "repair_count": 1,
      "joker_slots": 3,
      "capacity_budget_offset": 0,
      "baseline_overrides": {},
      "free_components": ["cmp_audit_log", "cmp_encryption"]
    }
  },
  {
    "id": "school_performance",
    "name": "性能流派",
    "desc": "快就是正义",
    "modifiers": {
      "capacity_discount_tags": ["cache", "cdn", "read_replica", "edge"],
      "capacity_discount_factor": 0.7,
      "event_severity_offset": 0,
      "draft_rounds": 10,
      "repair_count": 1,
      "joker_slots": 4,
      "capacity_budget_offset": 0,
      "baseline_overrides": { "rel": 1 }
    }
  },
  {
    "id": "school_vibe_coding",
    "name": "Vibe Coding 流派",
    "desc": "ship it, vibes only",
    "modifiers": {
      "capacity_discount_tags": [],
      "capacity_discount_factor": 1.0,
      "event_severity_offset": 0,
      "draft_rounds": 12,
      "draft_options": 2,
      "repair_count": 1,
      "joker_slots": 5,
      "tarot_hand_size": 3,
      "capacity_budget_offset": 0,
      "baseline_overrides": {},
      "special_rules": {
        "start_with_random_joker": true,
        "start_with_random_tarot": true,
        "deploy_capacity_discount_chance": 0.3,
        "deploy_capacity_discount_factor": 0.7,
        "deploy_extra_risk_chance": 0.2,
        "deploy_extra_random_risk_count": 1
      }
    }
  }
]
```

### 17.2 场景包（Scenarios）
```json
[
  {
    "id": "scenario_shortlink",
    "name": "短链接系统",
    "desc": "读多写少，热点明显，成本敏感",
    "tags": ["read_heavy", "hotspot", "cost_sensitive"],
    "initial": { "target_qps": 20000, "peak_factor": 5, "data_gb": 200 },
    "phases": [
      {
        "blind": "small",
        "subtitle": "MVP - 先把短链跳转跑通",
        "capacity_budget": 110,
        "target_score": 12,
        "weights": { "perf": 1.0, "rel": 0.6, "cx": 0.4 },
        "constraints": { "sla": 99.0, "compliance_level": "low" },
        "event_pool_severity": [1, 2],
        "skippable": true,
        "skip_reward": { "type": "tarot_pick", "pick": 2, "from": 4 }
      },
      {
        "blind": "big",
        "subtitle": "Beta - 日活 10 万，开始卖广告",
        "capacity_budget": 90,
        "target_score": 25,
        "weights": { "perf": 1.2, "rel": 1.0, "cx": 0.8 },
        "constraints": { "sla": 99.9, "budget_cost_max": 8, "compliance_level": "low" },
        "event_pool_severity": [2, 3],
        "skippable": true,
        "skip_reward": { "type": "joker_direct_pick", "pick": 1, "from": "full_pool" }
      },
      {
        "blind": "boss",
        "subtitle": "生产 - 热点营销活动，流量 10x",
        "capacity_budget": 70,
        "target_score": 45,
        "weights": { "perf": 1.4, "rel": 1.2, "cx": 1.0 },
        "constraints": { "sla": 99.95, "budget_cost_max": 7, "compliance_level": "low" },
        "boss_rule": "cache_disabled",
        "event_pool_severity": [3, 5],
        "skippable": false
      }
    ]
  },
  {
    "id": "scenario_chat",
    "name": "即时聊天系统",
    "desc": "低延迟 + 高可用，连接数高，突刺明显",
    "tags": ["latency_sensitive", "always_on", "burst"],
    "initial": { "target_qps": 5000, "peak_factor": 3, "data_gb": 500 },
    "phases": [
      {
        "blind": "small",
        "subtitle": "MVP - 先让消息发出去",
        "capacity_budget": 120,
        "target_score": 15,
        "weights": { "perf": 1.2, "rel": 0.8, "cx": 0.5 },
        "constraints": { "sla": 99.5, "compliance_level": "low" },
        "event_pool_severity": [1, 2],
        "skippable": true,
        "skip_reward": { "type": "tarot_pick", "pick": 2, "from": 4 }
      },
      {
        "blind": "big",
        "subtitle": "Beta - 用户开始付费了",
        "capacity_budget": 100,
        "target_score": 30,
        "weights": { "perf": 1.3, "rel": 1.2, "cx": 0.8 },
        "constraints": { "sla": 99.9, "budget_cost_max": 10, "compliance_level": "medium" },
        "event_pool_severity": [2, 3],
        "skippable": true,
        "skip_reward": { "type": "joker_direct_pick", "pick": 1, "from": "full_pool" }
      },
      {
        "blind": "boss",
        "subtitle": "生产压测 - 百万用户大促",
        "capacity_budget": 80,
        "target_score": 50,
        "weights": { "perf": 1.5, "rel": 1.5, "cx": 1.0 },
        "constraints": { "sla": 99.99, "budget_cost_max": 8, "compliance_level": "high" },
        "boss_rule": "blind_review",
        "event_pool_severity": [4, 5],
        "skippable": false
      }
    ]
  },
  {
    "id": "scenario_orders",
    "name": "订单系统",
    "desc": "一致性/幂等/审计优先，写多读多均衡",
    "tags": ["consistency", "audit_required", "pii"],
    "initial": { "target_qps": 3000, "peak_factor": 2, "data_gb": 1000 },
    "phases": [
      {
        "blind": "small",
        "subtitle": "MVP - 能下单能付款",
        "capacity_budget": 120,
        "target_score": 15,
        "weights": { "perf": 0.8, "rel": 1.0, "cx": 0.5 },
        "constraints": { "sla": 99.5, "compliance_level": "low" },
        "event_pool_severity": [1, 2],
        "skippable": true,
        "skip_reward": { "type": "tarot_pick", "pick": 2, "from": 4 }
      },
      {
        "blind": "big",
        "subtitle": "Beta - 接入支付渠道，合规审查",
        "capacity_budget": 95,
        "target_score": 32,
        "weights": { "perf": 1.0, "rel": 1.3, "cx": 0.9 },
        "constraints": { "sla": 99.9, "budget_cost_max": 10, "compliance_level": "medium" },
        "event_pool_severity": [2, 4],
        "skippable": true,
        "skip_reward": { "type": "joker_direct_pick", "pick": 1, "from": "full_pool" }
      },
      {
        "blind": "boss",
        "subtitle": "生产 - 双十一大促 + 金融审计",
        "capacity_budget": 75,
        "target_score": 48,
        "weights": { "perf": 1.0, "rel": 1.6, "cx": 1.2 },
        "constraints": { "sla": 99.95, "budget_cost_max": 9, "compliance_level": "high" },
        "boss_rule": "tech_debt_explosion",
        "event_pool_severity": [4, 5],
        "skippable": false
      }
    ]
  }
]
```

### 17.3 功能组件（Functional Components）
```json
[
  {
    "id": "cmp_api_gw",
    "name": "API Gateway",
    "desc": "统一入口：鉴权/路由/限速",
    "tags": ["gateway"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 10,
    "exposes": ["gateway_bottleneck"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_cdn",
    "name": "CDN",
    "desc": "边缘缓存与加速",
    "tags": ["cdn", "edge"],
    "delta": { "perf": 2, "rel": 0, "cx": 0 },
    "capacity_cost": 8,
    "exposes": ["cache_invalidation"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_cache",
    "name": "Redis Cache",
    "desc": "缓存提升吞吐，但要治理热点/穿透",
    "tags": ["cache"],
    "delta": { "perf": 3, "rel": 0, "cx": 1 },
    "capacity_cost": 15,
    "exposes": ["cache_avalanche", "data_inconsistency"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_sql_db",
    "name": "SQL Primary DB",
    "desc": "强一致事务能力，写路径核心",
    "tags": ["db", "sql", "primary_db"],
    "delta": { "perf": 1, "rel": 1, "cx": 1 },
    "capacity_cost": 20,
    "exposes": ["db_single_point", "slow_query"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": ["nosql_only"],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_read_replica",
    "name": "Read Replica",
    "desc": "读扩展，注意复制延迟",
    "tags": ["read_replica", "db"],
    "delta": { "perf": 2, "rel": 0, "cx": 1 },
    "capacity_cost": 14,
    "exposes": ["replication_lag", "data_inconsistency"],
    "seals": [],
    "requires_tags": ["primary_db"],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_queue",
    "name": "Message Queue",
    "desc": "异步削峰，隔离写路径",
    "tags": ["queue", "async"],
    "delta": { "perf": 1, "rel": 1, "cx": 1 },
    "capacity_cost": 12,
    "exposes": ["message_loss", "ordering_violation"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_worker",
    "name": "Worker Fleet",
    "desc": "消费队列，异步处理",
    "tags": ["worker", "async"],
    "delta": { "perf": 1, "rel": 1, "cx": 1 },
    "capacity_cost": 10,
    "exposes": ["worker_backlog"],
    "seals": [],
    "requires_tags": ["queue"],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_rate_limit",
    "name": "Rate Limiter",
    "desc": "限流/保护下游",
    "tags": ["rate_limit"],
    "delta": { "perf": 0, "rel": 2, "cx": 1 },
    "capacity_cost": 6,
    "exposes": ["false_rejection"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_circuit_breaker",
    "name": "Circuit Breaker",
    "desc": "熔断与快速失败",
    "tags": ["circuit_breaker"],
    "delta": { "perf": 0, "rel": 2, "cx": 1 },
    "capacity_cost": 8,
    "exposes": ["false_tripping"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_multi_az",
    "name": "Multi-AZ Deploy",
    "desc": "多可用区部署",
    "tags": ["multi_az"],
    "delta": { "perf": 0, "rel": 3, "cx": 1 },
    "capacity_cost": 25,
    "exposes": ["network_partition", "cost_explosion"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_health_check",
    "name": "Health Check",
    "desc": "探活与自动摘除",
    "tags": ["health_check"],
    "delta": { "perf": 0, "rel": 2, "cx": 1 },
    "capacity_cost": 5,
    "exposes": [],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_observability",
    "name": "Observability Stack",
    "desc": "Tracing + Metrics + Alerting",
    "tags": ["tracing", "metrics", "alerting", "obs"],
    "delta": { "perf": 0, "rel": 1, "cx": 0 },
    "capacity_cost": 18,
    "exposes": ["alert_fatigue"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_load_balancer",
    "name": "Load Balancer",
    "desc": "流量分发，支持健康检查与权重路由",
    "tags": ["load_balancer", "gateway"],
    "delta": { "perf": 1, "rel": 1, "cx": 0 },
    "capacity_cost": 7,
    "exposes": ["single_lb_point"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_nosql_db",
    "name": "NoSQL DB",
    "desc": "高吞吐、灵活 schema，最终一致性",
    "tags": ["db", "nosql"],
    "delta": { "perf": 2, "rel": 0, "cx": 1 },
    "capacity_cost": 16,
    "exposes": ["data_inconsistency", "schema_chaos"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": ["sql"],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_object_storage",
    "name": "Object Storage (S3)",
    "desc": "海量 Blob 存储，便宜耐用",
    "tags": ["object_storage", "storage"],
    "delta": { "perf": 0, "rel": 1, "cx": 0 },
    "capacity_cost": 6,
    "exposes": ["cold_storage_latency"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_search_index",
    "name": "Search Index (ES)",
    "desc": "全文检索与聚合分析",
    "tags": ["search", "index"],
    "delta": { "perf": 2, "rel": 0, "cx": 2 },
    "capacity_cost": 18,
    "exposes": ["index_lag", "data_inconsistency"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_sharding",
    "name": "DB Sharding",
    "desc": "水平分库分表，突破单机写瓶颈",
    "tags": ["sharding", "db"],
    "delta": { "perf": 2, "rel": 1, "cx": 3 },
    "capacity_cost": 20,
    "exposes": ["cross_shard_query", "rebalance_risk"],
    "seals": ["db_single_point"],
    "requires_tags": ["primary_db"],
    "conflicts_tags": [],
    "rarity": "rare",
    "category": "functional"
  },
  {
    "id": "cmp_websocket_gw",
    "name": "WebSocket Gateway",
    "desc": "长连接网关，支持实时推送",
    "tags": ["websocket", "realtime"],
    "delta": { "perf": 1, "rel": 0, "cx": 2 },
    "capacity_cost": 14,
    "exposes": ["connection_leak", "sticky_session"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_feature_flag",
    "name": "Feature Flag",
    "desc": "功能开关，渐进发布与紧急回滚",
    "tags": ["feature_flag", "release"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 5,
    "exposes": ["flag_debt"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_task_scheduler",
    "name": "Task Scheduler",
    "desc": "定时/延迟任务调度",
    "tags": ["scheduler", "async"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 8,
    "exposes": ["cron_overlap", "ordering_violation"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_service_mesh",
    "name": "Service Mesh",
    "desc": "服务间通信治理：重试/超时/mTLS",
    "tags": ["service_mesh", "mesh"],
    "delta": { "perf": 0, "rel": 2, "cx": 2 },
    "capacity_cost": 16,
    "exposes": ["mesh_overhead", "config_drift"],
    "seals": ["false_tripping"],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "rare",
    "category": "functional"
  },
  {
    "id": "cmp_failover",
    "name": "Active-Standby Failover",
    "desc": "主备切换，故障自动转移",
    "tags": ["failover"],
    "delta": { "perf": 0, "rel": 3, "cx": 1 },
    "capacity_cost": 18,
    "exposes": ["split_brain", "failover_lag"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_auto_scaler",
    "name": "Auto Scaler",
    "desc": "动态扩缩容，应对流量变化",
    "tags": ["auto_scale"],
    "delta": { "perf": 1, "rel": 1, "cx": 1 },
    "capacity_cost": 10,
    "exposes": ["scale_lag", "cost_explosion"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_config_center",
    "name": "Config Center",
    "desc": "集中配置管理，动态下发",
    "tags": ["config_center"],
    "delta": { "perf": 0, "rel": 1, "cx": 0 },
    "capacity_cost": 6,
    "exposes": ["config_drift"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_local_cache",
    "name": "Local Cache (L1)",
    "desc": "应用层本地缓存，极低延迟但容量有限",
    "tags": ["cache", "local_cache"],
    "delta": { "perf": 1, "rel": 0, "cx": 0 },
    "capacity_cost": 4,
    "exposes": ["stale_data"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_stream_processor",
    "name": "Stream Processor (Flink)",
    "desc": "实时流处理，低延迟数据转换与聚合",
    "tags": ["stream", "async", "realtime"],
    "delta": { "perf": 1, "rel": 0, "cx": 2 },
    "capacity_cost": 16,
    "exposes": ["backpressure", "ordering_violation"],
    "seals": [],
    "requires_tags": ["queue"],
    "conflicts_tags": [],
    "rarity": "rare",
    "category": "functional"
  },
  {
    "id": "cmp_distributed_lock",
    "name": "Distributed Lock (ZK/etcd)",
    "desc": "分布式锁，保证互斥操作的一致性",
    "tags": ["lock", "coordination"],
    "delta": { "perf": -1, "rel": 2, "cx": 1 },
    "capacity_cost": 10,
    "exposes": ["lock_contention", "deadlock"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_event_bus",
    "name": "Event Bus (Pub/Sub)",
    "desc": "发布订阅模型，一对多事件分发",
    "tags": ["event_bus", "async", "pub_sub"],
    "delta": { "perf": 1, "rel": 0, "cx": 1 },
    "capacity_cost": 12,
    "exposes": ["event_storm", "data_inconsistency"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_geodns",
    "name": "GeoDNS",
    "desc": "基于地理位置的 DNS 路由，就近接入",
    "tags": ["geo", "global_lb", "edge"],
    "delta": { "perf": 1, "rel": 1, "cx": 0 },
    "capacity_cost": 8,
    "exposes": ["dns_propagation_delay"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_blue_green_deploy",
    "name": "Blue-Green Deploy",
    "desc": "双环境部署，零停机切换与快速回滚",
    "tags": ["blue_green", "release"],
    "delta": { "perf": 0, "rel": 2, "cx": 1 },
    "capacity_cost": 12,
    "exposes": ["env_drift", "cost_explosion"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  },
  {
    "id": "cmp_waf",
    "name": "WAF",
    "desc": "Web 应用防火墙，拦截恶意流量",
    "tags": ["waf", "security"],
    "delta": { "perf": 0, "rel": 1, "cx": 0 },
    "capacity_cost": 7,
    "exposes": ["false_positive_block"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_backup_restore",
    "name": "Backup & Restore",
    "desc": "定期备份与恢复能力，数据安全网",
    "tags": ["backup", "dr"],
    "delta": { "perf": 0, "rel": 2, "cx": 0 },
    "capacity_cost": 8,
    "exposes": ["backup_lag"],
    "seals": [],
    "requires_tags": ["db"],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_serverless",
    "name": "Serverless Functions",
    "desc": "事件驱动无服务器计算，按需扩缩",
    "tags": ["serverless", "compute"],
    "delta": { "perf": 0, "rel": 0, "cx": 1 },
    "capacity_cost": 6,
    "exposes": ["cold_start", "vendor_lock_in"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_cross_region",
    "name": "Cross-Region Replication",
    "desc": "跨地域数据复制，终极容灾能力",
    "tags": ["cross_region", "replication", "dr"],
    "delta": { "perf": 0, "rel": 3, "cx": 2 },
    "capacity_cost": 22,
    "exposes": ["cross_region_lag", "cost_explosion"],
    "seals": ["network_partition"],
    "requires_tags": ["db"],
    "conflicts_tags": [],
    "rarity": "rare",
    "category": "functional"
  },
  {
    "id": "cmp_notification",
    "name": "Notification Service",
    "desc": "统一推送/邮件/短信通知服务",
    "tags": ["notification", "async"],
    "delta": { "perf": 0, "rel": 0, "cx": 1 },
    "capacity_cost": 10,
    "exposes": ["notification_storm"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "functional"
  },
  {
    "id": "cmp_data_pipeline",
    "name": "Data Pipeline (ETL)",
    "desc": "批量数据抽取/转换/加载，离线分析基础设施",
    "tags": ["etl", "batch", "pipeline"],
    "delta": { "perf": 0, "rel": 0, "cx": 2 },
    "capacity_cost": 14,
    "exposes": ["pipeline_lag", "data_inconsistency"],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "functional"
  }
]
```

### 17.4 封堵组件（Defensive Components）
```json
[
  {
    "id": "cmp_cache_warmup",
    "name": "Cache Warm-up",
    "desc": "缓存预热策略，防止冷启动雪崩",
    "tags": ["cache_defense"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 8,
    "exposes": [],
    "seals": ["cache_avalanche"],
    "requires_tags": ["cache"],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "defensive"
  },
  {
    "id": "cmp_consistency_checker",
    "name": "Consistency Checker",
    "desc": "数据一致性校验与修复",
    "tags": ["consistency_defense"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 8,
    "exposes": [],
    "seals": ["data_inconsistency", "replication_lag"],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "defensive"
  },
  {
    "id": "cmp_dead_letter_queue",
    "name": "Dead Letter Queue",
    "desc": "死信队列，兜住失败消息",
    "tags": ["dlq", "async_defense"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 6,
    "exposes": [],
    "seals": ["message_loss"],
    "requires_tags": ["queue"],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "defensive"
  },
  {
    "id": "cmp_idempotency",
    "name": "Idempotency Key",
    "desc": "幂等：防重复提交/重试造成重复扣款",
    "tags": ["idempotency"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 7,
    "exposes": [],
    "seals": ["ordering_violation", "duplicate_submit"],
    "requires_tags": ["gateway"],
    "conflicts_tags": [],
    "rarity": "uncommon",
    "category": "defensive"
  },
  {
    "id": "cmp_audit_log",
    "name": "Audit Log",
    "desc": "审计日志：可追溯、可对账",
    "tags": ["audit_log", "compliance"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 8,
    "exposes": [],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "defensive"
  },
  {
    "id": "cmp_encryption",
    "name": "Encryption",
    "desc": "传输/存储加密：满足合规",
    "tags": ["encryption", "compliance"],
    "delta": { "perf": 0, "rel": 1, "cx": 1 },
    "capacity_cost": 7,
    "exposes": [],
    "seals": [],
    "requires_tags": [],
    "conflicts_tags": [],
    "rarity": "common",
    "category": "defensive"
  }
]
```

### 17.5 Joker
```json
[
  {
    "id": "jk_sla_maniac",
    "name": "SLA 狂魔",
    "desc": "高可用组合更猛",
    "rarity": "rare",
    "multiplier": 1.3,
    "condition": {
      "require_all_tags": ["multi_az", "health_check"],
      "require_any_tags": ["circuit_breaker", "failover"]
    },
    "reduce_event_penalty": [{ "event_id": "event_az_outage", "factor": 0.5 }],
    "shop_cost": 8
  },
  {
    "id": "jk_cost_ceiling",
    "name": "成本红线",
    "desc": "不超预算时额外倍率",
    "rarity": "uncommon",
    "multiplier": 1.2,
    "condition": {
      "require_all_tags": [],
      "require_any_tags": ["cache", "cdn"],
      "special": "capacity_under_budget"
    },
    "reduce_event_penalty": [],
    "shop_cost": 5
  },
  {
    "id": "jk_async_believer",
    "name": "异步信徒",
    "desc": "异步链路凑齐就强化",
    "rarity": "uncommon",
    "multiplier": 1.2,
    "condition": {
      "require_all_tags": ["queue", "worker"],
      "require_any_tags": ["rate_limit"]
    },
    "reduce_event_penalty": [{ "event_id": "event_traffic_spike", "factor": 0.4 }],
    "shop_cost": 5
  },
  {
    "id": "jk_observe_or_die",
    "name": "先观测再上线",
    "desc": "有可观测就大幅减事故惩罚",
    "rarity": "common",
    "multiplier": 1.1,
    "condition": {
      "require_all_tags": [],
      "require_any_tags": ["obs"]
    },
    "reduce_event_penalty": [{ "event_id": "*", "factor": 0.75 }],
    "shop_cost": 4
  },
  {
    "id": "jk_mvp_first",
    "name": "MVP 优先",
    "desc": "轻量方案倍率更高",
    "rarity": "common",
    "multiplier": 1.15,
    "condition": {
      "require_all_tags": [],
      "require_any_tags": ["gateway", "cache"],
      "special": "component_count_lte_4"
    },
    "reduce_event_penalty": [],
    "shop_cost": 3
  },
  {
    "id": "jk_hotspot_tamer",
    "name": "热点驯服者",
    "desc": "热点类事件更好扛",
    "rarity": "uncommon",
    "multiplier": 1.2,
    "condition": {
      "require_all_tags": ["cache"],
      "require_any_tags": ["cdn"]
    },
    "reduce_event_penalty": [{ "event_id": "event_hot_key", "factor": 0.4 }],
    "shop_cost": 5
  }
]
```

### 17.6 基础牌型（Patterns）
```json
[
  {
    "id": "pattern_read_beast",
    "name": "读优化",
    "desc": "CDN/缓存/副本提升读性能",
    "requires_all_tags": ["cache"],
    "requires_any_tags": ["cdn", "read_replica"],
    "effects": {
      "mult_add": 2,
      "delta": { "perf": 1, "rel": 0, "cx": 0 }
    }
  },
  {
    "id": "pattern_shock_absorber",
    "name": "削峰填谷",
    "desc": "限流 + 队列 + Worker 抗突刺",
    "requires_all_tags": ["rate_limit", "queue", "worker"],
    "requires_any_tags": [],
    "effects": {
      "mult_add": 2,
      "delta": { "perf": 0, "rel": 1, "cx": 1 }
    }
  },
  {
    "id": "pattern_always_on",
    "name": "高可用",
    "desc": "多可用区 + 健康检查 + 熔断/故障转移",
    "requires_all_tags": ["multi_az", "health_check"],
    "requires_any_tags": ["circuit_breaker", "failover"],
    "effects": {
      "mult_add": 3,
      "delta": { "perf": 0, "rel": 2, "cx": 1 }
    }
  },
  {
    "id": "pattern_debug_loop",
    "name": "可观测闭环",
    "desc": "指标/链路/告警降低事故惩罚",
    "requires_all_tags": ["metrics", "tracing", "alerting"],
    "requires_any_tags": [],
    "effects": {
      "mult_add": 1,
      "delta": { "perf": 0, "rel": 1, "cx": 0 },
      "global_event_penalty_factor": 0.7
    }
  }
]
```

### 17.7 超级牌型（Super Patterns）
```json
[
  {
    "id": "sp_full_stack",
    "name": "全栈架构师",
    "desc": "同时触发 3 个基础牌型",
    "trigger": {
      "type": "pattern_count",
      "min_patterns": 3
    },
    "reward": {
      "type": "mult_burst",
      "mult_add": 8
    }
  },
  {
    "id": "sp_edge_dancer",
    "name": "刀尖跳舞",
    "desc": "触发牌型的同时保持 3 个以上风险敞口",
    "trigger": {
      "type": "risk_and_pattern",
      "min_patterns": 1,
      "min_exposed_risks": 3
    },
    "reward": {
      "type": "capacity_refund",
      "refund_amount": 20
    }
  },
  {
    "id": "sp_iron_wall",
    "name": "铜墙铁壁",
    "desc": "触发牌型且所有风险全部封堵",
    "trigger": {
      "type": "risk_and_pattern",
      "min_patterns": 1,
      "max_exposed_risks": 0
    },
    "reward": {
      "type": "event_immunity"
    }
  },
  {
    "id": "sp_minimalist",
    "name": "极简主义",
    "desc": "容量使用不到 60% 且触发牌型",
    "trigger": {
      "type": "budget_and_pattern",
      "min_patterns": 1,
      "max_budget_usage_percent": 60
    },
    "reward": {
      "type": "dimension_flip",
      "flip_dimension": "cx",
      "from": "negative",
      "to": "positive"
    }
  }
]
```

### 17.8 事件牌（Events）
```json
[
  {
    "id": "event_traffic_spike",
    "name": "流量暴涨",
    "desc": "突刺 5x，入口与 DB 压力飙升",
    "severity": 2,
    "targets_risks": ["gateway_bottleneck", "db_single_point", "slow_query"],
    "penalty": { "perf": -3, "rel": -1, "cx": 0 },
    "flavor_text": "运营没提前通知就发了推送，QPS 瞬间 5 倍..."
  },
  {
    "id": "event_hot_key",
    "name": "热点 Key",
    "desc": "单点热点导致缓存/DB 局部过载",
    "severity": 2,
    "targets_risks": ["cache_avalanche", "data_inconsistency"],
    "penalty": { "perf": -2, "rel": -1, "cx": 0 },
    "flavor_text": "某个短链被大V转发，单 Key QPS 超过单节点承载..."
  },
  {
    "id": "event_db_slow",
    "name": "慢查询风暴",
    "desc": "DB P99 飙升，连锁反应",
    "severity": 3,
    "targets_risks": ["slow_query", "db_single_point", "replication_lag"],
    "penalty": { "perf": -3, "rel": -2, "cx": 1 },
    "flavor_text": "一条没走索引的查询拖垮了整个数据库连接池..."
  },
  {
    "id": "event_third_party_fail",
    "name": "第三方依赖雪崩",
    "desc": "外部 API 不稳定导致重试风暴",
    "severity": 3,
    "targets_risks": ["gateway_bottleneck", "false_tripping"],
    "penalty": { "perf": -1, "rel": -3, "cx": 1 },
    "flavor_text": "支付通道返回 500，你的服务开始疯狂重试..."
  },
  {
    "id": "event_gray_release_fail",
    "name": "灰度发布翻车",
    "desc": "线上错误率上升，定位困难",
    "severity": 4,
    "targets_risks": ["alert_fatigue", "worker_backlog"],
    "penalty": { "perf": -1, "rel": -3, "cx": 2 },
    "flavor_text": "新版本灰度到 10%，错误率从 0.1% 飙到 5%，但你不知道是哪个服务..."
  },
  {
    "id": "event_az_outage",
    "name": "可用区故障",
    "desc": "单 AZ 故障导致大面积不可用",
    "severity": 5,
    "targets_risks": ["network_partition", "db_single_point"],
    "penalty": { "perf": 0, "rel": -5, "cx": 1 },
    "flavor_text": "云厂商通知：us-east-1a 可用区出现网络隔离..."
  },
  {
    "id": "event_duplicate_submit",
    "name": "重复提交风暴",
    "desc": "客户端重试 + 网络抖动导致重复下单",
    "severity": 4,
    "targets_risks": ["ordering_violation", "duplicate_submit"],
    "penalty": { "perf": -1, "rel": -4, "cx": 1 },
    "flavor_text": "用户疯狂点击提交按钮，每次点击都生成了一笔订单..."
  },
  {
    "id": "event_audit_check",
    "name": "合规审计抽查",
    "desc": "要求审计链路与加密证明",
    "severity": 5,
    "targets_risks": ["duplicate_submit"],
    "penalty": { "perf": 0, "rel": -5, "cx": 1 },
    "flavor_text": "监管部门来抽查，要求提供完整的操作审计链路和数据加密证明..."
  }
]
```

### 17.9 Boss 规则
```json
[
  {
    "id": "boss_cache_disabled",
    "name": "缓存禁用",
    "desc": "缓存基础设施出现全局故障",
    "effect": "cache 标签组件容量消耗翻倍",
    "modifier": { "capacity_multiplier_for_tags": ["cache"], "factor": 2.0 }
  },
  {
    "id": "boss_budget_halved",
    "name": "预算腰斩",
    "desc": "公司融资失败，基础设施预算砍半",
    "effect": "容量上限减半",
    "modifier": { "capacity_budget_factor": 0.5 }
  },
  {
    "id": "boss_blind_review",
    "name": "盲审",
    "desc": "没有监控，裸奔上线",
    "effect": "不显示风险报告",
    "modifier": { "hide_risk_report": true }
  },
  {
    "id": "boss_tech_debt_explosion",
    "name": "技术债爆发",
    "desc": "长期欠下的技术债集中爆发",
    "effect": "所有已部署组件额外暴露 1 个随机风险",
    "modifier": { "extra_random_risk_per_component": 1 }
  },
  {
    "id": "boss_single_point",
    "name": "单点故障",
    "desc": "架构审查要求消除所有单点",
    "effect": "不允许同 tag 出现在 2 张组件上",
    "modifier": { "no_duplicate_tags": true }
  }
]
```

### 17.10 Tarot（一次性消耗品）
```json
[
  {
    "id": "tarot_user_research",
    "name": "用户调研",
    "desc": "提前了解用户痛点，预知下一个事件",
    "type": "info_reveal",
    "effect": "reveal_next_event",
    "shop_cost": 3,
    "rarity": "common"
  },
  {
    "id": "tarot_competitive_analysis",
    "name": "竞品分析",
    "desc": "研究竞品架构方案，揭示当前阶段的最优牌型组合与对应容量消耗",
    "type": "info_reveal",
    "effect": "reveal_optimal_pattern_with_cost",
    "shop_cost": 4,
    "rarity": "uncommon"
  },
  {
    "id": "tarot_ab_test",
    "name": "A/B 测试",
    "desc": "小流量验证，揭示当前最接近触发的牌型",
    "type": "info_reveal",
    "effect": "reveal_nearest_patterns",
    "shop_cost": 3,
    "rarity": "common"
  },
  {
    "id": "tarot_market_report",
    "name": "市场报告",
    "desc": "行业报告揭示本阶段事件池中的所有事件类型",
    "type": "info_reveal",
    "effect": "reveal_event_pool",
    "shop_cost": 5,
    "rarity": "uncommon"
  },
  {
    "id": "tarot_tech_spike",
    "name": "技术 Spike",
    "desc": "快速原型验证，临时为一个组件添加一个 tag",
    "type": "state_modify",
    "effect": { "action": "add_tag_to_component", "tag_count": 1 },
    "shop_cost": 4,
    "rarity": "uncommon"
  },
  {
    "id": "tarot_arch_review",
    "name": "架构评审",
    "desc": "专家评审指出漏洞并修补，免费封堵 1 个风险",
    "type": "state_modify",
    "effect": { "action": "seal_risk", "count": 1 },
    "shop_cost": 5,
    "rarity": "uncommon"
  },
  {
    "id": "tarot_emergency_scaleup",
    "name": "紧急扩容",
    "desc": "临时扩容，本阶段容量预算 +15",
    "type": "state_modify",
    "effect": { "action": "add_capacity_budget", "amount": 15 },
    "shop_cost": 5,
    "rarity": "uncommon"
  },
  {
    "id": "tarot_refactor_sprint",
    "name": "重构冲刺",
    "desc": "集中重构，1 个组件容量消耗降低 30%",
    "type": "state_modify",
    "effect": { "action": "reduce_component_capacity", "factor": 0.7, "count": 1 },
    "shop_cost": 4,
    "rarity": "common"
  },
  {
    "id": "tarot_tech_debt_cleanup",
    "name": "技术债清理",
    "desc": "还债！移除 1 个组件上的 1 个暴露风险",
    "type": "state_modify",
    "effect": { "action": "remove_exposed_risk", "count": 1 },
    "shop_cost": 6,
    "rarity": "rare"
  },
  {
    "id": "tarot_postmortem",
    "name": "复盘会",
    "desc": "事故复盘后团队成长，下一次事件惩罚减半",
    "type": "state_modify",
    "effect": { "action": "next_event_penalty_factor", "factor": 0.5 },
    "shop_cost": 4,
    "rarity": "common"
  }
]
```

---

## 18. 结算解释器输出模板

每个阶段结算后输出结构化"论证链"：

- **方案摘要**：已部署组件列表、tags 汇总、容量使用情况
- **风险报告**：暴露的风险向量、已封堵的风险向量
- **牌型触发**：哪些基础牌型/超级牌型生效
- **Joker 生效**：哪些 Joker 条件满足，倍数贡献
- **事件回放**：事件名称 → 攻击的风险向量 → 是否命中 → 实际惩罚
- **约束校验**：SLA/容量/合规通过/失败与扣分明细
- **最终面板**：Perf / Rel / Cx 最终值
- **评分明细**：Chips → Mult → ConstraintPenalty → Final
- **学习点**：每条一句系统设计原则

---

## 19. 示例一局 Walkthrough

### 19.1 短链接系统 × 性能流派

**开局**：选性能流派（性能组件容量 -30%），抽到短链接场景包。

**Draft**：10 轮三选一，积累组件池。优先抢 CDN、Cache、Read Replica（性能流派打折）。

**Small Blind（MVP - 先把短链跳转跑通）**：
- 部署：CDN(6点) + Cache(11点) + SQL DB(20点) = 37/110
- 触发：读优化（Read Beast）mult +2
- 事件：慢查询风暴 → 攻击 slow_query → 命中（SQL DB 暴露 slow_query）→ perf -3, rel -2
- 修补：加入 Circuit Breaker(8点) 保护下游
- 结算：通过目标分

**Shop 1**：买入 Read Replica、Cache Warm-up；买入 Joker"热点驯服者"

**Big Blind（Beta - 日活 10 万，开始卖广告）**：
- 部署：CDN(6) + Cache(11) + SQL DB(20) + Read Replica(10) + Circuit Breaker(8) = 55/90
- 触发：读优化 mult +2
- 风险敞口：cache_avalanche, data_inconsistency, replication_lag（3 个！）
- 超级牌型：刀尖跳舞 → 返还 20 点容量！
- 事件：热点 Key → 攻击 cache_avalanche → 命中 → 但 Joker"热点驯服者"减免 ×0.4
- 结算：通过目标分

**Shop 2**：买入 Observability，买入 Joker"先观测再上线"

**Boss Blind（生产 - 热点营销活动）**：Boss 规则"缓存禁用"→ Cache 容量翻倍！
- 部署取舍：Cache 现在要 30 点，还带不带？
- 如果不带 Cache → 读优化牌型断了 → 刀尖跳舞也没了
- 如果带 Cache → 30 点太贵，其他组件放不下
- 关键决策：带 Cache 但放弃 Multi-AZ，靠 Observability + Circuit Breaker 硬扛
- 双事件打击...

### 19.2 订单系统 × 合规流派

**开局**：选合规流派（免费预装 Audit Log + Encryption，Joker 槽 -1）

**Small Blind（MVP - 能下单能付款）**：
- Audit Log + Encryption 已免费就位，无需操心合规
- 专注构建核心：API Gateway + SQL DB + Idempotency
- 为 Beta 阶段的合规审查提前布局

**Boss Blind（双十一 + 金融审计）**：Boss 规则"技术债爆发"
- 每个组件额外暴露 1 个随机风险 → 风险面爆炸
- 但合规流派提前布好了 Audit Log + Encryption → 合规审计事件免疫
- 关键取舍：用有限的 Joker 槽位（只有 3 个）对抗技术债带来的额外风险

---

## 20. 原型实现步骤

### 20.1 最小可玩原型（三个模块）
1. **Draft**：3 选 1，重复 N 次，构建组件池
2. **Deploy**：从组件池选组件部署，容量预算约束，风险报告即时反馈
3. **Resolve**：抽事件，风险暴露面判定，修补，结算

### 20.2 结算解释器（强烈建议）
输出结构化论证链（详见第 17 章），这是教学价值的核心载体。

### 20.3 迭代路径
1. 先跑通单阶段（无 Shop/无 Joker/无流派）
2. 加入三阶段递进 + Shop
3. 加入 Joker 系统 + 架构流派
4. 加入超级牌型 + Boss 规则
5. 数值平衡调优

---

## 21. 后续迭代方向

- **金币/经济系统**：Shop 的定价与平衡，事件存活奖励金币
- **更多场景包**：Feed 系统、文件上传、搜索引擎、通知推送、支付网关
- **更多组件**：Object Storage、Search Index、Sharding、Feature Flag、Service Mesh
- **事件连锁反应**：慢查询 → 触发重试风暴 → 触发熔断（事件链）
- **多人模式**：同一场景不同玩家同时设计，对比方案
- **解锁系统**：通关奖励新流派/新 Joker/新场景包
- **UI/UX**：Draft → Deploy → Event → Review 四屏流程，强化论证链动画展示

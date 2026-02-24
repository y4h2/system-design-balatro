# System Design 卡牌游戏 - 可玩性重设计方案

> 基于原 PRD，针对"倍率爆发不够爽"和"组件之间缺乏取舍张力"两大问题的重设计。

---

## 1. 核心改动总结

| 原设计 | 新设计 |
|---|---|
| 四维评分（Perf/Rel/Cost/Cx） | 三维评分（Perf/Rel/Cx），Cost 合并为容量点数系统 |
| 组件无代价，放进去就加分 | 容量点数限制 + 风险暴露面，每张牌都有取舍 |
| Mult 加法叠加，数值平 | 加法为主 + 阈值爆发 + Joker 小倍数（×1.2~×1.5） |
| 6 回合线性流程 | 3 阶段递进（MVP → Beta → Boss），单场景包 |
| Joker 单次选择 | 3-5 槽位，Shop 阶段收集，跨阶段保留 |
| 无流派/Deck 概念 | 架构流派（= Balatro Deck），定义整局规则偏移 |

---

## 2. 三维评分体系

| 维度 | 含义 | 基线 |
|---|---|---|
| Perf（性能） | 吞吐、P99 延迟、热点抗性 | 2 |
| Rel（可靠性） | SLA、容灾、降级、背压 | 2 |
| Cx（复杂度） | 认知负担、故障面、调试难度 | 2 |

Cost 不再作为独立维度，由容量点数系统取代。

```
Chips = wP × Perf + wR × Rel - wX × Cx
Final = round(Chips × Mult - ConstraintPenalty)
```

每个场景阶段设有目标分数，达到才算通过。

---

## 3. 容量点数系统

取代原设计中的 Cost 维度和离散槽位：

- 每个场景阶段给定容量预算（MVP 阶段宽裕，Boss 阶段紧缩）
- 每个组件消耗不同点数（6~25），反映真实资源占用差异
- 部署时总消耗不能超预算，超出部分进入 ConstraintPenalty
- 架构流派可偏移特定类型组件的消耗

组件容量消耗示例：

```
CDN            →  8 点（轻量）
Rate Limiter   →  6 点（轻量）
Health Check   →  5 点（轻量）
Redis Cache    → 15 点（中等）
Message Queue  → 12 点（中等）
Observability  → 18 点（中等偏重）
SQL DB         → 20 点（重型）
Multi-AZ       → 25 点（很重）

封堵组件：
Cache Warm-up  →  8 点
Dead Letter Q  →  6 点
Consistency Ck →  8 点
```

设计意图：容量预算递减 + 组件池在变大 = 你拥有的零件越来越多，但能部署的越来越少，逼你做更精准的取舍。

---

## 4. 风险暴露面系统

每个组件在提供能力的同时暴露风险向量：

| 组件 | 收益 | 暴露的风险 |
|---|---|---|
| Redis Cache | perf +3 | `cache_avalanche`, `data_inconsistency` |
| Read Replica | perf +2 | `replication_lag`, `data_inconsistency` |
| Message Queue | rel +1, perf +1 | `message_loss`, `ordering_violation` |
| Multi-AZ | rel +3 | `network_partition`, `cost_explosion` |
| Circuit Breaker | rel +2 | `false_tripping` |

### 封堵组件

主要作用是封堵风险，不直接贡献牌型或高面板分：

| 封堵组件 | 封堵的风险 |
|---|---|
| Cache Warm-up | `cache_avalanche` |
| Consistency Checker | `data_inconsistency`, `replication_lag` |
| Dead Letter Queue | `message_loss` |
| Idempotency Key | `ordering_violation`, `duplicate_submit` |

核心矛盾：封堵组件占容量但不出力。带它 = 安全但火力不足，不带 = 火力猛但赌事件。

### 事件如何攻击风险

事件攻击特定风险向量：

- 方案暴露了该风险 → 吃满惩罚
- 风险已被封堵 → 完全免疫
- 方案不涉及该风险（没用相关组件）→ 事件无效

---

## 5. 倍率系统

### 5.1 基础倍率（加法叠加）

Mult 从 1 起步，每触发一个牌型 +1 到 +3：

```
读优化 (Read Beast)        → mult +2
削峰填谷 (Shock Absorber)  → mult +2
高可用 (Always On)          → mult +3
可观测闭环 (Debug Loop)     → mult +1 + 全事件减免
```

### 5.2 Joker 小倍数（乘法，上限 ×1.5）

Joker 提供小幅乘数，条件触发：

```
SLA 狂魔   → 方案含 multi_az 时 ×1.3
异步信徒   → 方案含 queue+worker 时 ×1.2
热点驯服者 → 方案含 cache 时 ×1.2
```

计算顺序：

```
Mult = (1 + Σ pattern_mult + 超级牌型 bonus) × Π joker_multipliers
```

### 5.3 超级牌型（阈值爆发）

核心爽点。每个超级牌型的触发条件和奖励类型完全不同：

| 超级牌型 | 触发条件 | 奖励类型 | 效果 |
|---|---|---|---|
| 全栈架构师 | 同时触发 3 个基础牌型 | **Mult 爆发** | mult +8 |
| 刀尖跳舞 | 触发牌型 + 风险敞口 ≥ 3 | **容量返还** | 返还 20 点容量，可立即补组件 |
| 铜墙铁壁 | 触发牌型 + 风险敞口 = 0 | **事件免疫** | 本阶段剩余事件惩罚归零 |
| 极简主义 | 容量用了不到 60% + 触发牌型 | **维度翻转** | Cx 从扣分项变加分项 |

设计意图：

- 全栈架构师 → 追天花板（贪心玩家）
- 刀尖跳舞 → 追滚雪球（高风险高回报）
- 铜墙铁壁 → 追确定性（下限极高）
- 极简主义 → 追逆向思维（少即是多）

---

## 6. 架构流派（= Balatro Deck）

开局选 1 个，贯穿整局，定义底层规则偏移：

| 流派 | 规则偏移 | 映射的工程文化 |
|---|---|---|
| SRE 流派 | 可靠性组件容量 -30%，事件 severity +1 | "我们不怕贵，怕的是挂" |
| 创业流派 | 总容量 +20，交付约束减半 | "先上线再说" |
| 极简流派 | 总容量只有 70，Cx 不作为扣分项 | "less is more" |
| 合规流派 | 免费预装 Audit Log + Encryption，Joker 槽位 -1 | "合规先行" |
| 性能流派 | 性能组件容量 -30%，Rel 基线降到 1 | "快就是正义" |

流派可调整的核心资源：

- Draft 轮数
- 修补次数
- Joker 槽位数（默认 4）
- 容量预算
- 维度基线

---

## 7. Joker 系统（3-5 槽）

### 获取方式

- Shop 阶段购买（每次 Shop 展示 3 张随机 Joker）
- 部分超级牌型触发时奖励

### 设计原则

- 提供小倍数（×1.2 ~ ×1.5），条件触发
- Joker 之间可产生组合效应
- 跨阶段保留，构成 build 的核心引擎

### 示例组合

```
SLA 狂魔 (×1.3 if multi_az)
+ 先观测再上线 (事件惩罚 ×0.75 if obs)
+ 热点驯服者 (×1.2 if cache)

= 高可用 + 可观测 + 缓存路线，三张 Joker 互相强化
  总乘数：×1.3 × ×1.2 = ×1.56（在基础 Mult 之上）
```

---

## 8. 一局结构：三阶段递进

一局 = 1 个场景包，包含三个阶段，模拟同一系统的生命周期演进：

```
选架构流派
  ↓
初始 Draft（构建组件池）
  ↓
Small Blind - MVP（先跑起来）
  → 部署 → 风险报告 → 事件 → 修补 → 结算
  ↓
Shop（买卖组件 / 获取 Joker）
  ↓
Big Blind - Beta（用户开始付费）
  → 部署 → 风险报告 → 事件 → 修补 → 结算
  ↓
Shop（买卖组件 / 获取 Joker）
  ↓
Boss Blind - 生产压测（大促/全量上线）
  → 部署 → 风险报告 → 事件×2 → 修补 → 最终结算
```

### 场景包结构

```json
{
  "id": "scenario_chat",
  "name": "即时聊天系统",
  "phases": [
    {
      "blind": "small",
      "subtitle": "MVP - 先让消息发出去",
      "capacity_budget": 120,
      "target_score": 15,
      "constraints": { "sla": 99.5, "compliance": "low" },
      "weights": { "perf": 1.2, "rel": 0.8, "cx": 0.5 },
      "event_pool_severity": [1, 2]
    },
    {
      "blind": "big",
      "subtitle": "Beta - 用户开始付费了",
      "capacity_budget": 100,
      "target_score": 30,
      "constraints": { "sla": 99.9, "budget_cost_max": 10, "compliance": "medium" },
      "weights": { "perf": 1.3, "rel": 1.2, "cx": 0.8 },
      "event_pool_severity": [2, 3]
    },
    {
      "blind": "boss",
      "subtitle": "生产压测 - 百万用户大促",
      "capacity_budget": 80,
      "target_score": 50,
      "constraints": { "sla": 99.99, "budget_cost_max": 8, "compliance": "high" },
      "weights": { "perf": 1.5, "rel": 1.5, "cx": 1.0 },
      "boss_rule": "cache_disabled",
      "event_pool_severity": [4, 5]
    }
  ]
}
```

### 阶段间的递进逻辑

- **容量预算递减**：MVP 宽裕（120）→ Boss 紧缩（80）
- **权重递进**：MVP 阶段 Rel 权重低（能用就行）→ Boss 阶段拉满（不能挂）
- **约束递增**：MVP 无合规要求 → Boss 要求 high compliance
- **事件烈度递增**：MVP severity 1-2 → Boss severity 4-5
- **组件池持续积累**：你的"组件库"越来越大，但每阶段能部署的在变少

教学价值：MVP 时偷懒的决策会在 Boss 阶段变成技术债的代价。

---

## 9. 单个阶段内的流程

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
5. 每次事件后允许 1 次修补动作：
   a) 替换 1 张组件（退回容量，换入新组件）
   b) 加入 1 张封堵组件（消耗容量）
   c) 不操作
6. 结算：Chips × Mult - Penalty，对比目标分
```

---

## 10. Shop 阶段

阶段之间的 Shop，玩家可执行：

- 从随机 3 张组件中购买（消耗金币）→ 加入组件池
- 出售已有组件（回收部分金币）
- 从随机 3 张 Joker 中购买
- 出售 Joker（回收金币）
- 移除组件（减少池中不需要的牌，提高后续部署精度）

---

## 11. Boss 规则示例

| Boss 规则 | 效果 |
|---|---|
| 缓存禁用 | cache 标签组件容量翻倍 |
| 预算腰斩 | 容量上限减半 |
| 盲审 | 不显示风险报告 |
| 技术债爆发 | 所有组件额外暴露 1 个随机风险 |
| 单点故障 | 不允许同 tag 出现在 2 张组件上 |

---

## 12. 对原 PRD 的改动清单

以下列出与原 PRD 的主要差异，便于对照：

1. **四维 → 三维**：Cost 维度移除，由容量点数系统取代
2. **离散槽位 → 容量点数**：组件消耗 6~25 不等的容量点，精细粒度取舍
3. **新增风险暴露面**：组件携带 `exposes` 字段，事件攻击特定风险向量
4. **新增封堵组件**：专门用于封堵风险，占容量但不出力
5. **倍率重构**：加法为主 + 阈值爆发（超级牌型）+ Joker 小倍数（×1.2~1.5）
6. **超级牌型**：4 种不同奖励类型（Mult/容量返还/事件免疫/维度翻转）
7. **新增架构流派**：= Balatro Deck，开局选择，定义整局规则偏移
8. **Joker 重构**：从单次选择改为 3-5 槽、Shop 收集、跨阶段保留
9. **回合结构重构**：从 6 回合线性改为 3 阶段递进（MVP → Beta → Boss）
10. **场景包**：单场景卡改为三阶段场景包，模拟系统生命周期
11. **新增 Shop 阶段**：阶段之间可买卖组件和 Joker
12. **新增 Boss 规则**：Boss 阶段附加特殊限制

---

## 13. 后续待细化

- 金币/经济系统设计（Shop 的定价与平衡）
- 完整组件牌库（含容量消耗值与风险暴露面）
- 完整 Joker 牌库（含倍数条件）
- 完整场景包设计（3-5 个场景包）
- 数值平衡（目标分数、容量预算、惩罚系数的调参）
- 结算解释器适配新机制
- UI/UX 流程设计

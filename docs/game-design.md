# 系统架构 — 游戏设计文档

> 一款以系统设计为主题的 Balatro 风格卡牌策略游戏。

---

## 目录

1. [游戏概览](#1-游戏概览)
2. [游戏流程](#2-游戏流程)
3. [核心机制](#3-核心机制)
4. [Domain 与 Tag 体系](#4-domain-与-tag-体系)
5. [组件卡 (Components)](#5-组件卡-components)
6. [Joker 卡](#6-joker-卡)
7. [Tarot 卡与卡包](#7-tarot-卡与卡包)
8. [Pattern 牌型](#8-pattern-牌型)
9. [Super Pattern 超级牌型](#9-super-pattern-超级牌型)
10. [School 流派](#10-school-流派)
11. [Scenario 场景](#11-scenario-场景)
12. [Boss Rule 首领规则](#12-boss-rule-首领规则)
13. [商店系统](#13-商店系统)
14. [得分公式](#14-得分公式)
15. [UI 视觉设计](#15-ui-视觉设计)
16. [Platform 平台](#16-platform-平台)

---

## 1. 游戏概览

| 属性 | 值 |
|------|---|
| 游戏名称 | 系统架构 (System Architecture) |
| 副标题 | 架构卡牌游戏 |
| 类型 | Roguelike 卡牌策略 |
| 单局时长 | ~15-20 分钟 |
| 技术栈 | React 19 + Vite, Zustand, Tailwind CSS v4, Framer Motion |

**核心玩法**：选择一个流派（School）+ 一个平台（Platform）+ 一个场景（Scenario），通过 3 个盲注阶段（Small → Big → Boss），每阶段打出多手牌（Balatro 式 Hands 系统），用技术组件卡牌凑成架构 Pattern 得分。阶段间访问商店购买 Joker、Tarot 和组件。**通过 2/3 阶段即为胜利。**

---

## 2. 游戏流程

```
TitleScreen（选流派 + 平台 + 场景）
  → BlindSelectScreen（预览 3 个阶段目标）
    → PlayScreen（发牌 → 多手出牌循环）
      → HandResultScreen（每手得分展示）
        → PlayScreen（继续出牌）
          → SettlementScreen（阶段总结算、Pass/Fail）
            → ShopScreen（购买组件/Joker/Tarot 卡包）
              → BlindSelectScreen（下一阶段）
                → …重复…
                  → GameOverScreen（胜负结算）
```

### Hands 系统（Balatro 式）

每个阶段采用多手出牌制：

```
BlindSelect → 发牌(deck→hand, 8张)
  循环直到 hands 用完:
    → 选卡出牌(1~5张) → 本手计分 → 出过的卡进弃牌堆 → 从 deck 补满手牌
    或
    → 选卡弃牌(1~5张) → 弃牌堆 → 从 deck 补满手牌（消耗 1 次 discard）
→ 最终结算: Σ 各手分数 + 路线精通 - 约束惩罚
→ 商店
```

| 项目 | 规则 |
|------|------|
| Deck | componentPool（已按 platform 过滤）洗牌 |
| 手牌上限 | 8 + 流派/Joker 加成 |
| Hands | 4 次出牌（可被流派/Joker 修改） |
| Discards | 3 次弃牌（可被流派/Joker 修改） |
| 每手出牌 | 1~5 张 |
| 出牌后 | 卡进弃牌堆，从 deck 补满手牌 |
| 每手计分 | 独立 `chips × mult`（本手卡 + Pattern + Joker + Platform bonus） |
| 约束/容量 | 所有手结束后累计检查 |
| 目标分数 | Σ 各手分数 + 路线精通 - 惩罚 ≥ target |

### 各屏幕说明

| 屏幕 | 功能 |
|------|------|
| **TitleScreen** | 轮播 6 个流派卡片，选择场景，进入游戏或图鉴 |
| **BlindSelectScreen** | 展示 3 个阶段卡片（目标分数、容量预算、约束条件、Boss 规则），可跳过非 Boss 阶段换取奖励 |
| **PlayScreen** | 主战场：左侧得分面板（含 Hands/Discards 计数、累计分数） + 右侧手牌区/Joker 区/Tarot 区 |
| **HandResultScreen** | 每手出牌后的得分展示：chips/mult 拆解、触发 Pattern、路线冲突丢弃、累计分数 |
| **SettlementScreen** | 阶段总结算：所有手累计得分 + 路线精通 + Super Pattern - 惩罚 |
| **ShopScreen** | 购买/出售组件和 Joker，购买 Tarot 卡包（翻书动画） |
| **GameOverScreen** | 显示 3 阶段战绩，胜/负判定 |
| **CollectionScreen** | 图鉴：左右分栏，左侧卡牌网格，右侧详情面板（数值 + 典故），底部测试台 |

---

## 3. 核心机制

### 3.1 手牌与出牌

- 进入 Play 阶段时，组件池洗牌后发 `handSize` 张手牌，剩余为摸牌堆
- **手牌上限** = 8 + 流派加成 + Joker 加成
- **出牌次数 (Hands)** = 4 + 流派/Joker 加成
- **弃牌次数 (Discards)** = 3 + 流派加成 + Joker 加成
- 每次出牌：选 1~5 张 → 本手独立计分 → 卡进弃牌堆 → 从摸牌堆补满手牌
- 每次弃牌：选 ≤5 张 → 放入弃牌堆 → 从摸牌堆补等量牌 → 消耗 1 次弃牌机会
- 所有手出完后进入阶段结算

### 3.2 容量与约束

- 每个组件有 `capacity_cost`（范围 4–20）
- 每个阶段有 `capacity_budget`（范围 70–120，受流派 offset 调整）
- **容量累计检查**：所有手打出的卡累计容量在阶段结算时检查
- 流派可对特定 tag 的组件打折（如 SRE 流派：[ha, monitor] 七折）
- **超预算惩罚** = (总容量 - 预算) × 5

### 3.3 约束系统

每个阶段有约束条件，每个未达标的约束扣除固定惩罚值：

| 约束类型 | 说明 |
|---------|------|
| `min_perf` | 面板 Performance ≥ 阈值 |
| `min_rel` | 面板 Reliability ≥ 阈值 |
| `max_cx` | 面板 Complexity ≤ 阈值 |
| `min_domains` | 部署的不同 Domain 数量 ≥ 阈值 |
| `required_tags` | 必须包含指定 tag |

```
总约束惩罚 = constraint_penalty × 未达标约束数
```

### 3.4 面板值（P/R/CX）

```
Panel.perf = baseline.perf + Σ component.delta.perf   (钳制 0–10)
Panel.rel  = baseline.rel  + Σ component.delta.rel    (钳制 0–10)
Panel.cx   = baseline.cx   + Σ component.delta.cx     (钳制 0–10)
```

基线默认 {perf:2, rel:2, cx:2}，流派可覆盖。

---

## 4. Domain 与 Tag 体系

### 5 个 Domain

| Domain | 中文 | 颜色 | 图标 |
|--------|------|------|------|
| compute | 计算 | #3b82f6 蓝 | lucide:cpu |
| data | 数据 | #22c55e 绿 | lucide:database |
| network | 网络 | #f59e0b 琥珀 | lucide:network |
| defense | 防御 | #ef4444 红 | lucide:shield |
| platform | 平台 | #a855f7 紫 | lucide:gauge |

### 常用 Tag

`compute` `async` `deploy` `ha` `db` `cache` `storage` `queue` `search` `monitor` `security` `gateway` `edge` `replication` `realtime`

---

## 5. 组件卡 (Components)

共 **92 张**（50 通用 + 10 AWS + 10 GCP + 10 Azure + 12 自建），分布在 5 个 Domain。每张卡有：基础筹码 (base_chips)、面板增量 (delta P/R/CX)、容量成本 (capacity_cost)、标签 (tags)、稀有度。

> 每张组件卡有 `platform` 字段：`generic`（通用）、`aws`、`gcp`、`azure` 或 `selfhosted`。每局游戏只包含通用牌 + 所选平台的专属牌。

### 通用组件 — Compute 域 (8 张)

| 名称 | Tags | Chips | P/R/CX | Cap | Rarity |
|------|------|-------|--------|-----|--------|
| K8s Pod | compute, deploy | 4 | +1/+1/+1 | 12 | uncommon |
| Worker Fleet | compute, async | 3 | +1/0/0 | 8 | common |
| Cron Job | compute, async | 2 | 0/0/0 | 4 | common |
| Auto Scaler | compute, ha | 3 | +1/+1/+1 | 10 | uncommon |
| Batch 计算 | compute, async | 3 | +1/0/+1 | 9 | common |
| Edge Function | compute, edge | 3 | +2/0/0 | 7 | uncommon |
| GPU 实例 | compute | 5 | +3/0/+1 | 15 | rare |
| 微服务 | compute, deploy | 3 | +1/0/+1 | 7 | common |

### 通用组件 — Data 域 (11 张)

| 名称 | Tags | Chips | P/R/CX | Cap | Rarity |
|------|------|-------|--------|-----|--------|
| PostgreSQL | db | 4 | +1/+1/+1 | 14 | common |
| MySQL | db | 3 | +1/+1/0 | 12 | common |
| MongoDB | db | 3 | +2/0/0 | 12 | common |
| Redis | cache, db | 4 | +3/0/0 | 10 | common |
| Memcached | cache | 3 | +2/0/0 | 6 | common |
| Elasticsearch | search, db | 4 | +2/0/+1 | 14 | uncommon |
| TimescaleDB | db, monitor | 3 | +1/+1/+1 | 12 | uncommon |
| Kafka | queue, async, realtime | 5 | +2/+1/+1 | 16 | uncommon |
| RabbitMQ | queue, async | 3 | +1/+1/0 | 10 | common |
| Data Warehouse | db, storage | 4 | +1/+1/+2 | 16 | uncommon |
| Graph DB | db, search | 4 | +1/0/+1 | 14 | rare |

### 通用组件 — Network 域 (8 张)

| 名称 | Tags | Chips | P/R/CX | Cap | Rarity |
|------|------|-------|--------|-----|--------|
| Nginx | gateway | 3 | +1/0/0 | 6 | common |
| Kong API Gateway | gateway, security | 4 | 0/+1/+1 | 10 | uncommon |
| GeoDNS | edge, gateway | 3 | +1/+1/0 | 8 | uncommon |
| Rate Limiter | gateway, security | 2 | 0/+1/0 | 5 | common |
| WAF | security, gateway | 2 | 0/+1/0 | 6 | common |
| WebSocket Gateway | gateway, realtime | 3 | +1/0/+1 | 10 | uncommon |
| Istio Service Mesh | gateway, security, monitor | 5 | 0/+2/+2 | 16 | rare |
| Global Accelerator | edge, ha | 4 | +2/+1/0 | 12 | uncommon |

### 通用组件 — Defense 域 (12 张)

| 名称 | Tags | Chips | P/R/CX | Cap | Rarity |
|------|------|-------|--------|-----|--------|
| Multi-AZ Deploy | ha | 4 | 0/+3/+1 | 16 | uncommon |
| Circuit Breaker | ha | 3 | 0/+2/0 | 7 | common |
| Health Check | ha, monitor | 2 | 0/+1/0 | 4 | common |
| Active-Standby Failover | ha, replication | 4 | 0/+3/+1 | 14 | uncommon |
| Backup & Restore | ha, storage | 2 | 0/+2/0 | 6 | common |
| Dead Letter Queue | async, ha | 2 | 0/+1/0 | 5 | common |
| Idempotency Key | security | 2 | 0/+1/0 | 5 | common |
| Consistency Checker | monitor, db | 3 | 0/+1/+1 | 8 | uncommon |
| Disaster Recovery | ha, replication | 5 | 0/+3/+2 | 20 | rare |
| Blue-Green Deploy | deploy, ha | 3 | 0/+2/+1 | 10 | uncommon |
| Chaos Monkey | ha, monitor | 3 | 0/+1/+1 | 8 | uncommon |
| Canary Deploy | deploy, monitor | 3 | 0/+1/0 | 7 | common |

### 通用组件 — Platform 域 (11 张)

| 名称 | Tags | Chips | P/R/CX | Cap | Rarity |
|------|------|-------|--------|-----|--------|
| Prometheus | monitor | 3 | 0/+1/0 | 7 | common |
| Datadog | monitor | 4 | 0/+1/0 | 12 | uncommon |
| Grafana | monitor | 2 | 0/0/0 | 5 | common |
| ELK Stack | monitor, search | 4 | 0/+1/+1 | 12 | uncommon |
| Feature Flag | deploy | 2 | 0/+1/0 | 4 | common |
| Config Center | deploy | 2 | 0/+1/0 | 5 | common |
| Vault | security | 3 | 0/+1/0 | 8 | uncommon |
| Audit Log | security, monitor | 2 | 0/+1/0 | 6 | common |
| Encryption | security | 2 | 0/+1/0 | 5 | common |
| ArgoCD | deploy | 3 | 0/+1/+1 | 9 | uncommon |
| Terraform | deploy | 3 | 0/+1/+1 | 9 | uncommon |

> **通用合计：8 + 11 + 8 + 12 + 11 = 50 张**

### AWS 专属组件 (10 张)

| 名称 | Domain | Tags | Chips | P/R/CX | Cap | Rarity |
|------|--------|------|-------|--------|-----|--------|
| EC2 实例 | compute | compute | 3 | +1/0/0 | 8 | common |
| Lambda 函数 | compute | compute, async | 2 | 0/0/0 | 5 | common |
| ECS 容器服务 | compute | compute, deploy | 4 | +1/+1/0 | 10 | uncommon |
| Step Functions | compute | compute, async | 3 | 0/+1/+1 | 8 | uncommon |
| DynamoDB | data | db | 4 | +2/+1/0 | 14 | uncommon |
| Aurora | data | db, ha | 5 | +2/+2/+1 | 18 | rare |
| S3 对象存储 | data | storage | 2 | 0/+1/0 | 5 | common |
| SQS | data | queue, async | 2 | +1/+1/0 | 6 | common |
| ALB 负载均衡 | network | gateway, ha | 3 | +1/+1/0 | 8 | common |
| CloudFront CDN | network | edge, cache | 4 | +2/0/0 | 10 | common |

### GCP 专属组件 (10 张)

| 名称 | Domain | Tags | Chips | P/R/CX | Cap | Rarity |
|------|--------|------|-------|--------|-----|--------|
| Cloud Run | compute | compute, deploy | 3 | +1/+1/0 | 7 | common |
| Cloud Functions | compute | compute, async | 2 | +1/0/0 | 5 | common |
| GKE | compute | compute, deploy | 4 | +1/+1/+1 | 12 | uncommon |
| BigQuery | data | db, search | 5 | +3/+1/+1 | 16 | rare |
| Cloud Spanner | data | db, ha, replication | 5 | +2/+3/+2 | 20 | rare |
| Firestore | data | db, realtime | 3 | +1/+1/0 | 10 | common |
| Pub/Sub | data | queue, async | 3 | +1/+1/0 | 8 | common |
| Cloud CDN | network | edge, cache | 3 | +2/0/0 | 8 | common |
| Cloud Armor | network | security, gateway | 3 | 0/+1/0 | 7 | uncommon |
| Cloud Monitoring | platform | monitor | 3 | 0/+1/0 | 6 | common |

### Azure 专属组件 (10 张)

| 名称 | Domain | Tags | Chips | P/R/CX | Cap | Rarity |
|------|--------|------|-------|--------|-----|--------|
| Azure Functions | compute | compute, async | 2 | +1/0/0 | 5 | common |
| AKS | compute | compute, deploy | 4 | +1/+1/+1 | 11 | uncommon |
| App Service | compute | compute, deploy | 3 | +1/+1/0 | 8 | common |
| Cosmos DB | data | db, replication, ha | 5 | +2/+3/+1 | 18 | rare |
| Azure SQL | data | db | 4 | +1/+2/0 | 14 | uncommon |
| Service Bus | data | queue, async | 3 | +1/+1/0 | 8 | common |
| Blob Storage | data | storage | 2 | 0/+1/0 | 5 | common |
| Azure Front Door | network | edge, gateway, ha | 4 | +2/+1/0 | 12 | uncommon |
| Application Gateway | network | gateway, security | 3 | +1/+1/0 | 8 | common |
| Azure Monitor | platform | monitor | 3 | 0/+1/0 | 7 | common |

### 自建专属组件 (12 张)

| 名称 | Domain | Tags | Chips | P/R/CX | Cap | Rarity |
|------|--------|------|-------|--------|-----|--------|
| Bare Metal Server | compute | compute | 4 | +2/0/0 | 10 | common |
| Docker Swarm | compute | compute, deploy | 3 | +1/+1/+1 | 9 | common |
| Nomad | compute | compute, deploy | 4 | +1/+1/0 | 10 | uncommon |
| CockroachDB | data | db, ha, replication | 5 | +2/+2/+2 | 18 | rare |
| MinIO | data | storage | 3 | +1/+1/0 | 7 | common |
| NATS | data | queue, async | 3 | +2/0/0 | 7 | common |
| HAProxy | network | gateway, ha | 4 | +1/+2/0 | 8 | common |
| Traefik | network | gateway, deploy | 3 | +1/+1/0 | 7 | common |
| WireGuard | network | security | 2 | 0/+1/0 | 5 | common |
| Ansible | platform | deploy | 3 | 0/+1/+1 | 8 | uncommon |
| Raspberry Pi 集群 | compute | compute, **wildcard** | 2 | 0/0/+1 | 6 | uncommon |
| LXC/Incus | platform | deploy, **wildcard** | 2 | 0/0/+1 | 5 | uncommon |

#### Wildcard 机制

自建平台的 2 张 wildcard 卡（Raspberry Pi 集群、LXC/Incus）在 Pattern 匹配时可充当**任意一个** tag，体现"自建万能、DIY 灵活"的身份。

- tags 中包含 `"wildcard"` 的卡牌在 `matchTagsDistinct` 匹配时可满足任意 tag 需求
- 受 distinct-card 约束，每张 wildcard 卡每次匹配只能充当一个 tag
- Wildcard 不影响 domain 计数、constraint 检查、Joker 条件
- 代价：base_chips 仅 2（远低于正常卡 3-5），且 CX +1

---

## 6. Joker 卡

共 **20 张**。Joker 是持久增益卡，跨阶段保留在 Joker 槽中（上限 3–5，取决于流派）。

### Joker 激活条件

1. `require_all_tags`：本手出牌的 tag 集必须**全部包含**这些 tag
2. `require_any_tags`：本手出牌的 tag 集必须**至少包含一个**
3. `special`：特殊条件判定（见下表）

### 特殊条件一览

| Special | 触发条件 |
|---------|---------|
| `five_same_domain` | 本手 5 张同 Domain 卡 |
| `all_different_domains` | 本手所有卡 Domain 各不相同 |
| `component_count_lte_3` | 本手出牌 ≤3 张 |
| `component_count_gte_4` | 本手出牌 ≥4 张 |
| `capacity_over_budget` | 阶段累计容量超预算 |
| `capacity_under_budget` | 阶段累计容量未超预算 |

### 全部 20 张 Joker

| 名称 | 效果类型 | 效果 | 激活条件 | 费用 | 卡面架构图 |
|------|---------|------|---------|------|-----------|
| SLA 狂魔 | mult | ×1.3 | any: [ha] | $8 | HA 双机房 + 心跳切换 |
| 数据囤积者 | chips | +3/[db] 卡 | — | $6 | 数据湖：多源汇入 |
| 云原生信徒 | chips | +2/[deploy] 卡 | — | $5 | K8s 集群拓扑 |
| 模式放大器 | pattern_enhance | +1 mult/pattern | — | $8 | 观察者模式 UML |
| 连击之王 | combo_mult | ×1.5 (2+ patterns) | — | $9 | 服务网格 Sidecar |
| 算牌大师 | hand_size | 手牌 +2 | — | $6 | Prometheus + Grafana |
| 重抽大师 | discard | 弃牌 +2 | — | $5 | 蓝绿部署 |
| 掘金者 | gold | +5 gold/pattern | — | $4 | ETL 管道 |
| 梭哈 | mult | ×2.0 | special: five_same_domain | $10 | 单体架构 |
| 极简主义 | mult | ×1.5 | special: component_count_lte_3 | $6 | 极简三层 |
| 橡皮鸭 | chips | +3/[monitor] 卡 | — | $5 | 可观测性三支柱 |
| 遗留代码 | mult | ×1.4 | special: all_different_domains | $7 | 意大利面架构 |
| 微服务狂热 | mult | ×1.3 | special: component_count_gte_4 | $6 | 微服务全家桶 |
| 缓存命中 | chips | +4/[cache] 卡 | — | $6 | 多级缓存 L1→L2→Redis→DB |
| 事故指挥官 | mult | ×1.4 | all: [security, ha] | $8 | 告警响应链 |
| 开源贡献者 | gold | +3 gold/phase | — | $4 | GitHub Flow |
| 10x 工程师 | mult | ×1.2 (always) | — | $9 | 全栈一人搞定 |
| 过度设计 | chips | +10 flat | special: capacity_over_budget | $5 | Todo App 配 15 中间件 |
| DevOps 大师 | chips | +3/[deploy] 卡 | any: [monitor] | $6 | CI/CD 流水线 |
| 混沌爱好者 | mult | ×1.8 | all: [ha, deploy] | $8 | 混沌注入实验 |

### Joker 效果类型说明

| 类型 | 作用 | 计算方式 |
|------|------|---------|
| `mult` | 乘法倍率 | 乘入 mult 链 |
| `chips` | 加筹码 | per_tag 时按匹配卡数 × value；无 per_tag 时加 flat value |
| `pattern_enhance` | 牌型增强 | 每个触发 pattern 加 extra_mult（加法） |
| `hand_size` | 手牌增加 | 加到手牌上限 |
| `discard` | 弃牌增加 | 加到弃牌次数 |
| `gold` | 金币收入 | per pattern 或 per phase |
| `combo_mult` | 组合倍率 | 达到 min_patterns 时乘入 mult 链 |

---

## 7. Tarot 卡与卡包

### Tarot 卡 (8 张)

一次性使用，永久修改目标组件。手持上限 2 张（Vibe Coding 流派 3 张）。

| 名称 | 效果 | 目标 | 费用 |
|------|------|------|------|
| 分库分表 | 加 [replication] tag | [db] 组件 | $4 |
| CDN 加速 | 加 [edge] tag | [cache] 组件 | $4 |
| 容器化 | 加 [deploy] tag | [compute] 组件 | $4 |
| 安全加固 | 加 [security] tag | 任意组件 | $3 |
| 埋点 | 加 [monitor] tag | 任意组件 | $3 |
| 超频 | +5 base_chips | 任意组件 | $5 |
| 优化 | -2 capacity_cost (min 1) | 任意组件 | $4 |
| 转型 | 改变 domain | 任意组件 | $5 |

### Tarot 卡包 (10 种)

在商店购买，翻书动画打开后从 N 张随机 Tarot 中选 1 张。封面使用真实技术书籍。

| 卡包名 | 价格 | 出牌数 |
|--------|------|--------|
| Designing Data-Intensive Applications | $4 | 3 |
| Building Microservices | $4 | 3 |
| Site Reliability Engineering | $4 | 3 |
| Designing Distributed Systems | $4 | 3 |
| Database Internals | $4 | 3 |
| Fundamentals of Software Architecture | $5 | 4 |
| Software Architecture: The Hard Parts | $5 | 4 |
| Kubernetes: Up & Running | $4 | 3 |
| Kafka: The Definitive Guide | $4 | 3 |
| Infrastructure as Code | $4 | 3 |

---

## 8. Pattern 牌型

共 **17 个**，采用 **Route 路线系统** + **Distinct-Card Matching**。

### 8.1 Route 路线系统

每个 Pattern 属于一条路线（A/B/C）或 Free。**同一手中若同时触发多条路线的 Pattern，只有总奖励最高的路线生效，其余路线的 Pattern 被丢弃。** Free Pattern 始终生效。

### 8.2 Distinct-Card Matching

**每个 tag 需求必须由不同的卡牌满足。** 例如 `p_read_path` 需要 [cache, db]，Redis（cache, db）单张卡不能同时提供两个 tag，必须用 Redis 提供 cache、PostgreSQL 提供 db。使用 bitmask 回溯算法实现。

### Route A — 读性能线（核心: `cache`）

| 名称 | ID | 触发条件 | +Chips | +Mult |
|------|-----|---------|--------|-------|
| 读优化路径 | `p_read_path` | ALL: [cache, db] | 10 | 3 |
| 边缘加速 | `p_edge_accel` | ALL: [edge, cache] | 10 | 3 |
| 热点保护 | `p_hot_protect` | ALL: [cache, gateway] | 8 | 2 |

### Route B — 写可靠线（核心: `queue`）

| 名称 | ID | 触发条件 | +Chips | +Mult |
|------|-----|---------|--------|-------|
| 写入管道 | `p_write_pipeline` | ALL: [queue, db] | 8 | 2 |
| 事件驱动 | `p_event_driven` | ALL: [queue, async, compute] | 10 | 3 |
| 削峰填谷 | `p_peak_shaving` | ALL: [queue, ha] | 8 | 3 |

### Route C — 稳定运维线（核心: `monitor` + `ha`）

| 名称 | ID | 触发条件 | +Chips | +Mult |
|------|-----|---------|--------|-------|
| 可观测闭环 | `p_observability` | ALL: [monitor] + ANY: [search, deploy] | 8 | 2 |
| 零停机 | `p_zero_downtime` | ALL: [ha, deploy, monitor] | 10 | 3 |
| 高可用 | `p_high_availability` | ALL: [ha, replication] | 10 | 3 |

### Free Pattern（始终生效，不受路线互斥）

| 名称 | 触发条件 | +Chips | +Mult |
|------|---------|--------|-------|
| 领域配对 | 同 domain ≥2 张 | 5 | 1 |
| 领域三连 | 同 domain ≥3 张 | 10 | 3 |
| 广谱架构 | 不同 domain ≥4 种 | 8 | 2 |
| CQRS | ALL: [db, queue, cache]（需 3 张不同卡） | 12 | 4 |
| 平台专属 | 见 §16.5 | 各异 | 各异 |

### 8.3 路线精通

所有手结束后：同一路线的 3 个 Pattern 全部在不同手中触发 → **+20 bonus**

### 8.4 每手 Pattern 判定流程

1. Distinct-card matching 检测所有满足条件的 Pattern
2. 路线互斥：若同时触发 A 和 B，比较总奖励（Σ chips_add + Σ mult_add），高者生效
3. Free + 平台 Pattern 始终生效
4. 本手分数 = chips × mult

---

## 9. Super Pattern 超级牌型

在常规牌型之上额外判定的奖励机制，共 **4 个**。阶段结算时基于所有手累计触发的 pattern 数量判定。

| 名称 | 触发条件 | 奖励 |
|------|---------|------|
| 全栈架构师 | ≥3 个 pattern 触发 | +8 mult |
| 极简主义 | ≥1 pattern 且容量 <60% 预算 | +15 chips |
| 多面手 | ≥4 种 domain 且 ≥1 pattern | +5 mult |
| 淘金热 | ≥4 个 pattern 触发 | +15 gold |

---

## 10. School 流派

共 **6 个**，每局开始选择 1 个，决定整局的规则修正。

### 一览表

| 流派 | 口号 | 折扣 Tag | 折扣率 | 预算偏移 | 手牌+/- | 弃牌+/- | Joker 槽 | 特殊 |
|------|------|---------|--------|---------|---------|---------|---------|------|
| **SRE** | 不怕贵，怕挂 | ha, monitor | 0.7 | 0 | 0 | +1 | 4 | baseline rel=3 |
| **创业** | 先上线再说 | async, queue | 0.7 | +15 | +2 | 0 | 4 | — |
| **极简** | less is more | — | 1.0 | -20 | -2 | +1 | 5 | baseline 3/3/3 |
| **合规** | 合规先行 | security, gateway | 0.7 | 0 | 0 | 0 | 3 | 开局送 Audit Log + Encryption |
| **性能** | 快就是正义 | cache, edge | 0.6 | 0 | 0 | 0 | 4 | baseline perf=4, rel=1 |
| **Vibe Coding** | ship it, vibes only | — | 1.0 | 0 | +1 | +1 | 5 | Tarot 手牌 3；开局送随机 Joker + Tarot；30% 概率容量七折；20% 概率额外风险 |

### 详细说明

**SRE 流派**：专精高可用，ha 和 monitor 组件七折，可靠性面板起始 3，多 1 次弃牌。适合堆高可用 pattern。

**创业流派**：大手大脚，预算 +15，手牌多 2 张（看得多选择多），适合快速组合。

**极简流派**：少而精，预算 -20、手牌只有 6，但起始面板全 3 且 Joker 槽最多（5 个），适合搭配"极简主义"Joker。

**合规流派**：安全优先，security/gateway 组件七折，开局自带 Audit Log 和 Encryption，但 Joker 槽最少（3 个）。

**性能流派**：极致性能，cache/edge 组件六折（最大折扣），起始 perf=4 但 rel=1（激进高性能低可靠）。

**Vibe Coding**：全面增强但带随机性，Tarot 手牌 3 张，开局送随机 Joker + Tarot，每次出牌 30% 概率容量打七折，但 20% 概率引入额外风险。

---

## 11. Scenario 场景

共 **3 个**，每个包含 Small → Big → Boss 三阶段。

### 短链接系统

> 读多写少，热点明显，成本敏感

| 阶段 | 副标题 | 预算 | 目标分 | 约束 | Boss Rule |
|------|--------|------|--------|------|-----------|
| Small | MVP - 先把短链跳转跑通 | 110 | 75 | P≥3, penalty=10 | — |
| Big | Beta - 日活10万，卖广告 | 90 | 150 | P≥4, R≥3, penalty=15 | — |
| Boss | 生产 - 热点营销，流量10x | 70 | 250 | P≥5, R≥4, domains≥3, penalty=20 | **缓存禁用** |

### 即时聊天系统

> 低延迟 + 高可用，连接数高，突刺明显

| 阶段 | 副标题 | 预算 | 目标分 | 约束 | Boss Rule |
|------|--------|------|--------|------|-----------|
| Small | MVP - 先让消息发出去 | 120 | 75 | P≥3, R≥2, penalty=10 | — |
| Big | Beta - 用户开始付费 | 100 | 165 | P≥4, R≥4, domains≥2, penalty=15 | — |
| Boss | 生产压测 - 百万用户大促 | 80 | 275 | P≥5, R≥5, domains≥3, required=[security], penalty=25 | **盲审** |

### 订单系统

> 一致性/幂等/审计优先，写多读多均衡

| 阶段 | 副标题 | 预算 | 目标分 | 约束 | Boss Rule |
|------|--------|------|--------|------|-----------|
| Small | MVP - 能下单能付款 | 120 | 75 | R≥3, penalty=10 | — |
| Big | Beta - 接入支付，合规审查 | 95 | 165 | R≥4, required=[security], penalty=15 | — |
| Boss | 生产 - 双十一 + 金融审计 | 75 | 275 | R≥5, domains≥3, required=[security, monitor], penalty=25 | **技术债爆发** |

### 跳过阶段奖励

- 跳过 Small Blind → 从 4 张 Tarot 中选 2 张
- 跳过 Big Blind → 从池中获得 1 个随机 Joker

---

## 12. Boss Rule 首领规则

共 **5 种**，仅在 Boss 阶段生效。

| Boss Rule | 名称 | 效果 |
|-----------|------|------|
| cache_disabled | 缓存禁用 | [cache] 组件容量 ×2.0 |
| budget_halved | 预算腰斩 | 容量预算 ×0.5 |
| blind_review | 盲审 | 隐藏风险报告（UI 层面） |
| tech_debt_explosion | 技术债爆发 | 每个部署组件额外 +1 随机风险 |
| single_point | 单点故障 | 不允许跨组件重复 tag |

---

## 13. 商店系统

Small 和 Big 阶段结算后开放商店。

### 经济

| 项目 | 说明 |
|------|------|
| 起始金币 | 10 |
| 利息 | 每进商店 +floor(gold/5) gold（上限 5） |
| 阶段奖励 | Pass: 5 + blind_bonus; Fail: 2 + blind_bonus |
| Blind 奖励 | small=1, big=2, boss=3 |

### 价格表

| 物品 | 买入 | 卖出 |
|------|------|------|
| Common 组件 | $3 | $1 |
| Uncommon 组件 | $5 | $2 |
| Rare 组件 | $8 | $4 |
| Joker | shop_cost ($4–$10) | floor(shop_cost / 2) |
| Tarot 卡包 | $4–$5 | — |
| 移除组件 | $3 | — |

### 商店库存

每次进店随机生成：
- 3 个未拥有的组件
- 3 个未拥有的 Joker
- 2 个随机 Tarot 卡包

---

## 14. 得分公式

### 核心公式（多手制）

```
阶段最终得分 = Σ 各手分数 + 路线精通 bonus + Super Pattern bonus - 约束惩罚 - Boss 惩罚
```

### 每手计分

```
手分数 = round(Chips × Mult)

Chips = Σ(本手卡.base_chips)
      + Σ(触发 Pattern 的 chips_add)
      + Joker chips 加成
      + Platform chips bonus

Mult = (1 + Σ pattern.mult_add + Σ joker_additive_mult)
     × Π joker_multiplicative_mult
```

- **加法部分**：pattern_enhance Joker 的 extra_mult × pattern 数量
- **乘法部分**：mult 类型 Joker 和 combo_mult 类型 Joker（达标时）

### 阶段结算

```
totalHandScore = Σ 各手 handScore
routeMasteryBonus = 20（若达成路线精通）
superPatternBonus = chips_burst + mult_burst × 10
finalScore = totalHandScore + routeMasteryBonus + superPatternBonus - constraintPenalty
```

### 阶段执行顺序

**每手循环（runHand）：**
1. Distinct-card matching 检测 Pattern
2. 路线冲突解决（互斥）
3. Joker 激活（基于本手 played tags）
4. 计算 Chips = base + pattern + joker + platform
5. 计算 Mult = (1 + patterns + jokers) × multipliers
6. 本手得分 = chips × mult

**阶段结算（settlePhase）：**
1. 收集所有手打出的卡 → allPlayed
2. 计算累计容量（含 platform modifier + boss modifier）
3. 计算面板值（P/R/CX）+ platform mechanic
4. 验证约束 → 惩罚
5. 检查 Super Pattern（基于累计 pattern 数）
6. 检查路线精通
7. 最终得分 = Σ handScore + bonus - penalties
8. 判定 Pass/Fail

---

## 15. UI 视觉设计

### 整体风格

**"霓虹牌桌"** — 深绿色毛毡背景 + 噪声纹理，霓虹色分数显示。

| 元素 | 颜色 |
|------|------|
| Chips 分数 | #f5a623 琥珀 |
| Mult 分数 | #e74c3c 红 |
| Gold 金币 | #ffd700 金 |
| Performance | #e74c3c 红 |
| Reliability | #3498db 蓝 |
| Complexity | #9b59b6 紫 |

### 卡牌尺寸

统一 **160×240px**，适用于组件卡、Joker 卡、Tarot 卡、卡包。

### 组件卡布局

```
┌─────────────────────┐
│ [域图标] compute     │  ← Domain 标签
│                     │
│      [品牌图标]      │  ← 48px 技术 Logo (Iconify)
│     PostgreSQL      │  ← 名称
│                     │
│  [db] [ha]          │  ← Tag 徽章（2 行固定高度）
│                     │
│  ♦4  P+1 R+1 CX+1  │  ← base_chips + delta
│  Cap: 14        $5  │  ← 容量 + 价格
│              [域图标]│  ← 半透明域标识
└─────────────────────┘
```

### Joker 卡布局

```
┌─────────────────────┐
│                     │
│   [全幅架构图]       │  ← 暗色 draw.io 架构图 (object-cover)
│                     │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← gradient: transparent → black/80
│  SLA 狂魔           │  ← 名称 (bold white, 14px)
│  高可用组合更猛      │  ← 描述 (white/70, 11px, line-clamp-2)
│  ×1.3          $8   │  ← 效果 (neon-mult) + 价格 (neon-gold)
└─────────────────────┘
```

### Tarot 卡包布局

使用真实 O'Reilly 技术书封面全幅展示，底部渐变叠加价格信息。

### 卡牌帮助按钮（ⓘ）

每张卡牌右上角放置半透明 `ⓘ` 图标（16px，white/30，hover 时 white/80），点击弹出该卡牌的典故与知识弹窗。信息分两层：

| 层级 | 内容 | 触发方式 |
|------|------|---------|
| **L2 一句话** | 技术概念的简短解释（≤30 字） | hover / 长按卡牌 |
| **L3 详情弹窗** | 典故来历 + 设计理念 + 延伸知识 | 点击 ⓘ 按钮 |

**L3 弹窗规格：**

- 尺寸：320×auto，最大高度 400px，超出滚动
- 背景：black/90 毛玻璃（backdrop-blur-md）
- 顶部显示卡牌名称 + Domain 颜色条
- 正文白色 13px，行高 1.6
- 底部可选"延伸阅读"链接（如书籍、论文）
- 点击弹窗外部或按 Esc 关闭

**场景差异：**

| 场景 | L2 | L3 |
|------|----|----|
| PlayScreen | hover 显示 | 点击 ⓘ 弹出 |
| ShopScreen | hover 显示 | 点击 ⓘ 弹出 |
| CollectionScreen | 始终显示在卡牌下方 | 默认展开在右侧详情面板 |

典故内容数据源：`docs/card-lore.md`

### 图鉴布局（CollectionScreen）

左右分栏 + 底部测试台的三区结构：

```
┌─ Header（返回 + 标题）──────────────────────────────────┐
├─ Tabs（组件 | Joker | 塔罗 | 卡包 | 牌型）─────────────┤
│                          │                               │
│   左侧：卡牌网格         │   右侧：详情面板（360px 固定） │
│   flex-wrap 排列         │                               │
│                          │   ┌───────────────────────┐   │
│   [卡1] [卡2] [卡3]     │   │ [域颜色条]             │   │
│   [卡4] [卡5] [卡6]     │   │ [品牌图标] PostgreSQL  │   │
│   [卡7] [卡8] ...       │   │                       │   │
│                          │   │ ── 数值 ──            │   │
│   点击卡牌 → 右侧显示详情 │   │ ♦4  P+1 R+1 CX+1    │   │
│   选中卡高亮（ring-2）   │   │ Cap: 14   $5          │   │
│                          │   │ Tags: [db] [ha]       │   │
│                          │   │                       │   │
│                          │   │ ── 典故 ──            │   │
│                          │   │ L2 一句话（加粗）       │   │
│                          │   │ L3 详情正文（可滚动）   │   │
│                          │   │                       │   │
│                          │   │ [添加到测试台] 按钮     │   │
│                          │   └───────────────────────┘   │
├──────────────────────────┴───────────────────────────────┤
│  底部测试台（sticky，仅 Components Tab 有效）             │
│  [卡][卡][卡][+][+]   Patterns / P R CX / Chips×Mult   │
└─────────────────────────────────────────────────────────┘
```

**交互规则：**

- 点击左侧卡牌 → 右侧面板展示该卡的数值 + 典故，卡牌边框高亮（ring-2，Domain 颜色）
- 右侧面板底部有「添加到测试台」按钮（仅 Components Tab），替代当前直接点击添加的行为
- 未选中任何卡牌时，右侧面板显示当前 Tab 的概览说明（如 "共 90 张组件卡，分布在 5 个 Domain"）
- 右侧面板固定宽 360px，内容超出时独立滚动

**各 Tab 右侧面板内容：**

| Tab | 数值区 | 典故区 |
|-----|--------|--------|
| Components | chips、P/R/CX delta、capacity、tags、rarity | L2 + L3 |
| Jokers | 效果类型、效果值、激活条件、费用 | L2 + L3 |
| Tarots | 效果类型、目标、费用 | L2 + L3 |
| Packs | 价格、出牌数 | L2 + L3（书籍简介） |
| Patterns | 触发条件、+chips、+mult | 无典故，显示相关组件推荐 |

### 手牌展示

Balatro 风格扇形弧排列 — 卡牌重叠，cos 曲线纵向偏移 + 旋转（±10°），点击弹出 30px，悬停升起 16px。

---

## 16. Platform 平台

### 16.1 概述

平台系统让卡牌之间产生类似"先有 AWS 才能有 Lambda"的生态依赖关系。玩家在开局时选择一个平台，决定了本局可用的专属组件牌和独特机制。

- **开局流程**：School → Platform → Scenario
- **6 School × 4 Platform = 24 种开局组合**

### 16.2 牌池结构

| 类型 | 数量 | 说明 |
|------|------|------|
| 通用牌 | ~50 张 | 始终在牌组中 |
| 平台专属牌 | 每平台 10 张 | 仅选该平台时进入牌组 |
| 每局牌组 | ~60 张 | 50 通用 + 10 专属 |

### 16.3 四个平台

| 平台 | 定位 | 被动加成 | 专属机制 | 专属Pattern |
|------|------|----------|----------|-------------|
| **AWS** | 最全面的托管生态 | 专属牌 capacity -10% | **Multi-Region**：2+ [ha] 组件时，所有组件 Rel +1 | Serverless Full Stack |
| **GCP** | 数据与AI强项 | [db]/[search] +2 chips | **BigData Pipeline**：3+ data domain 组件触发「数据湖」Pattern | 数据湖 |
| **Azure** | 企业合规 | [security]/[ha] capacity -15% | **Compliance Shield**：required_tags:[security] 约束自动满足 | 企业混合云 |
| **自建** | 硬核 DIY | 所有组件 capacity +20% | **Full Control**：无超容量惩罚，但所有组件 CX +1 | DIY 全栈 |

### 16.4 平台专属组件

#### AWS 专属（10张 — 从原通用牌调整）
- EC2 实例、Lambda 函数、ECS 容器服务、Step Functions
- DynamoDB、Aurora、S3 对象存储、SQS
- ALB 负载均衡、CloudFront CDN

#### GCP 专属（10张新增）
- Cloud Run、Cloud Functions、GKE
- BigQuery、Cloud Spanner、Firestore、Pub/Sub
- Cloud CDN、Cloud Armor、Cloud Monitoring

#### Azure 专属（10张新增）
- Azure Functions、AKS、App Service
- Cosmos DB、Azure SQL、Service Bus、Blob Storage
- Azure Front Door、Application Gateway、Azure Monitor

#### 自建专属（12张，含 2 张 wildcard）
- Bare Metal Server、Docker Swarm、Nomad
- CockroachDB、MinIO、NATS
- HAProxy、Traefik、WireGuard、Ansible
- Raspberry Pi 集群 (wildcard)、LXC/Incus (wildcard)

### 16.5 平台专属 Pattern

| 平台 | Pattern名称 | 触发条件 | 效果 |
|------|-------------|----------|------|
| AWS | Serverless Full Stack | [compute, async] + [storage] + [gateway] | +8 chips, +2 mult |
| GCP | 数据湖 | 3+ data domain 组件 | +6 chips, +2 mult |
| Azure | 企业混合云 | [ha] + [security] + [deploy] | +6 chips, +3 mult |
| 自建 | DIY 全栈 | 5 个 domain 各至少 1 张 | +10 chips, +2 mult |

### 16.6 School × Platform 组合示例

- **SRE + Azure** = [ha] 双重折扣，防御极致
- **Performance + GCP** = data 高 chips + cache 折扣，进攻高分
- **Vibe Coding + 自建** = 无超预算惩罚但复杂度爆炸，高风险高回报
- **Startup + AWS** = 高容量 + 托管折扣，最宽容入门

### 16.7 数据模型

- 组件卡 `platform` 字段：`"generic"` | `"aws"` | `"gcp"` | `"azure"` | `"selfhosted"`
- `gamedata/platforms.json` 定义平台属性（被动、机制、专属 Pattern）
- 牌组构建：`deck = components.filter(c => c.platform === "generic" || c.platform === selectedPlatform)`
- 商店仅展示通用组件 + 当前平台专属组件

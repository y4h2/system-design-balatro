# 卡牌典故与知识库

> 每张卡的教育内容，分两层：
> - **L2 一句话**：hover/长按显示的简短解释
> - **L3 典故**：点击 ⓘ 弹出的详细来历与延伸知识

---

## 组件卡 — Compute 域

### EC2 实例

**L2** 亚马逊弹性计算云，按需租用虚拟机的鼻祖。

**L3** 2006 年 AWS 推出 EC2（Elastic Compute Cloud），让开发者第一次可以在几分钟内启动一台服务器，而不是等几周走采购流程。EC2 开创了 IaaS 模式，"弹性"指可以按需扩缩——这个概念彻底改变了软件行业的基础设施思维。i-开头的实例 ID 已成为云计算的文化符号。

### Lambda 函数

**L2** AWS 的无服务器计算服务，代码上传即运行，按调用次数计费。

**L3** 2014 年 AWS re:Invent 上发布的 Lambda 开创了 Serverless 时代。名字取自 λ 演算（Lambda Calculus）——计算机科学的理论基础之一。核心理念是"不关心服务器"：你只写函数，平台负责一切。冷启动（Cold Start）延迟是它最著名的权衡：省了运维成本，但首次调用要等容器初始化。

### K8s Pod

**L2** Kubernetes 的最小调度单元，一个或多个共享网络的容器。

**L3** Kubernetes（K8s，因为 k 和 s 之间有 8 个字母）由 Google 在 2014 年开源，源自其内部运行了十余年的 Borg 系统。Pod 这个词意为"豆荚"——就像豌豆荚里的豌豆共享同一个外壳，Pod 里的容器共享网络和存储。K8s 的出现让"容器编排"成为行业标准，也让 YAML 工程师成为了一种真实的职业。

### Worker Fleet

**L2** 一组后台工作进程，并行消费任务队列中的作业。

**L3** Worker 模式是最古老的并发模式之一，源自工厂流水线的类比：一个分发者（dispatcher）将任务分配给多个工人（worker）。在分布式系统中，Worker Fleet 通常配合消息队列使用，实现削峰填谷。Sidekiq（Ruby）、Celery（Python）都是经典实现。Fleet（舰队）一词暗示这些 worker 像军舰一样可以灵活编队扩缩。

### Cron Job

**L2** 定时任务调度器，按预设时间表周期性执行作业。

**L3** Cron 诞生于 1975 年的 Unix V7，名字来自希腊语 Chronos（时间之神）。那行神秘的 `* * * * *`（分 时 日 月 周）语法已经成为程序员的通用语言，几乎所有现代调度系统都兼容它。在分布式环境中，Cron 的最大挑战是避免重复执行——当你有 10 台服务器时，怎么保证定时任务只跑一次？这催生了分布式锁和 leader election 等模式。

### Auto Scaler

**L2** 根据负载指标自动增减计算实例数量的弹性机制。

**L3** 自动扩缩容是云计算最核心的价值主张之一。2009 年 AWS 推出 Auto Scaling 服务时，"按需付费"从营销话术变成了工程现实。核心挑战是选对指标和阈值：CPU？QPS？队列深度？扩得太慢会宕机，扩得太快会烧钱。Netflix 的 Scryer 系统甚至用预测性扩容（predictive scaling）提前准备资源。

### ECS 容器服务

**L2** AWS 的托管容器编排服务，比自建 K8s 更省心。

**L3** ECS（Elastic Container Service）是 AWS 在 2014 年推出的容器编排方案，比 K8s 商业化更早。它代表了一种务实哲学：不需要理解 K8s 的全部复杂性，也能跑容器。ECS 后来推出的 Fargate 模式更进一步——连底层实例都不用管了。这种 "managed vs self-hosted" 的权衡在系统设计中反复出现：控制力 vs 运维成本。

### Batch 计算

**L2** 大规模离线批处理任务，一次处理海量数据。

**L3** 批处理是计算机最古老的执行模式——在交互式终端出现之前，程序就是一批批提交到大型机上运行的。MapReduce（2004 年 Google 论文）让批处理进入分布式时代。如今 AWS Batch、Spark 等系统继承了这一传统。批处理的核心权衡是延迟 vs 吞吐：你不需要实时结果，但需要处理 TB 级数据。

### Edge Function

**L2** 运行在 CDN 边缘节点的轻量函数，靠近用户执行。

**L3** 边缘计算的理念是"把计算搬到数据（用户）身边"。Cloudflare Workers（2017）和 Deno Deploy 让这个概念流行起来：你的代码不再只跑在 us-east-1，而是跑在全球 300+ 个 PoP 节点上。延迟从 200ms 降到 20ms。但代价是运行时受限——没有完整的 Node.js 环境，不能访问文件系统，执行时间有上限。这是延迟 vs 能力的经典权衡。

### GPU 实例

**L2** 配备图形处理器的计算实例，擅长大规模并行计算。

**L3** GPU 最初为游戏图形渲染设计，但 2007 年 NVIDIA 推出 CUDA 后，GPU 的数千个核心被用于通用并行计算。2012 年 AlexNet 用 GPU 训练深度学习模型赢得 ImageNet 比赛，开启了 AI 革命。如今 NVIDIA H100 单卡售价数万美元，GPU 算力成为 AI 时代最稀缺的资源。在系统设计中，GPU 实例是性能天花板最高但成本也最高的选择。

### Step Functions

**L2** AWS 的可视化工作流编排服务，用状态机串联多个服务。

**L3** 复杂的分布式流程需要协调多个服务的执行顺序、错误处理和重试逻辑。Step Functions（2016）用有限状态机（FSM）的理论来解决这个问题：每个步骤是一个状态，转换条件定义清晰。它的可视化界面让你能"看到"工作流在哪一步卡住了。这个思想可以追溯到 1955 年 Edward Moore 的状态机理论。开源替代方案包括 Temporal 和 Cadence。

### 微服务

**L2** 将单体应用拆分为多个独立部署的小服务，各自负责一个业务能力。

**L3** 微服务架构由 Martin Fowler 和 James Lewis 在 2014 年正式定义，但思想可追溯到 Unix 哲学："做一件事，做好它"。Netflix、Amazon 是最著名的践行者——Amazon 的 CTO Werner Vogels 说"你构建它，你运维它（You build it, you run it）"。微服务解决了大团队的协作瓶颈，但引入了分布式系统的全部复杂性：网络延迟、数据一致性、服务发现。这就是所谓的"分布式单体"陷阱。

---

## 组件卡 — Data 域

### PostgreSQL

**L2** 世界上最先进的开源关系型数据库，以可靠性和标准兼容著称。

**L3** PostgreSQL 的历史可追溯到 1986 年加州大学伯克利分校 Michael Stonebraker 教授的 POSTGRES 项目（Post-Ingres，即 Ingres 的后继者）。1996 年更名为 PostgreSQL，因为加入了 SQL 支持。大象 Logo 是因为"elephants never forget（大象永不遗忘）"——象征数据库的持久性。PG 的扩展系统极其强大，PostGIS、TimescaleDB、pgvector 都是扩展。Stonebraker 因数据库领域的贡献获得了 2014 年图灵奖。

### MySQL

**L2** 全球最流行的开源关系型数据库，Web 时代的默认选择。

**L3** MySQL 由瑞典程序员 Michael Widenius 于 1995 年创建，名字来源于他女儿 My 的名字。它是 LAMP（Linux + Apache + MySQL + PHP）技术栈的核心成员，驱动了 Web 2.0 时代的大量应用。2008 年 Sun 收购 MySQL，2010 年 Oracle 收购 Sun，Widenius 担心 Oracle 会封闭 MySQL，于是 fork 出了 MariaDB（以他另一个女儿 Maria 命名）。MySQL 的 InnoDB 引擎和 MVCC 机制是面试高频考点。

### MongoDB

**L2** 面向文档的 NoSQL 数据库，以 JSON 风格存储数据。

**L3** MongoDB 名字来源于"humongous（巨大的）"。2009 年由 10gen（后更名 MongoDB Inc.）推出，主打"开发者友好"——不用提前定义 Schema，直接存 JSON 文档。这种灵活性在早期快速开发中极具吸引力，但也带来了"Schema-on-read"的隐性成本。MongoDB 早年因默认不开认证而频繁被黑客攻击，催生了著名的"MongoDB 勒索事件"。如今它已是一个成熟的分布式数据库，支持事务、分片和全文搜索。

### DynamoDB

**L2** 亚马逊的全托管 NoSQL 数据库，毫秒级延迟，无限水平扩展。

**L3** DynamoDB 的思想源自 Amazon 2007 年发表的经典论文《Dynamo: Amazon's Highly Available Key-value Store》。这篇论文提出了一致性哈希、向量时钟、Quorum 读写等概念，深刻影响了整个分布式数据库领域。DynamoDB（2012）是其商业化产物，核心卖点是"预置吞吐量"模式——你不需要关心底层有多少节点，只需指定读写容量。这是 NoSQL 运动的标志性产品。

### Aurora

**L2** AWS 的云原生关系型数据库，兼容 MySQL/PostgreSQL，存算分离架构。

**L3** Aurora 在 2014 年 re:Invent 上发布时，号称性能是 MySQL 的 5 倍。其核心创新是存储计算分离：计算层是改造过的 MySQL/PG 引擎，存储层是跨 3 个可用区、6 份副本的分布式存储。写入只需 4/6 份确认（Quorum），读取只需 3/6。这种架构让数据库拥有了传统关系型数据库的兼容性和云原生的弹性。Aurora 是"不想放弃 SQL 但想要云扩展性"的典型答案。

### Redis

**L2** 内存键值数据库，以极低延迟闻名，常用作缓存和会话存储。

**L3** Redis 是 Remote Dictionary Server 的缩写，2009 年由意大利程序员 Salvatore Sanfilippo（antirez）创建。最初他需要一个高性能的实时日志分析系统，发现没有现成工具能满足需求，于是自己写了一个。Redis 的单线程模型是其精妙之处：通过避免锁竞争和上下文切换，单个核心就能达到每秒数十万次操作。数据结构的多样性（String、Hash、Set、ZSet、Stream）让 Redis 远不只是缓存——排行榜、分布式锁、消息队列都能用它实现。

### Memcached

**L2** 分布式内存缓存系统，用法极简，专注于缓存这一件事。

**L3** Memcached 由 Brad Fitzpatrick 在 2003 年为 LiveJournal 开发——当时 LiveJournal 的数据库扛不住流量，需要一层缓存。它的设计哲学是极致简单：只有 GET/SET/DELETE，没有持久化，没有复杂数据结构。Facebook 将 Memcached 大规模应用并开源了改进版本，发表了经典论文《Scaling Memcache at Facebook》。在 Redis 出现后，Memcached 的使用逐渐减少，但它"做一件事做到极致"的理念仍值得学习。

### S3 对象存储

**L2** AWS 的对象存储服务，理论上无限容量，11 个 9 的持久性。

**L3** S3（Simple Storage Service）于 2006 年 3 月 14 日上线，是 AWS 最早的服务之一，比 EC2 还早几个月。它的持久性承诺是 99.999999999%（11 个 9），意味着存 1000 万个文件，平均 1 万年才丢一个。S3 的扁平命名空间（没有真正的文件夹）和 "最终一致性"（2020 年已改为强一致性）是经典面试题。互联网上大量的静态资源——图片、视频、备份——都存在 S3 或类似系统中。

### Elasticsearch

**L2** 基于 Lucene 的分布式搜索引擎，擅长全文检索和日志分析。

**L3** Shay Banon 最初为妻子建了一个食谱搜索应用，基于 Apache Lucene。他把底层搜索库抽象成了一个独立项目——Elasticsearch（2010）。ES 的倒排索引让全文搜索变得极快：不是遍历每篇文档找关键词，而是从关键词直接找到包含它的文档列表。配合 Logstash（收集）和 Kibana（可视化），形成了 ELK Stack，成为日志分析的事实标准。近年面临来自 ClickHouse 和 Loki 的竞争。

### TimescaleDB

**L2** 基于 PostgreSQL 的时序数据库扩展，专为时间序列数据优化。

**L3** 时序数据（监控指标、IoT 传感器、金融行情）有明显的"写多读少、按时间查询"特征。TimescaleDB（2017）的做法是在 PostgreSQL 之上加一层自动分区——把时间轴切成若干个 chunk，查询时只扫描相关时间段。这种"不造新轮子，增强已有轮子"的策略让用户可以用标准 SQL 查时序数据。竞品 InfluxDB 选择了自研存储引擎的路线，各有权衡。

### Kafka

**L2** 分布式事件流平台，高吞吐、持久化，消息系统的事实标准。

**L3** Kafka 由 LinkedIn 的 Jay Kreps 团队于 2011 年开源，名字取自作家弗朗茨·卡夫卡（Franz Kafka）——Kreps 说"因为这是一个为写而优化的系统，用一个作家的名字很合适"。Kafka 的核心创新是把消息当作持久化的日志（commit log）而非临时队列：消息写入后不会被消费者"拿走"，而是按 offset 顺序读取。这让多个消费者可以独立消费同一份数据。LinkedIn 每天通过 Kafka 处理数万亿条消息。

### RabbitMQ

**L2** 基于 AMQP 协议的消息代理，支持复杂的路由和投递确认。

**L3** RabbitMQ（2007）由 Rabbit Technologies 用 Erlang 语言编写。选择 Erlang 是因为它在电信领域久经考验的并发和容错能力（Ericsson 的 AXD301 交换机用 Erlang 写的，号称 99.9999999% 可用性）。RabbitMQ 实现了 AMQP（高级消息队列协议）标准，核心概念是 Exchange → Binding → Queue 的路由模型。相比 Kafka 的日志模型，RabbitMQ 更像传统的"邮局"——消息投递后即被消费。适合任务分发和 RPC 场景。

### SQS

**L2** AWS 的全托管消息队列，零运维，自动扩缩。

**L3** SQS（Simple Queue Service）是 AWS 最古老的服务之一（2004 年就有了 beta 版），甚至早于 S3 和 EC2。它的设计极其简约：发消息、收消息、删消息，仅此而已。SQS 的"至少一次投递"语义意味着消息可能重复，所以消费者必须实现幂等——这是分布式系统设计的经典教训。2016 年推出的 FIFO 队列提供了精确一次处理，但吞吐量有上限（3000 TPS）。简单 vs 精确，又是一个权衡。

### Data Warehouse

**L2** 面向分析的大型数据仓库，汇聚多源数据支撑商业决策。

**L3** 数据仓库概念由 Bill Inmon 在 1990 年代提出，他被称为"数据仓库之父"。核心思想是将在线事务处理（OLTP）和在线分析处理（OLAP）分离：前者优化写入和事务，后者优化复杂查询和聚合。Ralph Kimball 后来提出了星型模型（Star Schema）——事实表 + 维度表的设计至今仍是数仓建模的主流方法。现代云数仓如 Snowflake、BigQuery 采用存算分离架构，按查询量付费。

### Graph DB

**L2** 以图结构（节点+边）存储数据的数据库，擅长关系查询。

**L3** 图数据库的理论基础是 1736 年欧拉（Euler）解决柯尼斯堡七桥问题时创立的图论。在关系型数据库中，查找"朋友的朋友的朋友"需要多次 JOIN，性能随深度指数下降；图数据库通过指针直接遍历关系，复杂度与数据总量无关。Neo4j（2007）是最知名的图数据库，Facebook 的 TAO 和 LinkedIn 的社交图谱都是图存储的大规模应用。适合社交网络、推荐系统、欺诈检测等场景。

---

## 组件卡 — Network 域

### Nginx

**L2** 高性能 Web 服务器和反向代理，互联网的基础设施。

**L3** Nginx（发音 engine-x）由俄罗斯程序员 Igor Sysoev 于 2004 年发布，最初是为了解决 C10K 问题——如何让一台服务器同时处理 10,000 个并发连接。当时的 Apache 是每个连接一个线程/进程模型，1 万个连接意味着 1 万个线程。Nginx 用事件驱动 + 异步非阻塞 I/O 彻底改变了游戏规则。截至目前，全球约 34% 的 Web 服务器运行 Nginx。它是现代微服务架构中反向代理和负载均衡的默认选择。

### Kong API Gateway

**L2** 基于 Nginx/OpenResty 的开源 API 网关，统一管理 API 流量。

**L3** API 网关是微服务架构的"前门"——所有外部请求先经过网关，再路由到内部服务。Kong（2015）构建在 OpenResty（Nginx + Lua）之上，通过插件机制提供认证、限流、日志、转换等功能。"网关模式"最早由 Chris Richardson 在微服务模式中系统化描述。API 网关解决了"每个微服务都要自己实现认证和限流"的重复问题，但也引入了单点故障风险——所以网关本身必须高可用。

### ALB 负载均衡

**L2** AWS 的七层负载均衡器，基于 HTTP 内容智能路由请求。

**L3** 负载均衡器是分布式系统中最古老的组件之一。从硬件时代的 F5 BIG-IP 到软件时代的 HAProxy，再到云时代的 ALB（Application Load Balancer），负载均衡一直在演进。ALB 工作在 OSI 第七层（应用层），能根据 URL 路径、Header、Cookie 等做路由决策。经典的负载均衡算法包括轮询（Round Robin）、加权轮询、最少连接、一致性哈希。选择哪种算法取决于你的服务是无状态还是有状态。

### CloudFront CDN

**L2** AWS 的全球内容分发网络，把静态资源缓存到用户附近。

**L3** CDN（Content Delivery Network）的概念由 Akamai 在 1998 年商业化，其创始人 Tom Leighton 是 MIT 的应用数学教授。CDN 的核心思想简单而深刻：既然光速有限（光纤中约 200,000 km/s），那就把内容放得离用户更近。一个在东京的用户访问美国服务器需要 ~200ms RTT，但访问东京的 CDN 边缘节点只需 ~5ms。CloudFront 拥有 600+ 个全球 PoP 节点。CDN 缓存失效（cache invalidation）被 Phil Karlton 称为计算机科学中两大难题之一。

### GeoDNS

**L2** 根据用户地理位置返回不同 IP 的智能 DNS 服务。

**L3** 传统 DNS 对所有查询返回相同的 IP 地址，而 GeoDNS 根据请求者的地理位置（通常通过 IP 地理库判断）返回最近的服务器 IP。这是全球化部署的基础组件——Netflix、Google 等公司用它把用户导向最近的数据中心。AWS Route 53 的"地理位置路由"和"延迟路由"就是 GeoDNS 的实现。DNS 本身是互联网最关键的基础设施，2016 年 Dyn DNS 被 DDoS 攻击导致半个美国互联网瘫痪。

### Rate Limiter

**L2** 限制 API 调用频率的组件，防止过载和滥用。

**L3** 限流器的经典算法有四种：令牌桶（Token Bucket）、漏桶（Leaky Bucket）、固定窗口计数器、滑动窗口。令牌桶允许突发流量（桶里有令牌就能通过），漏桶则强制匀速（像漏斗一样恒定流出）。GitHub API 的 `X-RateLimit-Remaining` Header 就是限流器的外在表现。在系统设计面试中，"设计一个分布式限流器"是经典题目，核心挑战是在多节点间同步计数——Redis + Lua 脚本是常见方案。

### WAF

**L2** Web 应用防火墙，过滤恶意 HTTP 请求，防御 SQL 注入和 XSS。

**L3** WAF（Web Application Firewall）工作在 HTTP 层，通过规则匹配识别恶意请求。OWASP Top 10（开放 Web 应用安全项目）列出了最常见的 Web 安全威胁，WAF 主要防御其中的注入攻击、XSS、CSRF 等。传统 WAF 基于正则表达式规则（容易误报），现代 WAF 开始引入机器学习做异常检测。Cloudflare、AWS WAF、ModSecurity 是主流产品。WAF 不是银弹——它能挡住脚本小子，但防不住有针对性的高级攻击。

### WebSocket Gateway

**L2** 支持 WebSocket 协议的网关，实现服务器与客户端的全双工实时通信。

**L3** HTTP 是请求-响应模式，客户端不问，服务器不说。但聊天、实时协作、股票行情等场景需要服务器主动推送。WebSocket（2011 年标准化，RFC 6455）通过一次 HTTP 握手升级为持久的 TCP 连接，实现双向通信。在大规模场景中，WebSocket 的挑战是连接状态管理——每个连接都是有状态的，负载均衡不能随便漂移。Socket.io 库通过自动降级（WebSocket → Long Polling）简化了开发者的工作。

### Istio Service Mesh

**L2** 服务网格控制平面，通过 Sidecar 代理实现流量管理、安全和可观测性。

**L3** 微服务之间的通信越来越复杂：需要负载均衡、重试、熔断、认证、加密、追踪……每个服务都实现一遍显然不合理。Service Mesh 的思路是把这些"横切关注点"下沉到基础设施层。Istio（2017，Google/IBM/Lyft）在每个 Pod 旁注入一个 Envoy Sidecar 代理，所有流量都经过它。Sidecar 模式的灵感来自摩托车的边斗——主车（业务逻辑）专心开，乘客（网络逻辑）坐边斗。Istio 功能强大但复杂度也高，被戏称为"把 K8s 的复杂度翻了一倍"。

### Global Accelerator

**L2** 基于 AWS 骨干网的全球加速器，通过 Anycast 减少网络延迟。

**L3** 正常的互联网流量走公共网络，经过无数个路由器跳转，延迟不可控。Global Accelerator 使用 Anycast IP——同一个 IP 在全球多个 PoP 广播，用户的请求被路由到最近的 AWS 入口点，然后走 AWS 的私有骨干网到达目标 Region。这就像坐高铁而不是走国道：路径更短，速度更快，抖动更小。Anycast 也是 DNS 根服务器的部署方式——13 个根服务器的 IP 背后其实有上千台物理服务器。

---

## 组件卡 — Defense 域

### Multi-AZ Deploy

**L2** 将服务部署到多个可用区，单个数据中心故障不影响服务。

**L3** 可用区（Availability Zone）是云计算的核心概念：同一个 Region 内，物理上隔离（不同建筑、不同电力、不同网络）但通过低延迟专线互联的数据中心。AWS 每个 Region 通常有 3 个 AZ。Multi-AZ 部署是高可用的基础——2012 年 AWS us-east-1 大规模故障让整个行业意识到"不能把鸡蛋放在一个篮子里"。Netflix、Instagram 等公司在那次事故后全面推行多区域部署。

### Circuit Breaker

**L2** 断路器模式：下游服务故障时自动切断调用链，防止级联失败。

**L3** 断路器模式由 Michael Nygard 在 2007 年的《Release It!》一书中首次引入软件领域，灵感来自电路中的断路器——当电流过大时自动断开，保护整个电路不被烧毁。软件断路器有三个状态：Closed（正常通过）→ Open（故障率过高，直接拒绝）→ Half-Open（试探性放行少量请求）。Netflix 的 Hystrix（2012）是最著名的实现。没有断路器的微服务架构就像没有保险丝的电路——一个服务崩溃，整条调用链全部超时，系统雪崩。

### Health Check

**L2** 定期探测服务是否存活和健康的机制。

**L3** Health Check 是分布式系统的"体检"机制。最简单的是 TCP 端口探测（能连上就算活着），进阶版本是 HTTP 端点（`/health`）返回详细状态。K8s 区分了两种探针：Liveness Probe（是否活着，不活就重启）和 Readiness Probe（是否就绪，没就绪就摘流量）。这种区分很关键——一个正在加载缓存的服务是活着的，但不该接收请求。Health Check 配合负载均衡器实现了自动故障摘除：坏节点会被自动从流量池中移除。

### Active-Standby Failover

**L2** 主备切换模式，主节点故障时备用节点自动接管。

**L3** 主备架构是最古老也最可靠的高可用方案之一。主节点处理所有请求，备用节点实时同步数据但不服务流量，主节点故障时备节点提升为主。关键挑战是"脑裂"（split-brain）：主节点真的挂了，还是只是网络分区导致心跳丢失？如果两个节点都认为自己是主，数据就会不一致。解决方案包括仲裁节点（quorum）、STONITH（Shoot The Other Node In The Head，给对方断电）等。

### Backup & Restore

**L2** 定期备份数据并验证可恢复性，灾难恢复的最后防线。

**L3** 备份的黄金法则是 3-2-1：3 份副本、2 种介质、1 份异地。但备份的真正价值不在于"有没有做"，而在于"能不能恢复"。GitLab 在 2017 年经历了数据库删除事故，发现 5 种备份机制中有 4 种失效——这个案例成了备份恢复测试的经典教训。RPO（Recovery Point Objective，能容忍丢多少数据）和 RTO（Recovery Time Objective，能容忍停多长时间）是衡量备份策略的两个核心指标。

### Dead Letter Queue

**L2** 死信队列，存放无法被正常消费的消息，防止毒丸消息阻塞处理。

**L3** "死信"（Dead Letter）这个术语来自邮政系统——无法投递的信件会被送到"死信处理办公室"。在消息系统中，如果一条消息反复处理失败（格式错误、业务异常等），它会被移入死信队列，避免阻塞后续消息。DLQ 是消息系统"兜底"的关键设计——没有 DLQ 的系统，一条坏消息可能导致整个消费管道卡死。最佳实践是设置监控和告警，定期人工审查死信队列中的消息。

### Idempotency Key

**L2** 幂等键，保证同一请求重复执行多次的效果与执行一次相同。

**L3** 幂等性（Idempotency）源自数学概念：f(f(x)) = f(x)。在分布式系统中，网络不可靠导致请求可能被重发——用户点了两次"付款"按钮，或者消息队列重新投递了一条消息。幂等键的做法是：客户端为每个请求生成唯一 ID，服务端记录已处理的 ID，重复请求直接返回之前的结果。Stripe 的 API 设计是幂等性的业界典范——每个支付请求都必须携带 `Idempotency-Key` Header。

### Consistency Checker

**L2** 数据一致性校验器，定期比对多源数据发现不一致。

**L3** 在分布式系统中，数据被复制到多个存储（缓存、数据库、搜索引擎），不一致几乎不可避免。Consistency Checker 是一种"事后补偿"策略：定期扫描比对各数据源，发现差异后触发修复。Amazon 在内部大量使用这种"anti-entropy"（反熵）机制。这个思路来自 CAP 定理的现实妥协：既然无法同时保证一致性和可用性，那就选择可用性，然后用异步机制修复不一致。

### Disaster Recovery

**L2** 灾难恢复策略，确保极端情况下（自然灾害、机房故障）系统仍能恢复。

**L3** DR 策略按成本和恢复速度分为四个层级：Backup & Restore（最便宜，恢复最慢）→ Pilot Light（最小核心常开）→ Warm Standby（缩减版环境始终运行）→ Multi-Site Active/Active（最贵，秒级切换）。RPO 和 RTO 是衡量指标。2011 年日本地震后，AWS 东京 Region 的部分服务中断，推动了跨 Region DR 的普及。Netflix 的"Region Evacuation（区域撤离）"演练甚至能在几分钟内把所有流量从一个 Region 切到另一个。

### Blue-Green Deploy

**L2** 蓝绿部署：维护两套环境，切换流量实现零停机发布。

**L3** 蓝绿部署的概念由 Daniel Terhorst-North 和 Jez Humble 在《持续交付》一书中推广。核心思路：蓝色环境运行当前版本，绿色环境部署新版本，测试通过后把负载均衡器的流量从蓝切到绿。出问题？一秒切回蓝。相比传统的"停机维护窗口"，蓝绿部署让发布变成了一个低风险操作。代价是需要双倍的基础设施资源。如果只有一半资源怎么办？那就用滚动更新（Rolling Update）。

### Chaos Monkey

**L2** Netflix 的混沌工程工具，随机终止生产环境实例来检验系统韧性。

**L3** 2010 年 Netflix 全面迁移到 AWS 后，工程师们意识到一个问题：云上的服务器随时可能挂，与其等它挂了才发现系统扛不住，不如主动制造故障来锻炼韧性。Chaos Monkey 应运而生——它在工作日随机杀掉生产环境的实例。后来发展出整个"猿猴军团"（Simian Army）：Latency Monkey 注入延迟，Chaos Gorilla 模拟整个可用区故障。2012 年混沌工程被 Netflix 体系化，如今已成为大型分布式系统的标准实践。原则是"在你无法控制故障时间的世界里，主动选择何时面对故障"。

### Canary Deploy

**L2** 金丝雀部署：先把新版本发布给一小部分用户，观察指标再全量推送。

**L3** 名字来源于煤矿中的金丝雀——矿工把金丝雀带进矿井，如果金丝雀先死了，说明有毒气，矿工赶紧撤。同样的逻辑：先把 1% 的流量导向新版本，监控错误率、延迟、业务指标，没问题再逐步扩大到 5%、25%、100%。Google、Facebook 的发布流程都基于金丝雀部署。与蓝绿部署的区别是：蓝绿是"全量切换"，金丝雀是"渐进式发布"。更精细的控制，更低的爆炸半径。

---

## 组件卡 — Platform 域

### Prometheus

**L2** 开源监控系统和时序数据库，云原生可观测性的基石。

**L3** Prometheus 由前 Google 工程师 Matt Proud 和 Julius Volz 在 SoundCloud 开发，2016 年成为 CNCF 的第二个毕业项目（第一个是 K8s）。名字取自希腊神话中为人类盗取火种的泰坦——隐喻"把系统的真相带给工程师"。Prometheus 的拉模式（Pull-based）设计是其标志：不是服务主动推指标，而是 Prometheus 定期去抓取。PromQL 查询语言和多维标签模型影响了整个监控行业。搭配 Grafana 可视化，"Prometheus + Grafana"已是云原生监控的标配。

### Datadog

**L2** 全栈云监控 SaaS 平台，集成指标、日志、链路追踪。

**L3** Datadog（2010，由前 Wireless Generation 的 Olivier Pomel 和 Alexis Lê-Quôc 创立）代表了"可观测性即服务"的趋势。名字来源于一种开发实践的比喻——像看门狗（watchdog）一样监视系统。Datadog 的核心卖点是"一个平台看到一切"：基础设施指标、应用性能、日志、安全、网络，全部关联在一起。自建 vs SaaS 是经典权衡：Prometheus 免费但要运维，Datadog 贵但省心。当日志量达到 TB 级时，Datadog 的账单也可能让你的 SRE 变成 FinOps。

### Grafana

**L2** 开源数据可视化平台，支持多种数据源的统一 Dashboard。

**L3** Grafana（2014）由瑞典开发者 Torkel Ödegaard 创建，最初是 Kibana 的一个 fork，专注于时序数据可视化。名字可能源自 Graphana（Graph + Ana[lytics]）。Grafana 的强大之处在于数据源无关——Prometheus、InfluxDB、Elasticsearch、MySQL、甚至 Google Sheets 都能作为数据源，在同一个 Dashboard 上混合展示。如今 Grafana Labs 围绕它构建了完整的可观测性栈：Loki（日志）、Tempo（链路追踪）、Mimir（长期指标存储）。

### ELK Stack

**L2** Elasticsearch + Logstash + Kibana，日志收集、存储、分析的经典三件套。

**L3** ELK 是三个开源项目的组合：Logstash 收集和转换日志 → Elasticsearch 存储和索引 → Kibana 可视化和查询。由 Elastic 公司统一维护。后来加入了 Beats（轻量级采集器），变成了 "Elastic Stack"。ELK 曾是日志分析的事实标准，但大规模运维成本高（Elasticsearch 集群的 JVM 调优是门黑科技）。近年 Grafana Loki（只索引标签不索引全文）和 ClickHouse 以更低的存储成本发起挑战。

### Feature Flag

**L2** 功能开关，通过配置动态启用/禁用功能，无需重新部署。

**L3** Feature Flag（又叫 Feature Toggle）让发布和上线解耦：代码已部署但功能默认关闭，通过配置逐步放开。Martin Fowler 将其分为四类：Release Toggle（发布控制）、Experiment Toggle（A/B 测试）、Ops Toggle（运维开关）、Permission Toggle（权限控制）。Facebook 和 Google 大规模使用功能开关实现"暗发布"（Dark Launch）——代码上线但只对内部用户可见。代价是代码中会充满 if-else 分支，及时清理过期的 Flag 很重要。LaunchDarkly 是最知名的 Feature Flag 商业服务。

### Config Center

**L2** 集中配置管理服务，让应用从外部获取配置而非硬编码。

**L3** "Twelve-Factor App"（2011，Heroku 提出）的第三条原则就是"在环境中存储配置"。配置中心的核心理念是将配置与代码分离：数据库连接串、功能开关、限流阈值等不应该写在代码里。Spring Cloud Config、Apollo（携程开源）、Consul 是主流方案。配置中心还支持热更新——修改配置后无需重启服务即生效。但要注意"配置漂移"：当配置中心成了万能工具，配置项越来越多，最终没人知道某个配置为什么是这个值。

### Vault

**L2** HashiCorp 的密钥管理工具，统一管理密码、证书和敏感配置。

**L3** Vault（2015，HashiCorp）解决了一个痛点：密码散落在环境变量、配置文件、代码仓库中，管理混乱且不安全。Vault 提供统一的密钥存储，支持动态密钥（用时生成、到期自动失效）、加密即服务、证书管理。它的 Shamir 密钥分割（基于 Adi Shamir 的秘密共享方案）确保没有任何单个人能解封 Vault——需要多个密钥持有者协作。2019 年 Capital One 的数据泄露事件（1 亿用户数据暴露）让行业更重视密钥管理。

### Audit Log

**L2** 审计日志，记录系统中所有关键操作，用于合规审查和事后追溯。

**L3** 审计日志是"谁在什么时间对什么做了什么"的不可篡改记录。在金融、医疗、政务等合规要求严格的行业，审计日志不是可选项而是法律要求（如 SOX、HIPAA、GDPR）。好的审计日志应该是只追加（append-only）、有时间戳、有操作者身份、有操作前后的状态变化。区块链本质上就是一种去中心化的审计日志。在系统设计中，审计日志往往是被遗忘的"最后一公里"——上线后出事了才发现没有记录谁做了操作。

### Encryption

**L2** 数据加密，保护静态数据和传输中的数据不被未授权访问。

**L3** 加密分两大场景：传输加密（Encryption in Transit，如 TLS/HTTPS）和静态加密（Encryption at Rest，如磁盘加密）。对称加密（AES）速度快但密钥分发困难，非对称加密（RSA）解决了密钥分发但速度慢——TLS 聪明地结合了两者：用非对称加密协商对称密钥，然后用对称加密传输数据。Let's Encrypt（2015）让 HTTPS 证书免费化，推动了全网 HTTPS 的普及。在系统设计中，加密是"defense in depth（纵深防御）"的核心层。

### ArgoCD

**L2** 基于 GitOps 的 K8s 持续部署工具，Git 仓库作为期望状态的唯一真实来源。

**L3** GitOps 理念由 Weaveworks 的 Alexis Richardson 在 2017 年提出：用 Git 作为基础设施和应用配置的唯一真相来源。ArgoCD 是这一理念的主流实现——它持续监控 Git 仓库和 K8s 集群的差异，自动或手动同步。这意味着所有变更都通过 Pull Request 进行、有代码审查、有完整的审计记录。ArgoCD 的 UI 能可视化展示应用的部署状态和资源关系图。ArgoCD 属于 Argo 项目家族，还包括 Argo Workflows（工作流）和 Argo Rollouts（渐进式发布）。

### Terraform

**L2** HashiCorp 的基础设施即代码工具，用声明式配置管理云资源。

**L3** Terraform（2014，HashiCorp 的 Mitchell Hashimoto 创建）实现了"基础设施即代码"（Infrastructure as Code）的理念：用 `.tf` 文件声明你想要什么资源，Terraform 负责创建和管理。它的状态文件（state file）记录了"期望状态 vs 真实状态"的映射，`plan` 命令展示差异，`apply` 命令执行变更。多云支持是其核心优势——AWS、GCP、Azure、甚至 GitHub 和 Datadog 都能用 Terraform 管理。HCL 配置语言是"比 JSON 更人性化，比 YAML 更严格"的设计。

---

## 组件卡 — GCP 专属组件

### Cloud Run

**L2** Google 全托管无服务器容器平台，按请求计费，自动扩缩至零。

**L3** Cloud Run 基于 Knative 构建，让容器像函数一样部署。2019 年推出后迅速成为 GCP 的杀手级产品。比起 App Engine 更灵活，比起 GKE 更简单——正好击中了"我想用容器但不想管 K8s"的痛点。

### Cloud Functions

**L2** GCP 的事件驱动函数计算服务，支持 HTTP、Pub/Sub 等多种触发器。

**L3** 作为 Google 对标 AWS Lambda 的 FaaS 产品，Cloud Functions 与 GCP 生态深度集成。第二代基于 Cloud Run 构建，意味着你的函数其实运行在容器里——FaaS 与 CaaS 的界限正在模糊。

### GKE

**L2** Google Kubernetes Engine，Kubernetes 的诞生地运营的最成熟托管 K8s 服务。

**L3** Google 内部的 Borg 系统是 Kubernetes 的灵感来源，GKE 自然成为最"原汁原味"的托管 K8s。Autopilot 模式甚至替你管理节点池——从 Borg 到 K8s 到 GKE Autopilot，Google 一直在追求"让开发者忘记基础设施"。

### BigQuery

**L2** PB 级无服务器数据仓库，列式存储 + 分布式查询，秒级分析海量数据。

**L3** BigQuery 的前身是 Google 内部的 Dremel 论文（2010），它证明了"即使数据量大到不可思议，交互式查询也不必等上几小时"。按查询量计费的模型重新定义了数据仓库的经济学。

### Cloud Spanner

**L2** 全球分布式强一致关系型数据库，兼具 SQL 与水平扩展。

**L3** Spanner 源自 2012 年 Google 的同名论文，使用 TrueTime API（依赖原子钟和 GPS）实现全球外部一致性。它打破了 CAP 定理的日常认知——当你有足够精确的时钟，你可以同时拥有一致性和可用性。

### Firestore

**L2** 实时 NoSQL 文档数据库，客户端直连，数据变更即时同步。

**L3** 从 Firebase Realtime Database 演进而来，Firestore 是移动开发者的最爱。文档-集合模型配合实时监听器，让前端开发者可以绕过后端直接操作数据。这是"Backend-as-a-Service"理念的极致体现。

### Pub/Sub

**L2** 全球级消息发布-订阅服务，无限吞吐，至少一次语义。

**L3** Google 的 Pub/Sub 设计哲学是"消息基础设施应该像水电一样无感"。无需预置分区、无需管理 Broker，全球自动复制。它是 Google 内部多年分布式消息经验的结晶，也是 GCP 数据管道生态的基石。

### Cloud CDN

**L2** GCP 全球内容分发网络，利用 Google 全球边缘网络加速内容传输。

**L3** 依托 Google 遍布全球 200+ 个边缘节点（也是 YouTube 和 Search 使用的同一网络），Cloud CDN 的覆盖面是其最大优势。它与 Cloud Load Balancing 深度集成，一个入口点即可同时获得负载均衡和 CDN 能力。

### Cloud Armor

**L2** GCP 边缘安全服务，提供 DDoS 防护、WAF 规则和自适应保护。

**L3** Cloud Armor 坐在 Google 全球负载均衡器前面，意味着攻击在到达你的服务之前就被拦截在了 Google 网络边缘。Google 自己也用同样的基础设施保护 Search、Gmail 和 YouTube——你的安全防线与世界顶级服务相同。

### Cloud Monitoring

**L2** GCP 原生的全栈监控与告警平台，原 Stackdriver 品牌。

**L3** 收购 Stackdriver（2014）后，Google 逐步将其改造为 GCP 的监控底座。如今它不仅监控 GCP 资源，还可以通过 OpenTelemetry 接收跨云遥测数据。命名从 Stackdriver 到 Cloud Monitoring 的变迁，折射出 Google 品牌整合的野心。

---

## 组件卡 — Azure 专属组件

### Azure Functions

**L2** Microsoft 的无服务器计算平台，支持 Durable Functions 实现有状态工作流。

**L3** Azure Functions 最独特的武器是 Durable Functions 扩展——它用编排器模式让无服务器函数可以实现 saga、fan-out/fan-in 等复杂模式。这是 FaaS 领域少有的"既无服务器又有状态"的解决方案。

### AKS

**L2** Azure Kubernetes Service，与 Azure AD 和 Azure Monitor 深度集成的托管 K8s。

**L3** Microsoft 从 Docker Swarm 的早期支持者转向全面拥抱 Kubernetes，AKS 是这一转型的核心产物。与 Azure Active Directory 的原生集成让企业 RBAC 无缝衔接——这是 Azure 在企业市场的杀手锏。

### App Service

**L2** Azure 全托管 PaaS，支持多语言 Web 应用的一键部署与自动扩展。

**L3** App Service 的前身可追溯到 Azure Websites（2012），是 Azure 最早期的 PaaS 产品之一。它代表了"不需要容器化就能上云"的务实路线——对于许多企业应用来说，PaaS 比 CaaS 更合适。

### Cosmos DB

**L2** 全球分布式多模型数据库，5 种一致性级别，个位数毫秒延迟。

**L3** Cosmos DB 的前身是 DocumentDB（2014），它大胆地提供了 5 种可调一致性级别（从强一致到最终一致）。这种"一致性光谱"的设计打破了传统二元选择，让开发者根据业务场景精细调整 CAP 取舍。

### Azure SQL

**L2** 全托管的 SQL Server 云数据库，企业级安全与智能调优。

**L3** 作为世界上最广泛使用的商业数据库之一的云化版本，Azure SQL 继承了 SQL Server 三十年的企业基因。Intelligent Performance 功能利用 AI 自动调优查询——Microsoft 正在用机器学习解决 DBA 最头疼的问题。

### Service Bus

**L2** 企业级消息中间件，支持队列和主题/订阅两种模式。

**L3** Azure Service Bus 脱胎于 .NET 生态的 WCF 和 MSMQ 传统，是企业消息模式（Enterprise Integration Patterns）在云端的实现。它支持 AMQP 1.0 标准，是连接混合云中遗留系统和云原生服务的桥梁。

### Blob Storage

**L2** Azure 对象存储服务，支持 Hot/Cool/Archive 三层存储分级。

**L3** Blob Storage 的三层存储架构（Hot → Cool → Archive）完美映射了数据的生命周期：热数据频繁访问、温数据偶尔访问、冷数据归档保留。自动化分层策略让存储成本优化变得无脑。

### Azure Front Door

**L2** 全球负载均衡 + CDN + WAF 一体化入口服务，anycast 架构。

**L3** Front Door 是 Azure 的"一站式全球入口"，将 CDN、WAF、DDoS 防护和全球负载均衡打包在一起。它使用 anycast 路由，确保用户请求到达最近的 Azure POP 点——简化架构的同时不牺牲性能。

### Application Gateway

**L2** Azure 应用层（L7）负载均衡器，内置 WAF 和 SSL 卸载。

**L3** Application Gateway 是 Azure 网络栈中专注于应用层的组件。与 Front Door（全球入口）互补，它负责区域内的 L7 路由。内置的 WAF v2 基于 OWASP Core Rule Set，为 Web 应用提供开箱即用的安全防护。

### Azure Monitor

**L2** Azure 全栈监控平台，整合指标、日志和分布式追踪。

**L3** Azure Monitor 的野心是成为 Azure 上所有可观测性的统一入口。它将 Application Insights（APM）、Log Analytics（日志）和 Metrics（指标）整合在一个品牌下。Kusto 查询语言（KQL）是其隐藏宝石——一种专为日志分析设计的强大查询语言。

---

## 组件卡 — 自建专属组件

### Bare Metal Server

**L2** 物理服务器，无虚拟化开销，极致的计算性能和硬件控制。

**L3** 在容器和虚拟机主宰的时代，Bare Metal 依然是数据库和 HPC 工作负载的首选。没有 hypervisor 意味着零虚拟化税。当每一个 CPU 周期都珍贵时——比如高频交易或实时视频编码——物理机仍是王者。

### Docker Swarm

**L2** Docker 原生容器编排，简单轻量，适合小规模集群。

**L3** Docker Swarm 曾是 Kubernetes 最大的竞争对手。它的设计哲学是"够用就好"——学习曲线平缓，部署简单。虽然在企业市场输给了 K8s，但对于小团队和简单场景，它仍然是"5 分钟搭建集群"的最佳选择。

### Nomad

**L2** HashiCorp 的工作负载编排器，支持容器和非容器负载的统一调度。

**L3** Nomad 是 HashiCorp 对"不是所有东西都需要 Kubernetes"这一理念的回答。它可以编排 Docker 容器、Java JAR、批处理脚本甚至虚拟机。单一二进制文件、零依赖的部署方式让它成为自建党的最爱。

### CockroachDB

**L2** 开源分布式 SQL 数据库，受 Google Spanner 启发，支持跨区域强一致。

**L3** CockroachDB 的名字来自蟑螂的生存能力——杀不死的数据库。它实现了 Spanner 论文的核心理念但不依赖原子钟，用混合逻辑时钟替代 TrueTime。在自建场景中，它是最接近"云级别分布式 SQL"的开源方案。

### MinIO

**L2** 高性能 S3 兼容对象存储，Kubernetes 原生，可自建部署。

**L3** MinIO 证明了对象存储不是云厂商的专利。S3 API 兼容意味着你可以把所有为 S3 编写的代码无缝迁移到自己的数据中心。它在 AI/ML 流水线中特别流行——当数据集太大不想上传到云端时，本地的 MinIO 是最佳选择。

### NATS

**L2** 轻量级高性能消息系统，单一二进制文件，微秒级延迟。

**L3** NATS 的哲学是"less is more"——核心 Broker 是一个不到 20MB 的 Go 二进制文件。JetStream 扩展加入了持久化和流处理能力后，NATS 已经从"简单的 pub/sub"进化为完整的消息平台。在自建场景中，它是 Kafka 的轻量替代品。

### HAProxy

**L2** 业界标杆的高可用负载均衡器，C 语言编写，极致性能。

**L3** HAProxy 从 2000 年开始开发，至今仍是世界上部署最广泛的开源负载均衡器。GitHub、Stack Overflow、Reddit 等顶级网站都在使用。它的配置文件虽然不够"现代"，但稳定性和性能经过了二十年的生产环境验证。

### Traefik

**L2** 云原生边缘路由器，自动服务发现，支持 Let's Encrypt 证书自动化。

**L3** Traefik 是容器时代的反向代理答案——它能自动发现 Docker/K8s 中的服务并动态配置路由，不需要重启或手动更新配置。内置的 Let's Encrypt 集成让 HTTPS 变成了零运维成本，这在自建环境中尤其珍贵。

### WireGuard

**L2** 现代 VPN 协议，代码仅 4000 行，内核级性能。

**L3** WireGuard 的作者 Jason Donenfeld 用不到 4000 行代码实现了一个比 OpenVPN 快数倍的 VPN。它已被合并入 Linux 内核（5.6+），获得了 Linus Torvalds "一件艺术品"的赞誉。在自建网络安全方案中，WireGuard 正在快速取代传统 VPN。

### Ansible

**L2** 无代理自动化运维工具，使用 YAML 定义基础设施，SSH 即连即用。

**L3** Ansible 的"无代理"设计是它的核心哲学——不需要在目标机器上安装任何东西，SSH 就够了。Red Hat 2015 年收购 Ansible 后，它成为了企业自动化的事实标准。在自建环境中，Ansible 是从裸机到可用集群的第一步。

---

## Joker 卡

### SLA 狂魔

**L2** 服务等级协议的执念追求者——在 SLA 面前，一切功能让路。

**L3** SLA（Service Level Agreement）是服务提供方对可用性的承诺。SLA/SLO/SLI 是 Google SRE 体系的核心概念：SLI（指标）→ SLO（目标）→ SLA（协议，带违约惩罚）。99.9% 和 99.99% 看似只差 0.09%，但每年允许的停机时间从 8.76 小时降到 52.6 分钟。每多一个 9，成本呈指数增长。SLA 狂魔的 ×1.3 倍率代表了"高可用投入带来的指数级回报"。

### 数据囤积者

**L2** 什么数据都要存，"以后可能用得上"是他们的口头禅。

**L3** 数据湖（Data Lake）概念由 Pentaho CTO James Dixon 在 2010 年提出，与数据仓库的"先建模再存储"相反，数据湖主张"先存再说"。这种做法在 AI/ML 时代被证明有远见——训练模型需要大量原始数据。但不加治理的数据湖会退化为"数据沼泽"（Data Swamp）：大量数据无人知道其含义和质量。+3 chips/[db] 反映了"数据越多，基础分越高"的朴素真理。

### 云原生信徒

**L2** 一切皆容器，一切皆声明式，一切皆可观测。

**L3** 云原生（Cloud Native）由 CNCF（云原生计算基金会，2015 年成立）定义：容器化、微服务、声明式 API、不可变基础设施。云原生信徒相信"在云上原生构建"优于"把传统应用搬到云上"。K8s 是云原生的核心，围绕它形成了庞大的生态：Helm、Istio、Prometheus、Envoy。+2 chips/[deploy] 反映了"标准化部署带来的效率提升"。

### 模式放大器

**L2** 善于识别和放大架构模式的价值，让套路产生协同效应。

**L3** 设计模式（Design Patterns）由"四人帮"（Gang of Four：Erich Gamma、Richard Helm、Ralph Johnson、John Vlissides）在 1994 年的同名经典著作中系统化。23 个模式（工厂、观察者、策略等）成为软件工程的通用语言。在系统设计领域，也有类似的"架构模式"：CQRS、事件溯源、Saga、Sidecar 等。模式的价值不在于单个模式，而在于模式间的组合——这正是"放大器"的含义。

### 连击之王

**L2** 多个架构模式的组合触发连击效应，协同大于累加。

**L3** 在真实的系统架构中，单一模式很少独立存在。经典组合包括：CQRS + Event Sourcing（命令查询分离 + 事件溯源）、Circuit Breaker + Retry + Timeout（弹性模式三件套）、Sidecar + Service Mesh + mTLS（零信任网络）。Netflix 的微服务架构同时运用了十几种模式的组合。2+ patterns 触发 ×1.5 反映了"架构协同效应"——好的架构不是模式的堆砌，而是模式间的共振。

### 算牌大师

**L2** 通过监控数据洞察系统状态，信息优势带来更好的决策。

**L3** "算牌"在 21 点中是一种通过追踪已出牌面来判断剩余牌概率的策略。在系统设计中，可观测性（Observability）就是你的"算牌"能力：Prometheus 告诉你系统的数值指标，Grafana 让你看到趋势。Google SRE 文化的核心信条是"没有数据就没有决策"。手牌 +2 代表"看得多，选择就多"。

### 重抽大师

**L2** 重构和迭代的高手，敢于放弃不合适的方案重新来过。

**L3** 在软件开发中，"沉没成本谬误"是最常见的陷阱——已经写了这么多代码，不舍得扔掉重来。重抽大师的弃牌 +2 代表了一种重要的工程美德：承认错误、及时止损。Martin Fowler 的《重构》一书系统化了"在不改变外部行为的前提下改善内部结构"的方法论。勇于重抽，才能找到更好的牌。

### 掘金者

**L2** 数据管道淘金客，从原始数据中提炼出有价值的信息。

**L3** ETL（Extract-Transform-Load）是数据工程的核心流程：从各数据源抽取原始数据 → 清洗转换 → 加载到目标数据仓库。如今更流行 ELT（先加载再转换）——因为云数仓的计算能力足以在库内完成转换。数据工程师被称为"现代淘金者"：原始数据如同河沙，有价值的洞察就是金子。+5 gold/pattern 反映了"数据驱动的商业价值"。

### 梭哈

**L2** 全押同一技术栈，极致深耕，要么大赢要么大输。

**L3** 单体架构（Monolith）并非落后的代名词。DHH（Ruby on Rails 创始人）一直为单体辩护："Majestic Monolith（雄伟的单体）"。Shopify、Basecamp 都运行在单体架构上。当整个团队精通同一技术栈时，效率极高。5+ 张同 Domain 触发 ×2.0 的高倍率反映了"深耕回报"——但也意味着把所有鸡蛋放在一个篮子里的风险。

### 极简主义

**L2** 用最少的组件解决问题，复杂度是最大的敌人。

**L3** "Simplicity is the ultimate sophistication"——达芬奇的话也适用于系统设计。三层架构（前端 → 应用层 → 数据库）诞生于 1990 年代，至今仍是大量应用的最佳选择。过早引入微服务、消息队列、缓存层往往是"过度设计"。Amazon CTO Werner Vogels 说："everything fails all the time"——组件越少，故障点越少。≤3 张触发 ×1.5，鼓励用最少的牌凑出最大的价值。

### 橡皮鸭

**L2** 向橡皮鸭解释问题的过程中，你就找到了答案。

**L3** "橡皮鸭调试法"出自 Andrew Hunt 和 David Thomas 的《程序员修炼之道》（The Pragmatic Programmer, 1999）：把一只橡皮鸭放在桌上，逐行向它解释代码时，bug 往往自己浮现。这背后的心理学原理是"解释效应"——把思维外化为语言会激活不同的认知通道。在本游戏中，橡皮鸭代表可观测性——当你让系统的行为"可见"时，问题就自然暴露了。+3 chips/[monitor] 意味着"看得越清，底子越厚"。

### 遗留代码

**L2** 没人敢动的祖传代码，牵一发动全身。

**L3** Michael Feathers 在《修改代码的艺术》（Working Effectively with Legacy Code）中给出了遗留代码最精准的定义："没有测试的代码就是遗留代码"。"意大利面架构"（Spaghetti Architecture）形容模块间的依赖像意大利面一样纠缠不清。讽刺的是，遗留代码之所以"遗留"，恰恰因为它在生产中运行得足够好。all_different_domains 触发 ×1.4——就像遗留系统，什么都沾一点，反而有独特的韧性。

### 微服务狂热

**L2** "如果一个问题解决不了，那就拆成更多的微服务。"

**L3** 微服务在 2014-2018 年经历了狂热期，似乎所有公司都在"拆服务"。但 Martin Fowler 早在 2015 年就警告过"Microservice Premium（微服务税）"——分布式系统的复杂性、网络延迟、数据一致性、运维成本都是真实的代价。Kelsey Hightower（Google Cloud）有句名言："Monoliths are the future（单体才是未来）"——半是玩笑，半是对过度拆分的反思。≥4 张触发 ×1.3 反映了"组件越多，协同效应越强，但也越复杂"。

### 缓存命中

**L2** 缓存命中的瞬间，就是系统设计的快感时刻。

**L3** 多级缓存（L1 → L2 → Redis → DB）是性能优化的黄金方案。Phil Karlton 的名言："计算机科学中只有两件难事——缓存失效和命名。"缓存穿透（查不存在的 key）、缓存击穿（热点 key 过期）、缓存雪崩（大量 key 同时过期）是三大经典问题。Facebook 发表的《Scaling Memcache at Facebook》详细描述了如何在数十亿请求中维持缓存一致性。+4 chips/[cache] 是所有 per-tag 加成中最高的——因为缓存的性能回报确实最直接。

### 事故指挥官

**L2** 安全 + 高可用双修，是团队在事故中的定海神针。

**L3** 事故指挥官（Incident Commander）源自美国消防系统的 ICS（Incident Command System）。Google SRE 将这一角色引入了技术领域：在生产事故中，IC 负责协调所有参与者、维持沟通节奏、做出关键决策。PagerDuty 的《事故响应最佳实践》是这一领域的经典资料。all: [security, ha] 的双重要求反映了"事故指挥官必须同时理解安全和可用性"。

### 开源贡献者

**L2** 在开源社区中给予，也从社区中获得回报。

**L3** GitHub Flow（由 GitHub 的 Scott Chacon 在 2011 年提出）是最流行的开源协作模式：fork → branch → commit → pull request → review → merge。开源运动从 Richard Stallman 的 FSF（1985）到 Linus Torvalds 的 Linux（1991）再到如今的 GitHub，重塑了整个软件行业。+3 gold/phase 反映了开源的经济学：免费使用他人的代码，省下的是自己的开发成本。

### 10x 工程师

**L2** 传说中效率是普通工程师十倍的存在。

**L3** "10x Engineer"这个概念可追溯到 Fred Brooks 的《人月神话》（1975）中提到的程序员生产力差异可达 10:1。2019 年 Shekhar Kirani 的推文详细描述了"10x 工程师的特征"引发了巨大争议——批评者认为这种个人英雄主义忽视了团队协作的价值。×1.2 always 的设计很有意味：10x 工程师确实能提升效率，但 1.2 倍远不到 10 倍——暗示个人能力的上限低于人们的想象。

### 过度设计

**L2** 给一个 Todo App 配了 15 个中间件——这还只是开发环境。

**L3** 过度设计（Over-engineering）是 YAGNI 原则（You Aren't Gonna Need It，出自极限编程 XP）的反面。经典段子："面试官问如何设计一个 URL 短链服务，候选人画出了微服务 + Kafka + Redis + K8s + Service Mesh 的架构图——这个服务的日访问量是 100 次。"capacity_over_budget 触发 +10 chips 的设计很有讽刺意味：过度设计确实能带来纸面上的"筹码"，但代价是超预算的惩罚。

### DevOps 大师

**L2** 打通开发和运维的壁垒，让交付像流水线一样顺畅。

**L3** DevOps 运动起源于 2009 年 Patrick Debois 组织的第一届 DevOpsDays。核心理念是打破开发和运维之间的"责任墙"（Wall of Confusion）。CI/CD（持续集成/持续交付）是 DevOps 的技术基础：代码提交 → 自动构建 → 自动测试 → 自动部署。Jenkins（2011）开创了 CI 工具时代，后来 GitHub Actions、GitLab CI 等让 CI/CD 更加平民化。any: [monitor] 的条件反映了 DevOps 的格言："You can't improve what you can't measure。"

### 混沌爱好者

**L2** 主动制造混乱来证明系统足够坚固。

**L3** 混沌工程的哲学是反直觉的：通过刻意制造故障来提升系统可靠性，就像疫苗通过引入弱化病原体来增强免疫力。Netflix 将其体系化为四个原则：(1) 建立稳态假设 (2) 引入真实世界事件 (3) 在生产环境运行 (4) 自动化持续运行。all: [ha, deploy] 的双重要求意味着：混沌工程的前提是你已经有高可用和自动化部署能力——否则注入混沌只会造成真正的灾难。×1.8 是所有条件性 Joker 中最高的倍率，对应最高的实践门槛。

---

## Tarot 卡

### 分库分表

**L2** 将单一数据库拆分成多个分片，突破单库性能瓶颈。

**L3** 当单库承载不了数据量或写入压力时，需要水平分片（Sharding）。分片键的选择至关重要：选错了会导致数据倾斜（某些分片热得发烫，某些闲得长草）。垂直拆分（按业务拆库）通常先于水平拆分。加 [replication] tag 反映了分库后的必然需求——每个分片都需要副本来保证高可用。

### CDN 加速

**L2** 把静态内容推送到全球边缘节点，让用户就近访问。

**L3** 给缓存组件加 [edge] tag，代表"将缓存能力延伸到网络边缘"。这是现代 Web 性能优化的标准实践：JS/CSS/图片走 CDN，API 响应也可以在边缘缓存。Vercel 的 Edge Functions 和 Cloudflare Workers 正在把"边缘缓存"升级为"边缘计算"。

### 容器化

**L2** 将应用及其依赖打包成容器镜像，实现"一次构建，到处运行"。

**L3** Docker（2013，Solomon Hykes）让容器技术从 Linux 内核的底层特性（cgroups + namespaces）变成了开发者友好的工具。"Works on my machine"这句话从此有了解药。给 [compute] 组件加 [deploy] tag 反映了容器化的本质：让计算资源获得标准化的部署能力。

### 安全加固

**L2** 为任意组件增加安全层，减少攻击面。

**L3** 安全加固（Hardening）是纵深防御（Defense in Depth）的实践：不是依赖单一安全措施，而是层层设防。CIS Benchmarks 提供了各种系统的安全基线标准。加 [security] tag 代表"为组件加上安全属性"——在真实世界中，这可能是启用 TLS、配置 RBAC、或加入 WAF 保护。

### 埋点

**L2** 在代码中植入监控探针，采集运行时数据。

**L3** 可观测性三支柱：Metrics（度量）、Logs（日志）、Traces（链路追踪）。埋点是让系统"可被观测"的第一步。OpenTelemetry 正在统一埋点标准——不再被单一供应商锁定。加 [monitor] tag 意味着"让组件的行为变得可见"。

### 超频

**L2** 榨取组件的极限性能。

**L3** 借自硬件超频的概念——CPU 运行在高于标称频率的状态。在软件领域，"超频"意味着极致优化：JVM 调优、数据库索引优化、连接池配置、序列化格式选择。+5 base_chips 代表"性能调优带来的直接收益"。

### 优化

**L2** 降低组件的资源消耗，在有限预算中塞入更多能力。

**L3** "过早优化是万恶之源"——Donald Knuth 的名言提醒我们先跑通再优化。但当预算真的不够时，优化是必须的：从代码层面（算法优化）到架构层面（读写分离）到基础设施层面（Spot 实例、Reserved 实例）。-2 capacity_cost 反映了"用更少资源做同样事情"的工程追求。

### 转型

**L2** 将组件迁移到不同技术领域，实现架构重构。

**L3** 技术迁移是系统演进中最痛苦也最必要的环节。从单体到微服务、从 SQL 到 NoSQL、从自建到云服务——每次转型都是一次"忒修斯之船"。Strangler Fig Pattern（绞杀者模式，Martin Fowler 命名）是渐进式迁移的经典方法：新功能走新架构，旧功能逐步迁移，直到旧系统被完全替代。改变 domain 代表了这种根本性的架构转型。

---

## Tarot 卡包

> 每个卡包以一本真实的技术书籍命名，点击可了解这本书的核心价值。

### Designing Data-Intensive Applications

**L2** 数据密集型应用设计圣经，系统设计必读。

**L3** 作者 Martin Kleppmann（剑桥大学），2017 年出版。被称为"DDIA"，是系统设计领域影响力最大的书之一。覆盖数据模型、存储引擎、复制、分区、事务、一致性、批处理、流处理。几乎所有系统设计面试的知识点都能在这本书中找到理论基础。

### Building Microservices

**L2** 微服务架构的全面指南，从拆分策略到组织结构。

**L3** 作者 Sam Newman（ThoughtWorks），2015 年初版，2021 年第二版。这本书不仅讲技术（服务拆分、通信、部署），更讲组织（Conway 定律、团队自治）。核心观点：微服务的边界应该对齐业务领域（Domain-Driven Design），而非技术层。

### Site Reliability Engineering

**L2** Google SRE 团队的实践总结，可靠性工程的行业标准。

**L3** 2016 年 Google 出版，由 Betsy Beyer 等人编辑。SRE 是 Google 对"运维"的重新定义——用软件工程方法解决运维问题。核心概念包括 SLI/SLO/SLA、Error Budget（错误预算）、Toil（苦差事）、On-Call 轮值。这本书改变了整个行业对运维角色的认知。

### Designing Distributed Systems

**L2** 分布式系统设计模式集，容器化时代的架构指南。

**L3** 作者 Brendan Burns（Kubernetes 联合创始人），2018 年出版。以模式为核心组织：Sidecar、Ambassador、Adapter 等单节点模式，以及 Leader Election、Scatter/Gather 等多节点模式。短小精悍，适合已有分布式基础的工程师快速查阅。

### Database Internals

**L2** 数据库内部原理，从 B-Tree 到分布式共识。

**L3** 作者 Alex Petrov，2019 年出版。深入讲解存储引擎（B-Tree vs LSM-Tree）、内存管理、事务处理、分布式共识（Paxos、Raft）。如果 DDIA 是"用什么"，这本书是"为什么这样设计"。适合想理解数据库底层原理的工程师。

### Fundamentals of Software Architecture

**L2** 软件架构基础，架构师的入门与进阶指南。

**L3** 作者 Mark Richards 和 Neal Ford（ThoughtWorks），2020 年出版。系统化梳理了架构风格（分层、微内核、微服务、事件驱动等）、架构特征（-ilities）、架构决策记录（ADR）。核心观点："架构中一切都是权衡（Everything in architecture is a trade-off）"。

### Software Architecture: The Hard Parts

**L2** 架构中最难的决策——拆分、数据所有权、事务边界。

**L3** 作者 Neal Ford、Mark Richards 等，2021 年出版，是《Fundamentals》的进阶版。专注于分布式架构中最痛苦的决策：服务拆分粒度、数据库拆分策略、分布式事务（Saga vs 2PC）、服务间通信（同步 vs 异步）。书名中的"Hard Parts"是双关——既是"困难的部分"，也致敬了同名计算机体系结构教材。

### Kubernetes: Up & Running

**L2** Kubernetes 实战入门，从零到生产的完整指南。

**L3** 作者 Brendan Burns、Joe Beda、Kelsey Hightower——三位都是 K8s 项目的核心贡献者。从 Pod、Service、Deployment 等基础概念到 ConfigMap、Secret、RBAC 等进阶主题，覆盖了 K8s 生产使用的方方面面。Kelsey Hightower 的 K8s Demo 演讲是技术演讲的标杆。

### Kafka: The Definitive Guide

**L2** Kafka 权威指南，从基础概念到大规模运维。

**L3** 作者 Neha Narkhede、Gwen Shapira、Todd Palino，均来自 Kafka 核心团队或 Confluent。覆盖 Kafka 的核心概念（Topic、Partition、Consumer Group）、生产者/消费者最佳实践、集群运维。Kafka 从 LinkedIn 的内部项目成长为流处理领域的事实标准，这本书是理解其设计哲学的最佳入口。

### Infrastructure as Code

**L2** 基础设施即代码，用自动化替代手工运维。

**L3** 作者 Kief Morris（ThoughtWorks），2016 年初版，2020 年第二版。IaC 的核心原则：可复现、版本化、可测试、自文档化。覆盖 Terraform、CloudFormation、Ansible 等工具的理念和模式。核心观点：基础设施应该像软件一样管理——有版本控制、有代码审查、有自动化测试。

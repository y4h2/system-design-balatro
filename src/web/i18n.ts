/** Simple i18n — single-locale Chinese translation map */

const zh: Record<string, string> = {
  // ── Common / Shared ──
  'common.chips': '筹码',
  'common.mult': '倍率',
  'common.score': '得分',
  'common.target': '目标',
  'common.capacity': '容量',
  'common.penalty': '惩罚',
  'common.none': '无',
  'common.jokers': 'Joker',
  'common.tarots': '塔罗',
  'common.components': '组件',
  'common.patterns': '牌型',
  'common.gold': '金币',
  'common.base': '基础',
  'common.total': '合计',

  // ── Domains ──
  'domain.compute': '计算',
  'domain.data': '数据',
  'domain.network': '网络',
  'domain.defense': '防御',
  'domain.platform': '平台',

  // ── Blinds ──
  'blind.small': '小盲',
  'blind.big': '大盲',
  'blind.boss': 'Boss 盲',

  // ── Phase results ──
  'result.passed': '通过',
  'result.failed': '未通过',
  'result.skipped': '已跳过',
  'result.pass': '通过',
  'result.fail': '失败',
  'result.skip': '跳过',
  'result.victory': '胜利',
  'result.defeat': '失败',

  // ── Title Screen ──
  'title.gameName': '系统架构',
  'title.subtitle': '架构卡牌游戏',
  'title.startGame': '开始游戏',
  'title.scenario': '场景',
  'title.deploySlots': '部署栏位',
  'title.handSize': '手牌数',
  'title.discards': '弃牌次数',
  'title.initialPool': '初始卡池',
  'title.budget': '预算偏移',
  'title.repair': '修补次数',
  'title.discountTags': '折扣标签',

  // ── Blind Select ──
  'blindSelect.title': '选择盲注',
  'blindSelect.play': '开始',
  'blindSelect.skip': '跳过',
  'blindSelect.bossRule': 'Boss 规则',

  // ── Play Screen ──
  'play.deploySlots': '部署栏位',
  'play.slotsFull': '栏位已满 — 取消部署以替换',
  'play.hand': '手牌',
  'play.deck': '牌堆',
  'play.discards': '弃牌次数',
  'play.constraints': '约束',
  'play.domains': '领域',
  'play.needTags': '需要',
  'play.eachFail': '每项违规',
  'play.noneDetected': '暂无牌型',
  'play.confirmDiscard': '弃牌',
  'play.deploy': '出牌',
  'play.runPhase': '运行阶段',
  'play.penaltyLabel': '超额惩罚',

  // ── Deploy Zone ──
  'deploy.title': '部署区',
  'deploy.deployed': '已部署',
  'deploy.emptyHint': '点击下方组件进行部署',

  // ── Discard Zone ──
  'discard.title': '弃牌区',
  'discard.usesLeft': '次可用',
  'discard.dropHint': '拖到此处准备弃牌',
  'discard.dragHint': '将手牌拖到此处准备弃牌',

  // ── Hand Zone ──
  'hand.title': '手牌',
  'hand.cards': '张',
  'hand.emptyHint': '所有卡牌已部署或准备弃牌',

  // ── Score Panel ──
  'score.chips': '筹码',
  'score.base': '基础',
  'score.pattern': '牌型',
  'score.joker': 'Joker',
  'score.mult': '倍率',
  'score.penalty': '惩罚',
  'score.score': '得分',
  'score.target': '目标',
  'score.deployToPreview': '部署组件以预览得分',

  // ── Settlement ──
  'settlement.panel': '面板',
  'settlement.perf': '性能',
  'settlement.rel': '可靠',
  'settlement.cx': '复杂度',
  'settlement.chipsBreakdown': '筹码明细',
  'settlement.scoreFormula': '得分公式',
  'settlement.penalties': '惩罚',
  'settlement.constraint': '约束',
  'settlement.boss': 'Boss',
  'settlement.capacity': '容量',
  'settlement.componentsDeployed': '个组件已部署',
  'settlement.activeJokers': '激活的 Joker',
  'settlement.goldEarned': '金币收入',
  'settlement.triggeredPatterns': '触发的牌型',
  'settlement.superPatterns': '超级牌型',
  'settlement.continue': '继续',

  // ── Game Over ──
  'gameOver.phasesPassed': '个阶段通过',
  'gameOver.blind': '盲',
  'gameOver.playAgain': '再来一局',

  // ── Shop ──
  'shop.title': '商店',
  'shop.nextRound': '下一轮',
  'shop.jokersAndPacks': 'Joker & 牌包 出售中',
  'shop.pickOne': '选择一张塔罗牌',
  'shop.skipPack': '跳过',
  'shop.componentsForSale': '组件出售中',
  'shop.soldOut': '已售罄',
  'shop.yourInventory': '你的库存（点击出售）',
  'shop.sell': '出售',

  // ── Collection Screen ──
  'collection.title': '图鉴',
  'collection.back': '返回',
  'collection.tab.components': '组件',
  'collection.tab.jokers': 'Joker',
  'collection.tab.tarots': '塔罗',
  'collection.tab.packs': '卡包',
  'collection.tab.patterns': '牌型',
  'collection.packsHint': '在商店中购买卡包，打开后可从中选择一张塔罗牌',
  'collection.packCards': '可选',
  'collection.packCardsUnit': '张塔罗',
  'collection.effect': '效果',
  'collection.condition': '条件',
  'collection.cost': '费用',
  'collection.trigger': '触发',
  'collection.reward': '奖励',

  // ── Top Bar ──
  'topBar.noJokers': '暂无 Joker',

  // ── Component Card ──
  'card.cap': '容量',

  // ── Tarot Card ──
  'tarot.reveal': '揭示',
  'tarot.modify': '修改',

  // ── Run Info Popup ──
  'info.title': '规则说明',
  'info.scoringFormula': '计分公式',
  'info.scoringFormulaDesc': '得分 = round( 筹码 x 倍率 - 惩罚 )',
  'info.chipsFormula': '筹码 = 基础筹码 + 牌型筹码 + Joker 筹码',
  'info.chipsDesc': '每个组件有基础筹码。触发的牌型和 Joker 可增加额外筹码。',
  'info.multFormula': '倍率 = (1 + 牌型倍率 + Joker 倍率) x Joker 乘数',
  'info.multDesc': '牌型增加倍率；激活的 Joker 进一步乘算。',
  'info.domainsAndTags': '领域与标签',
  'info.domainsDesc': '每个组件属于一个领域（计算、数据、网络、防御、平台），并有 1-3 个标签（cache、db、queue、ha 等）。',
  'info.domainsHint': '不同的领域组合和标签组合会触发不同的牌型。',
  'info.patterns': '牌型（3 个层级）',
  'info.patternT1': 'T1 - 领域型：领域对（2 同域）、领域三条（3 同域）、广域（4+ 不同域）。几乎总能触发。',
  'info.patternT2': 'T2 - 主题型：读路径（cache+db）、写管道（queue+db）、可观测（monitor）等。中等难度。',
  'info.patternT3': 'T3 - 传奇型：CQRS（db+queue+cache）、零宕机（ha+deploy+monitor）、全栈（3+ 主题牌型）。高收益。',
  'info.constraints': '约束',
  'info.constraintsDesc': '每个阶段有可见约束（最低 P、最低 R、最高 CX、所需领域/标签）。每项不满足的约束会扣除侧边栏显示的固定惩罚。',
  'info.capacity': '容量',
  'info.capacityDesc': '每个组件消耗容量。超预算惩罚：',
  'info.capacityFormula': '惩罚 = (已用 - 预算) x 5',
  'info.discardAndDraw': '弃牌与抽牌',
  'info.discardMax': '每次最多弃 5 张牌',
  'info.discardChances': '每阶段 3 次弃牌机会（Joker 可增加）',
  'info.discardRemoved': '弃掉的牌在本阶段移除',
  'info.jokerEffects': 'Joker 效果',
  'info.jokerDesc': 'Joker 有多种效果：乘算得分、按标签加筹码、增强牌型、增加手牌/弃牌次数、赚取金币。查看每个 Joker 的描述了解详情。',
  'info.tarotEffects': '塔罗效果',
  'info.tarotDesc': '塔罗可修改组件：添加标签、增加筹码、改变领域、降低容量消耗。合理使用塔罗来触发你差一步达成的牌型。',
  'info.gameFlow': '游戏流程',
  'info.shop': '商店',
};

export function t(key: string): string {
  return zh[key] ?? key;
}

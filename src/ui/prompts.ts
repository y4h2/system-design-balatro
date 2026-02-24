import type { Component, School, Scenario, Joker, Tarot } from '../schemas/index.js';

// @inquirer/prompts is ESM-only, so we use dynamic import() for CJS compatibility.
async function loadInquirer() {
  return await import('@inquirer/prompts');
}

/**
 * Pick a school from available options.
 */
export async function promptSchoolSelection(schools: School[]): Promise<School> {
  const { select } = await loadInquirer();
  const answer = await select({
    message: '选择架构流派 (Choose School):',
    choices: schools.map(s => ({
      name: `${s.name} - ${s.desc}`,
      value: s,
    })),
  });
  return answer;
}

/**
 * Pick a scenario.
 */
export async function promptScenarioSelection(scenarios: Scenario[]): Promise<Scenario> {
  const { select } = await loadInquirer();
  const answer = await select({
    message: '选择场景 (Choose Scenario):',
    choices: scenarios.map(s => ({
      name: `${s.name} - ${s.desc}`,
      value: s,
    })),
  });
  return answer;
}

/**
 * Pick 1 component from draft choices.
 */
export async function promptDraftChoice(choices: Component[]): Promise<Component> {
  const { select } = await loadInquirer();
  const answer = await select({
    message: '选择一张组件 (Draft a component):',
    choices: choices.map(c => ({
      name: `${c.name} [${c.tags.join(',')}] perf:${c.delta.perf > 0 ? '+' : ''}${c.delta.perf} rel:${c.delta.rel > 0 ? '+' : ''}${c.delta.rel} cx:${c.delta.cx > 0 ? '+' : ''}${c.delta.cx} | 容量:${c.capacity_cost}`,
      value: c,
    })),
  });
  return answer;
}

/**
 * Choose which components to deploy from pool.
 */
export async function promptDeploySelection(pool: Component[], budget: number): Promise<Component[]> {
  const { checkbox } = await loadInquirer();
  const answer = await checkbox({
    message: `部署组件 (Deploy components, budget: ${budget}):`,
    choices: pool.map(c => ({
      name: `${c.name} [容量:${c.capacity_cost}] perf:${c.delta.perf} rel:${c.delta.rel} cx:${c.delta.cx}`,
      value: c,
    })),
  });
  return answer;
}

/**
 * Repair action after event.
 */
export async function promptRepairAction(
  pool: Component[],
  deployed: Component[],
): Promise<{ action: 'swap' | 'add' | 'skip'; component?: Component }> {
  const { select } = await loadInquirer();
  const action = await select({
    message: '修补动作 (Repair action):',
    choices: [
      { name: '替换组件 (Swap)', value: 'swap' as const },
      { name: '加入封堵组件 (Add defensive)', value: 'add' as const },
      { name: '不操作 (Skip)', value: 'skip' as const },
    ],
  });

  if (action === 'skip') return { action };

  const available = action === 'add'
    ? pool.filter(c => c.category === 'defensive' && !deployed.includes(c))
    : pool.filter(c => !deployed.includes(c));

  if (available.length === 0) return { action: 'skip' };

  const component = await select({
    message: '选择组件:',
    choices: available.map(c => ({
      name: `${c.name} [容量:${c.capacity_cost}]`,
      value: c,
    })),
  });

  return { action, component };
}

/**
 * Prompt the player to use a tarot card (or decline).
 * Returns the index of the chosen tarot, or null if the player declines.
 */
export async function promptUseTarot(tarots: Tarot[]): Promise<number | null> {
  const { select } = await loadInquirer();
  const choices = [
    ...tarots.map((t, i) => ({ name: `${t.name} - ${t.desc}`, value: i })),
    { name: '不使用塔罗 (Don\'t use tarot)', value: -1 },
  ];
  const result = await select({ message: '使用塔罗牌? (Use a Tarot card?)', choices });
  return result === -1 ? null : result;
}

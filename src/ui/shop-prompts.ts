import chalk from 'chalk';
import type { GameState } from '../engine/state.js';
import type { ShopInventory } from '../engine/shop.js';
import type { GameData } from '../data/loader.js';
import {
  buyComponent,
  sellComponent,
  buyJoker,
  sellJoker,
  buyTarot,
  removeComponent,
  getComponentBuyCost,
  getComponentSellValue,
  getJokerSellValue,
  getRemoveCost,
} from '../engine/shop.js';

async function loadInquirer() {
  return await import('@inquirer/prompts');
}

function renderShopStatus(state: GameState, inventory: ShopInventory): void {
  const DIVIDER = chalk.gray('-'.repeat(50));
  console.log(DIVIDER);
  console.log(chalk.bold.yellow(`  Shop  |  Gold: ${chalk.white(String(state.gold))}`));
  console.log(chalk.gray(`  Components in pool: ${state.componentPool.length}  |  Jokers: ${state.jokerSlots.length}/${state.jokerSlotMax}  |  Tarots: ${state.tarotHand.length}/${state.tarotHandMax}`));
  console.log(DIVIDER);

  if (inventory.components.length > 0) {
    console.log(chalk.cyan('  For sale - Components:'));
    for (const c of inventory.components) {
      console.log(`    ${c.name} [${c.tags.join(',')}] cost:${getComponentBuyCost(c)}g`);
    }
  }
  if (inventory.jokers.length > 0) {
    console.log(chalk.cyan('  For sale - Jokers:'));
    for (const j of inventory.jokers) {
      console.log(`    ${j.name} (x${j.multiplier}) cost:${j.shop_cost}g`);
    }
  }
  if (inventory.tarots.length > 0) {
    console.log(chalk.cyan('  For sale - Tarots:'));
    for (const t of inventory.tarots) {
      console.log(`    ${t.name} cost:${t.shop_cost}g`);
    }
  }
  console.log(DIVIDER);
}

type ShopAction = 'buy_component' | 'sell_component' | 'buy_joker' | 'sell_joker' | 'buy_tarot' | 'remove_component' | 'exit';

/**
 * Run an interactive shop phase where the player can buy/sell items.
 * Mutates state in place (gold, componentPool, jokerSlots, tarotHand).
 */
export async function runShopPhase(
  state: GameState,
  inventory: ShopInventory,
  _data: GameData,
): Promise<void> {
  const { select } = await loadInquirer();

  let shopping = true;
  while (shopping) {
    renderShopStatus(state, inventory);

    const choices: { name: string; value: ShopAction }[] = [];

    if (inventory.components.length > 0) {
      choices.push({ name: `Buy component (${inventory.components.length} available)`, value: 'buy_component' });
    }
    if (state.componentPool.length > 0) {
      choices.push({ name: `Sell component (${state.componentPool.length} in pool)`, value: 'sell_component' });
    }
    if (inventory.jokers.length > 0) {
      choices.push({ name: `Buy Joker (${inventory.jokers.length} available)`, value: 'buy_joker' });
    }
    if (state.jokerSlots.length > 0) {
      choices.push({ name: `Sell Joker (${state.jokerSlots.length} equipped)`, value: 'sell_joker' });
    }
    if (inventory.tarots.length > 0) {
      choices.push({ name: `Buy Tarot (${inventory.tarots.length} available)`, value: 'buy_tarot' });
    }
    if (state.componentPool.length > 0) {
      choices.push({ name: `Remove component (cost: ${getRemoveCost()}g)`, value: 'remove_component' });
    }
    choices.push({ name: chalk.gray('Exit shop'), value: 'exit' });

    const action = await select<ShopAction>({
      message: 'Shop action:',
      choices,
    });

    switch (action) {
      case 'buy_component': {
        const comp = await select({
          message: 'Choose component to buy:',
          choices: inventory.components.map(c => ({
            name: `${c.name} [${c.tags.join(',')}] perf:${c.delta.perf} rel:${c.delta.rel} cx:${c.delta.cx} | cost: ${getComponentBuyCost(c)}g`,
            value: c,
          })),
        });
        const result = buyComponent(state, comp);
        console.log(chalk.white(`  ${result.message}`));
        if (result.success) {
          // Remove from shop inventory
          const idx = inventory.components.findIndex(c => c.id === comp.id);
          if (idx !== -1) inventory.components.splice(idx, 1);
        }
        break;
      }

      case 'sell_component': {
        const comp = await select({
          message: 'Choose component to sell:',
          choices: state.componentPool.map(c => ({
            name: `${c.name} [${c.tags.join(',')}] | sell value: ${getComponentSellValue(c)}g`,
            value: c,
          })),
        });
        const result = sellComponent(state, comp);
        console.log(chalk.white(`  ${result.message}`));
        break;
      }

      case 'buy_joker': {
        const joker = await select({
          message: 'Choose Joker to buy:',
          choices: inventory.jokers.map(j => ({
            name: `${j.name} (x${j.multiplier}) - ${j.desc} | cost: ${j.shop_cost}g`,
            value: j,
          })),
        });
        const result = buyJoker(state, joker);
        console.log(chalk.white(`  ${result.message}`));
        if (result.success) {
          const idx = inventory.jokers.findIndex(j => j.id === joker.id);
          if (idx !== -1) inventory.jokers.splice(idx, 1);
        }
        break;
      }

      case 'sell_joker': {
        const joker = await select({
          message: 'Choose Joker to sell:',
          choices: state.jokerSlots.map(j => ({
            name: `${j.name} (x${j.multiplier}) | sell value: ${getJokerSellValue(j)}g`,
            value: j,
          })),
        });
        const result = sellJoker(state, joker);
        console.log(chalk.white(`  ${result.message}`));
        break;
      }

      case 'buy_tarot': {
        const tarot = await select({
          message: 'Choose Tarot to buy:',
          choices: inventory.tarots.map(t => ({
            name: `${t.name} - ${t.desc} | cost: ${t.shop_cost}g`,
            value: t,
          })),
        });
        const result = buyTarot(state, tarot);
        console.log(chalk.white(`  ${result.message}`));
        if (result.success) {
          const idx = inventory.tarots.findIndex(t => t.id === tarot.id);
          if (idx !== -1) inventory.tarots.splice(idx, 1);
        }
        break;
      }

      case 'remove_component': {
        const comp = await select({
          message: `Choose component to remove (cost: ${getRemoveCost()}g):`,
          choices: state.componentPool.map(c => ({
            name: `${c.name} [${c.tags.join(',')}]`,
            value: c,
          })),
        });
        const result = removeComponent(state, comp);
        console.log(chalk.white(`  ${result.message}`));
        break;
      }

      case 'exit':
        shopping = false;
        break;
    }
  }

  console.log(chalk.gray('\n  Leaving shop...\n'));
}

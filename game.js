export const CREW = [
  {
    name: "Клод",
    business: "Рэкет",
    era: "3D · GTA III",
    cost: 50,
    rate: 2,
    image: "assets/crew-1.webp",
    description: "У Клода крошечный гараж и весь квартал в знакомых. С его конторы начинается семейный рэкет."
  },
  {
    name: "Томми Версетти",
    business: "Эскорт",
    era: "3D · Vice City",
    cost: 250,
    rate: 9,
    image: "assets/crew-2.webp",
    description: "Когда лимузины Томми выходят на набережную, даже ночной диджей ставит их песню. Он ведёт семейный конвой."
  },
  {
    name: "Карл Джонсон",
    business: "Таблетки",
    era: "3D · San Andreas",
    cost: 1250,
    rate: 40,
    image: "assets/crew-3.webp",
    description: "Карл унаследовал аптеку с вечной вывеской «Открыто». В семейной книге её знают под именем «Таблетки»."
  },
  {
    name: "Нико Беллик",
    business: "Оружие",
    era: "HD · GTA IV",
    cost: 6250,
    rate: 180,
    image: "assets/crew-4.webp",
    description: "Нико держит оружейную лавку на старой верфи. Над прилавком висит портрет деда в парадном костюме."
  },
  {
    name: "Франклин Клинтон",
    business: "Ночной клуб",
    era: "HD · GTA V",
    cost: 31250,
    rate: 800,
    image: "assets/crew-5.webp",
    description: "Франклин сам встречает гостей своего клуба. Ровно в полночь весь танцпол поёт вместе с ним."
  },
  {
    name: "Люсия Каминос",
    business: "Казино",
    era: "HD · GTA VI",
    cost: 156250,
    rate: 3600,
    image: "assets/crew-6.webp",
    description: "За стеклом казино Люсии видны огни всех шести районов. Первый жетон заведения она подарила Клоду."
  }
];

const SAVE_KEY = "neon-coast-save";
const STARTING_INCOME = 1;
const BANK_STAKE = 1_000_000;
const OFFLINE_LIMIT_SECONDS = 4 * 60 * 60;

export function createGame(now = Date.now()) {
  return { cash: 50, totalEarned: 0, levels: CREW.map(() => 0), savedAt: now, contract: freshContract(1, 1) };
}

export function incomeRate(state) {
  return STARTING_INCOME + CREW.reduce((sum, member, i) => {
    const level = Number.isInteger(state?.levels?.[i]) && state.levels[i] > 0 ? state.levels[i] : 0;
    return sum + member.rate * level;
  }, 0);
}

export function nextCost(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= CREW.length) return Infinity;
  const level = Number.isInteger(state?.levels?.[index]) && state.levels[index] > 0 ? state.levels[index] : 0;
  if (level === 0) return CREW[index].cost;
  return Math.ceil(0.6 * CREW[index].cost * Math.pow(1.18, level - 1));
}

export function purchase(state, index) {
  if (!state || !Array.isArray(state.levels) || index < 0 || index >= CREW.length || !Number.isInteger(index)) return false;
  if (index > 0 && !(state.levels[index - 1] > 0)) return false;
  const cost = nextCost(state, index);
  if (!Number.isFinite(state.cash) || state.cash < cost) return false;
  state.cash -= cost;
  state.levels[index] = (Number.isInteger(state.levels[index]) && state.levels[index] > 0 ? state.levels[index] : 0) + 1;
  return true;
}

const ORDERS = [
  ["Ключи от квартала", "Развезите приглашения на семейный ужин.", "Соберите вечернюю выручку района."],
  ["Парад на бульваре", "Доставьте пропуска участникам парада.", "Соберите выручку праздничной смены."],
  ["Ночь посвящения", "Передайте памятные жетоны команде.", "Соберите выручку ночной смены."],
  ["День основателя", "Развезите фотографии для выставки семьи.", "Соберите выручку юбилейного вечера."]
];

function freshContract(number, rate) {
  return { number, rate, selectedRoute: "active", stops: 0, receipts: 0 };
}

function validContract(order) {
  return order && Number.isSafeInteger(order.number) && order.number >= 1 &&
    Number.isFinite(order.rate) && order.rate >= 1 &&
    ["active", "idle"].includes(order.selectedRoute) &&
    Number.isSafeInteger(order.stops) && order.stops >= 0 &&
    Number.isFinite(order.receipts) && order.receipts >= 0 &&
    (order.baseLevels === undefined || (Array.isArray(order.baseLevels) && order.baseLevels.length === CREW.length &&
      order.baseLevels.every(level => Number.isSafeInteger(level) && level >= 0) &&
      Number.isFinite(order.reserve) && order.reserve >= 0));
}

function issueContract(state, number) {
  const order = freshContract(number, incomeRate(state));
  order.baseLevels = [...state.levels];
  order.reserve = Math.floor(state.cash) + order.rate * 30;
  return order;
}

function districtContract(state, order) {
  const phase = (order.number - 2) % 4;
  const next = order.baseLevels.findIndex(level => level === 0);
  const owned = next < 0 ? CREW.length : next;
  const focus = Math.max(0, owned - 1);
  const level = order.baseLevels[focus] + 1;
  const targetRate = order.rate + CREW[focus].rate;
  const upgrade = { label: "Модернизация", description: `Поднимите «${CREW[focus].business}» до уровня ${level}.`,
    progress: state.levels[focus], target: level, unit: "ур." };
  const revenue = { label: "Оборот", description: "Накопите выручку от открытых дел за время заказа.",
    progress: Math.floor(order.receipts), target: order.rate * (25 + 5 * phase), unit: "$" };
  const hiring = next < 0 ? upgrade : { label: "Новый владелец", description: `Откройте дело «${CREW[next].business}».`,
    progress: state.levels.filter(value => value > 0).length, target: owned + 1, unit: "дел" };
  const growth = { label: "Рост дохода", description: "Увеличьте общий доход в секунду с помощью найма или улучшений.",
    progress: incomeRate(state), target: targetRate, unit: "$/с" };
  const savings = { label: "Резерв", description: "Сохраните указанную сумму в кассе к моменту выплаты.",
    progress: Math.floor(state.cash), target: order.reserve, unit: "$" };
  const plans = [
    ["Инвестиции в квартал", upgrade, savings],
    [next < 0 ? "Большая сеть" : "Расширение сети", hiring, revenue],
    ["Совет владельцев", growth, savings],
    ["Итоги сезона", revenue, upgrade]
  ];
  const [title, first, second] = plans[phase];
  const routes = [first, second].map((goal, i) => ({
    ...goal, progress: Math.min(goal.progress, goal.target), id: i === 0 ? "active" : "idle",
    reward: Math.ceil(order.rate * (i === 0 ? 20 : 14))
  }));
  const route = routes.find(item => item.id === order.selectedRoute);
  return { ...route, title, number: order.number, routes, selectedRoute: route.id, ready: route.progress >= route.target };
}

export function getContract(state) {
  const order = state.contract ?? freshContract(1, 1);
  if (order.number === 1) {
    const ready = state.levels[0] > 0;
    return { number: 1, title: "Первый квартал", description: "Наймите Клода и откройте дело «Рэкет».",
      unit: "дел", progress: Number(ready), target: 1, reward: 35, ready, routes: [], selectedRoute: null };
  }
  if (order.baseLevels) return districtContract(state, order);
  // Finish the running order from an older save before issuing new objectives.
  const index = (order.number - 2) % ORDERS.length;
  const [title, activeText, idleText] = ORDERS[index];
  const duration = 25 + index * 5;
  const routes = [
    { id: "active", label: "Доставка", unit: "шт.", description: activeText, target: 8 + index * 2,
      progress: order.stops, reward: Math.ceil(order.rate * 14) },
    { id: "idle", label: "Выручка", unit: "$", description: idleText, target: order.rate * duration,
      progress: Math.floor(order.receipts), reward: Math.ceil(order.rate * 20) }
  ];
  const route = routes.find(item => item.id === order.selectedRoute) ?? routes[0];
  return { ...route, title, number: order.number, selectedRoute: route.id, routes,
    progress: Math.min(route.progress, route.target), ready: route.progress >= route.target };
}

export function selectContractRoute(state, id) {
  if (!state.contract || state.contract.number < 2 || !["active", "idle"].includes(id)) return false;
  state.contract.selectedRoute = id;
  return true;
}

export function claimContract(state) {
  const order = getContract(state);
  if (!order.ready) return 0;
  state.cash += order.reward;
  state.totalEarned += order.reward;
  state.contract = issueContract(state, order.number + 1);
  return order.reward;
}

export function collectValue(state) {
  return 5 + Math.floor((incomeRate(state) - STARTING_INCOME) / 2);
}

export function collect(state) {
  if (!state || !Number.isFinite(state.cash) || !Number.isFinite(state.totalEarned)) return 0;
  const earned = collectValue(state);
  state.cash += earned;
  state.totalEarned += earned;
  if (state.contract?.number > 1) state.contract.stops += 1;
  return earned;
}

export function tick(state, seconds) {
  if (!state || !Number.isFinite(state.cash) || !Number.isFinite(state.totalEarned) || !Number.isFinite(seconds) || seconds <= 0) return 0;
  const earned = incomeRate(state) * seconds;
  if (state.contract?.number > 1) state.contract.receipts += earned;
  state.cash += earned;
  state.totalEarned += earned;
  return earned;
}

function previousBankResult(state) {
  const result = state?.bank;
  if (!result || !Number.isSafeInteger(result.round) || result.round < 1 || typeof result.won !== "boolean") return null;
  const payout = result.won ? BANK_STAKE * 2 : 0;
  return { round: result.round, won: result.won, stake: BANK_STAKE, payout, net: payout - BANK_STAKE };
}

export function getBank(state) {
  const lastResult = previousBankResult(state);
  const unlocked = state?.levels?.length === CREW.length && state.levels.every(level => level > 0);
  return { unlocked, canPlay: unlocked && state.cash >= BANK_STAKE, stake: BANK_STAKE,
    payout: BANK_STAKE * 2, lastResult, round: lastResult?.round ?? 0 };
}

export function playBank(state, expectedRound) {
  const bank = getBank(state);
  if (!bank.canPlay || expectedRound !== bank.round) return null;
  const won = Math.random() < 0.5;
  const payout = won ? bank.payout : 0;
  const result = { won, round: bank.round + 1, stake: bank.stake, payout, net: payout - bank.stake };
  const updated = { ...state, bank: result, cash: state.cash + result.net,
    totalEarned: state.totalEarned + Math.max(0, result.net) };
  if (!saveGame(updated, Date.now(), expectedRound)) return null;
  Object.assign(state, updated);
  return result;
}

function isValidSave(value) {
  return value && typeof value === "object" &&
    Number.isFinite(value.cash) && value.cash >= 0 &&
    Number.isFinite(value.totalEarned) && value.totalEarned >= 0 &&
    Array.isArray(value.levels) && value.levels.length === CREW.length &&
    value.levels.every(level => Number.isInteger(level) && level >= 0) &&
    Number.isFinite(value.savedAt) && value.savedAt >= 0;
}

export function saveGame(state, now = Date.now(), expectedBankRound) {
  try {
    if (typeof localStorage === "undefined" || !isValidSave(state) || !Number.isFinite(now)) return false;
    const raw = localStorage.getItem(SAVE_KEY);
    let storedRound = 0;
    if (raw) {
      try { storedRound = previousBankResult(JSON.parse(raw))?.round ?? 0; }
      catch { /* Replace an unreadable save with the current valid state. */ }
    }
    if (expectedBankRound !== undefined && storedRound !== expectedBankRound) return false;
    if (storedRound > (previousBankResult(state)?.round ?? 0)) return false;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: now }));
    state.savedAt = now;
    return true;
  } catch {
    return false;
  }
}

export function loadGame(now = Date.now()) {
  const fallback = { state: createGame(now), offlineEarned: 0 };
  try {
    if (typeof localStorage === "undefined") return fallback;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    if (!isValidSave(saved)) return fallback;
    const levels = [...saved.levels];
    for (let i = 1; i < levels.length; i++) {
      if (levels[i - 1] === 0) levels[i] = 0;
    }
    const state = { bank: previousBankResult(saved), cash: saved.cash, totalEarned: saved.totalEarned, levels, contract: validContract(saved.contract) ? saved.contract : freshContract(1, 1), savedAt: saved.savedAt };
    const elapsed = Math.max(0, Math.min(OFFLINE_LIMIT_SECONDS, (now - saved.savedAt) / 1000));
    const offlineEarned = tick(state, elapsed);
    state.savedAt = now;
    return { state, offlineEarned };
  } catch {
    return fallback;
  }
}

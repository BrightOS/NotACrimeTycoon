export const CREW = [
  {
    name: "Майло Фокс",
    business: "Видеопрокат",
    era: "Поколение 01",
    cost: 50,
    rate: 2,
    image: "assets/crew-1.webp",
    description: "Хранит редкие кассеты и знает, что любят ночные зрители."
  },
  {
    name: "Вера Вольт",
    business: "Роллердром",
    era: "Поколение 02",
    cost: 250,
    rate: 9,
    image: "assets/crew-2.webp",
    description: "Превращает каждый круг по неоновому треку в прибыль."
  },
  {
    name: "Леон Рейес",
    business: "Автомойка",
    era: "Поколение 03",
    cost: 1250,
    rate: 40,
    image: "assets/crew-3.webp",
    description: "Держит мойку открытой до рассвета и клиентов в движении."
  },
  {
    name: "Ника Грей",
    business: "Радиостудия",
    era: "Поколение 04",
    cost: 6250,
    rate: 180,
    image: "assets/crew-4.webp",
    description: "Ставить правильный бит в эфир — её особый талант."
  },
  {
    name: "Реми Кросс",
    business: "Отель",
    era: "Поколение 05",
    cost: 31250,
    rate: 800,
    image: "assets/crew-5.webp",
    description: "Умеет заполнить каждый номер и сохранить гостям анонимность."
  },
  {
    name: "Сола Вейл",
    business: "Ночной рынок",
    era: "Поколение 06",
    cost: 156250,
    rate: 3600,
    image: "assets/crew-6.webp",
    description: "Собирает торговцев и покупателей под одним сияющим небом."
  }
];

const SAVE_KEY = "neon-coast-save";
const STARTING_INCOME = 1;
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
  ["Премьера на пирсе", "Развезите кассеты по летним кинотеатрам.", "Соберите выручку за ночные сеансы."],
  ["Роллер-диско", "Передайте приглашения на набережной.", "Соберите выручку за вечерний прокат."],
  ["Радиомарафон", "Доставьте пластинки в студию.", "Соберите выручку от ночного эфира."],
  ["Огни ночного рынка", "Развезите заказы по торговым рядам.", "Соберите выручку за вечернюю ярмарку."]
];

function freshContract(number, rate) {
  return { number, rate, selectedRoute: "active", stops: 0, receipts: 0 };
}

function validContract(order) {
  return order && Number.isSafeInteger(order.number) && order.number >= 1 &&
    Number.isFinite(order.rate) && order.rate >= 1 &&
    ["active", "idle"].includes(order.selectedRoute) &&
    Number.isSafeInteger(order.stops) && order.stops >= 0 &&
    Number.isFinite(order.receipts) && order.receipts >= 0;
}

export function getContract(state) {
  const order = state.contract ?? freshContract(1, 1);
  if (order.number === 1) {
    const ready = state.levels[0] > 0;
    return { number: 1, title: "Первый сеанс", description: "Откройте видеопрокат Майло Фокса.",
      progress: Number(ready), target: 1, reward: 35, ready, routes: [], selectedRoute: null };
  }
  const index = (order.number - 2) % ORDERS.length;
  const [title, activeText, idleText] = ORDERS[index];
  const duration = 25 + index * 5;
  const routes = [
    { id: "active", label: "Доставка", description: activeText, target: 8 + index * 2,
      progress: order.stops, reward: Math.ceil(order.rate * 14) },
    { id: "idle", label: "Выручка", description: idleText, target: order.rate * duration,
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
  state.contract = freshContract(order.number + 1, incomeRate(state));
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

function isValidSave(value) {
  return value && typeof value === "object" &&
    Number.isFinite(value.cash) && value.cash >= 0 &&
    Number.isFinite(value.totalEarned) && value.totalEarned >= 0 &&
    Array.isArray(value.levels) && value.levels.length === CREW.length &&
    value.levels.every(level => Number.isInteger(level) && level >= 0) &&
    Number.isFinite(value.savedAt) && value.savedAt >= 0;
}

export function saveGame(state, now = Date.now()) {
  try {
    if (typeof localStorage === "undefined" || !isValidSave(state) || !Number.isFinite(now)) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: now }));
    state.savedAt = now;
  } catch {
    // Storage can be disabled, full, or unavailable in restricted browser contexts.
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
    const state = { cash: saved.cash, totalEarned: saved.totalEarned, levels, contract: validContract(saved.contract) ? saved.contract : freshContract(1, 1), savedAt: saved.savedAt };
    const elapsed = Math.max(0, Math.min(OFFLINE_LIMIT_SECONDS, (now - saved.savedAt) / 1000));
    const offlineEarned = tick(state, elapsed);
    state.savedAt = now;
    return { state, offlineEarned };
  } catch {
    return fallback;
  }
}

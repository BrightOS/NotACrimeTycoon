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
  return { cash: 50, totalEarned: 0, levels: CREW.map(() => 0), savedAt: now };
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

export function collect(state) {
  if (!state || !Number.isFinite(state.cash) || !Number.isFinite(state.totalEarned)) return 0;
  state.cash += 5;
  state.totalEarned += 5;
  return 5;
}

export function tick(state, seconds) {
  if (!state || !Number.isFinite(state.cash) || !Number.isFinite(state.totalEarned) || !Number.isFinite(seconds) || seconds <= 0) return 0;
  const earned = incomeRate(state) * seconds;
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
    const state = { cash: saved.cash, totalEarned: saved.totalEarned, levels, savedAt: saved.savedAt };
    const elapsed = Math.max(0, Math.min(OFFLINE_LIMIT_SECONDS, (now - saved.savedAt) / 1000));
    const offlineEarned = tick(state, elapsed);
    state.savedAt = now;
    return { state, offlineEarned };
  } catch {
    return fallback;
  }
}

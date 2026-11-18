import { CREW, incomeRate, nextCost, purchase, collect, tick, saveGame, loadGame } from "./game.js";

const $ = (selector, root = document) => root.querySelector(selector);
const cashNode = $("#cash");
const incomeNode = $("#income");
const recordNode = $("#record");
const generationNode = $("#generation");
const progressNode = $("#generation-progress");
const detailNode = $("#generation-detail");
const collectButton = $("#collect");
const collectAmount = $("#collect-amount");
const businessesNode = $("#businesses");
const toast = $("#offline-toast");
const statusNode = $("#game-status");

const now = Date.now();
const loaded = loadGame(now);
const state = loaded.state;
const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const exactMoney = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
let lastTick = now;
let lastSave = now;

function format(value) {
  return money.format(Math.floor(Math.max(0, value)));
}

function buildCards() {
  if (!businessesNode) return;
  businessesNode.replaceChildren();
  CREW.forEach((member, index) => {
    const card = document.createElement("article");
    card.className = "business-card";
    card.dataset.index = String(index);

    const art = document.createElement("div");
    art.className = "business-art";
    const img = document.createElement("img");
    img.src = member.image;
    img.alt = `${member.name} — ${member.business}`;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.remove();
      art.classList.add("has-no-image");
      art.setAttribute("aria-label", `${member.business}: портрет скоро появится`);
    }, { once: true });
    art.append(img);
    const level = document.createElement("span");
    level.className = "business-level";
    art.append(level);

    const body = document.createElement("div");
    body.className = "business-body";
    const name = document.createElement("h3");
    name.className = "business-name";
    name.textContent = member.business;
    const owner = document.createElement("p");
    owner.className = "business-owner";
    owner.textContent = `${member.name} · ${member.era}`;
    const income = document.createElement("p");
    income.className = "business-income";
    const description = document.createElement("p");
    description.className = "business-description";
    description.textContent = member.description;
    const action = document.createElement("button");
    action.className = "business-action";
    action.type = "button";
    action.dataset.buy = String(index);
    const actionText = document.createElement("span");
    actionText.className = "business-action-text";
    const price = document.createElement("span");
    price.className = "business-price";
    action.append(actionText, price);
    body.append(name, owner, income, description, action);
    card.append(art, body);
    businessesNode.append(card);
  });
}

function render() {
  const rate = incomeRate(state);
  if (cashNode) cashNode.textContent = `${format(state.cash)} $`;
  if (incomeNode) incomeNode.textContent = `${exactMoney.format(rate)} $ / сек`;
  if (recordNode) recordNode.textContent = `${format(state.totalEarned)} $`;
  if (collectAmount) collectAmount.textContent = "+5";

  const nextIndex = state.levels.findIndex((level, index) => level === 0 && (index === 0 || state.levels[index - 1] > 0));
  const activeIndex = nextIndex < 0 ? CREW.length - 1 : nextIndex;
  if (generationNode) generationNode.textContent = nextIndex < 0 ? "Все поколения открыты" : `Поколение ${activeIndex + 1} из ${CREW.length}`;
  if (progressNode) {
    const cost = nextCost(state, activeIndex);
    const percent = nextIndex < 0 ? 100 : Math.min(100, Math.max(0, state.cash / cost * 100));
    if (progressNode.tagName === "PROGRESS") progressNode.value = percent;
    else progressNode.style.width = `${percent}%`;
    progressNode.setAttribute("aria-valuenow", String(Math.round(percent)));
  }
  if (detailNode) {
    detailNode.textContent = nextIndex < 0
      ? "Команда открыла весь Ночной берег"
      : `До открытия: ${format(Math.max(0, nextCost(state, activeIndex) - state.cash))} $ из ${format(nextCost(state, activeIndex))} $`;
  }

  if (businessesNode) CREW.forEach((member, index) => {
    const card = businessesNode.querySelector(`[data-index="${index}"]`);
    if (!card) return;
    const level = state.levels[index] || 0;
    const locked = index > 0 && state.levels[index - 1] < 1;
    const cost = nextCost(state, index);
    const button = $(".business-action", card);
    const levelNode = $(".business-level", card);
    const income = $(".business-income", card);
    const price = $(".business-price", card);
    const actionText = $(".business-action-text", card);
    if (levelNode) levelNode.textContent = level ? `Ур. ${level}` : "Новое дело";
    if (income) income.textContent = `$${format(member.rate * level)}/с · +$${format(member.rate)}/с за уровень`;
    card.classList.toggle("is-locked", locked);
    card.dataset.locked = String(locked);
    if (button) {
      button.disabled = locked || state.cash < cost;
      const lockReason = locked ? `Сначала наймите ${CREW[index - 1].name}` : "";
      button.setAttribute("aria-label", locked ? `Закрыто. ${lockReason}` : `${level ? "Улучшить" : "Нанять"} ${member.name} за ${format(cost)} $`);
      button.title = lockReason;
      if (actionText) actionText.textContent = locked ? "Закрыто" : level ? "Улучшить" : "Нанять";
      if (price) price.textContent = `${format(cost)} $`;
    }
  });
}

function say(message) {
  if (statusNode) statusNode.textContent = message;
}

function settle(timestamp = Date.now()) {
  const elapsed = Math.max(0, (timestamp - lastTick) / 1000);
  lastTick = timestamp;
  if (elapsed > 0) tick(state, elapsed);
}

function hideToast() {
  if (toast) toast.hidden = true;
}

buildCards();
render();
if (loaded.offlineEarned > 0 && toast) {
  const title = $("#offline-title");
  const text = $("#offline-text");
  if (title) title.textContent = "Пока вас не было";
  if (text) text.textContent = `Команда заработала ${format(loaded.offlineEarned)} $ за время вашего отсутствия.`;
  toast.hidden = false;
}

if (businessesNode) businessesNode.addEventListener("click", event => {
  const button = event.target.closest("button[data-buy]");
  if (!button || button.disabled) return;
  settle();
  const index = Number(button.dataset.buy);
  if (purchase(state, index)) {
    render();
    say(`${CREW[index].name} теперь в команде. Дело: ${state.levels[index]} ур.`);
    saveGame(state, Date.now());
    lastSave = Date.now();
  } else {
    say("Недостаточно средств или сначала нужно открыть предыдущее поколение.");
  }
});

if (collectButton) collectButton.addEventListener("click", () => {
  settle();
  const earned = collect(state);
  render();
  say(`В кассу добавлено ${format(earned)} $.`);
  const timestamp = Date.now();
  saveGame(state, timestamp);
  lastSave = timestamp;
});

if (toast) toast.addEventListener("click", event => {
  if (event.target.closest("#offline-close")) hideToast();
});

window.setInterval(() => {
  const timestamp = Date.now();
  settle(timestamp);
  render();
  if (timestamp - lastSave >= 5000) {
    saveGame(state, timestamp);
    lastSave = timestamp;
  }
}, 1000);

window.addEventListener("pagehide", () => {
  const timestamp = Date.now();
  settle(timestamp);
  saveGame(state, timestamp);
});

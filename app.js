const STORAGE_KEY = "personal-ledger-v1";

const defaultCategories = {
  expense: [
    "餐饮",
    "早餐",
    "午餐",
    "晚餐",
    "外卖",
    "咖啡饮品",
    "零食水果",
    "消费",
    "日常消费",
    "购物消费",
    "服饰鞋包",
    "数码电器",
    "打车",
    "公共交通",
    "加油停车",
    "房租房贷",
    "水电燃气",
    "通讯网费",
    "医疗药品",
    "学习培训",
    "娱乐社交",
    "旅行",
    "人情礼物",
    "保险",
    "其他",
  ],
  income: ["工资", "奖金", "副业", "投资收益", "报销", "退款", "红包礼金", "其他"],
};

const chartColors = ["#0f8b6f", "#d08a21", "#4a78a8", "#b83b44", "#7a6aa8", "#298f99", "#8a6b3f", "#58786d"];

let state = loadState();

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  monthIncome: document.querySelector("#monthIncome"),
  monthExpense: document.querySelector("#monthExpense"),
  monthBalance: document.querySelector("#monthBalance"),
  monthCount: document.querySelector("#monthCount"),
  navTabs: document.querySelectorAll(".nav-tab"),
  views: {
    records: document.querySelector("#recordsView"),
    analytics: document.querySelector("#analyticsView"),
    settings: document.querySelector("#settingsView"),
  },
  entryTitle: document.querySelector("#entryTitle"),
  entryForm: document.querySelector("#entryForm"),
  editingId: document.querySelector("#editingId"),
  amountInput: document.querySelector("#amountInput"),
  dateInput: document.querySelector("#dateInput"),
  categoryInput: document.querySelector("#categoryInput"),
  accountInput: document.querySelector("#accountInput"),
  noteInput: document.querySelector("#noteInput"),
  submitBtn: document.querySelector("#submitBtn"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  monthFilter: document.querySelector("#monthFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  searchInput: document.querySelector("#searchInput"),
  clearFiltersBtn: document.querySelector("#clearFiltersBtn"),
  recordsList: document.querySelector("#recordsList"),
  categoryChart: document.querySelector("#categoryChart"),
  trendChart: document.querySelector("#trendChart"),
  categoryLegend: document.querySelector("#categoryLegend"),
  categoryChartHint: document.querySelector("#categoryChartHint"),
  trendChartHint: document.querySelector("#trendChartHint"),
  categoryForm: document.querySelector("#categoryForm"),
  newCategoryType: document.querySelector("#newCategoryType"),
  newCategoryName: document.querySelector("#newCategoryName"),
  expenseCategoryList: document.querySelector("#expenseCategoryList"),
  incomeCategoryList: document.querySelector("#incomeCategoryList"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  importJsonInput: document.querySelector("#importJsonInput"),
  currencySelect: document.querySelector("#currencySelect"),
  clearDataBtn: document.querySelector("#clearDataBtn"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.records)) {
      return {
        records: parsed.records,
        categories: {
          expense: mergeCategories(parsed.categories?.expense, defaultCategories.expense),
          income: mergeCategories(parsed.categories?.income, defaultCategories.income),
        },
        currency: parsed.currency || "CNY",
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    records: [],
    categories: cloneCategories(defaultCategories),
    currency: "CNY",
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mergeCategories(savedCategories, templateCategories) {
  const saved = Array.isArray(savedCategories) ? savedCategories : [];
  return [...new Set([...templateCategories, ...saved])];
}

function cloneCategories(categories) {
  return {
    expense: [...categories.expense],
    income: [...categories.income],
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: state.currency,
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

function getSelectedType() {
  return document.querySelector("input[name='type']:checked").value;
}

function setSelectedType(type) {
  document.querySelector(`input[name='type'][value="${type}"]`).checked = true;
  renderCategorySelect();
}

function matchesActiveMonth(record) {
  return record.date.slice(0, 7) === els.monthFilter.value;
}

function filteredRecords() {
  const month = els.monthFilter.value;
  const type = els.typeFilter.value;
  const category = els.categoryFilter.value;
  const query = els.searchInput.value.trim().toLowerCase();

  return state.records
    .filter((record) => !month || record.date.slice(0, 7) === month)
    .filter((record) => type === "all" || record.type === type)
    .filter((record) => category === "all" || record.category === category)
    .filter((record) => {
      if (!query) return true;
      return [record.note, record.account, record.category].some((value) => String(value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function renderCategorySelect() {
  const type = getSelectedType();
  els.categoryInput.innerHTML = state.categories[type].map((category) => `<option>${escapeHtml(category)}</option>`).join("");
}

function renderCategoryFilter() {
  const allCategories = [...new Set([...state.categories.expense, ...state.categories.income])];
  const current = els.categoryFilter.value || "all";
  els.categoryFilter.innerHTML = `<option value="all">全部</option>${allCategories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}`;
  els.categoryFilter.value = allCategories.includes(current) ? current : "all";
}

function renderSummary() {
  const monthRecords = state.records.filter((record) => matchesActiveMonth(record));
  const income = sumByType(monthRecords, "income");
  const expense = sumByType(monthRecords, "expense");

  els.monthIncome.textContent = formatMoney(income);
  els.monthExpense.textContent = formatMoney(expense);
  els.monthBalance.textContent = formatMoney(income - expense);
  els.monthCount.textContent = String(monthRecords.length);
}

function renderRecords() {
  const records = filteredRecords();

  if (!records.length) {
    els.recordsList.innerHTML = `<div class="empty-state">暂无流水</div>`;
    return;
  }

  els.recordsList.innerHTML = records
    .map((record) => {
      const sign = record.type === "income" ? "+" : "-";
      const amountClass = record.type === "income" ? "amount-income" : "amount-expense";
      const note = record.note ? ` · ${escapeHtml(record.note)}` : "";

      return `
        <article class="record-item">
          <div class="record-main">
            <div class="record-title">
              <strong>${escapeHtml(record.category)}</strong>
              <span class="tag">${record.type === "income" ? "收入" : "支出"}</span>
            </div>
            <div class="record-meta">${escapeHtml(record.date)} · ${escapeHtml(record.account)}${note}</div>
          </div>
          <div class="record-amount">
            <strong class="${amountClass}">${sign}${formatMoney(record.amount)}</strong>
            <div class="row-actions">
              <button class="icon-button" type="button" title="编辑" aria-label="编辑" data-action="edit" data-id="${record.id}">改</button>
              <button class="icon-button" type="button" title="删除" aria-label="删除" data-action="delete" data-id="${record.id}">删</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCharts() {
  const monthRecords = state.records.filter((record) => matchesActiveMonth(record));
  drawCategoryChart(monthRecords.filter((record) => record.type === "expense"));
  drawTrendChart(monthRecords);
}

function drawCategoryChart(records) {
  const canvas = els.categoryChart;
  const ctx = setupCanvas(canvas);
  const totals = groupTotals(records, "category");
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  els.categoryChartHint.textContent = total ? formatMoney(total) : "";
  els.categoryLegend.innerHTML = "";

  if (!total) {
    drawEmptyChart(ctx, canvas, "暂无支出");
    return;
  }

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;
  let start = -Math.PI / 2;

  entries.forEach(([label, value], index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = chartColors[index % chartColors.length];
    ctx.fill();
    start += angle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#182320";
  ctx.font = "700 20px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatMoney(total), cx, cy);

  els.categoryLegend.innerHTML = entries
    .map(([label, value], index) => {
      const color = chartColors[index % chartColors.length];
      return `
        <span class="legend-item">
          <span class="legend-swatch" style="background:${color}"></span>
          ${escapeHtml(label)} ${Math.round((value / total) * 100)}%
        </span>
      `;
    })
    .join("");
}

function drawTrendChart(records) {
  const canvas = els.trendChart;
  const ctx = setupCanvas(canvas);
  const days = daysInMonth(els.monthFilter.value);
  const incomeByDay = new Array(days).fill(0);
  const expenseByDay = new Array(days).fill(0);

  records.forEach((record) => {
    const day = Number(record.date.slice(8, 10)) - 1;
    if (record.type === "income") incomeByDay[day] += record.amount;
    if (record.type === "expense") expenseByDay[day] += record.amount;
  });

  const max = Math.max(...incomeByDay, ...expenseByDay, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  els.trendChartHint.textContent = records.length ? `${records.length} 笔` : "";

  if (!max) {
    drawEmptyChart(ctx, canvas, "暂无趋势");
    return;
  }

  const padding = { top: 18, right: 20, bottom: 34, left: 48 };
  const chartW = canvas.width - padding.left - padding.right;
  const chartH = canvas.height - padding.top - padding.bottom;
  const barGroupW = chartW / days;
  const barW = Math.max(3, Math.min(10, barGroupW * 0.32));

  ctx.strokeStyle = "#dfe7e3";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#65736f";
  ctx.font = "12px system-ui";
  ctx.textAlign = "right";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + chartH - (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(canvas.width - padding.right, y);
    ctx.stroke();
    ctx.fillText(formatCompact((max / 4) * i), padding.left - 8, y + 4);
  }

  for (let day = 0; day < days; day += 1) {
    const x = padding.left + day * barGroupW + barGroupW / 2;
    const incomeH = (incomeByDay[day] / max) * chartH;
    const expenseH = (expenseByDay[day] / max) * chartH;

    ctx.fillStyle = "#16765f";
    ctx.fillRect(x - barW - 1, padding.top + chartH - incomeH, barW, incomeH);
    ctx.fillStyle = "#b83b44";
    ctx.fillRect(x + 1, padding.top + chartH - expenseH, barW, expenseH);

    if (day === 0 || day + 1 === days || (day + 1) % 5 === 0) {
      ctx.fillStyle = "#65736f";
      ctx.textAlign = "center";
      ctx.fillText(String(day + 1), x, canvas.height - 10);
    }
  }
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.floor(260 * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvas.width = Math.max(320, Math.floor(rect.width));
  canvas.height = 260;
  return canvas.getContext("2d");
}

function drawEmptyChart(ctx, canvas, text) {
  ctx.fillStyle = "#f2f6f4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#65736f";
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function renderCategoryLists() {
  renderChipList("expense", els.expenseCategoryList);
  renderChipList("income", els.incomeCategoryList);
}

function renderChipList(type, container) {
  container.innerHTML = state.categories[type]
    .map((category) => {
      const removable = !defaultCategories[type].includes(category);
      const button = removable ? `<button type="button" title="删除" aria-label="删除 ${escapeHtml(category)}" data-remove-category="${escapeHtml(category)}" data-type="${type}">×</button>` : "";
      return `<span class="chip">${escapeHtml(category)}${button}</span>`;
    })
    .join("");
}

function renderAll() {
  renderCategorySelect();
  renderCategoryFilter();
  renderSummary();
  renderRecords();
  renderCharts();
  renderCategoryLists();
}

function addOrUpdateRecord(event) {
  event.preventDefault();
  const amount = Number(els.amountInput.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("金额需要大于 0");
    return;
  }

  const id = els.editingId.value || createId();
  const old = state.records.find((record) => record.id === id);
  const record = {
    id,
    type: getSelectedType(),
    amount: Math.round(amount * 100) / 100,
    date: els.dateInput.value,
    category: els.categoryInput.value,
    account: els.accountInput.value,
    note: els.noteInput.value.trim(),
    createdAt: old?.createdAt || Date.now(),
  };

  if (old) {
    state.records = state.records.map((item) => (item.id === id ? record : item));
    showToast("已更新");
  } else {
    state.records.push(record);
    showToast("已保存");
  }

  saveState();
  resetForm();
  renderAll();
}

function resetForm() {
  els.entryTitle.textContent = "新增流水";
  els.submitBtn.textContent = "保存";
  els.cancelEditBtn.classList.add("hidden");
  els.editingId.value = "";
  els.amountInput.value = "";
  els.dateInput.value = todayISO();
  els.noteInput.value = "";
  setSelectedType("expense");
}

function editRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  els.entryTitle.textContent = "编辑流水";
  els.submitBtn.textContent = "更新";
  els.cancelEditBtn.classList.remove("hidden");
  els.editingId.value = record.id;
  setSelectedType(record.type);
  els.amountInput.value = record.amount;
  els.dateInput.value = record.date;
  els.categoryInput.value = record.category;
  els.accountInput.value = record.account;
  els.noteInput.value = record.note || "";
  els.amountInput.focus();
}

function deleteRecord(id) {
  state.records = state.records.filter((record) => record.id !== id);
  saveState();
  renderAll();
  showToast("已删除");
}

function addCategory(event) {
  event.preventDefault();
  const type = els.newCategoryType.value;
  const name = els.newCategoryName.value.trim();

  if (!name) return;
  if (state.categories[type].includes(name)) {
    showToast("分类已存在");
    return;
  }

  state.categories[type].push(name);
  els.newCategoryName.value = "";
  saveState();
  renderAll();
  showToast("已添加分类");
}

function removeCategory(type, category) {
  const inUse = state.records.some((record) => record.type === type && record.category === category);
  if (inUse) {
    showToast("已有流水使用该分类");
    return;
  }

  state.categories[type] = state.categories[type].filter((item) => item !== category);
  saveState();
  renderAll();
  showToast("已删除分类");
}

function exportCsv() {
  const header = ["日期", "类型", "金额", "分类", "账户", "备注"];
  const rows = state.records
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => [record.date, record.type === "income" ? "收入" : "支出", record.amount, record.category, record.account, record.note || ""]);
  downloadFile(`记账流水-${todayISO()}.csv`, "\ufeff" + [header, ...rows].map(csvRow).join("\n"), "text/csv;charset=utf-8");
}

function exportJson() {
  downloadFile(`记账备份-${todayISO()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.records)) throw new Error("invalid");
      state = {
        records: imported.records,
        categories: {
          expense: mergeCategories(imported.categories?.expense, defaultCategories.expense),
          income: mergeCategories(imported.categories?.income, defaultCategories.income),
        },
        currency: imported.currency || state.currency,
      };
      saveState();
      els.currencySelect.value = state.currency;
      renderAll();
      showToast("导入完成");
    } catch {
      showToast("文件格式不正确");
    }
  };
  reader.readAsText(file);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvRow(row) {
  return row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",");
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `record-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sumByType(records, type) {
  return records.filter((record) => record.type === type).reduce((sum, record) => sum + record.amount, 0);
}

function groupTotals(records, key) {
  return records.reduce((totals, record) => {
    totals[record[key]] = (totals[record[key]] || 0) + record.amount;
    return totals;
  }, {});
}

function daysInMonth(month) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex, 0).getDate();
}

function formatCompact(value) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function bindEvents() {
  els.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.navTabs.forEach((item) => item.classList.toggle("active", item === tab));
      Object.entries(els.views).forEach(([view, node]) => node.classList.toggle("active", view === tab.dataset.view));
      renderCharts();
    });
  });

  document.querySelectorAll("input[name='type']").forEach((input) => {
    input.addEventListener("change", renderCategorySelect);
  });

  els.entryForm.addEventListener("submit", addOrUpdateRecord);
  els.cancelEditBtn.addEventListener("click", resetForm);
  [els.monthFilter, els.typeFilter, els.categoryFilter, els.searchInput].forEach((input) => input.addEventListener("input", renderAll));
  els.clearFiltersBtn.addEventListener("click", () => {
    els.monthFilter.value = currentMonth();
    els.typeFilter.value = "all";
    els.categoryFilter.value = "all";
    els.searchInput.value = "";
    renderAll();
  });

  els.recordsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit") editRecord(button.dataset.id);
    if (button.dataset.action === "delete") deleteRecord(button.dataset.id);
  });

  els.categoryForm.addEventListener("submit", addCategory);
  document.querySelector("#settingsView").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-remove-category]");
    if (!button) return;
    removeCategory(button.dataset.type, button.dataset.removeCategory);
  });

  els.exportCsvBtn.addEventListener("click", exportCsv);
  els.exportJsonBtn.addEventListener("click", exportJson);
  els.importJsonInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importJson(file);
    event.target.value = "";
  });

  els.currencySelect.addEventListener("change", () => {
    state.currency = els.currencySelect.value;
    saveState();
    renderAll();
  });

  els.clearDataBtn.addEventListener("click", () => {
    if (!confirm("确认清空所有流水和自定义分类？")) return;
    state = { records: [], categories: cloneCategories(defaultCategories), currency: state.currency };
    saveState();
    renderAll();
    showToast("已清空");
  });

  window.addEventListener("resize", renderCharts);
}

function init() {
  els.todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", weekday: "short" }).format(new Date());
  els.dateInput.value = todayISO();
  els.monthFilter.value = currentMonth();
  els.currencySelect.value = state.currency;
  bindEvents();
  renderAll();
}

init();

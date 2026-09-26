// ===== 全局状态 =====
const state = {
  category: "cet4",
  items: [],
  index: 0,
  slots: [],        // 当前题目所有字母槽位 [{char, el}]
  cursor: 0,        // 当前应输入的槽位下标
  itemErrors: 0,    // 本题错误次数
  totalErrors: 0,   // 全局错误击键数
  totalKeys: 0,     // 全局有效击键数
  showWord: true,   // 是否显示英文（false 为听写模式）
  started: false,   // 计时是否已开始
  startTime: 0,
  timerId: null,
  finished: false
};

// ===== DOM =====
const $ = (id) => document.getElementById(id);
const el = {
  card: $("card"),
  meaning: $("meaning"),
  wordDisplay: $("wordDisplay"),
  hintText: $("hintText"),
  progress: $("statProgress"),
  accuracy: $("statAccuracy"),
  errors: $("statErrors"),
  time: $("statTime"),
  progressFill: $("progressFill"),
  finishPanel: $("finishPanel"),
  finishStats: $("finishStats"),
  toggleHintLabel: $("toggleHintLabel")
};

// ===== 音效（WebAudio，无需外部文件）=====
let audioCtx = null;
function playTone(freq, duration, type = "sine", volume = 0.15) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // 手机浏览器需要用户手势激活音频上下文
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* 忽略音频异常 */ }
}
const soundError = () => playTone(180, 0.25, "square", 0.12);
const soundCorrect = () => playTone(880, 0.06, "sine", 0.05);
const soundDone = () => { playTone(660, 0.12); setTimeout(() => playTone(990, 0.18), 120); };

// ===== 发音（语音合成）=====
const ttsAvailable = "speechSynthesis" in window;
let ttsVoices = [];

if (ttsAvailable) {
  // 预热：部分手机浏览器语音列表是异步加载的，需提前触发
  const loadVoices = () => { ttsVoices = speechSynthesis.getVoices() || []; };
  loadVoices();
  if (typeof speechSynthesis.onvoiceschanged !== "undefined") {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// 在线发音回退：优先走本地服务器代理（同源，无跨域限制），失败再直连
function speakOnline(text) {
  const urls = [
    `/tts?text=${encodeURIComponent(text)}`,
    (text.length > 20 || /\s/.test(text))
      ? `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(text)}&spd=3&source=web`
      : `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(text)}`
  ];
  let idx = 0;
  const showFail = () => {
    el.hintText.textContent = "⚠️ 在线发音失败，请检查网络连接";
    el.hintText.classList.add("error-tip");
    setTimeout(() => el.hintText.classList.remove("error-tip"), 2500);
  };
  const tryPlay = () => {
    if (idx >= urls.length) {
      showFail();
      return;
    }
    const audio = new Audio(urls[idx++]);
    let failed = false;
    const fail = (err) => {
      if (failed) return;
      failed = true;
      // 手机端自动发音（非点击触发）会被浏览器拦截，不再重试
      if (err && err.name === "NotAllowedError") {
        el.hintText.textContent = "自动播放被浏览器拦截，点【🔊 发音】按钮可播放";
        el.hintText.classList.add("error-tip");
        setTimeout(() => el.hintText.classList.remove("error-tip"), 2500);
        return;
      }
      tryPlay();
    };
    audio.onerror = () => fail();
    audio.play().catch(fail);
  };
  tryPlay();
}

function speak(text) {
  if (ttsAvailable) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    // 显式选择英文语音（部分手机默认语音不是英文会静音）
    const enVoice = ttsVoices.find((v) => /^en(-|_)?/i.test(v.lang));
    if (enVoice) u.voice = enVoice;
    speechSynthesis.speak(u);
    // 部分手机浏览器第一次调用会静默失败，检测后重试一次
    setTimeout(() => {
      if (!speechSynthesis.speaking && !speechSynthesis.pending) {
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
    }, 350);
  } else {
    // 无 TTS 引擎（微信/QQ/UC 内置浏览器等），走在线发音
    speakOnline(text);
  }
}

// ===== 工具 =====
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ===== 计时 =====
function startTimer() {
  if (state.started) return;
  state.started = true;
  state.startTime = Date.now();
  state.timerId = setInterval(() => {
    el.time.textContent = formatTime(Date.now() - state.startTime);
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

// ===== 统计刷新 =====
function updateStats() {
  el.progress.textContent = `${state.index} / ${state.items.length}`;
  el.errors.textContent = state.totalErrors;
  const acc = state.totalKeys === 0 ? 100 : Math.max(0, Math.round(((state.totalKeys - state.totalErrors) / state.totalKeys) * 100));
  el.accuracy.textContent = `${acc}%`;
  el.progressFill.style.width = `${(state.index / state.items.length) * 100}%`;
}

// ===== 渲染题目 =====
function renderItem() {
  const item = state.items[state.index];
  const isSentence = WORD_DATA[state.category].type === "sentence";

  // 中文释义
  el.meaning.innerHTML = `<span class="tag">${isSentence ? "句子" : "单词"}</span>${item.zh}`;

  // 句子模式：加标记，单词用底框区分
  el.wordDisplay.classList.toggle("sentence", isSentence);

  // 字母槽位
  el.wordDisplay.innerHTML = "";
  el.wordDisplay.classList.remove("done");
  state.slots = [];
  state.cursor = 0;
  state.itemErrors = 0;

  const words = item.en.split(" ");
  words.forEach((word, wi) => {
    const group = document.createElement("div");
    group.className = "word-group";
    for (const ch of word) {
      const span = document.createElement("span");
      span.className = "letter" + (state.showWord ? " shown" : "");
      span.textContent = ch;
      group.appendChild(span);
      state.slots.push({ char: ch, el: span });
    }
    el.wordDisplay.appendChild(group);
  });

  markCurrent();
  el.hintText.textContent = isSentence ? "根据中文句意输入整句英文（空格自动跳过）" : "根据中文释义输入单词";
  el.hintText.classList.remove("error-tip");
  updateStats();
}

function markCurrent() {
  state.slots.forEach((s, i) => s.el.classList.toggle("current", i === state.cursor));
}

// ===== 输入判定 =====
function handleChar(ch) {
  if (state.finished || state.cursor >= state.slots.length) return;
  startTimer();

  state.totalKeys++;
  const slot = state.slots[state.cursor];

  if (ch.toLowerCase() === slot.char.toLowerCase()) {
    // 正确：先恢复槽位文字（可能被之前的错误输入覆盖过）
    slot.el.textContent = slot.char;
    slot.el.classList.remove("shown", "wrong");
    slot.el.classList.add("correct");
    slot.el.classList.remove("current");
    state.cursor++;
    soundCorrect();
    if (state.cursor >= state.slots.length) {
      completeItem();
    } else {
      markCurrent();
    }
  } else {
    // 错误提醒：红色 + 抖动 + 提示音 + 计数
    state.totalErrors++;
    state.itemErrors++;
    soundError();
    slot.el.classList.add("wrong");
    slot.el.textContent = ch;
    setTimeout(() => {
      slot.el.classList.remove("wrong");
      slot.el.textContent = slot.char;
    }, 350);
    el.card.classList.remove("shake");
    void el.card.offsetWidth; // 重启动画
    el.card.classList.add("shake");
    el.hintText.textContent = `❌ 打错了！当前应输入 "${slot.char}"`;
    el.hintText.classList.add("error-tip");
    setTimeout(() => el.hintText.classList.remove("error-tip"), 1200);
  }
  updateStats();
}

function handleBackspace() {
  if (state.finished || state.cursor === 0) return;
  state.cursor--;
  const slot = state.slots[state.cursor];
  slot.el.classList.remove("correct", "wrong", "current");
  slot.el.textContent = slot.char;
  if (state.showWord) slot.el.classList.add("shown");
  markCurrent();
  updateStats();
}

// ===== 完成一题 =====
function completeItem() {
  el.wordDisplay.classList.add("done");
  soundDone();
  const item = state.items[state.index];
  speak(item.en);

  if (state.itemErrors > 0) {
    el.hintText.textContent = `✅ 完成（本题错了 ${state.itemErrors} 次）`;
  } else {
    el.hintText.textContent = "✅ 完美！一次没错";
  }

  const delay = WORD_DATA[state.category].type === "sentence" ? 1600 : 900;
  setTimeout(() => {
    state.index++;
    if (state.index >= state.items.length) {
      finishRound();
    } else {
      renderItem();
    }
  }, delay);
}

// ===== 完成整轮 =====
function finishRound() {
  state.finished = true;
  stopTimer();
  const acc = state.totalKeys === 0 ? 100 : Math.max(0, Math.round(((state.totalKeys - state.totalErrors) / state.totalKeys) * 100));
  el.finishStats.innerHTML = `
    <div><b>${state.items.length}</b>完成题数</div>
    <div><b>${acc}%</b>击键正确率</div>
    <div><b>${state.totalErrors}</b>错误次数</div>
    <div><b>${formatTime(Date.now() - state.startTime)}</b>总用时</div>
  `;
  el.finishPanel.classList.remove("hidden");
  el.card.style.display = "none";
  updateStats();
}

// ===== 开始 / 重置 =====
function startRound() {
  state.items = shuffle(WORD_DATA[state.category].list);
  state.index = 0;
  state.totalErrors = 0;
  state.totalKeys = 0;
  state.started = false;
  state.finished = false;
  stopTimer();
  el.time.textContent = "00:00";
  el.finishPanel.classList.add("hidden");
  el.card.style.display = "";
  renderItem();
}

// ===== 手机键盘支持：隐藏输入框 =====
const mobileInput = $("mobileInput");

// 点击卡片区域聚焦输入框，唤起虚拟键盘
el.card.addEventListener("click", (e) => {
  if (e.target.closest(".action-btn")) return;
  mobileInput.focus();
});

// 手机输入：用 beforeinput 拦截字符，使其不进输入框
mobileInput.addEventListener("beforeinput", (e) => {
  if (e.inputType === "deleteContentBackward") {
    e.preventDefault();
    handleBackspace();
    return;
  }
  const ch = e.data;
  if (ch && /^[a-zA-Z'\-.,?!:;"()]$/.test(ch)) {
    e.preventDefault();
    handleChar(ch);
  }
});

// 手机退格（beforeinput 拦截不到时兜底）
mobileInput.addEventListener("keydown", (e) => {
  if (e.key === "Backspace") {
    e.preventDefault();
    handleBackspace();
  }
});

// ===== 事件绑定 =====
document.addEventListener("keydown", (e) => {
  // 手机输入框自己处理，避免重复
  if (e.target === mobileInput) return;
  // 输入框/文本域（如导入词库弹窗）内正常打字，不触发练习判定
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" || e.target.isContentEditable) return;
  // 快捷键
  if (e.key === "Tab") {
    e.preventDefault();
    const item = state.items[state.index];
    if (item) speak(item.en);
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    toggleHint();
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    handleBackspace();
    return;
  }
  if (e.key === "ArrowRight" && e.ctrlKey) {
    e.preventDefault();
    skipItem();
    return;
  }
  // 字母输入（支持大小写、撇号、连字符）
  if (e.key.length === 1 && /^[a-zA-Z'\-.,?!:;"()]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    handleChar(e.key);
  }
});

function toggleHint() {
  state.showWord = !state.showWord;
  el.toggleHintLabel.textContent = state.showWord ? "隐藏英文" : "显示英文";
  state.slots.forEach((s, i) => {
    if (i >= state.cursor) {
      s.el.classList.toggle("shown", state.showWord);
    }
  });
}

function skipItem() {
  if (state.finished) return;
  state.index++;
  if (state.index >= state.items.length) {
    finishRound();
  } else {
    renderItem();
  }
}

document.querySelectorAll(".cat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.category = btn.dataset.cat;
    startRound();
  });
});

$("btnSpeak").addEventListener("click", () => {
  const item = state.items[state.index];
  if (item) speak(item.en);
});
$("btnToggleHint").addEventListener("click", toggleHint);
$("btnSkip").addEventListener("click", skipItem);
$("btnRestart").addEventListener("click", startRound);
$("btnAgain").addEventListener("click", startRound);

// ===== 导入词库功能 =====
const importModal = $("importModal");
const importTextarea = $("importTextarea");
const importResult = $("importResult");

$("btnImport").addEventListener("click", () => {
  importTextarea.value = "";
  importResult.textContent = "";
  importModal.classList.remove("hidden");
  importTextarea.focus();
});

$("btnImportCancel").addEventListener("click", () => {
  importModal.classList.add("hidden");
});
importModal.querySelector(".modal-mask").addEventListener("click", () => {
  importModal.classList.add("hidden");
});

// ===== 单词表浏览 / 搜索 =====
const wordListModal = $("wordListModal");
const wordListSearch = $("wordListSearch");
const wordListContainer = $("wordListContainer");
const wordListCount = $("wordListCount");
const wordListCat = $("wordListCat");

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderWordList() {
  const cat = state.category;
  const list = WORD_DATA[cat].list;
  const q = wordListSearch.value.trim().toLowerCase();
  const filtered = q
    ? list.filter((i) => i.en.toLowerCase().includes(q) || i.zh.toLowerCase().includes(q))
    : list;
  wordListCat.textContent = WORD_DATA[cat].name;
  wordListCount.textContent = `共 ${filtered.length} 条${q ? `（匹配 "${wordListSearch.value.trim()}"）` : ""}`;
  const MAX = 200;
  if (filtered.length === 0) {
    wordListContainer.innerHTML = `<div class="word-more">没有找到匹配的词条</div>`;
    return;
  }
  const shown = filtered.slice(0, MAX);
  wordListContainer.innerHTML = shown
    .map((i) => `<div class="word-row"><span class="w-en">${escapeHtml(i.en)}</span><span class="w-zh">${escapeHtml(i.zh)}</span><button class="w-del" data-en="${escapeHtml(i.en)}" title="删除该词条">×</button></div>`)
    .join("") + (filtered.length > MAX ? `<div class="word-more">仅显示前 ${MAX} 条，请用搜索缩小范围</div>` : "");
}

// 删除记录：localStorage 持久化（刷新后仍生效）
function getDeletedSet(cat) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`typing_deleted_${cat}`) || "[]"));
  } catch (e) {
    return new Set();
  }
}

function saveDeletedSet(cat, set) {
  localStorage.setItem(`typing_deleted_${cat}`, JSON.stringify([...set]));
}

// 从 BUILTIN + localStorage 导入词重建某分类列表（应用删除记录）
function rebuildCategory(cat) {
  const list = BUILTIN_DATA[cat].list.slice();
  try {
    const saved = JSON.parse(localStorage.getItem(`typing_imports_${cat}`) || "[]");
    const set = new Set(list.map((i) => i.en.toLowerCase()));
    for (const item of saved) {
      if (item.en && item.zh && !set.has(item.en.toLowerCase())) {
        list.push(item);
        set.add(item.en.toLowerCase());
      }
    }
  } catch (e) { /* 忽略损坏数据 */ }
  const del = getDeletedSet(cat);
  WORD_DATA[cat].list = del.size ? list.filter((i) => !del.has(i.en.toLowerCase())) : list;
}

// 点击 × 删除词条
wordListContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".w-del");
  if (!btn) return;
  const enKey = btn.dataset.en.toLowerCase();
  const cat = state.category;
  WORD_DATA[cat].list = WORD_DATA[cat].list.filter((i) => i.en.toLowerCase() !== enKey);
  const del = getDeletedSet(cat);
  del.add(enKey);
  saveDeletedSet(cat, del);
  renderWordList();
});

// 恢复本分类所有已删除词条
$("btnRestoreDeleted").addEventListener("click", () => {
  const cat = state.category;
  localStorage.removeItem(`typing_deleted_${cat}`);
  rebuildCategory(cat);
  renderWordList();
});

$("btnWordList").addEventListener("click", () => {
  wordListSearch.value = "";
  renderWordList();
  wordListModal.classList.remove("hidden");
});
$("btnWordListClose").addEventListener("click", () => {
  wordListModal.classList.add("hidden");
});
wordListModal.querySelector(".modal-mask").addEventListener("click", () => {
  wordListModal.classList.add("hidden");
});
wordListSearch.addEventListener("input", renderWordList);

$("btnImportConfirm").addEventListener("click", () => {
  const items = parseImportText(importTextarea.value);
  if (items.length === 0) {
    importResult.style.color = "var(--wrong)";
    importResult.textContent = "未识别到有效条目，请检查格式（每行：英文 中文释义）";
    return;
  }
  const cat = state.category;
  const existing = WORD_DATA[cat].list;
  const existingSet = new Set(existing.map((i) => i.en.toLowerCase()));
  let added = 0;
  for (const item of items) {
    if (!existingSet.has(item.en.toLowerCase())) {
      existing.push(item);
      existingSet.add(item.en.toLowerCase());
      added++;
    }
  }
  // 持久化到 localStorage
  saveImports(cat);
  // 若导入的词之前被删除过，解除删除标记
  const delSet = getDeletedSet(cat);
  if (delSet.size) {
    let changed = false;
    for (const item of items) {
      const key = item.en.toLowerCase();
      if (delSet.has(key)) {
        delSet.delete(key);
        changed = true;
      }
    }
    if (changed) saveDeletedSet(cat, delSet);
  }
  importResult.style.color = "var(--correct)";
  importResult.textContent = `✅ 成功导入 ${added} 条（共识别 ${items.length} 条，重复 ${items.length - added} 条已跳过）。已自动重新开始练习。`;
  setTimeout(() => {
    importModal.classList.add("hidden");
    startRound();
  }, 900);
});

// 解析粘贴的词库文本
function parseImportText(text) {
  const items = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 以第一个中文字符作为分隔点（英文部分可以含空格，用于语句）
    const m = trimmed.match(/[\u4e00-\u9fa5]/);
    if (!m) continue;
    const idx = m.index;
    let en = trimmed.slice(0, idx).trim();
    // 去掉尾部的分隔符 = , ： 等
    en = en.replace(/[,=\t:：]+$/, "").trim();
    const zh = trimmed.slice(idx).trim();
    if (en && zh) items.push({ en, zh });
  }
  return items;
}

// 读取某分类的导入增量（与内置词库合并后存 localStorage 的差异）
function saveImports(cat) {
  const builtin = BUILTIN_DATA[cat].list.map((i) => i.en.toLowerCase());
  const imported = WORD_DATA[cat].list
    .filter((i) => !builtin.includes(i.en.toLowerCase()))
    .map((i) => ({ en: i.en, zh: i.zh }));
  localStorage.setItem(`typing_imports_${cat}`, JSON.stringify(imported));
}

// ===== 启动前：合并 localStorage 中的导入词库 =====
const BUILTIN_DATA = JSON.parse(JSON.stringify(WORD_DATA)); // 备份内置词库
Object.keys(WORD_DATA).forEach((cat) => {
  try {
    const saved = localStorage.getItem(`typing_imports_${cat}`);
    if (saved) {
      const imported = JSON.parse(saved);
      const set = new Set(WORD_DATA[cat].list.map((i) => i.en.toLowerCase()));
      for (const item of imported) {
        if (item.en && item.zh && !set.has(item.en.toLowerCase())) {
          WORD_DATA[cat].list.push(item);
          set.add(item.en.toLowerCase());
        }
      }
    }
  } catch (e) { /* 忽略损坏数据 */ }
  // 应用删除记录（刷新后仍保持删除状态）
  const del = getDeletedSet(cat);
  if (del.size) {
    WORD_DATA[cat].list = WORD_DATA[cat].list.filter((i) => !del.has(i.en.toLowerCase()));
  }
});

// ===== 启动 =====
startRound();

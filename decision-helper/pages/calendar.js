/**
 * calendar.js
 * 日历页面——记录每天的活动内容和心情。
 */

import { showToast } from '../components/toast.js';

const CALENDAR_KEY = 'calendar_entries';

let currentYear = 0;
let currentMonth = 0; // 1-12
let entries = {};

export function init() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;
  entries = loadEntries();
}

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(CALENDAR_KEY) || '{}'); }
  catch { return {}; }
}

function saveEntries() {
  localStorage.setItem(CALENDAR_KEY, JSON.stringify(entries));
}

export function render() {
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=Sun
  const monthLabel = `${currentYear}年${currentMonth}月`;

  // 生成日期格子
  let cells = '';
  // 空白填充
  for (let i = 0; i < firstDay; i++) {
    cells += '<div class="cal-cell cal-empty"></div>';
  }
  // 日期
  const todayStr = getTodayStr();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const entry = entries[dateKey];
    const isToday = dateKey === todayStr;
    cells += `
      <div class="cal-cell ${isToday ? 'cal-today' : ''}" data-date="${dateKey}">
        <span class="cal-day-num">${d}</span>
        ${entry ? `<span class="cal-dot cal-dot-${getMoodClass(entry.mood)}"></span>` : ''}
        ${entry ? `<span class="cal-preview">${(entry.content || '').slice(0, 6)}${(entry.content || '').length > 6 ? '...' : ''}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="page active">
      <div class="card">
        <h2>📅 每日记录</h2>
      </div>

      <div class="card cal-card">
        <div class="cal-header">
          <button class="btn btn-sm btn-outline" id="cal-prev">‹</button>
          <span class="cal-month-label">${monthLabel}</span>
          <button class="btn btn-sm btn-outline" id="cal-next">›</button>
        </div>
        <div class="cal-weekdays">
          <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
        </div>
        <div class="cal-grid">
          ${cells}
        </div>
      </div>

      <div class="card">
        <h2>📝 本月统计</h2>
        ${renderStats()}
      </div>
    </div>
  `;
}

function getMoodClass(mood) {
  const map = { '😄': 'great', '😊': 'good', '😐': 'ok', '😢': 'sad', '😡': 'angry' };
  return map[mood] || 'ok';
}

function renderStats() {
  const monthEntries = Object.entries(entries).filter(([key]) => key.startsWith(`${currentYear}-${String(currentMonth).padStart(2,'0')}`));
  if (monthEntries.length === 0) {
    return '<div class="empty-state" style="padding:24px;"><div class="empty-icon" style="font-size:36px;">📭</div><p>本月还没有记录</p></div>';
  }
  const total = monthEntries.length;
  const moods = monthEntries.map(([, v]) => v.mood || '😐');
  const moodCount = {};
  moods.forEach(m => { moodCount[m] = (moodCount[m] || 0) + 1; });
  const moodHtml = Object.entries(moodCount).map(([m, c]) =>
    `<span style="font-size:20px;">${m}</span><span style="font-size:13px;color:var(--text-light);margin-right:12px;">×${c}</span>`
  ).join('');

  return `<p style="color:var(--text-secondary);font-size:14px;">本月共 ${total} 天有记录</p><div style="margin-top:8px;">${moodHtml}</div>`;
}

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export function onMount() {
  // 月份切换
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    refreshPage();
  });

  document.getElementById('cal-next')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    refreshPage();
  });

  // 点击日期格子
  document.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      showEntryModal(date);
    });
  });
}

function refreshPage() {
  const main = document.getElementById('main-content');
  main.innerHTML = render();
  onMount();
}

function showEntryModal(date) {
  const entry = entries[date] || { content: '', mood: '😊', image: '' };

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box cal-modal">
      <h3>📅 ${date}</h3>
      <div class="form-group">
        <label>今天做了什么？</label>
        <textarea id="cal-content" rows="3" placeholder="今天做了什么？">${esc(entry.content || '')}</textarea>
      </div>
      <div class="form-group">
        <label>心情</label>
        <div class="cal-mood-picker" id="cal-mood-picker">
          ${['😄', '😊', '😐', '😢', '😡'].map(m =>
            `<span class="cal-mood-option ${entry.mood === m ? 'selected' : ''}" data-mood="${m}">${m}</span>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>图片（可选）</label>
        <div class="cal-image-upload" id="cal-image-upload">
          <input type="file" id="cal-image-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
          <div class="cal-image-placeholder" id="cal-image-placeholder">
            <span class="cal-image-icon">📷</span>
            <span class="cal-image-text">点击上传图片</span>
          </div>
        </div>
        <div class="cal-image-preview" id="cal-image-preview" style="display:${entry.image ? 'flex' : 'none'};">
          <img id="cal-image-img" src="${entry.image || ''}" alt="预览">
          <span class="cal-image-remove" id="cal-image-remove">&times;</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" id="cal-modal-close">取消</button>
        <button class="btn btn-primary" id="cal-modal-save">💾 保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let selectedMood = entry.mood;
  let currentImage = entry.image || '';

  // 心情选择
  overlay.querySelectorAll('.cal-mood-option').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('.cal-mood-option').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      selectedMood = el.dataset.mood;
    });
  });

  // 图片上传点击
  document.getElementById('cal-image-upload').onclick = () => {
    document.getElementById('cal-image-input').click();
  };

  // 图片选择
  document.getElementById('cal-image-input').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 限制大小 200KB
    if (file.size > 200 * 1024) {
      showToast('图片大小超过 200KB，请压缩后重试', 'warning');
      this.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      currentImage = evt.target.result;
      const img = document.getElementById('cal-image-img');
      img.src = currentImage;
      document.getElementById('cal-image-preview').style.display = 'flex';
      document.getElementById('cal-image-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  };

  // 删除图片
  document.getElementById('cal-image-remove').onclick = function() {
    currentImage = '';
    document.getElementById('cal-image-preview').style.display = 'none';
    document.getElementById('cal-image-placeholder').style.display = 'flex';
    document.getElementById('cal-image-input').value = '';
  };

  document.getElementById('cal-modal-close').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  document.getElementById('cal-modal-save').onclick = () => {
    const content = document.getElementById('cal-content').value.trim();
    const record = { content, mood: selectedMood };
    if (currentImage) record.image = currentImage;
    entries[date] = record;
    saveEntries();
    overlay.remove();
    showToast('✅ 已保存记录', 'success');
    refreshPage();
  };
}

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
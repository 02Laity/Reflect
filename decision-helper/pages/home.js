/**
 * home.js
 * 首页——今日概览、周统计卡片、7天趋势图、快速添加入口。
 */

import { loadData, addTask, getTasks } from '../store/data-store.js';
import { todayStr, formatDate } from '../utils/helpers.js';
import { dailySummary, detectConflicts } from '../utils/recommend-engine.js';
import { navigateTo, refreshCurrentPage } from '../main.js';

let pageData = {};

export function init() {
  const data = loadData();
  pageData.tasks = data.tasks;
  pageData.today = todayStr();
  pageData.summary = dailySummary(data.tasks, pageData.today);
  pageData.conflicts = detectConflicts(data.tasks, pageData.today);
  pageData.todayTasks = getTasks({ date: pageData.today, done: false });
  // 计算本周完成率（最近7天）
  pageData.weekStats = getWeekStats(data.tasks);
}

// ===== 周统计数据 =====
function getWeekStats(tasks) {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const done = dayTasks.filter(t => t.done).length;
    days.push({ date: dateStr, total: dayTasks.length, done, label: (d.getMonth()+1)+'/'+d.getDate() });
  }
  const totalWeek = days.reduce((s, d) => s + d.total, 0);
  const doneWeek = days.reduce((s, d) => s + d.done, 0);
  const weekRate = totalWeek > 0 ? Math.round((doneWeek / totalWeek) * 100) : 0;
  return { days, totalWeek, doneWeek, weekRate };
}

export function render() {
  const { summary, today, conflicts, todayTasks, tasks, weekStats } = pageData;
  const { name } = loadData().profile;
  const todayDisplay = formatDate(today);
  const totalAll = tasks.length;
  const hasWeekData = weekStats.totalWeek > 0;

  const conflictHtml = conflicts.length > 0
    ? `<div class="card" style="border-left: 4px solid var(--danger);">
        <h2>⚠️ 时间冲突预警</h2>
        <p style="color: var(--danger);">今天有 ${conflicts.length} 组任务时间冲突，请调整</p>
       </div>`
    : '';

  const taskHtml = todayTasks.length > 0
    ? todayTasks.map(t => `
        <div class="flex-between" style="padding: 8px 0; border-bottom: 1px solid var(--border);">
          <span>${t.done ? '✅' : '⭕'} ${esc(t.title)}</span>
          <span style="font-size: 12px; color: var(--text-light);">
            ${t.time || ''} ${t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🟢' : '🟡'}
          </span>
        </div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">🎉</div><p>今天没有待办任务，轻松一下！</p></div>';

  return `
    <div class="page active">
      <div class="card">
        <h2>👋 你好，${esc(name || '学生')}</h2>
        <p style="color: var(--text-light);">今天是 ${todayDisplay}，加油！</p>
      </div>

      <!-- 今日进度 -->
      <div class="card">
        <h2>📈 今日进度</h2>
        <div style="display: flex; gap: 16px; text-align: center; flex-wrap: wrap;">
          <div class="stat-card"><div class="stat-value" style="color:var(--primary-light);">${summary.total}</div><div class="stat-label">总任务</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--success);">${summary.done}</div><div class="stat-label">已完成</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--warning);">${summary.pending}</div><div class="stat-label">待完成</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--danger);">${summary.highPriority}</div><div class="stat-label">高优先</div></div>
        </div>
        <div class="mt-16"><div class="progress-bar"><div class="progress-bar-fill" style="width:${summary.total > 0 ? (summary.done / summary.total * 100) : 0}%"></div></div></div>
      </div>

      <!-- ===== 新增：数据统计看板 ===== -->
      <div class="card">
        <h2>📊 数据统计</h2>
        <div style="display: flex; gap: 16px; text-align: center; flex-wrap: wrap;">
          <div class="stat-card"><div class="stat-value" style="color:var(--primary-light);">${totalAll}</div><div class="stat-label">总任务数</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--primary-light);">${weekStats.doneWeek}</div><div class="stat-label">本周完成</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--success);">${weekStats.weekRate}%</div><div class="stat-label">本周完成率</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--warning);">${weekStats.totalWeek - weekStats.doneWeek}</div><div class="stat-label">本周剩余</div></div>
        </div>
      </div>

      <!-- ===== 新增：7天趋势图 ===== -->
      <div class="card">
        <h2>📉 近7天完成趋势</h2>
        ${hasWeekData ? '<canvas id="trend-chart" width="600" height="200" style="width:100%;height:auto;max-height:200px;"></canvas>' : '<div class="empty-state" style="padding:24px;"><div class="empty-icon" style="font-size:36px;">📊</div><p>暂无数据</p></div>'}
      </div>

      ${conflictHtml}

      <div class="card">
        <div class="flex-between">
          <h2>📋 今日待办</h2>
          <button class="btn btn-sm btn-outline" id="toggle-quick-form-btn">+ 快速添加</button>
        </div>
        <div id="quick-task-form" style="display: none;">
          <div class="form-group mt-8"><input type="text" id="quick-title" placeholder="任务名称"></div>
          <div class="flex-row">
            <input type="time" id="quick-time">
            <select id="quick-priority">
              <option value="medium">中优先级</option>
              <option value="high">高优先级</option>
              <option value="low">低优先级</option>
            </select>
            <button class="btn btn-primary btn-sm" id="quick-add-btn">添加</button>
          </div>
        </div>
        <div class="mt-16">${taskHtml}</div>
      </div>

      <div class="card">
        <h2>🚀 快捷操作</h2>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-primary" id="nav-tasks">📋 管理任务</button>
          <button class="btn btn-outline" id="nav-recommend">🧠 获取推荐</button>
          <button class="btn btn-outline" id="nav-profile">👤 个人资料</button>
        </div>
      </div>
    </div>
  `;
}

export function onMount() {
  document.getElementById('toggle-quick-form-btn')?.addEventListener('click', () => {
    const f = document.getElementById('quick-task-form');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('quick-add-btn')?.addEventListener('click', () => {
    const title = document.getElementById('quick-title').value.trim();
    if (!title) return alert('请输入任务名称');
    addTask({
      title,
      time: document.getElementById('quick-time').value,
      priority: document.getElementById('quick-priority').value,
      date: pageData.today,
      category: 'general',
    });
    document.getElementById('quick-title').value = '';
    document.getElementById('quick-time').value = '';
    refreshCurrentPage();
  });

  document.getElementById('nav-tasks')?.addEventListener('click', () => navigateTo('tasks'));
  document.getElementById('nav-recommend')?.addEventListener('click', () => navigateTo('recommend'));
  document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('profile'));

  // ===== 新增：绘制7天趋势图 =====
  drawTrendChart();
}

function drawTrendChart() {
  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { days } = pageData.weekStats;
  const w = canvas.width;
  const h = canvas.height;
  const pad = { top: 20, bottom: 30, left: 40, right: 20 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const maxVal = Math.max(...days.map(d => d.done), 1);

  // 清空
  ctx.clearRect(0, 0, w, h);

  // 背景网格
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    // Y轴刻度
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((maxVal / 4) * (4 - i)), pad.left - 8, y + 4);
  }

  // 绘制柱状图
  const barWidth = chartW / days.length * 0.6;
  const gap = chartW / days.length * 0.4;

  days.forEach((d, i) => {
    const x = pad.left + (chartW / days.length) * i + gap / 2;
    const barH = (d.done / maxVal) * chartH;
    const y = pad.top + chartH - barH;

    // 柱子
    const gradient = ctx.createLinearGradient(x, y, x, pad.top + chartH);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#93c5fd');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
    ctx.fill();

    // 数值
    if (d.done > 0) {
      ctx.fillStyle = '#1e293b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.done, x + barWidth / 2, y - 6);
    }

    // X轴标签
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + barWidth / 2, pad.top + chartH + 18);
  });
}

export function onLeave() {
  // 无需清理
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
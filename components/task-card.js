/**
 * task-card.js
 * 任务卡片组件
 */

import { priorityLabels, categoryLabels, formatDate } from '../utils/helpers.js';

/**
 * 渲染一张任务卡片 HTML 字符串
 * @param {object} task
 * @param {object} options
 * @param {Function} options.onToggle - 切换完成状态回调
 * @param {Function} options.onDelete - 删除回调
 * @returns {string} HTML
 */
export function renderTaskCard(task, options = {}) {
  const { onToggle, onDelete } = options;

  const priorityClass = `priority-${task.priority}`;
  const priorityLabel = priorityLabels[task.priority] || task.priority;
  const categoryLabel = categoryLabels[task.category] || task.category;
  const dateDisplay = task.date ? formatDate(task.date) : '无日期';
  const timeDisplay = task.time || '';

  return `
    <div class="task-card" data-task-id="${task.id}" style="border-left-color: ${getPriorityColor(task.priority)};">
      <div class="task-header">
        <span class="task-title" style="text-decoration: ${task.done ? 'line-through' : 'none'}; opacity: ${task.done ? 0.6 : 1}">
          ${task.done ? '✅ ' : ''}${escapeHtml(task.title)}
        </span>
        <span class="task-time">${dateDisplay} ${timeDisplay}</span>
      </div>
      ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-footer">
        <div class="flex-row">
          <span class="task-priority ${priorityClass}">${priorityLabel}</span>
          <span style="font-size: 11px; color: var(--text-light);">${categoryLabel}</span>
        </div>
        <div class="flex-row">
          <button class="btn btn-sm btn-outline toggle-btn" data-action="toggle">${task.done ? '撤销' : '完成'}</button>
          <button class="btn btn-sm btn-danger delete-btn" data-action="delete">删除</button>
        </div>
      </div>
    </div>
  `;
}

function getPriorityColor(priority) {
  const map = { high: '#dc3545', medium: '#ffc107', low: '#28a745' };
  return map[priority] || '#4f6ef7';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
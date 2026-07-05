/**
 * tasks.js
 * 任务看板——稳定拖拽，核心思路：drop 后直接从 DOM 顺序重建数组。
 */

import { loadData, addTask, addParentTask, updateTask, deleteTask, saveData } from '../store/data-store.js';
import { todayStr, categoryLabels, priorityLabels, formatDate } from '../utils/helpers.js';
import { refreshCurrentPage } from '../main.js';
import { callAI, buildSplitPrompt } from '../utils/api.js';

let pageState = {
  filterCategory: '',
  filterPriority: '',
  filterKeyword: '',
  showForm: false,
  editingTask: null,
  aiModalOpen: false,
  aiLoading: false,
  aiTaskDesc: '',
  aiSubtasks: [],
  aiModel: 'deepseek-v4-pro',
  expandedParents: {}, // { taskId: true } 展开状态（仅内存）
};

// 拖拽时保存被拖拽的 DOM 元素引用
let draggedEl = null;

export function init() {}

export function render() {
  const data = loadData();
  const allTasks = filterTasks(data.tasks);

  const todos = allTasks.filter(t => (t.status || 'todo') === 'todo');
  const inProgress = allTasks.filter(t => (t.status || '') === 'in-progress');
  const dones = allTasks.filter(t => t.status === 'done' || t.done);

  const edit = pageState.editingTask;

  const formHtml = `
    <div class="card" id="task-form-card">
      <h2>${edit ? '✏️ 编辑任务' : '➕ 新建任务'}</h2>
      <form id="task-form">
        <div class="form-group">
          <label>任务名称 *</label>
          <input type="text" id="tf-title" value="${edit ? esc(edit.title) : ''}" placeholder="例如：完成数学作业" required>
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea id="tf-desc" placeholder="可选描述信息">${edit ? esc(edit.description) : ''}</textarea>
        </div>
        <div class="flex-row" style="flex-wrap: wrap;">
          <div style="flex:1; min-width: 120px;">
            <div class="form-group"><label>日期</label><input type="date" id="tf-date" value="${edit && edit.date ? edit.date : ''}"></div>
          </div>
          <div style="flex:1; min-width: 100px;">
            <div class="form-group"><label>时间</label><input type="time" id="tf-time" value="${edit && edit.time ? edit.time : ''}"></div>
          </div>
        </div>
        <div class="flex-row" style="flex-wrap: wrap;">
          <div style="flex:1; min-width: 120px;">
            <div class="form-group"><label>优先级</label>
              <select id="tf-priority">
                ${['medium', 'high', 'low'].map(p => `<option value="${p}" ${edit && edit.priority === p ? 'selected' : ''}>${priorityLabels[p]}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="flex:1; min-width: 120px;">
            <div class="form-group"><label>分类</label>
              <select id="tf-category">
                ${Object.entries(categoryLabels).map(([k, v]) => `<option value="${k}" ${edit && edit.category === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="flex:1; min-width: 120px;">
            <div class="form-group"><label>状态</label>
              <select id="tf-status">
                <option value="todo" ${edit && (edit.status||'todo')==='todo' ? 'selected' : ''}>待办</option>
                <option value="in-progress" ${edit && edit.status==='in-progress' ? 'selected' : ''}>进行中</option>
                <option value="done" ${edit && (edit.status==='done'||edit.done) ? 'selected' : ''}>已完成</option>
              </select>
            </div>
          </div>
        </div>
        <div class="flex-row mt-16">
          <button type="submit" class="btn btn-primary">${edit ? '保存修改' : '添加任务'}</button>
          ${edit ? '<button type="button" class="btn btn-outline" id="cancel-edit-btn">取消编辑</button>' : ''}
        </div>
      </form>
    </div>
  `;

  const totalTodos = todos.length;
  const totalInProgress = inProgress.length;
  const totalDones = dones.length;

  return `
    <div class="page active">
      <div class="flex-between mb-16">
        <h2 style="font-size: 20px;">📋 任务看板</h2>
        <div class="flex-row" style="gap: 8px;">
          <button class="btn btn-ai" id="ai-assist-btn">🤖 AI 辅助</button>
          <button class="btn btn-primary" id="toggle-form-btn">${pageState.showForm || pageState.editingTask ? '收起表单' : '+ 新建任务'}</button>
        </div>
      </div>

      <div class="search-bar">
        <div class="search-bar-row">
          <input type="text" id="search-input" class="search-input" placeholder="🔍 搜索任务..." value="${esc(pageState.filterKeyword)}">
          <button class="btn btn-primary" id="search-btn">搜索</button>
        </div>
      </div>

      <div class="filter-bar">
        <select id="filter-category">
          <option value="">全部分类</option>
          ${Object.entries(categoryLabels).map(([k, v]) => `<option value="${k}" ${pageState.filterCategory === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <select id="filter-priority">
          <option value="">全部优先级</option>
          ${Object.entries(priorityLabels).map(([k, v]) => `<option value="${k}" ${pageState.filterPriority === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>

      <div id="task-form-container" style="display: ${pageState.showForm || pageState.editingTask ? 'block' : 'none'};">
        ${formHtml}
      </div>

      <div class="kanban-board" id="kanban-board">
        <div class="kanban-column" data-status="todo">
          <div class="column-header" style="border-bottom-color: #3b82f6;">
            <span class="column-title">📋 待办</span>
            <span class="column-count">${totalTodos}</span>
          </div>
          <div class="column-body">${todos.map(t => renderCard(t)).join('')||'<div class="column-empty">📭 拖拽任务到这里</div>'}</div>
        </div>
        <div class="kanban-column" data-status="in-progress">
          <div class="column-header" style="border-bottom-color: #f59e0b;">
            <span class="column-title">⏳ 进行中</span>
            <span class="column-count">${totalInProgress}</span>
          </div>
          <div class="column-body">${inProgress.map(t => renderCard(t)).join('')||'<div class="column-empty">📭 拖拽任务到这里</div>'}</div>
        </div>
        <div class="kanban-column" data-status="done">
          <div class="column-header" style="border-bottom-color: #10b981;">
            <span class="column-title">✅ 已完成</span>
            <span class="column-count">${totalDones}</span>
          </div>
          <div class="column-body">${dones.map(t => renderCard(t)).join('')||'<div class="column-empty">📭 拖拽任务到这里</div>'}</div>
        </div>
      </div>

      <div id="trash-bin" class="trash-bin">
        <span class="trash-icon">🗑️</span>
        <span class="trash-text">拖拽任务到此处删除</span>
      </div>

      <!-- AI 辅助模态框 -->
      <div class="modal-overlay" id="ai-modal-overlay" style="display: ${pageState.aiModalOpen ? 'flex' : 'none'};">
        <div class="ai-modal-box">
          <div class="ai-modal-header">
            <h3>AI 任务拆解助手</h3>
            <button class="ai-modal-close" id="ai-modal-close-btn">&times;</button>
          </div>
          <div class="ai-modal-body">
            <div class="form-group">
              <input type="text" id="ai-task-input" class="ai-task-input" placeholder="输入一个大任务，如'准备英语六级考试'" value="${esc(pageState.aiTaskDesc)}">
            </div>
            <div class="form-group">
              <label style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; display: block;">选择模型</label>
              <select id="ai-model-select" class="ai-model-select">
                <optgroup label="DeepSeek">
                  <option value="deepseek-v4-pro" ${pageState.aiModel==='deepseek-v4-pro'?'selected':''}>deepseek-v4-pro</option>
                  <option value="deepseek-v4-flash" ${pageState.aiModel==='deepseek-v4-flash'?'selected':''}>deepseek-v4-flash</option>
                  <option value="deepseek-chat" ${pageState.aiModel==='deepseek-chat'?'selected':''}>deepseek-chat</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4o" ${pageState.aiModel==='gpt-4o'?'selected':''}>gpt-4o</option>
                  <option value="gpt-4o-mini" ${pageState.aiModel==='gpt-4o-mini'?'selected':''}>gpt-4o-mini</option>
                </optgroup>
                <optgroup label="智谱GLM">
                  <option value="glm-5.1-flash" ${pageState.aiModel==='glm-5.1-flash'?'selected':''}>glm-5.1-flash</option>
                  <option value="glm-4-plus" ${pageState.aiModel==='glm-4-plus'?'selected':''}>glm-4-plus</option>
                </optgroup>
                <optgroup label="月之暗面">
                  <option value="moonshot-v1-8k" ${pageState.aiModel==='moonshot-v1-8k'?'selected':''}>moonshot-v1-8k</option>
                  <option value="moonshot-v1-32k" ${pageState.aiModel==='moonshot-v1-32k'?'selected':''}>moonshot-v1-32k</option>
                </optgroup>
                <optgroup label="阿里千问">
                  <option value="qwen-max" ${pageState.aiModel==='qwen-max'?'selected':''}>qwen-max</option>
                  <option value="qwen-plus" ${pageState.aiModel==='qwen-plus'?'selected':''}>qwen-plus</option>
                </optgroup>
                <optgroup label="Google">
                  <option value="gemini-2.0-flash" ${pageState.aiModel==='gemini-2.0-flash'?'selected':''}>gemini-2.0-flash</option>
                </optgroup>
                <optgroup label="Anthropic">
                  <option value="claude-3.5-sonnet" ${pageState.aiModel==='claude-3.5-sonnet'?'selected':''}>claude-3.5-sonnet</option>
                </optgroup>
                <optgroup label="自定义">
                  <option value="custom" ${pageState.aiModel==='custom'?'selected':''}>（从设置中读取）</option>
                </optgroup>
              </select>
            </div>
            <button class="btn btn-ai-primary" id="ai-split-btn">${pageState.aiLoading ? '拆分中...' : '🤖 拆分'}</button>
            <div id="ai-subtask-area" style="display: ${pageState.aiSubtasks.length > 0 ? 'block' : 'none'}; margin-top: 16px;">
              <div class="ai-subtask-list" id="ai-subtask-list">
                ${pageState.aiSubtasks.map((st, i) => `
                  <label class="ai-subtask-item">
                    <input type="checkbox" class="ai-subtask-checkbox" data-index="${i}" checked>
                    <span>${esc(st)}</span>
                  </label>
                `).join('')}
              </div>
              <div class="ai-subtask-footer">
                <span class="ai-subtask-count" id="ai-subtask-count">已选 ${pageState.aiSubtasks.filter(() => true).length} 个子任务</span>
                <button class="btn btn-primary" id="ai-add-to-board-btn" ${pageState.aiSubtasks.length === 0 ? 'disabled' : ''}>一键加入看板</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function filterTasks(tasks) {
  let r = [...tasks];
  if (pageState.filterKeyword) {
    const kw = pageState.filterKeyword.toLowerCase();
    r = r.filter(t => (t.title||'').toLowerCase().includes(kw));
  }
  if (pageState.filterCategory) r = r.filter(t => t.category === pageState.filterCategory);
  if (pageState.filterPriority) r = r.filter(t => t.priority === pageState.filterPriority);
  return r;
}

function renderCard(task) {
  const st = task.status || 'todo';
  const bc = st === 'todo' ? '#3b82f6' : st === 'in-progress' ? '#f59e0b' : '#10b981';
  const done = st === 'done' || task.done;

  // 父任务：右侧大按钮折叠 + 子任务列表
  if (task.isParent && task.subtasks && task.subtasks.length > 0) {
    const expanded = !!pageState.expandedParents[task.id];
    const subCount = task.subtasks.length;
    const completedCount = task.subtasks.filter(s => s.completed).length;
    return `
      <div class="kanban-card kanban-card-parent" draggable="true" data-id="${task.id}" data-status="${st}" style="border-left-color:${bc};">
        <div class="card-top">
          <span class="card-title" style="text-decoration:${done?'line-through':'none'};opacity:${done?0.6:1};flex:1;">${done?'✅ ':''}${esc(task.title)}</span>
          <button class="card-edit-btn" data-id="${task.id}" data-type="parent" title="编辑">✏️</button>
          <button class="card-del" data-id="${task.id}">✕</button>
        </div>
        <div class="card-meta">
          <span class="task-priority priority-${task.priority}">${priorityLabels[task.priority]||task.priority}</span>
          <span class="card-category">${categoryLabels[task.category]||task.category}</span>
          <span class="subtask-progress">${completedCount}/${subCount} 已完成</span>
        </div>
        <div class="parent-collapse-area">
          <span class="parent-collapse-btn" data-parent-id="${task.id}">${expanded ? '▼' : '▶'}</span>
          <span class="parent-subcount">${subCount}个子任务</span>
        </div>
        ${expanded ? `
        <div class="subtask-list">
          ${task.subtasks.map((sub, i) => `
            <label class="subtask-item" data-parent-id="${task.id}" data-sub-idx="${i}">
              <input type="checkbox" class="subtask-checkbox" data-parent-id="${task.id}" data-sub-idx="${i}" ${sub.completed ? 'checked' : ''}>
              <span class="subtask-title" style="text-decoration:${sub.completed ? 'line-through' : 'none'}; opacity:${sub.completed ? 0.6 : 1};">${esc(sub.title)}</span>
              <button class="subtask-edit-btn" data-parent-id="${task.id}" data-sub-idx="${i}" title="编辑子任务">✏️</button>
            </label>
          `).join('')}
        </div>
        ` : ''}
      </div>`;
  }

  // 普通任务
  return `
    <div class="kanban-card" draggable="true" data-id="${task.id}" data-status="${st}" style="border-left-color:${bc};">
      <div class="card-top">
        <span class="card-title" style="text-decoration:${done?'line-through':'none'};opacity:${done?0.6:1};">${done?'✅ ':''}${esc(task.title)}</span>
        <button class="card-edit-btn" data-id="${task.id}" data-type="normal" title="编辑">✏️</button>
        <button class="card-del" data-id="${task.id}">✕</button>
      </div>
      ${task.description?`<div class="card-desc">${esc(task.description)}</div>`:''}
      <div class="card-meta">
        <span class="task-priority priority-${task.priority}">${priorityLabels[task.priority]||task.priority}</span>
        <span class="card-category">${categoryLabels[task.category]||task.category}</span>
        ${task.date?`<span class="card-date">${formatDate(task.date)} ${task.time||''}</span>`:''}
      </div>
    </div>`;
}

// ============================================================
// 拖拽 — 简单可靠的实现
// ============================================================

export function onMount() {
  setupDrag();
  bindEvents();
  bindAIEvents();
  bindParentEvents();
  bindEditEvents();
}

function setupDrag() {
  const board = document.getElementById('kanban-board');
  if (!board) return;

  // 所有卡片: dragstart / dragend
  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.kanban-card');
    if (!card) return;
    draggedEl = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', card.dataset.id); } catch {}
  });

  board.addEventListener('dragend', () => {
    clearDrag();
  });

  // 所有列: dragover / drop
  board.querySelectorAll('.kanban-column').forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!col.classList.contains('drag-over')) col.classList.add('drag-over');

      // 显示插入指示线
      const body = col.querySelector('.column-body');
      if (!body) return;
      body.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      const cards = [...body.querySelectorAll('.kanban-card')];
      let before = null;
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { before = c; break; }
      }
      const ind = document.createElement('div');
      ind.className = 'drop-indicator';
      body.insertBefore(ind, before);
    });

    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
        col.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      }
    });

    col.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedEl) { clearDrag(); return; }

      const targetStatus = col.dataset.status;
      const body = col.querySelector('.column-body');
      if (!body) { clearDrag(); return; }

      // 获取插入位置
      const ind = body.querySelector('.drop-indicator');
      let ref = null;
      if (ind && ind.nextSibling && ind.nextSibling.classList?.contains('kanban-card')) {
        ref = ind.nextSibling;
      }
      if (ind) ind.remove();

      // 更新拖拽卡片的状态并移动到新位置
      const id = parseInt(draggedEl.dataset.id, 10);
      const wasStatus = draggedEl.dataset.status;

      draggedEl.dataset.status = targetStatus;
      const newBorder = targetStatus === 'todo' ? '#3b82f6' : targetStatus === 'in-progress' ? '#f59e0b' : '#10b981';
      draggedEl.style.borderLeftColor = newBorder;

      // 更新标题装饰
      const titleEl = draggedEl.querySelector('.card-title');
      if (titleEl) {
        if (targetStatus === 'done') {
          titleEl.style.textDecoration = 'line-through';
          titleEl.style.opacity = '0.6';
          if (!titleEl.textContent.trim().startsWith('✅')) titleEl.textContent = '✅ ' + titleEl.textContent.trim();
        } else {
          titleEl.style.textDecoration = 'none';
          titleEl.style.opacity = '1';
          titleEl.textContent = titleEl.textContent.replace(/^✅\s*/, '');
        }
      }

      // DOM 移动
      if (ref) {
        body.insertBefore(draggedEl, ref);
      } else {
        body.appendChild(draggedEl);
      }

      // ===== 核心：从 DOM 重建 tasks 数组并保存 =====
      const data = loadData();
      const taskMap = {};
      data.tasks.forEach(t => { taskMap[t.id] = t; });

      const newTasks = [];
      document.querySelectorAll('.kanban-card').forEach(card => {
        const tid = parseInt(card.dataset.id, 10);
        if (taskMap[tid]) {
          const t = taskMap[tid];
          // 更新 status 和 done
          const newStatus = card.dataset.status;
          t.status = newStatus;
          t.done = newStatus === 'done';
          newTasks.push(t);
          delete taskMap[tid];
        }
      });

      // 添加可能遗漏的任务（不会发生，但安全处理）
      Object.values(taskMap).forEach(t => newTasks.push(t));

      data.tasks = newTasks;
      saveData(data);

      // 更新列 UI
      updateColumnUI();

      // 如果跨列了（状态变化），也更新源列 UI
      if (wasStatus !== targetStatus) {
        updateColumnUI();
      }

      clearDrag();
    });
  });

  // 垃圾桶
  const bin = document.getElementById('trash-bin');
  if (bin) {
    bin.addEventListener('dragover', (e) => { e.preventDefault(); bin.classList.add('drag-over'); });
    bin.addEventListener('dragleave', () => bin.classList.remove('drag-over'));
    bin.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      bin.classList.remove('drag-over');
      if (!draggedEl) return;
      const id = parseInt(draggedEl.dataset.id, 10);
      if (id && !isNaN(id)) {
        draggedEl.remove();
        deleteTask(id);
        updateColumnUI();
        if (window.showToast) window.showToast('🗑️ 已删除', 'info');
      }
      clearDrag();
    });
  }

  // 删除按钮
  board.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-del');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (id && !isNaN(id)) confirmDelete(id);
  });
}

function clearDrag() {
  document.querySelectorAll('.kanban-card.dragging').forEach(c => c.classList.remove('dragging'));
  document.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
  document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
  document.getElementById('trash-bin')?.classList.remove('drag-over');
  draggedEl = null;
}

function updateColumnUI() {
  document.querySelectorAll('.kanban-column').forEach(col => {
    const body = col.querySelector('.column-body');
    const count = col.querySelector('.column-count');
    if (!body || !count) return;
    const cards = body.querySelectorAll('.kanban-card');
    count.textContent = cards.length;
    const empty = body.querySelector('.column-empty');
    if (cards.length === 0) {
      if (!empty) body.insertAdjacentHTML('beforeend', '<div class="column-empty">📭 拖拽任务到这里</div>');
    } else {
      if (empty) empty.remove();
    }
  });
}

function confirmDelete(taskId) {
  const data = loadData();
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return;
  const uid = Date.now();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>🗑️ 确认删除</h3>
      <p>确定要删除任务「${esc(task.title)}」吗？</p>
      <p style="font-size:12px;color:var(--text-light);">此操作不可恢复</p>
      <div class="modal-actions">
        <button class="btn btn-outline" id="mc-${uid}">取消</button>
        <button class="btn btn-danger" id="md-${uid}">确认删除</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('mc-' + uid).onclick = () => overlay.remove();
  document.getElementById('md-' + uid).onclick = () => {
    deleteTask(taskId);
    document.querySelector(`.kanban-card[data-id="${taskId}"]`)?.remove();
    overlay.remove();
    updateColumnUI();
    if (window.showToast) window.showToast('🗑️ 已删除', 'info');
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============================================================
// 常规事件绑定
// ============================================================

export function onLeave() { pageState.editingTask = null; }

function bindEvents() {
  document.getElementById('toggle-form-btn')?.addEventListener('click', () => {
    pageState.showForm = !pageState.showForm;
    pageState.editingTask = null;
    refreshCurrentPage();
  });

  const se = document.getElementById('search-input');
  const sb = document.getElementById('search-btn');
  function doSearch() { pageState.filterKeyword = se?.value.trim()||''; refreshCurrentPage(); }
  if (sb) sb.addEventListener('click', doSearch);
  if (se) se.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); doSearch(); } });

  document.getElementById('filter-category')?.addEventListener('change', function() { pageState.filterCategory=this.value; refreshCurrentPage(); });
  document.getElementById('filter-priority')?.addEventListener('change', function() { pageState.filterPriority=this.value; refreshCurrentPage(); });

  document.getElementById('task-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('tf-title').value.trim();
    if (!title) return alert('请输入任务名称');
    const td = {
      title,
      description: document.getElementById('tf-desc').value.trim(),
      date: document.getElementById('tf-date').value,
      time: document.getElementById('tf-time').value,
      priority: document.getElementById('tf-priority').value,
      category: document.getElementById('tf-category').value,
      status: document.getElementById('tf-status').value,
    };
    if (pageState.editingTask) { updateTask(pageState.editingTask.id, td); pageState.editingTask = null; }
    else { addTask(td); }
    pageState.showForm = false;
    refreshCurrentPage();
  });

  document.getElementById('cancel-edit-btn')?.addEventListener('click', () => { pageState.editingTask = null; refreshCurrentPage(); });
}

// ============================================================
// AI 辅助功能（增量追加，不修改拖拽代码）
// ============================================================

function bindAIEvents() {
  // 打开 AI 模态框
  document.getElementById('ai-assist-btn')?.addEventListener('click', () => {
    // 重置状态
    pageState.aiModalOpen = true;
    pageState.aiLoading = false;
    pageState.aiTaskDesc = '';
    pageState.aiSubtasks = [];
    pageState.aiModel = 'deepseek-v4-pro';

    // 直接通过 DOM 操作显示模态框
    const overlay = document.getElementById('ai-modal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      const input = document.getElementById('ai-task-input');
      if (input) { input.value = ''; input.focus(); }
    }
  });

  // 关闭 AI 模态框（× 按钮）
  document.getElementById('ai-modal-close-btn')?.addEventListener('click', closeAIModal);

  // 点击遮罩关闭
  document.getElementById('ai-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAIModal();
  });

  // 模型切换
  document.getElementById('ai-model-select')?.addEventListener('change', function() {
    pageState.aiModel = this.value;
  });

  // 输入框实时更新
  document.getElementById('ai-task-input')?.addEventListener('input', function() {
    pageState.aiTaskDesc = this.value;
  });

  // Enter 键触发拆分
  document.getElementById('ai-task-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSplit();
    }
  });

  // 拆分按钮
  document.getElementById('ai-split-btn')?.addEventListener('click', doSplit);

  // 子任务复选框变化
  document.getElementById('ai-subtask-list')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('ai-subtask-checkbox')) {
      updateSubtaskCount();
    }
  });

  // 一键加入看板
  document.getElementById('ai-add-to-board-btn')?.addEventListener('click', addSubtasksToBoard);
}

function closeAIModal() {
  pageState.aiModalOpen = false;
  pageState.aiSubtasks = [];
  const overlay = document.getElementById('ai-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function doSplit() {
  const input = document.getElementById('ai-task-input');
  if (!input) return;
  const desc = input.value.trim();
  if (!desc) {
    if (window.showToast) window.showToast('请输入任务描述', 'warning');
    return;
  }

  // 检查是否已配置 API
  const data = loadData();
  if (!data.settings.apiKey) {
    if (window.showToast) window.showToast('请先在设置中配置 AI 模型', 'warning');
    closeAIModal();
    // 跳转到设置页
    const { navigateTo } = await import('../main.js');
    navigateTo('settings');
    return;
  }

  pageState.aiLoading = true;
  pageState.aiTaskDesc = desc;
  const btn = document.getElementById('ai-split-btn');
  if (btn) btn.textContent = '拆分中...';
  if (btn) btn.disabled = true;

  try {
    const model = pageState.aiModel === 'custom' ? undefined : pageState.aiModel;
    const prompt = buildSplitPrompt(desc);
    const result = await callAI(prompt, model);

    // 解析结果：每行一个子任务
    const lines = result.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      // 去掉可能的编号前缀："1. 子任务"、"1、子任务"等
      .map(line => line.replace(/^\d+[\.\、\-\s]+/, ''));

    if (lines.length === 0) {
      throw new Error('未生成有效的子任务');
    }

    pageState.aiSubtasks = lines;

    // 通过刷新页面渲染子任务列表
    refreshCurrentPage();

    // 重新绑定 AI 事件（因为 DOM 被重新渲染了）
    bindAIEvents();

    if (window.showToast) window.showToast(`已生成 ${lines.length} 个子任务`, 'success');
  } catch (err) {
    if (window.showToast) window.showToast('拆分失败，请稍后重试', 'error');
    pageState.aiLoading = false;
    pageState.aiSubtasks = [];
    refreshCurrentPage();
    bindAIEvents();
  }
}

function updateSubtaskCount() {
  const checks = document.querySelectorAll('.ai-subtask-checkbox');
  const checked = [...checks].filter(c => c.checked).length;
  const countEl = document.getElementById('ai-subtask-count');
  if (countEl) countEl.textContent = `已选 ${checked} 个子任务`;
}

function addSubtasksToBoard() {
  const checks = document.querySelectorAll('.ai-subtask-checkbox:checked');
  const selected = [...checks].map(c => {
    const idx = parseInt(c.dataset.index, 10);
    return pageState.aiSubtasks[idx];
  }).filter(Boolean);

  if (selected.length === 0) {
    if (window.showToast) window.showToast('请选择至少一个子任务', 'warning');
    return;
  }

  // 使用大任务描述作为父任务标题
  const parentTitle = pageState.aiTaskDesc || '待拆解任务';
  addParentTask(parentTitle, selected);

  if (window.showToast) window.showToast(`已添加 ${selected.length} 个子任务`, 'success');
  closeAIModal();
  refreshCurrentPage();
}

// ============================================================
// 父任务展开/收起 + 子任务状态联动
// ============================================================

function bindParentEvents() {
  // 折叠按钮点击：展开/收起
  document.getElementById('kanban-board')?.addEventListener('click', (e) => {
    const collapseBtn = e.target.closest('.parent-collapse-btn');
    if (!collapseBtn) return;
    e.stopPropagation();

    const parentId = parseInt(collapseBtn.dataset.parentId, 10);
    if (isNaN(parentId)) return;

    const parentCard = collapseBtn.closest('.kanban-card-parent');
    if (!parentCard) return;

    const isNowExpanded = !pageState.expandedParents[parentId];
    pageState.expandedParents[parentId] = isNowExpanded;

    // 切换折叠图标 ▶ ↔ ▼
    collapseBtn.textContent = isNowExpanded ? '▼' : '▶';

    // 查找或创建/移除子任务列表
    let subList = parentCard.querySelector('.subtask-list');
    if (isNowExpanded) {
      if (!subList) {
        // 从 data-store 获取子任务数据
        const data = loadData();
        const parent = data.tasks.find(t => t.id === parentId);
        if (!parent || !parent.subtasks) return;

        const subListEl = document.createElement('div');
        subListEl.className = 'subtask-list';
        subListEl.innerHTML = parent.subtasks.map((sub, i) => `
          <label class="subtask-item">
            <input type="checkbox" class="subtask-checkbox" data-parent-id="${parentId}" data-sub-idx="${i}" ${sub.completed ? 'checked' : ''}>
            <span class="subtask-title" style="text-decoration:${sub.completed ? 'line-through' : 'none'}; opacity:${sub.completed ? 0.6 : 1};">${esc(sub.title)}</span>
          </label>
        `).join('');
        parentCard.appendChild(subListEl);
      }
    } else {
      if (subList) subList.remove();
    }
  });

  // 子任务复选框变化（DOM 操作 + 跨列移动，零闪烁）
  document.getElementById('kanban-board')?.addEventListener('change', (e) => {
    const checkbox = e.target.closest('.subtask-checkbox');
    if (!checkbox) return;
    // Bug 2 修复：阻断冒泡，防止事件冒泡到 board 或 card 级别意外触发表单/删除逻辑
    e.stopPropagation();

    const parentId = parseInt(checkbox.dataset.parentId, 10);
    const subIdx = parseInt(checkbox.dataset.subIdx, 10);
    if (isNaN(parentId) || isNaN(subIdx)) return;

    const data = loadData();
    const parent = data.tasks.find(t => t.id === parentId);
    if (!parent || !parent.subtasks || !parent.subtasks[subIdx]) return;

    // 记录操作前的全完成状态
    const wasAllDone = parent.subtasks.every(s => s.completed);

    // 更新子任务 completed 状态
    parent.subtasks[subIdx].completed = checkbox.checked;

    // 更新子任务标题样式（直接 DOM 操作）
    const label = checkbox.closest('.subtask-item');
    if (label) {
      const titleSpan = label.querySelector('.subtask-title');
      if (titleSpan) {
        titleSpan.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
        titleSpan.style.opacity = checkbox.checked ? '0.6' : '1';
      }
    }

    // 联动：所有子任务完成 → 父任务自动 done
    const allDone = parent.subtasks.every(s => s.completed);
    if (allDone) {
      parent.status = 'done';
      parent.done = true;
    } else {
      if (parent.status === 'done') {
        parent.status = 'todo';
        parent.done = false;
      }
    }

    saveData(data);

    // 更新父任务卡片的进度文字
    const parentCard = checkbox.closest('.kanban-card-parent');
    if (!parentCard) return;

    const progressEl = parentCard.querySelector('.subtask-progress');
    if (progressEl) {
      const completedCount = parent.subtasks.filter(s => s.completed).length;
      progressEl.textContent = `${completedCount}/${parent.subtasks.length} 已完成`;
    }

    // 更新父卡片标题装饰（done 线/图标）
    const titleEl = parentCard.querySelector('.card-title');
    if (titleEl) {
      if (allDone) {
        titleEl.style.textDecoration = 'line-through';
        titleEl.style.opacity = '0.6';
        if (!titleEl.textContent.trim().startsWith('✅')) titleEl.textContent = '✅ ' + titleEl.textContent.trim();
      } else if (parent.status !== 'done') {
        titleEl.style.textDecoration = 'none';
        titleEl.style.opacity = '1';
        titleEl.textContent = titleEl.textContent.replace(/^✅\s*/, '');
      }
    }

    // Bug 1 修复：跨列移动 — 状态变化时立即将卡片移动到对应的列
    const targetStatus = parent.status || 'todo';
    const currentCol = parentCard.closest('.kanban-column');
    const targetCol = document.querySelector(`.kanban-column[data-status="${targetStatus}"]`);
    if (currentCol && targetCol && currentCol !== targetCol) {
      // 更新父卡片 data-status 和左边框颜色
      parentCard.dataset.status = targetStatus;
      const newBorder = targetStatus === 'todo' ? '#3b82f6' : targetStatus === 'in-progress' ? '#f59e0b' : '#10b981';
      parentCard.style.borderLeftColor = newBorder;

      // 移动到目标列的 body 末尾
      const targetBody = targetCol.querySelector('.column-body');
      if (targetBody) {
        targetBody.appendChild(parentCard);
      }

      // 更新两列的计数和空状态
      updateColumnUI();
    }
  });
}

// ============================================================
// 编辑功能（增量追加）
// ============================================================

function bindEditEvents() {
  // 卡片编辑按钮
  document.getElementById('kanban-board')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.card-edit-btn');
    if (!editBtn) return;
    e.stopPropagation();

    const taskId = parseInt(editBtn.dataset.id, 10);
    if (isNaN(taskId)) return;

    const data = loadData();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;

    openEditModal(task, 'task');
  });

  // 子任务编辑按钮
  document.getElementById('kanban-board')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.subtask-edit-btn');
    if (!editBtn) return;
    e.stopPropagation();

    const parentId = parseInt(editBtn.dataset.parentId, 10);
    const subIdx = parseInt(editBtn.dataset.subIdx, 10);
    if (isNaN(parentId) || isNaN(subIdx)) return;

    const data = loadData();
    const parent = data.tasks.find(t => t.id === parentId);
    if (!parent || !parent.subtasks || !parent.subtasks[subIdx]) return;

    openSubEditModal(parent, subIdx);
  });

  // 编辑模态框保存按钮
  document.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('#edit-save-btn');
    if (!saveBtn) return;
    doEditSave();
  });

  // 编辑模态框取消按钮
  document.addEventListener('click', (e) => {
    const cancelBtn = e.target.closest('#edit-cancel-btn');
    if (!cancelBtn) return;
    closeEditModal();
  });
}

function openEditModal(task, type) {
  const existing = document.getElementById('edit-modal-overlay');
  if (existing) existing.remove();

  const isParent = type === 'parent' || task.isParent;
  const isReadonlyStatus = isParent && task.subtasks && task.subtasks.length > 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box edit-modal-box">
      <h3>✏️ 编辑任务</h3>
      <div class="form-group">
        <label>任务名称</label>
        <input type="text" id="edit-title" class="edit-input" value="${esc(task.title)}">
      </div>
      <div class="form-group">
        <label>优先级</label>
        <select id="edit-priority" class="edit-select">
          <option value="high" ${task.priority === 'high' ? 'selected' : ''}>高</option>
          <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>中</option>
          <option value="low" ${task.priority === 'low' ? 'selected' : ''}>低</option>
        </select>
      </div>
      <div class="form-group">
        <label>状态 ${isReadonlyStatus ? '(由子任务自动联动)' : ''}</label>
        ${isReadonlyStatus
          ? `<input type="text" class="edit-input" value="${task.status === 'done' ? '已完成' : task.status === 'in-progress' ? '进行中' : '待办'}" disabled style="opacity:0.6;">`
          : `<select id="edit-status" class="edit-select">
              <option value="todo" ${(task.status || 'todo') === 'todo' ? 'selected' : ''}>待办</option>
              <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>进行中</option>
              <option value="done" ${task.status === 'done' ? 'selected' : ''}>已完成</option>
            </select>`
        }
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" id="edit-cancel-btn">取消</button>
        <button class="btn btn-primary" id="edit-save-btn" data-task-id="${task.id}">💾 保存</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const titleInput = document.getElementById('edit-title');
  if (titleInput) setTimeout(() => titleInput.focus(), 100);
}

function openSubEditModal(parent, subIdx) {
  const sub = parent.subtasks[subIdx];
  const existing = document.getElementById('edit-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box edit-modal-box">
      <h3>✏️ 编辑子任务</h3>
      <p style="font-size:13px;color:var(--text-light);margin-bottom:12px;">父任务：${esc(parent.title)}</p>
      <div class="form-group">
        <label>子任务名称</label>
        <input type="text" id="edit-title" class="edit-input" value="${esc(sub.title)}">
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" id="edit-cancel-btn">取消</button>
        <button class="btn btn-primary" id="edit-save-btn" data-parent-id="${parent.id}" data-sub-idx="${subIdx}">💾 保存</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const titleInput = document.getElementById('edit-title');
  if (titleInput) setTimeout(() => titleInput.focus(), 100);
}

function doEditSave() {
  const saveBtn = document.getElementById('edit-save-btn');
  if (!saveBtn) return;
  const titleInput = document.getElementById('edit-title');
  if (!titleInput || !titleInput.value.trim()) {
    if (window.showToast) window.showToast('请输入任务名称', 'warning');
    return;
  }

  const taskId = parseInt(saveBtn.dataset.taskId, 10);
  const parentId = parseInt(saveBtn.dataset.parentId, 10);
  const subIdx = parseInt(saveBtn.dataset.subIdx, 10);

  const data = loadData();

  // 编辑子任务
  if (!isNaN(parentId) && !isNaN(subIdx)) {
    const parent = data.tasks.find(t => t.id === parentId);
    if (parent && parent.subtasks && parent.subtasks[subIdx]) {
      parent.subtasks[subIdx].title = titleInput.value.trim();
      saveData(data);
      closeEditModal();
      // 刷新父卡片子任务列表（DOM 操作）
      refreshCurrentPage();
      bindAIEvents();
      bindParentEvents();
      bindEditEvents();
      if (window.showToast) window.showToast('子任务已更新', 'success');
    }
    return;
  }

  // 编辑任务 / 父任务
  if (!isNaN(taskId)) {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.title = titleInput.value.trim();

    const priorityEl = document.getElementById('edit-priority');
    if (priorityEl) task.priority = priorityEl.value;

    // 父任务有子任务时，状态由联动控制，不手动修改
    const statusEl = document.getElementById('edit-status');
    if (statusEl && !(task.isParent && task.subtasks && task.subtasks.length > 0)) {
      const newStatus = statusEl.value;
      task.status = newStatus;
      task.done = newStatus === 'done';
    }

    saveData(data);
    closeEditModal();
    refreshCurrentPage();
    bindAIEvents();
    bindParentEvents();
    bindEditEvents();
    if (window.showToast) window.showToast('任务已更新', 'success');
  }
}

function closeEditModal() {
  const overlay = document.getElementById('edit-modal-overlay');
  if (overlay) overlay.remove();
}

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

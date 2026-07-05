/**
 * settings.js
 * 设置页——API 配置、主题切换、数据管理等。
 */

import { loadData, updateSettings, saveData, getTheme, toggleTheme } from '../store/data-store.js';
import { refreshCurrentPage } from '../main.js';

export function init() {}

export function render() {
  const data = loadData();
  const { settings, tasks } = data;
  const currentTheme = getTheme();

  return `
    <div class="page active">
      <div class="card">
        <h2>⚙️ 应用设置</h2>

        <!-- 主题切换 -->
        <h3 style="font-size: 15px; margin-bottom: 12px; margin-top: 8px;">🎨 主题设置</h3>
        <div class="setting-row">
          <span>🌗 夜间模式</span>
          <label class="toggle-switch">
            <input type="checkbox" id="theme-toggle" ${currentTheme === 'dark' ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- AI API 配置 -->
        <h3 style="font-size: 15px; margin-bottom: 12px; margin-top: 16px;">🤖 AI 接口配置</h3>
        <p style="font-size: 12px; color: var(--text-light); margin-bottom: 12px;">
          配置后可获取 AI 智能建议。支持 OpenAI 兼容接口（如 DeepSeek、GPT 等）。
        </p>
        <form id="settings-form">
          <div class="form-group">
            <label>API 地址</label>
            <input type="text" id="st-endpoint" value="${esc(settings.apiEndpoint)}" placeholder="https://api.deepseek.com/v1/chat/completions">
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input type="password" id="st-apikey" value="${esc(settings.apiKey)}" placeholder="sk-xxxxxxxxxxxxxxxx">
          </div>
          <div class="form-group">
            <label>模型名称</label>
            <input type="text" id="st-model" value="${esc(settings.model)}" placeholder="deepseek-chat">
          </div>
          <button type="submit" class="btn btn-primary" id="save-settings-btn">💾 保存设置</button>
        </form>
      </div>

      <!-- 数据管理 -->
      <div class="card">
        <h2>🗃️ 数据管理</h2>
        <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">
          当前共 ${tasks.length} 条任务记录，数据存储在浏览器本地（localStorage）。
        </p>
        <div class="flex-row" style="flex-wrap: wrap; gap: 8px;">
          <button class="btn btn-outline" id="export-data-btn">📤 导出数据</button>
          <button class="btn btn-outline" id="import-data-btn">📥 导入数据</button>
          <button class="btn btn-danger" id="clear-data-btn">🗑️ 清除所有数据</button>
        </div>
        <input type="file" id="import-file-input" accept=".json" style="display: none;">
      </div>

      <!-- 使用说明 -->
      <div class="card">
        <h2>📖 快速指南</h2>
        <ul style="font-size: 13px; color: var(--text-light); line-height: 2;">
          <li><strong>📋 任务</strong> — 创建、编辑和删除任务，支持分类和优先级</li>
          <li><strong>🧠 推荐</strong> — 智能排序告诉你先做什么，支持 AI 建议</li>
          <li><strong>👤 我的</strong> — 个人资料和学习统计</li>
          <li>数据全部保存在浏览器本地，不会上传到服务器</li>
          <li>AI 建议需要配置有效的 API Key</li>
        </ul>
      </div>
    </div>
  `;
}

export function onMount() {
  bindThemeToggle();
  bindSettingsForm();
  bindDataManagement();
}

function bindThemeToggle() {
  document.getElementById('theme-toggle')?.addEventListener('change', () => {
    toggleTheme();
    showToast('✅ 主题已切换');
  });
}

function bindSettingsForm() {
  document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    btn.disabled = true;
    btn.textContent = '⏳ 保存中...';
    updateSettings({
      apiEndpoint: document.getElementById('st-endpoint').value.trim(),
      apiKey: document.getElementById('st-apikey').value.trim(),
      model: document.getElementById('st-model').value.trim(),
    });
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存设置';
      showToast('✅ 设置已保存');
    }, 300);
  });
}

function bindDataManagement() {
  document.getElementById('export-data-btn')?.addEventListener('click', () => {
    const data = loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 数据已导出');
  });

  document.getElementById('import-data-btn')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });

  document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.tasks || !Array.isArray(imported.tasks)) throw new Error('数据格式无效');
        saveData(imported);
        showToast('✅ 数据导入成功');
        setTimeout(refreshCurrentPage, 500);
      } catch (err) {
        showToast('❌ 导入失败: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('确定清除所有数据吗？此操作不可恢复！')) {
      if (confirm('再次确认：所有任务将被删除！')) {
        localStorage.removeItem('decision_helper_data');
        showToast('🗑️ 数据已清除');
        setTimeout(refreshCurrentPage, 500);
      }
    }
  });
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
}

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
/**
 * toast.js
 * 全局 Toast 通知系统——支持四种类型、堆叠显示、自动消失。
 * 
 * 使用方式：
 *   showToast('保存成功', 'success');
 *   showToast('操作失败', 'error');
 *   showToast('请检查输入', 'warning');
 *   showToast('正在加载...', 'info');
 */

const typeConfig = {
  success: { bg: '#10b981', icon: '✅' },
  error:   { bg: '#ef4444', icon: '❌' },
  warning: { bg: '#f59e0b', icon: '⚠️' },
  info:    { bg: '#3b82f6', icon: 'ℹ️' },
};

let toastCount = 0;

/**
 * 显示一条 Toast 通知
 * @param {string} message - 提示文字
 * @param {'success'|'error'|'warning'|'info'} type - 类型，默认 info
 * @param {number} duration - 显示时长（毫秒），默认 2500
 */
export function showToast(message, type = 'info', duration = 2500) {
  const config = typeConfig[type] || typeConfig.info;
  const id = ++toastCount;

  const container = getOrCreateContainer();

  const el = document.createElement('div');
  el.className = 'toast-item';
  el.dataset.toastId = id;
  el.style.background = config.bg;
  el.innerHTML = `<span class="toast-icon">${config.icon}</span><span class="toast-msg">${escapeHtml(message)}</span>`;

  container.appendChild(el);

  // 入场动画
  requestAnimationFrame(() => {
    el.classList.add('show');
  });

  // 自动移除
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => {
      el.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, duration);

  return id;
}

function getOrCreateContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
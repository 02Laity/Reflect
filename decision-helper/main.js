/**
 * main.js
 * 应用入口——负责初始化、页面切换、全局 Toast、键盘快捷键。
 */

import { renderNavBar } from './components/nav-bar.js';
import { initTheme } from './store/data-store.js';
import { showToast } from './components/toast.js';

// 存储当前页面引用
let currentPage = 'home';

const pages = {};
async function loadPageModule(name) {
  const mod = await import(`./pages/${name}.js`);
  pages[name] = mod;
}

async function init() {
  // 初始化主题
  initTheme();

  // 预加载所有页面模块
  const pageNames = ['home', 'calendar', 'tasks', 'recommend', 'profile', 'settings'];
  await Promise.all(pageNames.map(n => loadPageModule(n)));

  // 渲染导航栏
  renderNavBar(currentPage, navigateTo);

  // 切换到首页
  navigateTo('home');
}

export function navigateTo(pageName) {
  const main = document.getElementById('main-content');
  if (!main) return;

  if (pages[currentPage] && pages[currentPage].onLeave) {
    pages[currentPage].onLeave();
  }

  currentPage = pageName;

  renderNavBar(currentPage, navigateTo);

  const mod = pages[pageName];
  if (mod && mod.init) mod.init();
  if (mod && mod.render) main.innerHTML = mod.render();
  if (mod && mod.onMount) mod.onMount();

  window.location.hash = pageName;
}

export function getCurrentPage() { return currentPage; }

export function refreshCurrentPage() { navigateTo(currentPage); }

// 监听 hash 变化
window.addEventListener('hashchange', () => {
  const page = window.location.hash.replace('#', '') || 'home';
  if (page !== currentPage) navigateTo(page);
});

// ============================================================
// 全局 Toast 挂载
// ============================================================
window.showToast = showToast;

// ============================================================
// 键盘快捷键
// ============================================================
document.addEventListener('keydown', (e) => {
  // 如果焦点在输入框中，不触发全局快捷键（Esc 除外）
  const tag = document.activeElement?.tagName || '';
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  // Esc：关闭模态框 / 取消编辑
  if (e.key === 'Escape') {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
      showToast('已取消', 'info', 1500);
      return;
    }
    // 如果有打开的编辑表单
    const formContainer = document.getElementById('task-form-container');
    if (formContainer && formContainer.style.display !== 'none') {
      // 触发收起按钮
      document.getElementById('toggle-form-btn')?.click();
      showToast('已取消编辑', 'info', 1500);
    }
    return;
  }

  // 如果在输入框中，以下快捷键不触发
  if (isInput) return;

  // Ctrl + Enter：提交当前页面的表单
  if (e.ctrlKey && e.key === 'Enter') {
    // 找到当前可见页面中的第一个表单并提交
    const activePage = document.querySelector('.page.active');
    if (activePage) {
      const form = activePage.querySelector('form');
      if (form) {
        form.requestSubmit();
        showToast('已提交', 'success', 1500);
        e.preventDefault();
      }
    }
    return;
  }

  // Ctrl + K：聚焦到搜索框（预留）
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.querySelector('input[type="search"], #search-input');
    if (searchInput) {
      searchInput.focus();
    } else {
      showToast('当前页面无搜索框', 'info', 1500);
    }
    return;
  }

  // N：新建任务（在任务看板页面时）
  if (e.key === 'n' && currentPage === 'tasks') {
    const btn = document.getElementById('toggle-form-btn');
    if (btn) {
      btn.click();
      showToast('新建任务', 'info', 1500);
    }
  }
});

// 启动
document.addEventListener('DOMContentLoaded', init);
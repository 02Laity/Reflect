/**
 * nav-bar.js
 * 侧边栏 + 移动端底部导航栏组件
 */

/**
 * 渲染导航栏（桌面侧边栏 + 移动端底部导航）
 * @param {string} currentPage - 当前激活的页面名称
 * @param {Function} onNavigate - 页面切换回调
 */
export function renderNavBar(currentPage, onNavigate) {
  const sidebar = document.getElementById('nav-bar');
  const bottomNav = document.getElementById('bottom-nav');

  const pages = [
    { id: 'home',       icon: '📊', label: '首页' },
    { id: 'calendar',   icon: '📅', label: '日历' },
    { id: 'tasks',      icon: '📋', label: '任务' },
    { id: 'recommend',  icon: '🧠', label: '推荐' },
    { id: 'profile',    icon: '👤', label: '我的' },
    { id: 'settings',   icon: '⚙️',  label: '设置' },
  ];

  // 渲染侧边栏（桌面端）
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="nav-brand">
        <span class="brand-icon">🪞</span>
        镜 Reflect
      </div>
      ${pages.map(p => `
        <button class="nav-item ${p.id === currentPage ? 'active' : ''}"
                data-page="${p.id}">
          <span class="nav-icon">${p.icon}</span>
          <span>${p.label}</span>
        </button>
      `).join('')}
      <div class="nav-footer">v1.0 · 任务管理</div>
    `;

    sidebar.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page !== currentPage) onNavigate(page);
      });
    });
  }

  // 渲染底部导航（移动端）
  if (bottomNav) {
    bottomNav.innerHTML = pages.map(p => `
      <button class="bottom-nav-item ${p.id === currentPage ? 'active' : ''}"
              data-page="${p.id}">
        <span class="bottom-nav-icon">${p.icon}</span>
        <span class="bottom-nav-label">${p.label}</span>
      </button>
    `).join('');

    bottomNav.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page !== currentPage) onNavigate(page);
      });
    });
  }
}

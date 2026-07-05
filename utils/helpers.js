/**
 * helpers.js
 * 通用工具函数
 */

/**
 * 生成短 UUID（用于临时 key 等场景）
 * @returns {string}
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 格式化日期为中文显示 (YYYY-MM-DD -> M月D日 周X)
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekdays[d.getDay()];
  return `${month}月${day}日 周${wd}`;
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 * @returns {string}
 */
export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 获取当前时间字符串 HH:MM
 * @returns {string}
 */
export function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 优先级中文映射
 */
export const priorityLabels = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

/**
 * 分类中文映射
 */
export const categoryLabels = {
  study: '学习',
  exam: '考试',
  homework: '作业',
  life: '生活',
  general: '通用',
};

/**
 * 针对任务生成简短的状态描述
 * @param {object} task
 * @returns {string}
 */
export function taskSummary(task) {
  const parts = [];
  if (task.done) parts.push('✅ 已完成');
  else parts.push('⏳ 待完成');
  if (task.date) parts.push(formatDate(task.date));
  if (task.time) parts.push(task.time);
  return parts.join(' · ');
}

/**
 * 深拷贝简单对象/数组
 * @param {*} obj
 * @returns {*}
 */
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
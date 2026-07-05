/**
 * data-store.js
 * 所有数据的读写中心，使用 localStorage 持久化。
 */

const STORAGE_KEY = 'decision_helper_data';
const THEME_KEY = 'decision_helper_theme';

function getDefaultData() {
  return {
    tasks: [],
    profile: {
      name: '学生',
      grade: '',
      school: '',
      interests: [],
      gender: '',
      age: '',
      occupation: '学生',
      mbti: '',
    },
    settings: {
      apiKey: '',
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      theme: 'light',
    },
    nextTaskId: 1,
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const p = JSON.parse(raw);
    const d = getDefaultData();
    return { ...d, ...p, settings: { ...d.settings, ...p.settings }, profile: { ...d.profile, ...p.profile } };
  } catch { return getDefaultData(); }
}

export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch (e) { console.error('保存数据失败:', e); }
}

export function getNextId() {
  const data = loadData();
  const id = data.nextTaskId;
  data.nextTaskId += 1;
  saveData(data);
  return id;
}

export function addTask(task) {
  const data = loadData();
  const maxOrder = data.tasks.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0);
  const id = getNextId();
  const newTask = {
    id, title: task.title || '未命名任务', description: task.description || '',
    date: task.date || '', time: task.time || '',
    priority: task.priority || 'medium', category: task.category || 'general',
    done: false, status: 'todo', sortOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };
  data.tasks.push(newTask);
  saveData(data);
  return newTask;
}

/**
 * 创建带子任务的父任务
 * @param {string} title - 父任务标题
 * @param {string[]} subtaskTitles - 子任务名称数组
 * @returns {object} 创建的父任务
 */
export function addParentTask(title, subtaskTitles) {
  const data = loadData();
  const id = data.nextTaskId;
  data.nextTaskId += 1;
  const parentTask = {
    id,
    title: title || '未命名任务',
    description: '',
    date: '',
    time: '',
    priority: 'medium',
    category: 'general',
    done: false,
    status: 'todo',
    sortOrder: data.tasks.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0) + 1,
    createdAt: new Date().toISOString(),
    isParent: true,
    subtasks: subtaskTitles.map((st, i) => ({
      id: `sub_${id}_${i}`,
      title: st,
      completed: false,
    })),
  };
  data.tasks.push(parentTask);
  saveData(data);
  return parentTask;
}

export function updateTask(id, updates) {
  const data = loadData();
  const idx = data.tasks.findIndex(t => t.id === id);
  if (idx === -1) return false;
  data.tasks[idx] = { ...data.tasks[idx], ...updates };
  saveData(data);
  return true;
}

export function deleteTask(id) {
  const data = loadData();
  data.tasks = data.tasks.filter(t => t.id !== id);
  saveData(data);
}

export function getTasks(filters = {}) {
  const data = loadData();
  let tasks = [...data.tasks];
  if (filters.category) tasks = tasks.filter(t => t.category === filters.category);
  if (filters.priority) tasks = tasks.filter(t => t.priority === filters.priority);
  if (filters.done !== undefined) tasks = tasks.filter(t => t.done === filters.done);
  if (filters.date) tasks = tasks.filter(t => t.date === filters.date);
  return tasks;
}

export function updateProfile(profile) {
  const data = loadData();
  data.profile = { ...data.profile, ...profile };
  saveData(data);
}

export function updateSettings(settings) {
  const data = loadData();
  data.settings = { ...data.settings, ...settings };
  saveData(data);
}

// ============================================================
// 主题管理
// ============================================================

export function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; }
  catch { return 'light'; }
}

export function applyTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { console.error('保存主题失败:', e); }
  document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme() {
  const theme = getTheme();
  applyTheme(theme);
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

// ============================================================
// MBTI 工具
// ============================================================

const mbtiDescriptions = {
  'INTJ': '建筑师型人格 — 独立、有策略、善于长远规划',
  'INTP': '逻辑学家型人格 — 理性、好奇、热爱思考',
  'ENTJ': '指挥官型人格 — 果断、高效、天生领导者',
  'ENTP': '辩论家型人格 — 聪明、好奇、喜欢挑战',
  'INFJ': '提倡者型人格 — 理想主义、有同理心、善于洞察',
  'INFP': '调停者型人格 — 敏感、理想化、富有创造力',
  'ENFJ': '主人公型人格 — 热情、有感染力、善于带领',
  'ENFP': '竞选者型人格 — 充满活力、有创造力、热爱社交',
  'ISTJ': '物流师型人格 — 务实、可靠、有条理',
  'ISFJ': '守卫者型人格 — 温暖、体贴、乐于助人',
  'ESTJ': '总经理型人格 — 高效、有组织、注重传统',
  'ESFJ': '执政官型人格 — 热心、友善、注重和谐',
  'ISTP': '鉴赏家型人格 — 灵活、冷静、善于动手',
  'ISFP': '探险家型人格 — 温柔、敏感、热爱艺术',
  'ESTP': '企业家型人格 — 精力充沛、善于社交、敢于冒险',
  'ESFP': '表演者型人格 — 活力四射、热爱生活、善于交际',
};

/**
 * 根据四个维度计算 MBTI
 * @param {string} e_i - 'E' 或 'I'
 * @param {string} s_n - 'S' 或 'N'
 * @param {string} t_f - 'T' 或 'F'
 * @param {string} j_p - 'J' 或 'P'
 * @returns {string} MBTI 类型如 'INTJ'
 */
export function calculateMBTI(e_i, s_n, t_f, j_p) {
  return (e_i || 'I') + (s_n || 'N') + (t_f || 'T') + (j_p || 'J');
}

/**
 * 获取 MBTI 描述
 * @param {string} mbti
 * @returns {string}
 */
export function getMBTIDescription(mbti) {
  return mbtiDescriptions[mbti] || '未知类型';
}
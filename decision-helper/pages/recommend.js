/**
 * recommend.js
 * 决策推荐页——活动推荐 + 任务排序 + AI 建议
 */

import { loadData } from '../store/data-store.js';
import { recommendActivity, recommend } from '../utils/recommend-engine.js';
import { createSliderInput } from '../components/slider-input.js';
import { navigateTo } from '../main.js';

// 活动推荐滑块
let activitySliders = {};
let activityResults = [];

// 任务推荐结果
let taskResults = [];

export function init() {
  const data = loadData();
  // 任务推荐
  taskResults = recommend(data.tasks, {
    urgencyWeight: data.settings.urgencyWeight || 80,
    importanceWeight: data.settings.importanceWeight || 60,
    timeWeight: data.settings.timeWeight || 50,
  });
}

export function render() {
  const data = loadData();
  const { settings, profile } = data;

  // ---- 用户画像摘要 ----
  const profileSummary = buildProfileSummary(profile);
  const isProfileComplete = (profile.interests && profile.interests.length > 0) || profile.gender || profile.age || profile.mbti;

  // ---- 活动推荐结果 ----
  let activityHtml = '';
  if (activityResults.length > 0) {
    activityHtml = `
      <div class="activity-results">
        ${activityResults.map((item, i) => {
          const { activity, percentage, reasons } = item;
          const barColor = percentage >= 80 ? 'var(--success)' : percentage >= 60 ? 'var(--warning)' : 'var(--primary-light)';
          return `
            <div class="activity-card">
              <div class="activity-header">
                <span class="activity-rank">#${i + 1}</span>
                <span class="activity-name">${escapeHtml(activity.name)}</span>
                <span class="activity-category">${activity.category}</span>
              </div>
              <div class="activity-match">
                <div class="match-bar">
                  <div class="match-fill" style="width: ${percentage}%; background: ${barColor};"></div>
                </div>
                <span class="match-pct" style="color: ${barColor};">${percentage}%</span>
              </div>
              <div class="activity-tags">
                ${activity.tags.map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
              <div class="activity-reasons">
                ${reasons.map(r => `<span>• ${r}</span>`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    activityHtml = '<div class="empty-state" style="padding: 24px 20px;"><div class="empty-icon" style="font-size: 36px;">🎯</div><p>调整滑块后点击「推荐活动」看看适合做什么</p></div>';
  }

  // 画像提示
  const profileHint = !isProfileComplete ? `
    <div class="profile-hint">
      💡 填写<a href="javascript:void(0)" onclick="switchToProfile()">详细用户画像</a>可获得更精准的个性化推荐
    </div>
  ` : '';

  return `
    <div class="page active">
      <div class="card">
        <h2>🎯 今天做什么？</h2>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">根据你现在的心情、精力和空闲时间，推荐适合的活动。</p>
        ${profileHint}
        ${profileSummary ? `<div class="profile-summary">👤 ${escapeHtml(profileSummary)}</div>` : ''}
        <div id="activity-slider-container"></div>
        <button class="btn btn-primary mt-16" id="recommend-activity-btn">🌟 推荐活动</button>
      </div>

      <div class="card" id="activity-results-card">
        <h2>📊 推荐活动</h2>
        ${activityHtml}
      </div>

      <div class="card">
        <h2>🤖 AI 智能建议</h2>
        <p style="color: var(--text-secondary); font-size: 13px;">基于任务和活动推荐，AI 可以帮你优化计划。</p>
        <div class="mt-8">
          <button class="btn btn-primary" id="ai-advice-btn">💡 获取 AI 建议</button>
          <span style="font-size: 12px; color: var(--text-light); margin-left: 8px;">${settings.apiKey ? '✅ 已配置 API' : '需在设置中配置 API Key'}</span>
        </div>
        <div id="ai-advice-result" style="display:none;" class="mt-16">
          <div class="card" style="background: var(--primary-bg);">
            <div id="ai-advice-content" style="white-space: pre-wrap; font-size: 14px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function onMount() {
  const data = loadData();

  // 创建活动推荐滑块
  const container = document.getElementById('activity-slider-container');
  if (container) {
    activitySliders.mood = createSliderInput(container, {
      label: '😊 心情',
      value: 50,
      onChange: () => {},
    });
    activitySliders.energy = createSliderInput(container, {
      label: '⚡ 精力',
      value: 50,
      onChange: () => {},
    });
    activitySliders.freeTime = createSliderInput(container, {
      label: '🕐 空闲时间',
      value: 50,
      onChange: () => {},
    });
  }

  // 推荐活动按钮
  const recBtn = document.getElementById('recommend-activity-btn');
  if (recBtn) {
    recBtn.addEventListener('click', () => {
      const mood = activitySliders.mood ? activitySliders.mood.getValue() : 50;
      const energy = activitySliders.energy ? activitySliders.energy.getValue() : 50;
      const freeTime = activitySliders.freeTime ? activitySliders.freeTime.getValue() : 50;
      const profile = loadData().profile;

      activityResults = recommendActivity(mood, energy, freeTime, profile, 5);

      // 重新渲染
      init();
      const main = document.getElementById('main-content');
      main.innerHTML = render();
      onMount();
    });
  }

  // AI 建议
  const aiBtn = document.getElementById('ai-advice-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', askAI);
  }
}

// ============================================================
// 用户画像摘要
// ============================================================
function buildProfileSummary(profile) {
  const parts = [];
  if (profile.name) parts.push(profile.name);
  if (profile.occupation) parts.push(profile.occupation);
  if (profile.age) parts.push(profile.age);
  if (profile.interests && profile.interests.length > 0) {
    parts.push('喜欢 ' + profile.interests.slice(0, 3).join('/'));
  }
  if (profile.mbti) parts.push(`MBTI: ${profile.mbti}`);
  return parts.length > 0 ? parts.join(' | ') : '';
}

// ============================================================
// 页面切换辅助
// ============================================================
// 暴露到 window 供内联 onclick 使用
window.switchToProfile = function() {
  navigateTo('profile');
};

// ============================================================
// AI 建议
// ============================================================
async function askAI() {
  const data = loadData();
  const { apiKey, apiEndpoint, model } = data.settings;

  if (!apiKey) {
    alert('请先在设置页面配置 API Key');
    navigateTo('settings');
    return;
  }

  const resultDiv = document.getElementById('ai-advice-result');
  const contentDiv = document.getElementById('ai-advice-content');

  resultDiv.style.display = 'block';
  contentDiv.textContent = '🤔 正在思考...';

  // 构建推荐摘要
  const topActivities = activityResults.slice(0, 3).map((item, i) =>
    `${i+1}. ${item.activity.name}（${item.percentage}% 匹配）`
  ).join('\n');

  const topTasks = taskResults.slice(0, 3).map((item, i) =>
    `${i+1}. ${item.task.title}（${item.score}分）`
  ).join('\n');

  const prompt = `你是一位学生学习规划助手。以下是用户当前的情况：

推荐的活动：
${topActivities || '暂无'}

待办任务（按优先级）：
${topTasks || '暂无'}

请给出建议：今天应该如何安排时间？哪些先做、哪些后做？`;

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个学生学习规划助手，用中文给出简短具体的建议。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const json = await response.json();
    contentDiv.textContent = json.choices?.[0]?.message?.content || '未获取到建议，请重试。';
  } catch (err) {
    contentDiv.textContent = `❌ 请求失败：${err.message}`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
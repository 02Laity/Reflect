/**
 * profile.js
 * 用户中心——个人资料（简化版）+ 可展开更多信息 + 统计。
 */

import { loadData, updateProfile, getTasks, calculateMBTI, getMBTIDescription } from '../store/data-store.js';
import { categoryLabels } from '../utils/helpers.js';
import { refreshCurrentPage } from '../main.js';

export function init() {}

export function render() {
  const data = loadData();
  const { profile, tasks } = data;

  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pending = total - done;
  const highPriority = tasks.filter(t => t.priority === 'high' && !t.done).length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const catCount = {};
  tasks.forEach(t => { const c = t.category || 'general'; catCount[c] = (catCount[c] || 0) + 1; });
  const catHtml = Object.entries(catCount).map(([k, v]) =>
    `<div class="flex-between" style="padding:6px 0;border-bottom:1px solid var(--border);"><span>${categoryLabels[k]||k}</span><span style="font-weight:600;">${v} 个</span></div>`
  ).join('');

  const mbti = profile.mbti || '';
  const mbtiDesc = mbti ? getMBTIDescription(mbti) : '';
  const savedAnswers = JSON.parse(localStorage.getItem('mbti_answers') || '{}');

  // 是否已填写更多信息（仅用于判断显示什么文字，不再用于控制默认展开）
  const hasExtra = profile.gender || profile.age || profile.occupation || (profile.interests && profile.interests.length > 0);

  return `
    <div class="page active">
      <!-- 基本信息 -->
      <div class="card">
        <h2>👤 个人资料</h2>
        <form id="profile-form">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" id="pf-name" value="${esc(profile.name||'')}" placeholder="你的昵称">
          </div>
          <div class="form-group">
            <label>学校</label>
            <input type="text" id="pf-school" value="${esc(profile.school||'')}" placeholder="就读学校">
          </div>

          <!-- MBTI 结果（只读展示） -->
          ${mbti ? `
          <div class="form-group">
            <label>🧠 性格类型</label>
            <div class="mbti-readonly">
              <span class="mbti-badge-sm">${mbti}</span>
              <span>${esc(mbtiDesc)}</span>
            </div>
          </div>` : ''}

          <!-- 展开/收起更多信息 -->
          <div class="expand-section">
            <div class="expand-toggle" id="toggle-extra" data-open="${hasExtra ? 'true' : 'false'}">
              <span>${hasExtra ? '📋 更多信息' : '➕ 展开更多信息'}</span>
              <span class="expand-icon">${hasExtra ? '▼' : '▶'}</span>
            </div>
            <div id="extra-fields" style="display: none;">
              <div class="flex-row" style="gap:12px;margin-top:12px;">
                <div class="form-group" style="flex:1;">
                  <label>性别</label>
                  <select id="pf-gender">
                    <option value="" ${!profile.gender?'selected':''}>请选择</option>
                    <option value="男" ${profile.gender==='男'?'selected':''}>男</option>
                    <option value="女" ${profile.gender==='女'?'selected':''}>女</option>
                    <option value="其他" ${profile.gender==='其他'?'selected':''}>其他</option>
                    <option value="不透露" ${profile.gender==='不透露'?'selected':''}>不透露</option>
                  </select>
                </div>
                <div class="form-group" style="flex:1;">
                  <label>年龄</label>
                  <select id="pf-age">
                    <option value="" ${!profile.age?'selected':''}>请选择</option>
                    <option value="18岁以下" ${profile.age==='18岁以下'?'selected':''}>18岁以下</option>
                    <option value="18-22岁" ${profile.age==='18-22岁'?'selected':''}>18-22岁</option>
                    <option value="23-27岁" ${profile.age==='23-27岁'?'selected':''}>23-27岁</option>
                    <option value="28-35岁" ${profile.age==='28-35岁'?'selected':''}>28-35岁</option>
                    <option value="35岁以上" ${profile.age==='35岁以上'?'selected':''}>35岁以上</option>
                  </select>
                </div>
                <div class="form-group" style="flex:1;">
                  <label>职业</label>
                  <select id="pf-occupation">
                    <option value="学生" ${(profile.occupation||'学生')==='学生'?'selected':''}>学生</option>
                    <option value="职场人士" ${profile.occupation==='职场人士'?'selected':''}>职场人士</option>
                    <option value="自由职业" ${profile.occupation==='自由职业'?'selected':''}>自由职业</option>
                    <option value="创业者" ${profile.occupation==='创业者'?'selected':''}>创业者</option>
                    <option value="其他" ${profile.occupation==='其他'?'selected':''}>其他</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>🎯 兴趣偏好（多选）</label>
                <div class="interest-grid">
                  ${['学习','运动','整理','娱乐','生活','社交','创意'].map(i =>
                    `<label class="interest-chip ${(profile.interests||[]).includes(i)?'selected':''}">
                      <input type="checkbox" value="${i}" ${(profile.interests||[]).includes(i)?'checked':''} class="interest-checkbox">${i}
                    </label>`
                  ).join('')}
                </div>
              </div>

              <!-- MBTI 速测（折叠内） -->
              <div class="form-group">
                <label>🧠 MBTI 速测</label>
                <div class="mbti-quiz">
                  <div class="mbti-question">
                    <span class="mbti-q-label">1. 你更喜欢？</span>
                    <div class="mbti-options">
                      <label class="mbti-option ${savedAnswers.q1==='E'?'selected':''}"><input type="radio" name="mbti-q1" value="E" ${savedAnswers.q1==='E'?'checked':''} onchange="window.updateMBTI()"> 和朋友一起</label>
                      <label class="mbti-option ${savedAnswers.q1==='I'?'selected':''}"><input type="radio" name="mbti-q1" value="I" ${savedAnswers.q1==='I'?'checked':''} onchange="window.updateMBTI()"> 独自待着</label>
                    </div>
                  </div>
                  <div class="mbti-question">
                    <span class="mbti-q-label">2. 你更关注？</span>
                    <div class="mbti-options">
                      <label class="mbti-option ${savedAnswers.q2==='S'?'selected':''}"><input type="radio" name="mbti-q2" value="S" ${savedAnswers.q2==='S'?'checked':''} onchange="window.updateMBTI()"> 具体细节</label>
                      <label class="mbti-option ${savedAnswers.q2==='N'?'selected':''}"><input type="radio" name="mbti-q2" value="N" ${savedAnswers.q2==='N'?'checked':''} onchange="window.updateMBTI()"> 整体概念</label>
                    </div>
                  </div>
                  <div class="mbti-question">
                    <span class="mbti-q-label">3. 做决定时更依赖？</span>
                    <div class="mbti-options">
                      <label class="mbti-option ${savedAnswers.q3==='T'?'selected':''}"><input type="radio" name="mbti-q3" value="T" ${savedAnswers.q3==='T'?'checked':''} onchange="window.updateMBTI()"> 逻辑分析</label>
                      <label class="mbti-option ${savedAnswers.q3==='F'?'selected':''}"><input type="radio" name="mbti-q3" value="F" ${savedAnswers.q3==='F'?'checked':''} onchange="window.updateMBTI()"> 个人感受</label>
                    </div>
                  </div>
                  <div class="mbti-question">
                    <span class="mbti-q-label">4. 你更喜欢？</span>
                    <div class="mbti-options">
                      <label class="mbti-option ${savedAnswers.q4==='J'?'selected':''}"><input type="radio" name="mbti-q4" value="J" ${savedAnswers.q4==='J'?'checked':''} onchange="window.updateMBTI()"> 按部就班</label>
                      <label class="mbti-option ${savedAnswers.q4==='P'?'selected':''}"><input type="radio" name="mbti-q4" value="P" ${savedAnswers.q4==='P'?'checked':''} onchange="window.updateMBTI()"> 灵活应变</label>
                    </div>
                  </div>
                  <div id="mbti-result" class="mbti-result">
                    ${mbti ? `<strong>${mbti}</strong> — ${esc(mbtiDesc)}` : '回答以上4题自动计算MBTI'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" id="save-profile-btn">💾 保存资料</button>
        </form>
      </div>

      <!-- 学习统计 -->
      <div class="card">
        <h2>📊 学习统计</h2>
        <div style="display:flex;gap:16px;text-align:center;flex-wrap:wrap;margin-bottom:16px;">
          <div class="stat-card"><div class="stat-value" style="color:var(--primary-light);">${total}</div><div class="stat-label">总任务</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--success);">${done}</div><div class="stat-label">已完成</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--warning);">${pending}</div><div class="stat-label">待完成</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--danger);">${highPriority}</div><div class="stat-label">高优</div></div>
        </div>
        <div class="flex-between" style="margin-bottom:4px;"><span style="font-size:13px;color:var(--text-secondary);">完成率</span><span style="font-weight:700;color:var(--primary-light);">${completionRate}%</span></div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${completionRate}%"></div></div>
        ${catHtml ? `<h3 style="font-size:15px;margin:16px 0 8px;">分类统计</h3>${catHtml}` : ''}
      </div>

      <div class="card"><h2>ℹ️ 关于</h2><p style="color:var(--text-secondary);font-size:13px;">决策与任务管理 v1.0</p></div>
    </div>
  `;
}

export function onMount() {
  // 兴趣标签点击切换高亮
  document.querySelectorAll('.interest-grid').forEach(grid => {
    grid.addEventListener('click', (e) => {
      const chip = e.target.closest('.interest-chip');
      if (!chip) return;
      // 让浏览器先更新 checkbox 状态，再同步 selected 类
      setTimeout(() => {
        const cb = chip.querySelector('.interest-checkbox');
        chip.classList.toggle('selected', cb.checked);
      }, 10);
    });
  });

  // 展开/收起
  document.getElementById('toggle-extra')?.addEventListener('click', () => {
    const f = document.getElementById('extra-fields');
    const icon = document.querySelector('.expand-icon');
    const label = document.querySelector('.expand-toggle span:first-child');
    if (f.style.display === 'none') {
      f.style.display = 'block';
      icon.textContent = '▼';
      label.textContent = '📋 收起更多信息';
    } else {
      f.style.display = 'none';
      icon.textContent = '▶';
      label.textContent = '➕ 展开更多信息';
    }
  });

  // 表单提交
  document.getElementById('profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.textContent = '⏳ 保存中...';

    const checked = document.querySelectorAll('.interest-checkbox:checked');
    const interests = Array.from(checked).map(cb => cb.value);
    const q1 = document.querySelector('input[name="mbti-q1"]:checked');
    const q2 = document.querySelector('input[name="mbti-q2"]:checked');
    const q3 = document.querySelector('input[name="mbti-q3"]:checked');
    const q4 = document.querySelector('input[name="mbti-q4"]:checked');
    let mbti = '';
    if (q1 && q2 && q3 && q4) mbti = calculateMBTI(q1.value, q2.value, q3.value, q4.value);

    updateProfile({
      name: document.getElementById('pf-name').value.trim(),
      school: document.getElementById('pf-school').value.trim(),
      grade: document.getElementById('pf-grade')?.value || '',
      gender: document.getElementById('pf-gender')?.value || '',
      age: document.getElementById('pf-age')?.value || '',
      occupation: document.getElementById('pf-occupation')?.value || '学生',
      interests,
      mbti,
    });

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存资料';
      if (window.showToast) window.showToast('✅ 资料已保存');
      refreshCurrentPage();
    }, 300);
  });
}

// 暴露 MBTI 更新到 window
window.updateMBTI = function() {
  const q1 = document.querySelector('input[name="mbti-q1"]:checked');
  const q2 = document.querySelector('input[name="mbti-q2"]:checked');
  const q3 = document.querySelector('input[name="mbti-q3"]:checked');
  const q4 = document.querySelector('input[name="mbti-q4"]:checked');
  if (q1 && q2 && q3 && q4) {
    const mbti = calculateMBTI(q1.value, q2.value, q3.value, q4.value);
    const desc = getMBTIDescription(mbti);
    const el = document.getElementById('mbti-result');
    if (el) el.innerHTML = `<strong>${mbti}</strong> — ${esc(desc)}`;
    localStorage.setItem('mbti_answers', JSON.stringify({ q1: q1.value, q2: q2.value, q3: q3.value, q4: q4.value }));
    document.querySelectorAll('.mbti-option').forEach(o => o.classList.remove('selected'));
    document.querySelectorAll('input[type="radio"]:checked').forEach(r => r.closest('.mbti-option')?.classList.add('selected'));
  }
};

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
/**
 * recommend-engine.js
 * 推荐引擎——活动库 + 画像增强推荐 + 任务排序。
 */

// ============================================================
// 活动库（贴近日常生活，7类，每类8-10条）
// ============================================================
const activityPool = [
  // ---- 📚 学习/自我提升（10条） ----
  { id: 1,  name: "背单词",       category: "学习", tags: ["独自","室内","专注"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"high",   suitableTime:"low" },
  { id: 2,  name: "整理课堂笔记",  category: "学习", tags: ["独自","室内","梳理"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 3,  name: "读一篇长文章",  category: "学习", tags: ["独自","室内","深度"], solo:true,  structured:false, suitableMood:"high",   suitableEnergy:"high",   suitableTime:"medium" },
  { id: 4,  name: "看一集TED演讲", category: "学习", tags: ["独自","室内","启发"], solo:true,  structured:false, suitableMood:"high",   suitableEnergy:"medium", suitableTime:"low" },
  { id: 5,  name: "刷一道算法题",  category: "学习", tags: ["独自","室内","挑战"], solo:true,  structured:true,  suitableMood:"high",   suitableEnergy:"high",   suitableTime:"low" },
  { id: 6,  name: "写一份周总结",  category: "学习", tags: ["独自","室内","复盘"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 7,  name: "整理电脑文件夹", category: "学习", tags: ["独自","室内","整理"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 8,  name: "读一封Newsletter", category:"学习", tags:["独自","室内","新知"], solo:true, structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
  { id: 9,  name: "看一门网课片段", category: "学习", tags: ["独自","室内","系统"], solo:true,  structured:true,  suitableMood:"high",   suitableEnergy:"high",   suitableTime:"medium" },
  { id: 10, name: "做一道错题回顾", category: "学习", tags: ["独自","室内","巩固"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"low" },

  // ---- 🏃 运动/健康（10条） ----
  { id: 11, name: "跑步20分钟",    category: "运动", tags: ["户外","独自","有氧"], solo:true,  structured:true,  suitableMood:"high",   suitableEnergy:"high",   suitableTime:"medium" },
  { id: 12, name: "做一组拉伸",    category: "运动", tags: ["室内","独自","放松"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 13, name: "下楼散步15分钟", category: "运动", tags: ["户外","独自","轻松"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"medium", suitableTime:"low" },
  { id: 14, name: "练一组肩颈放松", category: "运动", tags: ["室内","独自","舒缓"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 15, name: "靠墙站5分钟",   category: "运动", tags: ["室内","独自","矫正"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 16, name: "做一组深蹲",    category: "运动", tags: ["室内","独自","力量"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"high",   suitableTime:"low" },
  { id: 17, name: "跟视频跳操10分钟", category:"运动", tags:["室内","独自","燃脂"], solo:true, structured:true, suitableMood:"high", suitableEnergy:"high", suitableTime:"low" },
  { id: 18, name: "去操场走两圈",  category: "运动", tags: ["户外","独自","散步"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 19, name: "打一场羽毛球",  category: "运动", tags: ["室内","多人","对抗"], solo:false, structured:true, suitableMood:"high", suitableEnergy:"high", suitableTime:"medium" },
  { id: 20, name: "骑共享单车兜风", category:"运动", tags:["户外","独自","放松"], solo:true, structured:false, suitableMood:"high", suitableEnergy:"medium", suitableTime:"medium" },

  // ---- 🧹 整理/收纳（8条） ----
  { id: 21, name: "整理书桌",      category: "整理", tags: ["室内","独自","收纳"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"low" },
  { id: 22, name: "清空垃圾桶",    category: "整理", tags: ["室内","独自","清洁"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 23, name: "叠衣服",        category: "整理", tags: ["室内","独自","家务"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 24, name: "整理手机相册",  category: "整理", tags: ["室内","独自","数字"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
  { id: 25, name: "删掉50张截图",  category: "整理", tags: ["室内","独自","清理"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 26, name: "清理电脑桌面",  category: "整理", tags: ["室内","独自","数字"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
  { id: 27, name: "整理微信收藏",  category: "整理", tags: ["室内","独自","归档"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
  { id: 28, name: "刷一双鞋",      category: "整理", tags: ["室内","独自","清洁"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },

  // ---- 🎬 娱乐/放松（10条） ----
  { id: 29, name: "看一集喜欢的剧", category: "娱乐", tags: ["室内","独自","追剧"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"medium" },
  { id: 30, name: "听一张完整专辑", category: "娱乐", tags: ["室内","独自","音乐"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"medium" },
  { id: 31, name: "看一部短纪录片", category: "娱乐", tags: ["室内","独自","知识"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 32, name: "玩一局单机游戏", category: "娱乐", tags: ["室内","独自","游戏"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"medium" },
  { id: 33, name: "刷15分钟短视频", category: "娱乐", tags: ["室内","独自","碎片"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 34, name: "看一期综艺",    category: "娱乐", tags: ["室内","独自","搞笑"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"medium" },
  { id: 35, name: "读一篇短篇小说", category: "娱乐", tags: ["室内","独自","沉浸"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 36, name: "发呆听雨声",    category: "娱乐", tags: ["室内","独自","放空"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 37, name: "看一部老电影",  category: "娱乐", tags: ["室内","独自","经典"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"high" },
  { id: 38, name: "听一期播客",    category: "娱乐", tags: ["室内","独自","陪伴"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"medium" },

  // ---- 🍳 生活/技能（9条） ----
  { id: 39, name: "做一顿简单的饭", category: "生活", tags: ["室内","独自","烹饪"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 40, name: "泡一杯茶",      category: "生活", tags: ["室内","独自","慢活"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 41, name: "整理冰箱",      category: "生活", tags: ["室内","独自","收纳"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"low" },
  { id: 42, name: "写购物清单",    category: "生活", tags: ["室内","独自","规划"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
  { id: 43, name: "擦一遍桌面",    category: "生活", tags: ["室内","独自","清洁"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 44, name: "洗一次碗",      category: "生活", tags: ["室内","独自","家务"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 45, name: "种一盆植物",    category: "生活", tags: ["室内","独自","养护"], solo:true,  structured:true,  suitableMood:"high",   suitableEnergy:"medium", suitableTime:"medium" },
  { id: 46, name: "换一套床单",    category: "生活", tags: ["室内","独自","清洁"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"low" },
  { id: 47, name: "学一道新菜",    category: "生活", tags: ["室内","独自","烹饪"], solo:true,  structured:true,  suitableMood:"high",   suitableEnergy:"high",   suitableTime:"high" },

  // ---- ☕ 社交/情感（9条） ----
  { id: 48, name: "给朋友发问候消息", category:"社交", tags:["室内","独自","温暖"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 49, name: "给家人打一个电话", category:"社交", tags:["室内","独自","亲情"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"medium", suitableTime:"low" },
  { id: 50, name: "写一封手写信",  category: "社交", tags: ["室内","独自","真挚"], solo:true,  structured:true,  suitableMood:"low",    suitableEnergy:"low",    suitableTime:"medium" },
  { id: 51, name: "翻看老照片",    category: "社交", tags: ["室内","独自","怀旧"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 52, name: "和朋友散步聊天", category: "社交", tags: ["户外","多人","轻松"], solo:false, structured:false, suitableMood:"high", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 53, name: "发一条朋友圈",  category: "社交", tags: ["室内","独自","分享"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
  { id: 54, name: "约朋友吃饭",    category: "社交", tags: ["室内","多人","聚餐"], solo:false, structured:false, suitableMood:"high", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 55, name: "参加线下活动",  category: "社交", tags: ["室内","多人","社交"], solo:false, structured:true,  suitableMood:"high",   suitableEnergy:"high",   suitableTime:"high" },
  { id: 56, name: "和室友聊聊天",  category: "社交", tags: ["室内","多人","陪伴"], solo:false, structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },

  // ---- 🎨 创意/输出（8条） ----
  { id: 57, name: "写一篇日记",    category: "创意", tags: ["室内","独自","记录"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"low" },
  { id: 58, name: "画一幅简笔画",  category: "创意", tags: ["室内","独自","创作"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
  { id: 59, name: "拍一张有构图的照片", category:"创意", tags:["户外","独自","观察"], solo:true, structured:false, suitableMood:"medium", suitableEnergy:"medium", suitableTime:"low" },
  { id: 60, name: "做一次复盘笔记", category: "创意", tags: ["室内","独自","反思"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 61, name: "写一首短诗",    category: "创意", tags: ["室内","独自","文艺"], solo:true,  structured:false, suitableMood:"low",    suitableEnergy:"low",    suitableTime:"medium" },
  { id: 62, name: "做一份手账",    category: "创意", tags: ["室内","独自","手工"], solo:true,  structured:true,  suitableMood:"medium", suitableEnergy:"medium", suitableTime:"medium" },
  { id: 63, name: "剪一段15秒视频", category: "创意", tags: ["室内","独自","剪辑"], solo:true,  structured:false, suitableMood:"high",   suitableEnergy:"medium", suitableTime:"medium" },
  { id: 64, name: "写一个豆瓣短评", category: "创意", tags: ["室内","独自","表达"], solo:true,  structured:false, suitableMood:"medium", suitableEnergy:"low",    suitableTime:"low" },
];

export function getAllActivities() { return [...activityPool]; }

// ============================================================
// 推荐算法（画像增强）
// ============================================================
function mapLevel(value) {
  if (value <= 33) return 'low';
  if (value <= 66) return 'medium';
  return 'high';
}

/**
 * 根据心情、精力、空闲度 + 画像推荐活动
 */
export function recommendActivity(mood = 50, energy = 50, freeTime = 50, profile = {}, count = 5) {
  const moodLevel = mapLevel(mood);
  const energyLevel = mapLevel(energy);
  const timeLevel = mapLevel(freeTime);
  const interests = profile.interests || [];
  const mbti = profile.mbti || '';

  const maxPossible = 5; // 基础3 + 兴趣1 + MBTI1

  const scored = activityPool.map(activity => {
    let score = 0;
    const reasons = [];

    // 心情匹配（+1）
    if (activity.suitableMood === moodLevel) {
      score += 1;
      if (moodLevel === 'high') reasons.push('心情好，适合做点有劲的事');
      else if (moodLevel === 'low') reasons.push('心情一般，做点舒缓的事调节');
      else reasons.push('心情平稳，适合这个活动');
    }

    // 精力匹配（+1）
    if (activity.suitableEnergy === energyLevel) {
      score += 1;
      if (energyLevel === 'high') reasons.push('精力充沛，适合这个活动');
      else if (energyLevel === 'low') reasons.push('精力不足，这个活动不耗能');
      else reasons.push('精力适中，刚好合适');
    }

    // 时间匹配（+1）
    if (activity.suitableTime === timeLevel) {
      score += 1;
      if (timeLevel === 'high') reasons.push('时间充裕，可以慢慢享受');
      else if (timeLevel === 'low') reasons.push('时间紧张，这个活动耗时短');
      else reasons.push('时间刚好够');
    }

    // 兴趣偏好加分（+1）
    if (interests.length > 0 && interests.includes(activity.category)) {
      score += 1;
      reasons.push('匹配你的兴趣方向');
    }

    // MBTI 匹配（+1）
    if (mbti) {
      const firstChar = mbti[0]; // E / I
      if (firstChar === 'I' && activity.solo) {
        score += 1;
        reasons.push('内向型（I）适合独自活动');
      } else if (firstChar === 'E' && !activity.solo) {
        score += 1;
        reasons.push('外向型（E）推荐社交活动');
      }
      // J/P 匹配
      const fourthChar = mbti[3];
      if (fourthChar === 'J' && activity.structured) {
        score += 1;
        reasons.push('计划型（J）适合有步骤的活动');
      } else if (fourthChar === 'P' && !activity.structured) {
        score += 1;
        reasons.push('随性型（P）适合灵活活动');
      }
    }

    // 去重原因
    const uniqueReasons = [...new Set(reasons)];

    const percentage = maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0;

    return { activity, score, maxScore: maxPossible, percentage, reasons: uniqueReasons };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5;
  });

  return scored.slice(0, count);
}

// ============================================================
// 任务推荐（保留原有）
// ============================================================
export function recommend(tasks, options = {}) {
  const { urgencyWeight = 80, importanceWeight = 60, timeWeight = 50 } = options;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const scored = tasks.filter(t => !t.done).map(task => {
    const score = computeTaskScore(task, { now, today, urgencyWeight, importanceWeight, timeWeight });
    const reasons = generateTaskReasons(task, score, { now, today });
    return { task, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function computeTaskScore(task, { now, today, urgencyWeight, importanceWeight, timeWeight }) {
  let score = 0;
  if (task.date) {
    const dueDate = new Date(task.date + 'T23:59:59');
    const diffDays = (dueDate - now) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) score += urgencyWeight * 1.0;
    else if (diffDays <= 1) score += urgencyWeight * 0.9;
    else if (diffDays <= 3) score += urgencyWeight * 0.6;
    else if (diffDays <= 7) score += urgencyWeight * 0.3;
    else score += urgencyWeight * 0.1;
  } else score += urgencyWeight * 0.2;
  const pm = { high: 1.0, medium: 0.6, low: 0.3 };
  score += importanceWeight * (pm[task.priority] || 0.5);
  if (task.time) {
    const [h] = task.time.split(':').map(Number);
    if (h >= 8 && h <= 22) score += timeWeight * 0.8;
    else if (h >= 6) score += timeWeight * 0.4;
    else score += timeWeight * 0.1;
  } else score += timeWeight * 0.5;
  return Math.round(Math.min(score, 100));
}

function generateTaskReasons(task, score, { now, today }) {
  const reasons = [];
  if (task.date) {
    const dueDate = new Date(task.date + 'T23:59:59');
    const diffDays = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) reasons.push(`已逾期 ${Math.abs(diffDays)} 天`);
    else if (diffDays === 0) reasons.push('今天截止！');
    else if (diffDays === 1) reasons.push('明天截止');
    else if (diffDays <= 3) reasons.push(`${diffDays} 天后截止`);
    else reasons.push(`还有 ${diffDays} 天`);
  } else reasons.push('建议设截止日期');
  if (task.priority === 'high') reasons.push('高优先级');
  else if (task.priority === 'low') reasons.push('低优先级');
  if (score >= 80) reasons.push('强烈建议立即做');
  else if (score >= 60) reasons.push('建议尽快安排');
  else reasons.push('空闲时处理');
  return reasons;
}

export function detectConflicts(tasks, date) {
  const dayTasks = tasks.filter(t => t.date === date && !t.done && t.time);
  const conflicts = [];
  for (let i = 0; i < dayTasks.length; i++) {
    for (let j = i + 1; j < dayTasks.length; j++) {
      const a = dayTasks[i], b = dayTasks[j];
      if (a.time === b.time) conflicts.push([a, b]);
    }
  }
  return conflicts;
}

export function dailySummary(tasks, date) {
  const dt = tasks.filter(t => t.date === date);
  return { total: dt.length, done: dt.filter(t => t.done).length, pending: dt.filter(t => !t.done).length, highPriority: dt.filter(t => t.priority === 'high' && !t.done).length };
}
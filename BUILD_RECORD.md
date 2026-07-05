# BUILD_RECORD.md

## 需求摘要

构建一个面向学生的「决策与任务管理」纯前端 Web 应用，采用 ES Module 模块化架构。核心功能包括：每日计划增删改查、智能推荐排序（基于紧迫性/重要性/时间可行性）、AI 辅助建议（通过 OpenAI 兼容 API）、个人信息管理、数据导入导出。所有数据存储在浏览器 localStorage 中，无需后端服务器。

## 项目结构

```
decision-helper/
├── index.html              # 入口页面，importmap 映射所有模块
├── main.js                 # 应用入口，页面切换与全局状态管理
├── styles.css              # 全局样式（CSS 变量、卡片、表单、导航等）
├── assets/.gitkeep         # 静态资源占位
├── components/
│   ├── nav-bar.js          # 底部导航栏组件（5 个页面入口）
│   ├── task-card.js        # 任务卡片组件（渲染、完成/删除按钮）
│   └── slider-input.js     # 0-100 滑块组件（可自定义标签、值变化回调）
├── pages/
│   ├── home.js             # 首页（今日概览、进度统计、快速添加、冲突预警）
│   ├── tasks.js            # 任务看板（增删改查、筛选、排序、编辑）
│   ├── recommend.js        # 决策推荐（推荐排序、权重滑块、AI 建议）
│   ├── profile.js          # 个人中心（昵称/学校/年级、学习统计、分类统计）
│   └── settings.js         # 设置（API Key/Endpoint/Model、数据导入导出/清除）
├── store/
│   └── data-store.js       # 数据管理层（localStorage 读写、CRUD 操作）
└── utils/
    ├── helpers.js           # 通用工具函数（日期格式化、优先级映射等）
    ├── api.js               # AI API 调用封装
    └── recommend-engine.js  # 推荐引擎（评分算法、冲突检测、每日摘要）
```

## 新增/修改文件

| 文件 | 类型 | 说明 |
|------|------|------|
| index.html | 修改 | importmap 新增 api.js 映射 |
| main.js | 新增 | 应用入口、页面切换、hash 监听 |
| styles.css | 修改 | 新增 AI 模态框、按钮、子任务列表样式 |
| store/data-store.js | 修改 | 新增 addParentTask 函数，支持 isParent+subtasks 层级结构 |
| utils/helpers.js | 新增 | 日期/优先级/分类工具函数 |
| utils/api.js | 新增 | AI API 调用封装（callAI + buildSplitPrompt） |
| utils/recommend-engine.js | 新增 | 推荐评分算法 + 冲突检测 + 每日摘要 |
| components/nav-bar.js | 新增 | 导航栏渲染与事件绑定 |
| components/task-card.js | 新增 | 任务卡片 HTML 渲染 |
| components/slider-input.js | 新增 | 可复用的滑块组件 |
| pages/home.js | 新增 | 首页（init/render/onMount/onLeave） |
| pages/tasks.js | 修改 | 新增父任务折叠/展开、子任务复选框状态联动、进度显示；AI 拆分改为创建层级父任务（未改动拖拽代码） |
| pages/recommend.js | 新增 | 推荐页（权重调整 + AI 建议） |
| pages/profile.js | 新增 | 个人资料 + 学习统计 |
| pages/settings.js | 新增 | API 配置 + 数据导入导出 |
| assets/.gitkeep | 新增 | 资源目录占位 |

## 改动逻辑

1. **模块化架构**：所有 JS 文件使用 ES Module (export/import)，通过 importmap 解析路径。
2. **数据流**：所有数据读写必须通过 `store/data-store.js` 的 `loadData()` / `saveData()`，统一管理 localStorage。
3. **页面生命周期**：每个页面模块导出 `init()`、`render()`、`onMount()`、`onLeave()` 四个函数，由 `main.js` 统一调度。
4. **推荐引擎**：`utils/recommend-engine.js` 完全独立，接收任务数组和权重参数，返回评分结果，与页面解耦。
5. **AI 集成**：
   - `pages/recommend.js` 通过 fetch 调用 OpenAI 兼容 API
   - `utils/api.js` 通用 API 调用封装，支持模型名覆写
   - `pages/tasks.js` AI 任务拆解功能（增量追加，不修改拖拽代码）
6. **UI 设计**：CSS 变量主题、响应式网格布局、平滑动画、空状态和错误处理覆盖。

## AI 任务拆解 + 层级结构（2026-07-05 新增）

**新增文件**：
- `utils/api.js` — 封装 `callAI(prompt, modelOverride)` 函数，从 localStorage 读取 API 配置，调用 OpenAI 兼容接口

**修改文件**：
- `index.html` — importmap 新增 `./utils/api.js` 映射
- `pages/tasks.js` — 增量追加（不修改拖拽代码）：
  - 页面顶部新增「🤖 AI 辅助」按钮（渐变紫蓝样式）
  - 页面底部新增 AI 模态框（输入框 + 13 模型下拉 + 拆分按钮 + 子任务列表 + 一键加入）
  - `onMount()` 新增 `bindAIEvents()` + `bindParentEvents()`
  - `pageState` 新增 `expandedParents` 展开状态字典
  - `renderCard()` 扩展：父任务显示折叠图标 ▶/▼、进度文字 "X/Y 已完成"、子任务列表
  - 新增 `bindAIEvents()` / `bindParentEvents()`（处理折叠展开、子任务复选框、全完成→自动done联动）
  - `addSubtasksToBoard()` 改为调用 `addParentTask()` 创建层级父任务
- `store/data-store.js` — 新增 `addParentTask(title, subtaskTitles)` 导出函数
- `styles.css` — 新增 `.kanban-card-parent` / `.card-collapse-icon` / `.subtask-progress` / `.subtask-list` / `.subtask-item` 等层级结构样式

**交互流程**：
1. 用户点击「AI 辅助」→ 模态框弹出
2. 输入大任务描述 → 选择模型 → 点击「拆分」
3. 拆分中按钮禁用并显示「拆分中...」
4. 拆分完成后子任务列表区域展开，默认全选
5. 点击「一键加入看板」→ 创建父任务（`isParent: true`）+ 子任务数组 → Toast → 关闭模态框
6. 看板中父任务显示为卡片，左侧有折叠图标 ▶，标题右侧显示进度 "0/5 已完成"
7. 点击 ▶ 展开子任务列表（缩进显示），每个子任务带复选框
8. 勾选子任务 → 自动更新 localStorage → 所有子任务完成时父任务自动变为 done

**数据模型**：
```javascript
{ // 父任务
  id: 123, title: "准备英语六级",
  isParent: true,
  subtasks: [
    { id: "sub_123_0", title: "背单词", completed: false },
    { id: "sub_123_1", title: "做真题", completed: false },
  ],
  status: "todo", priority: "medium", ...
}
```

**状态联动规则**：
- 所有子任务 completed → 父任务自动变为 done
- 取消子任务勾选且父任务为 done 时 → 父任务恢复为 todo
- 展开/收起状态仅存内存（`pageState.expandedParents`），刷新后收起

**13 个预置模型**（分 7 组）：DeepSeek（3）、OpenAI（2）、智谱GLM（2）、月之暗面（2）、阿里千问（2）、Google（1）、Anthropic（1）、自定义

## 风险备注

- AI 功能需要用户自行配置有效的 API Key，否则不可用
- 所有数据存储在浏览器 localStorage，清除浏览器数据会导致丢失（提供导入/导出功能作为备份手段）
- 浏览器需支持 ES Module 和 importmap（现代浏览器 Chrome/Edge/Firefox/Safari 均可）
- 未使用任何第三方依赖库，纯原生 JS 实现
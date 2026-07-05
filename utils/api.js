/**
 * api.js
 * AI API 调用封装——从设置中读取配置，调用 OpenAI 兼容接口。
 */

import { loadData } from '../store/data-store.js';

/**
 * 调用 AI 模型
 * @param {string} prompt - 发送给模型的提示文本
 * @param {string} [modelOverride] - 可选，覆盖模型名称
 * @returns {Promise<string>} 模型返回的文本内容
 */
export async function callAI(prompt, modelOverride) {
  const data = loadData();
  const { settings } = data;

  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 AI 模型');
  }

  const baseUrl = settings.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  const model = modelOverride || settings.model || 'deepseek-chat';

  // 创建 AbortController 实现 15 秒超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw new Error(`网络请求失败: ${fetchErr.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`API 请求失败 (${response.status}): ${errText || response.statusText}`);
  }

  const result = await response.json();

  // OpenAI 兼容格式
  if (result.choices && result.choices.length > 0) {
    const content = result.choices[0].message?.content || result.choices[0].text || '';
    return content.trim();
  }

  throw new Error('API 返回格式异常');
}

/**
 * 任务拆解 prompt 模板
 */
export function buildSplitPrompt(taskDescription) {
  return `请将以下任务拆解为 3-8 个具体、可执行的子任务，用中文输出，每行一个子任务，不要带编号：任务描述：${taskDescription}`;
}
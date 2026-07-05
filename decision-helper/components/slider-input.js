/**
 * slider-input.js
 * 滑块组件（0-100），支持传入值变化回调。
 * 纯 UI 组件，不耦合业务逻辑。
 */

/**
 * 创建滑块组件 DOM 并挂载到父容器
 * @param {HTMLElement} container - 父容器
 * @param {object} options
 * @param {string}   options.label    - 左侧标签文字
 * @param {number}   options.value    - 初始值 (0-100)
 * @param {number}   options.min      - 最小值（默认 0）
 * @param {number}   options.max      - 最大值（默认 100）
 * @param {Function} options.onChange - 值变化回调 (newValue) => {}
 * @returns {object} { setValue, getValue, element } 控制句柄
 */
export function createSliderInput(container, options = {}) {
  const {
    label = '',
    value = 50,
    min = 0,
    max = 100,
    onChange = null,
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';

  wrapper.innerHTML = `
    ${label ? `<label>${label}</label>` : ''}
    <div class="slider-wrap">
      <input type="range" min="${min}" max="${max}" value="${value}" class="slider-input">
      <span class="slider-value">${value}</span>
    </div>
  `;

  const input = wrapper.querySelector('.slider-input');
  const valueDisplay = wrapper.querySelector('.slider-value');

  input.addEventListener('input', () => {
    const v = parseInt(input.value, 10);
    valueDisplay.textContent = v;
    if (onChange) onChange(v);
  });

  container.appendChild(wrapper);

  return {
    setValue(v) {
      const clamped = Math.max(min, Math.min(max, v));
      input.value = clamped;
      valueDisplay.textContent = clamped;
    },
    getValue() {
      return parseInt(input.value, 10);
    },
    element: wrapper,
  };
}
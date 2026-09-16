import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Geist 走 npm 包自托管（不使用 Google Fonts 的 <link>），
// 只负责拉丁字符与数字；中文字形由 index.css 里的系统 CJK 栈承担。
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

import './index.css'
import App from './App'

const container = document.getElementById('root')

if (!container) {
  throw new Error('找不到 #root 挂载点，请检查 index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

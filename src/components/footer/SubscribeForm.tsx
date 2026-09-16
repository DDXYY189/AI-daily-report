import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { Button } from '../ui/Button'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 邮件订阅表单，四种状态都实现了：
 *   idle / submitting / error / success
 *
 * 可访问性：label 在输入框上方（不用 placeholder 充当标签），
 * 错误用 role="alert" 播报并写回 aria-invalid，
 * 输入框、占位符、辅助文案的对比度均按 WCAG AA 核算过。
 */
export function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = email.trim()

    if (!EMAIL_PATTERN.test(value)) {
      setState('error')
      setMessage('邮箱格式看起来不对，请检查后再试一次。')
      return
    }

    setState('submitting')
    setMessage('')

    // 预览期模拟提交：接真实接口时把这行换成 fetch，并按响应设置 state
    await new Promise((resolve) => window.setTimeout(resolve, 900))

    setState('success')
    setMessage('订阅成功，确认邮件会稍后送达。')
  }

  const isError = state === 'error'
  const isSuccess = state === 'success'

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-panel border border-line bg-surface p-6 lg:p-7"
    >
      <label htmlFor="subscribe-email" className="block text-sm text-fg-muted">
        邮箱地址
      </label>

      <input
        id="subscribe-email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value)
          if (state !== 'idle') {
            setState('idle')
            setMessage('')
          }
        }}
        aria-invalid={isError}
        aria-describedby="subscribe-help"
        placeholder="you@example.com"
        disabled={state === 'submitting' || isSuccess}
        className={`mt-2 h-11 w-full rounded-control border bg-abyss px-3 text-sm text-fg transition-colors duration-200 placeholder:text-fg-dim disabled:opacity-60 ${
          isError ? 'border-danger' : 'border-line-2 focus:border-accent-dim'
        }`}
      />

      <p id="subscribe-help" className="mt-2 text-xs text-fg-dim">
        每天早上八点发送，随时可退订。
      </p>

      {isError && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <CircleAlert size={13} strokeWidth={1.7} aria-hidden="true" />
          {message}
        </p>
      )}

      {isSuccess && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-accent">
          <Check size={13} strokeWidth={1.7} aria-hidden="true" />
          {message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-5 w-full"
        disabled={state === 'submitting' || isSuccess}
      >
        {state === 'submitting' ? '订阅中' : isSuccess ? '已订阅' : '订阅今日日报'}
      </Button>
    </form>
  )
}

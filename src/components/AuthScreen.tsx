import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type AuthScreenProps = {
  onError: (message: string) => void
}

export function AuthScreen({ onError }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'error' | 'success' | ''>('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      const message = 'Supabase не настроен. Проверьте .env и перезапустите приложение.'
      onError(message)
      setStatusType('error')
      setStatusMessage(message)
      return
    }

    const normalizedEmail = email.trim()

    if (!normalizedEmail || !password) {
      const message = 'Введите email и пароль.'
      onError(message)
      setStatusType('error')
      setStatusMessage(message)
      return
    }

    setLoading(true)
    setStatusMessage('')
    setStatusType('')
    setAwaitingEmailConfirmation(false)

    const action =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { emailRedirectTo: window.location.origin },
          })

    const { data, error } = await action

    if (error) {
      const isEmailNotConfirmed = error.message.toLowerCase().includes('email not confirmed')
      const message = isEmailNotConfirmed
        ? 'Email не подтвержден. Нажмите "Отправить письмо повторно".'
        : error.message
      onError(message)
      setStatusType('error')
      setStatusMessage(message)
      setAwaitingEmailConfirmation(isEmailNotConfirmed)
    } else if (mode === 'signin' && !data.session) {
      const message =
        'Вход не завершен: нет активной сессии. Обычно это значит, что email еще не подтвержден.'
      setStatusType('error')
      setStatusMessage(message)
      setAwaitingEmailConfirmation(true)
    } else if (mode === 'signup') {
      if (data.session) {
        const message = 'Аккаунт создан и вход выполнен.'
        setStatusType('success')
        setStatusMessage(message)
        onError('')
      } else {
        const message =
          'Аккаунт создан. На вашу почту отправлено письмо подтверждения. Проверьте папки Входящие и Спам.'
        onError(message)
        setStatusType('success')
        setStatusMessage(message)
        setAwaitingEmailConfirmation(true)
        setMode('signin')
      }
    } else {
      setStatusMessage('')
      setStatusType('')
    }

    setLoading(false)
  }

  const handleResendConfirmation = async () => {
    if (!supabase) return
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      const message = 'Сначала введите email для повторной отправки.'
      setStatusType('error')
      setStatusMessage(message)
      onError(message)
      return
    }

    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: { emailRedirectTo: window.location.origin },
    })
    setResending(false)

    if (error) {
      const message = `Не удалось отправить письмо повторно: ${error.message}`
      setStatusType('error')
      setStatusMessage(message)
      onError(message)
      return
    }

    const message =
      'Письмо подтверждения отправлено повторно. Если письма нет, проверьте настройки Email в Supabase Auth.'
    setStatusType('success')
    setStatusMessage(message)
    onError(message)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <section className="relative w-full max-w-md rounded-3xl border border-cyan-300/30 bg-slate-900/45 p-7 shadow-[0_0_50px_rgba(14,165,233,0.2)] backdrop-blur-xl transition duration-300 hover:border-cyan-300/45">
        <h1 className="bg-gradient-to-r from-violet-300 via-blue-200 to-cyan-200 bg-clip-text text-2xl font-semibold text-transparent">
          Family Messenger
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Личный футуристичный чат и звонки в реальном времени.
        </p>
        {statusMessage && (
          <div
            className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
              statusType === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {statusMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-200">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Пароль
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(14,165,233,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Подождите...' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
        {awaitingEmailConfirmation && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending}
            className="mt-4 w-full rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:scale-[1.01] hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? 'Отправляем...' : 'Отправить письмо повторно'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 text-sm text-cyan-200 transition hover:text-cyan-100"
        >
          {mode === 'signin'
            ? 'Нет аккаунта? Зарегистрируйтесь'
            : 'Уже есть аккаунт? Войдите'}
        </button>
      </section>
    </main>
  )
}

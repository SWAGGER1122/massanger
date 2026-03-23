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
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'error' | 'success' | ''>('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      const message = 'Supabase is not configured yet.'
      onError(message)
      setStatusType('error')
      setStatusMessage(message)
      return
    }

    if (!email || !password) {
      const message = 'Email and password are required.'
      onError(message)
      setStatusType('error')
      setStatusMessage(message)
      return
    }

    setLoading(true)
    setStatusMessage('')
    setStatusType('')

    const action =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

    const { data, error } = await action

    if (error) {
      onError(error.message)
      setStatusType('error')
      setStatusMessage(error.message)
    } else if (mode === 'signin' && !data.session) {
      setStatusType('error')
      setStatusMessage('Login did not create a session. Check email confirmation.')
    } else if (mode === 'signup') {
      const message =
        'Account created. Confirm email if required, then use Sign In.'
      onError(message)
      setStatusType('success')
      setStatusMessage(message)
      setMode('signin')
    } else {
      setStatusMessage('')
      setStatusType('')
    }

    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-7 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Family Messenger</h1>
        <p className="mt-2 text-sm text-slate-400">
          Private family chat and calls from anywhere.
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
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 text-sm text-violet-300 transition hover:text-violet-200"
        >
          {mode === 'signin'
            ? 'Need an account? Sign up'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}

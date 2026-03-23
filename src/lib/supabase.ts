import { createClient } from '@supabase/supabase-js'

const normalizeValue = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^['"]|['"]$/g, '')
}

const readEnv = (names: string[]) => {
  const rawEnv = import.meta.env as Record<string, unknown>
  const normalizedEnv = Object.entries(rawEnv).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      accumulator[key.replace(/^\uFEFF/, '')] = normalizeValue(value)
      return accumulator
    },
    {},
  )

  const matchedName = names.find((name) => Boolean(normalizedEnv[name]))
  return matchedName ? normalizedEnv[matchedName] : ''
}

const supabaseUrl = readEnv(['VITE_SUPABASE_URL', 'SUPABASE_URL'])
const supabaseAnonKey = readEnv([
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_KEY',
])

const isValidHttpUrl = (value: string) => /^https?:\/\/.+/i.test(value)

export const hasSupabaseConfig = Boolean(
  supabaseUrl && supabaseAnonKey && isValidHttpUrl(supabaseUrl),
)

export const supabaseConfigError = !supabaseUrl
  ? 'Не найден VITE_SUPABASE_URL'
  : !supabaseAnonKey
    ? 'Не найден VITE_SUPABASE_ANON_KEY'
    : !isValidHttpUrl(supabaseUrl)
      ? 'VITE_SUPABASE_URL должен начинаться с http:// или https://'
      : null

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

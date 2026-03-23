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

export const streamApiKey = readEnv(['VITE_STREAM_API_KEY', 'STREAM_API_KEY'])
const rawStreamTokenEndpoint = readEnv([
  'VITE_STREAM_TOKEN_ENDPOINT',
  'STREAM_TOKEN_ENDPOINT',
])

const isValidHttpUrl = (value: string) => /^https?:\/\/.+/i.test(value)
const isAbsolutePath = (value: string) => value.startsWith('/')
const normalizeTokenEndpoint = (value: string) => {
  if (isValidHttpUrl(value)) {
    try {
      const url = new URL(value)
      if (url.pathname === '/' || url.pathname === '') {
        url.pathname = '/api/stream-token'
      }
      return url.toString()
    } catch {
      return value
    }
  }

  if (isAbsolutePath(value)) {
    return value
  }

  return ''
}

export const streamTokenEndpoint = normalizeTokenEndpoint(rawStreamTokenEndpoint)
const hasValidTokenEndpoint = Boolean(streamTokenEndpoint)

export const hasStreamConfig = Boolean(
  streamApiKey && hasValidTokenEndpoint,
)

export const streamConfigError = !streamApiKey
  ? 'Не найден VITE_STREAM_API_KEY'
  : !rawStreamTokenEndpoint
    ? 'Не найден VITE_STREAM_TOKEN_ENDPOINT'
    : !hasValidTokenEndpoint
      ? 'VITE_STREAM_TOKEN_ENDPOINT должен быть полным URL или начинаться с /'
      : null

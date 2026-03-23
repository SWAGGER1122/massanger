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
export const streamTokenEndpoint = readEnv([
  'VITE_STREAM_TOKEN_ENDPOINT',
  'STREAM_TOKEN_ENDPOINT',
])

const isValidHttpUrl = (value: string) => /^https?:\/\/.+/i.test(value)

export const hasStreamConfig = Boolean(
  streamApiKey && streamTokenEndpoint && isValidHttpUrl(streamTokenEndpoint),
)

export const streamConfigError = !streamApiKey
  ? 'Не найден VITE_STREAM_API_KEY'
  : !streamTokenEndpoint
    ? 'Не найден VITE_STREAM_TOKEN_ENDPOINT'
    : !isValidHttpUrl(streamTokenEndpoint)
      ? 'VITE_STREAM_TOKEN_ENDPOINT должен начинаться с http:// или https://'
      : null

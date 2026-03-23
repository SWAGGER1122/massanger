import { StreamClient } from '@stream-io/node-sdk'

const streamApiKey = process.env.STREAM_API_KEY
const streamApiSecret = process.env.STREAM_API_SECRET

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!streamApiKey || !streamApiSecret) {
    return res.status(500).json({ error: 'Missing Stream server credentials' })
  }

  const payload =
    typeof req.body === 'string'
      ? (() => {
          try {
            return JSON.parse(req.body || '{}')
          } catch {
            return {}
          }
        })()
      : req.body || {}
  const userId = typeof payload.userId === 'string' ? payload.userId : ''

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const streamClient = new StreamClient(streamApiKey, streamApiSecret)
  const token = streamClient.generateUserToken({ user_id: userId })

  return res.status(200).json({ token })
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { StreamClient } from '@stream-io/node-sdk'

const streamApiKey = process.env.STREAM_API_KEY
const streamApiSecret = process.env.STREAM_API_SECRET

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!streamApiKey || !streamApiSecret) {
    return res.status(500).json({ error: 'Missing Stream server credentials' })
  }

  const { userId } = req.body as { userId?: string }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const streamClient = new StreamClient(streamApiKey, streamApiSecret)
  const token = streamClient.generateUserToken({ user_id: userId })

  return res.status(200).json({ token })
}

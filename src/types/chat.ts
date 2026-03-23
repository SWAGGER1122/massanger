export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
}

export type Message = {
  id: string
  sender_id: string
  receiver_id?: string | null
  content: string
  created_at: string
  read_by: string[] | null
}

export type ChatThread = {
  id: string
  title: string
  avatarUrl: string | null
  online: boolean
  lastMessage: string
  lastMessageAt: string | null
  unreadCount: number
  typingText: string
  isGroup: boolean
  missedCalls: number
}

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active'

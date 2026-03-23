import { useMemo } from 'react'
import type { FormEvent } from 'react'
import { PhoneCall, SendHorizonal } from 'lucide-react'
import type { Message, Profile } from '../types/chat'

type ChatWindowProps = {
  userId: string
  messages: Message[]
  profiles: Profile[]
  draft: string
  onDraftChange: (value: string) => void
  onSend: (event: FormEvent<HTMLFormElement>) => void
  onOpenCall: () => void
  sending: boolean
}

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))

export function ChatWindow({
  userId,
  messages,
  profiles,
  draft,
  onDraftChange,
  onSend,
  onOpenCall,
  sending,
}: ChatWindowProps) {
  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>()
    profiles.forEach((profile) => map.set(profile.id, profile))
    return map
  }, [profiles])

  return (
    <section className="flex h-[calc(100vh-20.5rem)] flex-1 flex-col bg-slate-950 md:h-screen">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
        <div>
          <h2 className="text-base font-semibold text-white">Family Chat</h2>
          <p className="text-xs text-slate-400">Realtime private messaging</p>
        </div>
        <button
          onClick={onOpenCall}
          className="flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-400"
        >
          <PhoneCall size={14} />
          Call
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-6">
        {messages.map((message) => {
          const isMine = message.sender_id === userId
          const sender = profileMap.get(message.sender_id)
          const isRead = isMine
            ? (message.read_by || []).some((id) => id !== userId)
            : true

          return (
            <article
              key={message.id}
              className={`w-fit max-w-[85%] rounded-2xl px-4 py-2.5 text-sm transition animate-in fade-in slide-in-from-bottom-1 ${
                isMine
                  ? 'ml-auto rounded-br-md bg-violet-500 text-white'
                  : 'rounded-bl-md bg-white/10 text-slate-100'
              }`}
            >
              {!isMine && (
                <p className="mb-1 text-xs font-semibold text-violet-200">
                  {sender?.full_name || 'Family member'}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <p
                className={`mt-1 text-[10px] ${isMine ? 'text-violet-100/80' : 'text-slate-400'}`}
              >
                {formatTime(message.created_at)} {isMine ? (isRead ? '• Read' : '• Sent') : ''}
              </p>
            </article>
          )
        })}
      </div>

      <form
        onSubmit={onSend}
        className="border-t border-white/10 bg-slate-900/70 p-3 md:p-4"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-3 py-2">
          <input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-violet-500 p-2 text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </form>
    </section>
  )
}

import { useMemo } from 'react'
import type { FormEvent } from 'react'
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  SendHorizonal,
  Video,
  VideoOff,
} from 'lucide-react'
import type { CallState, ChatThread, Message, Profile } from '../types/chat'

type ChatWindowProps = {
  userId: string
  activeChat: ChatThread | null
  messages: Message[]
  profiles: Profile[]
  draft: string
  onDraftChange: (value: string) => void
  onTyping: (value: boolean) => void
  onSend: (event: FormEvent<HTMLFormElement>) => void
  callState: CallState
  callDurationSeconds: number
  micEnabled: boolean
  cameraEnabled: boolean
  onStartCall: () => void
  onAcceptCall: () => void
  onDeclineCall: () => void
  onEndCall: () => void
  onToggleMic: () => void
  onToggleCamera: () => void
  sending: boolean
}

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))

export function ChatWindow({
  userId,
  activeChat,
  messages,
  profiles,
  draft,
  onDraftChange,
  onTyping,
  onSend,
  callState,
  callDurationSeconds,
  micEnabled,
  cameraEnabled,
  onStartCall,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  sending,
}: ChatWindowProps) {
  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>()
    profiles.forEach((profile) => map.set(profile.id, profile))
    return map
  }, [profiles])

  const durationLabel = useMemo(() => {
    const minutes = Math.floor(callDurationSeconds / 60)
    const seconds = callDurationSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [callDurationSeconds])

  if (!activeChat) {
    return (
      <section className="flex min-h-[50vh] flex-1 items-center justify-center rounded-3xl border border-white/10 bg-slate-900/30 p-8 text-slate-200 md:min-h-screen">
        Выберите чат в левом меню
      </section>
    )
  }

  return (
    <section className="flex h-[calc(100vh-29rem)] flex-1 flex-col rounded-3xl border border-cyan-300/20 bg-slate-900/30 shadow-[0_0_38px_rgba(59,130,246,0.15)] backdrop-blur-xl md:h-screen">
      <header className="flex items-center justify-between border-b border-cyan-300/20 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={
                activeChat.avatarUrl ||
                `https://api.dicebear.com/7.x/thumbs/svg?seed=${activeChat.id}`
              }
              alt={activeChat.title}
              className="h-11 w-11 rounded-xl border border-white/20 object-cover"
            />
            {activeChat.online && (
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{activeChat.title}</h2>
            <p className="text-xs text-cyan-100/80">
              {activeChat.typingText || (activeChat.online ? 'В сети' : 'Не в сети')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {callState === 'active' && (
            <span className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-1 text-xs text-cyan-100">
              {durationLabel}
            </span>
          )}
          {callState === 'idle' && (
            <button
              onClick={onStartCall}
              className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:scale-105 hover:bg-cyan-500/25"
            >
              <PhoneCall size={14} />
              Позвонить
            </button>
          )}
          {callState === 'outgoing' && (
            <button
              onClick={onEndCall}
              className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/35"
            >
              <PhoneOff size={14} />
              Отменить
            </button>
          )}
        </div>
      </header>

      {(callState === 'incoming' || callState === 'outgoing' || callState === 'active') && (
        <div className="mx-4 mt-3 rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-violet-500/20 via-blue-500/15 to-cyan-500/20 p-3 text-sm text-white md:mx-6">
          {callState === 'incoming' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Входящий вызов от {activeChat.title}</p>
              <div className="flex gap-2">
                <button
                  onClick={onAcceptCall}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/80 px-3 py-1.5 text-xs"
                >
                  <PhoneIncoming size={13} />
                  Принять
                </button>
                <button
                  onClick={onDeclineCall}
                  className="flex items-center gap-1 rounded-lg bg-rose-500/80 px-3 py-1.5 text-xs"
                >
                  <PhoneOff size={13} />
                  Отклонить
                </button>
              </div>
            </div>
          )}
          {callState === 'outgoing' && <p className="font-medium">Идёт вызов {activeChat.title}...</p>}
          {callState === 'active' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Активный звонок • {durationLabel}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleMic}
                  className="rounded-lg border border-white/30 bg-white/10 p-2 transition hover:bg-white/20"
                >
                  {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                </button>
                <button
                  onClick={onToggleCamera}
                  className="rounded-lg border border-white/30 bg-white/10 p-2 transition hover:bg-white/20"
                >
                  {cameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                </button>
                <button
                  onClick={onEndCall}
                  className="rounded-lg bg-rose-500/80 px-3 py-1.5 text-xs"
                >
                  Завершить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
              className={`w-fit max-w-[85%] rounded-2xl border px-4 py-2.5 text-sm transition duration-300 ${
                isMine
                  ? 'ml-auto rounded-br-md border-cyan-300/30 bg-gradient-to-r from-violet-500/80 via-blue-500/80 to-cyan-500/80 text-white shadow-[0_0_24px_rgba(14,165,233,0.28)]'
                  : 'rounded-bl-md border-white/15 bg-white/8 text-slate-100'
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
                {formatTime(message.created_at)}{' '}
                {isMine ? (isRead ? '• Прочитано' : '• Доставлено') : ''}
              </p>
            </article>
          )
        })}
      </div>

      <form
        onSubmit={onSend}
        className="border-t border-cyan-300/20 bg-slate-900/45 p-3 md:p-4"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-950/70 px-3 py-2 shadow-[inset_0_0_30px_rgba(56,189,248,0.08)]">
          <input
            value={draft}
            onChange={(event) => {
              onDraftChange(event.target.value)
              onTyping(Boolean(event.target.value.trim()))
            }}
            placeholder="Напишите сообщение..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 p-2 text-white transition hover:scale-105 hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </form>
    </section>
  )
}

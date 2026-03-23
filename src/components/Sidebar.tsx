import { BellRing, LogOut, MessageCircle, Phone, Sparkles, UserRoundPen } from 'lucide-react'
import type { ChatThread, Profile } from '../types/chat'

type SidebarProps = {
  currentUser: Profile | null
  chats: ChatThread[]
  activeChatId: string
  onSelectChat: (chatId: string) => void
  onSignOut: () => void
  onProfileOpen: () => void
}

export function Sidebar({
  currentUser,
  chats,
  activeChatId,
  onSelectChat,
  onSignOut,
  onProfileOpen,
}: SidebarProps) {
  return (
    <aside className="w-full border-b border-cyan-300/20 bg-slate-900/30 p-4 backdrop-blur-xl md:h-screen md:w-96 md:border-r md:border-b-0">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-blue-500/10 to-cyan-500/15 p-4 shadow-[0_0_35px_rgba(56,189,248,0.18)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={
                  currentUser?.avatar_url ||
                  `https://api.dicebear.com/7.x/thumbs/svg?seed=${currentUser?.id || 'me'}`
                }
                alt={currentUser?.full_name || 'Мой профиль'}
                className="h-11 w-11 rounded-2xl border border-white/30 object-cover shadow-[0_0_24px_rgba(139,92,246,0.45)]"
              />
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Family Nexus</p>
              <h2 className="text-base font-semibold text-white">
                {currentUser?.full_name || 'Мой профиль'}
              </h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-cyan-100/75">
                <Phone size={11} />
                {currentUser?.phone || 'Телефон не указан'}
              </p>
            </div>
          </div>
          <button
            onClick={onProfileOpen}
            className="rounded-xl border border-white/20 bg-white/5 p-2 text-cyan-100 transition hover:scale-105 hover:border-cyan-300/50 hover:bg-cyan-500/10"
          >
            <UserRoundPen size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/35 px-3 py-2 text-xs text-slate-200">
        <Sparkles size={14} className="text-violet-300" />
        <span>Выберите чат и начните общение</span>
      </div>

      <div className="mt-4 space-y-2">
        {chats.map((chat) => {
          const isActive = chat.id === activeChatId
          return (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group w-full rounded-2xl border px-3 py-3 text-left transition-all duration-300 ${
                isActive
                  ? 'border-cyan-300/60 bg-gradient-to-r from-violet-500/30 via-blue-500/25 to-cyan-500/20 shadow-[0_0_35px_rgba(34,211,238,0.22)]'
                  : 'border-white/10 bg-slate-900/35 hover:border-cyan-300/35 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={chat.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${chat.id}`}
                    alt={chat.title}
                    className="h-11 w-11 rounded-xl border border-white/20 object-cover"
                  />
                  {chat.online && (
                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{chat.title}</p>
                    <p className="shrink-0 text-[11px] text-slate-300">
                      {chat.lastMessageAt
                        ? new Intl.DateTimeFormat(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(chat.lastMessageAt))
                        : '--:--'}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-300">
                    {chat.typingText || chat.lastMessage || 'Нет сообщений'}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="flex items-center gap-1 text-[11px] text-cyan-200/80">
                      <MessageCircle size={11} />
                      {chat.isGroup ? 'Групповой чат' : 'Личный чат'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {chat.missedCalls > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-200">
                          <BellRing size={10} />
                          {chat.missedCalls}
                        </span>
                      )}
                      {chat.unreadCount > 0 && (
                        <span className="rounded-full bg-cyan-400/25 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <button
        onClick={onSignOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-slate-900/40 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-500/10"
      >
        <LogOut size={16} />
        Выйти
      </button>
    </aside>
  )
}

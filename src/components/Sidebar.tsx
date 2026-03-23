import { LogOut, MessageCircle, UserRoundPen } from 'lucide-react'
import type { Profile } from '../types/chat'

type SidebarProps = {
  profiles: Profile[]
  activeUserId: string
  onSignOut: () => void
  onProfileOpen: () => void
}

export function Sidebar({
  profiles,
  activeUserId,
  onSignOut,
  onProfileOpen,
}: SidebarProps) {
  return (
    <aside className="w-full border-b border-white/10 bg-slate-900/90 p-4 md:h-screen md:w-80 md:border-r md:border-b-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Family</h2>
        <button
          onClick={onProfileOpen}
          className="rounded-lg border border-white/10 p-2 text-slate-200 transition hover:bg-white/5"
        >
          <UserRoundPen size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {profiles.map((profile) => {
          const isActive = profile.id === activeUserId
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-3 rounded-xl p-3 transition ${
                isActive ? 'bg-violet-500/20 ring-1 ring-violet-300/30' : 'bg-white/5'
              }`}
            >
              <img
                src={
                  profile.avatar_url ||
                  `https://api.dicebear.com/7.x/thumbs/svg?seed=${profile.id}`
                }
                alt={profile.full_name || 'Family member avatar'}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {profile.full_name || 'Unnamed member'}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <MessageCircle size={12} />
                  Family chat
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <button
        onClick={onSignOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </aside>
  )
}

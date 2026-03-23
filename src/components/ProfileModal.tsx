import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Profile } from '../types/chat'

type ProfileModalProps = {
  open: boolean
  profile: Profile | null
  onClose: () => void
  onSave: (fullName: string, avatarUrl: string) => Promise<void>
}

export function ProfileModal({ open, profile, onClose, onSave }: ProfileModalProps) {
  const [draft, setDraft] = useState<{ fullName: string; avatarUrl: string } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const fullName = draft?.fullName ?? profile?.full_name ?? ''
  const avatarUrl = draft?.avatarUrl ?? profile?.avatar_url ?? ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    await onSave(fullName, avatarUrl)
    setSaving(false)
    setDraft(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold text-white">Edit profile</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm text-slate-200">
            Family name
            <input
              value={fullName}
              onChange={(event) =>
                setDraft((previous) => ({
                  fullName: event.target.value,
                  avatarUrl: previous?.avatarUrl ?? avatarUrl,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Avatar URL
            <input
              value={avatarUrl}
              onChange={(event) =>
                setDraft((previous) => ({
                  fullName: previous?.fullName ?? fullName,
                  avatarUrl: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                onClose()
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-violet-500 px-3 py-2 text-sm text-white"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Camera, Phone, User } from 'lucide-react'
import type { Profile } from '../types/chat'

type ProfileModalProps = {
  open: boolean
  profile: Profile | null
  currentPhone: string
  onClose: () => void
  onSave: (fullName: string, avatarUrl: string, phone: string, photoFile: File | null) => Promise<void>
}

export function ProfileModal({
  open,
  profile,
  currentPhone,
  onClose,
  onSave,
}: ProfileModalProps) {
  const [draft, setDraft] = useState<{ fullName: string; avatarUrl: string; phone: string } | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const fullName = draft?.fullName ?? profile?.full_name ?? ''
  const avatarUrl = draft?.avatarUrl ?? profile?.avatar_url ?? ''
  const phone = draft?.phone ?? currentPhone

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    await onSave(fullName, avatarUrl, phone, photoFile)
    setSaving(false)
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }
    setDraft(null)
    setPhotoFile(null)
    setPhotoPreview(null)
    onClose()
  }

  const shownAvatar =
    photoPreview ||
    avatarUrl ||
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${profile?.id || 'profile'}`

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-3xl border border-cyan-300/25 bg-slate-900/45 p-5 shadow-[0_0_45px_rgba(14,165,233,0.2)] backdrop-blur-xl fade-up">
        <h3 className="text-lg font-semibold text-white">Профиль</h3>
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
          <img
            src={shownAvatar}
            alt="Аватар"
            className="h-20 w-20 rounded-2xl border border-cyan-300/40 object-cover shadow-[0_0_24px_rgba(14,165,233,0.35)]"
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20">
            <Camera size={14} />
            Сменить фото
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null
                if (photoPreview?.startsWith('blob:')) {
                  URL.revokeObjectURL(photoPreview)
                }
                setPhotoFile(nextFile)
                setPhotoPreview(nextFile ? URL.createObjectURL(nextFile) : null)
              }}
            />
          </label>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm text-slate-200">
            Имя
            <input
              value={fullName}
              onChange={(event) =>
                setDraft((previous) => ({
                  fullName: event.target.value,
                  avatarUrl: previous?.avatarUrl ?? avatarUrl,
                  phone: previous?.phone ?? phone,
                }))
              }
              placeholder="Как в Telegram"
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/70"
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
                  phone: previous?.phone ?? phone,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/70"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Телефон
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 focus-within:border-cyan-300/70">
              <Phone size={14} className="text-cyan-200" />
              <input
                value={phone}
                onChange={(event) =>
                  setDraft((previous) => ({
                    fullName: previous?.fullName ?? fullName,
                    avatarUrl: previous?.avatarUrl ?? avatarUrl,
                    phone: event.target.value,
                  }))
                }
                placeholder="+7 900 000-00-00"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </label>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-xs text-cyan-100/80">
            <p className="flex items-center gap-1.5">
              <User size={12} />
              Профиль синхронизируется с Supabase и виден во всех сессиях.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (photoPreview?.startsWith('blob:')) {
                  URL.revokeObjectURL(photoPreview)
                }
                setDraft(null)
                setPhotoFile(null)
                setPhotoPreview(null)
                onClose()
              }}
              className="rounded-xl border border-white/25 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-3 py-2 text-sm text-white transition hover:scale-105 hover:shadow-[0_0_20px_rgba(14,165,233,0.45)]"
            >
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

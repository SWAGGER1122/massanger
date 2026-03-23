import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { ChatWindow } from './components/ChatWindow'
import { ProfileModal } from './components/ProfileModal'
import { Sidebar } from './components/Sidebar'
import { VideoCallModal } from './components/VideoCallModal'
import { useAuth } from './hooks/useAuth'
import { hasSupabaseConfig, supabase, supabaseConfigError } from './lib/supabase'
import type { Message, Profile } from './types/chat'

type DbRecord = Record<string, unknown>

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

const normalizeProfile = (record: DbRecord): Profile => ({
  id: asString(record.id),
  full_name:
    typeof record.full_name === 'string'
      ? record.full_name
      : typeof record.name === 'string'
        ? record.name
        : null,
  avatar_url:
    typeof record.avatar_url === 'string'
      ? record.avatar_url
      : typeof record.avatar === 'string'
        ? record.avatar
        : null,
})

const normalizeMessage = (record: DbRecord): Message => ({
  id: asString(record.id),
  sender_id:
    typeof record.sender_id === 'string'
      ? record.sender_id
      : typeof record.user_id === 'string'
        ? record.user_id
        : '',
  content:
    typeof record.content === 'string'
      ? record.content
      : typeof record.message === 'string'
        ? record.message
        : typeof record.text === 'string'
          ? record.text
          : '',
  created_at:
    typeof record.created_at === 'string'
      ? record.created_at
      : typeof record.inserted_at === 'string'
        ? record.inserted_at
        : new Date().toISOString(),
  read_by: Array.isArray(record.read_by)
    ? (record.read_by.filter((item): item is string => typeof item === 'string'))
    : null,
})

function App() {
  const { user, loading } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [callOpen, setCallOpen] = useState(false)

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === user?.id) || null,
    [profiles, user?.id],
  )

  useEffect(() => {
    if (!user || !supabase) return
    const client = supabase

    const createProfile = async () => {
      await client.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      })
    }

    createProfile()
  }, [user])

  useEffect(() => {
    if (!user || !supabase) return
    const client = supabase

    const loadData = async () => {
      const [profilesResponse, messagesResponse] = await Promise.all([
        client
          .from('profiles')
          .select('*'),
        client
          .from('messages')
          .select('*')
          .limit(300),
      ])

      if (profilesResponse.error) {
        setErrorMessage(profilesResponse.error.message)
      } else {
        const records = (profilesResponse.data || []) as DbRecord[]
        const normalizedProfiles = records
          .map(normalizeProfile)
          .filter((profile) => Boolean(profile.id))
          .sort((first, second) => (first.full_name || '').localeCompare(second.full_name || ''))
        setProfiles(normalizedProfiles)
      }

      if (messagesResponse.error) {
        setErrorMessage(messagesResponse.error.message)
      } else {
        const records = (messagesResponse.data || []) as DbRecord[]
        const normalizedMessages = records
          .map(normalizeMessage)
          .filter((message) => Boolean(message.id && message.sender_id && message.content))
          .sort(
            (first, second) =>
              new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
          )
        setMessages(normalizedMessages)

        const unreadRecords = normalizedMessages.filter(
          (message) =>
            message.sender_id !== user.id && !(message.read_by || []).includes(user.id),
        )

        await Promise.all(
          unreadRecords.map((message) =>
            client
              .from('messages')
              .update({ read_by: [...(message.read_by || []), user.id] })
              .eq('id', message.id),
          ),
        )
      }
    }

    loadData()

    const messagesChannel = client
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const message = normalizeMessage(payload.new as DbRecord)
            if (!message.id || !message.sender_id || !message.content) return
            setMessages((previous) => [...previous, message])

            if (message.sender_id !== user.id && !(message.read_by || []).includes(user.id)) {
              await client
                .from('messages')
                .update({ read_by: [...(message.read_by || []), user.id] })
                .eq('id', message.id)
            }
          }

          if (payload.eventType === 'UPDATE') {
            const message = normalizeMessage(payload.new as DbRecord)
            if (!message.id) return
            setMessages((previous) =>
              previous.map((item) => (item.id === message.id ? message : item)),
            )
          }
        },
      )
      .subscribe()

    const profilesChannel = client
      .channel('profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          client
            .from('profiles')
            .select('*')
            .then(({ data }) => {
              const records = (data || []) as DbRecord[]
              const normalizedProfiles = records
                .map(normalizeProfile)
                .filter((profile) => Boolean(profile.id))
                .sort((first, second) =>
                  (first.full_name || '').localeCompare(second.full_name || ''),
                )
              setProfiles(normalizedProfiles)
            })
        },
      )
      .subscribe()

    return () => {
      client.removeChannel(messagesChannel)
      client.removeChannel(profilesChannel)
    }
  }, [user])

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !supabase || !draft.trim()) return
    setSending(true)

    let { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      content: draft.trim(),
      read_by: [user.id],
    })

    if (error) {
      const fallbackInsert = await supabase.from('messages').insert({
        user_id: user.id,
        message: draft.trim(),
      })
      error = fallbackInsert.error
    }

    if (error) {
      setErrorMessage(error.message)
    } else {
      setDraft('')
    }
    setSending(false)
  }

  const handleSaveProfile = async (fullName: string, avatarUrl: string) => {
    if (!user || !supabase) return
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    })

    if (error) {
      setErrorMessage(error.message)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-slate-200">
          <h1 className="text-xl font-semibold text-white">Family Messenger</h1>
          <p className="mt-3 text-sm text-slate-300">
            Add Supabase keys to your <span className="text-violet-300">.env</span> file.
          </p>
          <p className="mt-2 text-sm text-amber-300">
            {supabaseConfigError || 'Проверь .env и перезапусти npm run dev'}
          </p>
          <div className="mt-4 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
            <p>VITE_SUPABASE_URL=your_project_url</p>
            <p>VITE_SUPABASE_ANON_KEY=your_anon_key</p>
          </div>
        </section>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading...
      </main>
    )
  }

  if (!user) {
    return <AuthScreen onError={setErrorMessage} />
  }

  return (
    <>
      <main className="min-h-screen bg-slate-950 md:flex">
        <Sidebar
          profiles={profiles}
          activeUserId={user.id}
          onSignOut={handleSignOut}
          onProfileOpen={() => setProfileOpen(true)}
        />
        <ChatWindow
          userId={user.id}
          messages={messages}
          profiles={profiles}
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSendMessage}
          onOpenCall={() => setCallOpen(true)}
          sending={sending}
        />
      </main>
      {errorMessage && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm text-red-100">
          {errorMessage}
        </div>
      )}
      <ProfileModal
        open={profileOpen}
        profile={currentProfile}
        onClose={() => setProfileOpen(false)}
        onSave={handleSaveProfile}
      />
      {currentProfile && (
        <VideoCallModal
          open={callOpen}
          profile={currentProfile}
          memberIds={profiles.map((profile) => profile.id)}
          onClose={() => setCallOpen(false)}
          onError={setErrorMessage}
        />
      )}
    </>
  )
}

export default App

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { ChatWindow } from './components/ChatWindow'
import { ProfileModal } from './components/ProfileModal'
import { Sidebar } from './components/Sidebar'
import { VideoCallModal } from './components/VideoCallModal'
import { useAuth } from './hooks/useAuth'
import { hasSupabaseConfig, supabase, supabaseConfigError } from './lib/supabase'
import type { CallState, ChatThread, Message, Profile } from './types/chat'

type DbRecord = Record<string, unknown>
type BroadcastSender = {
  send: (input: {
    type: 'broadcast'
    event: string
    payload: Record<string, unknown>
  }) => Promise<unknown>
}

const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const isRecent = (timestamp: string | null, minutes: number) => {
  if (!timestamp) return false
  return Date.now() - new Date(timestamp).getTime() < minutes * 60 * 1000
}

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
  phone:
    typeof record.phone === 'string'
      ? record.phone
      : typeof record.phone_number === 'string'
        ? record.phone_number
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
  receiver_id:
    typeof record.receiver_id === 'string'
      ? record.receiver_id
      : typeof record.target_id === 'string'
        ? record.target_id
        : null,
  content:
    typeof record.content === 'string'
      ? record.content
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
  const [activeChatId, setActiveChatId] = useState('family')
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [typingByChat, setTypingByChat] = useState<Record<string, string>>({})
  const [missedCalls, setMissedCalls] = useState<Record<string, number>>({})
  const [callState, setCallState] = useState<CallState>('idle')
  const [callChatId, setCallChatId] = useState<string | null>(null)
  const [incomingCallerId, setIncomingCallerId] = useState<string | null>(null)
  const [callDurationSeconds, setCallDurationSeconds] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const realtimeChannelRef = useRef<BroadcastSender | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callStateRef = useRef<CallState>('idle')
  const callChatIdRef = useRef<string | null>(null)

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === user?.id) || null,
    [profiles, user?.id],
  )
  const metadataPhone =
    typeof user?.user_metadata?.phone === 'string' ? user.user_metadata.phone : ''
  const currentUserPhone = metadataPhone || currentProfile?.phone || ''

  const chats = useMemo<ChatThread[]>(() => {
    if (!user) return []

    const sortedMessages = [...messages].sort(
      (first, second) =>
        new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
    )
    const familyMessages = sortedMessages.filter((message) => !message.receiver_id)
    const familyLast = familyMessages[familyMessages.length - 1]
    const familyUnread = familyMessages.filter(
      (message) => message.sender_id !== user.id && !(message.read_by || []).includes(user.id),
    ).length

    const directThreads = profiles
      .filter((profile) => profile.id !== user.id)
      .map((profile) => {
        const directMessages = sortedMessages.filter(
          (message) =>
            (message.sender_id === user.id && message.receiver_id === profile.id) ||
            (message.sender_id === profile.id && message.receiver_id === user.id),
        )
        const last = directMessages[directMessages.length - 1]
        const unreadCount = directMessages.filter(
          (message) => message.sender_id !== user.id && !(message.read_by || []).includes(user.id),
        ).length

        return {
          id: profile.id,
          title: profile.full_name || 'Участник семьи',
          avatarUrl: profile.avatar_url,
          online: isRecent(last?.created_at || null, 5),
          lastMessage: last?.content || '',
          lastMessageAt: last?.created_at || null,
          unreadCount,
          typingText: typingByChat[profile.id] || '',
          isGroup: false,
          missedCalls: missedCalls[profile.id] || 0,
        } satisfies ChatThread
      })
      .sort(
        (first, second) =>
          new Date(second.lastMessageAt || 0).getTime() -
          new Date(first.lastMessageAt || 0).getTime(),
      )

    const familyThread: ChatThread = {
      id: 'family',
      title: 'Семейный канал',
      avatarUrl: null,
      online: true,
      lastMessage: familyLast?.content || '',
      lastMessageAt: familyLast?.created_at || null,
      unreadCount: familyUnread,
      typingText: typingByChat.family || '',
      isGroup: true,
      missedCalls: missedCalls.family || 0,
    }

    return [familyThread, ...directThreads]
  }, [messages, missedCalls, profiles, typingByChat, user])

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || chats[0] || null,
    [activeChatId, chats],
  )
  const effectiveActiveChatId = activeChat?.id || activeChatId
  const callMemberIds = useMemo(
    () => {
      const rawIds =
        callChatId && callChatId !== 'family'
          ? [user?.id || '', callChatId]
          : profiles.map((profile) => profile.id)
      return Array.from(new Set(rawIds.filter((id) => Boolean(id))))
    },
    [callChatId, profiles, user?.id],
  )

  const visibleMessages = useMemo(() => {
    if (!user) return []
    const sortedMessages = [...messages].sort(
      (first, second) =>
        new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
    )

    if (effectiveActiveChatId === 'family') {
      return sortedMessages.filter((message) => !message.receiver_id)
    }

    return sortedMessages.filter(
      (message) =>
        (message.sender_id === user.id && message.receiver_id === effectiveActiveChatId) ||
        (message.sender_id === effectiveActiveChatId && message.receiver_id === user.id),
    )
  }, [effectiveActiveChatId, messages, user])

  useEffect(() => {
    callStateRef.current = callState
    callChatIdRef.current = callChatId
  }, [callChatId, callState])

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
      const profilesPromise = client.from('profiles').select('*')
      const messagesPromise = client
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)

      const [profilesResponse, orderedMessagesResponse] = await Promise.all([
        profilesPromise,
        messagesPromise,
      ])

      const messagesResponse = orderedMessagesResponse.error
        ? await client
            .from('messages')
            .select('*')
            .limit(300)
        : orderedMessagesResponse

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
            setMessages((previous) => {
              if (previous.some((item) => item.id === message.id)) {
                return previous
              }
              return [...previous, message]
            })

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

    const signalsChannel = client
      .channel('messenger-signals')
      .on('broadcast', { event: 'typing' }, (eventPayload) => {
        const payload = (eventPayload as { payload?: DbRecord }).payload || {}
        const chatId = asString(payload.chatId)
        const signalUserId = asString(payload.userId)
        const name = asString(payload.name)
        const isTyping = payload.isTyping === true

        if (!chatId || !signalUserId || signalUserId === user.id) return

        if (isTyping) {
          setTypingByChat((previous) => ({
            ...previous,
            [chatId]: `${name || 'Участник'} печатает...`,
          }))
          return
        }

        setTypingByChat((previous) => {
          const next = { ...previous }
          delete next[chatId]
          return next
        })
      })
      .on('broadcast', { event: 'call_invite' }, (eventPayload) => {
        const payload = (eventPayload as { payload?: DbRecord }).payload || {}
        const chatId = asString(payload.chatId)
        const targetId = asString(payload.targetId)
        const fromUserId = asString(payload.fromUserId)

        if (!chatId || !fromUserId || fromUserId === user.id) return
        if (targetId && targetId !== 'family' && targetId !== user.id) return

        setIncomingCallerId(fromUserId)
        setCallChatId(chatId)
        setActiveChatId(chatId)
        setCallState('incoming')
      })
      .on('broadcast', { event: 'call_decline' }, (eventPayload) => {
        const payload = (eventPayload as { payload?: DbRecord }).payload || {}
        const chatId = asString(payload.chatId)

        if (
          callStateRef.current === 'outgoing' &&
          callChatIdRef.current &&
          callChatIdRef.current === chatId
        ) {
          setCallState('idle')
          setCallChatId(null)
          setErrorMessage('Собеседник отклонил вызов.')
        }
      })
      .subscribe()

    realtimeChannelRef.current = signalsChannel

    return () => {
      client.removeChannel(messagesChannel)
      client.removeChannel(profilesChannel)
      client.removeChannel(signalsChannel)
      realtimeChannelRef.current = null
    }
  }, [user])

  useEffect(() => {
    if (!user || !supabase || visibleMessages.length === 0) return
    const client = supabase
    const unreadRecords = visibleMessages.filter(
      (message) => message.sender_id !== user.id && !(message.read_by || []).includes(user.id),
    )
    if (unreadRecords.length === 0) return

    Promise.all(
      unreadRecords.map((message) =>
        client
          .from('messages')
          .update({ read_by: [...(message.read_by || []), user.id] })
          .eq('id', message.id),
      ),
    )
  }, [user, visibleMessages])

  useEffect(() => {
    if (callState !== 'active') return
    const interval = window.setInterval(() => {
      setCallDurationSeconds((previous) => previous + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [callState])

  const sendSignal = (event: string, payload: Record<string, unknown>) => {
    const channel = realtimeChannelRef.current
    if (!channel) return
    void channel.send({
      type: 'broadcast',
      event,
      payload,
    })
  }

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !supabase || !draft.trim()) return
    setSending(true)

    const payload =
      effectiveActiveChatId === 'family'
        ? {
            sender_id: user.id,
            content: draft.trim(),
            read_by: [user.id],
          }
        : {
            sender_id: user.id,
            receiver_id: effectiveActiveChatId,
            content: draft.trim(),
            read_by: [user.id],
          }

    const { error } = await supabase.from('messages').insert(payload)

    if (error) {
      setErrorMessage(error.message)
    } else {
      setDraft('')
      setTypingByChat((previous) => {
        const next = { ...previous }
        delete next[effectiveActiveChatId]
        return next
      })
    }
    setSending(false)
  }

  const handleTypingChange = (isTyping: boolean) => {
    if (!user || !activeChat || !effectiveActiveChatId) return
    sendSignal('typing', {
      chatId: effectiveActiveChatId,
      userId: user.id,
      name: currentProfile?.full_name || user.email || 'Участник',
      isTyping,
    })

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }

    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        sendSignal('typing', {
          chatId: effectiveActiveChatId,
          userId: user.id,
          name: currentProfile?.full_name || user.email || 'Участник',
          isTyping: false,
        })
      }, 1200)
    }
  }

  const handleStartCall = () => {
    if (!user || !activeChat) return
    setCallChatId(activeChat.id)
    setIncomingCallerId(null)
    setCallState('outgoing')
    sendSignal('call_invite', {
      chatId: activeChat.id,
      fromUserId: user.id,
      targetId: activeChat.isGroup ? 'family' : activeChat.id,
    })

    window.setTimeout(() => {
      setCallState((previous) => {
        if (previous !== 'outgoing') return previous
        setCallDurationSeconds(0)
        return 'active'
      })
    }, 1800)
  }

  const handleAcceptCall = () => {
    setCallDurationSeconds(0)
    setCallState('active')
    setMissedCalls((previous) => ({
      ...previous,
      [callChatId || 'family']: 0,
    }))
  }

  const handleDeclineCall = () => {
    if (callChatId) {
      setMissedCalls((previous) => ({
        ...previous,
        [callChatId]: (previous[callChatId] || 0) + 1,
      }))
      sendSignal('call_decline', {
        chatId: callChatId,
        toUserId: incomingCallerId || '',
      })
    }
    setCallState('idle')
    setIncomingCallerId(null)
    setCallChatId(null)
  }

  const handleEndCall = () => {
    setCallState('idle')
    setCallChatId(null)
    setIncomingCallerId(null)
    setCallDurationSeconds(0)
  }

  const handleSaveProfile = async (
    fullName: string,
    avatarUrl: string,
    phone: string,
    photoFile: File | null,
  ) => {
    if (!user || !supabase) return
    let nextAvatarUrl = avatarUrl.trim()
    const normalizedPhone = phone.trim()

    if (photoFile) {
      if (photoFile.size > 4 * 1024 * 1024) {
        setErrorMessage('Фото слишком большое. Максимум 4MB.')
        return
      }

      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () =>
          typeof reader.result === 'string'
            ? resolve(reader.result)
            : reject(new Error('Не удалось прочитать файл'))
        reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
        reader.readAsDataURL(photoFile)
      }).catch(() => '')

      if (!fileDataUrl) {
        setErrorMessage('Не удалось обработать фото профиля.')
        return
      }

      nextAvatarUrl = fileDataUrl
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName.trim() || null,
      avatar_url: nextAvatarUrl || null,
    })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim() || null,
        avatar_url: nextAvatarUrl || null,
        phone: normalizedPhone || null,
      },
    })

    if (updateUserError) {
      setErrorMessage(updateUserError.message)
    } else {
      setErrorMessage('')
      setProfiles((previous) =>
        previous.map((profile) =>
          profile.id === user.id
            ? {
                ...profile,
                full_name: fullName.trim() || null,
                avatar_url: nextAvatarUrl || null,
                phone: normalizedPhone || null,
              }
            : profile,
        ),
      )
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
      <main className="relative min-h-screen overflow-hidden bg-slate-950 p-4 md:flex md:gap-4 md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(139,92,246,0.28),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(45,212,191,0.2),transparent_35%)]" />
        <Sidebar
          currentUser={
            currentProfile
              ? {
                  ...currentProfile,
                  phone: currentUserPhone || currentProfile.phone,
                }
              : null
          }
          chats={chats}
          activeChatId={effectiveActiveChatId}
          onSelectChat={(chatId) => {
            setActiveChatId(chatId)
            setMissedCalls((previous) => ({
              ...previous,
              [chatId]: 0,
            }))
          }}
          onSignOut={handleSignOut}
          onProfileOpen={() => setProfileOpen(true)}
        />
        <ChatWindow
          userId={user.id}
          activeChat={activeChat}
          messages={visibleMessages}
          profiles={profiles}
          draft={draft}
          onDraftChange={setDraft}
          onTyping={handleTypingChange}
          onSend={handleSendMessage}
          callState={callState}
          callDurationSeconds={callDurationSeconds}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          onStartCall={handleStartCall}
          onAcceptCall={handleAcceptCall}
          onDeclineCall={handleDeclineCall}
          onEndCall={handleEndCall}
          onToggleMic={() => setMicEnabled((previous) => !previous)}
          onToggleCamera={() => setCameraEnabled((previous) => !previous)}
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
        currentPhone={currentUserPhone}
        onClose={() => setProfileOpen(false)}
        onSave={handleSaveProfile}
      />
      {currentProfile && (
        <VideoCallModal
          open={callState === 'active' && Boolean(callChatId)}
          profile={currentProfile}
          callRoomKey={`family-room-${callChatId || 'family'}`}
          memberIds={callMemberIds}
          onClose={handleEndCall}
          onError={setErrorMessage}
        />
      )}
    </>
  )
}

export default App

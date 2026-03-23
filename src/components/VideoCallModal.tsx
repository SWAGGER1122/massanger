import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CallControls,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
  type Call,
} from '@stream-io/video-react-sdk'
import {
  hasStreamConfig,
  streamApiKey,
  streamConfigError,
  streamTokenEndpoint,
} from '../lib/stream'
import type { Profile } from '../types/chat'

type VideoCallModalProps = {
  open: boolean
  profile: Profile
  callRoomKey: string
  memberIds: string[]
  onClose: () => void
  onError: (message: string) => void
}

export function VideoCallModal({
  open,
  profile,
  callRoomKey,
  memberIds,
  onClose,
  onError,
}: VideoCallModalProps) {
  const [client, setClient] = useState<StreamVideoClient | null>(null)
  const [call, setCall] = useState<Call | null>(null)
  const [joining, setJoining] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [retrySeed, setRetrySeed] = useState(0)
  const clientRef = useRef<StreamVideoClient | null>(null)
  const callRef = useRef<Call | null>(null)
  const activeSetupKeyRef = useRef('')
  const setupInProgressKeyRef = useRef('')

  const callId = useMemo(() => callRoomKey, [callRoomKey])
  const memberIdsKey = useMemo(() => [...memberIds].sort().join('|'), [memberIds])
  const stableMemberIds = useMemo(
    () => memberIdsKey.split('|').filter((id) => Boolean(id)),
    [memberIdsKey],
  )
  const setupKey = useMemo(
    () => `${callId}|${profile.id}|${memberIdsKey}|${retrySeed}`,
    [callId, memberIdsKey, profile.id, retrySeed],
  )

  useEffect(() => {
    if (!open || !hasStreamConfig) return
    if (activeSetupKeyRef.current === setupKey && clientRef.current && callRef.current) {
      setClient(clientRef.current)
      setCall(callRef.current)
      return
    }
    if (setupInProgressKeyRef.current === setupKey) return

    let isCancelled = false
    setupInProgressKeyRef.current = setupKey

    const setupCall = async () => {
      setJoining(true)
      setSetupError('')
      try {
        const fetchToken = async () => {
          const response = await fetch(streamTokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.id,
              name: profile.full_name || 'Family member',
            }),
          })

          if (!response.ok) {
            throw new Error(
              `Ошибка token endpoint (${response.status}). Проверьте VITE_STREAM_TOKEN_ENDPOINT: ${streamTokenEndpoint}`,
            )
          }

          const data = (await response.json()) as { token?: unknown }
          if (typeof data.token !== 'string' || !data.token.trim()) {
            throw new Error('Token endpoint вернул пустой или невалидный токен.')
          }

          return data.token
        }

        const tokenProvider = async () => {
          return fetchToken()
        }

        const currentClient = StreamVideoClient.getOrCreateInstance({
          apiKey: streamApiKey,
          user: {
            id: profile.id,
            name: profile.full_name || 'Family member',
            image: profile.avatar_url || undefined,
          },
          tokenProvider,
        })

        await tokenProvider()
        await currentClient.connectUser(
          {
            id: profile.id,
            name: profile.full_name || 'Family member',
            image: profile.avatar_url || undefined,
          },
          tokenProvider,
        )

        const currentCall = currentClient.call('default', callId)
        const ensureCall = currentCall.getOrCreate({
          data: {
            members: stableMemberIds.map((id) => ({ user_id: id })),
          },
        })
        const joinCall = currentCall.join()
        await Promise.race([
          Promise.all([ensureCall, joinCall]),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Таймаут подключения звонка. Нажмите "Повторить".')),
              12000,
            ),
          ),
        ])
        if (isCancelled) {
          await currentCall.leave()
          await currentClient.disconnectUser()
          return
        }
        activeSetupKeyRef.current = setupKey
        clientRef.current = currentClient
        callRef.current = currentCall
        setClient(currentClient)
        setCall(currentCall)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to start video call.'
        setSetupError(message)
        onError(message)
      } finally {
        if (setupInProgressKeyRef.current === setupKey) {
          setupInProgressKeyRef.current = ''
        }
        setJoining(false)
      }
    }

    setupCall()

    return () => {
      isCancelled = true
      if (setupInProgressKeyRef.current === setupKey) {
        setupInProgressKeyRef.current = ''
      }
    }
  }, [
    open,
    setupKey,
    callId,
    onError,
    profile.avatar_url,
    profile.full_name,
    profile.id,
    stableMemberIds,
  ])

  useEffect(() => {
    if (open) return
    const cleanup = async () => {
      const currentCall = callRef.current
      const currentClient = clientRef.current
      callRef.current = null
      clientRef.current = null
      activeSetupKeyRef.current = ''
      setupInProgressKeyRef.current = ''
      setCall(null)
      setClient(null)
      setJoining(false)
      setSetupError('')
      if (currentCall) {
        await currentCall.leave()
      }
      if (currentClient) {
        await currentClient.disconnectUser()
      }
    }
    cleanup()
  }, [open])

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        const currentCall = callRef.current
        const currentClient = clientRef.current
        callRef.current = null
        clientRef.current = null
        if (currentCall) {
          await currentCall.leave()
        }
        if (currentClient) {
          await currentClient.disconnectUser()
        }
      }
      cleanup()
    }
  }, [])

  if (!open) return null

  if (!hasStreamConfig) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
        <section className="w-full max-w-lg rounded-3xl border border-cyan-300/25 bg-slate-900/60 p-6 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
          <p className="text-white">Добавьте настройки Stream, чтобы активировать звонки.</p>
          <p className="mt-2 text-sm text-cyan-100/80">
            Endpoint по умолчанию: /api/stream-token
          </p>
          <p className="mt-2 text-sm text-amber-300">
            {streamConfigError || 'Проверь .env и перезапусти npm run dev'}
          </p>
          <button
            onClick={onClose}
            className="mt-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-sm text-white"
          >
            Закрыть
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm">
      {setupError && !joining && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <section className="w-full max-w-xl rounded-3xl border border-rose-300/35 bg-slate-900/80 p-6">
            <p className="text-sm text-rose-100">{setupError}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setRetrySeed((previous) => previous + 1)}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-sm text-white"
              >
                Повторить
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200"
              >
                Закрыть
              </button>
            </div>
          </section>
        </div>
      )}
      {joining || !client || !call ? (
        <div className="flex h-full items-center justify-center text-white">
          Подключаем звонок...
        </div>
      ) : (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <StreamTheme className="str-video h-full bg-gradient-to-br from-violet-900/60 via-blue-900/60 to-cyan-900/60">
              <div className="flex h-full flex-col">
                <div className="flex-1">
                  <SpeakerLayout participantsBarPosition="bottom" />
                </div>
                <CallControls onLeave={onClose} />
              </div>
            </StreamTheme>
          </StreamCall>
        </StreamVideo>
      )}
    </div>
  )
}

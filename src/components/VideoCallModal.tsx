import { useEffect, useMemo, useState } from 'react'
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

  const callId = useMemo(() => callRoomKey, [callRoomKey])

  useEffect(() => {
    if (!open || !hasStreamConfig) return
    let currentClient: StreamVideoClient | null = null
    let currentCall: Call | null = null

    const setupCall = async () => {
      setJoining(true)
      try {
        const tokenProvider = async () => {
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

          const data = (await response.json()) as { token: string }
          return data.token
        }

        currentClient = StreamVideoClient.getOrCreateInstance({
          apiKey: streamApiKey,
          user: {
            id: profile.id,
            name: profile.full_name || 'Family member',
            image: profile.avatar_url || undefined,
          },
          tokenProvider,
        })

        currentCall = currentClient.call('default', callId)
        await currentCall.getOrCreate({
          data: {
            members: memberIds.map((id) => ({ user_id: id })),
          },
        })
        await currentCall.join()
        setClient(currentClient)
        setCall(currentCall)
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Unable to start video call.')
      } finally {
        setJoining(false)
      }
    }

    setupCall()

    return () => {
      const cleanup = async () => {
        if (currentCall) {
          await currentCall.leave()
        }
        if (currentClient) {
          await currentClient.disconnectUser()
        }
      }

      cleanup()
      setCall(null)
      setClient(null)
    }
  }, [open, callId, memberIds, profile, onError])

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

"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Square, Bot, Smile, User, Loader2, PlayCircle } from "lucide-react"

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

export default function TestConversationPage() {
  const router = useRouter()
  const [patientId, setPatientId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState("")
  const [accumulatedText, setAccumulatedText] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [emotion, setEmotion] = useState("")
  const [emotionReason, setEmotionReason] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [token, setToken] = useState("")
  const [patientName, setPatientName] = useState("")
  const [wsConnected, setWsConnected] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const savedPatientId = localStorage.getItem("patientId")
    const savedToken = localStorage.getItem("token")
    const savedName = localStorage.getItem("patientName")

    if (savedPatientId && savedToken) {
      setPatientId(savedPatientId)
      setToken(savedToken)
      setPatientName(savedName || "")
      addLog("認証情報を読み込みました")

      setupWebSocket()
    } else {
      addLog("認証情報が見つかりません。ログインページに移動してください")
      router.push("/login")
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [router])

  // 音声URLが設定されたら自動再生
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      const playAudio = async () => {
        if (!audioRef.current) return

        try {
          audioRef.current.src = audioUrl
          audioRef.current.load() // 音声データをロード

          // ミュートを解除して音量を設定
          audioRef.current.muted = false
          audioRef.current.volume = 1.0

          addLog("音声ソース設定完了、再生開始...")

          await audioRef.current.play()
          addLog("✓ AI音声を自動再生中...")
        } catch (err: any) {
          addLog(`✗ 音声再生エラー: ${err.message}`)
          console.error("Audio play error:", err)

          // 自動再生が失敗した場合のフォールバック
          if (err.name === "NotAllowedError") {
            addLog("ℹ 自動再生がブロックされました。手動で再生ボタンをクリックしてください。")
          }
        }
      }

      playAudio()
    }
  }, [audioUrl])

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/conversation/`)

      ws.onopen = () => {
        addLog("WebSocket接続が確立されました")
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data)
      }

      ws.onerror = (error) => {
        addLog(`WebSocketエラー: ${JSON.stringify(error)}`)
        setWsConnected(false)
      }

      ws.onclose = () => {
        addLog("WebSocket接続が切断されました")
        setWsConnected(false)
      }

      wsRef.current = ws
    } catch (error) {
      addLog(`WebSocket接続エラー: ${error}`)
    }
  }

  const handleWebSocketMessage = (data: string) => {
    try {
      const message = JSON.parse(data)
      const messageType = message.type

      addLog(`WebSocketメッセージ受信: ${messageType}`)

      switch (messageType) {
        case "connection_established":
          addLog(message.message)
          break

        case "session_started":
          setSessionId(message.session_id)
          addLog(`セッション開始: ${message.session_id}`)
          setTimeout(() => {
            startRecordingInternal(message.session_id)
          }, 100)
          break

        case "audio_processed":
          setTranscribedText(message.transcribed_text)
          setAccumulatedText(message.accumulated_text)
          addLog(`STT結果: ${message.transcribed_text} (信頼度: ${message.confidence})`)
          break

        case "session_ended":
          console.log("session_ended message received:", message)
          setAiResponse(message.ai_response_text)
          setEmotion(message.emotion.name_ja || message.emotion.name)
          setEmotionReason(message.emotion_reason)
          addLog(`AI応答: ${message.ai_response_text}`)
          addLog(`感情: ${message.emotion.name_ja} (${message.emotion.name})`)
          addLog(`理由: ${message.emotion_reason}`)

          console.log("Checking audio data...", {
            hasAudioData: !!message.ai_audio_base64,
            audioLength: message.ai_audio_base64?.length || 0,
          })

          if (message.ai_audio_base64 && message.ai_audio_base64.length > 0) {
            addLog(`音声データ受信: ${message.ai_audio_base64.length} 文字 (base64)`)

            try {
              const audioBlob = base64ToBlob(message.ai_audio_base64, "audio/mpeg")
              console.log("Audio blob created:", audioBlob.size, "bytes")
              addLog(`音声Blob作成完了: ${audioBlob.size} bytes`)

              const newAudioUrl = URL.createObjectURL(audioBlob)
              console.log("Audio URL created:", newAudioUrl)

              // 音声URLを状態に設定（useEffectで自動再生される）
              setAudioUrl(newAudioUrl)
            } catch (error: any) {
              addLog(`✗ 音声処理エラー: ${error?.message || error}`)
              console.error("Audio processing error:", error)
            }
          } else {
            addLog("✗ 警告: 音声データが空です")
            console.log("Audio data is empty or missing")
          }

          setSessionId("")
          addLog("セッション終了完了。新しいセッションを開始できます。")
          break

        case "error":
          addLog(`エラー: ${message.message}`)
          alert(`エラー: ${message.message}`)
          break

        default:
          addLog(`未知のメッセージタイプ: ${messageType}`)
      }
    } catch (error: any) {
      addLog(`メッセージ処理エラー: ${error?.message || error}`)
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("ja-JP")
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev])
  }

  const handleLogout = () => {
    localStorage.removeItem("patientId")
    localStorage.removeItem("token")
    localStorage.removeItem("patientName")
    if (wsRef.current) {
      wsRef.current.close()
    }
    router.push("/login")
  }

  const startSession = async () => {
    if (!patientId || !token) {
      alert("Patient IDとTokenが見つかりません")
      return
    }

    if (!wsConnected || !wsRef.current) {
      alert("WebSocket接続がありません。ページをリロードしてください。")
      return
    }

    try {
      addLog("セッション開始リクエスト送信中...")

      clearAll()

      // 音声の自動再生をアンロック（ブラウザのポリシー対策）
      // clearAllの後に実行して、audio要素がクリーンな状態で行う
      if (audioRef.current) {
        try {
          // 無音のデータURIを使用してアンロック
          const silentAudio = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD/////////////////////////////////////////////////////////////////////////////////////AAAAAExhdmM1OC4xMzQAAAAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZA8P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"

          audioRef.current.muted = true
          audioRef.current.src = silentAudio
          await audioRef.current.play()
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current.src = "" // クリア
          audioRef.current.muted = false
          addLog("✓ 音声自動再生をアンロックしました")
        } catch (err: any) {
          addLog(`⚠ 音声アンロック: ${err.message}`)
          console.warn("Audio unlock failed (not critical):", err)
          // アンロック失敗でもセッションは開始
        }
      }

      wsRef.current.send(
        JSON.stringify({
          type: "start_session",
          patient_id: patientId,
        }),
      )
    } catch (error: any) {
      addLog(`エラー: ${error?.message || error}`)
      alert(`セッション開始失敗: ${error}`)
    }
  }

  const startRecordingInternal = async (sessionIdParam?: string) => {
    const currentSessionId = sessionIdParam || sessionId
    if (!currentSessionId) {
      alert("先にセッションを開始してください")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      addLog("録音開始")
    } catch (error: any) {
      addLog(`録音開始エラー: ${error?.message || error}`)
      alert(`マイクへのアクセスが許可されませんでした: ${error}`)
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.stop()
    setIsRecording(false)
    addLog("録音停止")

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
      addLog(`音声データサイズ: ${audioBlob.size} bytes`)

      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        await sendAudioToBackend(base64Audio)
      }

      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    }
  }

  const sendAudioToBackend = async (base64Audio: string) => {
    if (!sessionId) return

    if (!wsConnected || !wsRef.current) {
      addLog("WebSocket接続がありません")
      return
    }

    try {
      addLog("STT処理リクエスト送信中...")

      wsRef.current.send(
        JSON.stringify({
          type: "process_audio",
          session_id: sessionId,
          audio_data: base64Audio,
        }),
      )
    } catch (error: any) {
      addLog(`STT処理エラー: ${error?.message || error}`)
      alert(`音声認識失敗: ${error}`)
    }
  }

  const endSession = async () => {
    if (!sessionId) {
      alert("先にセッションを開始してください")
      return
    }

    if (!wsConnected || !wsRef.current) {
      alert("WebSocket接続がありません")
      return
    }

    if (isRecording && mediaRecorderRef.current) {
      addLog("録音を停止しています...")
      stopRecording()
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    try {
      addLog("セッション終了リクエスト送信中...")

      wsRef.current.send(
        JSON.stringify({
          type: "end_session",
          session_id: sessionId,
        }),
      )
    } catch (error: any) {
      addLog(`セッション終了エラー: ${error?.message || error}`)
      alert(`セッション終了失敗: ${error}`)
    }
  }

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    if (typeof atob === "undefined") {
      return new Blob([Buffer.from(base64, "base64")], { type: mimeType })
    }
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  const clearAll = () => {
    setTranscribedText("")
    setAccumulatedText("")
    setAiResponse("")
    setEmotion("")
    setEmotionReason("")
    setAudioUrl("")
    addLog("結果をクリアしました")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <Link href="/">
            <h1 className="font-heading text-3xl font-bold text-gray-800 transition-opacity hover:opacity-80">
              EmoCare
            </h1>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-full font-medium text-sm shadow-sm transition-all hover:shadow-md"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </header>

        <section className="bg-white shadow-lg rounded-3xl p-8 mb-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-4 shadow-lg">
              <Bot size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">AI アシスタント</h2>
            <p className="text-gray-600">あなたの気持ちに寄り添います</p>
          </div>
        </section>

        <section className="bg-white shadow-lg rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">対話コントロール</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={startSession}
              disabled={!wsConnected || !!sessionId}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-red-400 to-pink-500 text-white font-bold py-5 px-6 rounded-full text-lg
                         transition-all transform hover:scale-105 hover:shadow-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {sessionId ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  セッション開始
                </>
              ) : (
                <>
                  <PlayCircle size={24} />
                  セッション開始
                </>
              )}
            </button>

            <button
              onClick={endSession}
              disabled={!sessionId}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-5 px-6 rounded-full text-lg
                         transition-all transform hover:scale-105 hover:shadow-xl disabled:from-gray-200 disabled:to-gray-200 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              <Square size={24} />
              セッション終了
            </button>
          </div>
        </section>

        <section className="bg-white shadow-lg rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">AIの応答と分析結果</h2>

          <div className="mb-6">
            <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
              <Bot size={20} className="text-blue-500" />
              AIの応答
            </h3>
            {aiResponse ? (
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <p className="text-gray-900 leading-relaxed mb-3">{aiResponse}</p>
              </div>
            ) : (
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <p className="text-gray-500 text-center">セッション終了後にここに表示されます</p>
              </div>
            )}
            {/* audio要素を常にマウント（音声がある場合のみ表示） */}
            <audio
              ref={audioRef}
              controls
              className={audioUrl ? "w-full mt-3" : "w-full hidden"}
              muted={false}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                <User size={20} className="text-gray-600" />
                あなたの発話（累積）
              </h3>
              {accumulatedText ? (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 h-32 overflow-y-auto">
                  <p className="text-gray-900 leading-relaxed">{accumulatedText}</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 h-32 flex items-center justify-center">
                  <p className="text-gray-500 text-sm text-center">録音後にここに表示されます</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                <Smile size={20} className="text-yellow-500" />
                検出した感情
              </h3>
              {emotion ? (
                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                  <span className="inline-block bg-yellow-200 text-yellow-900 font-bold px-4 py-2 rounded-full text-lg mb-3">
                    {emotion}
                  </span>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">分析理由:</h4>
                  <p className="text-gray-800 text-sm leading-relaxed">{emotionReason}</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 h-32 flex items-center justify-center">
                  <p className="text-gray-500 text-sm text-center">セッション終了後にここに表示されます</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
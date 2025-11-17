'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // <-- ★エラー修正: この行を追加しました
// UI改善のためにアイコンをインポート
import { 
  LogOut, 
  Mic, 
  Square, 
  Bot, 
  Smile, 
  User, 
  Loader2,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ChevronRight
} from 'lucide-react';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export default function TestConversationPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [emotion, setEmotion] = useState('');
  const [emotionReason, setEmotionReason] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [patientName, setPatientName] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load from localStorage and setup WebSocket on mount
  useEffect(() => {
    const savedPatientId = localStorage.getItem('patientId');
    const savedToken = localStorage.getItem('token');
    const savedName = localStorage.getItem('patientName');

    if (savedPatientId && savedToken) {
      setPatientId(savedPatientId);
      setToken(savedToken);
      setPatientName(savedName || '');
      addLog('認証情報を読み込みました');

      // Setup WebSocket connection
      setupWebSocket();
    } else {
      addLog('認証情報が見つかりません。ログインページに移動してください');
      router.push('/login'); // 認証情報がない場合はログインにリダイレクト
    }

    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [router]); // routerを依存配列に追加

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/conversation/`);

      ws.onopen = () => {
        addLog('WebSocket接続が確立されました');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        addLog(`WebSocketエラー: ${JSON.stringify(error)}`);
        setWsConnected(false);
      };

      ws.onclose = () => {
        addLog('WebSocket接続が切断されました');
        setWsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      addLog(`WebSocket接続エラー: ${error}`);
    }
  };

  const handleWebSocketMessage = (data: string) => {
    try {
      const message = JSON.parse(data);
      const messageType = message.type;

      addLog(`WebSocketメッセージ受信: ${messageType}`);

      switch (messageType) {
        case 'connection_established':
          addLog(message.message);
          break;

        case 'session_started':
          setSessionId(message.session_id);
          addLog(`セッション開始: ${message.session_id}`);
          // 自動的に録音を開始
          setTimeout(() => {
            startRecordingInternal(message.session_id);
          }, 100);
          break;

        case 'audio_processed':
          setTranscribedText(message.transcribed_text);
          setAccumulatedText(message.accumulated_text);
          addLog(`STT結果: ${message.transcribed_text} (信頼度: ${message.confidence})`);
          break;

        case 'session_ended':
          console.log('session_ended message received:', message);
          setAiResponse(message.ai_response_text);
          setEmotion(message.emotion.name_ja || message.emotion.name);
          setEmotionReason(message.emotion_reason);
          addLog(`AI応答: ${message.ai_response_text}`);
          addLog(`感情: ${message.emotion.name_ja} (${message.emotion.name})`);
          addLog(`理由: ${message.emotion_reason}`);

          // Play AI audio response automatically
          console.log('Checking audio data...', {
            hasAudioData: !!message.ai_audio_base64,
            audioLength: message.ai_audio_base64?.length || 0,
            audioRefExists: !!audioRef.current
          });

          if (message.ai_audio_base64 && message.ai_audio_base64.length > 0) {
            addLog(`音声データ受信: ${message.ai_audio_base64.length} 文字 (base64)`);

            try {
              const audioBlob = base64ToBlob(message.ai_audio_base64, 'audio/mpeg');
              console.log('Audio blob created:', audioBlob.size, 'bytes');
              addLog(`音声Blob作成完了: ${audioBlob.size} bytes`);

              const audioUrl = URL.createObjectURL(audioBlob);
              console.log('Audio URL created:', audioUrl);

              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                addLog('音声ソース設定完了、再生開始...');

                audioRef.current.play().then(() => {
                  addLog('✓ AI音声を自動再生中...');
                }).catch((err) => {
                  addLog(`✗ 音声再生エラー: ${err.message}`);
                  console.error('Audio play error:', err);
                });
              } else {
                addLog('✗ エラー: audioRef.currentがnullです');
              }
            } catch (error: any) { // エラーに型を明記
              addLog(`✗ 音声処理エラー: ${error?.message || error}`);
              console.error('Audio processing error:', error);
            }
          } else {
            addLog('✗ 警告: 音声データが空です');
            console.log('Audio data is empty or missing');
          }

          // Clear session ID
          setSessionId('');
          addLog('セッション終了完了。新しいセッションを開始できます。');
          break;

        case 'error':
          addLog(`エラー: ${message.message}`);
          alert(`エラー: ${message.message}`);
          break;

        default:
          addLog(`未知のメッセージタイプ: ${messageType}`);
      }
    } catch (error: any) { // エラーに型を明記
      addLog(`メッセージ処理エラー: ${error?.message || error}`);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]); // 新しいログを上に追加
  };

  const handleLogout = () => {
    localStorage.removeItem('patientId');
    localStorage.removeItem('token');
    localStorage.removeItem('patientName');
    if (wsRef.current) {
      wsRef.current.close();
    }
    router.push('/login');
  };

  const startSession = async () => {
    if (!patientId || !token) {
      alert('Patient IDとTokenが見つかりません');
      return;
    }

    if (!wsConnected || !wsRef.current) {
      alert('WebSocket接続がありません。ページをリロードしてください。');
      return;
    }

    try {
      // Unlock audio autoplay by playing a silent audio on user interaction
      if (audioRef.current) {
        audioRef.current.muted = true;
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.muted = false;
          addLog('音声自動再生をアンロックしました');
        }).catch((err) => {
          addLog(`音声アンロック失敗（自動再生できない可能性があります）: ${err.message}`);
        });
      }

      addLog('セッション開始リクエスト送信中...');

      // Clear previous results
      clearAll();

      // Send WebSocket message to start session
      wsRef.current.send(JSON.stringify({
        type: 'start_session',
        patient_id: patientId
      }));

      // Recording will be started automatically after receiving session_started message

    } catch (error: any) { // エラーに型を明記
      addLog(`エラー: ${error?.message || error}`);
      alert(`セッション開始失敗: ${error}`);
    }
  };

  const startRecordingInternal = async (sessionIdParam?: string) => {
    const currentSessionId = sessionIdParam || sessionId;
    if (!currentSessionId) {
      alert('先にセッションを開始してください');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      addLog('録音開始');
    } catch (error: any) { // エラーに型を明記
      addLog(`録音開始エラー: ${error?.message || error}`);
      alert(`マイクへのアクセスが許可されませんでした: ${error}`);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    addLog('録音停止');

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      addLog(`音声データサイズ: ${audioBlob.size} bytes`);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendAudioToBackend(base64Audio);
      };

      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    };
  };

  const sendAudioToBackend = async (base64Audio: string) => {
    if (!sessionId) return;

    if (!wsConnected || !wsRef.current) {
      addLog('WebSocket接続がありません');
      return;
    }

    try {
      addLog('STT処理リクエスト送信中...');

      // Send WebSocket message to process audio
      wsRef.current.send(JSON.stringify({
        type: 'process_audio',
        session_id: sessionId,
        audio_data: base64Audio
      }));

    } catch (error: any) { // エラーに型を明記
      addLog(`STT処理エラー: ${error?.message || error}`);
      alert(`音声認識失敗: ${error}`);
    }
  };

  const endSession = async () => {
    if (!sessionId) {
      alert('先にセッションを開始してください');
      return;
    }

    if (!wsConnected || !wsRef.current) {
      alert('WebSocket接続がありません');
      return;
    }

    // 録音中の場合は停止して、音声データを送信
    if (isRecording && mediaRecorderRef.current) {
      addLog('録音を停止しています...');
      stopRecording();
      // 録音停止処理とSTT処理が完了するまで待つ
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      addLog('セッション終了リクエスト送信中...');

      // Send WebSocket message to end session
      wsRef.current.send(JSON.stringify({
        type: 'end_session',
        session_id: sessionId
      }));

    } catch (error: any) { // エラーに型を明記
      addLog(`セッション終了エラー: ${error?.message || error}`);
      alert(`セッション終了失敗: ${error}`);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    // btoa/atob がNode.js環境（SSR時など）で利用できない場合を考慮
    if (typeof atob === 'undefined') {
      // Node.js
      return new Blob([Buffer.from(base64, 'base64')], { type: mimeType });
    }
    // Browser
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Clear only results, not logs or session
  const clearAll = () => {
    setTranscribedText('');
    setAccumulatedText('');
    setAiResponse('');
    setEmotion('');
    setEmotionReason('');
    addLog('結果をクリアしました');
  };

  // --- UI (JSX) ---
  return (
    <div className="min-h-screen bg-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* --- ヘッダー --- */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
          <Link href="/">
            <h1 className="font-heading text-4xl font-bold text-gray-800 transition-opacity hover:opacity-80">
              EmoCare
            </h1>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-medium text-sm transition-colors hover:bg-gray-200"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </header>

        {/* --- ステータスカード --- */}
        <section className="bg-white shadow-xl rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">接続ステータス</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="font-semibold text-gray-700 mb-2">ログイン情報</div>
              <div className="flex items-center gap-2">
                {patientName ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : (
                  <XCircle size={18} className="text-red-500" />
                )}
                <span className="text-gray-900 truncate">{patientName || '不明な患者'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 truncate">ID: {patientId}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="font-semibold text-gray-700 mb-2">サーバー接続</div>
              <div className="flex items-center gap-2">
                {wsConnected ? (
                  <>
                    <CheckCircle2 size={18} className="text-green-500" />
                    <span className="text-gray-900">接続済み</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-red-500" />
                    <span className="text-gray-900">切断</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* --- 操作カード --- */}
        <section className="bg-white shadow-xl rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">対話コントロール</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* セッション開始ボタン */}
            <button
              onClick={startSession}
              disabled={!wsConnected || !!sessionId}
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-4 px-6 rounded-full text-lg
                         transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
            >
              {sessionId ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  録音中...
                </>
              ) : (
                <>
                  <PlayCircle size={24} />
                  セッション開始
                </>
              )}
            </button>
            
            {/* セッション終了ボタン */}
            <button
              onClick={endSession}
              disabled={!sessionId}
              className="flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-4 px-6 rounded-full text-lg
                         transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Square size={24} />
              セッション終了
            </button>
          </div>
        </section>
        
        {/* --- 結果カード --- */}
        <section className="bg-white shadow-xl rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">AIの応答と分析結果</h2>

          {/* AI応答 */}
          <div className="mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
              <Bot size={18} className="text-primary" />
              AIの応答
            </h3>
            {aiResponse ? (
              <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
                <p className="text-gray-900 leading-relaxed">{aiResponse}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">セッション終了後にここに表示されます</p>
            )}
            {/* Audio element is always rendered for autoplay to work */}
            <audio
              ref={audioRef}
              controls
              className={`w-full mt-3 ${aiResponse ? '' : 'hidden'}`}
            />
          </div>

          <hr className="my-6 border-gray-100" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* あなたの発話 */}
            <div className="mb-4">
              <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                <User size={18} className="text-gray-600" />
                あなたの発話（累積）
              </h3>
              {accumulatedText ? (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 h-32 overflow-y-auto">
                  <p className="text-gray-900 leading-relaxed">{accumulatedText}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">録音後にここに表示されます</p>
              )}
            </div>

            {/* 感情分析 */}
            <div className="mb-4">
              <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                <Smile size={18} className="text-gray-600" />
                検出した感情
              </h3>
              {emotion ? (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <span className="inline-block bg-primary/20 text-primary-dark font-bold px-4 py-1 rounded-full text-lg">
                    {emotion}
                  </span>
                  <h4 className="font-semibold text-gray-700 mt-3 mb-1 text-sm">分析理由:</h4>
                  <p className="text-gray-800 text-sm">{emotionReason}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">セッション終了後にここに表示されます</p>
              )}
            </div>
          </div>
        </section>

        {/* --- ログ --- */}
        <section className="mb-6">
          <details className="bg-white shadow-xl rounded-3xl overflow-hidden">
            <summary className="p-6 cursor-pointer flex justify-between items-center group">
              <h2 className="text-xl font-bold text-gray-800">
                詳細ログ
              </h2>
              <ChevronRight size={24} className="text-gray-500 transform transition-transform group-open:rotate-90" />
            </summary>
            <div className="bg-gray-900 text-green-400 p-4 font-mono text-sm h-64 overflow-y-auto border-t border-gray-200">
              {logs.length === 0 ? (
                <p className="text-gray-500">ログはまだありません</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1 break-all">
                    {log}
                  </div>
                ))
              )}
            </div>
          </details>
        </section>

      </div>
    </div>
  );
}
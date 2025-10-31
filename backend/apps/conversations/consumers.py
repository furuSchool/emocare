"""
WebSocket consumer for real-time conversation handling.
"""

import json
import base64
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.core.cache import cache
from django.utils import timezone
from .models import ConversationSession
from .services import DeepgramService, LLMService
from apps.emotions.models import Emotion


class ConversationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for conversation sessions"""

    async def connect(self):
        """Handle WebSocket connection"""
        print("WebSocket connection attempt")
        await self.accept()
        print("WebSocket connection accepted")
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket接続が確立されました'
        }))
        print("Connection message sent")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        pass

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages

        Expected message types:
        - start_session: セッション開始
        - process_audio: 音声データ処理（STT）
        - end_session: セッション終了（LLM + TTS）
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'start_session':
                await self.handle_start_session(data)
            elif message_type == 'process_audio':
                await self.handle_process_audio(data)
            elif message_type == 'end_session':
                await self.handle_end_session(data)
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))

        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing message: {str(e)}'
            }))

    async def handle_start_session(self, data):
        """Handle session start"""
        patient_id = data.get('patient_id')

        if not patient_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'patient_id is required'
            }))
            return

        # Create session in database
        session = await self.create_session(patient_id)

        # Initialize Redis cache
        cache_key = f"session:{session.id}:text"
        await self.cache_set(cache_key, "", timeout=3600)

        await self.send(text_data=json.dumps({
            'type': 'session_started',
            'session_id': str(session.id),
            'patient_id': str(session.patient.id),
            'started_at': session.started_at.isoformat(),
            'status': 'active'
        }))

    async def handle_process_audio(self, data):
        """Handle audio processing (STT)"""
        session_id = data.get('session_id')
        audio_data_base64 = data.get('audio_data')

        if not session_id or not audio_data_base64:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'session_id and audio_data are required'
            }))
            return

        # Verify session exists
        session = await self.get_session(session_id)
        if not session:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Session not found'
            }))
            return

        if not session.is_active:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Session already ended'
            }))
            return

        # Decode audio
        if audio_data_base64.startswith('data:audio'):
            audio_data_base64 = audio_data_base64.split(',', 1)[1]

        audio_bytes = base64.b64decode(audio_data_base64)

        # STT processing
        transcribed_text, confidence = await self.transcribe_audio(audio_bytes)

        # Update cache
        cache_key = f"session:{session_id}:text"
        current_text = await self.cache_get(cache_key, "")
        updated_text = f"{current_text} {transcribed_text}".strip()
        await self.cache_set(cache_key, updated_text, timeout=3600)

        await self.send(text_data=json.dumps({
            'type': 'audio_processed',
            'session_id': str(session_id),
            'transcribed_text': transcribed_text,
            'accumulated_text': updated_text,
            'confidence': confidence
        }))

    async def handle_end_session(self, data):
        """Handle session end with LLM analysis and TTS generation"""
        session_id = data.get('session_id')

        if not session_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'session_id is required'
            }))
            return

        # Verify session exists
        session = await self.get_session(session_id)
        if not session:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Session not found'
            }))
            return

        if not session.is_active:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Session already ended'
            }))
            return

        # Get accumulated text from Redis
        cache_key = f"session:{session_id}:text"
        patient_text = await self.cache_get(cache_key, "")

        # LLM analysis
        print(f"Starting LLM analysis for session {session_id}")
        analysis_result = await self.analyze_conversation(patient_text)
        print(f"LLM analysis complete. Response: {analysis_result['response'][:50]}...")

        # Get emotion from database
        emotion = await self.get_emotion(analysis_result['emotion'])
        print(f"Emotion selected: {emotion.name if emotion else 'None'}")

        # Generate TTS audio
        print(f"Generating TTS audio for text: {analysis_result['response'][:50]}...")
        ai_audio_data = await self.generate_tts(analysis_result['response'])
        print(f"TTS audio generated. Size: {len(ai_audio_data) if ai_audio_data else 0} bytes")

        # Convert audio to base64
        ai_audio_base64 = base64.b64encode(ai_audio_data).decode('utf-8') if ai_audio_data else ''
        print(f"Audio base64 length: {len(ai_audio_base64)}")

        # Update session in database
        await self.update_session(
            session_id,
            patient_text,
            analysis_result['response'],
            emotion,
            analysis_result['reason']
        )

        # Clear cache
        await self.cache_delete(cache_key)

        # Send response with audio
        response_message = {
            'type': 'session_ended',
            'session_id': str(session_id),
            'patient_text': patient_text,
            'ai_response_text': analysis_result['response'],
            'ai_audio_base64': ai_audio_base64,
            'emotion': {
                'id': str(emotion.id) if emotion else None,
                'name': emotion.name if emotion else None,
                'name_ja': emotion.name_ja if emotion else None
            },
            'emotion_reason': analysis_result['reason'],
            'ended_at': timezone.now().isoformat()
        }
        print(f"Sending session_ended message. Audio base64 length: {len(ai_audio_base64)}")
        await self.send(text_data=json.dumps(response_message))
        print("session_ended message sent successfully")

    @database_sync_to_async
    def create_session(self, patient_id):
        """Create new conversation session"""
        session = ConversationSession.objects.create(
            patient_id=patient_id,
            started_at=timezone.now()
        )
        # Refresh from DB with patient preloaded to avoid lazy loading in async context
        return ConversationSession.objects.select_related('patient').get(id=session.id)

    @database_sync_to_async
    def get_session(self, session_id):
        """Get session from database"""
        try:
            return ConversationSession.objects.select_related('patient').get(id=session_id)
        except ConversationSession.DoesNotExist:
            return None

    @database_sync_to_async
    def update_session(self, session_id, patient_text, ai_response, emotion, emotion_reason):
        """Update session with analysis results"""
        session = ConversationSession.objects.get(id=session_id)
        session.ended_at = timezone.now()
        session.patient_text = patient_text
        session.ai_response_text = ai_response
        session.emotion = emotion
        session.emotion_reason = emotion_reason
        session.save()

    @database_sync_to_async
    def get_emotion(self, emotion_name):
        """Get emotion from database"""
        try:
            return Emotion.objects.get(name=emotion_name)
        except Emotion.DoesNotExist:
            return Emotion.objects.first()

    @sync_to_async
    def transcribe_audio(self, audio_bytes):
        """Transcribe audio using Deepgram STT"""
        deepgram_service = DeepgramService()
        return deepgram_service.transcribe(audio_bytes)

    @sync_to_async
    def analyze_conversation(self, patient_text):
        """Analyze conversation using LLM"""
        llm_service = LLMService()
        return llm_service.analyze_conversation(patient_text)

    @sync_to_async
    def generate_tts(self, text):
        """Generate TTS audio"""
        deepgram_service = DeepgramService()
        return deepgram_service.text_to_speech(text)

    # Cache operations (sync to async)
    @sync_to_async
    def cache_get(self, key, default=None):
        """Get value from cache"""
        return cache.get(key, default)

    @sync_to_async
    def cache_set(self, key, value, timeout=None):
        """Set value in cache"""
        return cache.set(key, value, timeout=timeout)

    @sync_to_async
    def cache_delete(self, key):
        """Delete value from cache"""
        return cache.delete(key)

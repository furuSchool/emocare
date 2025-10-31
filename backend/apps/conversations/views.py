"""
Conversation views.
"""

import base64
import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.core.cache import cache
from .models import ConversationSession
from .serializers import ConversationSessionSerializer, AudioChunkSerializer
from .services import DeepgramService, LLMService
from apps.emotions.models import Emotion


class ConversationViewSet(viewsets.ViewSet):
    """会話管理ViewSet"""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='start')
    def start_session(self, request):
        """
        会話セッション開始
        POST /api/v1/conversation/start/
        """
        patient_id = request.data.get('patient_id')

        if not patient_id:
            return Response(
                {'error': 'patient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # patient_idを整数に変換
        try:
            patient_id = int(patient_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'patient_id must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new session
        session = ConversationSession.objects.create(
            patient_id=patient_id,
            started_at=timezone.now()
        )

        # Initialize Redis cache for accumulated text
        cache_key = f"session:{session.id}:text"
        cache.set(cache_key, "", timeout=3600)  # 1 hour TTL

        return Response({
            'session_id': str(session.id),
            'patient_id': str(session.patient.id),
            'started_at': session.started_at.isoformat(),
            'status': 'active'
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='session')
    def process_audio(self, request):
        """
        セッション通信（STT処理）
        POST /api/v1/conversation/session/
        """
        serializer = AudioChunkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data['session_id']
        audio_data_base64 = serializer.validated_data['audio_data']

        # Verify session exists and is active
        try:
            session = ConversationSession.objects.get(id=session_id)
        except ConversationSession.DoesNotExist:
            return Response(
                {'error': 'session_not_found', 'message': 'セッションが見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not session.is_active:
            return Response(
                {'error': 'session_already_ended', 'message': 'セッションは既に終了しています'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Decode base64 audio data
        if audio_data_base64.startswith('data:audio'):
            audio_data_base64 = audio_data_base64.split(',', 1)[1]
        
        audio_bytes = base64.b64decode(audio_data_base64)

        # STT with Deepgram
        deepgram_service = DeepgramService()
        transcribed_text, confidence = deepgram_service.transcribe(audio_bytes)

        # Append to Redis cache
        cache_key = f"session:{session_id}:text"
        current_text = cache.get(cache_key, "")
        updated_text = f"{current_text} {transcribed_text}".strip()
        cache.set(cache_key, updated_text, timeout=3600)

        return Response({
            'session_id': str(session_id),
            'transcribed_text': transcribed_text,
            'accumulated_text': updated_text,
            'confidence': confidence
        })


class SessionViewSet(viewsets.ViewSet):
    """セッション終了ViewSet"""

    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='end')
    def end_session(self, request, pk=None):
        """
        会話終了・保存・解析
        POST /api/v1/sessions/{session_id}/end/
        """
        session_id = pk

        # Verify session exists
        try:
            session = ConversationSession.objects.get(id=session_id)
        except ConversationSession.DoesNotExist:
            return Response(
                {'error': 'session_not_found', 'message': 'セッションが見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not session.is_active:
            return Response(
                {'error': 'session_already_ended', 'message': 'セッションは既に終了しています'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get accumulated text from Redis
        cache_key = f"session:{session_id}:text"
        patient_text = cache.get(cache_key, "")

        # LLM analysis
        llm_service = LLMService()
        try:
            analysis_result = llm_service.analyze_conversation(patient_text)
        except Exception as e:
            return Response(
                {'error': 'llm_processing_failed', 'message': f'感情分析に失敗しました: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Get emotion from database
        try:
            emotion = Emotion.objects.get(name=analysis_result['emotion'])
        except Emotion.DoesNotExist:
            emotion = Emotion.objects.first()

        # Generate TTS audio
        deepgram_service = DeepgramService()
        ai_audio_data = deepgram_service.text_to_speech(analysis_result['response'])
        
        # Convert audio to base64 for response
        ai_audio_base64 = base64.b64encode(ai_audio_data).decode('utf-8') if ai_audio_data else ''

        # Update session
        session.ended_at = timezone.now()
        session.patient_text = patient_text
        session.ai_response_text = analysis_result['response']
        session.emotion = emotion
        session.emotion_reason = analysis_result['reason']
        session.save()

        # Clear Redis cache
        cache.delete(cache_key)

        return Response({
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
            'ended_at': session.ended_at.isoformat()
        })


class ConversationSessionViewSet(viewsets.ModelViewSet):
    """会話セッション管理ViewSet（既存機能維持）"""

    queryset = ConversationSession.objects.all()
    serializer_class = ConversationSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """GETメソッドは認証不要（一時的）、今後は医者側の認証を実装予定"""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()

        params = self.request.query_params
        patient_id = params.get('patient_id')
        if patient_id:
            # クォートを削除し、整数に変換
            patient_id = patient_id.strip('"\'')
            try:
                patient_id = int(patient_id)
            except (ValueError, TypeError):
                pass
            queryset = queryset.filter(patient_id=patient_id)

        # Time range filters
        from_str = params.get('from')
        to_str = params.get('to')

        if from_str:
            dt_from = parse_datetime(from_str)
            if dt_from is not None:
                if timezone.is_naive(dt_from):
                    dt_from = timezone.make_aware(dt_from, timezone.get_current_timezone())
                queryset = queryset.filter(started_at__gte=dt_from)

        if to_str:
            dt_to = parse_datetime(to_str)
            if dt_to is not None:
                if timezone.is_naive(dt_to):
                    dt_to = timezone.make_aware(dt_to, timezone.get_current_timezone())
                queryset = queryset.filter(started_at__lte=dt_to)

        # Ordering
        order = params.get('order', 'desc').strip('"\'').lower()
        if order not in ('asc', 'desc'):
            order = 'desc'
        queryset = queryset.order_by('started_at' if order == 'asc' else '-started_at')

        # Limit
        limit = params.get('limit')
        if limit:
            try:
                n = max(1, min(int(limit), 500))
                queryset = queryset[:n]
            except (TypeError, ValueError):
                # ignore invalid limit, return full queryset
                pass

        return queryset

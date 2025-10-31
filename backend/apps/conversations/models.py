"""
Conversation models.
"""

from django.db import models
from apps.core.models import TimeStampedModel
from apps.patients.models import Patient


class ConversationSession(TimeStampedModel):
    """会話セッションモデル

    患者とAIの1回の会話セッション全体を記録。
    会話テキスト、AI応答、感情分析結果を統合管理。
    """

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name='患者'
    )
    started_at = models.DateTimeField(
        verbose_name='開始日時'
    )
    ended_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='終了日時'
    )
    patient_text = models.TextField(
        null=True,
        blank=True,
        verbose_name='患者発話テキスト',
        help_text='STTで変換されたテキスト全文'
    )
    ai_response_text = models.TextField(
        null=True,
        blank=True,
        verbose_name='AI応答テキスト',
        help_text='LLMが生成した共感的応答'
    )
    emotion = models.ForeignKey(
        'emotions.Emotion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
        verbose_name='感情'
    )
    emotion_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name='感情選定理由',
        help_text='LLMが感情を選んだ理由'
    )

    class Meta:
        db_table = 'conversation_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(
                fields=['patient', 'started_at'],
                name='idx_session_patient_started'
            ),
            models.Index(fields=['emotion'], name='idx_session_emotion'),
            models.Index(fields=['started_at'], name='idx_session_started'),
        ]
        verbose_name = '会話セッション'
        verbose_name_plural = '会話セッション'

    def __str__(self):
        return f"Session {self.id} - {self.patient.name} ({self.started_at})"

    @property
    def is_active(self):
        """セッションがアクティブかどうか

        Returns:
            bool: ended_atがNullならTrue（アクティブ）
        """
        return self.ended_at is None

    @property
    def duration(self):
        """会話時間（秒）を計算

        Returns:
            float: 会話時間（秒）、ended_atがNullならNone
        """
        if self.ended_at and self.started_at:
            return (self.ended_at - self.started_at).total_seconds()
        return None

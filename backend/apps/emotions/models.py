"""
Emotion models.
"""

from django.db import models
from apps.core.models import TimeStampedModel


class Emotion(TimeStampedModel):
    """感情マスターモデル

    プルチックの52感情をマスターデータとして管理。
    LLMが感情分析時に参照する。
    """

    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='感情名',
        help_text='英語名（小文字）'
    )
    name_ja = models.CharField(
        max_length=50,
        verbose_name='感情名（日本語）'
    )

    class Meta:
        db_table = 'emotions'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name'], name='idx_emotion_name'),
        ]
        verbose_name = '感情'
        verbose_name_plural = '感情'

    def __str__(self):
        return f"{self.name_ja} ({self.name})"

"""
Emotion serializers.
"""

from rest_framework import serializers
from .models import Emotion


class EmotionSerializer(serializers.ModelSerializer):
    """感情マスターシリアライザ"""

    class Meta:
        model = Emotion
        fields = ['id', 'name', 'name_ja', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

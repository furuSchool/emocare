"""
Conversation serializers.
"""

from rest_framework import serializers
from .models import ConversationSession


class ConversationSessionSerializer(serializers.ModelSerializer):
    """会話セッションシリアライザ"""

    patient = serializers.PrimaryKeyRelatedField(read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    emotion = serializers.PrimaryKeyRelatedField(read_only=True)
    emotion_name = serializers.CharField(source='emotion.name_ja', read_only=True)
    emotion_key = serializers.CharField(source='emotion.name', read_only=True)
    duration = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = ConversationSession
        fields = [
            'id', 'patient', 'patient_name', 'started_at', 'ended_at',
            'patient_text', 'ai_response_text', 'emotion', 'emotion_name',
            'emotion_key', 'emotion_reason',
            'emotion_reason', 'duration', 'is_active'
        ]
        read_only_fields = ['id', 'patient', 'emotion', 'started_at', 'duration', 'is_active']


class AudioChunkSerializer(serializers.Serializer):
    """音声チャンクシリアライザ"""

    session_id = serializers.IntegerField()
    audio_data = serializers.CharField(help_text="Base64エンコードされた音声データ")

    def validate_audio_data(self, value):
        """音声データのバリデーション"""
        import base64
        
        # Data URL形式の場合、カンマ以降を取得
        if value.startswith('data:audio'):
            value = value.split(',', 1)[1] if ',' in value else value
        
        try:
            # Base64デコード確認
            decoded = base64.b64decode(value)
            if len(decoded) == 0:
                raise serializers.ValidationError("音声データが空です")
        except Exception as e:
            raise serializers.ValidationError(f"無効な音声データ形式です: {str(e)}")
        
        return value

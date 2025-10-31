"""
Conversation admin.
"""

from django.contrib import admin
from .models import ConversationSession


@admin.register(ConversationSession)
class ConversationSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'started_at', 'ended_at', 'emotion']
    list_filter = ['started_at', 'emotion']
    search_fields = ['patient__email', 'patient__name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'duration']
    fieldsets = (
        ('基本情報', {
            'fields': ('patient', 'started_at', 'ended_at')
        }),
        ('会話内容', {
            'fields': ('patient_text', 'ai_response_text')
        }),
        ('感情分析', {
            'fields': ('emotion', 'emotion_reason')
        }),
        ('メタデータ', {
            'fields': ('id', 'created_at', 'updated_at', 'duration'),
            'classes': ('collapse',)
        }),
    )

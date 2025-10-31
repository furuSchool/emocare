"""
Emotion admin.
"""

from django.contrib import admin
from .models import Emotion


@admin.register(Emotion)
class EmotionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'name_ja']
    list_filter = ['name']
    search_fields = ['name', 'name_ja']
    readonly_fields = ['id', 'created_at', 'updated_at']

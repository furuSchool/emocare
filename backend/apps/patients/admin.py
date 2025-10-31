"""
Patient admin.
"""

from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['email', 'name', 'gender', 'admission_date', 'created_at']
    list_filter = ['gender', 'admission_date']
    search_fields = ['email', 'name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    exclude = ['password']  # パスワードハッシュは直接編集させない

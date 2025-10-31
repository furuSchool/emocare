"""
Emotion URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmotionViewSet

router = DefaultRouter()
router.register(r'emotions', EmotionViewSet, basename='emotion')

urlpatterns = [
    path('', include(router.urls)),
]

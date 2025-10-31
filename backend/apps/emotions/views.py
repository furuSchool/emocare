"""
Emotion views.
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Emotion
from .serializers import EmotionSerializer


class EmotionViewSet(viewsets.ReadOnlyModelViewSet):
    """感情マスターViewSet"""

    queryset = Emotion.objects.all()
    serializer_class = EmotionSerializer
    permission_classes = [IsAuthenticated]

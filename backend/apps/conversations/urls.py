"""
Conversation URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, SessionViewSet, ConversationSessionViewSet

router = DefaultRouter()
router.register(r'sessions', ConversationSessionViewSet, basename='conversationsession')

urlpatterns = [
    path('conversation/start/', ConversationViewSet.as_view({'post': 'start_session'}), name='conversation-start'),
    path('conversation/session/', ConversationViewSet.as_view({'post': 'process_audio'}), name='conversation-session'),
    path('sessions/<uuid:pk>/end/', SessionViewSet.as_view({'post': 'end_session'}), name='session-end'),
    path('', include(router.urls)),
]


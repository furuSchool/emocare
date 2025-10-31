"""
Authentication utilities.
"""

import secrets
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.core.cache import cache
from apps.patients.models import Patient


class PatientTokenAuthentication(BaseAuthentication):
    """患者用Token認証"""

    def authenticate(self, request):
        """リクエストを認証する"""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth_header.startswith('Token '):
            return None

        token = auth_header.split(' ')[1]
        return self.authenticate_credentials(token)

    def authenticate_credentials(self, token):
        """トークンを検証し、患者を取得"""
        # Redisからpatient_idを取得
        patient_id = cache.get(f"token:{token}")

        if not patient_id:
            raise AuthenticationFailed('無効なトークンです')

        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            cache.delete(f"token:{token}")
            raise AuthenticationFailed('ユーザーが見つかりません')

        return (patient, token)


def generate_token():
    """セキュアなトークンを生成"""
    return secrets.token_urlsafe(24)[:32]


def save_token(patient_id, token, ttl=86400):
    """トークンをRedisに保存"""
    cache.set(f"token:{token}", str(patient_id), timeout=ttl)


def delete_token(token):
    """トークンをRedisから削除"""
    cache.delete(f"token:{token}")

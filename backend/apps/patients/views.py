"""
Patient views.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Patient
from .serializers import (
    PatientSerializer,
    PatientListSerializer,
    PatientRegisterSerializer,
    PatientLoginSerializer
)
from apps.core.authentication import delete_token


class PatientViewSet(viewsets.ModelViewSet):
    """患者ViewSet"""

    queryset = Patient.objects.all()

    def get_permissions(self):
        if self.action in ['register', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'register':
            return PatientRegisterSerializer
        elif self.action == 'login':
            return PatientLoginSerializer
        elif self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        """
        患者新規登録
        POST /api/v1/patients/register/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()

        return Response({
            'id': str(patient.id),
            'name': patient.name,
            'email': patient.email,
            'birth_date': patient.birth_date,
            'gender': patient.gender,
            'admission_date': patient.admission_date,
            'created_at': patient.created_at.isoformat(),
            'token': patient.token
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        患者ログイン
        POST /api/v1/patients/login/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        patient = serializer.validated_data['patient']
        token = serializer.validated_data['token']

        return Response({
            'id': str(patient.id),
            'name': patient.name,
            'email': patient.email,
            'token': token
        })

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        患者ログアウト
        POST /api/v1/patients/logout/
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token = auth_header.split(' ')[1]
            delete_token(token)

        return Response({'message': 'ログアウトしました'})

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """患者ダッシュボードデータ取得"""
        patient = self.get_object()

        # TODO: Implement dashboard data aggregation
        dashboard_data = {
            'patient': PatientSerializer(patient).data,
            'recent_sessions': [],  # 最近の会話セッション
            'emotion_summary': {},  # 感情サマリー
            'active_alerts': [],  # アクティブなアラート
        }

        return Response(dashboard_data)


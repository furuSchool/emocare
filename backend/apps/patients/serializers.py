"""
Patient serializers.
"""

from rest_framework import serializers
from .models import Patient
from apps.core.authentication import generate_token, save_token


class PatientSerializer(serializers.ModelSerializer):
    """患者シリアライザ"""

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'email', 'birth_date', 'gender',
            'admission_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PatientListSerializer(serializers.ModelSerializer):
    """患者一覧用シリアライザ"""

    class Meta:
        model = Patient
        fields = ['id', 'name', 'email', 'admission_date']


class PatientRegisterSerializer(serializers.ModelSerializer):
    """患者登録用シリアライザ"""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    token = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'email', 'password',
            'birth_date', 'gender', 'admission_date',
            'created_at', 'token'
        ]
        read_only_fields = ['id', 'created_at', 'token']

    def validate_email(self, value):
        """メールアドレスのバリデーション"""
        value = value.lower()
        if Patient.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "このメールアドレスは既に登録されています"
            )
        return value

    def validate_password(self, value):
        """パスワードのバリデーション"""
        if len(value) < 8:
            raise serializers.ValidationError(
                "パスワードは8文字以上である必要があります"
            )
        return value

    def create(self, validated_data):
        """患者作成とトークン発行"""
        password = validated_data.pop('password')
        patient = Patient(**validated_data)
        patient.set_password(password)
        patient.save()

        # トークン生成・保存
        token = generate_token()
        save_token(patient.id, token)

        # トークンを追加して返す
        patient.token = token
        return patient


class PatientLoginSerializer(serializers.Serializer):
    """患者ログイン用シリアライザ"""

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, data):
        """認証検証"""
        email = data.get('email', '').lower()
        password = data.get('password', '')

        try:
            patient = Patient.objects.get(email=email)
        except Patient.DoesNotExist:
            raise serializers.ValidationError(
                "メールアドレスまたはパスワードが正しくありません"
            )

        if not patient.check_password(password):
            raise serializers.ValidationError(
                "メールアドレスまたはパスワードが正しくありません"
            )

        # トークン生成
        token = generate_token()
        save_token(patient.id, token)

        data['patient'] = patient
        data['token'] = token
        return data


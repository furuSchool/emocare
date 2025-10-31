"""
Patient models.
"""

from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from apps.core.models import TimeStampedModel


class Patient(TimeStampedModel):
    """患者モデル

    患者の基本情報と認証情報を管理。
    メールアドレスとパスワードでログイン認証を行う。
    """

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    name = models.CharField(
        max_length=100,
        verbose_name='患者名'
    )
    email = models.EmailField(
        unique=True,
        verbose_name='メールアドレス',
        help_text='ログインIDとして使用'
    )
    password = models.CharField(
        max_length=255,
        verbose_name='パスワード',
        help_text='bcryptでハッシュ化して保存'
    )
    birth_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='生年月日'
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        null=True,
        blank=True,
        verbose_name='性別'
    )
    admission_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='入院日'
    )

    class Meta:
        db_table = 'patients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email'], name='idx_patient_email'),
            models.Index(fields=['created_at'], name='idx_patient_created'),
        ]
        verbose_name = '患者'
        verbose_name_plural = '患者'

    @property
    def is_authenticated(self):
        """常に認証済みとして扱う（Django User互換性）"""
        return True

    @property
    def is_anonymous(self):
        """匿名ユーザーではない（Django User互換性）"""
        return False

    def set_password(self, raw_password):
        """パスワードをハッシュ化して保存

        Args:
            raw_password (str): 平文パスワード
        """
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        """パスワード検証

        Args:
            raw_password (str): 検証する平文パスワード

        Returns:
            bool: パスワードが一致すればTrue
        """
        return check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.name} ({self.email})"

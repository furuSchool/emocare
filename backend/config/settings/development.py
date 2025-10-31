"""
Django settings for ECAI project - Development Environment.
"""

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Development-specific apps
# INSTALLED_APPS += [
#     'django_extensions',  # Optional: Add if you want extra management commands
# ]

# Database for development (can override to use SQLite for local dev)
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_ROOT = BASE_DIR / 'media'

# Logging
LOGGING['root']['level'] = 'DEBUG'
LOGGING['loggers']['django']['level'] = 'DEBUG'
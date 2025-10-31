"""
Deepgram STT/TTS Service using Deepgram API.
"""

import base64
import os
import requests
from django.conf import settings


class DeepgramService:
    """Deepgram API wrapper for STT and TTS"""

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1"

    def transcribe(self, audio_data):
        """
        音声データをテキストに変換（STT）

        Args:
            audio_data (bytes): 音声データ（バイナリ）

        Returns:
            tuple: (transcribed_text, confidence)
        """
        url = f"{self.base_url}/listen"
        
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "audio/webm"
        }
        
        params = {
            "model": "nova-2",
            "language": "ja",
            "punctuate": "true",
            "utterances": "true"
        }

        try:
            response = requests.post(
                url,
                headers=headers,
                params=params,
                data=audio_data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract transcript and confidence
            alternatives = result.get('results', {}).get('channels', [{}])[0].get('alternatives', [{}])
            if alternatives:
                transcript = alternatives[0].get('transcript', '')
                confidence = alternatives[0].get('confidence', 0.0)
                return transcript, confidence
            
            return '', 0.0
            
        except requests.exceptions.RequestException as e:
            print(f"Deepgram STT Error: {e}")
            return '', 0.0

    def text_to_speech(self, text):
        """
        テキストを音声に変換（TTS）
        Note: Deepgram Aura doesn't support Japanese yet, so using OpenAI TTS instead

        Args:
            text (str): 音声化するテキスト

        Returns:
            bytes: 音声データ（MP3形式）
        """
        if not text or text.strip() == '':
            print("TTS Warning: Empty text provided")
            return b''

        # Use OpenAI TTS API (supports Japanese)
        from openai import OpenAI

        try:
            print(f"TTS Request (OpenAI): {text[:50]}...")
            client = OpenAI(api_key=settings.OPENAI_API_KEY)

            response = client.audio.speech.create(
                model="tts-1",  # or "tts-1-hd" for higher quality
                voice="nova",   # Options: alloy, echo, fable, onyx, nova, shimmer
                input=text
            )

            # Read binary audio data from response
            audio_data = response.read()
            print(f"TTS Success: Received {len(audio_data)} bytes")
            return audio_data

        except Exception as e:
            print(f"OpenAI TTS Error: {e}")
            import traceback
            traceback.print_exc()
            return b''

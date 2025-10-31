"""
LLM Service using OpenAI GPT for emotion analysis and response generation.
"""

import json
import openai
from django.conf import settings
from apps.emotions.models import Emotion


class LLMService:
    """OpenAI LLM Service for conversation analysis"""

    def __init__(self):
        self.client = openai.Client(api_key=settings.OPENAI_API_KEY)

    def analyze_conversation(self, patient_text):
        """
        会話テキストを分析し、応答と感情を生成

        Args:
            patient_text (str): 患者の会話テキスト

        Returns:
            dict: {
                'response': AI応答テキスト,
                'emotion': 感情名（英語）,
                'reason': 感情選定理由
            }
        """
        if not patient_text or patient_text.strip() == '':
            return {
                'response': '何かお話しされたいことはありますか？',
                'emotion': 'neutral',
                'reason': '患者からの発話がありませんでした。'
            }

        # Get emotions list
        emotions_list = list(Emotion.objects.values_list('name', flat=True))
        if not emotions_list:
            emotions_list = ['joy', 'sadness', 'fear', 'anger', 'neutral']

        prompt = f"""あなたは共感的で非批判的な医療AIアシスタントです。

患者の会話テキスト:
{patient_text}

以下のタスクを同時に実行してください:
1. 患者に対する共感的で非批判的な応答を生成してください（50文字以内）
2. 患者の感情を以下の感情から1つ選んでください:
   {', '.join(emotions_list)}
3. その感情を選んだ理由を簡潔に説明してください（100文字以内）

JSON形式で返答してください:
{{
  "response": "応答テキスト",
  "emotion": "感情名（英語）",
  "reason": "感情選定理由"
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # gpt-4o-miniはjson_objectをサポート
                messages=[
                    {"role": "system", "content": "あなたは共感的な医療AIアシスタントです。患者の気持ちに寄り添い、非批判的に応答します。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=500
            )

            result = json.loads(response.choices[0].message.content)
            
            # Validate emotion exists in database
            emotion_name = result.get('emotion', 'neutral')
            if not Emotion.objects.filter(name=emotion_name).exists():
                # Fallback to neutral if emotion not found
                emotion_name = 'neutral'
                if not Emotion.objects.filter(name='neutral').exists():
                    # Use first available emotion
                    emotion_name = emotions_list[0] if emotions_list else 'joy'
            
            result['emotion'] = emotion_name
            
            return result

        except Exception as e:
            print(f"LLM Analysis Error: {e}")
            # Return fallback response
            return {
                'response': 'お話を聞かせていただき、ありがとうございます。',
                'emotion': 'neutral',
                'reason': 'システムエラーのため、詳細な分析ができませんでした。'
            }

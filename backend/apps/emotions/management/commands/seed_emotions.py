"""
Management command to seed Plutchik's 52 emotions into the database.
"""

from django.core.management.base import BaseCommand
from apps.emotions.models import Emotion


class Command(BaseCommand):
    help = "Seed Plutchik's 52 emotions into the database"

    def handle(self, *args, **options):
        """Seed emotions based on Plutchik's emotion model"""

        # Plutchik's 52 emotions with Japanese translations
        emotions = [
            # Primary emotions (8)
            ('joy', '喜び'),
            ('trust', '信頼'),
            ('fear', '恐れ'),
            ('surprise', '驚き'),
            ('sadness', '悲しみ'),
            ('disgust', '嫌悪'),
            ('anger', '怒り'),
            ('anticipation', '期待'),

            # Secondary emotions (dyads)
            ('optimism', '楽観'),
            ('love', '愛'),
            ('submission', '服従'),
            ('awe', '畏敬'),
            ('disapproval', '不承認'),
            ('remorse', '後悔'),
            ('contempt', '軽蔑'),
            ('aggressiveness', '攻撃性'),

            # Tertiary emotions
            ('guilt', '罪悪感'),
            ('shame', '恥'),
            ('pride', 'プライド'),
            ('hope', '希望'),
            ('anxiety', '不安'),
            ('nervousness', '神経質'),
            ('terror', '恐怖'),
            ('panic', 'パニック'),
            ('amazement', '驚愕'),
            ('distraction', '気が散る'),
            ('grief', '悲嘆'),
            ('loathing', '嫌悪感'),
            ('boredom', '退屈'),
            ('annoyance', 'イライラ'),
            ('rage', '激怒'),
            ('vigilance', '警戒'),
            ('interest', '興味'),
            ('serenity', '平穏'),
            ('acceptance', '受容'),
            ('apprehension', '懸念'),
            ('pensiveness', '物思い'),
            ('ecstasy', '恍惚'),
            ('admiration', '賞賛'),
            ('terror', '恐怖'),
            ('grief', '悲嘆'),
            ('loathing', '嫌悪感'),
            ('rage', '激怒'),
            ('vigilance', '警戒'),
            ('ecstasy', '恍惚'),

            # Additional common emotions
            ('neutral', '中立'),
            ('confusion', '混乱'),
            ('frustration', '欲求不満'),
            ('excitement', '興奮'),
            ('contentment', '満足'),
            ('relief', '安堵'),
        ]

        # Remove duplicates while preserving order
        seen = set()
        unique_emotions = []
        for name, name_ja in emotions:
            if name not in seen:
                seen.add(name)
                unique_emotions.append((name, name_ja))

        created_count = 0
        updated_count = 0

        for name, name_ja in unique_emotions:
            emotion, created = Emotion.objects.get_or_create(
                name=name,
                defaults={'name_ja': name_ja}
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created: {name} ({name_ja})')
                )
            else:
                # Update Japanese name if different
                if emotion.name_ja != name_ja:
                    emotion.name_ja = name_ja
                    emotion.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated: {name} ({name_ja})')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSeeding complete: {created_count} created, {updated_count} updated'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f'Total emotions in database: {Emotion.objects.count()}')
        )

"""
Seed database with initial data.

This management command populates the database with sample data:
- Emotions (Plutchik's 52 emotions)
- Patients (sample patients)
- Conversation sessions (sample conversations)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.emotions.models import Emotion
from apps.patients.models import Patient
from apps.conversations.models import ConversationSession


class Command(BaseCommand):
    help = 'Seed database with initial data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting database seeding...'))

        # Seed emotions
        self.seed_emotions()

        # Seed patients
        self.seed_patients()

        # Seed conversation sessions
        self.seed_conversations()

        self.stdout.write(self.style.SUCCESS('Database seeding completed!'))

    def seed_emotions(self):
        """Seed emotions based on Plutchik's 52 emotions"""
        self.stdout.write('Seeding emotions...')

        emotions_data = [
            # Basic emotions
            ('joy', '喜び'),
            ('trust', '信頼'),
            ('fear', '恐れ'),
            ('surprise', '驚き'),
            ('sadness', '悲しみ'),
            ('disgust', '嫌悪'),
            ('anger', '怒り'),
            ('anticipation', '期待'),

            # Secondary emotions
            ('love', '愛'),
            ('submission', '服従'),
            ('awe', '畏敬'),
            ('disapproval', '不承認'),
            ('remorse', '後悔'),
            ('contempt', '軽蔑'),
            ('aggressiveness', '攻撃性'),
            ('optimism', '楽観'),

            # Additional emotions
            ('serenity', '平静'),
            ('acceptance', '受容'),
            ('apprehension', '不安'),
            ('distraction', '気晴らし'),
            ('pensiveness', '物思い'),
            ('boredom', '退屈'),
            ('annoyance', 'いらだち'),
            ('interest', '興味'),
            ('ecstasy', '恍惚'),
            ('admiration', '賞賛'),
            ('terror', '恐怖'),
            ('amazement', '驚嘆'),
            ('grief', '悲嘆'),
            ('loathing', '嫌悪感'),
            ('rage', '激怒'),
            ('vigilance', '警戒'),

            # Complex emotions
            ('happiness', '幸せ'),
            ('anxiety', '不安'),
            ('depression', '憂鬱'),
            ('confusion', '混乱'),
            ('frustration', '欲求不満'),
            ('hope', '希望'),
            ('loneliness', '孤独'),
            ('guilt', '罪悪感'),
            ('shame', '恥'),
            ('pride', '誇り'),
            ('envy', '羨望'),
            ('jealousy', '嫉妬'),
            ('gratitude', '感謝'),
            ('relief', '安堵'),
            ('disappointment', '失望'),
            ('compassion', '思いやり'),
            ('contentment', '満足'),
        ]

        created_count = 0
        for name, name_ja in emotions_data:
            emotion, created = Emotion.objects.get_or_create(
                name=name,
                defaults={'name_ja': name_ja}
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Created {created_count} emotions (Total: {Emotion.objects.count()})')
        )

    def seed_patients(self):
        """Seed sample patients"""
        self.stdout.write('Seeding patients...')

        patients_data = [
            {
                'name': '山田太郎',
                'email': 'yamada@example.com',
                'password': 'password123',
                'birth_date': '1980-05-15',
                'gender': 'male',
            },
            {
                'name': '佐藤花子',
                'email': 'sato@example.com',
                'password': 'password123',
                'birth_date': '1975-08-22',
                'gender': 'female',
            },
            {
                'name': '田中一郎',
                'email': 'tanaka@example.com',
                'password': 'password123',
                'birth_date': '1990-03-10',
                'gender': 'male',
            },
            {
                'name': '鈴木美咲',
                'email': 'suzuki@example.com',
                'password': 'password123',
                'birth_date': '1985-11-28',
                'gender': 'female',
            },
            {
                'name': '高橋健二',
                'email': 'takahashi@example.com',
                'password': 'password123',
                'birth_date': '1978-07-03',
                'gender': 'male',
            },
        ]

        created_count = 0
        for patient_data in patients_data:
            password = patient_data.pop('password')
            patient, created = Patient.objects.get_or_create(
                email=patient_data['email'],
                defaults=patient_data
            )
            if created:
                patient.set_password(password)
                patient.save()
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Created {created_count} patients (Total: {Patient.objects.count()})')
        )

    def seed_conversations(self):
        """Seed sample conversation sessions"""
        self.stdout.write('Seeding conversation sessions...')

        # Get sample patients and emotions
        try:
            patient1 = Patient.objects.get(email='yamada@example.com')
            patient2 = Patient.objects.get(email='sato@example.com')
            patient3 = Patient.objects.get(email='tanaka@example.com')
            patient4 = Patient.objects.get(email='suzuki@example.com')
            patient5 = Patient.objects.get(email='takahashi@example.com')
        except Patient.DoesNotExist:
            self.stdout.write(self.style.ERROR('Patients not found. Please seed patients first.'))
            return

        try:
            emotion_joy = Emotion.objects.get(name='joy')
            emotion_sadness = Emotion.objects.get(name='sadness')
            emotion_anxiety = Emotion.objects.get(name='anxiety')
            emotion_hope = Emotion.objects.get(name='hope')
            emotion_fear = Emotion.objects.get(name='fear')
            emotion_anger = Emotion.objects.get(name='anger')
            emotion_gratitude = Emotion.objects.get(name='gratitude')
            emotion_loneliness = Emotion.objects.get(name='loneliness')
            emotion_frustration = Emotion.objects.get(name='frustration')
            emotion_relief = Emotion.objects.get(name='relief')
            emotion_confusion = Emotion.objects.get(name='confusion')
            emotion_pride = Emotion.objects.get(name='pride')
            emotion_contentment = Emotion.objects.get(name='contentment')
            emotion_guilt = Emotion.objects.get(name='guilt')
            emotion_happiness = Emotion.objects.get(name='happiness')
        except Emotion.DoesNotExist:
            self.stdout.write(self.style.ERROR('Emotions not found. Please seed emotions first.'))
            return

        conversations_data = [
            # Patient 1 - 山田太郎 (6件)
            {
                'patient': patient1,
                'started_at': timezone.now() - timedelta(days=30),
                'ended_at': timezone.now() - timedelta(days=30, hours=-1),
                'patient_text': '入院して初めての日です。不安でいっぱいです。',
                'ai_response_text': '入院初日は誰でも不安になるものです。少しずつ慣れていきましょう。何か心配なことがあれば、いつでも話してくださいね。',
                'emotion': emotion_fear,
                'emotion_reason': '入院初日で不安でいっぱいという表現から、恐れの感情と判断しました。',
            },
            {
                'patient': patient1,
                'started_at': timezone.now() - timedelta(days=20),
                'ended_at': timezone.now() - timedelta(days=20, hours=-1),
                'patient_text': '検査の結果が思ったより良くなくて、少しショックを受けています。',
                'ai_response_text': '検査結果に不安を感じるのは当然です。でも、これから治療を始めることで状況は良くなっていきますよ。一緒に頑張りましょう。',
                'emotion': emotion_sadness,
                'emotion_reason': '検査結果にショックを受けているという表現から、悲しみの感情と判断しました。',
            },
            {
                'patient': patient1,
                'started_at': timezone.now() - timedelta(days=14),
                'ended_at': timezone.now() - timedelta(days=14, hours=-1),
                'patient_text': 'リハビリを始めました。思ったより大変ですが、頑張ります。',
                'ai_response_text': 'リハビリを始められたのは大きな一歩ですね。大変でも前向きに取り組む姿勢が素晴らしいです。',
                'emotion': emotion_hope,
                'emotion_reason': '大変だけど頑張るという前向きな姿勢から、希望の感情と判断しました。',
            },
            {
                'patient': patient1,
                'started_at': timezone.now() - timedelta(days=7),
                'ended_at': timezone.now() - timedelta(days=7, hours=-1),
                'patient_text': '今日はとても調子が良いです。朝起きたときから気分が晴れやかで、散歩に行ってきました。',
                'ai_response_text': 'それは素晴らしいですね。気分が良い時は、そのエネルギーを大切にしてくださいね。散歩も良い習慣です。',
                'emotion': emotion_joy,
                'emotion_reason': '朝から気分が晴れやかで、散歩に行くなどポジティブな行動を取っているため、喜びの感情と判断しました。',
            },
            {
                'patient': patient1,
                'started_at': timezone.now() - timedelta(days=2),
                'ended_at': timezone.now() - timedelta(days=2, hours=-1),
                'patient_text': 'リハビリが少しずつ進んでいます。先生も褒めてくれました。',
                'ai_response_text': 'リハビリの進歩、おめでとうございます。先生からの評価も励みになりますね。着実に前進していますよ。',
                'emotion': emotion_pride,
                'emotion_reason': 'リハビリの進歩と先生からの称賛により、達成感と誇りを感じているため、誇りの感情と判断しました。',
            },
            {
                'patient': patient1,
                'started_at': timezone.now() - timedelta(hours=12),
                'ended_at': timezone.now() - timedelta(hours=11),
                'patient_text': '退院の目処が立ちました。家族にも良い報告ができそうです。',
                'ai_response_text': '退院の目処が立って本当に良かったですね。頑張ってきた成果が出ましたね。',
                'emotion': emotion_happiness,
                'emotion_reason': '退院の目処が立ち、家族に良い報告ができることから、幸せな気持ちと判断しました。',
            },

            # Patient 2 - 佐藤花子 (デモ用・25件)
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=60),
                'ended_at': timezone.now() - timedelta(days=60, hours=-1),
                'patient_text': '突然の入院で、仕事のことが心配です。みんなに迷惑をかけてしまいます。',
                'ai_response_text': '急な入院で仕事のことが気になるのは当然です。でも今は治療に専念することが一番大切ですよ。',
                'emotion': emotion_anxiety,
                'emotion_reason': '仕事への心配と周囲への迷惑を気にする発言から、不安の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=55),
                'ended_at': timezone.now() - timedelta(days=55, hours=-1),
                'patient_text': '夜中に目が覚めてしまいます。病院の環境に慣れないのかもしれません。',
                'ai_response_text': '新しい環境に慣れるには時間がかかりますね。睡眠は大切ですから、眠れない時は看護師さんに相談してみてください。',
                'emotion': emotion_anxiety,
                'emotion_reason': '夜中に目が覚める不眠の症状から、不安の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=50),
                'ended_at': timezone.now() - timedelta(days=50, hours=-1),
                'patient_text': '治療の副作用で体がだるくて、何もする気になれません。',
                'ai_response_text': '副作用は辛いですね。無理をせず、体を休めることも治療の一部です。少しずつ良くなっていきますよ。',
                'emotion': emotion_frustration,
                'emotion_reason': '副作用による体調不良と意欲の低下から、欲求不満の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=45),
                'ended_at': timezone.now() - timedelta(days=45, hours=-1),
                'patient_text': '娘が面会に来てくれました。孫の写真を見せてくれて、元気が出ました。',
                'ai_response_text': '家族の訪問は何よりの薬ですね。お孫さんの成長を楽しみに、治療を頑張ってください。',
                'emotion': emotion_joy,
                'emotion_reason': '娘の訪問と孫の写真により元気が出たという表現から、喜びの感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=42),
                'ended_at': timezone.now() - timedelta(days=42, hours=-1),
                'patient_text': '同室の患者さんが急に悪化して、自分も不安になってしまいました。',
                'ai_response_text': '同じ病室の方の容態は心配ですね。でも、一人一人の状態は違いますから、あまり不安にならないでくださいね。',
                'emotion': emotion_fear,
                'emotion_reason': '同室患者の悪化を目の当たりにして不安になったという表現から、恐れの感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=38),
                'ended_at': timezone.now() - timedelta(days=38, hours=-1),
                'patient_text': '検査が続いて疲れました。いつまで続くのでしょうか。',
                'ai_response_text': '検査が続くと疲れますね。でも、正確な診断のために必要なことです。もう少し頑張りましょう。',
                'emotion': emotion_frustration,
                'emotion_reason': '検査の継続による疲労と先の見えない不安から、欲求不満の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=35),
                'ended_at': timezone.now() - timedelta(days=35, hours=-1),
                'patient_text': '友人がお見舞いに来てくれました。病気のことを理解してくれて、涙が出そうになりました。',
                'ai_response_text': '理解してくれる友人がいることは、心の支えになりますね。感謝の気持ちを大切にしてください。',
                'emotion': emotion_gratitude,
                'emotion_reason': '友人の理解と支えに対する感謝の気持ちから、感謝の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=32),
                'ended_at': timezone.now() - timedelta(days=32, hours=-1),
                'patient_text': '治療が始まって、少しずつ体調が良くなってきた気がします。',
                'ai_response_text': '体調が改善してきているのは良い兆候ですね。この調子で治療を続けていきましょう。',
                'emotion': emotion_hope,
                'emotion_reason': '体調の改善を実感し、前向きな気持ちになっていることから、希望の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=28),
                'ended_at': timezone.now() - timedelta(days=28, hours=-1),
                'patient_text': '病院の食事が口に合わなくて、食欲がありません。',
                'ai_response_text': '食事が口に合わないのは辛いですね。栄養士さんに相談して、食べやすいメニューに変更してもらえるかもしれませんよ。',
                'emotion': emotion_frustration,
                'emotion_reason': '食事が合わず食欲がないという状態から、欲求不満の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=25),
                'ended_at': timezone.now() - timedelta(days=25, hours=-1),
                'patient_text': '先生から良い経過だと言われました。安心しました。',
                'ai_response_text': '先生から良い評価を受けたのは素晴らしいことですね。これまでの頑張りが実を結んでいます。',
                'emotion': emotion_relief,
                'emotion_reason': '先生からの良い評価により安心したという表現から、安堵の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=22),
                'ended_at': timezone.now() - timedelta(days=22, hours=-1),
                'patient_text': '夜中に一人でいると、色々なことを考えてしまって寂しくなります。',
                'ai_response_text': '夜は特に寂しさを感じやすい時間ですね。そんな時は、好きな音楽を聴いたり、本を読んだりするのも良いかもしれません。',
                'emotion': emotion_loneliness,
                'emotion_reason': '夜中に一人でいる時の寂しさを訴えていることから、孤独の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=19),
                'ended_at': timezone.now() - timedelta(days=19, hours=-1),
                'patient_text': '隣のベッドの方と仲良くなりました。同じ境遇の人と話せるのは心強いです。',
                'ai_response_text': '同じような経験をしている方との交流は、とても心強いものですね。お互いに励まし合えるのは素晴らしいことです。',
                'emotion': emotion_relief,
                'emotion_reason': '同じ境遇の人と話せることで心強さを感じていることから、安堵の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=16),
                'ended_at': timezone.now() - timedelta(days=16, hours=-1),
                'patient_text': '今日は気分が良くて、久しぶりに本を読みました。',
                'ai_response_text': '気分が良い日は、好きなことをして過ごすのが一番ですね。読書は良い気分転換になります。',
                'emotion': emotion_contentment,
                'emotion_reason': '気分が良く、読書を楽しめたという状態から、満足の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=13),
                'ended_at': timezone.now() - timedelta(days=13, hours=-1),
                'patient_text': '医療費のことが心配になってきました。治療が長引いたらどうしよう。',
                'ai_response_text': '医療費の心配はストレスになりますね。ソーシャルワーカーさんに相談すると、助成制度などについて教えてもらえますよ。',
                'emotion': emotion_anxiety,
                'emotion_reason': '医療費と治療期間への心配から、不安の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=10),
                'ended_at': timezone.now() - timedelta(days=10, hours=-1),
                'patient_text': 'リハビリを始めました。体を動かすのは大変ですが、少しずつ筋力が戻ってきている気がします。',
                'ai_response_text': 'リハビリを頑張っていますね。筋力が戻ってきていると実感できるのは、素晴らしい進歩です。',
                'emotion': emotion_pride,
                'emotion_reason': 'リハビリの成果を実感し、達成感を感じていることから、誇りの感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=8),
                'ended_at': timezone.now() - timedelta(days=8, hours=-1),
                'patient_text': '今日は痛みが強くて辛いです。薬が効いてくるまで時間がかかります。',
                'ai_response_text': '痛みが強い時は本当に辛いですね。我慢しないで、すぐに看護師さんに伝えてください。',
                'emotion': emotion_sadness,
                'emotion_reason': '痛みによる辛さを訴えていることから、悲しみの感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=6),
                'ended_at': timezone.now() - timedelta(days=6, hours=-1),
                'patient_text': '最近、夜よく眠れなくて困っています。考え事をしてしまうんです。',
                'ai_response_text': '眠れない夜は辛いですね。考え事が頭から離れないのは、何か心配なことがあるのでしょうか。よろしければお話を聞かせてください。',
                'emotion': emotion_anxiety,
                'emotion_reason': '夜眠れず、考え事をしてしまうという状態から、不安や心配事を抱えていると判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=5),
                'ended_at': timezone.now() - timedelta(days=5, hours=-1),
                'patient_text': '看護師さんがとても優しくて、いつも励ましてくれます。感謝しています。',
                'ai_response_text': '優しい看護師さんに恵まれて良かったですね。医療スタッフの支えは治療にとって大きな力になります。',
                'emotion': emotion_gratitude,
                'emotion_reason': '看護師への感謝の気持ちを表現していることから、感謝の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=4),
                'ended_at': timezone.now() - timedelta(days=4, hours=-1),
                'patient_text': '天気が良かったので、車椅子で外の空気を吸いに行きました。気持ちが良かったです。',
                'ai_response_text': '外の空気を吸うのは気分転換になりますね。天気の良い日は、積極的に外に出てみてください。',
                'emotion': emotion_contentment,
                'emotion_reason': '外出して気持ちが良かったという満足感から、満足の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=3),
                'ended_at': timezone.now() - timedelta(days=3, hours=-1),
                'patient_text': '今日は友人が見舞いに来てくれました。久しぶりに話せて嬉しかったです。',
                'ai_response_text': '友人の訪問は嬉しいものですね。久しぶりに話せたことで、気持ちも軽くなったのではないでしょうか。',
                'emotion': emotion_joy,
                'emotion_reason': '友人の訪問と久しぶりの会話により、嬉しさと喜びを感じているため、喜びの感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=2),
                'ended_at': timezone.now() - timedelta(days=2, hours=-1),
                'patient_text': '検査の結果が良好で、先生も驚いていました。頑張った甲斐がありました。',
                'ai_response_text': '検査結果が良好だったのは素晴らしいですね。これまでの努力が実を結びましたね。',
                'emotion': emotion_pride,
                'emotion_reason': '良好な検査結果と努力の成果を実感していることから、誇りの感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=1, hours=18),
                'ended_at': timezone.now() - timedelta(days=1, hours=17),
                'patient_text': '退院の日が近づいてきました。少し不安ですが、楽しみでもあります。',
                'ai_response_text': '退院が近いのですね。不安と期待が入り混じった気持ち、よくわかります。新しい一歩を踏み出す準備を一緒にしていきましょう。',
                'emotion': emotion_hope,
                'emotion_reason': '退院への不安がありつつも楽しみという気持ちから、将来への希望を持っていると判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(days=1, hours=6),
                'ended_at': timezone.now() - timedelta(days=1, hours=5),
                'patient_text': '家族に退院の日を伝えました。みんなとても喜んでくれて、私も嬉しいです。',
                'ai_response_text': '家族の喜ぶ顔が見られるのは何よりですね。これからは家族と一緒に、健康な生活を送ってください。',
                'emotion': emotion_happiness,
                'emotion_reason': '家族の喜びと自分の嬉しさを表現していることから、幸せな気持ちと判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(hours=20),
                'ended_at': timezone.now() - timedelta(hours=19),
                'patient_text': '退院の準備を始めました。長かった入院生活もようやく終わります。',
                'ai_response_text': '長い入院生活、本当にお疲れ様でした。これからの生活を楽しんでくださいね。',
                'emotion': emotion_relief,
                'emotion_reason': '長い入院生活が終わることへの安堵感から、安堵の感情と判断しました。',
            },
            {
                'patient': patient2,
                'started_at': timezone.now() - timedelta(hours=8),
                'ended_at': timezone.now() - timedelta(hours=7),
                'patient_text': '病院のスタッフの皆さんに感謝の気持ちでいっぱいです。本当にお世話になりました。',
                'ai_response_text': 'こちらこそ、治療に前向きに取り組んでくださってありがとうございました。退院後も健康に気をつけて過ごしてください。',
                'emotion': emotion_gratitude,
                'emotion_reason': '医療スタッフへの深い感謝の気持ちを表現していることから、感謝の感情と判断しました。',
            },

            # Patient 3 - 田中一郎 (8件)
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(days=40),
                'ended_at': timezone.now() - timedelta(days=40, hours=-1),
                'patient_text': '病気が見つかって、どうしてこんなことになったのか悔しいです。',
                'ai_response_text': '病気が見つかった時は、誰でも複雑な気持ちになるものです。でも、今は前を向いて治療に専念しましょう。',
                'emotion': emotion_anger,
                'emotion_reason': '病気への悔しさと怒りの気持ちから、怒りの感情と判断しました。',
            },
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(days=30),
                'ended_at': timezone.now() - timedelta(days=30, hours=-1),
                'patient_text': '治療の説明を受けましたが、難しくて理解できませんでした。',
                'ai_response_text': '医療用語は難しいですよね。分からないことがあれば、遠慮せずに質問してください。理解することが大切です。',
                'emotion': emotion_confusion,
                'emotion_reason': '治療の説明が理解できなかったという混乱した状態から、混乱の感情と判断しました。',
            },
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(days=22),
                'ended_at': timezone.now() - timedelta(days=22, hours=-1),
                'patient_text': '家族にもっと早く気づいてあげられなかったことが申し訳ないです。',
                'ai_response_text': '自分を責めないでください。病気は誰のせいでもありません。今は治療に集中しましょう。',
                'emotion': emotion_guilt,
                'emotion_reason': '家族への申し訳なさという罪悪感から、罪悪感の感情と判断しました。',
            },
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(days=15),
                'ended_at': timezone.now() - timedelta(days=15, hours=-1),
                'patient_text': '治療が始まって、副作用で苦しんでいます。こんなに辛いとは思いませんでした。',
                'ai_response_text': '副作用は本当に辛いですね。でも、これも治療の過程です。少しずつ慣れていきますよ。',
                'emotion': emotion_sadness,
                'emotion_reason': '副作用による苦しみを訴えていることから、悲しみの感情と判断しました。',
            },
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(days=10),
                'ended_at': timezone.now() - timedelta(days=10, hours=-1),
                'patient_text': '同じ病気の人のブログを読んで、励まされました。自分も頑張ろうと思います。',
                'ai_response_text': '同じ経験をした人の話は心強いですね。前向きな気持ちになれて良かったです。',
                'emotion': emotion_hope,
                'emotion_reason': '他の患者のブログに励まされ、前向きな気持ちになったことから、希望の感情と判断しました。',
            },
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(days=4),
                'ended_at': timezone.now() - timedelta(days=4, hours=-1),
                'patient_text': '体調が思うように良くならなくて、気持ちが沈んでいます。',
                'ai_response_text': '回復が思うように進まないと、気持ちが沈むのは自然なことです。焦らず、ゆっくりと進んでいきましょう。',
                'emotion': emotion_sadness,
                'emotion_reason': '体調が良くならないことで気持ちが沈んでいるという表現から、悲しみの感情と判断しました。',
            },
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(days=1),
                'ended_at': timezone.now() - timedelta(days=1, hours=-1),
                'patient_text': '先生から回復の兆しが見えてきたと言われました。少し安心しました。',
                'ai_response_text': '回復の兆しが見えてきたのは良いニュースですね。この調子で治療を続けていきましょう。',
                'emotion': emotion_relief,
                'emotion_reason': '回復の兆しを聞いて安心したという表現から、安堵の感情と判断しました。',
            },
            {
                'patient': patient3,
                'started_at': timezone.now() - timedelta(hours=12),
                'ended_at': timezone.now() - timedelta(hours=11),
                'patient_text': '新しい治療法を試すことになりました。効果があるといいなと思っています。',
                'ai_response_text': '新しい治療法への挑戦ですね。希望を持って取り組むことが大切です。効果を期待しましょう。',
                'emotion': emotion_hope,
                'emotion_reason': '新しい治療法への期待と希望を持っているため、希望の感情と判断しました。',
            },

            # Patient 4 - 鈴木美咲 (6件)
            {
                'patient': patient4,
                'started_at': timezone.now() - timedelta(days=35),
                'ended_at': timezone.now() - timedelta(days=35, hours=-1),
                'patient_text': '子供たちのことが心配で、なかなか治療に集中できません。',
                'ai_response_text': '子供のことが心配なのは親として当然です。でも、あなたが元気にならないと、子供たちも安心できませんよ。',
                'emotion': emotion_anxiety,
                'emotion_reason': '子供への心配と治療への集中困難から、不安の感情と判断しました。',
            },
            {
                'patient': patient4,
                'started_at': timezone.now() - timedelta(days=28),
                'ended_at': timezone.now() - timedelta(days=28, hours=-1),
                'patient_text': '夫が子供たちの面倒を見てくれています。感謝の気持ちでいっぱいです。',
                'ai_response_text': '家族の支えがあることは、治療にとって大きな力になりますね。感謝の気持ちを忘れずに、治療に専念してください。',
                'emotion': emotion_gratitude,
                'emotion_reason': '夫への感謝の気持ちを表現していることから、感謝の感情と判断しました。',
            },
            {
                'patient': patient4,
                'started_at': timezone.now() - timedelta(days=20),
                'ended_at': timezone.now() - timedelta(days=20, hours=-1),
                'patient_text': '子供たちがビデオメッセージを送ってくれました。涙が止まりませんでした。',
                'ai_response_text': '子供たちからのメッセージは何よりの励みになりますね。早く元気になって、子供たちに会えるように頑張りましょう。',
                'emotion': emotion_joy,
                'emotion_reason': '子供からのメッセージに感動し、涙を流したという表現から、喜びの感情と判断しました。',
            },
            {
                'patient': patient4,
                'started_at': timezone.now() - timedelta(days=12),
                'ended_at': timezone.now() - timedelta(days=12, hours=-1),
                'patient_text': '体調が良くなってきて、前向きな気持ちになれています。',
                'ai_response_text': '体調の改善は何よりですね。前向きな気持ちは、回復を早めてくれますよ。',
                'emotion': emotion_hope,
                'emotion_reason': '体調の改善と前向きな気持ちから、希望の感情と判断しました。',
            },
            {
                'patient': patient4,
                'started_at': timezone.now() - timedelta(days=6),
                'ended_at': timezone.now() - timedelta(days=6, hours=-1),
                'patient_text': '子供たちが面会に来てくれました。抱きしめることができて幸せでした。',
                'ai_response_text': '子供たちとの再会、本当に良かったですね。その幸せな気持ちを大切にしてください。',
                'emotion': emotion_happiness,
                'emotion_reason': '子供たちとの再会と抱擁による幸せな気持ちから、幸せの感情と判断しました。',
            },
            {
                'patient': patient4,
                'started_at': timezone.now() - timedelta(days=2),
                'ended_at': timezone.now() - timedelta(days=2, hours=-1),
                'patient_text': '退院が決まりました。家族のもとに帰れることが嬉しいです。',
                'ai_response_text': '退院が決まって本当に良かったですね。家族との時間を大切に過ごしてください。',
                'emotion': emotion_joy,
                'emotion_reason': '退院決定と家族のもとに帰れる喜びから、喜びの感情と判断しました。',
            },

            # Patient 5 - 高橋健二 (5件)
            {
                'patient': patient5,
                'started_at': timezone.now() - timedelta(days=25),
                'ended_at': timezone.now() - timedelta(days=25, hours=-1),
                'patient_text': '仕事のプロジェクトが中断してしまいました。チームのみんなに申し訳ないです。',
                'ai_response_text': '仕事のことが気になるのは分かりますが、今は健康が第一です。チームの人たちもきっと理解してくれていますよ。',
                'emotion': emotion_guilt,
                'emotion_reason': 'チームへの申し訳なさという罪悪感から、罪悪感の感情と判断しました。',
            },
            {
                'patient': patient5,
                'started_at': timezone.now() - timedelta(days=18),
                'ended_at': timezone.now() - timedelta(days=18, hours=-1),
                'patient_text': '同僚が仕事を引き継いでくれています。感謝しています。',
                'ai_response_text': '同僚の支えがあるのは心強いですね。早く復帰できるように、しっかり治療しましょう。',
                'emotion': emotion_gratitude,
                'emotion_reason': '同僚への感謝の気持ちを表現していることから、感謝の感情と判断しました。',
            },
            {
                'patient': patient5,
                'started_at': timezone.now() - timedelta(days=10),
                'ended_at': timezone.now() - timedelta(days=10, hours=-1),
                'patient_text': '体力が落ちていることを実感します。リハビリを頑張らなければ。',
                'ai_response_text': '体力の低下を自覚できているのは良いことです。焦らず、少しずつリハビリを進めていきましょう。',
                'emotion': emotion_frustration,
                'emotion_reason': '体力低下への実感と焦りから、欲求不満の感情と判断しました。',
            },
            {
                'patient': patient5,
                'started_at': timezone.now() - timedelta(days=5),
                'ended_at': timezone.now() - timedelta(days=5, hours=-1),
                'patient_text': 'リハビリの成果が出てきました。体を動かせることが嬉しいです。',
                'ai_response_text': 'リハビリの成果が出てきたのは素晴らしいですね。この調子で頑張ってください。',
                'emotion': emotion_pride,
                'emotion_reason': 'リハビリの成果を実感し、達成感を感じていることから、誇りの感情と判断しました。',
            },
            {
                'patient': patient5,
                'started_at': timezone.now() - timedelta(days=1),
                'ended_at': timezone.now() - timedelta(days=1, hours=-1),
                'patient_text': '復職の目処が立ちました。早く仕事に戻りたいです。',
                'ai_response_text': '復職の目処が立って良かったですね。でも、焦らずに体調を整えてから復帰してください。',
                'emotion': emotion_hope,
                'emotion_reason': '復職への希望と前向きな気持ちから、希望の感情と判断しました。',
            },
        ]

        created_count = 0
        for conversation_data in conversations_data:
            # Check if conversation already exists
            exists = ConversationSession.objects.filter(
                patient=conversation_data['patient'],
                started_at=conversation_data['started_at']
            ).exists()

            if not exists:
                ConversationSession.objects.create(**conversation_data)
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Created {created_count} conversation sessions (Total: {ConversationSession.objects.count()})'
            )
        )

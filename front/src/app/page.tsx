import Image from "next/image";
import Link from "next/link";
import { Mic, Bot, BrainCircuit } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 md:p-12">
      <main className="flex flex-col items-center w-full max-w-4xl gap-12">
        <header className="text-center">
          <h1 className="font-heading text-6xl md:text-7xl font-bold text-gray-800">
            EmoCare
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            AI感情可視化・共感ケア支援システム
          </p>
        </header>
        <section className="bg-white shadow-xl rounded-3xl p-8 md:p-12 w-full max-w-lg text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">ようこそ</h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            患者の感情を可視化し、適切なケアを提供するためのシステムです。
            <br />
            音声で会話し、AIが共感的に応答します。
          </p>
          <div className="flex flex-col gap-4">
            <Link
              href="/login"
              className="bg-primary text-white font-bold py-4 px-6 rounded-full text-lg
                         transition-transform transform hover:scale-105 hover:bg-red-500 shadow-lg"
            >
              ログイン / 新規登録
            </Link>
            <Link
              href="/test-conversation"
              className="bg-gray-100 text-gray-700 font-bold py-4 px-6 rounded-full text-lg
                         transition-transform transform hover:scale-105 hover:bg-gray-200"
            >
              会話テストページ
            </Link>
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-8">
          <FeatureCard
            icon={<Mic size={40} className="text-primary" />}
            title="音声会話"
            description="音声で自然に話しかけることができます"
          />
          <FeatureCard
            icon={<Bot size={40} className="text-primary" />}
            title="AI応答"
            description="共感的で非批判的な応答を生成します"
          />
          <FeatureCard
            icon={<BrainCircuit size={40} className="text-primary" />}
            title="感情分析"
            description="52種類の感情から適切な感情を判定します"
          />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-8 flex flex-col items-center text-center transition-transform transform hover:-translate-y-2">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
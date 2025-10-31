'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    birth_date: '',
    gender: '',
    admission_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/patients/login/' : '/patients/register/';
      
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            birth_date: formData.birth_date || null,
            gender: formData.gender || null,
            admission_date: formData.admission_date || null,
          };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.non_field_errors?.[0] || errorData.detail || '認証に失敗しました');
      }

      const data = await response.json();
      
      localStorage.setItem('patientId', data.id);
      localStorage.setItem('token', data.token);
      localStorage.setItem('patientName', data.name);

      router.push('/test-conversation');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <div className="text-center mb-8">
            <Link href="/">
              <h1 className="font-heading text-5xl font-bold text-gray-800 mb-2 transition-opacity hover:opacity-80">
                EmoCare
              </h1>
            </Link>
            <p className="text-gray-600 text-lg">
              {isLogin ? 'ログイン' : '新規登録'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 ml-4">
                  名前 <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                  className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900"
                  placeholder="山田太郎"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 ml-4">
                メールアドレス <span className="text-primary">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900"
                placeholder="example@mail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 ml-4">
                パスワード <span className="text-primary">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900"
                placeholder="8文字以上"
              />
            </div>
            
            {/* 登録時のみ表示するフィールドを追加 */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 ml-4">
                    生年月日
                  </label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 ml-4">
                    性別
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 appearance-none"
                  >
                    <option value="">選択してください</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 ml-4">
                    入院日
                  </label>
                  <input
                    type="date"
                    name="admission_date"
                    value={formData.admission_date}
                    onChange={handleChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-full font-bold text-lg hover:bg-red-500 transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? '処理中...' : isLogin ? 'ログイン' : '登録'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-primary hover:text-red-500 text-sm font-medium"
            >
              {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
            </button>
          </div>

          {isLogin && (
            <div className="mt-6 p-4 bg-gray-100 rounded-2xl">
              <p className="text-sm text-gray-700 font-bold mb-2 text-center">
                テストアカウント
              </p>
              <p className="text-xs text-gray-600 text-center">
                Email: test@example.com<br />
                Password: password123
              </p>
              <p className="text-xs text-gray-500 mt-2 text-center">
                (※事前登録が必要です)
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-gray-600 hover:text-primary transition-colors flex items-center gap-2 group justify-center"
          >
            <ArrowLeft
              size={18}
              className="transition-transform group-hover:-translate-x-1"
            />
            スタート画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
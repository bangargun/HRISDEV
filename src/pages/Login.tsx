import { useState } from 'react';
import { LogIn, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <LogIn className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-white">HRIS Pro</h1>
            <p className="text-blue-100 text-sm mt-2">Human Resource Information System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sedang login...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Login
                </>
              )}
            </button>

            {/* Demo Credentials */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-blue-700 mb-3">Demo Akun:</p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-blue-700 font-medium">Admin:</p>
                  <p className="text-blue-600 font-mono">admin@hris.com / Admin@123</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Leader:</p>
                  <p className="text-blue-600 font-mono">leader@hris.com / Leader@123</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Karyawan:</p>
                  <p className="text-blue-600 font-mono">employee@hris.com / Employee@123</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          © 2026 HRIS Pro. Semua hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}

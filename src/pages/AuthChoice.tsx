import { LogIn, UserPlus } from 'lucide-react';

interface AuthChoiceProps {
  onSelectLogin: () => void;
  onSelectRegister: () => void;
}

export default function AuthChoice({ onSelectLogin, onSelectRegister }: AuthChoiceProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">HRIS Pro</h1>
          <p className="text-lg text-gray-600">Human Resource Information System</p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Login Card */}
          <div
            onClick={onSelectLogin}
            className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:scale-105 border border-gray-100"
          >
            <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <LogIn className="w-16 h-16 text-white opacity-90" />
            </div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Masuk</h2>
              <p className="text-gray-600 mb-6">Sudah punya akun? Masuk dengan email dan password Anda</p>
              <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" />
                Masuk Sekarang
              </button>
            </div>
          </div>

          {/* Register Card */}
          <div
            onClick={onSelectRegister}
            className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:scale-105 border border-gray-100"
          >
            <div className="h-32 bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="w-16 h-16 text-white opacity-90" />
            </div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Daftar</h2>
              <p className="text-gray-600 mb-6">Baru pertama kali? Daftar akun baru dan lengkapi profil Anda</p>
              <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                Daftar Sekarang
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-12">
          © 2026 HRIS Pro. Semua hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}

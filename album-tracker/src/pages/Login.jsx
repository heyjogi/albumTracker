import { useAuth } from '../hooks/useAuth'

export default function Login() {
    const { signInWithGoogle, isAllowed } = useAuth()

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-200">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl flex flex-col items-center">
                <div className="w-16 h-16 bg-brand-600 rounded-xl mb-6 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">A</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Album Tracker</h1>
                <p className="text-slate-500 mb-8 text-center">앨범 분철 정산을 간편하게 관리하세요.</p>
                
                {isAllowed === false && (
                    <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
                        접근 권한이 없는 이메일입니다.<br/>관리자에게 문의해주세요.
                    </div>
                )}

                <button
                    onClick={signInWithGoogle}
                    className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md transition-colors duration-200 flex items-center justify-center gap-3"
                >
                    <svg className="w-6 h-6 bg-white rounded-full p-1" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google 계정으로 계속하기
                </button>
            </div>
        </div>
    )
}

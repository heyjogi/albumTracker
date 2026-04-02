import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

export default function Login() {
    const { signInWithGoogle, isAllowed, isLoading } = useAuth();
    const navigate = useNavigate();

    console.log("isAllowed status:", isAllowed)

    return (
        <div className="login-wrap">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/logo.svg" alt="Album Tracker Logo" className="w-full h-full rounded-xl" />
                </div>
                <h1 className="login-title">Album Tracker</h1>
                <p className="login-desc">앨범 분철 정산을 간편하게 관리하세요.</p>

                {isAllowed === false && (
                    <div className="login-error">
                        접근 권한이 없는 이메일입니다.<br />
                        <span className="text-xs opacity-75">관리자에게 문의해주세요.</span>
                    </div>
                )}

                <button
                    onClick={signInWithGoogle}
                    disabled={isLoading}
                    className={`login-btn ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isLoading ? (
                        <span>로그인 확인 중...</span>
                    ) : (
                        <>
                            <svg className="login-btn-icon" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.09 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google 계정으로 계속하기
                        </>
                    )}
                </button>

                {/* 포카드볼판 진입 버튼 (비회원 가능) */}
                <div className="login-divider">
                    <span>또는</span>
                </div>
                <button
                    onClick={() => navigate('/pocaboard')}
                    className="login-poca-btn relative"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                        />
                    </svg>

                    <div className="w-full flex flex-col items-center text-center">
                        <span>포카리스트 바로가기</span>
                        <span className="login-poca-hint">
                            로그인 없이 이용 가능합니다
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
}

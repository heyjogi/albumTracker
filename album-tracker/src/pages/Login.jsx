import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

export default function Login() {
    const { signInWithGoogle, loading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Supabase가 signup_disabled로 튕긴 경우 + 앱 내부에서 권한 차단된 경우
    const isUnauthorized =
        searchParams.get('error_code') === 'signup_disabled' ||
        searchParams.get('error') === 'access_denied' ||
        searchParams.get('error') === 'unauthorized';

    return (
        <div className="login-wrap">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/logo.png" alt="Album Tracker Logo" className="w-full h-full rounded-xl" />
                </div>
                <h1 className="login-title">Album Tracker</h1>
                <p className="login-desc">앨범 분철 정산을 간편하게 관리하세요.</p>

                {isUnauthorized && (
                    <div className="login-error">
                        접근 권한이 없는 이메일입니다.<br />
                        <span className="text-xs opacity-75">관리자에게 문의해주세요.</span>
                    </div>
                )}

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
                        {/* <span className="login-poca-hint">
                            로그인 없이 이용 가능합니다
                        </span> */}
                    </div>
                </button>
                <div className="login-divider">
                    <span>💿</span>
                </div>
                <button
                    onClick={signInWithGoogle}
                    disabled={loading}
                    className={`login-btn ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <span>로그인 확인 중...</span>
                    ) : (
                        <>분철팀 전용</>
                    )}
                </button>
            </div>
        </div>
    );
}

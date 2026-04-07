import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

export default function Login() {
    const { signInWithGoogle, isAllowed, isLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const showUnauthorized = isAllowed === false || searchParams.get('error') === 'unauthorized';

    return (
        <div className="login-wrap">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/logo.png" alt="Album Tracker Logo" className="w-full h-full rounded-xl" />
                </div>
                <h1 className="login-title">Album Tracker</h1>
                <p className="login-desc">앨범 분철 정산을 간편하게 관리하세요.</p>

                {showUnauthorized && (
                    <div className="login-error">
                        접근 권한이 없는 이메일입니다.<br />
                        <span className="text-xs opacity-75">관리자에게 문의해주세요.</span>
                    </div>
                )}

                {/* 포카드볼판 진입 버튼 (비회원 가능) */}
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
                <div className="login-divider">
                    <span>또는</span>
                </div>
                <button
                    onClick={signInWithGoogle}
                    disabled={isLoading}
                    className={`login-btn ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isLoading ? (
                        <span>로그인 확인 중...</span>
                    ) : (
                        <>
                            분철팀 전용
                        </>
                    )}
                </button>

                {/* 개인정보처리방침 링크
                <div className="login-privacy-link">
                    <Link to="/privacy" className="privacy-link">
                        개인정보처리방침
                    </Link>
                </div> */}
            </div>
        </div>
    );
}

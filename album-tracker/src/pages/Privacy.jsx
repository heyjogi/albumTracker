import { useNavigate } from 'react-router-dom'
import './Privacy.css'

export default function Privacy() {
    const navigate = useNavigate()
    return (
        <div className="privacy-wrap">
            <button
                onClick={() => navigate(-1)}
                className="privacy-back-btn"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>BACK</span>
            </button>
            <div className="privacy-container">
                <h1 className="privacy-title">개인정보처리방침</h1>

                <section className="privacy-section">
                    <h2 className="privacy-heading">1. 수집하는 개인정보</h2>
                    <p className="privacy-text">
                        본 서비스는 Google 로그인을 통해 다음의 정보를 수집합니다:
                    </p>
                    <ul className="privacy-list">
                        <li>이메일 주소 및 Google 계정 고유 식별자</li>
                        <li className="opacity-60 text-xs">※ Google 로그인 과정에서 이름 및 프로필 이미지가 제공될 수 있으나, 본 서비스에서는 이를 별도로 저장하거나 활용하지 않습니다.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">2. 개인정보의 이용 목적</h2>
                    <p className="privacy-text">
                        수집된 개인정보는 다음의 목적으로만 사용됩니다:
                    </p>
                    <ul className="privacy-list">
                        <li>사용자 인증 및 서비스 이용 권한 확인</li>
                        <li>앨범 구매 목록 및 통계 데이터 관리</li>
                        <li>팀 내 구매 내역 공유</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">3. 서비스 이용 정보 및 쿠키</h2>
                    <p className="privacy-text">
                        본 서비스는 품질 향상 및 방문 통계 분석을 위해 다음과 같은 정보를 수집할 수 있습니다:
                    </p>
                    <ul className="privacy-list">
                        <li>서비스 이용 기록 (페이지뷰, 접속 빈도 등)</li>
                        <li>접속 로그 및 IP 정보</li>
                        <li>쿠키(Cookie): 브라우저 설정에서 쿠키 수집을 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">4. 개인정보의 보관 및 파기</h2>
                    <p className="privacy-text">
                        개인정보는 서비스 탈퇴 시 즉시 파기하는 것을 원칙으로 합니다.
                    </p>
                    <ul className="privacy-list">
                        <li>탈퇴 요청 시 해당 계정과 연결된 모든 데이터는 즉시 삭제됩니다.</li>
                        <li>단, 시스템 로그 등 서비스 운영상 불가피한 기록은 관련 법령(통신비밀보호법 등)에 따라 일정 기간 보관 후 삭제될 수 있습니다.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">5. 개인정보 처리 위탁</h2>
                    <p className="privacy-text">
                        서비스 제공 및 원활한 데이터 처리를 위해 다음과 같이 외부 전문 업체에 업무를 위탁하고 있습니다.
                    </p>
                    <ul className="privacy-list">
                        <li><strong>Supabase</strong>: 데이터 저장 인프라 공급 및 사용자 인증 처리</li>
                        <li><strong>Vercel</strong>: 서비스 호스팅 및 배포 관리</li>
                        <li><strong>Google</strong>: OAuth를 이용한 본인 인증 서비스</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">6. 개인정보의 국외 이전</h2>
                    <p className="privacy-text">
                        본 서비스가 이용하는 클라우드 인프라(Supabase, Vercel)의 서버는 해외(미국 등)에 위치하고 있으며, 서비스 이용 시 데이터가 해당 서버로 전송 및 저장될 수 있습니다.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">7. 사용자의 권리</h2>
                    <p className="privacy-text">
                        사용자는 언제든지 본인의 개인정보 열람, 수정, 삭제를 요청할 수 있습니다. 닉네임은 설정 메뉴에서 직접 수정 가능하며, 그 외의 권리 행사는 관리자에게 요청해 주시기 바랍니다.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">8. 문의</h2>
                    <p className="privacy-text">
                        개인정보 관련 문의나 탈퇴 요청이 있으시면 아래 채널을 통해 문의해 주시기 바랍니다.
                    </p>
                    <ul className="privacy-list">
                        <li>담당자 문의: X(Twitter) 계정을 확인해 주세요.</li>
                    </ul>
                </section>

                <div className="privacy-footer">
                    <p className="privacy-date">최종 수정일: 2026년 4월 7일</p>
                </div>
            </div>
        </div>
    );
}

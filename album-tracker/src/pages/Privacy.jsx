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
                        본 서비스는 원활한 기능 제공을 위해 다음과 같은 정보를 수집 및 처리합니다:
                    </p>
                    <ul className="privacy-list">
                        <li><strong>기본 인증 정보</strong>: Google 로그인을 통한 이메일 주소 및 고유 식별자</li>
                        <li><strong>스밍 인증 정보</strong>: 인증 시 입력한 닉네임 및 플랫폼 정보</li>
                        <li><strong>이미지 데이터</strong>: 스밍 인증 카드 이미지는 서버에서 글자 추출(OCR) 후 즉시 소거하며 서버에 저장하거나 로그를 기록하지 않습니다.</li>
                        <li><strong>중복 방지 식별값</strong>: 동일 이미지의 재사용을 방지하기 위해 이미지의 SHA256 해시값(역추적이 불가능한 문자열)을 저장합니다.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">2. 개인정보의 이용 목적</h2>
                    <p className="privacy-text">
                        수집된 정보는 다음의 목적으로만 사용됩니다:
                    </p>
                    <ul className="privacy-list">
                        <li>서비스 이용 권한 확인 및 부정이용 방지</li>
                        <li>포카보드 이미지 저장(Export) 기능의 스밍 인증 여부 검증</li>
                        <li>앨범 구매 목록 및 통계 데이터 관리</li>
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
                        <li>쿠키(Cookie): 인증 토큰 유지 및 원활한 서비스 이용을 위해 사용됩니다.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2 className="privacy-heading">4. 개인정보의 보관 및 파기</h2>
                    <p className="privacy-text">
                        본 서비스는 불필요한 개인정보 보관을 최소화합니다.
                    </p>
                    <ul className="privacy-list">
                        <li><strong>스밍 인증 이미지</strong>: OCR 처리 완료 후 즉시 파기됩니다.</li>
                        <li><strong>수동 인증 대기 데이터</strong>: 관리자가 승인을 완료하거나 거절하는 즉시 관련 내역(메모 등)은 파기됩니다.</li>
                        <li><strong>기본 계정 정보</strong>: 탈퇴 요청 시 즉시 삭제됩니다.</li>
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
                    <p className="privacy-date">최종 수정일: 2026년 4월 10일</p>
                </div>
            </div>
        </div>
    );
}

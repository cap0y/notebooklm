import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cookie,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Settings,
  AlertCircle,
  Shield,
  Eye,
  ArrowLeft,
} from 'lucide-react'

/**
 * 쿠키 정책 페이지
 * 다크 테마 적용 + AI 한글 에디터 기준으로 수정
 */
const CookiePolicy: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-8 sm:py-12 overflow-auto">
      <div className="max-w-4xl mx-auto px-4">
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </button>

        {/* 헤더 */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Cookie className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                쿠키 정책
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">디컴소프트 쿠키 사용 정책</p>
            </div>
          </div>
          <div className="bg-orange-900/30 border border-orange-800 rounded-lg p-3 sm:p-4 inline-block">
            <p className="text-orange-300 font-medium text-sm sm:text-base">
              시행일자: 2025년 1월 1일 | 최종 수정일: 2025년 1월 1일
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 sm:p-8 space-y-8">
          {/* 1. 쿠키란 무엇인가요? */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center shrink-0">
                <Cookie className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">1. 쿠키란 무엇인가요?</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 leading-relaxed text-sm sm:text-base">
                쿠키(Cookie)는 웹사이트를 방문할 때 브라우저에 저장되는 작은 텍스트 파일입니다.
                쿠키는 웹사이트가 사용자의 브라우저를 인식하고, 사용자의 선호도를 기억하며,
                개인화된 경험을 제공하는 데 도움을 줍니다.
              </p>
              <div className="bg-orange-900/30 border border-orange-800/50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-300 mb-2 text-sm">쿠키의 특징</h3>
                <ul className="text-orange-200/80 text-sm space-y-1">
                  <li>• 사용자의 컴퓨터나 모바일 기기에 저장되는 작은 파일</li>
                  <li>• 웹사이트 방문 시 자동으로 생성되거나 삭제됨</li>
                  <li>• 개인정보를 직접 식별하지 않음</li>
                  <li>• 사용자가 언제든지 삭제하거나 차단할 수 있음</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. DECOMSOFT의 쿠키 사용 목적 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">2. DECOMSOFT의 쿠키 사용 목적</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                디컴소프트(DECOMSOFT)는 다음과 같은 목적으로 쿠키를 사용합니다:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: '필수적 기능', items: ['서비스 로그인 상태 유지', '보안 기능 제공', '웹사이트 기본 기능 작동', '언어 설정 기억'] },
                  { title: '성능 및 분석', items: ['웹사이트 성능 모니터링', '사용자 행동 분석', '오류 진단 및 해결', 'AI 한글 에디터 서비스 개선'] },
                  { title: '개인화', items: ['맞춤형 편집 기능 제공', '사용자 선호도 기억', '편집기 설정값 저장', '대시보드 개인화'] },
                  { title: '마케팅', items: ['서비스 관련 정보 제공', '마케팅 효과 측정', '제품 업데이트 알림', '기술 세미나 정보 제공'] },
                ].map((section, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-semibold text-gray-200 mb-2 text-sm">{section.title}</h3>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {section.items.map((item, j) => (
                        <li key={j}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. 쿠키의 종류 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">3. 쿠키의 종류</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-6">
              {/* 지속 기간별 분류 */}
              <div>
                <h3 className="font-semibold text-gray-200 mb-3 text-sm">지속 기간별 분류</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-700 rounded-lg text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">쿠키 유형</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">설명</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">보존 기간</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-3 text-gray-300 border-b border-gray-700 font-medium">세션 쿠키</td>
                        <td className="px-4 py-3 text-gray-400 border-b border-gray-700">브라우저 세션 동안만 유지</td>
                        <td className="px-4 py-3 text-gray-400 border-b border-gray-700">브라우저 종료 시 삭제</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-300 font-medium">영구 쿠키</td>
                        <td className="px-4 py-3 text-gray-400">설정된 기간까지 유지</td>
                        <td className="px-4 py-3 text-gray-400">최대 2년</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 기능별 분류 */}
              <div>
                <h3 className="font-semibold text-gray-200 mb-3 text-sm">기능별 분류</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { name: '필수 쿠키', dotColor: 'bg-green-500', desc: '웹사이트 기본 기능에 필요한 쿠키', note: '사용자 동의 없이 사용됩니다.', noteColor: 'text-green-400' },
                    { name: '기능 쿠키', dotColor: 'bg-blue-500', desc: '향상된 기능 제공을 위한 쿠키', note: '사용자 동의 후 사용됩니다.', noteColor: 'text-blue-400' },
                    { name: '분석 쿠키', dotColor: 'bg-purple-500', desc: '웹사이트 사용 분석을 위한 쿠키', note: '사용자 동의 후 사용됩니다.', noteColor: 'text-purple-400' },
                    { name: '마케팅 쿠키', dotColor: 'bg-orange-500', desc: '맞춤형 정보 제공을 위한 쿠키', note: '사용자 동의 후 사용됩니다.', noteColor: 'text-orange-400' },
                  ].map((c, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 ${c.dotColor} rounded-full`} />
                        <h4 className="font-semibold text-gray-200 text-sm">{c.name}</h4>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{c.desc}</p>
                      <p className={`text-xs ${c.noteColor}`}>{c.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. 사용 중인 쿠키 목록 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">4. 사용 중인 쿠키 목록</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-700 rounded-lg text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">쿠키명</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">목적</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">유형</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">보존기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'app_session', purpose: '서비스 로그인 세션 유지', type: '필수', typeColor: 'bg-green-900/50 text-green-400', period: '세션' },
                      { name: 'csrf_token', purpose: '보안 토큰 저장', type: '필수', typeColor: 'bg-green-900/50 text-green-400', period: '세션' },
                      { name: 'lang_preference', purpose: '사용자 언어 설정', type: '기능', typeColor: 'bg-blue-900/50 text-blue-400', period: '1년' },
                      { name: 'user_settings', purpose: '편집기 개인화 설정', type: '기능', typeColor: 'bg-blue-900/50 text-blue-400', period: '6개월' },
                      { name: '_ga', purpose: 'Google Analytics 사용자 구분', type: '분석', typeColor: 'bg-purple-900/50 text-purple-400', period: '2년' },
                      { name: 'marketing_consent', purpose: '마케팅 정보 수신 동의', type: '마케팅', typeColor: 'bg-orange-900/50 text-orange-400', period: '1년' },
                    ].map((cookie, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-300 border-b border-gray-700 font-mono">{cookie.name}</td>
                        <td className="px-4 py-3 text-gray-400 border-b border-gray-700">{cookie.purpose}</td>
                        <td className="px-4 py-3 border-b border-gray-700">
                          <span className={`${cookie.typeColor} px-2 py-1 rounded text-xs`}>
                            {cookie.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 border-b border-gray-700">{cookie.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 5. 쿠키 관리 방법 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">5. 쿠키 관리 방법</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-200 mb-3 text-sm">브라우저별 쿠키 설정 방법</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { name: 'Chrome', steps: ['설정 → 개인정보 및 보안', '쿠키 및 기타 사이트 데이터', '원하는 설정 선택'] },
                    { name: 'Firefox', steps: ['옵션 → 개인정보 및 보안', '쿠키 및 사이트 데이터', '설정 관리'] },
                    { name: 'Safari', steps: ['환경설정 → 개인정보', '쿠키 및 웹사이트 데이터', '차단 설정 선택'] },
                    { name: 'Edge', steps: ['설정 → 쿠키 및 사이트 권한', '쿠키 및 저장된 데이터', '차단 또는 허용 설정'] },
                  ].map((browser, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <h4 className="font-semibold text-gray-200 mb-2 text-sm">{browser.name}</h4>
                      <ol className="text-sm text-gray-400 space-y-1">
                        {browser.steps.map((step, j) => (
                          <li key={j}>{j + 1}. {step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 6. 쿠키 거부 시 영향 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">6. 쿠키 거부 시 영향</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-medium mb-1 text-sm">중요 안내</p>
                    <p className="text-yellow-300/80 text-sm">
                      쿠키를 거부하시면 일부 서비스 이용에 제한이 있을 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-red-400 mb-2 text-sm">제한되는 기능</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 자동 로그인 기능</li>
                    <li>• 개인화된 설정 저장</li>
                    <li>• 언어 설정 기억</li>
                    <li>• 맞춤형 콘텐츠 제공</li>
                    <li>• 사용성 개선 기능</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-green-400 mb-2 text-sm">정상 이용 가능</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• AI 한글 에디터 기본 기능</li>
                    <li>• PDF 변환 및 다운로드</li>
                    <li>• 고객지원 서비스</li>
                    <li>• 기본적인 웹사이트 이용</li>
                    <li>• 문의 및 상담 요청</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 7. 정책 변경 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">7. 정책 변경</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">① 변경 통지</h3>
                <p className="text-gray-400 text-sm">
                  이 쿠키 정책이 변경되는 경우, 변경사항은 웹사이트에 게시되며
                  중요한 변경사항의 경우 별도 통지를 실시합니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">② 시행일</h3>
                <p className="text-gray-400 text-sm">
                  변경된 정책은 웹사이트에 게시된 날로부터 7일 후에 시행됩니다.
                </p>
              </div>
              <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-blue-300 font-medium mb-1 text-sm">현재 정책 버전</p>
                    <p className="text-blue-400/80 text-sm">버전: v1.0 | 시행일: 2025년 1월 1일</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <div className="mt-10 sm:mt-12 text-center">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">문의사항</h3>
            <p className="text-gray-400 mb-4 text-sm">
              쿠키 정책에 대한 문의사항이 있으시면 언제든지 연락주시기 바랍니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-300">055-762-9703</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-300">decom2soft@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-300">경남 진주시</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CookiePolicy

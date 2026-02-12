import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  User,
  Lock,
  Database,
  Eye,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'

/**
 * 개인정보처리방침 페이지
 * 다크 테마 적용 + AI 한글 에디터 기준으로 수정
 */
const PrivacyPolicy: React.FC = () => {
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                개인정보처리방침
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">디컴소프트 개인정보보호 정책</p>
            </div>
          </div>
          <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3 sm:p-4 inline-block">
            <p className="text-blue-300 font-medium text-sm sm:text-base">
              시행일자: 2025년 1월 1일 | 최종 수정일: 2025년 1월 1일
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 sm:p-8 space-y-8">
          {/* 1. 개인정보의 처리 목적 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">1. 개인정보의 처리 목적</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                디컴소프트('http://decomsoft.com' 이하 'DECOMSOFT')는 다음의 목적을 위하여 개인정보를 처리합니다.
                처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는
                개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
              </p>
              <ul className="space-y-2">
                {[
                  '회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지',
                  'AI 한글 에디터 서비스 제공: AI 기반 문서 편집 서비스 제공, 기술 지원, 유지보수 서비스',
                  '계약 및 대금결제: 서비스 계약 체결, 대금 결제, 세금계산서 발행, 계약 이행 관리',
                  '고객 지원: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보, 기술 지원',
                  '마케팅 및 광고: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공, 제품 소개 및 데모 제공',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                    <span className="text-gray-300 text-sm">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 2. 개인정보의 처리 및 보유 기간 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">2. 개인정보의 처리 및 보유 기간</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                DECOMSOFT는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은
                개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-700 rounded-lg text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">처리 목적</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">보유 기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['회원 가입 및 관리', '회원 탈퇴 시까지'],
                      ['AI 한글 에디터 서비스 제공', '계약 종료 후 5년'],
                      ['계약 및 대금결제', '관련 법령에 따라 5년'],
                      ['고객 지원', '문의 완료 후 3년'],
                      ['마케팅 및 광고', '동의 철회 시까지'],
                    ].map(([purpose, period], i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-300 border-b border-gray-700">{purpose}</td>
                        <td className="px-4 py-3 text-gray-300 border-b border-gray-700">{period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 3. 개인정보의 제3자 제공 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">3. 개인정보의 제3자 제공</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                DECOMSOFT는 원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한 범위 내에서 처리하며,
                정보주체의 사전 동의 없이는 본래의 목적 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다.
              </p>
              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-medium mb-1 text-sm">예외사항</p>
                    <ul className="text-yellow-300/80 text-sm space-y-1">
                      <li>• 정보주체로부터 별도의 동의를 받은 경우</li>
                      <li>• 법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우</li>
                      <li>• 정보주체 또는 그 법정대리인이 의사표시를 할 수 없는 상태에 있거나 주소불명 등으로 사전 동의를 받을 수 없는 경우</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 개인정보처리의 위탁 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">4. 개인정보처리의 위탁</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                DECOMSOFT는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-700 rounded-lg text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">위탁받는 자</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-600">위탁하는 업무의 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['KT 클라우드', '클라우드 서비스 및 데이터 저장'],
                      ['한국정보인증㈜', '전자세금계산서 발행 및 관리'],
                      ['㈜다날', '결제 서비스 제공'],
                    ].map(([who, what], i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-300 border-b border-gray-700">{who}</td>
                        <td className="px-4 py-3 text-gray-300 border-b border-gray-700">{what}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 5. 정보주체의 권리·의무 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">5. 정보주체의 권리·의무</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                정보주체는 DECOMSOFT에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-gray-200 mb-2 text-sm">행사 가능한 권리</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 개인정보 처리현황 통지요구</li>
                    <li>• 개인정보 열람요구</li>
                    <li>• 개인정보 정정·삭제요구</li>
                    <li>• 개인정보 처리정지요구</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-gray-200 mb-2 text-sm">권리 행사 방법</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 개인정보 보호법 시행규칙 별지 제8호에 따라 작성</li>
                    <li>• 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있음</li>
                    <li>• 회사는 지체 없이 조치하겠습니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 6. 개인정보의 안전성 확보 조치 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">6. 개인정보의 안전성 확보 조치</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                DECOMSOFT는 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및 물리적 조치를 하고 있습니다.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-gray-200 mb-2 text-sm">기술적 조치</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 개인정보처리시스템 등의 접근권한 관리</li>
                    <li>• 개인정보의 암호화</li>
                    <li>• 해킹 등에 대비한 기술적 대책</li>
                    <li>• 개인정보처리시스템 접속기록의 보관 및 위변조 방지</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-gray-200 mb-2 text-sm">관리적 조치</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 개인정보 취급직원의 최소화 및 교육</li>
                    <li>• 개인정보 보호책임자 등의 지정</li>
                    <li>• 정기적인 자체 감사 실시</li>
                    <li>• 개인정보 취급규정의 수립 및 시행</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 7. 개인정보 보호책임자 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">7. 개인정보 보호책임자</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                DECOMSOFT는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-200 mb-3 text-sm">개인정보 보호책임자</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">성명: 김대표</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">연락처: 055-762-9703</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">이메일: decom2soft@gmail.com</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200 mb-3 text-sm">개인정보 보호 담당부서</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">부서명: 개발팀</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">연락처: 055-762-9703</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">이메일: decom2soft@gmail.com</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. 개인정보 처리방침 변경 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">8. 개인정보 처리방침 변경</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
              </p>
              <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-blue-300 font-medium mb-1 text-sm">개인정보처리방침 버전</p>
                    <p className="text-blue-400/80 text-sm">현재 버전: v1.0 (2025.01.01 시행)</p>
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
              개인정보 처리방침에 대한 문의사항이 있으시면 언제든지 연락주시기 바랍니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">055-762-9703</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">decom2soft@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">경남 진주시</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

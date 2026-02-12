import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  User,
  AlertCircle,
  Scale,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'

/**
 * 이용약관 페이지
 * 다크 테마 적용 + AI 한글 에디터 기준으로 수정
 */
const TermsOfService: React.FC = () => {
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Scale className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                이용약관
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">디컴소프트 AI 한글 에디터 서비스 이용약관</p>
            </div>
          </div>
          <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 sm:p-4 inline-block">
            <p className="text-green-300 font-medium text-sm sm:text-base">
              시행일자: 2025년 1월 1일 | 최종 수정일: 2025년 1월 1일
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 sm:p-8 space-y-8">
          {/* 제1조 목적 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제1조 (목적)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                이 약관은 디컴소프트(이하 "회사")가 운영하는 AI 한글 에디터 서비스 웹사이트(http://decomsoft.com)에서 제공하는
                AI 기반 문서 편집 소프트웨어 및 관련 서비스(이하 "서비스")를 이용함에 있어 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </div>
          </section>

          {/* 제2조 정의 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제2조 (정의)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-300 mb-4 text-sm sm:text-base">이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
              <div className="space-y-3">
                {[
                  ['"웹사이트"', '회사가 AI 한글 에디터 서비스를 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 서비스를 제공할 수 있도록 설정한 가상의 영업장'],
                  ['"이용자"', '회사의 웹사이트에 접속하여 이 약관에 따라 회사가 제공하는 AI 한글 에디터 서비스를 받는 회원 및 비회원'],
                  ['"회원"', '회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 회사가 제공하는 AI 한글 에디터 서비스를 계속적으로 이용할 수 있는 자'],
                  ['"AI 한글 에디터 서비스"', '회사가 제공하는 AI 기반 문서 편집 시스템으로 PDF 변환, 워터마크 제거, 한글 OCR 텍스트 인식 및 편집, 이미지 편집 등의 기능을 제공하는 소프트웨어 및 관련 서비스'],
                ].map(([term, desc], i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-semibold text-gray-200 mb-2 text-sm">{i + 1}. {term}</h3>
                    <p className="text-gray-400 text-sm">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 제3조 약관의 명시와 설명 및 개정 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제3조 (약관의 명시와 설명 및 개정)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">① 약관의 명시</h3>
                <p className="text-gray-400 text-sm">회사는 이 약관의 내용과 상호 및 대표자 성명, 영업소 소재지 주소(소비자의 불만을 처리할 수 있는 곳의 주소를 포함), 전화번호·모사전송번호·전자우편주소, 사업자등록번호, 통신판매업 신고번호, 개인정보보호책임자 등을 이용자가 쉽게 알 수 있도록 웹사이트의 초기 서비스화면에 게시합니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">② 약관의 개정</h3>
                <p className="text-gray-400 text-sm">회사는 「약관의 규제에 관한 법률」, 「전자상거래 등에서의 소비자보호에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">③ 개정 공지</h3>
                <p className="text-gray-400 text-sm">회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 웹사이트의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</p>
              </div>
            </div>
          </section>

          {/* 제4조 서비스의 제공 및 변경 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제4조 (서비스의 제공 및 변경)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">① 제공 서비스</h3>
                <p className="text-gray-400 text-sm mb-3">회사는 다음과 같은 업무를 수행합니다.</p>
                <ul className="space-y-2">
                  {[
                    'AI 기반 한글 텍스트 인식(OCR) 및 편집 서비스 제공',
                    'PDF 문서 이미지 변환 및 워터마크 제거 서비스',
                    '이미지 편집 도구 제공',
                    '사용자 기술 지원 및 고객 서비스',
                    '시스템 유지보수 및 업데이트',
                    '기타 회사가 정하는 관련 업무',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
                      <span className="text-gray-400 text-sm">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">② 서비스 변경</h3>
                <p className="text-gray-400 text-sm">회사는 소프트웨어의 업그레이드 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 서비스의 내용을 변경할 수 있습니다. 이 경우에는 변경된 서비스의 내용 및 제공일자를 명시하여 현재의 서비스 내용을 게시한 곳에 즉시 공지합니다.</p>
              </div>
            </div>
          </section>

          {/* 제5조 회원가입 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제5조 (회원가입)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">① 가입 신청</h3>
                <p className="text-gray-400 text-sm">이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">② 가입 승낙</h3>
                <p className="text-gray-400 text-sm">회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.</p>
                <ul className="mt-2 space-y-1">
                  {[
                    '가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우',
                    '등록 내용에 허위, 기재누락, 오기가 있는 경우',
                    '기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-2 shrink-0" />
                      <span className="text-gray-500 text-sm">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 제9조 개인정보보호 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제9조 (개인정보보호)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">① 개인정보 수집</h3>
                <p className="text-gray-400 text-sm">회사는 AI 한글 에디터 서비스 제공을 위해 필요한 최소한의 개인정보를 수집합니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">② 개인정보 보호</h3>
                <p className="text-gray-400 text-sm">회사는 개인정보보호법에 따라 이용자의 개인정보를 보호하며, 개인정보처리방침에 따라 개인정보를 처리합니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">③ 개인정보 제3자 제공</h3>
                <p className="text-gray-400 text-sm">회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의해 요구되는 경우는 예외로 합니다.</p>
              </div>
            </div>
          </section>

          {/* 제11조 면책조항 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제11조 (면책조항)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">① 천재지변 등</h3>
                <p className="text-gray-400 text-sm">회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">② 이용자 귀책사유</h3>
                <p className="text-gray-400 text-sm">회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">③ 무료 서비스</h3>
                <p className="text-gray-400 text-sm">회사는 무료로 제공되는 서비스의 이용과 관련하여 관련법에 특별한 규정이 없는 한 책임을 지지 않습니다.</p>
              </div>
            </div>
          </section>

          {/* 제12조 준거법 및 관할법원 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">제12조 (준거법 및 관할법원)</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">① 준거법</h3>
                <p className="text-gray-400 text-sm">회사와 이용자 간에 제기된 전자상거래 소송에는 대한민국법을 적용합니다.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-sm">② 관할법원</h3>
                <p className="text-gray-400 text-sm">회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 민사소송법상의 관할법원에 제기합니다.</p>
              </div>
            </div>
          </section>

          {/* 부칙 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">부칙</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">이 약관은 2025년 1월 1일부터 시행됩니다.</p>
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <div className="mt-10 sm:mt-12 text-center">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">문의사항</h3>
            <p className="text-gray-400 mb-4 text-sm">
              이용약관에 대한 문의사항이 있으시면 언제든지 연락주시기 바랍니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">055-762-9703</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">decom2soft@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">경남 진주시</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService

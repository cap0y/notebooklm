import React, { useState } from 'react'
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Package,
  Truck,
  CreditCard,
  Repeat,
  Settings,
  Grid3X3,
  Megaphone,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * 고객센터 페이지
 * 다크 테마 적용 + AI 한글 에디터 기준으로 수정
 */

// ── FAQ 데이터 ──
const categories = [
  { id: 'all', name: '전체', icon: 'grid' },
  { id: 'product', name: '주요 기능', icon: 'package' },
  { id: 'delivery', name: '설치/이용', icon: 'truck' },
  { id: 'payment', name: '결제/정산', icon: 'credit-card' },
  { id: 'refund', name: '계약/해지', icon: 'repeat' },
  { id: 'account', name: '계정 관리', icon: 'settings' },
  { id: 'etc', name: '기타 문의', icon: 'help-circle' },
]

const faqs = [
  {
    id: 1,
    category: 'product',
    question: 'AI 한글 에디터는 어떤 기능을 제공하나요?',
    answer:
      'AI 한글 에디터는 PDF 문서를 이미지로 변환하고, 워터마크를 제거하며, 이미지 내 뭉개진 한글 텍스트를 AI로 정확하게 인식하여 편집 및 교체하는 기능을 제공합니다. 또한 선택 영역 이동, 크기 조절 등 다양한 이미지 편집 기능을 지원합니다.',
  },
  {
    id: 2,
    category: 'delivery',
    question: 'PDF 파일은 몇 장까지 변환할 수 있나요?',
    answer:
      '현재 최대 15장까지의 PDF 파일을 이미지로 변환할 수 있습니다. 더 많은 페이지를 지원하기 위해 지속적으로 업데이트될 예정입니다.',
  },
  {
    id: 3,
    category: 'payment',
    question: '서비스 이용 요금은 어떻게 되나요?',
    answer:
      '현재 AI 한글 에디터는 무료로 제공되고 있습니다. 향후 유료 기능이 추가될 수 있으며, 변경 시 충분한 사전 공지를 통해 안내해 드릴 예정입니다.',
  },
  {
    id: 4,
    category: 'refund',
    question: '워터마크 제거 기능이 다른 글자도 지우는 것 같아요.',
    answer:
      '워터마크 제거 기능은 "NotebookLM" 워터마크만을 최소한으로 제거하도록 설계되었습니다. 만약 다른 글자가 삭제되는 문제가 발생한다면, 해당 이미지와 함께 고객지원팀에 문의해 주시면 신속히 확인 후 조치하겠습니다.',
  },
  {
    id: 5,
    category: 'account',
    question: '편집한 내용을 PDF로 다시 다운로드할 수 있나요?',
    answer:
      '네, 이미지 편집기에서 수정한 내용은 PDF 변환 탭에 반영되며, 수정된 이미지를 포함하여 새로운 PDF 파일로 다운로드할 수 있습니다.',
  },
  {
    id: 6,
    category: 'product',
    question: '한글 텍스트 인식(OCR) 정확도는 어느 정도인가요?',
    answer:
      'AI 한글 에디터는 최신 AI OCR 모델을 사용하여 뭉개지거나 흐릿한 한글 텍스트도 높은 정확도로 인식합니다. 인식 결과가 정확하지 않은 경우, 직접 수정하여 텍스트를 교체할 수 있습니다.',
  },
  {
    id: 7,
    category: 'delivery',
    question: '어떤 파일 형식을 지원하나요?',
    answer:
      'PDF, JPG, PNG 형식의 파일을 지원합니다. PDF 파일은 이미지로 변환하여 편집할 수 있으며, JPG/PNG 이미지는 직접 이미지 편집기에서 편집할 수 있습니다.',
  },
  {
    id: 8,
    category: 'etc',
    question: '모바일에서도 사용 가능한가요?',
    answer:
      '네, AI 한글 에디터는 반응형 웹 디자인으로 개발되어 모바일 기기에서도 최적화된 사용 환경을 제공합니다. 터치 기반의 편집 기능도 지원합니다.',
  },
]

// ── 이용가이드 데이터 ──
const guideItems = [
  {
    id: 1,
    title: 'PDF 파일 변환 및 워터마크 제거 방법',
    items: [
      '홈 화면 또는 PDF 변환 탭에서 PDF 파일을 드래그 앤 드롭하거나 파일 선택 버튼을 클릭하여 업로드',
      'PDF 변환 탭에서 "워터마크 자동 제거" 토글을 활성화',
      '변환된 이미지에서 워터마크가 제거된 것을 확인',
      '"전체 이미지 다운로드" 또는 "PDF로 다운로드" 버튼을 클릭하여 저장',
    ],
    notes: [
      '최대 15장까지의 PDF 지원',
      'JPG, PNG 이미지도 업로드 가능',
      '변환된 이미지는 편집기에서 추가 편집 가능',
      '원본 파일은 서버에 저장되지 않음',
    ],
  },
  {
    id: 2,
    title: '이미지 내 한글 텍스트 편집 방법',
    items: [
      'PDF 변환 탭에서 특정 이미지의 "편집" 버튼 클릭 또는 이미지 편집기 탭에서 이미지 업로드',
      '캔버스에서 마우스 드래그로 편집할 텍스트 영역 선택',
      '자동 인식된 텍스트가 우측 편집 패널에 표시됨',
      '"텍스트 교체" 버튼으로 수정 적용 후 "PDF에 반영" 클릭',
    ],
    notes: [
      '선택 영역은 마우스로 이동 및 크기 조절 가능',
      '폰트 크기와 위치가 자동으로 맞춰짐',
      'Ctrl + 마우스 휠로 이미지 확대/축소 가능',
      '편집 취소 기능 지원',
    ],
  },
  {
    id: 3,
    title: '이미지 선택 영역 이동 및 크기 조절',
    items: [
      '이미지 편집기에서 텍스트 영역을 선택',
      '선택 영역 내부를 클릭하여 드래그하면 영역 이동',
      '모서리나 변의 조절 핸들을 드래그하여 크기 조절',
      'Ctrl 키 + 마우스 휠로 이미지 확대/축소',
    ],
    notes: [
      '확대된 상태에서도 선택 좌표가 정확히 유지됨',
      '선택 영역의 정확한 좌표는 편집 패널에서 확인 가능',
      '다양한 편집 도구(지우개, 텍스트 등) 지원',
      '수정 결과 미리보기 제공',
    ],
  },
  {
    id: 4,
    title: '고객지원 및 문의',
    items: [
      '평일: 09:00 - 18:00',
      '토요일: 09:00 - 13:00',
      '일요일 및 공휴일: 휴무',
      '긴급 상황 시 이메일 문의 가능',
    ],
    notes: [
      '이메일: decom2soft@gmail.com',
      '전화: 055-762-9703',
      'FAQ를 통한 빠른 답변 확인',
      '원격 지원 서비스 가능',
    ],
  },
]

// 공지사항 데이터 (정적)
const notices = [
  {
    id: 1,
    title: 'AI 한글 에디터 서비스 오픈 안내',
    date: '2025-01-15',
    important: true,
    content:
      'AI 한글 에디터 서비스가 정식 오픈되었습니다. PDF 변환, 한글 텍스트 교체, 이미지 편집 기능을 이용하실 수 있습니다.',
  },
  {
    id: 2,
    title: '개인정보처리방침 개정 안내',
    date: '2025-01-01',
    important: false,
    content:
      '개인정보보호법 개정에 따라 당사 개인정보처리방침이 일부 변경되었습니다. 자세한 내용은 개인정보처리방침 페이지를 참고해 주세요.',
  },
  {
    id: 3,
    title: '시스템 정기 점검 안내',
    date: '2025-01-10',
    important: false,
    content:
      '매주 일요일 02:00~06:00 시스템 정기 점검이 진행됩니다. 해당 시간에는 서비스 이용이 제한될 수 있습니다.',
  },
]

// ── 아이콘 렌더 ──
function renderCategoryIcon(iconName: string) {
  const cls = 'w-4 h-4 mr-2'
  switch (iconName) {
    case 'grid':
      return <Grid3X3 className={cls} />
    case 'package':
      return <Package className={cls} />
    case 'truck':
      return <Truck className={cls} />
    case 'credit-card':
      return <CreditCard className={cls} />
    case 'repeat':
      return <Repeat className={cls} />
    case 'settings':
      return <Settings className={cls} />
    default:
      return <HelpCircle className={cls} />
  }
}

// ── 아코디언 아이템 ──
function AccordionItem({
  title,
  children,
  badge,
}: {
  title: React.ReactNode
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-700 rounded-lg bg-gray-800">
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {badge}
          <span className="font-medium text-sm sm:text-base truncate text-gray-200">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-700 text-gray-400 text-sm leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ──
const HelpCenter: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'faq' | 'notice' | 'guide'>('faq')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredFaqs = faqs.filter((faq) => {
    const matchCat = selectedCategory === 'all' || faq.category === selectedCategory
    const matchSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-auto">
      {/* 히어로 */}
      <section className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-10 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1 text-blue-300 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </button>
          <h2 className="text-2xl sm:text-4xl font-bold mb-3">고객센터</h2>
          <p className="text-base sm:text-xl mb-6 text-blue-200">
            궁금한 것이 있으시면 언제든지 문의해 주세요
          </p>
          <div className="flex justify-center">
            <div className="relative max-w-md w-full">
              <input
                type="text"
                placeholder="궁금한 내용을 검색하세요"
                className="w-full pl-4 pr-12 py-3 rounded-lg bg-gray-800 text-gray-100 text-sm placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                <Search className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 탭 네비게이션 */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
          {[
            { key: 'faq' as const, label: '자주 묻는 질문' },
            { key: 'notice' as const, label: '공지사항' },
            { key: 'guide' as const, label: '이용가이드' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FAQ 탭 ── */}
        {activeTab === 'faq' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 카테고리 사이드바 */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h3 className="font-semibold mb-3 text-gray-200">카테고리</h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center text-sm ${
                        selectedCategory === cat.id
                          ? 'bg-blue-900/50 text-blue-400'
                          : 'hover:bg-gray-700 text-gray-400'
                      }`}
                    >
                      {renderCategoryIcon(cat.icon)}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ 리스트 */}
            <div className="lg:col-span-3 space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                자주 묻는 질문 ({filteredFaqs.length}건)
              </p>
              {filteredFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  title={faq.question}
                  badge={
                    <span className="text-xs border border-gray-600 rounded px-2 py-0.5 text-gray-500 shrink-0">
                      {categories.find((c) => c.id === faq.category)?.name}
                    </span>
                  }
                >
                  {faq.answer}
                </AccordionItem>
              ))}
              {filteredFaqs.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">검색 결과가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 공지사항 탭 ── */}
        {activeTab === 'notice' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">공지사항</p>
            {notices.map((n) => (
              <AccordionItem
                key={n.id}
                title={n.title}
                badge={
                  <>
                    {n.important && (
                      <span className="text-xs bg-red-600 text-white rounded px-2 py-0.5 shrink-0">
                        중요
                      </span>
                    )}
                    <Megaphone className="w-4 h-4 text-blue-400 shrink-0" />
                  </>
                }
              >
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  {n.date}
                </div>
                <p>{n.content}</p>
              </AccordionItem>
            ))}
          </div>
        )}

        {/* ── 이용가이드 탭 ── */}
        {activeTab === 'guide' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">이용가이드</p>
            {guideItems.map((g) => (
              <AccordionItem
                key={g.id}
                title={g.title}
                badge={<BookOpen className="w-4 h-4 text-blue-400 shrink-0" />}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-200 mb-2 text-sm">
                      주요 절차
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                      {g.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-200 mb-2 text-sm">
                      참고사항
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                      {g.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionItem>
            ))}
          </div>
        )}
      </div>

      {/* 하단 연락처 */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">
            추가 문의가 필요하신가요?
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            고객센터로 연락 주시면 친절하게 안내해 드리겠습니다.
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
  )
}

export default HelpCenter

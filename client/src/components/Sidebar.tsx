import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FileText,
  Image,
  HelpCircle,
  Shield,
  FileCheck,
  Cookie,
  MessageSquare,
  Presentation,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'

/**
 * 네비게이션 컴포넌트 (반응형)
 *
 * 데스크탑 (md 이상): 좌측 세로 사이드바 (w-14)
 *   - 상단: 회사 로고 + 메인 메뉴
 *   - 하단: 고객지원 링크 (FAQ, 개인정보처리방침, 이용약관, 쿠키정책)
 * 모바일 (md 미만): 화면 하단 고정 가로 네비게이션 바 (h-14)
 */
const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // PPT 분석 결과 존재 여부 (글로벌 스토어)
  const hasPptResult = useAppStore((s) => s.slidesData.length > 0)
  const setShowPptPreview = useAppStore((s) => s.setShowPptPreview)

  // 메인 메뉴 아이템
  const menuItems = [
    { icon: Home, label: '홈', path: '/' },
    { icon: FileText, label: 'PDF 변환', path: '/pdf-converter' },
    { icon: Image, label: '편집', path: '/image-editor' },
    { icon: MessageSquare, label: '채팅', path: '/chat' },
  ]

  // 고객지원 링크 (DecomDirectTrade 원본 그대로)
  const supportItems = [
    { icon: HelpCircle, label: 'FAQ', path: '/help-center' },
    { icon: Shield, label: '개인정보', path: '/privacy-policy' },
    { icon: FileCheck, label: '이용약관', path: '/terms-of-service' },
    { icon: Cookie, label: '쿠키정책', path: '/cookie-policy' },
  ]

  return (
    <>
      {/* ─── 데스크탑 사이드바 (모바일 숨김) ─── */}
      <div className="hidden md:flex w-14 h-full bg-gray-950 border-r border-gray-800/50 flex-col items-center py-4 shrink-0">

        {/* 회사 로고 (icon-192.png) */}
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-lg overflow-hidden mb-6 hover:opacity-90 transition-opacity shrink-0"
        >
          <img
            src="/images/icon-192.png"
            alt="디컴소프트"
            className="w-full h-full object-cover"
          />
        </button>

        {/* 메인 메뉴 아이템 */}
        <div className="flex flex-col gap-1 flex-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                )}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
                {/* 호버 시 라벨 툴팁 */}
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-gray-700/50 z-50">
                  {item.label}
                </span>
              </button>
            )
          })}

          {/* PPT 결과 아이콘 — 분석 결과가 있을 때만 활성 표시 */}
          <button
            onClick={() => {
              setShowPptPreview(true)
              navigate('/pdf-converter')
            }}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative',
              hasPptResult
                ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10'
                : 'text-gray-700 cursor-default'
            )}
            title="PPT 결과"
            disabled={!hasPptResult}
          >
            <Presentation className="w-5 h-5" />
            {/* 결과 있을 때 알림 점 */}
            {hasPptResult && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
            )}
            {/* 호버 시 라벨 툴팁 */}
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-gray-700/50 z-50">
              {hasPptResult ? 'PPT 결과 보기' : 'PPT 결과 없음'}
            </span>
          </button>
        </div>

        {/* 고객지원 링크 (하단 고정) */}
        <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-gray-800/50">
          {supportItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative text-gray-600 hover:text-gray-400 hover:bg-gray-800/50"
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
              {/* 호버 시 라벨 툴팁 */}
              <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-gray-700/50 z-50">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ─── 모바일 하단 네비게이션 (데스크탑 숨김) ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-gray-950 border-t border-gray-800/50 flex items-center justify-around z-50">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all',
                isActive
                  ? 'text-blue-400'
                  : 'text-gray-500 active:text-gray-300'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
        {/* PPT 결과 (모바일) */}
        {hasPptResult && (
          <button
            onClick={() => {
              setShowPptPreview(true)
              navigate('/pdf-converter')
            }}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all text-orange-400 active:text-orange-300 relative"
          >
            <Presentation className="w-5 h-5" />
            <span className="text-[10px] font-medium">PPT</span>
            <span className="absolute top-0.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full" />
          </button>
        )}
      </div>
    </>
  )
}

export default Sidebar

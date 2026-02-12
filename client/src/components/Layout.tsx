import React, { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

/**
 * 메인 레이아웃 (반응형)
 *
 * 데스크탑 (md 이상): 좌측 사이드바 + 우측 메인 콘텐츠
 * 모바일 (md 미만): 상단 콘텐츠 + 하단 네비게이션 바
 *
 * pb-14 → 모바일 하단 네비게이션 높이만큼 패딩
 * md:pb-0 → 데스크탑에서는 패딩 제거
 */
const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-gray-950">
      {/* 데스크탑 사이드바 (모바일에서는 숨김) */}
      <Sidebar />
      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
        {children}
      </main>
    </div>
  )
}

export default Layout

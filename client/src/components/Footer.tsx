import React from 'react'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Printer,
} from 'lucide-react'

/**
 * 풋터 컴포넌트
 * DecomDirectTrade 풋터 원본 링크 그대로 적용
 * 반응형: 모바일 가로 스크롤, 데스크탑 4컬럼 그리드
 */
export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8 w-full shrink-0">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* 메인 풋터 콘텐츠 - 모바일에서 가로 스크롤 */}
        <div className="overflow-x-auto scrollbar-hide mb-8">
          <div className="flex md:grid md:grid-cols-4 gap-8 min-w-max md:min-w-0">

            {/* 회사 정보 */}
            <div className="min-w-[280px] md:min-w-0 md:col-span-1 flex-shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src="/images/icon-192.png"
                    alt="디컴소프트 로고"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">디컴소프트</h3>
                  <p className="text-blue-300 text-sm">AI 한글 에디터</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                개인정보보호책임자: 김영철
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">FAX: 050-8907-9703</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">decom2soft@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">평일 09:00-18:00</span>
                </div>
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-700/50">
                  <span className="text-yellow-400 text-xs font-semibold">후원계좌</span>
                  <span className="text-gray-300">농협 3024529970361</span>
                </div>
              </div>
            </div>

            {/* 서비스 */}
            <div className="min-w-[200px] md:min-w-0 flex-shrink-0 md:ml-16">
              <h3 className="text-base font-bold mb-4 text-blue-400">서비스</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <a href="https://decomsoft.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    디컴소프트
                  </a>
                </li>
                <li>
                  <a href="https://decomsoft.com/board" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    게시판
                  </a>
                </li>
                <li>
                  <a href="https://decomsoft.com/shop" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    쇼핑몰
                  </a>
                </li>
              </ul>
            </div>

            {/* 고객지원 */}
            <div className="min-w-[200px] md:min-w-0 flex-shrink-0">
              <h3 className="text-base font-bold mb-4 text-purple-400">고객지원</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <a href="/help-center" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="/privacy-policy" className="hover:text-white transition-colors">
                    개인정보처리방침
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="hover:text-white transition-colors">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="/cookie-policy" className="hover:text-white transition-colors">
                    쿠키정책
                  </a>
                </li>
              </ul>
            </div>

            {/* 연락처 */}
            <div className="min-w-[250px] md:min-w-0 flex-shrink-0">
              <h3 className="text-base font-bold mb-4 text-green-400">연락처</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-300">경상남도 진주시 동진로 55</p>
                    <p className="text-gray-300">경상국립대학교 산학협력관 324호</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">055-762-9703</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">decom2soft@gmail.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 구분선 및 저작권 */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                사업자등록증 257-37-00989 컴퓨터 프로그래밍 서비스업
              </p>
              <p className="text-gray-400 text-sm mt-1">
                통신판매업 신고: 2025-경남진주-0718 대표자:김영철 상호:디컴소프트
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                &copy; 2023 DECOMSOFT. All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 스크롤바 숨김 스타일 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .scrollbar-hide::-webkit-scrollbar { display: none; }
            .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />
    </footer>
  )
}

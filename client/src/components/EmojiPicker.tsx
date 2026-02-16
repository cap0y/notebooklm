import React, { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'

// ── 이모지 카테고리 데이터 ──
const EMOJI_CATEGORIES = [
  {
    name: '자주 쓰는',
    icon: '⭐',
    emojis: ['😀', '😂', '🤣', '😍', '🥰', '😘', '😊', '🙂', '😎', '🤗', '🤔', '😏', '😢', '😭', '😡', '🥺', '👍', '👎', '👏', '🙏', '❤️', '🔥', '✨', '💯'],
  },
  {
    name: '표정',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  },
  {
    name: '감정',
    icon: '😢',
    emojis: ['😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
  },
  {
    name: '손동작',
    icon: '👋',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💪'],
  },
  {
    name: '하트',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    name: '자연/동물',
    icon: '🐶',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦆', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🌿', '🍀', '🌳', '🌈', '☀️', '🌙', '⭐', '🌊'],
  },
  {
    name: '음식',
    icon: '🍔',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥝', '🍅', '🥑', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥗', '🍜', '🍝', '🍣', '🍱', '🍩', '🍪', '🎂', '🍰', '☕', '🍵', '🧋', '🍺', '🍷'],
  },
  {
    name: '사물/기호',
    icon: '💡',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🎮', '🕹️', '🎲', '🧩', '🎭', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '📱', '💻', '⌨️', '🖥️', '📷', '📸', '💡', '🔦', '📚', '📖', '✏️', '📝', '💰', '💎', '🔑', '🏠', '🚗', '✈️', '🚀', '⏰', '🎁', '🎉', '🎊', '🏆', '🥇', '🔔'],
  },
  {
    name: '깃발/기타',
    icon: '🚩',
    emojis: ['✅', '❌', '❓', '❗', '‼️', '⁉️', '💢', '💤', '💬', '👁️‍🗨️', '🗯️', '💭', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '▶️', '⏸️', '⏹️', '🔀', '🔁', '🔂', '⏩', '⏪', '🔼', '🔽', '⬆️', '⬇️', '➡️', '⬅️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️'],
  },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  className?: string
  /** 렌더 즉시 열기 (리액션 전용) */
  autoOpen?: boolean
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, className = '', autoOpen = false }) => {
  const [isOpen, setIsOpen] = useState(autoOpen)
  const [activeCategory, setActiveCategory] = useState(0)
  const [search, setSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji)
  }

  // 검색 시 모든 카테고리에서 필터 (이모지 자체로는 검색 안되므로 카테고리 이름으로)
  const filteredCategories = search.trim()
    ? EMOJI_CATEGORIES.map((cat) => ({
        ...cat,
        emojis: cat.emojis, // 이모지는 텍스트 검색이 어려워 카테고리별로 보여줌
      }))
    : EMOJI_CATEGORIES

  return (
    <div ref={pickerRef} className={`relative ${className}`}>
      {/* 토글 버튼 (autoOpen이면 숨김) */}
      {!autoOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-gray-800/60 transition-colors"
          title="이모티콘"
        >
          <Smile className="w-5 h-5" />
        </button>
      )}

      {/* 이모지 피커 패널 */}
      {isOpen && (
        <div className={`${autoOpen ? '' : 'absolute bottom-full right-0 mb-2'} w-[340px] bg-gray-900 border border-gray-800/60 rounded-xl shadow-2xl z-50 overflow-hidden`}>
          {/* 카테고리 탭 */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-800/50 overflow-x-auto scrollbar-hide">
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(idx)}
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                  activeCategory === idx
                    ? 'bg-blue-500/20 scale-110'
                    : 'hover:bg-gray-800/60'
                }`}
                title={cat.name}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* 카테고리 이름 */}
          <div className="px-3 pt-2 pb-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {filteredCategories[activeCategory]?.name}
            </span>
          </div>

          {/* 이모지 그리드 */}
          <div className="px-2 pb-2 h-[220px] overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {filteredCategories[activeCategory]?.emojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-800/60 rounded-lg transition-colors hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmojiPicker


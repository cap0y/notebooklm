/**
 * 텍스트를 단어 경계를 기준으로 일정 길이의 청크로 분할
 * 자막 표시 시 단어가 중간에 잘리지 않도록 보장
 */
export const splitTextIntoChunks = (text: string, maxChars: number = 45): string[] => {
  if (!text) return []

  const words = text.trim().split(/\s+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const word of words) {
    const potentialLength = currentChunk.length + (currentChunk ? 1 : 0) + word.length

    if (potentialLength <= maxChars) {
      currentChunk += (currentChunk ? ' ' : '') + word
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      currentChunk = word
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * 진행률(0.0~1.0)에 따라 표시할 청크 인덱스를 문자 수 기반으로 계산
 * 긴 청크는 더 오래 표시되어 자연스러운 자막 동기화 제공
 */
export const getChunkIndexByCharacterCount = (chunks: string[], progress: number): number => {
  if (chunks.length === 0) return 0
  if (progress >= 1) return chunks.length - 1
  if (progress <= 0) return 0

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
  const targetCharIndex = progress * totalLength

  let runningCount = 0
  for (let i = 0; i < chunks.length; i++) {
    runningCount += chunks[i].length
    if (runningCount >= targetCharIndex) {
      return i
    }
  }

  return chunks.length - 1
}


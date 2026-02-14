import PptxGenJS from 'pptxgenjs'
import { Slide, AspectRatio } from '../types'

/**
 * 슬라이드 배열을 PPTX 파일로 변환하여 다운로드
 *
 * 각 슬라이드 이미지를 전체 크기로 배치하고
 * 나레이션 대본을 노트로 추가
 */
export const exportPptx = async (slides: Slide[], aspectRatio: AspectRatio) => {
  const pptx = new PptxGenJS()

  // 화면 비율에 따른 레이아웃 설정
  if (aspectRatio === AspectRatio.Portrait9_16) {
    pptx.defineLayout({ name: 'PORTRAIT', width: 5.625, height: 10 })
    pptx.layout = 'PORTRAIT'
  } else {
    pptx.layout = 'LAYOUT_16x9'
  }

  for (const slide of slides) {
    const s = pptx.addSlide()

    // 이미지를 contain 방식으로 전체 슬라이드에 배치
    s.addImage({
      data: slide.imageUrl,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      sizing: { type: 'contain', align: 'center' },
    })

    // 나레이션 대본을 발표자 노트에 추가
    if (slide.script) {
      s.addNotes(slide.script)
    }
  }

  await pptx.writeFile({ fileName: `MagicSlide-${Date.now()}.pptx` })
}


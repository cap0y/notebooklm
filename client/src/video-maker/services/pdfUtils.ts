import * as pdfjsLib from 'pdfjs-dist'

// 기존 프로젝트의 PDF.js 워커 설정과 동일
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * PDF 파일의 각 페이지를 고품질 JPEG 이미지로 변환
 * 비디오 렌더링용으로 scale 3.0 (1080p 최적화)
 */
export const convertPdfToImages = async (file: File): Promise<string[]> => {
  const fileData = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({ data: fileData }).promise
  const numPages = pdf.numPages
  const imageUrls: string[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)

    // 고품질 렌더링 (1080p 비디오 최적화)
    const viewport = page.getViewport({ scale: 3.0 })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width

    if (!context) continue

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }

    await page.render(renderContext).promise

    // JPEG Base64 문자열로 변환
    const base64 = canvas.toDataURL('image/jpeg', 0.85)
    imageUrls.push(base64)
  }

  return imageUrls
}


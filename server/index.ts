import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { initBoardTables } from './db'
import postsRouter from './routes/posts'
import chatRouter from './routes/chat'
import feedRouter from './routes/feed'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '5000', 10)

app.use(cors())
app.use(express.json())

// 업로드 디렉토리 (향후 파일 저장 시 사용)
const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 업로드 파일 정적 서빙
app.use('/api/files', express.static(uploadDir))

// 헬스체크 엔드포인트
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 게시판 API 라우트
app.use('/api/posts', postsRouter)

// 채팅 API 라우트
app.use('/api/chat', chatRouter)

// 피드 게시판 API 라우트
app.use('/api/feed', feedRouter)

// DB 초기화 (테이블 생성)
initBoardTables().catch((err) => {
  console.error('⚠️ DB 초기화 실패 (서버는 계속 실행됩니다):', err)
})

// 프로덕션: 빌드된 프론트엔드 정적 파일 서빙
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI 한글 에디터 서버가 포트 ${PORT}에서 실행 중입니다.`)
})

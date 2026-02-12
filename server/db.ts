import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()
const { Pool } = pg

// DATABASE_URL 환경 변수로 PostgreSQL 연결
let pool: pg.Pool

if (process.env.DATABASE_URL) {
  console.log('🔗 DATABASE_URL 사용하여 연결')
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
} else {
  console.log('🔗 개별 환경 변수 사용하여 연결')
  pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'aihanguledit',
    password: process.env.PGPASSWORD || '',
    port: parseInt(process.env.PGPORT || '5432'),
    ssl: process.env.REPLIT_DEPLOYMENT === '1' ? { rejectUnauthorized: false } : undefined,
  })
}

// SQL 쿼리 실행 함수
export async function query(text: string, params: any[] = []) {
  try {
    const res = await pool.query(text, params)
    return res.rows
  } catch (error) {
    console.error('❌ 쿼리 실행 오류:', error)
    throw error
  }
}

// 게시판 테이블 초기화
export async function initBoardTables() {
  const client = await pool.connect()
  try {
    console.log('🔄 게시판 테이블 초기화 시작...')

    // posts 테이블 (기존 게시판 — 호환 유지)
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        author_name VARCHAR(50) NOT NULL,
        password VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('📦 posts 테이블 준비 완료')

    // post_comments 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES post_comments(id) ON DELETE CASCADE,
        author_name VARCHAR(50) NOT NULL,
        password VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('📦 post_comments 테이블 준비 완료')

    // ─── 채팅 메시지 테이블 ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        channel VARCHAR(50) NOT NULL DEFAULT 'general',
        author_name VARCHAR(50) NOT NULL,
        password VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('📦 chat_messages 테이블 준비 완료')

    // 인덱스 생성
    await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON chat_messages(channel, created_at ASC)`)

    // 댓글 수 자동 업데이트 트리거
    await client.query(`
      CREATE OR REPLACE FUNCTION update_post_comments_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await client.query(`DROP TRIGGER IF EXISTS trigger_comments_count ON post_comments`)
    await client.query(`
      CREATE TRIGGER trigger_comments_count
        AFTER INSERT OR DELETE ON post_comments
        FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();
    `)

    console.log('🎉 테이블 초기화 완료!')
  } catch (error) {
    console.error('❌ 테이블 초기화 오류:', error)
  } finally {
    client.release()
  }
}

export { pool }


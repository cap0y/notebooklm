import express, { Request, Response } from 'express'
import { query } from '../db'

const router = express.Router()

/**
 * 채팅 메시지 API
 *
 * 채널별 메시지를 관리하며, 비밀번호 기반으로 본인 메시지 삭제를 지원한다.
 * 인증(로그인) 없이 닉네임 + 비밀번호 조합으로 동작한다.
 */

// 메시지 목록 조회 (채널별, 최신순 페이지네이션)
router.get('/:channel/messages', async (req: Request, res: Response) => {
  try {
    const { channel } = req.params
    const { before, limit = '50' } = req.query
    const msgLimit = Math.min(Number(limit), 100)

    let messages
    if (before) {
      // 특정 ID 이전 메시지 (스크롤 위로 올릴 때)
      messages = await query(
        `SELECT id, channel, author_name, content, created_at
         FROM chat_messages
         WHERE channel = $1 AND id < $2
         ORDER BY id DESC
         LIMIT $3`,
        [channel, Number(before), msgLimit]
      )
    } else {
      // 최신 메시지 (처음 로드)
      messages = await query(
        `SELECT id, channel, author_name, content, created_at
         FROM chat_messages
         WHERE channel = $1
         ORDER BY id DESC
         LIMIT $2`,
        [channel, msgLimit]
      )
    }

    // 오래된 순서로 뒤집어서 반환 (채팅방 표시용)
    res.json(messages.reverse())
  } catch (error) {
    console.error('❌ 채팅 메시지 조회 오류:', error)
    res.status(500).json({ error: '메시지를 불러올 수 없습니다.' })
  }
})

// 새 메시지 이후 가져오기 (폴링용)
router.get('/:channel/messages/after/:id', async (req: Request, res: Response) => {
  try {
    const { channel, id } = req.params

    const messages = await query(
      `SELECT id, channel, author_name, content, created_at
       FROM chat_messages
       WHERE channel = $1 AND id > $2
       ORDER BY id ASC
       LIMIT 100`,
      [channel, Number(id)]
    )

    res.json(messages)
  } catch (error) {
    console.error('❌ 새 메시지 조회 오류:', error)
    res.status(500).json({ error: '메시지를 불러올 수 없습니다.' })
  }
})

// 메시지 전송
router.post('/:channel/messages', async (req: Request, res: Response) => {
  try {
    const { channel } = req.params
    const { author_name, password, content } = req.body

    if (!author_name?.trim() || !password?.trim() || !content?.trim()) {
      return res.status(400).json({ error: '닉네임, 비밀번호, 내용을 모두 입력해주세요.' })
    }

    if (author_name.length > 50) {
      return res.status(400).json({ error: '닉네임은 50자 이내여야 합니다.' })
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: '메시지는 2000자 이내여야 합니다.' })
    }

    const result = await query(
      `INSERT INTO chat_messages (channel, author_name, password, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, channel, author_name, content, created_at`,
      [channel, author_name.trim(), password, content.trim()]
    )

    res.status(201).json(result[0])
  } catch (error) {
    console.error('❌ 메시지 전송 오류:', error)
    res.status(500).json({ error: '메시지를 전송할 수 없습니다.' })
  }
})

// 메시지 삭제 (비밀번호 확인)
router.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id, 10)
    if (!msgId || isNaN(msgId)) {
      return res.status(400).json({ error: '유효하지 않은 메시지 ID입니다.' })
    }

    const { password } = req.body
    if (!password) {
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' })
    }

    const msgs = await query(`SELECT password FROM chat_messages WHERE id = $1`, [msgId])
    if (msgs.length === 0) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' })
    }
    if (msgs[0].password !== password) {
      return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
    }

    await query(`DELETE FROM chat_messages WHERE id = $1`, [msgId])
    res.json({ success: true })
  } catch (error) {
    console.error('❌ 메시지 삭제 오류:', error)
    res.status(500).json({ error: '메시지를 삭제할 수 없습니다.' })
  }
})

// 채널 목록 (메시지가 있는 채널들)
router.get('/channels/list', async (_req: Request, res: Response) => {
  try {
    const channels = await query(
      `SELECT channel, COUNT(*) as message_count,
              MAX(created_at) as last_activity
       FROM chat_messages
       GROUP BY channel
       ORDER BY last_activity DESC`
    )
    res.json(channels)
  } catch (error) {
    console.error('❌ 채널 목록 조회 오류:', error)
    res.status(500).json({ error: '채널 목록을 불러올 수 없습니다.' })
  }
})

export default router


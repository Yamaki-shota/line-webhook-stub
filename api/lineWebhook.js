import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';            // node-fetch を使う

// Supabase 初期化
const supa = createClient(
  process.env.SUPA_URL,
  process.env.SUPA_SERVICE_KEY
);

export default async function handler(req, res) {
  const event = req.body?.events?.[0];
  if (!event) return res.status(200).end();

  /* ── 画像メッセージ ───────────────── */
  if (event.message?.type === 'image') {
    try {
      // 1) LINE から画像取得
      const buffer = await fetch(
        `https://api-data.line.me/v2/bot/message/${event.message.id}/content`,
        { headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}` } }
      ).then(r => r.arrayBuffer());

      // 2) Storage へアップロード
      const fileName = `${Date.now()}_${event.message.id}.jpg`;
      const { error } = await supa
        .storage.from('photos')
        .upload(fileName, buffer, { contentType: 'image/jpeg' });

      // 3) DB visits へ行追加
      if (!error) {
        await supa.from('visits').insert({
          customer_id: 'demo-user',   // 後で QR 連携
          staff_id:    'demo-staff',
          photo_url:   `photos/${fileName}`
        });
      }

      // 4) 返信
      const replyText = error
        ? '写真の保存に失敗しました…'
        : '写真をカルテに保存しました！';

      await replyTextToLine(event.replyToken, replyText);
      return res.status(200).end();
    } catch (e) {
      console.error(e);
      await replyTextToLine(event.replyToken, 'システムエラーで保存できませんでした');
      return res.status(500).end();
    }
  }

  /* ── テキストなど ─────────────────── */
  if (event.message?.text) {
    await replyTextToLine(event.replyToken, `Echo: ${event.message.text}`);
  }

  res.status(200).end();
}

/* ヘルパー：テキスト返信 */
async function replyTextToLine(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }]
    })
  });
}

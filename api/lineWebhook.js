import { createClient } from '@supabase/supabase-js';

// ── Supabase クライアント ─────────────
const supa = createClient(
  process.env.SUPA_URL,
  process.env.SUPA_SERVICE_KEY
);

// ── LINE Webhook ハンドラ ────────────
export default async function handler(req, res) {
  const event = req.body?.events?.[0];
  if (!event) return res.status(200).end();   // 保険

  /* ① 画像メッセージの場合 ─────────── */
  if (event.message?.type === 'image') {
    try {
      // 画像データを LINE から取得
      const imgBuffer = await fetch(
        `https://api-data.line.me/v2/bot/message/${event.message.id}/content`,
        { headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}` } }
      ).then(r => r.arrayBuffer());

      // Supabase Storage にアップロード
      const fileName = `${Date.now()}_${event.message.id}.jpg`;
      const { error } = await supa
        .storage.from('photos')
        .upload(fileName, imgBuffer, { contentType: 'image/jpeg' });

      const replyText = error
        ? '写真の保存に失敗しました…'
        : '写真をカルテに保存しました！';

      // 結果を返信
      await replyTextToLine(event.replyToken, replyText);
      return res.status(200).end();
    } catch (e) {
      console.error(e);
      await replyTextToLine(event.replyToken, 'システムエラーで保存できませんでした');
      return res.status(500).end();
    }
  }

  /* ② テキストなど ──────────────── */
  if (event.message?.text) {
    await replyTextToLine(event.replyToken, `Echo: ${event.message.text}`);
  }

  res.status(200).end();
}

/* ヘルパー関数：テキスト返信 */
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

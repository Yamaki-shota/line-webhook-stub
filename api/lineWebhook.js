export default async function handler(req, res) {
  const event = req.body?.events?.[0];

  // メッセージイベントの時だけ処理
  if (event?.replyToken && event?.message?.text) {
    // 受け取ったテキスト
    const userText = event.message.text;

    // LINE に返信
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: event.replyToken,
        messages: [
          { type: 'text', text: `Echo: ${userText}` }
        ]
      })
    });
  }

  // LINE へ「受け取ったよ」と返す
  res.status(200).end();
}

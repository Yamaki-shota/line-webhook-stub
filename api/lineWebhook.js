export default function handler(req, res) {
  console.log('LINE payload:', req.body);   // ★追加
  res.status(200).send('OK');
}


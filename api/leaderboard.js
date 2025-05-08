import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { distance } = req.query;
  const file = path.join(process.cwd(), 'data', `${distance}.json`);
  
  if (!fs.existsSync(file)) {
    return res.status(400).json({ error: 'Invalid distance' });
  }

  const data = JSON.parse(fs.readFileSync(file));
  data.sort((a, b) => a.time - b.time);
  res.status(200).json(data);
}

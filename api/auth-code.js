import fs from 'fs';
import path from 'path';

const sessionFile = path.join(process.cwd(), 'data', 'session.json');
const validCodes = {
  RUNMILE2025: 'mile',
  RUNHALF2025: 'halfmile',
  RUNQUARTER2025: 'quartermile'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code } = req.body;
  const distance = validCodes[code];
  if (!distance) return res.status(401).json({ success: false });

  const sessions = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile)) : {};
  sessions[distance] = Date.now() + 24 * 60 * 60 * 1000;

  fs.writeFileSync(sessionFile, JSON.stringify(sessions, null, 2));
  res.status(200).json({ success: true, distance });
}

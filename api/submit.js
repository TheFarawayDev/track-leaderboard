import fs from 'fs';
import path from 'path';

const MIN_TIME = { mile: 210, halfmile: 90, quartermile: 40 };
const MAX_TIME = { mile: 900, halfmile: 600, quartermile: 300 };
const sessionFile = path.join(process.cwd(), 'data', 'session.json');

// Get current day in YYYY-MM-DD
const today = () => new Date().toISOString().split('T')[0];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { distance } = req.query;
  const { name, time } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;

  if (!distance || !name || typeof time !== 'number') {
    return res.status(400).json({ message: 'Missing data.' });
  }

  const now = Date.now();
  const sessions = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile)) : {};
  const active = sessions[distance] && now < sessions[distance];
  if (!active) return res.status(403).json({ message: 'Submission not active for this event.' });

  if (time < MIN_TIME[distance] || time > MAX_TIME[distance]) {
    return res.status(400).json({ message: 'Unrealistic time submitted.' });
  }

  const file = path.join(process.cwd(), 'data', `${distance}.json`);
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];

  const todayStr = today();
  const existingName = list.find(entry => entry.name.toLowerCase() === name.toLowerCase());
  const ipMatch = list.find(entry => entry.ip === ip && entry.lastSubmit === todayStr);

  if ((existingName && existingName.lastSubmit === todayStr) || ipMatch) {
    return res.status(429).json({ message: 'You already submitted today.' });
  }

  if (existingName) {
    if (time < existingName.time) {
      existingName.bestTime = existingName.time;
      existingName.time = time;
    } else if (!existingName.bestTime || time < existingName.bestTime) {
      existingName.bestTime = time;
    }
    existingName.lastSubmit = todayStr;
    existingName.ip = ip;
  } else {
    list.push({ name, time, ip, lastSubmit: todayStr });
  }

  fs.writeFileSync(file, JSON.stringify(list, null, 2));
  res.status(200).json({ message: 'Time submitted successfully.' });
}

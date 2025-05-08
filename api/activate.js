let activationState = {
  mile: null,
  half: null,
  quarter: null
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { command } = req.body;
  const now = Date.now();

  // Expire outdated activations
  for (const key in activationState) {
    if (activationState[key] && activationState[key] < now) {
      activationState[key] = null;
    }
  }

  // Handle 2025 commands
  if (command === 'MILE25') {
    activationState.mile = now + 24 * 60 * 60 * 1000;
    return res.status(200).json({ success: true, distance: 'mile' });
  }

  if (command === 'HALF25') {
    activationState.half = now + 24 * 60 * 60 * 1000;
    return res.status(200).json({ success: true, distance: 'half' });
  }

  if (command === 'QUARTER25') {
    activationState.quarter = now + 24 * 60 * 60 * 1000;
    return res.status(200).json({ success: true, distance: 'quarter' });
  }

  return res.status(400).json({ success: false, message: 'Invalid command' });
}

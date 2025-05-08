let activationState = {
  mile: null,
  half: null,
  quarter: null
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { command, cancel } = req.body;
  const now = Date.now();

  // Expire outdated activations
  for (const key in activationState) {
    if (activationState[key] && activationState[key] < now) {
      activationState[key] = null;
    }
  }

  // Cancel early command - reset the activation state for a specific distance
  if (cancel) {
    if (activationState[cancel]) {
      activationState[cancel] = null;
      return res.status(200).json({ success: true, message: `${cancel} activation has been canceled.` });
    } else {
      return res.status(400).json({ success: false, message: `No active ${cancel} activation to cancel.` });
    }
  }

  // Handle activation commands (2025 specific commands)
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

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}/track_times?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const LEADERBOARD_TYPES = {
  MILE: 'mile',
  HALF_MILE: 'half_mile',
  METERS: 'meters', // Combined 400m and 800m
};

// Helper function to determine leaderboard type
const getLeaderboardType = (distance) => {
  if (distance === 'mile') {
    return LEADERBOARD_TYPES.MILE;
  } else if (distance === 'half_mile') {
    return LEADERBOARD_TYPES.HALF_MILE;
  } else if (distance === '400m' || distance === '800m') {
    return LEADERBOARD_TYPES.METERS;
  }
  return null;
};

// Helper function to validate time format (MM:SS.ms)
const isValidTimeFormat = (time) => {
  return /^(\d{1,2}:)?\d{2}\.\d{1,2}$/.test(time);
};

// Helper function to convert time to seconds for comparison
const timeToSeconds = (time) => {
    if (!time) return 0;
    const parts = time.split(':');
    const minutes = parts.length > 1 ? parseInt(parts[0], 10) : 0;
    const secondsAndMs = parts[parts.length - 1].split('.');
    const seconds = parseInt(secondsAndMs[0], 10);
    const milliseconds = parseInt(secondsAndMs[1], 10);
    return (minutes * 60) + seconds + (milliseconds / 100); // Corrected division
};

// Helper function to format time from seconds
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  const wholeSeconds = Math.floor(remainingSeconds);
  const milliseconds = Math.round((remainingSeconds - wholeSeconds) * 100);
  return `${minutes > 0 ? minutes + ':' : ''}${wholeSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

// Helper function to determine if a time is "realistic"
const isRealisticTime = (distance, seconds) => {
  // Define some reasonable bounds (these are rough and can be adjusted)
  const lowerBounds = {
    [LEADERBOARD_TYPES.MILE]: 2 * 60,     // 2:00
    [LEADERBOARD_TYPES.HALF_MILE]: 1 * 60,  // 1:00
    [LEADERBOARD_TYPES.METERS]: {
      '400m': 45, // Roughly 45 seconds
      '800m': 1 * 60 + 40, // 1:40
    },
  };

  if (distance === LEADERBOARD_TYPES.METERS) {
      if (seconds < lowerBounds[LEADERBOARD_TYPES.METERS][distance]) {
          return false;
      }
      return true;
  }
  if (seconds < lowerBounds[distance]) {
    return false;
  }
  return true;
};

// Main handler function for the Vercel API route
module.exports = async (req, res) => {
  try {
    await client.connect();
    const db = client.db('track_times');
    const leaderboardCollection = db.collection('leaderboard');

    if (req.method === 'GET') {
      // Fetch leaderboards
      const mileTimes = await leaderboardCollection.find({ type: LEADERBOARD_TYPES.MILE }).sort({ seconds: 1 }).toArray();
      const halfMileTimes = await leaderboardCollection.find({ type: LEADERBOARD_TYPES.HALF_MILE }).sort({ seconds: 1 }).toArray();
      const meterTimes = await leaderboardCollection.find({ type: LEADERBOARD_TYPES.METERS }).sort({ seconds: 1 }).toArray();

      // Format times for display
      const formatLeaderboard = (results) => results.map(item => ({
        ...item,
        time: formatTime(item.seconds),
        bestTime: item.bestTime ? formatTime(item.bestTime) : undefined, // format bestTime if it exists
      }));

      res.status(200).json({
        mile: formatLeaderboard(mileTimes),
        halfMile: formatLeaderboard(halfMileTimes),
        meters: formatLeaderboard(meterTimes),
      });
    } else if (req.method === 'POST') {
      // Handle submission of new times
      const { name, time, distance } = req.body;

      if (!name || !time || !distance) {
        return res.status(400).json({ error: 'Name, time, and distance are required.' });
      }

      if (!isValidTimeFormat(time)) {
        return res.status(400).json({ error: 'Invalid time format. Use MM:SS.ms or SS.ms' });
      }

      const leaderboardType = getLeaderboardType(distance);
      if (!leaderboardType) {
        return res.status(400).json({ error: 'Invalid distance.' });
      }

      const seconds = timeToSeconds(time);
      if (!isRealisticTime(leaderboardType, seconds)) {
        return res.status(400).json({ error: 'Unrealistic time submitted.' });
      }

        const existingRecord = await leaderboardCollection.findOne({ name, type: leaderboardType });

      if (existingRecord) {
          if (seconds < existingRecord.seconds) {
              // Update with new best time
              await leaderboardCollection.updateOne(
                  { name, type: leaderboardType },
                  { $set: { seconds, time }, $unset: { worstTime: 1 } } // Remove worstTime
              );
              return res.status(200).json({ message: 'Personal best updated!' });
          } else if (seconds > existingRecord.seconds) {
              // Store the "worst" time, and keep bestTime
               await leaderboardCollection.updateOne(
                    { name, type: leaderboardType },
                    {
                        $set: { worstTime: seconds }, // Store worstTime
                        $set: { bestTime: existingRecord.seconds, time: formatTime(existingRecord.seconds)}
                    }
                );
              return res.status(200).json({ message: 'Time added, but not a personal best.' });
          } else {
            return res.status(200).json({ message: 'Time is same as previous entry.' });
          }
      } else {
        // Insert new record
        await leaderboardCollection.insertOne({ name, time, seconds, type: leaderboardType });
        return res.status(201).json({ message: 'Time added to leaderboard.' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed.' });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    await client.close();
  }
};

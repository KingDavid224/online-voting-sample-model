const express = require('express');
const Poll    = require('../models/Poll');
const User    = require('../models/User');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [pollCount, userCount, allPolls] = await Promise.all([
      Poll.countDocuments({ isActive: true }),
      User.countDocuments(),
      Poll.find({}, 'options.votes')
    ]);

    const totalVotes = allPolls.reduce((sum, p) =>
      sum + p.options.reduce((s, o) => s + o.votes, 0), 0);

    res.json({ polls: pollCount, users: userCount, votes: totalVotes });
  } catch {
    res.status(500).json({ polls: 0, users: 0, votes: 0 });
  }
});

module.exports = router;

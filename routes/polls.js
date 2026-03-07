const express    = require('express');
const Poll       = require('../models/Poll');
const User       = require('../models/User');
const authMiddle = require('../middleware/auth');

const router = express.Router();

// ── GET all polls ────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET single poll ──────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    res.json(poll);
  } catch {
    res.status(404).json({ message: 'Poll not found' });
  }
});

// ── POST create poll (admin only) ────────────────
router.post('/', authMiddle, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: 'Admin access required' });

    const { question, options } = req.body;
    if (!question || !options || options.length < 2)
      return res.status(400).json({ message: 'Question and at least 2 options required' });

    const poll = await Poll.create({
      question,
      options: options.map(text => ({ text })),
      createdBy: req.user._id
    });

    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST cast vote ───────────────────────────────
router.post('/:id/vote', authMiddle, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (!poll.isActive) return res.status(400).json({ message: 'This poll is closed' });

    const user = await User.findById(req.user._id);
    if (user.votedPolls.includes(poll._id))
      return res.status(409).json({ message: 'You have already voted on this poll' });

    const { optionId } = req.body;
    const option = poll.options.id(optionId);
    if (!option) return res.status(400).json({ message: 'Invalid option' });

    option.votes += 1;
    await poll.save();

    user.votedPolls.push(poll._id);
    await user.save();

    res.json({ message: 'Vote recorded', poll });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PATCH toggle poll status (admin only) ────────
router.patch('/:id', authMiddle, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: 'Admin access required' });

    const poll = await Poll.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    res.json(poll);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE poll (admin only) ─────────────────────
router.delete('/:id', authMiddle, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: 'Admin access required' });

    await Poll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Poll deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

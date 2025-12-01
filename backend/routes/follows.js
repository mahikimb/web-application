const express = require('express');
const router = express.Router();
const { Follow, User } = require('../models');
const { protect } = require('../middleware/auth');

// @route   POST /api/follows/:farmerId
// @desc    Follow a farmer
// @access  Private (Buyer)
router.post('/:farmerId', protect, async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (String(farmerId) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const farmer = await User.findByPk(farmerId);
    if (!farmer || farmer.role !== 'farmer') {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    const [follow, created] = await Follow.findOrCreate({
      where: {
        followerId: req.user.id,
        followingId: farmerId
      }
    });

    if (!created) {
      return res.status(400).json({ success: false, message: 'Already following this farmer' });
    }

    res.json({ success: true, message: 'Successfully followed farmer', follow });
  } catch (error) {
    console.error('Error following farmer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/follows/:farmerId
// @desc    Unfollow a farmer
// @access  Private (Buyer)
router.delete('/:farmerId', protect, async (req, res) => {
  try {
    const { farmerId } = req.params;

    const follow = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId: farmerId
      }
    });

    if (!follow) {
      return res.status(404).json({ success: false, message: 'Not following this farmer' });
    }

    await follow.destroy();

    res.json({ success: true, message: 'Successfully unfollowed farmer' });
  } catch (error) {
    console.error('Error unfollowing farmer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/follows/following
// @desc    Get farmers user is following
// @access  Private
router.get('/following', protect, async (req, res) => {
  try {
    const follows = await Follow.findAll({
      where: { followerId: req.user.id },
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    res.json({
      success: true,
      count: follows.length,
      farmers: follows.map(f => f.following)
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/follows/check/:farmerId
// @desc    Check if user is following a farmer
// @access  Private
router.get('/check/:farmerId', protect, async (req, res) => {
  try {
    const follow = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.farmerId
      }
    });

    res.json({
      success: true,
      isFollowing: !!follow
    });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Message, User, Order, Product } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', protect, [
  body('receiverId').notEmpty().withMessage('Receiver ID is required'),
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('subject').optional().trim(),
  body('orderId').optional().trim(),
  body('productId').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let { receiverId, message, subject, orderId, productId } = req.body;

    // Normalize optional fields - convert empty strings to null
    orderId = orderId && orderId.trim() !== '' ? orderId.trim() : null;
    productId = productId && productId.trim() !== '' ? productId.trim() : null;
    subject = subject && subject.trim() !== '' ? subject.trim() : null;

    console.log('Received message request:', { receiverId, message: message?.substring(0, 50), subject, orderId, productId, senderId: req.user.id });

    // Check if receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      console.log('Receiver not found:', receiverId);
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    // Prevent sending message to yourself - compare as strings
    const senderIdStr = String(req.user.id);
    const receiverIdStr = String(receiverId);
    if (receiverIdStr === senderIdStr) {
      return res.status(400).json({ success: false, message: 'Cannot send message to yourself' });
    }

    // If orderId is provided, verify the user is part of the order
    if (orderId) {
      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      // Compare as strings for UUID
      const orderBuyerIdStr = String(order.buyerId);
      const orderFarmerIdStr = String(order.farmerId);
      if (orderBuyerIdStr !== senderIdStr && orderFarmerIdStr !== senderIdStr) {
        return res.status(403).json({ success: false, message: 'Not authorized to message about this order' });
      }
      if (orderBuyerIdStr !== receiverIdStr && orderFarmerIdStr !== receiverIdStr) {
        return res.status(400).json({ success: false, message: 'Receiver is not part of this order' });
      }
    }

    // Create message
    try {
      const newMessage = await Message.create({
        senderId: req.user.id,
        receiverId: receiverIdStr,
        message,
        subject: subject || null,
        orderId: orderId || null,
        productId: productId || null
      });

      console.log('Message created successfully:', newMessage.id);

      // Fetch message with populated data
      const populatedMessage = await Message.findByPk(newMessage.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'status'],
            required: false
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      });

      console.log('Message populated successfully');
      res.status(201).json({ success: true, message: populatedMessage });
    } catch (createError) {
      console.error('Error creating message:', createError);
      console.error('Error stack:', createError.stack);
      throw createError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error sending message:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// @route   GET /api/messages/conversations
// @desc    Get all conversations for the current user
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all unique conversation partners
    const conversations = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'status']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Group messages by conversation partner
    const conversationMap = new Map();

    conversations.forEach(msg => {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;

      if (!conversationMap.has(otherUserId)) {
        // Count unread messages
        const unreadCount = conversations.filter(m => 
          (m.senderId === otherUserId && m.receiverId === userId && !m.isRead)
        ).length;

        conversationMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser.name,
          userEmail: otherUser.email,
          lastMessage: msg,
          unreadCount,
          orderId: msg.orderId,
          productId: msg.productId,
          order: msg.order,
          product: msg.product
        });
      } else {
        const conv = conversationMap.get(otherUserId);
        // Update if this is a newer message
        if (new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
          conv.lastMessage = msg;
        }
        // Update unread count
        const unreadCount = conversations.filter(m => 
          (m.senderId === otherUserId && m.receiverId === userId && !m.isRead)
        ).length;
        conv.unreadCount = unreadCount;
      }
    });

    const conversationList = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json({ success: true, conversations: conversationList });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/messages/conversation/:userId
// @desc    Get messages with a specific user
// @access  Private
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Verify the other user exists
    const otherUser = await User.findByPk(userId);
    if (!otherUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get all messages between current user and the other user
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'status']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Mark messages as read
    await Message.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          senderId: userId,
          receiverId: currentUserId,
          isRead: false
        }
      }
    );

    res.json({ success: true, messages, otherUser: { id: otherUser.id, name: otherUser.name, email: otherUser.email } });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/messages/order/:orderId
// @desc    Get messages related to a specific order
// @access  Private
router.get('/order/:orderId', protect, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order exists and user is part of it
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.buyerId !== req.user.id && order.farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view messages for this order' });
    }

    const messages = await Message.findAll({
      where: { orderId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'status']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Mark messages as read
    await Message.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          orderId,
          receiverId: req.user.id,
          isRead: false
        }
      }
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/messages/unread-count
// @desc    Get unread message count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const unreadCount = await Message.count({
      where: {
        receiverId: req.user.id,
        isRead: false
      }
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark a message as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.receiverId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to mark this message as read' });
    }

    await message.update({
      isRead: true,
      readAt: new Date()
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;


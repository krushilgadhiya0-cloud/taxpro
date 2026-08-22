import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /api/chat/contacts
 * Returns all active members (team_members + users) with last message preview and unread status.
 */
router.get('/contacts', async (req, res) => {
  const { currentUserEmail = '' } = req.query;

  try {
    // 1. Fetch team members
    const tmRes = await query(`
      SELECT id, name, email, role, department, status, online, avatar, created_at 
      FROM team_members 
      ORDER BY name ASC
    `);

    // 2. Fetch users
    const uRes = await query(`
      SELECT id, name, email, role, created_at 
      FROM users 
      ORDER BY name ASC
    `);

    const contactMap = new Map();

    // Helper to calculate initials
    const getInitials = (name) => {
      if (!name) return 'TM';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Add registered users
    uRes.rows.forEach(u => {
      const email = (u.email || '').toLowerCase().trim();
      if (!email) return;
      contactMap.set(email, {
        id: u.id || `USR-${email}`,
        name: u.name || email.split('@')[0],
        email: email,
        role: u.role || 'Member',
        department: 'Management',
        status: 'Active',
        online: true,
        avatar: getInitials(u.name || email),
        source: 'user'
      });
    });

    // Add / overwrite with team_members for detailed department/status
    tmRes.rows.forEach(tm => {
      const email = (tm.email || '').toLowerCase().trim();
      if (!email) return;
      contactMap.set(email, {
        id: tm.id || `TM-${email}`,
        name: tm.name || email.split('@')[0],
        email: email,
        role: tm.role || 'Employee',
        department: tm.department || 'General',
        status: tm.status || 'Active',
        online: tm.online !== false,
        avatar: tm.avatar || getInitials(tm.name || email),
        source: 'team_member'
      });
    });

    const contactList = Array.from(contactMap.values());

    // 3. Fetch latest messages for each contact if currentUserEmail is provided
    const curEmail = (currentUserEmail || '').toLowerCase().trim();
    if (curEmail) {
      try {
        const lastMsgRes = await query(`
          SELECT sender_id, receiver_id, content, created_at, read
          FROM private_messages
          WHERE LOWER(sender_id) = $1 OR LOWER(receiver_id) = $1
          ORDER BY created_at DESC
        `, [curEmail]);

        const latestPerContact = {};
        const unreadCounts = {};

        lastMsgRes.rows.forEach(m => {
          const s = (m.sender_id || '').toLowerCase().trim();
          const r = (m.receiver_id || '').toLowerCase().trim();
          const other = s === curEmail ? r : s;

          if (!latestPerContact[other]) {
            latestPerContact[other] = {
              text: m.content,
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: m.created_at
            };
          }

          if (r === curEmail && !m.read) {
            unreadCounts[s] = (unreadCounts[s] || 0) + 1;
          }
        });

        contactList.forEach(c => {
          const email = c.email.toLowerCase();
          c.lastMessage = latestPerContact[email] || null;
          c.unreadCount = unreadCounts[email] || 0;
        });
      } catch (err) {
        console.warn('[Chat] Failed to compute last message preview:', err.message);
      }
    }

    res.json({ success: true, contacts: contactList });
  } catch (error) {
    console.error('[Chat Contacts Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/chat/private
 * Returns chat history between two participants
 */
router.get('/private', async (req, res) => {
  const { user1 = '', user2 = '' } = req.query;
  const u1 = (user1 || '').toLowerCase().trim();
  const u2 = (user2 || '').toLowerCase().trim();

  if (!u1 || !u2) {
    return res.status(400).json({ success: false, error: 'Both user1 and user2 query parameters are required.' });
  }

  try {
    const result = await query(`
      SELECT id, sender_id, sender_name, receiver_id, receiver_name, content, read, created_at
      FROM private_messages
      WHERE (LOWER(sender_id) = $1 AND LOWER(receiver_id) = $2)
         OR (LOWER(sender_id) = $2 AND LOWER(receiver_id) = $1)
      ORDER BY created_at ASC
    `, [u1, u2]);

    const formattedMessages = result.rows.map(row => ({
      id: row.id,
      text: row.content,
      senderId: row.sender_id,
      senderName: row.sender_name,
      receiverId: row.receiver_id,
      receiverName: row.receiver_name,
      isMe: (row.sender_id || '').toLowerCase().trim() === u1,
      time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: row.created_at,
      read: row.read
    }));

    // Mark unread messages as read
    await query(`
      UPDATE private_messages
      SET read = TRUE, updated_at = NOW()
      WHERE LOWER(sender_id) = $2 AND LOWER(receiver_id) = $1 AND read = FALSE
    `, [u1, u2]);

    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error('[Chat Private Fetch Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/chat/private
 * Sends a private message and persists into PostgreSQL SQL
 */
router.post('/private', async (req, res) => {
  const { sender_id, sender_name, receiver_id, receiver_name, content } = req.body;

  if (!sender_id || !receiver_id || !content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'sender_id, receiver_id and content are required.' });
  }

  const msgId = `PMSG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanContent = content.trim();

  try {
    const insertRes = await query(`
      INSERT INTO private_messages (id, sender_id, sender_name, receiver_id, receiver_name, content, read, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW(), NOW())
      RETURNING *
    `, [
      msgId,
      sender_id.trim(),
      sender_name || sender_id,
      receiver_id.trim(),
      receiver_name || receiver_id,
      cleanContent
    ]);

    const saved = insertRes.rows[0];
    res.json({
      success: true,
      message: {
        id: saved.id,
        text: saved.content,
        senderId: saved.sender_id,
        senderName: saved.sender_name,
        receiverId: saved.receiver_id,
        receiverName: saved.receiver_name,
        isMe: true,
        time: new Date(saved.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: saved.created_at,
        read: saved.read
      }
    });
  } catch (error) {
    console.error('[Chat Private Send Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/chat/broadcast
 * Returns global broadcast team messages
 */
router.get('/broadcast', async (req, res) => {
  const { channel = 'general-hq', currentUserEmail = '' } = req.query;
  const curEmail = (currentUserEmail || '').toLowerCase().trim();

  try {
    const result = await query(`
      SELECT id, sender_id, sender_name, sender_avatar, content, channel, created_at
      FROM broadcast_messages
      WHERE channel = $1
      ORDER BY created_at ASC
    `, [channel]);

    const messages = result.rows.map(row => ({
      id: row.id,
      text: row.content,
      senderId: row.sender_avatar || (row.sender_name ? row.sender_name.substring(0, 2).toUpperCase() : 'TM'),
      senderEmail: row.sender_id,
      senderName: row.sender_name,
      channel: row.channel,
      isMe: curEmail && (row.sender_id || '').toLowerCase().trim() === curEmail,
      time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: row.created_at
    }));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('[Broadcast Messages Fetch Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/chat/broadcast
 * Posts a message to the team-wide broadcast channel
 */
router.post('/broadcast', async (req, res) => {
  const { sender_id, sender_name, sender_avatar, content, channel = 'general-hq' } = req.body;

  if (!sender_id || !content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'sender_id and content are required.' });
  }

  const msgId = `BMSG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanContent = content.trim();

  try {
    const insertRes = await query(`
      INSERT INTO broadcast_messages (id, sender_id, sender_name, sender_avatar, content, channel, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [
      msgId,
      sender_id.trim(),
      sender_name || 'Team Member',
      sender_avatar || (sender_name ? sender_name.substring(0, 2).toUpperCase() : 'TM'),
      cleanContent,
      channel
    ]);

    const saved = insertRes.rows[0];
    res.json({
      success: true,
      message: {
        id: saved.id,
        text: saved.content,
        senderId: saved.sender_avatar,
        senderEmail: saved.sender_id,
        senderName: saved.sender_name,
        channel: saved.channel,
        isMe: true,
        time: new Date(saved.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: saved.created_at
      }
    });
  } catch (error) {
    console.error('[Broadcast Message Send Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

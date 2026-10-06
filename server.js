require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const User = require('./models/User');
const Event = require('./models/Event');
const Comment = require('./models/Comment');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
let isMongoConnected = false;

// In-Memory Fallback State (No fake demo profiles, only real registered users & events)
const inMemory = {
  users: [
    { name: "Gaurang", email: "gaurang@example.com", password: "password123", interests: ["🎵 Music", "🎬 Movies"] }
  ],
  events: [],
  comments: [],
  messages: []
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Seed Database (Creates default admin user if empty, NO fake demo profiles or events)
const seedDatabase = async () => {
  if (!isMongoConnected) return;
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany(inMemory.users);
      console.log('Database initialized successfully with real user accounts!');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// ================= SOCKET.IO LIVE REAL-TIME CHAT =================
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to live chat: ${socket.id}`);

  socket.on('request_messages', async () => {
    try {
      let history = [];
      if (isMongoConnected) {
        history = await Message.find().sort({ createdAt: 1 });
      } else {
        history = inMemory.messages;
      }
      socket.emit('initial_messages', history);
    } catch (err) {
      console.error('Error fetching chat history for socket:', err);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { senderName, text } = data;
      if (!text || !text.trim()) return;

      let newMessage;
      if (isMongoConnected) {
        newMessage = await Message.create({
          senderName: senderName || 'Anonymous',
          text: text.trim()
        });
      } else {
        newMessage = {
          senderName: senderName || 'Anonymous',
          text: text.trim(),
          createdAt: new Date()
        };
        inMemory.messages.push(newMessage);
      }

      io.emit('receive_message', newMessage);
    } catch (err) {
      console.error('Socket send_message error:', err);
    }
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ================= REST API ROUTES =================

// 1. Auth / Login Route (Registers real user in database)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please fill all fields.' });
    }

    if (isMongoConnected) {
      let user = await User.findOne({ name });
      if (!user) {
        user = await User.create({ name, email, password, interests: ["🎵 Music", "🎬 Movies"] });
      }
      return res.json({ success: true, message: 'Login successful!', user });
    } else {
      let user = inMemory.users.find(u => u.name.toLowerCase() === name.toLowerCase());
      if (!user) {
        user = { name, email, password, interests: ["🎵 Music", "🎬 Movies"] };
        inMemory.users.push(user);
      }
      return res.json({ success: true, message: 'Login successful!', user });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Categories Endpoint
app.get('/api/categories', async (req, res) => {
  try {
    const defaultCategories = [
      { name: "Music", emoji: "🎵" },
      { name: "Food", emoji: "🍔" },
      { name: "Sports", emoji: "⚽" },
      { name: "Technology", emoji: "💻" },
      { name: "Movies", emoji: "🎬" },
      { name: "Art", emoji: "🎨" }
    ];

    let eventsList = [];
    if (isMongoConnected) {
      eventsList = await Event.find({}, 'category emoji');
    } else {
      eventsList = inMemory.events;
    }

    const categoriesMap = new Map();
    defaultCategories.forEach(c => categoriesMap.set(c.name, c.emoji));
    eventsList.forEach(e => {
      if (e.category && !categoriesMap.has(e.category)) {
        categoriesMap.set(e.category, e.emoji || "📅");
      }
    });

    const categories = Array.from(categoriesMap.entries()).map(([name, emoji]) => ({ name, emoji }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Events
app.get('/api/events', async (req, res) => {
  try {
    const { search, category } = req.query;

    if (isMongoConnected) {
      let query = {};
      if (category && category !== 'All') query.category = category;
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { name: searchRegex },
          { location: searchRegex },
          { category: searchRegex },
          { description: searchRegex }
        ];
      }
      const events = await Event.find(query).sort({ id: 1 });
      return res.json(events);
    } else {
      let filtered = inMemory.events;
      if (category && category !== 'All') {
        filtered = filtered.filter(e => e.category === category);
      }
      if (search && search.trim() !== '') {
        const s = search.toLowerCase();
        filtered = filtered.filter(e =>
          e.name.toLowerCase().includes(s) ||
          e.location.toLowerCase().includes(s) ||
          e.category.toLowerCase().includes(s) ||
          e.description.toLowerCase().includes(s)
        );
      }
      return res.json(filtered);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    if (isMongoConnected) {
      const event = await Event.findOne({ id: eventId });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      const comments = await Comment.find({ eventId }).sort({ createdAt: 1 });
      return res.json({ event, comments });
    } else {
      const event = inMemory.events.find(e => e.id === eventId);
      if (!event) return res.status(404).json({ error: 'Event not found' });
      const comments = inMemory.comments.filter(c => c.eventId === eventId);
      return res.json({ event, comments });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Real Attendees Profiles for an Event
app.get('/api/events/:id/people', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    let event;
    if (isMongoConnected) {
      event = await Event.findOne({ id: eventId });
    } else {
      event = inMemory.events.find(e => e.id === eventId);
    }

    if (!event) return res.status(404).json({ error: 'Event not found' });

    let attendeesProfiles = [];
    for (let name of (event.people || [])) {
      let userObj;
      if (isMongoConnected) {
        userObj = await User.findOne({ name });
      } else {
        userObj = inMemory.users.find(u => u.name.toLowerCase() === name.toLowerCase());
      }

      if (userObj) {
        attendeesProfiles.push({
          name: userObj.name,
          email: userObj.email,
          interests: userObj.interests || []
        });
      } else {
        attendeesProfiles.push({
          name: name,
          interests: []
        });
      }
    }

    res.json({ event, attendees: attendeesProfiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Create Event (User Created Event - Only Real Creator Added)
app.post('/api/events', async (req, res) => {
  try {
    const { name, date, time, location, category, customCategory, emojiInput, description, creatorName } = req.body;
    if (!name || !date || !time || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let finalCategory = (category === 'Custom' || category === 'Other') ? (customCategory ? customCategory.trim() : 'General') : (category || 'General');

    let image = "images/hero.jpg";
    let emoji = emojiInput ? emojiInput.trim() : "📅";

    if (finalCategory === "Music") { if (!emojiInput) emoji = "🎵"; }
    else if (finalCategory === "Food") { if (!emojiInput) emoji = "🍔"; }
    else if (finalCategory === "Sports") { if (!emojiInput) emoji = "⚽"; }
    else if (finalCategory === "Movies") { if (!emojiInput) emoji = "🎬"; }
    else if (finalCategory === "Art") { if (!emojiInput) emoji = "🎨"; }
    else if (finalCategory === "Technology") { if (!emojiInput) emoji = "💻"; }

    let attendees = creatorName ? [creatorName] : [];

    if (isMongoConnected) {
      const maxEvent = await Event.findOne().sort({ id: -1 });
      const nextId = maxEvent ? maxEvent.id + 1 : 1;

      const newEvent = await Event.create({
        id: nextId,
        name,
        date,
        time,
        location,
        category: finalCategory,
        emoji,
        image,
        description: description || 'Join this exciting event.',
        people: attendees
      });
      return res.json({ success: true, event: newEvent });
    } else {
      const nextId = inMemory.events.length > 0 ? Math.max(...inMemory.events.map(e => e.id)) + 1 : 1;
      const newEvent = {
        id: nextId,
        name,
        date,
        time,
        location,
        category: finalCategory,
        emoji,
        image,
        description: description || 'Join this exciting event.',
        people: attendees
      };
      inMemory.events.push(newEvent);
      return res.json({ success: true, event: newEvent });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Join Event (Adds Real Logged-In User to Event Attendees)
app.post('/api/events/:id/join', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { userName } = req.body;

    if (!userName) return res.status(400).json({ error: 'User name is required' });

    if (isMongoConnected) {
      const event = await Event.findOne({ id: eventId });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      let alreadyJoined = false;
      if (!event.people.includes(userName)) {
        event.people.push(userName);
        await event.save();
      } else {
        alreadyJoined = true;
      }
      return res.json({ success: true, alreadyJoined, event });
    } else {
      const event = inMemory.events.find(e => e.id === eventId);
      if (!event) return res.status(404).json({ error: 'Event not found' });
      let alreadyJoined = false;
      if (!event.people.includes(userName)) {
        event.people.push(userName);
      } else {
        alreadyJoined = true;
      }
      return res.json({ success: true, alreadyJoined, event });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Comments Routes
app.get('/api/events/:id/comments', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (isMongoConnected) {
      const comments = await Comment.find({ eventId }).sort({ createdAt: 1 });
      return res.json(comments);
    } else {
      const comments = inMemory.comments.filter(c => c.eventId === eventId);
      return res.json(comments);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/comments', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { userName, text } = req.body;

    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

    if (isMongoConnected) {
      const newComment = await Comment.create({ eventId, userName: userName || 'Anonymous', text: text.trim() });
      return res.json({ success: true, comment: newComment });
    } else {
      const newComment = { eventId, userName: userName || 'Anonymous', text: text.trim(), createdAt: new Date() };
      inMemory.comments.push(newComment);
      return res.json({ success: true, comment: newComment });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Group Chat REST fallback
app.get('/api/messages', async (req, res) => {
  try {
    if (isMongoConnected) {
      const messages = await Message.find().sort({ createdAt: 1 });
      return res.json(messages);
    } else {
      return res.json(inMemory.messages);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Profile & Interests Routes
app.get('/api/profile/:name', async (req, res) => {
  try {
    const name = req.params.name;
    if (isMongoConnected) {
      let user = await User.findOne({ name });
      if (!user) user = { name, interests: ["🎵 Music", "🎬 Movies"] };
      return res.json(user);
    } else {
      let user = inMemory.users.find(u => u.name.toLowerCase() === name.toLowerCase());
      if (!user) user = { name, interests: ["🎵 Music", "🎬 Movies"] };
      return res.json(user);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile/interests', async (req, res) => {
  try {
    const { userName, interests } = req.body;
    if (!userName) return res.status(400).json({ error: 'User name is required' });

    if (isMongoConnected) {
      let user = await User.findOne({ name: userName });
      if (user) {
        user.interests = interests || [];
        await user.save();
      } else {
        user = await User.create({
          name: userName,
          email: `${userName.toLowerCase()}@example.com`,
          password: 'password123',
          interests: interests || []
        });
      }
      return res.json({ success: true, interests: user.interests });
    } else {
      let user = inMemory.users.find(u => u.name.toLowerCase() === userName.toLowerCase());
      if (user) {
        user.interests = interests || [];
      } else {
        user = { name: userName, email: `${userName.toLowerCase()}@example.com`, password: 'password123', interests: interests || [] };
        inMemory.users.push(user);
      }
      return res.json({ success: true, interests: user.interests });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const startServer = async () => {
  isMongoConnected = await connectDB();
  if (isMongoConnected) {
    await seedDatabase();
  }
  server.listen(PORT, () => {
    console.log(`🚀 Vibe Together Server running with real user profiles at http://localhost:${PORT}`);
    console.log(`📦 Database Mode: ${isMongoConnected ? 'MongoDB Connected' : 'In-Memory Store'}`);
  });
};

startServer();

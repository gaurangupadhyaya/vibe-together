require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');
const fs = require('fs');
let embeddedImages = {};
try {
  embeddedImages = require('./embedded_images');
} catch (e) {
  console.log('Notice: ./embedded_images.js not present, using SVG vector fallbacks.');
}

// Fix Windows/Linux DNS SRV lookup restriction
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('DNS setServers notice:', e.message);
}

// Database Connection Handler (Self-contained for zero deployment errors)
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vibe_together';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB Connected successfully to: ${uri.replace(/:([^@]+)@/, ':****@')}`);
    return true;
  } catch (err) {
    console.warn(`⚠️ Warning: Could not connect to MongoDB daemon at ${uri.replace(/:([^@]+)@/, ':****@')}.`);
    console.warn(`Details: ${err.message}`);
    console.warn(`Running server with in-memory Mongo mock store for seamless development...`);
    return false;
  }
};

// ================= MONGOOSE SCHEMAS =================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  interests: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  emoji: { type: String, default: '📅' },
  image: { type: String, default: 'images/hero.jpg' },
  description: { type: String, default: '' },
  people: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  userName: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  senderName: { type: String, default: 'Anonymous' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// ================= EXPRESS & SOCKET.IO SETUP =================
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

// Serve images with disk check first, then exact base64 real image, then SVG fallback
app.get('/images/:name', (req, res) => {
  const rawName = req.params.name || '';
  const imageName = rawName.toLowerCase();
  const imagePath = path.join(__dirname, 'images', rawName);

  // 1. Physical disk file check (if images/ folder exists)
  if (fs.existsSync(imagePath)) {
    return res.sendFile(imagePath);
  }

  // 2. Exact Real Image base64 fallback from embedded_images.js
  if (typeof embeddedImages.getImageBase64 === 'function') {
    const base64Data = embeddedImages.getImageBase64(rawName);
    if (base64Data) {
      const contentType = imageName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const imgBuffer = Buffer.from(base64Data, 'base64');
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': imgBuffer.length
      });
      return res.end(imgBuffer);
    }
  }

  // 3. Branded SVG Vector fallback
  let title = "Vibe Together 🎉";
  if (imageName.includes('music')) title = "🎵 Music & Live Beats";
  else if (imageName.includes('food')) title = "🍔 Food & Boba Meetup";
  else if (imageName.includes('sports')) title = "⚽ Sports & Fitness";
  else if (imageName.includes('movie')) title = "🎬 Movie & Film Night";
  else if (imageName.includes('art')) title = "🎨 Art & Design Workshop";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
    <defs>
      <linearGradient id="vibeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF7E5F;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FEB47B;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#vibeGrad)"/>
    <circle cx="400" cy="200" r="140" fill="rgba(255,255,255,0.12)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#FFFFFF" font-weight="bold">${title}</text>
  </svg>`;
  res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
  return res.end(svg);
});

app.use(express.static(path.join(__dirname)));

// Seed Database (Creates default admin user if empty)
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

// 1. Auth / Signup Route (Creates new user account in database)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, interests } = req.body;
    const rawName = (name || '').trim();
    const rawEmail = (email || '').trim();
    
    if (!rawName || !password) {
      return res.status(400).json({ error: 'Please enter Name, Email, and Password.' });
    }

    const userEmail = rawEmail || `${rawName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const initialInterests = (Array.isArray(interests) && interests.length > 0) ? interests : ["🎵 Music", "🎬 Movies"];

    if (isMongoConnected) {
      let existingUser = await User.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { email: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ]
      });

      if (existingUser) {
        return res.status(400).json({ error: 'An account with this Name or Email already exists! Please click "Log In".' });
      }

      const newUser = await User.create({ name: rawName, email: userEmail, password, interests: initialInterests });
      console.log(`✨ New user signed up: ${rawName}`);
      return res.json({ success: true, message: 'Account created successfully! Please log in now.', user: newUser });
    } else {
      let existingUser = inMemory.users.find(u => u.name.toLowerCase() === rawName.toLowerCase() || u.email.toLowerCase() === userEmail.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this Name or Email already exists! Please click "Log In".' });
      }

      const newUser = { name: rawName, email: userEmail, password, interests: initialInterests };
      inMemory.users.push(newUser);
      console.log(`✨ New user signed up in memory: ${rawName}`);
      return res.json({ success: true, message: 'Account created successfully! Please log in now.', user: newUser });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Auth / Login Route (Strict Login: Requires user to Sign Up first if account not found)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { loginInput, name, email, password } = req.body;
    const rawIdentifier = (loginInput || name || email || '').trim();
    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'Please enter your Name or Email, and Password.' });
    }

    const identifier = rawIdentifier.toLowerCase();

    if (isMongoConnected) {
      let user = await User.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { email: { $regex: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ]
      });

      if (!user) {
        return res.status(400).json({ error: 'Account not found! Please click "Sign Up" tab first to create your account.' });
      }

      if (user.password !== password) {
        return res.status(400).json({ error: 'Incorrect password. Please try again.' });
      }

      return res.json({ success: true, message: 'Login successful!', user });
    } else {
      let user = inMemory.users.find(u => u.name.toLowerCase() === identifier || u.email.toLowerCase() === identifier);

      if (!user) {
        return res.status(400).json({ error: 'Account not found! Please click "Sign Up" tab first to create your account.' });
      }

      if (user.password !== password) {
        return res.status(400).json({ error: 'Incorrect password. Please try again.' });
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

// 6. Create Event (User Created Event)
app.post('/api/events', async (req, res) => {
  try {
    const { name, date, time, location, category, customCategory, emojiInput, description, creatorName, peopleCount } = req.body;
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

    const targetCount = parseInt(peopleCount, 10) || 1;
    const defaultMembers = ["Aarav", "Meera", "Riya", "Kabir"];
    let attendees = creatorName ? [creatorName] : [];

    for (let i = 0; attendees.length < targetCount; i++) {
      let memberName = defaultMembers[i] || `Member ${attendees.length + 1}`;
      if (!attendees.includes(memberName)) {
        attendees.push(memberName);
      }
    }

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

// 7. Join Event
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
    console.log(`🚀 Vibe Together Server running at http://localhost:${PORT}`);
    console.log(`📦 Database Mode: ${isMongoConnected ? 'MongoDB Connected' : 'In-Memory Store'}`);
  });
};

startServer();

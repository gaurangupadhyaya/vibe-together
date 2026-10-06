/* ==========================================================================
   VIBE TOGETHER - CONCISE & CLEAN FRONTEND CORE (VANILLA JS)
   ========================================================================== */

// --- Central Application State ---
const state = {
  user: {
    name: 'Alex Rivera',
    major: 'Computer Science \'27',
    bio: 'Passionate about web dev, indie coffee, acoustic music & hiking!',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    interests: ['Coding', 'Music', 'Coffee', 'Outdoors'],
    badge: 'Master Connector 🌟',
    joined: [1] // Joined Event IDs
  },

  events: [
    {
      id: 1,
      title: 'Sunset Acoustic Jam & Coffee Social',
      category: 'Music',
      date: 'Tomorrow, Sep 8 • 6:30 PM',
      location: 'Campus Quad Lawn',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      description: 'Bring guitars, ukuleles, or good vibes! We chill on the quad lawn as the sun goes down.',
      host: 'Maya Chen',
      goingCount: 12
    },
    {
      id: 2,
      title: 'Campus Hackathon & Pizza Night',
      category: 'Tech',
      date: 'Friday, Sep 11 • 5:00 PM',
      location: 'Engineering Lab 204',
      image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',
      description: 'Build mini-projects or apps in 5 hours! Beginner friendly with free pizza & swag.',
      host: 'Liam Patel',
      goingCount: 24
    },
    {
      id: 3,
      title: 'Board Games & Boba Social',
      category: 'Gaming',
      date: 'Saturday, Sep 12 • 3:00 PM',
      location: 'Student Union Lounge',
      image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=600&q=80',
      description: 'Play Catan, Secret Hitler, and Codenames while enjoying fresh boba tea.',
      host: 'Marcus Vance',
      goingCount: 18
    },
    {
      id: 4,
      title: 'Weekend Trail Hike & Photo Walk',
      category: 'Outdoors',
      date: 'Sunday, Sep 13 • 9:00 AM',
      location: 'Pine Ridge Trailhead',
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80',
      description: 'Scenic 4-mile loop hike with panoramic summit views. Carpool departs at 8:45 AM.',
      host: 'Zoe Taylor',
      goingCount: 15
    }
  ],

  people: [
    { name: 'Maya Chen', major: 'Music \'26', bio: 'Acoustic guitar player & coffee fan.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', tags: ['Music', 'Coffee'] },
    { name: 'Marcus Vance', major: 'Business \'25', bio: 'Board gamer & entrepreneur.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', tags: ['Gaming', 'Boba'] },
    { name: 'Sophia Rodriguez', major: 'Design \'26', bio: 'UI/UX painter & photographer.', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', tags: ['Arts', 'UI/UX'] },
    { name: 'Liam Patel', major: 'CompEng \'26', bio: 'Python fan & hackathon builder.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', tags: ['Coding', 'Tech'] }
  ],

  chats: {
    '#general': [
      { author: 'Maya Chen', text: 'Excited for tomorrow’s Sunset Acoustic Jam! 🎸', time: '2:15 PM' },
      { author: 'Marcus Vance', text: 'I will bring extra boba drinks if anyone wants! 🧋', time: '2:18 PM' },
      { author: 'Alex Rivera', text: 'Awesome! I will bring my guitar and song sheets.', time: '2:20 PM', isSent: true }
    ],
    'Maya Chen': [
      { author: 'Maya Chen', text: 'Hi Alex! Saw you joined the acoustic event!', time: 'Yesterday' },
      { author: 'Alex Rivera', text: 'Hey Maya! Yes, super excited!', time: 'Yesterday', isSent: true }
    ]
  },

  activeChatKey: '#general'
};

// --- Toast Notification Helper ---
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--primary)"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// --- Hash Router ---
function navigate() {
  const hash = window.location.hash || '#home';
  const main = document.getElementById('app-content');
  
  // Highlight active navbar link
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  if (hash.startsWith('#events')) {
    setActiveNav('nav-events');
    renderEvents(main);
  } else if (hash.startsWith('#event-detail')) {
    setActiveNav('nav-events');
    const id = parseInt(new URLSearchParams(hash.split('?')[1]).get('id')) || 1;
    renderEventDetail(main, id);
  } else if (hash.startsWith('#people')) {
    setActiveNav('nav-people');
    renderPeople(main);
  } else if (hash.startsWith('#chat')) {
    setActiveNav('nav-chat');
    renderChat(main);
  } else if (hash.startsWith('#profile')) {
    setActiveNav('nav-profile');
    renderProfile(main);
  } else {
    setActiveNav('nav-home');
    renderHome(main);
  }
}

function setActiveNav(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// --- 1. Home View ---
function renderHome(container) {
  container.innerHTML = `
    <section class="hero-section">
      <div class="container">
        <div class="hero-badge"><i class="fa-solid fa-sparkles"></i> College Event Platform</div>
        <h1 class="hero-title">Discover Events. Join the Tribe. <span class="hero-gradient-text">Vibe Together.</span></h1>
        <p class="hero-subtitle">Find student jams, hackathons, and hiking meetups near campus.</p>
        <div class="hero-cta-group">
          <a href="#events" class="btn btn-primary btn-lg"><i class="fa-solid fa-compass"></i> Explore Events</a>
          <a href="#people" class="btn btn-secondary btn-lg"><i class="fa-solid fa-users"></i> Find People</a>
        </div>
      </div>
    </section>

    <section class="container">
      <div class="section-header">
        <h2><i class="fa-solid fa-bolt"></i> Trending Events</h2>
        <a href="#events" class="btn btn-outline btn-sm">View All</a>
      </div>
      <div class="events-grid">
        ${state.events.slice(0, 3).map(e => createCardHTML(e)).join('')}
      </div>
    </section>
  `;
}

// --- Event Card Component ---
function createCardHTML(e) {
  const isJoined = state.user.joined.includes(e.id);
  return `
    <div class="event-card">
      <div class="event-thumb">
        <img src="${e.image}" alt="${e.title}">
        <span class="category-tag">${e.category}</span>
      </div>
      <div class="event-body">
        <div class="event-date"><i class="fa-solid fa-calendar"></i> ${e.date}</div>
        <a href="#event-detail?id=${e.id}" class="event-title">${e.title}</a>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;"><i class="fa-solid fa-location-dot"></i> ${e.location}</p>
        <div class="event-footer">
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">+${e.goingCount} Going</span>
          <button class="btn ${isJoined ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleRSVP(${e.id})">
            ${isJoined ? '✓ Joined' : '+ Join'}
          </button>
        </div>
      </div>
    </div>
  `;
}

// --- 2. Events Discovery View ---
function renderEvents(container) {
  container.innerHTML = `
    <div class="container" style="padding-top:2rem;">
      <div class="section-header">
        <h1><i class="fa-solid fa-calendar-days"></i> Discover Events</h1>
        <button class="btn btn-primary" onclick="openModal('modal-create-event')">+ Host Event</button>
      </div>
      <div class="events-grid">
        ${state.events.map(e => createCardHTML(e)).join('')}
      </div>
    </div>
  `;
}

// --- 3. Event Detail View ---
function renderEventDetail(container, id) {
  const e = state.events.find(evt => evt.id === id) || state.events[0];
  const isJoined = state.user.joined.includes(e.id);

  container.innerHTML = `
    <div class="container" style="padding-top:2rem;">
      <div class="detail-banner">
        <img src="${e.image}">
        <div class="banner-overlay">
          <div>
            <span class="category-tag">${e.category}</span>
            <h1>${e.title}</h1>
            <p><i class="fa-solid fa-calendar"></i> ${e.date} • <i class="fa-solid fa-location-dot"></i> ${e.location}</p>
          </div>
        </div>
      </div>
      <div class="detail-layout">
        <div class="detail-card">
          <h3>About Event</h3>
          <p style="color:var(--text-muted); margin-top:0.5rem;">${e.description}</p>
          <p style="margin-top:1rem; font-weight:600;">Host: ${e.host}</p>
        </div>
        <div class="detail-card">
          <h3>RSVP</h3>
          <button class="btn ${isJoined ? 'btn-secondary' : 'btn-primary'} btn-lg" style="width:100%; margin-top:1rem;" onclick="toggleRSVP(${e.id})">
            ${isJoined ? 'You\'re Going! ✓' : 'Join Event'}
          </button>
          <a href="#chat" class="btn btn-outline btn-lg" style="width:100%; margin-top:0.5rem;">Open Chat</a>
        </div>
      </div>
    </div>
  `;
}

// --- 4. Find People View ---
function renderPeople(container) {
  container.innerHTML = `
    <div class="container" style="padding-top:2rem;">
      <div class="section-header">
        <h1><i class="fa-solid fa-users"></i> Find People</h1>
      </div>
      <div class="people-grid">
        ${state.people.map(p => `
          <div class="person-card">
            <img src="${p.avatar}" class="person-avatar">
            <h3>${p.name}</h3>
            <p class="person-major">${p.major}</p>
            <p class="person-bio">${p.bio}</p>
            <a href="#chat" class="btn btn-primary btn-sm" onclick="state.activeChatKey='${p.name}'">Message</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// --- 5. Chat View ---
function renderChat(container) {
  const activeKey = state.activeChatKey;
  const msgs = state.chats[activeKey] || [];

  container.innerHTML = `
    <div class="container" style="padding-top:2rem;">
      <div class="chat-layout">
        <div class="chat-sidebar">
          <div class="chat-sidebar-header"><h4>Conversations</h4></div>
          <div class="chat-section-title">Channels</div>
          <ul class="channel-list">
            <li class="channel-item ${activeKey==='#general'?'active':''}" onclick="switchChat('#general')">#general</li>
          </ul>
          <div class="chat-section-title">Direct Messages</div>
          <ul class="dm-list">
            ${state.people.map(p => `
              <li class="channel-item ${activeKey===p.name?'active':''}" onclick="switchChat('${p.name}')">${p.name}</li>
            `).join('')}
          </ul>
        </div>
        <div class="chat-main">
          <div class="chat-header"><h3>${activeKey}</h3></div>
          <div class="chat-messages" id="msg-box">
            ${msgs.map(m => `
              <div class="message-bubble ${m.isSent?'sent':''}">
                <div class="msg-text"><strong>${m.author}:</strong> ${m.text}</div>
              </div>
            `).join('')}
          </div>
          <form class="chat-input-bar" onsubmit="sendChat(event)">
            <input type="text" id="chat-input" class="chat-input" placeholder="Type a message..." required>
            <button type="submit" class="btn btn-primary">Send</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function switchChat(key) {
  state.activeChatKey = key;
  renderChat(document.getElementById('app-content'));
}

function sendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const txt = input.value.trim();
  if (!txt) return;

  if (!state.chats[state.activeChatKey]) state.chats[state.activeChatKey] = [];
  state.chats[state.activeChatKey].push({ author: state.user.name, text: txt, isSent: true });
  input.value = '';
  renderChat(document.getElementById('app-content'));
  showToast('Message sent! 💬');
}

// --- 6. Profile View ---
function renderProfile(container) {
  const u = state.user;
  const joinedEvents = state.events.filter(e => u.joined.includes(e.id));

  container.innerHTML = `
    <div class="container" style="padding-top:2rem;">
      <div class="profile-card-hero">
        <img src="${u.avatar}" class="profile-avatar-xl">
        <div>
          <h1>${u.name}</h1>
          <p class="profile-major">${u.major}</p>
          <p class="profile-bio">${u.bio}</p>
        </div>
        <button class="btn btn-secondary profile-edit-btn" onclick="openModal('modal-edit-profile')">Edit Profile</button>
      </div>

      <h2>Events You Joined</h2>
      <div class="events-grid" style="margin-top:1rem;">
        ${joinedEvents.map(e => createCardHTML(e)).join('')}
      </div>
    </div>
  `;
}

// --- Actions & Global Listeners ---
function toggleRSVP(id) {
  const idx = state.user.joined.indexOf(id);
  if (idx > -1) {
    state.user.joined.splice(idx, 1);
    showToast('Removed from event');
  } else {
    state.user.joined.push(id);
    showToast('Joined event! 🎉');
  }
  navigate();
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', e => {
    if (e.target.matches('[data-close]')) closeModal(e.target.getAttribute('data-close'));
  });

  // Profile Form Edit Listener
  const form = document.getElementById('form-edit-profile');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      state.user.name = document.getElementById('edit-name').value || state.user.name;
      state.user.major = document.getElementById('edit-major').value || state.user.major;
      state.user.bio = document.getElementById('edit-bio').value || state.user.bio;
      closeModal('modal-edit-profile');
      showToast('Profile updated!');
      navigate();
    });
  }

  // Host Event Form Listener
  const createForm = document.getElementById('form-create-event');
  if (createForm) {
    createForm.addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('create-title').value;
      const category = document.getElementById('create-category').value;
      const date = document.getElementById('create-date').value;
      const location = document.getElementById('create-location').value;
      const description = document.getElementById('create-description').value;

      const newEvt = {
        id: Date.now(),
        title,
        category,
        date,
        location,
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        description,
        host: state.user.name,
        goingCount: 1
      };

      state.events.unshift(newEvt);
      state.user.joined.push(newEvt.id);
      closeModal('modal-create-event');
      showToast('Event created successfully! 🎉');
      window.location.hash = '#events';
    });
  }

  window.addEventListener('hashchange', navigate);
  navigate();
});

/* =====================================================
   VIBE TOGETHER - LIVE CHAT & API INTEGRATED FRONTEND
   ===================================================== */

// Auto-detect API Base URL so it works seamlessly locally, in VS Code Live Server, and on deployed Render cloud
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_BASE = isLocal 
    ? (window.location.port === '3000' ? '' : 'http://localhost:3000')
    : '';

let user = null;

function loadUserSession() {
    try {
        const saved = localStorage.getItem('vibe_user');
        if (saved) {
            user = JSON.parse(saved);
        }
    } catch (e) {
        user = null;
    }
    updateNavUI();
}

let currentEvents = [];

let availableInterests = [
    "🎵 Music",
    "🎬 Movies",
    "✈️ Travel",
    "🍔 Food",
    "⚽ Sports",
    "🎨 Art",
    "📚 Books",
    "🎮 Gaming",
    "💪 Fitness",
    "💻 Technology"
];

// ================= SOCKET.IO REAL-TIME SETUP =================
let socket = null;
let typingTimeout = null;

function initSocket() {
    if (typeof io !== 'undefined') {
        try {
            socket = io(API_BASE || undefined);

            socket.on('connect', () => {
                console.log('⚡ Connected to live WebSocket server!');
                socket.emit('request_messages');
            });

            socket.on('initial_messages', (messages) => {
                renderMessages(messages);
            });

            socket.on('receive_message', (msg) => {
                appendSingleMessage(msg);
            });

            socket.on('user_typing', (data) => {
                showTypingIndicator(data.name);
            });
        } catch (e) {
            console.warn('Socket initialization fallback:', e);
        }
    }
}

/* =====================================================
   DYNAMIC CATEGORIES LOADING
   ===================================================== */
async function loadCategories() {
    let categoryFilterSelect = document.getElementById("category");
    if (!categoryFilterSelect) return;

    try {
        let res = await fetch(`${API_BASE}/api/categories`);
        if (res.ok) {
            let categories = await res.json();
            let currentVal = categoryFilterSelect.value || "All";

            let optionsHTML = `<option value="All">All Categories</option>`;
            categories.forEach(c => {
                optionsHTML += `<option value="${c.name}">${c.name}</option>`;
            });

            categoryFilterSelect.innerHTML = optionsHTML;
            categoryFilterSelect.value = currentVal;
        }
    } catch (err) {
        console.error("Error loading categories:", err);
    }
}

function checkCustomCategory() {
    let select = document.getElementById("eventCategory");
    let box = document.getElementById("customCategoryBox");
    if (!select || !box) return;

    if (select.value === "Custom") {
        box.style.display = "block";
    } else {
        box.style.display = "none";
    }
}

/* =====================================================
   AUTHENTICATION & NAVIGATION STATE
   ===================================================== */
function updateNavUI() {
    const navAuthBtn = document.getElementById("navAuthBtn");
    const appLinks = document.querySelectorAll(".nav-app-link");
    const profileNameEl = document.getElementById("profileName");
    const avatarLetterEl = document.getElementById("avatarLetter");

    if (user && user.name) {
        if (navAuthBtn) {
            navAuthBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Logout (${user.name})`;
        }
        if (profileNameEl) profileNameEl.innerText = user.name;
        if (avatarLetterEl) avatarLetterEl.innerText = user.name.charAt(0).toUpperCase();

        // Show main app navigation links
        appLinks.forEach(link => link.style.display = "inline-flex");
    } else {
        if (navAuthBtn) {
            navAuthBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login / Sign Up`;
        }
        // Hide main app navigation links until logged in
        appLinks.forEach(link => link.style.display = "none");
    }
}

function handleNavAuthClick() {
    if (user) {
        if (confirm("Are you sure you want to Log Out?")) {
            localStorage.removeItem('vibe_user');
            user = null;
            updateNavUI();
            showPage('login');
            showAuthAlert("Logged out successfully.", "success");
        }
    } else {
        showPage('login');
    }
}

function switchAuthTab(tab) {
    const loginTabBtn = document.getElementById("loginTabBtn");
    const signupTabBtn = document.getElementById("signupTabBtn");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const alertEl = document.getElementById("authAlert");

    if (alertEl) alertEl.style.display = "none";

    if (tab === 'login') {
        if (loginTabBtn) loginTabBtn.classList.add("active");
        if (signupTabBtn) signupTabBtn.classList.remove("active");
        if (loginForm) loginForm.style.display = "block";
        if (signupForm) signupForm.style.display = "none";
    } else {
        if (signupTabBtn) signupTabBtn.classList.add("active");
        if (loginTabBtn) loginTabBtn.classList.remove("active");
        if (signupForm) signupForm.style.display = "block";
        if (loginForm) loginForm.style.display = "none";
    }
}

function showAuthAlert(msg, type) {
    const alertEl = document.getElementById("authAlert");
    if (!alertEl) return;
    alertEl.innerText = msg;
    alertEl.className = "auth-alert " + (type || "error");
    alertEl.style.display = "block";
}

async function handleSignupSubmit(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById("signupName");
    const emailInput = document.getElementById("signupEmail");
    const passwordInput = document.getElementById("signupPassword");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!name || !email || !password) {
        showAuthAlert("Please fill in Full Name, Email Address, and Password.", "error");
        return;
    }

    try {
        let res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, interests: ["🎵 Music", "🎬 Movies"] })
        });

        let data = await res.json();
        if (res.ok && data.success) {
            showAuthAlert("Account created successfully! Please Log In with your password.", "success");
            switchAuthTab('login');
            const loginIdInput = document.getElementById("loginIdentifier");
            if (loginIdInput) loginIdInput.value = name;
            if (passwordInput) passwordInput.value = "";
        } else {
            showAuthAlert(data.error || "Sign Up failed. Please try again.", "error");
        }
    } catch (err) {
        console.error("Signup error:", err);
        showAuthAlert("Server connection error. Please try again.", "error");
    }
}

async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const loginInputEl = document.getElementById("loginIdentifier");
    const passwordInputEl = document.getElementById("loginPassword");

    const loginInput = loginInputEl ? loginInputEl.value.trim() : "";
    const password = passwordInputEl ? passwordInputEl.value.trim() : "";

    if (!loginInput || !password) {
        showAuthAlert("Please enter your Name or Email, and Password.", "error");
        return;
    }

    try {
        let res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginInput, password })
        });

        let data = await res.json();
        if (res.ok && data.success) {
            user = data.user;
            localStorage.setItem('vibe_user', JSON.stringify(user));
            updateNavUI();
            showPage('home');
        } else {
            showAuthAlert(data.error || "Login failed. Please check your details.", "error");
        }
    } catch (err) {
        console.error("Login error:", err);
        showAuthAlert("Server connection error. Please try again.", "error");
    }
}

/* =====================================================
   SHOW PAGE
   ===================================================== */
function showPage(pageName) {
    // If user is not logged in and tries to access another page, redirect to Login!
    if (!user && pageName !== 'login') {
        pageName = 'login';
        showAuthAlert("Please log in or sign up first to access Vibe Together!", "error");
    }

    let pages = document.querySelectorAll(".page");
    pages.forEach(function(page) {
        page.style.display = "none";
    });

    let selectedPage = document.getElementById(pageName);
    if (selectedPage) {
        selectedPage.style.display = "block";
    }

    window.scrollTo(0, 0);

    if (pageName === "events") {
        loadCategories();
        displayEvents();
    } else if (pageName === "profile") {
        loadUserProfile();
    } else if (pageName === "chat") {
        displayChat();
    }
}

/* =====================================================
   DISPLAY EVENTS (API INTEGRATED)
   ===================================================== */
async function displayEvents() {
    let eventList = document.getElementById("eventList");
    let searchInput = document.getElementById("search");
    let categoryInput = document.getElementById("category");

    let searchText = searchInput ? searchInput.value.toLowerCase() : "";
    let selectedCategory = categoryInput ? categoryInput.value : "All";

    eventList.innerHTML = "<div style='grid-column: 1/-1; text-align: center; color: #111;'>Loading events...</div>";

    try {
        let queryParams = new URLSearchParams({
            search: searchText,
            category: selectedCategory
        });

        let res = await fetch(`${API_BASE}/api/events?${queryParams}`);
        let events = await res.json();
        currentEvents = events;

        eventList.innerHTML = "";

        if (!events || events.length === 0) {
            eventList.innerHTML = `
                <div class="form-card" style="grid-column: 1/-1;">
                    <h3>No events found</h3>
                    <p>Try another search or category.</p>
                </div>
            `;
            return;
        }

        events.forEach(function(event) {
            let attendeeCount = event.people ? event.people.length : 0;

            eventList.innerHTML += `
                <div class="event-card">
                    <div
                        class="event-image"
                        style="background-image: url('${event.image}');"
                    >
                        <span class="category">
                            ${event.category}
                        </span>
                    </div>

                    <div class="event-content">
                        <h3>${event.name}</h3>

                        <div class="event-info">
                            <span>
                                <i class="fa-solid fa-calendar"></i>
                                ${event.date}
                            </span>
                            <span>
                                <i class="fa-solid fa-clock"></i>
                                ${event.time}
                            </span>
                            <span>
                                <i class="fa-solid fa-location-dot"></i>
                                ${event.location}
                            </span>
                        </div>

                        <div class="going">
                            <i class="fa-solid fa-users"></i>
                            ${attendeeCount} people going
                        </div>

                        <div class="card-buttons">
                            <button
                                class="outline-btn"
                                onclick="openEvent(${event.id})"
                            >
                                View Details
                            </button>
                            <button
                                class="main-btn"
                                onclick="joinEvent(${event.id})"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Error fetching events:", err);
        eventList.innerHTML = `<div style="grid-column: 1/-1; color: red;">Failed to load events. Ensure 'node server.js' is running!</div>`;
    }
}

/* =====================================================
   OPEN EVENT & DISCUSSION (API INTEGRATED)
   ===================================================== */
async function openEvent(id) {
    let box = document.getElementById("eventDetailsBox");
    box.innerHTML = "<div style='text-align: center; color: #111; padding: 40px;'>Loading event details...</div>";

    try {
        let res = await fetch(`${API_BASE}/api/events/${id}`);
        if (!res.ok) throw new Error("Event not found");

        let { event, comments } = await res.json();
        let attendeeCount = event.people ? event.people.length : 0;

        let commentsHTML = "";
        if (comments && comments.length > 0) {
            comments.forEach(c => {
                commentsHTML += `
                    <div class="comment">
                        <b>${c.userName}</b>
                        <p>${c.text}</p>
                    </div>
                `;
            });
        } else {
            commentsHTML = `<p style="color: #666; margin-bottom: 15px;">No comments yet. Be the first to start the discussion!</p>`;
        }

        box.innerHTML = `
            <div class="details-card">
                <button class="back-btn" onclick="showPage('events')">
                    ← Back to Events
                </button>

                <div
                    class="details-banner"
                    style="
                        background-image: linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.30)), url('${event.image}');
                    "
                ></div>

                <h1>${event.name}</h1>

                <div class="details-info">
                    <span>
                        <i class="fa-solid fa-calendar"></i>
                        ${event.date}
                    </span>
                    <span>
                        <i class="fa-solid fa-clock"></i>
                        ${event.time}
                    </span>
                    <span>
                        <i class="fa-solid fa-location-dot"></i>
                        ${event.location}
                    </span>
                    <span>
                        <i class="fa-solid fa-users"></i>
                        ${attendeeCount} people going
                    </span>
                </div>

                <p class="details-description">
                    ${event.description}
                </p>

                <div class="card-buttons">
                    <button class="main-btn" onclick="joinEvent(${event.id})">
                        <i class="fa-solid fa-user-plus"></i>
                        Join Event
                    </button>

                    <button class="outline-btn" onclick="showPeople(${event.id})">
                        <i class="fa-solid fa-users"></i>
                        See Who's Going
                    </button>
                </div>

                <!-- COMMENTS -->
                <div class="comments">
                    <h2>
                        <i class="fa-solid fa-comments"></i>
                        Event Discussion
                    </h2>

                    <div id="commentsContainer">
                        ${commentsHTML}
                    </div>

                    <div class="comment-input">
                        <input id="commentInput" placeholder="Write a comment...">
                        <button class="main-btn" onclick="addComment(${event.id})">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        `;

        showPage("eventDetails");
    } catch (err) {
        console.error("Error opening event:", err);
        box.innerHTML = `<div style="color: red; padding: 20px;">Could not load event details.</div>`;
    }
}

/* =====================================================
   JOIN EVENT (API INTEGRATED)
   ===================================================== */
async function joinEvent(id) {
    try {
        let res = await fetch(`${API_BASE}/api/events/${id}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: user.name })
        });

        let data = await res.json();
        if (res.ok && data.success) {
            if (data.alreadyJoined) {
                alert("You are already going to this event.");
            } else {
                alert("You joined " + data.event.name + "!");
            }
            showPeople(id);
        } else {
            alert(data.error || "Could not join event.");
        }
    } catch (err) {
        console.error("Error joining event:", err);
        alert("Server error joining event.");
    }
}

/* =====================================================
   SHOW PEOPLE (API INTEGRATED)
   ===================================================== */
/* =====================================================
   SHOW PEOPLE (API INTEGRATED REAL USER PROFILES)
   ===================================================== */
async function showPeople(id) {
    let box = document.getElementById("peopleBox");
    box.innerHTML = "<div style='text-align: center; color: #111; padding: 40px;'>Loading attendees...</div>";

    try {
        let res = await fetch(`${API_BASE}/api/events/${id}/people`);
        let { event, attendees } = await res.json();

        let peopleHTML = "";

        if (!attendees || attendees.length === 0) {
            peopleHTML = `<div style="grid-column: 1/-1; text-align: center; color: #555; padding: 20px;">No attendees have joined this event yet. Be the first to join!</div>`;
        } else {
            attendees.forEach(function(person) {
                let interestsText = (person.interests && person.interests.length > 0)
                    ? person.interests.join(", ")
                    : "No interests added yet";

                let isMe = user && user.name && (person.name.trim().toLowerCase() === user.name.trim().toLowerCase());

                peopleHTML += `
                    <div class="person-card">
                        <div class="person-avatar">
                            ${person.name.charAt(0).toUpperCase()}
                        </div>

                        <h3>${person.name} ${isMe ? '<span style="font-size: 13px; color: #832828; font-weight: normal; margin-left: 4px;">(You)</span>' : ''}</h3>

                        <p>
                            <i class="fa-solid fa-heart"></i>
                            ${interestsText}
                        </p>

                        ${isMe ? `
                            <div style="background: rgba(131,40,40,0.1); color: #832828; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px; text-align: center; margin-top: 10px;">
                                <i class="fa-solid fa-user-check"></i> Your Profile (Logged In)
                            </div>
                        ` : `
                            <button class="outline-btn" onclick="openChat('${person.name}')" style="margin-top: 10px;">
                                <i class="fa-solid fa-comments"></i>
                                Connect & Chat
                            </button>
                        `}
                    </div>
                `;
            });
        }

        box.innerHTML = `
            <div class="people-container">
                <button class="back-btn" onclick="showPage('events')">
                    ← Back to Events
                </button>

                <div class="people-title">
                    <span>EVENT COMMUNITY</span>
                    <h1>${event.name}</h1>
                    <p>${event.date} • ${event.time} • ${event.location}</p>
                </div>

                <div class="people-grid">
                    ${peopleHTML}
                </div>

                <div class="safety-box">
                    <i class="fa-solid fa-shield-halved"></i>
                    <strong>Stay Safe</strong>
                    <p>
                        Meet in public places and respect other members.
                        Vibe Together is about meeting people and enjoying events safely.
                    </p>
                </div>
            </div>
        `;

        showPage("people");
    } catch (err) {
        console.error("Error showing people:", err);
        box.innerHTML = `<div style="color: red; padding: 20px;">Could not load community attendees.</div>`;
    }
}

/* =====================================================
   LIVE CHAT & WEBSOCKET FUNCTIONS
   ===================================================== */
let activeChatTarget = null;

function goBackFromChat() {
    showPage('events');
}

function openChat(name) {
    if (name) {
        activeChatTarget = name;
        const titleEl = document.getElementById("chatTitle");
        const subTitleEl = document.getElementById("chatSubTitle");
        const inputEl = document.getElementById("chatInput");

        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-comments"></i> Chat with ${name}`;
        if (subTitleEl) subTitleEl.innerText = `Send direct messages and coordinate with ${name}.`;
        if (inputEl) inputEl.placeholder = `Write a message to ${name}...`;
    }
    displayChat();
    showPage("chat");
}

function renderMessages(messages) {
    let box = document.getElementById("chatMessages");
    if (!box) return;

    box.innerHTML = "";

    messages.forEach(function(msg) {
        appendSingleMessage(msg, false);
    });

    box.scrollTop = box.scrollHeight;
}

function appendSingleMessage(msg, scroll = true) {
    let box = document.getElementById("chatMessages");
    if (!box) return;

    let isMine = msg.senderName === user.name;
    let className = isMine ? "my-message" : "";

    let msgDiv = document.createElement("div");
    msgDiv.className = `message ${className}`;
    msgDiv.innerHTML = `
        <small style="font-size: 10px; display: block; opacity: 0.7; margin-bottom: 2px;">
            ${msg.senderName}
        </small>
        ${msg.text}
    `;

    box.appendChild(msgDiv);

    if (scroll) {
        box.scrollTop = box.scrollHeight;
    }
}

function handleTyping() {
    if (socket && socket.connected) {
        socket.emit('typing', { name: user.name });
    }
}

function showTypingIndicator(name) {
    let el = document.getElementById("typingIndicator");
    if (!el) return;

    el.innerText = `${name} is typing...`;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        el.innerText = "";
    }, 2000);
}

async function displayChat() {
    if (socket && socket.connected) {
        socket.emit('request_messages');
    } else {
        try {
            let res = await fetch(`${API_BASE}/api/messages`);
            let messages = await res.json();
            renderMessages(messages);
        } catch (err) {
            console.error("Error displaying chat:", err);
        }
    }
}

async function sendMessage() {
    let input = document.getElementById("chatInput");
    let text = input.value.trim();

    if (text === "") return;

    if (socket && socket.connected) {
        socket.emit('send_message', { senderName: user.name, text });
        input.value = "";
    } else {
        try {
            let res = await fetch(`${API_BASE}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderName: user.name, text })
            });

            if (res.ok) {
                input.value = "";
                displayChat();
            }
        } catch (err) {
            console.error("Error sending message:", err);
        }
    }
}

function checkEnter(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

/* =====================================================
   ADD COMMENT (API INTEGRATED)
   ===================================================== */
async function addComment(eventId) {
    let input = document.getElementById("commentInput");
    let text = input.value.trim();

    if (text === "") return;

    try {
        let res = await fetch(`${API_BASE}/api/events/${eventId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: user.name, text })
        });

        let data = await res.json();
        if (res.ok && data.success) {
            input.value = "";
            openEvent(eventId);
        } else {
            alert("Could not post comment.");
        }
    } catch (err) {
        console.error("Error adding comment:", err);
    }
}

/* =====================================================
   CREATE EVENT
   ===================================================== */
async function createNewEvent() {
    let name = document.getElementById("eventName").value.trim();
    let date = document.getElementById("eventDate").value;
    let time = document.getElementById("eventTime").value;
    let location = document.getElementById("eventLocation").value.trim();
    let category = document.getElementById("eventCategory").value;
    let customCategoryName = document.getElementById("customCategoryName") ? document.getElementById("customCategoryName").value.trim() : "";
    let customCategoryEmoji = document.getElementById("customCategoryEmoji") ? document.getElementById("customCategoryEmoji").value.trim() : "";
    let peopleCountInput = document.getElementById("eventPeopleCount");
    let peopleCount = peopleCountInput ? (parseInt(peopleCountInput.value) || 1) : 1;
    let description = document.getElementById("eventDescription").value.trim();

    if (name === "" || date === "" || time === "" || location === "") {
        alert("Please fill all required fields.");
        return;
    }

    if (category === "Custom" && customCategoryName === "") {
        alert("Please enter a custom category name.");
        return;
    }

    try {
        let res = await fetch(`${API_BASE}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                date,
                time,
                location,
                category,
                customCategory: customCategoryName,
                emojiInput: customCategoryEmoji,
                peopleCount,
                description,
                creatorName: user.name
            })
        });

        let data = await res.json();
        if (res.ok && data.success) {
            alert("Event created successfully!");

            document.getElementById("eventName").value = "";
            document.getElementById("eventDate").value = "";
            document.getElementById("eventTime").value = "";
            document.getElementById("eventLocation").value = "";
            document.getElementById("eventDescription").value = "";
            if (peopleCountInput) peopleCountInput.value = "1";
            document.getElementById("eventCategory").value = "Music";
            checkCustomCategory();

            await loadCategories();
            showPage("events");
        } else {
            alert(data.error || "Failed to create event.");
        }
    } catch (err) {
        console.error("Error creating event:", err);
        alert("Server error creating event.");
    }
}

/* =====================================================
   INTERESTS & USER PROFILE (API INTEGRATED)
   ===================================================== */
async function loadUserProfile() {
    try {
        let res = await fetch(`${API_BASE}/api/profile/${user.name}`);
        if (res.ok) {
            let data = await res.json();
            user.interests = data.interests || user.interests;
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
    displayInterests();
}

function displayInterests() {
    let box = document.getElementById("interestList");
    if (!box) return;

    box.innerHTML = "";

    availableInterests.forEach(function(interest) {
        let selected = user.interests.includes(interest);

        box.innerHTML += `
            <button
                class="interest ${selected ? "selected" : ""}"
                onclick="selectInterest('${interest}')"
            >
                ${interest}
            </button>
        `;
    });
}

function selectInterest(interest) {
    if (user.interests.includes(interest)) {
        user.interests = user.interests.filter(item => item !== interest);
    } else {
        user.interests.push(interest);
    }
    displayInterests();
}

async function saveInterests() {
    try {
        let res = await fetch(`${API_BASE}/api/profile/interests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: user.name, interests: user.interests })
        });

        let data = await res.json();
        if (res.ok && data.success) {
            alert("Your interests have been saved!");
        } else {
            alert("Could not save interests.");
        }
    } catch (err) {
        console.error("Error saving interests:", err);
    }
}

/* =====================================================
   START APPLICATION
   ===================================================== */
initSocket();

document.addEventListener("DOMContentLoaded", function() {
    loadUserSession();
    if (user && user.name) {
        showPage('home');
    } else {
        showPage('login');
    }
});

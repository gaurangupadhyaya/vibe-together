# 🚀 Vibe Together - Full Stack Node.js & MongoDB Project

A full-stack web application built with **Node.js**, **Express**, **MongoDB (Mongoose)**, and **Vanilla JavaScript** frontend.

---

## 📁 Project Structure

```text
vibe-together/
├── config/
│   └── db.js            # MongoDB Database Connection
├── models/
│   ├── User.js          # User Mongoose Schema
│   ├── Event.js         # Event Mongoose Schema
│   ├── Comment.js       # Comment Mongoose Schema
│   └── Message.js       # Group Chat Message Schema
├── index.html           # Main HTML Interface
├── style.css            # Styles & Responsive Design
├── script.js           # Frontend API Integration (Fetch API)
├── server.js            # Express Server & REST API Endpoints
└── package.json         # Node.js Dependencies & Scripts
```

---

## 🛠️ How to Open and Run in VS Code

### Step 1: Open Folder in VS Code
1. Open **Visual Studio Code**.
2. Go to **File** > **Open Folder...**
3. Select the folder:
   `C:\Users\pc\.gemini\antigravity\scratch\vibe-together`

### Step 2: Open Integrated Terminal
1. Press `Ctrl + ~` (or `Ctrl + ` ` `) to open the VS Code Terminal.
2. Ensure you are in the project root directory.

### Step 3: Install Dependencies (if needed)
```bash
npm install
```

### Step 4: Start the Backend Server
```bash
npm start
```
*or*
```bash
node server.js
```

### Step 5: View Website & Test Backend
- Open your web browser and go to: **`http://localhost:3000`**
- Test REST API endpoints directly in your browser or Postman:
  - `GET http://localhost:3000/api/events`
  - `GET http://localhost:3000/api/messages`

---

## ⚡ REST API Endpoints Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login / Register User |
| `GET` | `/api/events` | List & Filter Events |
| `GET` | `/api/events/:id` | Get Event Details |
| `POST` | `/api/events` | Create New Event |
| `POST` | `/api/events/:id/join` | Join an Event |
| `GET` | `/api/events/:id/comments` | Fetch Event Comments |
| `POST` | `/api/events/:id/comments` | Add Event Comment |
| `GET` | `/api/messages` | Fetch Group Chat Messages |
| `POST` | `/api/messages` | Send Group Chat Message |
| `POST` | `/api/profile/interests` | Update User Interests |

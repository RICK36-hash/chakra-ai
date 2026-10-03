# 🔮 CHAKRA AI

A sleek, dark-themed AI chatbot powered by **Google Gemini**, with full conversation memory. Built for deployment on **Vercel** (free tier).

![CHAKRA AI](https://img.shields.io/badge/Powered%20by-Gemini-blue?style=for-the-badge)

## Features

- 🧠 **Multi-turn chat memory** — Gemini remembers your entire conversation
- 💬 **Multiple conversations** — Create, switch, and delete conversations
- 🎨 **Dark theme UI** — Modern, responsive design
- ✨ **Markdown rendering** — Code blocks with syntax highlighting and copy button
- 📱 **Mobile friendly** — Responsive sidebar and layout
- 🔒 **Secure** — API key never exposed to the browser
- 💾 **Persistent history** — Conversations saved in browser localStorage

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/RICK36-hash/chakra-ai.git
cd chakra-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your API key

Create a `.env` file in the root:

```
GEMINI_API_KEY=your_google_ai_studio_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. In **Environment Variables**, add:
   - Key: `GEMINI_API_KEY`
   - Value: your API key
5. Click **Deploy**

That's it! Your chatbot is live. 🚀

## Project Structure

```
chakra-ai/
├── .env                  # API key (not committed)
├── .gitignore
├── package.json
├── vercel.json           # Vercel routing config
├── api/
│   └── chat.js           # Serverless function (Gemini proxy)
├── public/
│   ├── index.html        # Chat UI
│   ├── style.css         # Dark theme styles
│   └── script.js         # Frontend logic
└── README.md
```

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI**: Google Gemini 2.0 Flash
- **Markdown**: Marked.js + Highlight.js

## License

MIT

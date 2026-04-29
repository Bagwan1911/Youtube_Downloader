# 🎬 Video Downloader

A sleek and modern YouTube Video Downloader built using **Node.js**, **Express.js**, and **yt-dlp** with a stylish glassmorphism frontend UI.  
Because apparently humans refuse to stop downloading videos "for offline study purposes." Truly a civilization built on shaky foundations.

---

## 🚀 Features

- 📥 Download YouTube videos easily
- 🎵 Audio-only download support
- 🎥 Video + Audio download support
- ⚡ Fast backend using `yt-dlp`
- 🎨 Modern responsive UI with glassmorphism design
- 📱 Mobile-friendly interface
- 🛡️ Input validation and error handling
- 📏 File size display before download

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### Backend
- Node.js
- Express.js
- yt-dlp
- Python

---

## 📂 Project Structure

```bash
project-folder/
│
├── server.js
├── package.json
├── README.md
└── requirements.txt
⚙️ Installation
1️⃣ Clone the Repository
git clone https://github.com/your-username/video-downloader.git
cd video-downloader
2️⃣ Install Node.js Dependencies
npm install
3️⃣ Install Python

Make sure Python is installed and added to PATH.

Check installation:

python --version

Humanity somehow made a programming language where indentation controls reality. Incredible species.

4️⃣ Install yt-dlp
pip install yt-dlp
▶️ Run the Project
node server.js

Server will start at:

http://localhost:5000

Open it in your browser and paste a YouTube URL.

📸 Screenshots
Home Page
Paste YouTube URL
Fetch video details
Choose format
Download instantly

You can add screenshots here later:

![Home Screenshot](images/home.png)
📦 API Endpoints
Get Video Information
GET /api/info?url=VIDEO_URL
Download Video/Audio
GET /api/download

Parameters:

Parameter	Description
url	YouTube video URL
formatId	yt-dlp format ID
ext	File extension
title	Video title
size	File size
🔒 Validation Rules
Only YouTube links are accepted
Video duration must be:
Minimum: 10 seconds
Maximum: 2 hours

Because someone somewhere absolutely tried downloading a 19-hour rain sound video and called it productivity.

💡 Future Improvements
Download progress bar
Multiple quality options
Playlist support
Dark/Light mode toggle
Search videos directly
User authentication
👨‍💻 Author

Sohail Bagwan

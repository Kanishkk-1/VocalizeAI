# 🎤 Vocalize AI Assistant

A modern, voice-powered AI assistant built with Next.js and Google Gemini AI. Experience seamless voice interactions with real-time transcription, intelligent responses, and a futuristic user interface.

## ✨ Features

### 🎯 Core Functionality
- **Real-time Voice Recording** - High-quality audio capture with noise suppression
- **Intelligent Transcription** - Powered by Google Gemini's multimodal capabilities
- **Smart AI Responses** - Context-aware conversations with personalized responses
- **Text-to-Speech** - Natural voice synthesis with multiple voice options
- **Cross-platform Support** - Optimized for desktop and mobile devices

### 🔧 Technical Features
- **Cold Start Optimization** - Health check system to prevent server delays
- **Audio Processing** - Advanced noise cancellation and audio enhancement
- **Performance Monitoring** - Built-in analytics and response time tracking
- **Error Handling** - Robust error recovery and user feedback
- **Security** - Environment variable protection and secure API handling

### 🚀 Advanced Capabilities
- **Multi-language Support** - Supports multiple accents
- **Caching System** - Smart response caching for improved performance

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - Modern React with hooks and concurrent features

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework

### AI & APIs
- **Google Gemini AI** - Advanced language model
- **Web Speech API** - Browser-based speech synthesis
- **MediaRecorder API** - Audio recording capabilities

### Deployment
- **Render.com** - Backend hosting
- **Vercel** - Frontend deployment (optional)
- **Environment Variables** - Secure configuration management

## 🚀 Quick Start

### Prerequisites
- Node.js 16.13.0 or higher
- npm or yarn package manager
- Google Gemini API key

### Installation

1. **Clone the repository**
git clone https://github.com/yourusername/vocalize-ai.git
cd vocalize-ai

text

2. **Install dependencies**
npm install

text

3. **Set up environment variables**
cp .env.example .env.local

text

Add your API keys to `.env.local`:
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
NODE_ENV=development

text

4. **Start the development servers**

Frontend (Next.js):
npm run dev

text

Backend (Express):
node server.js

text

5. **Open your browser**
Navigate to `http://localhost:3000` to start using Vocalize AI!

## 🎮 Usage

### Basic Voice Interaction
1. **Click the microphone button** to start recording
2. **Speak your question** clearly into the microphone
3. **Wait for transcription** and AI response
4. **Listen to the response** or read the text output

### Advanced Features
- **Voice Selection**: Choose from available system voices
- **Conversation History**: Review previous interactions
- **Copy Responses**: Copy AI responses to clipboard
- **Mobile Support**: Full functionality on mobile devices

### Environment Variables
Production
GEMINI_API_KEY=your_production_api_key
NODE_ENV=production
PORT=5000

Development
GEMINI_API_KEY=your_development_api_key
NODE_ENV=development
PORT=5000


We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Made with ❤️ by Kanishk**

*Vocalize AI - The future of voice-powered conversations*

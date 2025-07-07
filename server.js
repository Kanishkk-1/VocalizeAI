require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Ensure the 'uploads' directory exists for temporary file storage[1].
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for handling audio file uploads[1].
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// Initialize the Gemini AI client with your API key[1].
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Endpoint for transcribing audio using Gemini's multimodal capabilities[1].
app.post("/api/transcribe", upload.single("audioData"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided." });
  }
  const filePath = req.file.path;

  try {
    console.log("Processing transcription for file:", filePath);

    const audioBuffer = await fs.promises.readFile(filePath);
    const audioBase64 = audioBuffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBase64,
          mimeType: req.file.mimetype,
        },
      },
      "Please transcribe this audio file and return only the spoken text.",
    ]);

    const transcription = result.response.text();
    console.log("Transcription successful:", transcription);

    res.json({ text: transcription });
  } catch (error) {
    console.error("Error in transcription:", error);
    res.status(500).json({
      error: "Error in transcription",
      details: error.message,
    });
  } finally {
    // Always attempt to clean up the uploaded file to save space[1].
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });
  }
});

// Add this to your existing Express server to keep the server warm and to avoid cold start by hitting thid end point every 5 min
app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      service: 'Vocalize AI Transcription Server'
    });
  });
  
  // Optional: Add a simple root endpoint too
  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Vocalize AI Server is running',
      endpoints: ['/health', '/api/transcribe']
    });
  });

// Endpoint for generating answers using the Gemini API[1].
app.post("/api/answer", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("Generating answer with Gemini for prompt:", prompt);

    const lowerPrompt = prompt.toLowerCase();

    // Custom handlers for real-time information to improve bot robustness[1].
    // if (lowerPrompt.includes("current time") || lowerPrompt.includes("clock")) {
    //   const currentTime = new Date().toLocaleString("en-US", {
    //     timeZone: "Asia/Kolkata",
    //     hour: "2-digit",
    //     minute: "2-digit",
    //   });
    //   return res.json({ response: `The current time is ${currentTime}.` });
    // }

    // if (lowerPrompt.includes("today's date") || lowerPrompt.includes("today")) {
    //   const currentDate = new Date().toLocaleDateString("en-IN", {
    //     weekday: "long",
    //     year: "numeric",
    //     month: "long",
    //     day: "numeric",
    //   });
    //   return res.json({ response: `Today is ${currentDate}.` });
    // }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // System prompt defining the AI's persona and interview responses[1].
    const systemPrompt = `Your name is Eragon, a helpful AI assistant. Provide accurate, informative responses to user questions across all topics and domains. Be conversational and natural in your responses.`;

    const fullPrompt = `${systemPrompt}\n\nUser Question: ${prompt}\n\nProvide a direct, natural response.`;
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    console.log("Raw Gemini response:", responseText);

    if (!responseText || responseText.trim() === "") {
      throw new Error("Empty response from Gemini API");
    }

    // This cleanup logic is a safeguard against the AI returning unwanted formatting[1].
    let cleanedResponse = responseText.replace(/\\"/g, '"').trim();

    res.json({ response: cleanedResponse });
  } catch (error) {
    console.error("Detailed error in answer generation:", error);
    res.json({
      response:
        "I apologize for the technical difficulty. I'm here to discuss my qualifications.",
    });
  }
});

// Endpoint for signaling browser-based Text-to-Speech (TTS)[1].
app.post("/api/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: "No text provided" });
  }
  // Instructs the frontend to use the browser's native speech synthesis capabilities[1].
  res.json({
    message: "Text ready for speech synthesis",
    text: text,
    useBrowserTTS: true,
  });
});

// Keep-warm functionality to prevent cold starts
const HEALTH_CHECK_INTERVAL = 4 * 60 * 1000; // 4 minutes
const SERVER_URL = process.env.NODE_ENV === 'production' 
  ? 'https://vocalizeai.onrender.com' 
  : 'http://localhost:5000';

async function keepServerWarm() {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'KeepWarm-Bot/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Health check successful - Uptime: ${Math.round(data.uptime/60)} minutes`);
    } else {
      console.log(`⚠️ Health check returned status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

// Only run keep-warm in production
if (process.env.NODE_ENV === 'production') {
  setInterval(keepServerWarm, HEALTH_CHECK_INTERVAL);
  console.log('🔄 Keep-warm service started - pinging every 4 minutes');
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

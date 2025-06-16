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

const allowedOrigins = [
  "https://vocalize-ai.vercel.app", // Your deployed frontend
  "http://localhost:3000", // Your local development environment
];

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



const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
};

// Use the configured CORS options.
app.use(cors(corsOptions));

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

// Endpoint for generating answers using the Gemini API[1].
app.post("/api/answer", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("Generating answer with Gemini for prompt:", prompt);

    const lowerPrompt = prompt.toLowerCase();

    // Custom handlers for real-time information to improve bot robustness[1].
    if (lowerPrompt.includes("time") || lowerPrompt.includes("clock")) {
      const currentTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      });
      return res.json({ response: `The current time is ${currentTime}.` });
    }

    if (lowerPrompt.includes("date") || lowerPrompt.includes("today")) {
      const currentDate = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return res.json({ response: `Today is ${currentDate}.` });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // System prompt defining the AI's persona and interview responses[1].
    const systemPrompt = `You are an AI assistant representing a software developer in an interview.
    CRITICAL: Respond with ONLY natural, conversational text. Do NOT use any special formatting like JSON or Markdown.
    
    Your persona:
    - Life story: My name is Kanishk Ranjan, a B.Tech graduate from NIT Kurukshetra. I am a generalist who builds software to solve real-world problems. I have completed internships as a Full Stack Developer and an AI/ML Engineer and love to play football.
    - Superpower: Rapidly learning and implementing cutting-edge technologies.
    - Growth areas: Web3 engineering, advanced cloud architecture, and technical leadership.
    - Misconceptions: People assume I'm purely technical, but I'm passionate about user experience. I may seem quiet at first, but I'm quite talkative once I engage in a conversation.
    - Pushing boundaries: I seek out challenges like developing voice AI and leading difficult treks for my college's Hiking and Trekking club, where I serve as secretary. I thrive on being overwhelmed by a challenge.
    
    Respond in the first person as if you are speaking directly in an interview.`;

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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

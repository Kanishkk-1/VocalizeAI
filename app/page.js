"use client";
import React, { useState, useEffect, useRef } from "react";
import VoiceButton from "./components/VoiceButton";
import { FaClipboard, FaStop } from "react-icons/fa";
import { API_BASE_URL } from "./apiConfig";

const VoiceAssistantPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [results, setResults] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const mediaRecorderRef = useRef(null);
  let audioChunks = [];

  // Detect mobile device and initialize voices with mobile-specific handling
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log("Available voices:", voices.length);

        // More inclusive voice filtering for mobile compatibility
        const englishVoices = voices.filter(
          (voice) => voice.lang.includes("en") || voice.lang.includes("EN")
        );

        setAvailableVoices(englishVoices);

        // Set default voice with mobile-friendly fallback
        const defaultVoice =
          englishVoices.find(
            (voice) =>
              voice.name.includes("Google") ||
              voice.name.includes("Microsoft") ||
              voice.name.includes("Samantha") || // iOS default
              voice.name.includes("Samsung") || // Android Samsung
              voice.default
          ) || englishVoices[0];

        setSelectedVoice(defaultVoice);
      };

      // Mobile browsers need multiple attempts to load voices
      speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();

      // Additional voice loading attempts for mobile
      setTimeout(loadVoices, 100);
      setTimeout(loadVoices, 500);
      setTimeout(loadVoices, 1000);
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setResults((prevResults) =>
      prevResults.map((r) => ({ ...r, isPlaying: false }))
    );
  };

  const handlePlayAudio = (index) => {
    const result = results[index];
    if (result.isPlaying) {
      stopSpeaking();
    } else {
      stopSpeaking();
      setIsSpeaking(true);
      setResults((prevResults) =>
        prevResults.map((r, i) =>
          i === index ? { ...r, isPlaying: true } : { ...r, isPlaying: false }
        )
      );

      const utterance = new SpeechSynthesisUtterance(result.answer);
      utterance.rate = isMobile ? 0.9 : 0.8; // Slightly faster on mobile
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setResults((prevResults) =>
          prevResults.map((r, i) =>
            i === index ? { ...r, isPlaying: false } : r
          )
        );
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        setIsSpeaking(false);
        setResults((prevResults) =>
          prevResults.map((r, i) =>
            i === index ? { ...r, isPlaying: false } : r
          )
        );
      };

      speechSynthesis.speak(utterance);
    }
  };

  const handleModal = (text) => {
    setModalContent(text);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      stopSpeaking();
      startRecording();
    }
  };


const createAudioProcessor = (stream) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();

  // Configure analyser for voice detection
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  let silenceStart = Date.now();
  const SILENCE_THRESHOLD = 30; // Adjust this value to filter out fan noise
  const SILENCE_DURATION = 1500; // Stop recording after 1.5s of silence

  const checkAudioLevel = () => {
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / bufferLength;

    if (average < SILENCE_THRESHOLD) {
      if (Date.now() - silenceStart > SILENCE_DURATION && isRecording) {
        stopRecording();
      }
    } else {
      silenceStart = Date.now();
    }

    if (isRecording) {
      requestAnimationFrame(checkAudioLevel);
    }
  };

  checkAudioLevel();
  return audioContext;
};


const startRecording = () => {
  setIsRecording(true);
  setIsProcessing(true);
  setError(null);

  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: isMobile ? 16000 : 44100,
      channelCount: 1,
      // Enhanced noise filtering
      googEchoCancellation: true,
      googAutoGainControl: true,
      googNoiseSuppression: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googAudioMirroring: false,
    },
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      // Add audio processing for noise detection
      const audioContext = createAudioProcessor(stream);

      let mimeType = "audio/webm;codecs=opus";
      if (isMobile) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const options = { mimeType };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      mediaRecorderRef.current.start();

      const timeout = isMobile ? 20000 : 30000;
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, timeout);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];

        // Only process if audio blob is substantial (filters out noise-only recordings)
        if (audioBlob.size > 1000) {
          handleTranscription(URL.createObjectURL(audioBlob), audioBlob);
        } else {
          setIsProcessing(false);
          console.log("Recording too short, likely just noise");
        }

        stream.getTracks().forEach((track) => track.stop());
        if (audioContext) audioContext.close();
      };
    })
    .catch((error) => {
      console.error("Microphone access error:", error);
      setError(
        "Could not access microphone. Please check permissions and try again."
      );
      setIsProcessing(false);
      setIsRecording(false);
    });
};


  const handleTranscription = (audioUrl, audioBlob) => {
    const formData = new FormData();
    formData.append("audioData", audioBlob);

    fetch(`${API_BASE_URL}/api/transcribe`, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Transcription failed");
        return response.json();
      })
      .then((data) => handleAnswer(data.text, audioUrl))
      .catch((err) => {
        console.error("Transcription error:", err);
        setError("Failed to transcribe audio. Please try again.");
        setIsProcessing(false);
      });
  };

  const handleAnswer = (transcription, audioUrl) => {
    fetch(`${API_BASE_URL}/api/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: transcription }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to get an answer");
        return response.json();
      })
      .then((data) => {
        const answerText =
          data.response?.trim() || "No valid response received.";
        const newResult = {
          transcription,
          audioUrl,
          answer: answerText,
          isPlaying: false,
        };
        setResults((prevResults) => [...prevResults, newResult]);
        handleBrowserTTS(answerText);
      })
      .catch((err) => {
        console.error("Answer generation error:", err);
        setError("Error processing answer. Please try again.");
        setIsProcessing(false);
      });
  };
const handleBrowserTTS = (text) => {
  if ("speechSynthesis" in window) {
    // Cancel any ongoing speech first
    speechSynthesis.cancel();

    // Small delay to ensure cancellation is processed
    setTimeout(() => {
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = isMobile ? 0.9 : 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsProcessing(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        setIsSpeaking(false);
        setIsProcessing(false);
      };

      speechSynthesis.speak(utterance);
    }, 100);
  } else {
    console.error("Speech synthesis not supported.");
    setIsProcessing(false);
  }
};

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const renderAnswer = (answer) => {
    if (typeof answer === "string") {
      return <p className="text-gray-800">{answer}</p>;
    }
    return <p className="text-gray-500">No response available</p>;
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
            AI Assistant
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto mb-4 sm:mb-6">
            Click the microphone to ask a question. Click it again to stop
            recording.
          </p>
          {/* <p className="text-xs sm:text-sm text-gray-500 bg-gray-100 border-l-4 border-yellow-400 p-3 rounded-md max-w-2xl mx-auto mb-4 sm:mb-6 shadow-sm">
            Note: The first response may take 15 seconds as the AI 
            needs some time to load models, spin up resources. Everything is good after that!
          </p> */}

          {/* Voice selection with mobile-optimized styling */}
          {availableVoices.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Select Voice:
              </label>
              <select
                value={selectedVoice?.name || ""}
                onChange={(e) =>
                  setSelectedVoice(
                    availableVoices.find((v) => v.name === e.target.value)
                  )
                }
                className="w-full max-w-xs p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {availableVoices.length} voices available
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center space-y-4">
          <VoiceButton onClick={handleRecording} isRecording={isRecording} />

          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-full shadow-lg animate-pulse text-sm sm:text-base"
            >
              <FaStop size={isMobile ? 16 : 20} />
              <span>Stop Speaking</span>
            </button>
          )}
        </div>

        {isProcessing && !isSpeaking && (
          <div className="text-center mt-4">
            <p className="text-sm sm:text-lg text-gray-700">Processing...</p>
            <div className="animate-pulse bg-blue-200 h-2 w-48 sm:w-64 mx-auto mt-2 rounded"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded mt-4 max-w-sm sm:max-w-md mx-2">
            <p className="text-sm">
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-xs sm:text-sm underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {results.length > 0 && (
          <div className="w-full max-w-6xl mt-6 sm:mt-8 px-2">
            {/* Mobile-optimized table */}
            <div className="hidden sm:block overflow-x-auto shadow-lg rounded-lg">
              <table className="w-full text-sm text-left text-gray-600 bg-white">
                <thead className="text-xs text-gray-800 uppercase bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                  <tr>
                    <th scope="col" className="py-4 px-6 font-semibold">
                      Your Question
                    </th>
                    <th scope="col" className="py-4 px-6 font-semibold">
                      AI Response
                    </th>
                    <th scope="col" className="py-4 px-6 font-semibold">
                      Playback
                    </th>
                    <th scope="col" className="py-4 px-6 font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr
                      key={index}
                      className="bg-white border-b hover:bg-gray-50"
                    >
                      <td className="py-4 px-6">
                        {result.transcription?.length > 70
                          ? `${result.transcription.substring(0, 70)}...`
                          : result.transcription}
                      </td>
                      <td className="py-4 px-6 max-w-md">
                        {result.answer.length > 100 ? (
                          <>
                            {result.answer.substring(0, 100)}...{" "}
                            <button
                              onClick={() => handleModal(result.answer)}
                              className="text-blue-600 hover:underline"
                            >
                              Read More
                            </button>
                          </>
                        ) : (
                          renderAnswer(result.answer)
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handlePlayAudio(index)}
                          className={`${
                            result.isPlaying ? "bg-red-500" : "bg-green-500"
                          } text-white font-bold py-2 px-4 rounded`}
                        >
                          {result.isPlaying ? "Stop" : "Play"}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(result.answer)
                          }
                          className="bg-blue-500 text-white font-bold py-2 px-4 rounded"
                        >
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md p-4 border"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">
                      Your Question:
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {result.transcription?.length > 100
                        ? `${result.transcription.substring(0, 100)}...`
                        : result.transcription}
                    </p>
                  </div>

                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">
                      AI Response:
                    </h3>
                    <div className="text-gray-600 text-sm">
                      {result.answer.length > 150 ? (
                        <>
                          {result.answer.substring(0, 150)}...{" "}
                          <button
                            onClick={() => handleModal(result.answer)}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Read More
                          </button>
                        </>
                      ) : (
                        renderAnswer(result.answer)
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handlePlayAudio(index)}
                      className={`${
                        result.isPlaying ? "bg-red-500" : "bg-green-500"
                      } text-white font-bold py-2 px-3 rounded text-sm flex-1 min-w-20`}
                    >
                      {result.isPlaying ? "Stop" : "Play"}
                    </button>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(result.answer)
                      }
                      className="bg-blue-500 text-white font-bold py-2 px-3 rounded text-sm flex-1 min-w-20"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile-optimized modal */}
      {modalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-8 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Full Text</h2>
              <button
                onClick={() => navigator.clipboard.writeText(modalContent)}
                className="text-blue-500 p-2"
              >
                <FaClipboard size={18} />
              </button>
            </div>
            <div className="text-gray-800 whitespace-pre-wrap text-sm sm:text-base">
              {renderAnswer(modalContent)}
            </div>
            <button
              onClick={closeModal}
              className="bg-blue-500 text-white font-bold mt-4 py-2 px-4 rounded mx-auto block w-full sm:w-auto"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistantPage;

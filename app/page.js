"use client";
import React, { useState, useEffect, useRef } from "react";
import VoiceButton from "./components/VoiceButton";
import { FaClipboard, FaStop } from "react-icons/fa";
import { API_BASE_URL } from "./apiConfig";

const VoiceAssistantPage = () => {
  // State management for the component's dynamic parts[1].
  const [isRecording, setIsRecording] = useState(false);
  const [results, setResults] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const mediaRecorderRef = useRef(null);
  let audioChunks = [];

  // Initializes and loads available browser voices for speech synthesis[1].
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        const englishVoices = voices.filter(
          (voice) =>
            voice.lang.includes("en") &&
            (voice.name.includes("Google") ||
              voice.name.includes("Microsoft") ||
              voice.name.includes("Natural"))
        );
        setAvailableVoices(englishVoices);
        const defaultVoice =
          englishVoices.find(
            (voice) =>
              voice.name.includes("Google") || voice.name.includes("Microsoft")
          ) || englishVoices[0];
        setSelectedVoice(defaultVoice);
      };
      speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  // Global function to stop any ongoing speech synthesis[1].
  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setResults((prevResults) =>
      prevResults.map((r) => ({ ...r, isPlaying: false }))
    );
  };

  // Handles playing or stopping the audio response for a specific entry[1].
  const handlePlayAudio = (index) => {
    const result = results[index];
    if (result.isPlaying) {
      stopSpeaking();
    } else {
      stopSpeaking(); // Stop any other playing audio first
      setIsSpeaking(true);
      setResults((prevResults) =>
        prevResults.map((r, i) =>
          i === index ? { ...r, isPlaying: true } : { ...r, isPlaying: false }
        )
      );
      const utterance = new SpeechSynthesisUtterance(result.answer);
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
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
      speechSynthesis.speak(utterance);
    }
  };

  // Functions to control the text modal visibility and content[1].
  const handleModal = (text) => {
    setModalContent(text);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // Main handler for the recording button, toggling between start and stop[1].
  const handleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      stopSpeaking(); // Ensure nothing is speaking before recording
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        startMobileRecording();
      } else {
        startWebRecording();
      }
    }
  };

  // Starts audio recording on web platforms using the MediaRecorder API[1].
  const startWebRecording = () => {
    setIsRecording(true);
    setIsProcessing(true);
    setError(null);
    navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      .then((stream) => {
        const options = { mimeType: "audio/webm;codecs=opus" };
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        mediaRecorderRef.current.start();
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") stopRecording();
        }, 30000); // Stop recording after 30 seconds
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          audioChunks = [];
          handleTranscription(URL.createObjectURL(audioBlob), audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };
      })
      .catch(() =>
        setError("Could not access microphone. Please check permissions.")
      );
  };

  // Sends the recorded audio blob to the backend for transcription[1].
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

  // Sends the transcribed text to the backend to get an AI-generated answer[1].
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

  // Uses the browser's native speech synthesis to speak the provided text[1].
  const handleBrowserTTS = (text) => {
    if ("speechSynthesis" in window) {
      stopSpeaking();
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
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

  // Renders the AI's answer, gracefully handling complex object formats if ever needed[1].
  const renderAnswer = (answer) => {
    if (typeof answer === "string") {
      return <p className="text-gray-800">{answer}</p>;
    }
    return <p className="text-gray-500">No response available</p>;
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            AI Interview Assistant
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Click the microphone to ask a question. Click it again to stop
            recording.
          </p>
          {availableVoices.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Voice:
              </label>
              <select
                value={selectedVoice?.name || ""}
                onChange={(e) =>
                  setSelectedVoice(
                    availableVoices.find((v) => v.name === e.target.value)
                  )
                }
                className="p-2 border border-gray-300 rounded-md bg-white text-gray-700"
              >
                {availableVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center space-y-4">
          <VoiceButton onClick={handleRecording} isRecording={isRecording} />
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg animate-pulse"
            >
              <FaStop size={20} />
              <span>Stop Speaking</span>
            </button>
          )}
        </div>

        {isProcessing && !isSpeaking && (
          <div className="text-center mt-4">
            <p className="text-lg text-gray-700">Processing...</p>
            <div className="animate-pulse bg-blue-200 h-2 w-64 mx-auto mt-2 rounded"></div>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4 max-w-md">
            <p>
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-sm underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto pt-8 relative shadow-lg sm:rounded-lg max-w-6xl w-full">
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
        )}
      </div>

      {modalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Full Text</h2>
              <button
                onClick={() => navigator.clipboard.writeText(modalContent)}
                className="text-blue-500"
              >
                <FaClipboard size={20} />
              </button>
            </div>
            <div className="text-gray-800 whitespace-pre-wrap">
              {renderAnswer(modalContent)}
            </div>
            <button
              onClick={closeModal}
              className="bg-blue-500 text-white font-bold mt-4 py-2 px-4 rounded mx-auto block"
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

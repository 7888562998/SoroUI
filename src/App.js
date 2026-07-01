import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("Hi, I am Soro 🤖");

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isStoppedByUser = false;

    recognition.onresult = async (event) => {
      const userText =
        event.results[event.results.length - 1][0].transcript.toLowerCase();

      setText(userText);

      // 🛑 STOP COMMAND
      if (
        userText.includes("stop") ||
        userText.includes("stop talking") ||
        userText.includes("shut up")
      ) {
        isStoppedByUser = true;
        window.speechSynthesis.cancel();
        setSpeaking(false);
        setReply("Okay, I stopped talking.");
        recognition.stop();
        setListening(false);
        return;
      }

      try {
        const res = await fetch(
          "https://soro-ai-eight.vercel.app/api/v1/chat",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText }),
          }
        );

        const data = await res.json();
        setReply(data.reply);

        speak(data.reply);
      } catch (err) {
        console.log("API error:", err);
      }
    };

    // 🔥 IMPORTANT FIX: restart when Chrome stops recognition
    recognition.onend = () => {
      if (!isStoppedByUser) {
        console.log("Restarting speech recognition...");
        setTimeout(() => {
          try {
            recognition.start();
            setListening(true);
          } catch (e) {}
        }, 300);
      }
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition error:", event.error);

      if (event.error !== "no-speech") {
        try {
          recognition.stop();
          setTimeout(() => recognition.start(), 500);
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;

    // start listening
    recognition.start();
    setListening(true);

    return () => {
      isStoppedByUser = true;
      recognition.stop();
    };
  }, []);

  const speak = (message) => {
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(message);

    setSpeaking(true);

    speech.rate = 1;

    speech.onend = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="robot-container">
      <h1>🤖 Soro AI Robot</h1>

      <div className="face">
        <div className={`eye left ${listening ? "blink" : ""}`}></div>
        <div className={`eye right ${listening ? "blink" : ""}`}></div>

        <div className={`mouth ${speaking ? "talking" : ""}`}></div>
      </div>

      <p className="status">
        {listening ? "🎤 Listening..." : "Starting..."}
      </p>

      <div className="box">
        <p><b>You:</b> {text}</p>
        <p><b>Soro:</b> {reply}</p>
      </div>
    </div>
  );
}

export default App;
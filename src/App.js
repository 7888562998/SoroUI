import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("Hi, I am Soro 🤖");

  const recognitionRef = useRef(null);
  const stoppedByUserRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported on this device/browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

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
        stoppedByUserRef.current = true;

        window.speechSynthesis.cancel();
        recognition.abort();

        setSpeaking(false);
        setListening(false);
        setReply("Okay, I stopped talking.");
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

    recognition.onerror = (event) => {
      console.log("Speech recognition error:", event.error);

      if (event.error !== "no-speech") {
        try {
          recognition.abort();
        } catch { }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      stoppedByUserRef.current = true;
      recognition.abort();
    };
  }, []);

  // ▶️ START
  const startListening = () => {
    try {
      stoppedByUserRef.current = false;
      recognitionRef.current?.start();
      setListening(true);
    } catch (e) {
      console.log("Start error:", e);
    }
  };

  // ⛔ STOP
  const stopListening = () => {
    stoppedByUserRef.current = true;

    recognitionRef.current?.abort();
    window.speechSynthesis.cancel();

    setListening(false);
    setSpeaking(false);
  };

  // 🔊 SPEAK → restart mic ONLY after speech ends
  const speak = (message) => {
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = "en-US";
    speech.rate = 1;

    setSpeaking(true);

    // ⛔ stop mic while speaking
    recognitionRef.current?.abort();
    setListening(false);

    speech.onend = () => {
      setSpeaking(false);

      // 🔁 restart ONLY after speaking finishes
      setTimeout(() => {
        if (!stoppedByUserRef.current) {
          try {
            recognitionRef.current?.start();
            setListening(true);
          } catch (e) {
            console.log("Restart error:", e);
          }
        }
      }, 600);
    };

    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="robot-container">
      <h1>🤖 Soro AI Robot</h1>

      <div className="face">
        <div className={`eye left ${listening ? "blink" : ""}`}></div>
        <div className={`eye right ${listening ? "blink" : ""}`}></div>
        <div className={`mouth ${speaking ? "talking" : ""}`}>
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i}></span>
          ))}
        </div>      </div>

      <p className="status">
        {listening ? "🎤 Listening..." : "⏸️ Stopped"}
      </p>

      <div style={{ margin: "10px" }}>
        <button onClick={startListening} disabled={listening}>
          Start Listening
        </button>

        <button onClick={stopListening} style={{ marginLeft: "10px" }}>
          Stop
        </button>
      </div>

      <div className="box">
        <p><b>You:</b> {text}</p>
        <p><b>Soro:</b> {reply}</p>
      </div>
    </div>
  );
}

export default App;
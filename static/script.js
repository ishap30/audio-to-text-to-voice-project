// ============================================================
// DOM Elements
// ============================================================

const audioFileInput = document.getElementById("audioFile");
const fileBadge = document.getElementById("fileBadge");
const fileName = document.getElementById("fileName");
const transcribeBtn = document.getElementById("transcribeBtn");
const loader = document.getElementById("loader");
const errorMsg = document.getElementById("errorMsg");
const errorText = document.getElementById("errorText");
const resultBox = document.getElementById("resultBox");
const resultContent = document.getElementById("resultContent");
const copyLabel = document.getElementById("copyLabel");
const dropZone = document.getElementById("dropZone");
const micBtn = document.getElementById("micBtn");
const micLabel = document.getElementById("micLabel");
const waveBar = document.getElementById("waveBar");
const ttsInput = document.getElementById("ttsInput");
const ttsBtn = document.getElementById("ttsBtn");
const audioPlayer = document.getElementById("audioPlayer");
const ttsAudio = document.getElementById("ttsAudio");

// ============================================================
// Tab Switching
// ============================================================

function switchTab(tab) {
  // Update tabs
  document.querySelectorAll(".tab").forEach((t, i) => {
    t.classList.remove("active");
    if (
      (tab === "upload" && i === 0) ||
      (tab === "mic" && i === 1) ||
      (tab === "tts" && i === 2)
    ) {
      t.classList.add("active");
    }
  });

  // Update panels
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById("panel-" + tab);
  if (panel) panel.classList.add("active");

  // Hide shared result/loader/error when switching
  hideError();
}

// ============================================================
// File Upload & Drag-Drop
// ============================================================

audioFileInput.addEventListener("change", () => {
  if (audioFileInput.files.length > 0) {
    fileName.textContent = audioFileInput.files[0].name;
    fileBadge.classList.add("show");
    transcribeBtn.disabled = false;
  }
});

// Drag & Drop
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  if (e.dataTransfer.files.length > 0) {
    audioFileInput.files = e.dataTransfer.files;
    fileName.textContent = e.dataTransfer.files[0].name;
    fileBadge.classList.add("show");
    transcribeBtn.disabled = false;
  }
});

// ============================================================
// Audio Upload -> Whisper Transcription
// ============================================================

async function uploadAudio() {
  const file = audioFileInput.files[0];
  if (!file) return;

  showLoader();
  hideError();
  hideResult();
  transcribeBtn.disabled = true;

  const formData = new FormData();
  formData.append("audio", file);

  try {
    const response = await fetch("/transcribe", {
      method: "POST",
      body: formData,
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Server returned invalid response");
    }

    if (data.error) {
      throw new Error(data.error);
    }

    hideLoader();
    showResult(data.text);
  } catch (error) {
    hideLoader();
    showError(error.message || "Error processing audio");
  } finally {
    transcribeBtn.disabled = false;
  }
}

// ============================================================
// Live Microphone (Web Speech API)
// ============================================================

let recognition = null;
let recording = false;

function toggleMic() {
  if (!recording) {
    startSpeech();
  } else {
    stopSpeech();
  }
}

function startSpeech() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showError("Speech recognition is not supported in this browser");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  micBtn.classList.add("recording");
  waveBar.classList.add("show");
  micLabel.textContent = "Listening... Tap to stop";

  recognition.onresult = function (event) {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    showResult(transcript);
  };

  recognition.onerror = function (event) {
    showError("Mic error: " + event.error);
    stopSpeech();
  };

  recognition.onend = function () {
    if (recording) {
      // Restart if still recording (browser may auto-stop)
      recognition.start();
    }
  };

  recognition.start();
  recording = true;
}

function stopSpeech() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  micBtn.classList.remove("recording");
  waveBar.classList.remove("show");
  micLabel.textContent = "Tap to start recording";
  recording = false;
}

// ============================================================
// Text to Speech (via backend /tts)
// ============================================================

async function textToSpeech() {
  const text = ttsInput.value.trim();
  if (!text) return;

  showLoader();
  hideError();
  ttsBtn.disabled = true;

  try {
    const response = await fetch("/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text }),
    });

    if (!response.ok) {
      throw new Error("TTS generation failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    ttsAudio.src = url;
    audioPlayer.classList.add("show");
    ttsAudio.play();

    hideLoader();
  } catch (error) {
    hideLoader();
    showError(error.message || "Error generating speech");
  } finally {
    ttsBtn.disabled = false;
  }
}

// ============================================================
// Speak result using browser TTS
// ============================================================

function speakResult() {
  const text = resultContent.innerText;
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

// ============================================================
// Copy to clipboard
// ============================================================

function copyText() {
  const text = resultContent.innerText;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    copyLabel.textContent = "Copied!";
    setTimeout(() => (copyLabel.textContent = "Copy"), 2000);
  });
}

// ============================================================
// Typewriter effect
// ============================================================

function typeWriter(el, text) {
  el.innerText = "";
  let i = 0;

  function type() {
    if (i < text.length) {
      el.innerText += text.charAt(i);
      i++;
      setTimeout(type, 12);
    }
  }

  type();
}

// ============================================================
// UI Helpers
// ============================================================

function showLoader() {
  loader.classList.add("show");
}

function hideLoader() {
  loader.classList.remove("show");
}

function showError(msg) {
  errorText.textContent = msg;
  errorMsg.classList.add("show");
}

function hideError() {
  errorMsg.classList.remove("show");
}

function showResult(text) {
  resultBox.classList.add("show");
  typeWriter(resultContent, text);
}

function hideResult() {
  resultBox.classList.remove("show");
  resultContent.innerText = "";
}

from flask import Flask, render_template, request, jsonify, send_file
import whisper
from gtts import gTTS
import uuid
import os
import tempfile

app = Flask(__name__)

# Create a temp directory for uploaded/generated files
UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "isha_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

model = whisper.load_model("small")

@app.route("/")
def home():
    return render_template("index.html")

# AUDIO → TEXT
@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        file = request.files["audio"]
        filename = os.path.join(UPLOAD_DIR, file.filename)
        file.save(filename)

        result = model.transcribe(filename)

        # Cleanup uploaded file
        if os.path.exists(filename):
            os.remove(filename)

        return jsonify({"text": result["text"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# TEXT → AUDIO
@app.route("/tts", methods=["POST"])
def text_to_speech():
    try:
        text = request.json["text"]
        filename = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.mp3")

        tts = gTTS(text)
        tts.save(filename)

        return send_file(filename, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860, debug=True)

import os
import tempfile
from pathlib import Path
from typing import Optional

import edge_tts
import translators as ts
import whisper
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="Voice Translator API",
    description="Real-time voice translation between Arabic and Chinese",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WHISPER_MODEL = None
AUDIO_DIR = Path("audio_cache")
AUDIO_DIR.mkdir(exist_ok=True)


def get_whisper_model():
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        model_size = os.getenv("WHISPER_MODEL", "tiny")
        WHISPER_MODEL = whisper.load_model(model_size)
    return WHISPER_MODEL


class TranslationRequest(BaseModel):
    text: str
    source_lang: str = "ar"
    target_lang: str = "zh"


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str


@app.get("/")
async def root():
    return {
        "message": "Voice Translator API",
        "version": "1.0.0",
        "endpoints": {
            "translate_text": "/api/translate",
            "speech_to_text": "/api/stt",
            "text_to_speech": "/api/tts",
            "health": "/api/health"
        }
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "model": os.getenv("WHISPER_MODEL", "tiny")}


@app.post("/api/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    try:
        lang_map = {"ar": "ar", "zh": "zh", "en": "en"}
        source = lang_map.get(request.source_lang, "ar")
        target = lang_map.get(request.target_lang, "zh")

        translated = ts.translate_text(
            request.text,
            translator="google",
            from_language=source,
            to_language=target
        )

        return TranslationResponse(
            original_text=request.text,
            translated_text=translated,
            source_lang=source,
            target_lang=target
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    language: Optional[str] = None
):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        model = get_whisper_model()

        options = {}
        if language:
            options["language"] = language

        result = model.transcribe(tmp_path, **options)

        os.unlink(tmp_path)

        return {
            "text": result["text"],
            "language": result.get("language", "unknown"),
            "segments": len(result.get("segments", []))
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/tts")
async def text_to_speech(text: str, lang: str = "zh"):
    try:
        voice_map = {
            "zh": "zh-CN-XiaoxiaoNeural",
            "ar": "ar-SA-ZariyahNeural",
            "en": "en-US-JennyNeural"
        }

        voice = voice_map.get(lang, "zh-CN-XiaoxiaoNeural")

        communicate = edge_tts.Communicate(text, voice)

        output_path = AUDIO_DIR / f"{hash(text)}_{lang}.mp3"

        await communicate.save(str(output_path))

        return FileResponse(
            path=str(output_path),
            media_type="audio/mpeg",
            filename="speech.mp3"
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.websocket("/ws/translate")
async def websocket_translate(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "audio":
                audio_data = data.get("audio")
                source_lang = data.get("source_lang", "ar")
                target_lang = data.get("target_lang", "zh")

                import base64
                audio_bytes = base64.b64decode(audio_data)

                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name

                model = get_whisper_model()
                result = model.transcribe(tmp_path, language=source_lang)
                os.unlink(tmp_path)

                original_text = result["text"]

                lang_map = {"ar": "ar", "zh": "zh", "en": "en"}
                translated = ts.translate_text(
                    original_text,
                    translator="google",
                    from_language=lang_map.get(source_lang, "ar"),
                    to_language=lang_map.get(target_lang, "zh")
                )

                await websocket.send_json({
                    "type": "translation",
                    "original": original_text,
                    "translated": translated,
                    "source_lang": source_lang,
                    "target_lang": target_lang
                })

            elif data.get("type") == "text":
                text = data.get("text")
                source_lang = data.get("source_lang", "ar")
                target_lang = data.get("target_lang", "zh")

                lang_map = {"ar": "ar", "zh": "zh", "en": "en"}
                translated = ts.translate_text(
                    text,
                    translator="google",
                    from_language=lang_map.get(source_lang, "ar"),
                    to_language=lang_map.get(target_lang, "zh")
                )

                await websocket.send_json({
                    "type": "translation",
                    "original": text,
                    "translated": translated,
                    "source_lang": source_lang,
                    "target_lang": target_lang
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

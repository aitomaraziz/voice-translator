# Voice Translator - مترجم الصوت

تطبيق ترجمة صوتية فورية بين الطلاب العرب والصينيين.

## Features - المميزات

- **ترجمة صوتية فورية**: تحدث بلغتك واحصل على الترجمة فوراً
- **دعم العربية والصينية**: ترجمة بين العربية والماندرين
- **واجهة بسيطة**: تصميم سهل الاستخدام
- **Push-to-Talk**: اضغط واحتفظ للتحدث
- **عرض النص والصوت معاً**: يعرض النص الأصلي والمترجم وي تشغيل الصوت
- **كشف اللغة التلقائي**: البرنامج يفهم لغتك تلقائياً
- **تبديل اللغات**: تبديل سريع بين اللغات
- **يعمل على جميع الأجهزة**: موبايل، تابلت، كمبيوتر

## Tech Stack - التقنيات

### Backend
- **FastAPI**: واجهة برمجية سريعة
- **OpenAI Whisper**: تحويل الصوت إلى نص (مجاني)
- **Edge TTS**: تحويل النص إلى صوت (مجاني)
- **translators**: ترجمة نصوص (مجاني)

### Frontend
- **Flutter**: تطبيق جوال يعمل على Android و iOS
- **WebSocket**: اتصال مباشر للترجمة الفورية

## Installation - التثبيت

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

### Frontend

```bash
cd frontend

# Install dependencies
flutter pub get

# Run the app
flutter run
```

## Docker Deployment

```bash
cd backend

# Build Docker image
docker build -t voice-translator-api .

# Run container
docker run -p 8000:8000 voice-translator-api
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/api/health` | Health check |
| POST | `/api/translate` | Translate text |
| POST | `/api/stt` | Speech to text |
| POST | `/api/tts` | Text to speech |
| WS | `/ws/translate` | WebSocket translation |

## Environment Variables

Create `.env` file in backend directory:

```env
WHISPER_MODEL=tiny
HOST=0.0.0.0
PORT=8000
```

## Whisper Model Sizes

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | ~75 MB | Very Fast | Low |
| base | ~140 MB | Fast | Medium |
| small | ~460 MB | Moderate | Good |
| medium | ~1.5 GB | Slow | Better |
| large-v3 | ~3 GB | Slowest | Best |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [Edge TTS](https://github.com/rany2/edge-tts) - Text to speech
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [Flutter](https://flutter.dev/) - Mobile framework

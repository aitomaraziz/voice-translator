# دليل البدء السريع - Quick Start Guide

## المتطلبات

- Python 3.8+
- Flutter SDK 3.0+
- Docker (اختياري)

## خطوات التشغيل

### 1. تشغيل Backend

```bash
# الانتقال لمجلد Backend
cd backend

# إنشاء بيئة افتراضية
python -m venv venv

# تفعيل البيئة الافتراضية
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# تثبيت المتطلبات
pip install -r requirements.txt

# تشغيل الخادم
python main.py
```

الخادم يعمل على: http://localhost:8000

### 2. تشغيل Frontend

```bash
# الانتقال لمجلد Frontend
cd frontend

# تثبيت المتطلبات
flutter pub get

# تشغيل التطبيق
flutter run
```

### 3. باستخدام Docker (اختياري)

```bash
# بناء وتشغيل الحاويات
docker-compose up --build
```

## اختبار API

### الترجمة

```bash
curl -X POST http://localhost:8000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا", "source_lang": "ar", "target_lang": "zh"}'
```

### التحقق من الصحة

```bash
curl http://localhost:8000/api/health
```

## ملاحظات

- استخدم `tiny` model للسرعة (أقل دقة)
- استخدم `large-v3` لأعلى دقة (أبطأ)
- التطبيق يحتاج اتصال بالإنترنت للترجمة
- الصوت المحفوظ مؤقتاً في `audio_cache/`

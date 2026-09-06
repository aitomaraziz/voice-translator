# 📱 مترجم صوتي فوري تلقائي (Voice Translator)

## 1. ما هو البرنامج

تطبيق **ويب أحادي الملف** (Single-File HTML) للترجمة الصوتية **الفورية التلقائية** بين **العربية والصينية والإنجليزية**، يعمل بالكامل داخل المتصفح **بدون خادم وبدون مفاتيح API**. الهدف: طلاب يتحدثون بلغات مختلفة ويتواصلون مباشرة — يتكلم أحدهم، فيُترجم كلامه تلقائياً نصاً وصوتاً بلغة الطرف الآخر.

## 2. متطلبات التشغيل

- متصفح **Chrome أو Edge** (النسخ الحديثة) — ضروري لأنها تدعم Web Speech API
- اتصال بالإنترنت (للترجمة ولصوت Microsoft)
- لا يحتاج: خادم، قاعدة بيانات، تثبيت، مفاتيح، حسابات

## 3. الملفات

| الملف | الوظيفة |
|---|---|
| `index.html` | التطبيق كاملاً (HTML + CSS + JS) في ملف واحد |
| `README.md` | توثيق أساسي |
| `backend/` | (قديم/غير مستخدم) خادم FastAPI – Whisper + edge-tts |
| `.github/workflows/ci.yml` | نشر تلقائي على GitHub Pages |

## 4. الخدمات الخارجية المستخدمة (كلها مجانية)

| الخدمة | الغرض | التفاصيل |
|---|---|---|
| **Web Speech API** `SpeechRecognition` | تعرف صوتي على الكلام | `continuous=true`, `interimResults=true`, `lang` = لغة المصدر |
| **MyMemory API** | الترجمة | `https://api.mymemory.translated.net/get?q=TEXT&langpair=ar|zh-CN` |
| **Microsoft Edge TTS (WebSocket)** | نطق الترجمة | غير Google تماماً، مجاني، بدون مفتاح |
| **speechSynthesis** | احتياط للصوت المحلي | أصوات المتصفح المثبتة |

## 5. اللغات (3)

- **العربية** `ar` 🇸🇦
- **الصينية** `zh-CN` 🇨🇳
- **الإنجليزية** `en` 🇺🇸

واجهة المستخدم نفسها قابلة للتبديل بين اللغات الثلاث.

## 6. دورة العمل (Flow)

```
1. المستخدم يضغط "ابدأ الآن 🚀" (شاشة الغطاء الأولى)
   → getUserMedia لطلب إذن الميكروفون (ضروري لسياسة المتصفح)
2. recognizer يبدأ الاستماع المستمر (continuous)
3. المستخدم يتكلم بلغة المصدر (المختارة يدوياً أعلاه)
4. عند نطق جملة كاملة (isFinal):
   - تُعرض فوراً كنص في بطاقة "ما قلته"
   - تُرسل إلى MyMemory للترجمة
   - النص المترجم يُعرض في بطاقة "الترجمة"
   - تُنطق الترجمة فوراً عبر TTS
5. recognizer يعيد التشغيل تلقائياً (auto-restart) فور انتهاء كل جملة
6. يُحفظ آخر 8 ترجمات في سجل التاريخ
```

## 7. مكونات الصوت (TTS) — بالسلسلة

**الترتيب:** (1) Microsoft Edge TTS → (2) الصوت المحلي.

### Microsoft Edge TTS (فئة `edgeSpeak`):
- WebSocket إلى:
  `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=...&Sec-MS-GEC-Version=2024-11-09&ConnectionId=...`
- **رمز `Sec-MS-GEC` إلزامي**: يُحسب من `windowsTicks` (وحدة 300 ثانية) + رمز العميل عبر SHA-256 (سداسي عشري بأحرف كبيرة). بدونه يغلق الخادم الاتصال بصمت.
- إرسال رسالتين نصيتين:
  - `Path:speech.config` مع outputFormat: `audio-24khz-48kbitrate-mono-mp3`
  - `Path:ssml` بصيغة `<speak><voice name=...><prosody>`
- **الأصوات (ببدائل تلقائية):**
  - العربية: `ar-EG-SalmaNeural` ← `ar-SA-HamedNeural` ← `ar-EG-ShakirNeural`
  - الصينية: `zh-CN-XiaoxiaoNeural` ← `zh-CN-YunxiNeural`
  - الإنجليزية: `en-US-AriaNeural` ← `en-GB-SoniaNeural`
- استقبال إطارات ثنائية تحتوي `Path:audio\r\n` → تجميعها → `Blob` بصيغة `audio/mpeg` → تشغيل عبر `<audio>`
- تنتهي عند `Path:turn.end`؛ تُرجع `true` فقط إذا بدأ الصوت فعلياً وتم التحقق بـ `playChunks`

### الاحتياط المحلي (`speak` + `pickVoice`):
- إن فشل Edge، يبحث `pickVoice` عن صوت مطابق للغة في `speechSynthesis.getVoices()` (بانطاقات دقيقة، ثم prefix، ثم أسماء عربية مثل Zira/Salma) ويُنطق بها.

## 8. التعرف على الكلام (`initRec`)

- `rec.continuous = true`, `interimResults = true`, `maxAlternatives = 1`
- **عرض فوري للنص المرحلي** (interim) أثناء الكلام لتغذية راجعة سريعة
- عند `isFinal` وعدم التكرار: ترجمة فورية `translate(...)`
- `onend`: إذا `autoListen` → إعادة تشغيل تلقائية بعد 150ms
- `onerror`: `no-speech` (تجاهل)، `not-allowed` (رسالة رفض الميكروفون)
- عند تغيير لغة المصدر أثناء العمل → يعيد تشغيل المستمع فوراً

## 9. واجهة المستخدم (Layout)

- شاشة بدء كاملة الشاشة: 🎤 كبيرة نابضة + زر "ابدأ الآن 🚀" (بثلاث لغات)
- شريط العلاقة: مبدّل لغة الواجهة (العربية/中文/English)
- صندوق اختيار "أنا أتحدث" (المصدر) + زر تبديل ⇄ + "ترجم إلى" (الهدف)
- شريط الحالة: نقطة + نص (جاهز/أستمع/يعمل تلقائياً + مؤشر 🔊/🔇)
- زر ميكروفون كبير 🎤 للتبديل اليدوي تشغيل/إيقاف
- بطاقتا "ما قلته" و"الترجمة" مع سهم بينهما وزر 🔊 لإعادة نطق آخر ترجمة
- سجل "آخر الترجمات" (8 عناصر، مع أعلام اللغات)
- تذييل
- تصميم داكن (تدرج كحلي-أسود) بتخطيط RTL أقصى عرض 480px، خط Noto Sans Arabic

## 10. المنطق الرئيسي (Key Functions)

| الدالة | الوظيفة |
|---|---|
| `setUI(lang)` | تبديل لغة الواجهة عبر قاموس `I18N` (ar/zh/en) |
| `initRec()` | إعداد المستمع + أحداث onstart/onend/onresult/onerror |
| `translate(text, from, to)` | MyMemory API ثم نطق النتيجة |
| `edgeSpeak(text, lang)` | صوت Microsoft عبر WebSocket (تُرجع `true` عند التشغيل) |
| `speak(text, lang)` | Edge أولاً ثم محلي كاحتياط |
| `pickVoice(lang)` | اختيار صوت محلي مطابق |
| `start()` / `stop()` | تشغيل/إيقاف الاستماع المستمر |
| `beginAuto()` | شاشة البداية: إذن الميكروفون → استماع تلقائي |
| `addHist(...)` | سجل الترجمات (حد أقصى 8) |

## 11. قيود معروفة مهمة (حساسة)

1. **التعرف على الصينية**: Web Speech API يتطلب `rec.lang = 'zh-CN'`؛ لا يوجد كشف صوتي تلقائي للغة — لهذا المصدر يُختار يدوياً من القائمة.
2. **استحالة تشغيل عدة recognizers معاً** (سببت سابقاً حلقة start/end لا نهائية) — استُخدم recognizer واحد فقط.
3. **الاستماع المستمر**: Chrome يعيد استماعاً من تلقاء نفسه؛ `autoListen` يحافظ عليه بإعادة البدء.
4. **الصوت العربي المحلي**: إن احتجت الاحتياط، لا بد من تثبيت حزمة صوت عربي على Windows، لكن Edge TTS يغني عن هذا نهائياً.
5. **Google محجوب/غير مستخدم**: الكود الحالي خالٍ تماماً من أي استدعاء لـ Google (إزالة سابقة متعمدة).

## 12. النشر

- مستودع GitHub: `https://github.com/aitomaraziz/voice-translator`
- النشر: GitHub Pages على الفرع `master` مباشرة → `https://aitomaraziz.github.io/voice-translator/`
- `git add .` + `git commit` + `git push origin master`

## 13. التاريخ (نقلة النطاق)

- بدأ كـ FastAPI + Flutter، ثم تحول إلى ويب client-side بالكامل
- مرّ بمراحل: push-to-talk → كشف لغة بالحروف Unicode → 3-recognizers (فشل) → دوران تلقائي → محددّا المصدر/الهدف → الاستماع المستمر والإصدار النهائي بـ Edge TTS
class VoiceTranslator {
    constructor() {
        this.serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:8000';
        this.autoPlay = localStorage.getItem('autoPlay') !== 'false';
        this.myLanguage = localStorage.getItem('myLanguage') || 'ar';
        this.otherLanguage = localStorage.getItem('otherLanguage') || 'zh';
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.ws = null;
        this.currentAudio = null;

        this.initElements();
        this.initEventListeners();
        this.loadSettings();
        this.connectWebSocket();
        this.checkMicrophonePermission();
    }

    initElements() {
        this.talkBtn = document.getElementById('talkBtn');
        this.myLanguageSelect = document.getElementById('myLanguage');
        this.otherLanguageSelect = document.getElementById('otherLanguage');
        this.swapBtn = document.getElementById('swapBtn');
        this.originalText = document.getElementById('originalText');
        this.translatedText = document.getElementById('translatedText');
        this.originalLangBadge = document.getElementById('originalLangBadge');
        this.translatedLangBadge = document.getElementById('translatedLangBadge');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.playBtn = document.getElementById('playBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModal = document.getElementById('closeModal');
        this.serverUrlInput = document.getElementById('serverUrl');
        this.autoPlayToggle = document.getElementById('autoPlay');
        this.saveSettingsBtn = document.getElementById('saveSettings');
    }

    initEventListeners() {
        // Talk button - Press and hold
        this.talkBtn.addEventListener('mousedown', () => this.startRecording());
        this.talkBtn.addEventListener('mouseup', () => this.stopRecording());
        this.talkBtn.addEventListener('mouseleave', () => this.stopRecording());

        // Touch events for mobile
        this.talkBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.talkBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        // Keyboard - Space bar
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isRecording) {
                e.preventDefault();
                this.startRecording();
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isRecording) {
                e.preventDefault();
                this.stopRecording();
            }
        });

        // Language selection
        this.myLanguageSelect.addEventListener('change', () => {
            this.myLanguage = this.myLanguageSelect.value;
            this.updateLanguageBadges();
            localStorage.setItem('myLanguage', this.myLanguage);
        });

        this.otherLanguageSelect.addEventListener('change', () => {
            this.otherLanguage = this.otherLanguageSelect.value;
            this.updateLanguageBadges();
            localStorage.setItem('otherLanguage', this.otherLanguage);
        });

        // Swap languages
        this.swapBtn.addEventListener('click', () => this.swapLanguages());

        // Play button
        this.playBtn.addEventListener('click', () => this.playLastTranslation());

        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeModal.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

        // Close modal on outside click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
    }

    async checkMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.updateConnectionStatus('mic-ready', '麦克风 جاهز');
        } catch (err) {
            this.updateConnectionStatus('mic-error', 'يجب السماح بالوصول للميكروفون');
        }
    }

    connectWebSocket() {
        try {
            const wsUrl = this.serverUrl.replace('http', 'ws') + '/ws/translate';
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.updateConnectionStatus('connected', 'متصل بالخادم');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleTranslation(data);
            };

            this.ws.onclose = () => {
                this.updateConnectionStatus('disconnected', 'غير متصل - إعادة الاتصال...');
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.ws.onerror = (err) => {
                this.updateConnectionStatus('error', 'خطأ في الاتصال بالخادم');
            };
        } catch (err) {
            this.updateConnectionStatus('error', 'خطأ في إعداد الاتصال');
        }
    }

    updateConnectionStatus(status, text) {
        const statusEl = this.connectionStatus;
        const dot = statusEl.querySelector('.status-dot');
        const statusText = statusEl.querySelector('.status-text');

        dot.className = 'status-dot';
        if (status === 'connected' || status === 'mic-ready') {
            dot.classList.add('connected');
        }
        statusText.textContent = text;
    }

    async startRecording() {
        if (this.isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processAudio();
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            this.talkBtn.classList.add('recording');
            this.talkBtn.querySelector('.talk-text').textContent = 'جاري التسجيل...';
            this.originalText.textContent = 'جاري الاستماع...';
            this.translatedText.textContent = '...';

        } catch (err) {
            console.error('Error starting recording:', err);
            this.originalText.textContent = 'خطأ في بدء التسجيل';
        }
    }

    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;

        this.mediaRecorder.stop();
        this.isRecording = false;
        this.talkBtn.classList.remove('recording');
        this.talkBtn.querySelector('.talk-text').textContent = 'اضغط للتحدث';
        this.originalText.textContent = 'جاري المعالجة...';
    }

    async processAudio() {
        if (this.audioChunks.length === 0) return;

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onload = async () => {
            const base64Audio = reader.result.split(',')[1];

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'audio',
                    audio: base64Audio,
                    source_lang: this.myLanguage,
                    target_lang: this.otherLanguage
                }));
            } else {
                // Fallback to REST API
                await this.sendAudioREST(audioBlob);
            }
        };

        reader.readAsDataURL(audioBlob);
    }

    async sendAudioREST(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('language', this.myLanguage);

            // First: Speech to Text
            const sttResponse = await fetch(`${this.serverUrl}/api/stt`, {
                method: 'POST',
                body: formData
            });

            if (!sttResponse.ok) throw new Error('STT failed');

            const sttData = await sttResponse.json();
            const originalText = sttData.text;

            this.originalText.textContent = originalText;

            // Second: Translate
            const translateResponse = await fetch(`${this.serverUrl}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: originalText,
                    source_lang: this.myLanguage,
                    target_lang: this.otherLanguage
                })
            });

            if (!translateResponse.ok) throw new Error('Translation failed');

            const translateData = await translateResponse.json();
            this.translatedText.textContent = translateData.translated_text;

            // Third: Text to Speech
            if (this.autoPlay) {
                await this.playTranslation(translateData.translated_text);
            }

        } catch (err) {
            console.error('Error in REST API:', err);
            this.translatedText.textContent = 'خطأ في الترجمة - تحقق من اتصال الخادم';
        }
    }

    handleTranslation(data) {
        if (data.type === 'translation') {
            this.originalText.textContent = data.original;
            this.translatedText.textContent = data.translated;
            this.lastTranslation = data.translated;

            if (this.autoPlay && data.translated) {
                this.playTranslation(data.translated);
            }
        }
    }

    async playTranslation(text) {
        if (!text) return;

        try {
            const response = await fetch(
                `${this.serverUrl}/api/tts?text=${encodeURIComponent(text)}&lang=${this.otherLanguage}`
            );

            if (!response.ok) throw new Error('TTS failed');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            if (this.currentAudio) {
                this.currentAudio.pause();
                URL.revokeObjectURL(this.currentAudio.src);
            }

            this.currentAudio = new Audio(audioUrl);
            this.playBtn.classList.add('visible');

            this.currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };

            await this.currentAudio.play();

        } catch (err) {
            console.error('Error playing audio:', err);
        }
    }

    playLastTranslation() {
        if (this.lastTranslation) {
            this.playTranslation(this.lastTranslation);
        }
    }

    swapLanguages() {
        const temp = this.myLanguage;
        this.myLanguage = this.otherLanguage;
        this.otherLanguage = temp;

        this.myLanguageSelect.value = this.myLanguage;
        this.otherLanguageSelect.value = this.otherLanguage;

        localStorage.setItem('myLanguage', this.myLanguage);
        localStorage.setItem('otherLanguage', this.otherLanguage);

        this.updateLanguageBadges();

        // Swap displayed text too
        const tempText = this.originalText.textContent;
        this.originalText.textContent = this.translatedText.textContent;
        this.translatedText.textContent = tempText;
    }

    updateLanguageBadges() {
        const langNames = {
            'ar': 'العربية',
            'zh': '中文',
            'en': 'English'
        };

        this.originalLangBadge.textContent = langNames[this.myLanguage] || this.myLanguage;
        this.translatedLangBadge.textContent = langNames[this.otherLanguage] || this.otherLanguage;
    }

    openSettings() {
        this.serverUrlInput.value = this.serverUrl;
        this.autoPlayToggle.checked = this.autoPlay;
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    saveSettings() {
        this.serverUrl = this.serverUrlInput.value;
        this.autoPlay = this.autoPlayToggle.checked;

        localStorage.setItem('serverUrl', this.serverUrl);
        localStorage.setItem('autoPlay', this.autoPlay);

        this.closeSettings();
        this.connectWebSocket();
    }

    loadSettings() {
        this.updateLanguageBadges();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceTranslator();
});

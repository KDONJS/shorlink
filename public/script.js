class ShorLinkApp {
    constructor() {
        this.apiBase = null; // Se cargará dinámicamente
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.bindEvents();
        this.setupValidation();
        this.addAnimations();
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            this.apiBase = config.baseUrl;
        } catch (error) {
            console.error('Error loading config:', error);
            // Fallback al valor por defecto
            this.apiBase = 'http://localhost:3000';
        }
    }

    bindEvents() {
        const shortenBtn = document.getElementById('shortenBtn');
        const urlInput = document.getElementById('urlInput');
        const toggleAdvanced = document.getElementById('toggleAdvanced');
        const copyBtn = document.getElementById('copyBtn');

        shortenBtn.addEventListener('click', () => this.shortenUrl());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.shortenUrl();
        });
        toggleAdvanced.addEventListener('click', () => this.toggleAdvancedOptions());
        copyBtn.addEventListener('click', () => this.copyToClipboard());
        
        // Efectos de hover mejorados
        this.addHoverEffects();
    }

    addAnimations() {
        // Animación de entrada para elementos
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        });

        document.querySelectorAll('.url-shortener, .ad-space').forEach(el => {
            observer.observe(el);
        });
    }

    addHoverEffects() {
        // Efecto de partículas en botones (opcional)
        document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                this.createRipple(e);
            });
        });
    }

    createRipple(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupValidation() {
        const urlInput = document.getElementById('urlInput');
        urlInput.addEventListener('input', () => this.validateUrl());
    }

    validateUrl() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (url && !this.isValidUrl(url)) {
            urlInput.style.borderColor = 'var(--error-color)';
            urlInput.style.boxShadow = '0 0 0 3px rgba(255, 59, 48, 0.1)';
            return false;
        } else {
            urlInput.style.borderColor = 'var(--border-color)';
            urlInput.style.boxShadow = 'var(--shadow-sm)';
            return true;
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    toggleAdvancedOptions() {
        const advancedOptions = document.querySelector('.advanced-options');
        const toggleBtn = document.getElementById('toggleAdvanced');
        
        if (advancedOptions.style.display === 'none') {
            advancedOptions.style.display = 'block';
            advancedOptions.classList.add('slide-up');
            toggleBtn.textContent = 'Ocultar opciones';
        } else {
            advancedOptions.style.display = 'none';
            toggleBtn.textContent = 'Opciones avanzadas';
        }
    }

    async shortenUrl() {
        const urlInput = document.getElementById('urlInput');
        const customCodeInput = document.getElementById('customCode');
        const shortenBtn = document.getElementById('shortenBtn');
        const btnText = shortenBtn.querySelector('.btn-text');
        const loadingSpinner = shortenBtn.querySelector('.loading-spinner');
        const errorMessage = document.getElementById('errorMessage');
        const resultSection = document.getElementById('resultSection');

        const url = urlInput.value.trim();
        const customCode = customCodeInput.value.trim();

        // Validación
        if (!url) {
            this.showError('Por favor, ingresa una URL');
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showError('Por favor, ingresa una URL válida');
            return;
        }

        // UI Loading state con animación
        shortenBtn.disabled = true;
        btnText.style.display = 'none';
        loadingSpinner.style.display = 'block';
        errorMessage.style.display = 'none';
        resultSection.style.display = 'none';
        
        // Efecto de pulsación
        shortenBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            shortenBtn.style.transform = '';
        }, 150);

        try {
            const payload = { url };
            if (customCode) {
                payload.customCode = customCode;
            }

            const response = await fetch(`${this.apiBase}/api/shorten`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al acortar la URL');
            }

            this.showResult(data);
            this.clearInputs();
            this.celebrateSuccess();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error de conexión. Verifica que el servidor esté ejecutándose.');
        } finally {
            // Reset UI
            shortenBtn.disabled = false;
            btnText.style.display = 'block';
            loadingSpinner.style.display = 'none';
        }
    }

    celebrateSuccess() {
        // Pequeña animación de éxito
        const resultCard = document.querySelector('.result-card');
        if (resultCard) {
            resultCard.style.transform = 'scale(1.02)';
            setTimeout(() => {
                resultCard.style.transform = 'scale(1)';
            }, 200);
        }
    }

    showResult(data) {
        const resultSection = document.getElementById('resultSection');
        const shortUrlInput = document.getElementById('shortUrl');
        const clickCount = document.getElementById('clickCount');
        const createdDate = document.getElementById('createdDate');

        const shortUrl = `${window.location.origin}/${data.shortCode}`;
        shortUrlInput.value = shortUrl;
        clickCount.textContent = `${data.clicks || 0} clicks`;
        createdDate.textContent = new Date(data.createdAt).toLocaleDateString('es-ES');

        resultSection.style.display = 'block';
        resultSection.classList.add('slide-up');
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.classList.add('slide-up');
        errorMessage.scrollIntoView({ behavior: 'smooth' });
        
        // Vibración en móviles
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    }

    clearInputs() {
        document.getElementById('urlInput').value = '';
        document.getElementById('customCode').value = '';
    }

    async copyToClipboard() {
        const shortUrlInput = document.getElementById('shortUrl');
        const copyBtn = document.getElementById('copyBtn');
        const originalText = copyBtn.textContent;

        try {
            await navigator.clipboard.writeText(shortUrlInput.value);
            copyBtn.textContent = '¡Copiado!';
            copyBtn.style.background = 'var(--success-color)';
            
            // Efecto de éxito
            copyBtn.style.transform = 'scale(1.05)';
            setTimeout(() => {
                copyBtn.style.transform = 'scale(1)';
            }, 150);
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
            
            // Vibración de éxito
            if (navigator.vibrate) {
                navigator.vibrate([50, 50, 50]);
            }
            
        } catch (err) {
            console.error('Error al copiar:', err);
            // Fallback
            shortUrlInput.select();
            document.execCommand('copy');
            copyBtn.textContent = '¡Copiado!';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    }
}

// CSS para animación de ripple
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicializar la aplicación
// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShorLinkApp();
    
    // Privacy modal event listeners
    const privacyLink = document.getElementById('privacyLink');
    const closeModal = document.getElementById('closeModal');
    
    if (privacyLink) {
        privacyLink.addEventListener('click', (e) => {
            e.preventDefault();
            openPrivacyModal();
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closePrivacyModal);
    }
});

// Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registrado: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW falló: ', registrationError);
            });
    });
}


// Modal functions
function openPrivacyModal() {
    document.getElementById('privacyModal').style.display = 'block';
}

function closePrivacyModal() {
    document.getElementById('privacyModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('privacyModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// AdSense initialization
if (typeof adsbygoogle !== 'undefined') {
    (adsbygoogle = window.adsbygoogle || []).push({});
}

// Make functions globally available
window.openPrivacyModal = openPrivacyModal;
window.closePrivacyModal = closePrivacyModal;
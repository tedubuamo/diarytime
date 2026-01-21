class PhotoBooth {
    constructor() {
        // --- DOM ELEMENTS ---
        this.video = document.getElementById('camera');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.finalCanvas = document.getElementById('final-canvas');
        this.previewDisplay = document.getElementById('preview-display');
        
        // Buttons
        this.captureBtn = document.getElementById('capture-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.previewBtn = document.getElementById('preview-btn');
        this.downloadBtn = document.getElementById('download-btn');
        
        // INPUTS
        this.uploadPhotoBtn = document.getElementById('upload-photo-btn');
        this.photoFileInput = document.getElementById('photo-file-input');
        this.switchCameraBtn = document.getElementById('switch-camera-btn');

        // Sidebar & Background
        this.photoStrip = document.getElementById('photo-strip');
        this.bgUploadInput = document.getElementById('bg-upload');
        this.bgUploadBtnTrigger = document.querySelector('.upload-btn');
        
        // Modal Preview
        this.previewModal = document.getElementById('preview-modal');
        this.closePreviewBtn = document.getElementById('close-preview');
        this.backBtn = document.getElementById('back-btn');
        this.confirmDownloadBtn = document.getElementById('confirm-download');

        // Cropper
        this.cropModal = document.getElementById('crop-modal');
        this.imageToCrop = document.getElementById('image-to-crop');
        this.cropConfirmBtn = document.getElementById('crop-confirm-btn');
        this.closeCropBtn = document.getElementById('close-crop');
        this.cropper = null;

        // --- STATE ---
        this.stream = null;
        this.photos = [];
        this.currentTemplate = 'single';
        this.currentBackground = { type: 'solid-blue', data: '#6c5ce7' };
        this.maxPhotos = 1;
        
        // Default Facing Mode
        this.facingMode = 'user'; 

        this.init();
    }

    async init() {
        await this.setupCamera();
        this.attachEventListeners();
    }

    // ==========================================
    // LOGIKA KAMERA (SAFARI FIX)
    // ==========================================
    async setupCamera() {
        // 1. Matikan stream lama (Wajib untuk switch camera)
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Konfigurasi dasar berdasarkan mode saat ini
        let constraintsBase = {};
        if (this.facingMode === 'environment') {
            constraintsBase = { exact: 'environment' };
        } else {
            constraintsBase = 'user';
        }

        // TAHAP 1: Coba Ideal (Kamera + Resolusi Bagus)
        // Ini biasanya jalan di Chrome/Android/Desktop
        try {
            const constraints = {
                video: {
                    facingMode: constraintsBase,
                    width: { ideal: 1280 },
                    height: { ideal: 960 }
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
        } catch (error) {
            console.warn('Gagal Tahap 1 (Resolusi+Mode), mencoba mode Safari...', error);

            // TAHAP 2: SAFARI FALLBACK
            // Safari sering error Overconstrained jika kita minta resolusi spesifik di kamera belakang.
            // Solusinya: Hapus constraint resolusi, biarkan Safari memilih sendiri.
            try {
                const constraintsSafari = {
                    video: {
                        facingMode: constraintsBase // HANYA facing mode, tanpa width/height
                    },
                    audio: false
                };

                this.stream = await navigator.mediaDevices.getUserMedia(constraintsSafari);
                this.video.srcObject = this.stream;

            } catch (errorSafari) {
                console.warn('Gagal Tahap 2 (Exact Mode), mencoba mode kompatibilitas...', errorSafari);

                // TAHAP 3: LAST RESORT
                // Hapus kata kunci 'exact'. Ini tidak menjamin kamera belakang, 
                // tapi setidaknya kamera akan nyala daripada error.
                try {
                    const constraintsBasic = {
                        video: {
                            facingMode: this.facingMode // Tanpa { exact: ... }
                        },
                        audio: false
                    };
                    this.stream = await navigator.mediaDevices.getUserMedia(constraintsBasic);
                    this.video.srcObject = this.stream;
                } catch (finalError) {
                    console.error('Kamera gagal total:', finalError);
                    alert('Gagal mengakses kamera. Silakan cek izin browser Safari Anda.');
                }
            }
        }
    }

    async switchCamera() {
        // Toggle User <-> Environment
        this.facingMode = (this.facingMode === 'user') ? 'environment' : 'user';
        await this.setupCamera();
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    attachEventListeners() {
        // Switch Camera
        if (this.switchCameraBtn) {
            this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        }

        // Upload Foto
        this.uploadPhotoBtn.addEventListener('click', () => this.photoFileInput.click());
        this.photoFileInput.addEventListener('change', (e) => this.handlePhotoUpload(e));

        // Background Color
        document.querySelectorAll('.color-btn').forEach(btn => {
            if (!btn.classList.contains('upload-btn')) {
                btn.addEventListener('click', (e) => this.handleBackgroundChange(e));
            }
        });

        // Background Upload
        if (this.bgUploadBtnTrigger) {
            this.bgUploadBtnTrigger.addEventListener('click', () => this.bgUploadInput.click());
        }
        this.bgUploadInput.addEventListener('change', (e) => this.handleBgFileSelect(e));

        // Cropper
        this.cropConfirmBtn.addEventListener('click', () => this.handleCropConfirm());
        this.closeCropBtn.addEventListener('click', () => {
            this.cropModal.style.display = 'none';
            if(this.cropper) this.cropper.destroy();
            this.bgUploadInput.value = ''; 
        });

        // Template & Actions
        document.querySelectorAll('.opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTemplateChange(e));
        });
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.resetBtn.addEventListener('click', () => this.resetPhotos());
        this.previewBtn.addEventListener('click', () => this.showPreview());
        this.downloadBtn.addEventListener('click', () => this.downloadPhotoStrip());

        // Modal Controls
        this.closePreviewBtn.addEventListener('click', () => this.closePreview());
        this.backBtn.addEventListener('click', () => this.closePreview());
        this.confirmDownloadBtn.addEventListener('click', () => this.downloadPhotoStrip());
        window.addEventListener('click', (e) => {
            if (e.target === this.previewModal) this.closePreview();
        });
    }

    // ==========================================
    // LOGIKA UPLOAD FOTO
    // ==========================================
    handlePhotoUpload(event) {
        if (this.photos.length >= this.maxPhotos) {
            alert(`Maximum ${this.maxPhotos} photos reached!`);
            event.target.value = ''; 
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const processedData = this.smartCropImage(img);
                this.photos.push(processedData);
                this.updatePhotoStripUI();
                this.previewBtn.disabled = false;
                this.downloadBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    smartCropImage(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = 800;
        const targetHeight = 600;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (imgRatio > targetRatio) {
            renderHeight = targetHeight;
            renderWidth = img.width * (targetHeight / img.height);
            offsetX = (targetWidth - renderWidth) / 2;
            offsetY = 0;
        } else {
            renderWidth = targetWidth;
            renderHeight = img.height * (targetWidth / img.width);
            offsetX = 0;
            offsetY = (targetHeight - renderHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
        return canvas.toDataURL('image/png');
    }

    // ==========================================
    // LOGIKA BACKGROUND (CROPPER)
    // ==========================================
    handleBgFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.imageToCrop.src = e.target.result;
            this.cropModal.style.display = 'flex';
            if (this.cropper) this.cropper.destroy();

            this.cropper = new Cropper(this.imageToCrop, {
                viewMode: 1, dragMode: 'move', autoCropArea: 0.8,
                restore: false, guides: true, center: true,
                highlight: false, cropBoxMovable: true, cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    }

    handleCropConfirm() {
        if (!this.cropper) return;
        const canvas = this.cropper.getCroppedCanvas();
        if (!canvas) return;
        
        const croppedImageURL = canvas.toDataURL('image/jpeg');
        const img = new Image();
        img.onload = () => {
            this.currentBackground = { type: 'custom', data: img };
            this.photoStrip.style.background = 'none';
            this.photoStrip.style.backgroundImage = `url(${croppedImageURL})`;
            this.photoStrip.style.backgroundSize = 'cover';
            this.photoStrip.style.backgroundPosition = 'center';

            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            if (this.bgUploadBtnTrigger) this.bgUploadBtnTrigger.classList.add('active');

            this.cropModal.style.display = 'none';
            this.cropper.destroy();
            this.cropper = null;
        };
        img.src = croppedImageURL;
    }

    handleBackgroundChange(event) {
        const btn = event.currentTarget;
        const bgType = btn.dataset.bg;
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.photoStrip.style.backgroundImage = 'none'; 

        switch(bgType) {
            case 'solid-blue':
                this.currentBackground = { type: 'solid-blue', data: '#6c5ce7' };
                this.photoStrip.style.background = '#6c5ce7';
                break;
            case 'solid-red':
                this.currentBackground = { type: 'solid-red', data: '#ff7675' };
                this.photoStrip.style.background = '#ff7675';
                break;
            case 'solid-green':
                this.currentBackground = { type: 'solid-green', data: '#55efc4' };
                this.photoStrip.style.background = '#55efc4';
                break;
            case 'gradient-purple':
                this.currentBackground = { type: 'gradient-purple', data: null };
                this.photoStrip.style.background = 'linear-gradient(45deg, #a29bfe, #74b9ff)';
                break;
        }
    }

    // ==========================================
    // LOGIKA TEMPLATE & CAPTURE
    // ==========================================
    handleTemplateChange(event) {
        const btn = event.currentTarget;
        const template = btn.dataset.template;
        document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTemplate = template;
        this.setMaxPhotos();
        if (this.photos.length > 0) {
            if(confirm('Changing template will reset photos. Continue?')) {
                this.resetPhotos();
            }
        }
    }

    setMaxPhotos() {
        switch(this.currentTemplate) {
            case 'single': this.maxPhotos = 1; break;
            case 'three-vertical': this.maxPhotos = 3; break;
            case 'four-vertical': this.maxPhotos = 4; break;
            default: this.maxPhotos = 4;
        }
    }

    capturePhoto() {
        if (!this.stream) return;
        if (this.photos.length >= this.maxPhotos) {
            alert(`Maximum ${this.maxPhotos} photos reached!`);
            return;
        }

        const ctx = this.previewCanvas.getContext('2d');
        this.previewCanvas.width = this.video.videoWidth;
        this.previewCanvas.height = this.video.videoHeight;

        // Reset Transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // LOGIKA MIRROR:
        // Jika Kamera Depan -> Mirror (Balik Horizontal)
        // Jika Kamera Belakang -> Normal
        if (this.facingMode === 'user') {
            ctx.translate(this.previewCanvas.width, 0);
            ctx.scale(-1, 1);
        } 
        
        ctx.drawImage(this.video, 0, 0);
        
        // Kembalikan transform ke normal agar proses selanjutnya aman
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const photoData = this.previewCanvas.toDataURL('image/png');
        this.photos.push(photoData);
        this.updatePhotoStripUI();
        this.previewBtn.disabled = false;
        this.downloadBtn.disabled = false;
    }

    updatePhotoStripUI() {
        this.photoStrip.innerHTML = '';
        if (this.photos.length === 0) {
            this.photoStrip.innerHTML = `
                <div class="empty-state">
                    <span>Ready?</span>
                    <small>Photos will appear here</small>
                </div>`;
            return;
        }
        this.photos.forEach((photoData, index) => {
            const photoContainer = document.createElement('div');
            photoContainer.className = 'captured-photo';
            const img = document.createElement('img');
            img.src = photoData;
            const controls = document.createElement('div');
            controls.className = 'photo-controls';
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.addEventListener('click', () => this.deletePhoto(index));
            controls.appendChild(deleteBtn);
            photoContainer.appendChild(img);
            photoContainer.appendChild(controls);
            this.photoStrip.appendChild(photoContainer);
        });
    }

    deletePhoto(index) {
        this.photos.splice(index, 1);
        this.updatePhotoStripUI();
        if (this.photos.length === 0) {
            this.previewBtn.disabled = true;
            this.downloadBtn.disabled = true;
        }
    }

    resetPhotos() {
        this.photos = [];
        this.updatePhotoStripUI();
        this.previewBtn.disabled = true;
        this.downloadBtn.disabled = true;
        this.bgUploadInput.value = '';
        this.photoFileInput.value = '';
    }

    generatePhotoStrip() {
        if (this.photos.length === 0) return null;
        const ctx = this.finalCanvas.getContext('2d');
        const photos = this.photos;

        const stripWidth = 600; 
        const photoMargin = 30; // Bingkai tipis
        const photoGap = 30;    
        const headerHeight = 150; 
        const footerHeight = 100; 
        const fontFamily = "'Outfit', sans-serif";
        const titleText = "diarytime";

        const photoWidth = stripWidth - (photoMargin * 2);
        
        return new Promise((resolve) => {
            const firstImg = new Image();
            firstImg.onload = () => {
                const photoAspect = firstImg.width / firstImg.height;
                const photoHeight = photoWidth / photoAspect;
                const totalHeight = headerHeight + (photoHeight * this.photos.length) + (photoGap * (this.photos.length - 1)) + footerHeight + photoGap; 

                this.finalCanvas.width = stripWidth;
                this.finalCanvas.height = totalHeight;

                this.drawBackground(ctx, stripWidth, totalHeight);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold 50px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(titleText, stripWidth / 2, headerHeight / 2);

                let loadedCount = 0;
                photos.forEach((photoData, index) => {
                    const img = new Image();
                    img.onload = () => {
                        const yPosition = headerHeight + (index * (photoHeight + photoGap));
                        
                        // Bingkai putih tipis
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(photoMargin - 5, yPosition - 5, photoWidth + 10, photoHeight + 10);

                        ctx.drawImage(img, photoMargin, yPosition, photoWidth, photoHeight);

                        loadedCount++;
                        if (loadedCount === photos.length) {
                            const footerYCenter = totalHeight - (footerHeight / 2);
                            const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
                            const dateText = new Date().toLocaleDateString('en-GB', dateOptions);

                            ctx.fillStyle = '#FFFFFF';
                            ctx.font = `30px ${fontFamily}`;
                            ctx.textAlign = 'center';
                            ctx.fillText(dateText, stripWidth / 2, footerYCenter);
                            resolve();
                        }
                    };
                    img.src = photoData;
                });
            };
            firstImg.src = photos[0];
        });
    }

    drawBackground(ctx, width, height) {
        switch(this.currentBackground.type) {
            case 'solid-blue':
                ctx.fillStyle = this.currentBackground.data; ctx.fillRect(0, 0, width, height); break;
            case 'solid-red':
                ctx.fillStyle = this.currentBackground.data; ctx.fillRect(0, 0, width, height); break;
            case 'solid-green':
                ctx.fillStyle = this.currentBackground.data; ctx.fillRect(0, 0, width, height); break;
            case 'gradient-purple':
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, '#a29bfe'); gradient.addColorStop(1, '#74b9ff');
                ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height); break;
            case 'custom':
                if (this.currentBackground.data) {
                    const img = this.currentBackground.data;
                    const scale = Math.max(width / img.width, height / img.height);
                    const x = (width / 2) - (img.width / 2) * scale;
                    const y = (height / 2) - (img.height / 2) * scale;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                } break;
        }
    }

    async downloadPhotoStrip() {
        if (this.photos.length === 0) return;
        try {
            await this.generatePhotoStrip();
            const link = document.createElement('a');
            link.href = this.finalCanvas.toDataURL('image/png');
            link.download = `diarytime-${Date.now()}.png`;
            link.click();
            this.closePreview();
        } catch (error) {
            console.error('Download failed:', error);
        }
    }

    showPreview() {
        if (this.photos.length === 0) return;
        this.generatePhotoStrip().then(() => {
            const ctx = this.previewDisplay.getContext('2d');
            this.previewDisplay.width = this.finalCanvas.width;
            this.previewDisplay.height = this.finalCanvas.height;
            ctx.drawImage(this.finalCanvas, 0, 0);
            this.previewModal.style.display = 'flex';
        });
    }

    closePreview() {
        this.previewModal.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PhotoBooth();
});
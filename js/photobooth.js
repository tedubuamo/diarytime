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

        // Cropper Elements
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
        
        // State Kamera
        this.facingMode = 'user'; 

        // STATE BARU: Menentukan apa yang sedang di-crop ('background' atau 'photo')
        this.currentCropType = null; 

        this.init();
    }

    async init() {
        await this.setupCamera();
        this.attachEventListeners();
    }

    // ==========================================
    // LOGIKA KAMERA (SAFARI SAFE)
    // ==========================================
    async setupCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Mirroring CSS: Depan = Mirror, Belakang = Normal
        if (this.facingMode === 'user') {
            this.video.style.transform = 'scaleX(-1)';
        } else {
            this.video.style.transform = 'none';
        }

        let constraintsBase = {};
        if (this.facingMode === 'environment') {
            constraintsBase = { exact: 'environment' };
        } else {
            constraintsBase = 'user';
        }

        try {
            // Tahap 1: Ideal
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
            console.warn('Gagal Tahap 1, mencoba mode fallback...', error);
            try {
                // Tahap 2: Safari Fallback
                const constraintsSafari = {
                    video: { facingMode: constraintsBase },
                    audio: false
                };
                this.stream = await navigator.mediaDevices.getUserMedia(constraintsSafari);
                this.video.srcObject = this.stream;
            } catch (errorSafari) {
                console.warn('Gagal Tahap 2, mencoba mode kompatibilitas...', errorSafari);
                try {
                    // Tahap 3: Last Resort
                    const constraintsBasic = {
                        video: { facingMode: this.facingMode },
                        audio: false
                    };
                    this.stream = await navigator.mediaDevices.getUserMedia(constraintsBasic);
                    this.video.srcObject = this.stream;
                } catch (finalError) {
                    console.error('Kamera gagal total:', finalError);
                    alert('Gagal mengakses kamera. Cek izin browser.');
                }
            }
        }
    }

    async switchCamera() {
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

        // Upload Foto (Memicu Crop Photo)
        this.uploadPhotoBtn.addEventListener('click', () => this.photoFileInput.click());
        this.photoFileInput.addEventListener('change', (e) => this.handlePhotoUpload(e));

        // Background Color
        document.querySelectorAll('.color-btn').forEach(btn => {
            if (!btn.classList.contains('upload-btn')) {
                btn.addEventListener('click', (e) => this.handleBackgroundChange(e));
            }
        });

        // Background Upload (Memicu Crop Background)
        if (this.bgUploadBtnTrigger) {
            this.bgUploadBtnTrigger.addEventListener('click', () => this.bgUploadInput.click());
        }
        this.bgUploadInput.addEventListener('change', (e) => this.handleBgFileSelect(e));

        // Global Crop Controls
        this.cropConfirmBtn.addEventListener('click', () => this.handleCropConfirm());
        this.closeCropBtn.addEventListener('click', () => {
            this.cropModal.style.display = 'none';
            if(this.cropper) this.cropper.destroy();
            this.bgUploadInput.value = ''; 
            this.photoFileInput.value = '';
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
    // LOGIKA UPLOAD & CROP (FOTO & BACKGROUND)
    // ==========================================
    
    // 1. Handle Upload FOTO untuk Frame
    handlePhotoUpload(event) {
        if (this.photos.length >= this.maxPhotos) {
            alert(`Maximum ${this.maxPhotos} photos reached!`);
            event.target.value = ''; 
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        // TANDAI: Sedang crop Foto
        this.currentCropType = 'photo';
        // Buka cropper dengan rasio TERKUNCI 4:3 (agar pas di frame)
        this.openCropper(file, 4/3); 
        
        event.target.value = '';
    }

    // 2. Handle Upload BACKGROUND
    handleBgFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // TANDAI: Sedang crop Background
        this.currentCropType = 'background';
        // Buka cropper dengan rasio BEBAS (NaN)
        this.openCropper(file, NaN); 
        
        event.target.value = '';
    }

    // Helper: Membuka Modal Cropper
    openCropper(file, aspectRatio) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.imageToCrop.src = e.target.result;
            this.cropModal.style.display = 'flex';

            if (this.cropper) this.cropper.destroy();

            this.cropper = new Cropper(this.imageToCrop, {
                aspectRatio: aspectRatio, // Ini kunci perbedaannya
                viewMode: 1, 
                dragMode: 'move', 
                autoCropArea: 0.8,
                restore: false, 
                guides: true, 
                center: true,
                highlight: false, 
                cropBoxMovable: true, 
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    }

    // 3. Handle Konfirmasi Crop (Tombol Centang)
    handleCropConfirm() {
        if (!this.cropper) return;
        
        const canvas = this.cropper.getCroppedCanvas();
        if (!canvas) return;

        // Convert hasil crop ke Gambar (JPEG)
        const croppedImageURL = canvas.toDataURL('image/jpeg');

        if (this.currentCropType === 'photo') {
            // === JIKA CROP FOTO ===
            // Masukkan ke array photos
            this.photos.push(croppedImageURL);
            this.updatePhotoStripUI();
            this.previewBtn.disabled = false;
            this.downloadBtn.disabled = false;

        } else if (this.currentCropType === 'background') {
            // === JIKA CROP BACKGROUND ===
            // Set sebagai background
            const img = new Image();
            img.onload = () => {
                this.currentBackground = { type: 'custom', data: img };
                this.photoStrip.style.background = 'none';
                this.photoStrip.style.backgroundImage = `url(${croppedImageURL})`;
                this.photoStrip.style.backgroundSize = 'cover';
                this.photoStrip.style.backgroundPosition = 'center';

                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                if (this.bgUploadBtnTrigger) this.bgUploadBtnTrigger.classList.add('active');
            };
            img.src = croppedImageURL;
        }

        // Tutup Modal
        this.cropModal.style.display = 'none';
        this.cropper.destroy();
        this.cropper = null;
        this.currentCropType = null; // Reset status
    }

    // ==========================================
    // LOGIKA BACKGROUND (WARNA)
    // ==========================================
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
    // TEMPLATE & CAPTURE
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

        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Mirroring Logic for Capture
        if (this.facingMode === 'user') {
            ctx.translate(this.previewCanvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        ctx.drawImage(this.video, 0, 0);
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

    // ==========================================
    // GENERATE RESULT
    // ==========================================
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
                        
                        // Bingkai Putih Tipis
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
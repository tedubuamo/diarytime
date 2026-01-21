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
        
        // INPUTS BARU (Photo Upload)
        this.uploadPhotoBtn = document.getElementById('upload-photo-btn');
        this.photoFileInput = document.getElementById('photo-file-input');

        // Inputs & Sidebar
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
        this.currentBackground = {
            type: 'solid-blue',
            data: '#6c5ce7' 
        };
        this.maxPhotos = 1;

        this.init();
    }

    async init() {
        await this.setupCamera();
        this.attachEventListeners();
    }

    async setupCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false
            });
            this.video.srcObject = this.stream;
        } catch (error) {
            console.error('Camera access denied:', error);
            alert('Please allow camera access.');
        }
    }

    attachEventListeners() {
        // --- 1. FITUR BARU: UPLOAD FOTO ---
        this.uploadPhotoBtn.addEventListener('click', () => {
            this.photoFileInput.click();
        });
        this.photoFileInput.addEventListener('change', (e) => this.handlePhotoUpload(e));

        // --- 2. FITUR BACKGROUND ---
        document.querySelectorAll('.color-btn').forEach(btn => {
            if (!btn.classList.contains('upload-btn')) {
                btn.addEventListener('click', (e) => this.handleBackgroundChange(e));
            }
        });

        // Trigger upload background
        if (this.bgUploadBtnTrigger) {
            this.bgUploadBtnTrigger.addEventListener('click', () => {
                this.bgUploadInput.click();
            });
        }
        
        // Event File Background Dipilih (Crop)
        this.bgUploadInput.addEventListener('change', (e) => this.handleBgFileSelect(e));

        // Crop Controls
        this.cropConfirmBtn.addEventListener('click', () => this.handleCropConfirm());
        this.closeCropBtn.addEventListener('click', () => {
            this.cropModal.style.display = 'none';
            if(this.cropper) this.cropper.destroy();
            this.bgUploadInput.value = ''; 
        });

        // --- 3. TEMPLATE & ACTIONS ---
        document.querySelectorAll('.opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTemplateChange(e));
        });
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.resetBtn.addEventListener('click', () => this.resetPhotos());
        this.previewBtn.addEventListener('click', () => this.showPreview());
        this.downloadBtn.addEventListener('click', () => this.downloadPhotoStrip());

        // --- 4. MODAL ---
        this.closePreviewBtn.addEventListener('click', () => this.closePreview());
        this.backBtn.addEventListener('click', () => this.closePreview());
        this.confirmDownloadBtn.addEventListener('click', () => this.downloadPhotoStrip());
        
        window.addEventListener('click', (e) => {
            if (e.target === this.previewModal) this.closePreview();
        });
    }

    // ==========================================
    // LOGIKA UPLOAD FOTO (SMART CROP)
    // ==========================================
    handlePhotoUpload(event) {
        // Cek limit
        if (this.photos.length >= this.maxPhotos) {
            alert(`Maximum ${this.maxPhotos} photos reached!`);
            event.target.value = ''; // Reset input
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Proses gambar agar rasionya 4:3 (seperti kamera)
                const processedData = this.smartCropImage(img);
                
                this.photos.push(processedData);
                this.updatePhotoStripUI();
                
                // Aktifkan tombol
                this.previewBtn.disabled = false;
                this.downloadBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Reset input agar bisa upload file yang sama berulang kali jika mau
        event.target.value = '';
    }

    // Helper: Memotong tengah gambar (Center Crop) agar sesuai rasio Canvas
    smartCropImage(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Kita ingin outputnya 4:3 (standar webcam)
        const targetWidth = 800;
        const targetHeight = 600;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Hitung rasio
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        let renderWidth, renderHeight, offsetX, offsetY;

        // Logika Object-fit: Cover
        if (imgRatio > targetRatio) {
            // Gambar lebih lebar dari target -> potong kiri kanan
            renderHeight = targetHeight;
            renderWidth = img.width * (targetHeight / img.height);
            offsetX = (targetWidth - renderWidth) / 2;
            offsetY = 0;
        } else {
            // Gambar lebih tinggi dari target -> potong atas bawah
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
                const blue = '#6c5ce7';
                this.currentBackground = { type: 'solid-blue', data: blue };
                this.photoStrip.style.background = blue;
                break;
            case 'solid-red':
                const red = '#ff7675';
                this.currentBackground = { type: 'solid-red', data: red };
                this.photoStrip.style.background = red;
                break;
            case 'solid-green':
                const green = '#55efc4';
                this.currentBackground = { type: 'solid-green', data: green };
                this.photoStrip.style.background = green;
                break;
            case 'gradient-purple':
                const gradient = 'linear-gradient(45deg, #a29bfe, #74b9ff)';
                this.currentBackground = { type: 'gradient-purple', data: null };
                this.photoStrip.style.background = gradient;
                break;
        }
    }

    // ==========================================
    // LOGIKA INTI PHOTOBOOTH
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

        // Mirror effect capture
        ctx.translate(this.previewCanvas.width, 0);
        ctx.scale(-1, 1);
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
        // Reset file input photo juga
        this.photoFileInput.value = '';
    }

    generatePhotoStrip() {
        if (this.photos.length === 0) return null;

        const ctx = this.finalCanvas.getContext('2d');
        const photos = this.photos;

        const stripWidth = 600; 
        // UBAH INI: Margin kiri/kanan lebih tipis agar foto lebih lebar
        const photoMargin = 30;  
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
                        
                        // UBAH INI: Bingkai putih lebih tipis (padding 10px, offset -5px)
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
            case 'solid-red':
            case 'solid-green':
                ctx.fillStyle = this.currentBackground.data;
                ctx.fillRect(0, 0, width, height);
                break;
            case 'gradient-purple':
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, '#a29bfe');
                gradient.addColorStop(1, '#74b9ff');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                break;
            case 'custom':
                if (this.currentBackground.data) {
                    const img = this.currentBackground.data;
                    const scale = Math.max(width / img.width, height / img.height);
                    const x = (width / 2) - (img.width / 2) * scale;
                    const y = (height / 2) - (img.height / 2) * scale;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                }
                break;
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
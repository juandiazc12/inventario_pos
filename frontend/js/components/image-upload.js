// image-upload.js
class ImageUpload {
    constructor({ containerId, onUpload, currentUrl = null, uploadEndpoint = null, fieldName = 'imagen', isAvatar = false }) {
        this.containerId = containerId;
        this.onUpload = onUpload;
        this.currentUrl = currentUrl;
        this.uploadEndpoint = uploadEndpoint;
        this.fieldName = fieldName;
        this.isAvatar = isAvatar;
        this.render();
    }

    // ... (render and _setupEvents unchanged)
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
      <div class="image-upload-zone" id="${this.containerId}-zone">
        <div class="image-preview-wrapper">
          <div class="image-preview" id="${this.containerId}-preview">
            ${this.currentUrl
                ? `<img src="${this.currentUrl}" alt="Imagen actual">`
                : `<div class="image-placeholder">
                    <i class="fas ${this.isAvatar ? 'fa-user' : 'fa-image'}"></i>
                    <span>${this.isAvatar ? 'Sin Foto' : 'Sin Imagen'}</span>
                   </div>`
            }
          </div>
          <div class="image-upload-overlay">
            <i class="fas fa-upload"></i>
            <span>Subir imagen</span>
          </div>
        </div>
        <input type="file" id="${this.containerId}-input" 
               accept="image/jpeg,image/png,image/webp" 
               style="display:none">
        <div class="image-upload-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="${this.containerId}-btn">
            <i class="fas fa-upload"></i> Seleccionar
          </button>
          ${this.currentUrl ? `
            <button type="button" class="btn btn-ghost btn-sm" id="${this.containerId}-remove">
              <i class="fas fa-trash"></i>
            </button>` : ''}
        </div>
        <p class="form-hint" style="margin-top:8px">JPG, PNG, WebP — Máx 3MB</p>
      </div>
    `;

        this._setupEvents();
    }

    _setupEvents() {
        const input = document.getElementById(`${this.containerId}-input`);
        const btn = document.getElementById(`${this.containerId}-btn`);
        const zone = document.getElementById(`${this.containerId}-preview`);
        const removeBtn = document.getElementById(`${this.containerId}-remove`);

        btn?.addEventListener('click', () => input.click());
        zone?.parentElement.addEventListener('click', () => input.click());

        const uploadZone = document.getElementById(`${this.containerId}-zone`);
        uploadZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
        uploadZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this._handleFile(file);
        });

        input?.addEventListener('change', (e) => {
            if (e.target.files[0]) this._handleFile(e.target.files[0]);
        });

        removeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.currentUrl = null;
            this.render();
            if (this.onUpload) this.onUpload(null);
        });
    }

    async _handleFile(file) {
        if (file.size > 3 * 1024 * 1024) {
            return Toast.warning('La imagen excede los 3MB');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(`${this.containerId}-preview`);
            if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);

        if (this.uploadEndpoint) {
            try {
                const formData = new FormData();
                formData.append(this.fieldName, file);

                const response = await fetch(`${API_BASE}${this.uploadEndpoint}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });

                const data = await response.json();
                if (data.status === 'success' || data.success === true) {
                    Toast.success('Imagen subida correctamente');
                    if (this.onUpload) this.onUpload(data.imagen_url || data.avatar_url || data.url);
                } else {
                    throw new Error(data.message || data.error || 'Error desconocido al subir');
                }
            } catch (error) {
                console.error('ImageUpload Error:', error);
                Toast.error('Error al subir imagen: ' + (error.message === "true" ? "Error del servidor" : error.message));
            }
        } else {
            if (this.onUpload) this.onUpload(file);
        }
    }
}
window.ImageUpload = ImageUpload;

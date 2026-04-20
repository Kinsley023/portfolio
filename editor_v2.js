// 進階視覺化編輯器模組 (支援 Markdown、顏色與縮放)
document.addEventListener('DOMContentLoaded', () => {
    // 移除舊版保留在 HTML 中的 Editor UI
    const oldUI = document.getElementById('web-editor-ui');
    if (oldUI) {
        oldUI.remove();
    }

    // 建立新版 UI
    const editorUI = document.createElement('div');
    editorUI.id = 'web-editor-ui';
    editorUI.innerHTML = `
        <style>
            #web-editor-ui {
                font-family: sans-serif;
            }
            .editor-bottom-tools {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .editor-btn {
                background: linear-gradient(135deg, #00BFFF, #87CEEB);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 50px;
                font-weight: bold;
                font-size: 1rem;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0, 191, 255, 0.4);
                transition: transform 0.2s;
            }
            .editor-btn:hover { transform: scale(1.05); }
            .editor-save-btn {
                background: linear-gradient(135deg, #4CAF50, #2E7D32);
                display: none;
            }
            /* 編輯模式提示 */
            body.is-editing .editable-text {
                outline: 2px dashed #00BFFF !important;
                outline-offset: 4px;
                cursor: pointer !important;
                min-height: 20px;
                transition: outline 0.2s;
            }
            body.is-editing .editable-text:hover {
                outline: 3px solid #00BFFF !important;
                background: rgba(0, 191, 255, 0.05);
            }
            body.is-editing .card-placeholder, 
            body.is-editing img {
                outline: 3px dashed #4CAF50 !important;
                cursor: pointer !important;
                position: relative;
            }
            body.is-editing .hover-overlay {
                opacity: 0 !important;
                pointer-events: none;
            }
            
            /* Modal 彈窗樣式 */
            .editor-modal-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(5px);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
            }
            .editor-modal {
                background: white;
                padding: 30px;
                border-radius: 20px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.2);
            }
            .editor-modal h3 {
                margin-bottom: 20px;
                font-size: 1.25rem;
                color: #2D3142;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .editor-modal textarea {
                width: 100%;
                padding: 15px;
                border: 2px solid #E8EBEF;
                border-radius: 12px;
                font-size: 1rem;
                resize: vertical;
                font-family: inherit;
                margin-bottom: 20px;
            }
            .editor-modal textarea:focus {
                outline: none;
                border-color: #87CEEB;
            }
            .color-picker-row, .slider-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 24px;
                padding: 15px;
                background: #F8F9FA;
                border-radius: 12px;
            }
            .editor-modal input[type="color"] {
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 5px;
                cursor: pointer;
            }
            .editor-modal input[type="range"] {
                flex-grow: 1;
                cursor: pointer;
            }
            .modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            .modal-btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                border: none;
            }
            .modal-btn-cancel {
                background: #E8EBEF;
                color: #2D3142;
            }
            .modal-btn-confirm {
                background: #87CEEB;
                color: white;
            }
            /* Markdown 渲染後的樣式修正 */
            .editable-text p { margin-bottom: 0; }
            .editable-text ul { padding-left: 20px; margin-top: 10px; }
            
            /* 圖片預覽器 */
            .img-preview-box {
                width: 100%;
                height: 150px;
                border: 2px dashed #ccc;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                overflow: hidden;
                cursor: pointer;
                background: #fcfcfc;
            }
            .img-preview-box img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        </style>

        <div class="editor-bottom-tools">
            <button id="web-editor-btn" class="editor-btn">✏️ 開啟高階網頁編輯 (Markdown+圖片縮放)</button>
            <button id="web-save-btn" class="editor-btn editor-save-btn">💾 儲存並更新網站</button>
        </div>

        <!-- Text Edit Modal -->
        <div id="text-modal" class="editor-modal-overlay">
            <div class="editor-modal">
                <h3>📝 編輯文字 (支援 Markdown 標記)</h3>
                <textarea id="text-md-input" rows="6" placeholder="可使用 **粗體**、*斜體*、[連結](網址)、- 列表"></textarea>
                <div class="color-picker-row">
                    <label>🎨 文字顏色：</label>
                    <input type="color" id="text-color-input" value="#2D3142">
                </div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="text-cancel">取消</button>
                    <button class="modal-btn modal-btn-confirm" id="text-confirm">套用修改</button>
                </div>
            </div>
        </div>

        <!-- Image Edit Modal -->
        <div id="img-modal" class="editor-modal-overlay">
            <div class="editor-modal">
                <h3>🖼️ 替換與調整圖片</h3>
                <div class="img-preview-box" id="img-upload-trigger">
                    <span id="img-upload-hint">點擊此處上傳新圖片</span>
                    <img id="img-preview" style="display:none;" />
                </div>
                <input type="file" id="hidden-img-uploader" accept="image/*" style="display:none;">
                
                <div class="slider-row">
                    <label>🔍 縮放大小：</label>
                    <input type="range" id="img-scale-input" min="0.5" max="3" step="0.1" value="1">
                    <span id="img-scale-value">1.0x</span>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="img-cancel">取消</button>
                    <button class="modal-btn modal-btn-confirm" id="img-confirm">套用圖片</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(editorUI);

    // 取得各種 DOM 元素
    const editBtn = document.getElementById('web-editor-btn');
    const saveBtn = document.getElementById('web-save-btn');
    const textSelectors = 'h1, h2, h3, h4, p, span:not(.logo span), a.btn, .other-exp-content';
    const imageSelectors = '.card-placeholder, img';
    
    // 狀態變數
    let isEditing = false;
    let currentTextTarget = null;
    let currentImageTarget = null;
    let tempImgDataUrl = null;

    // 開啟編輯模式
    editBtn.addEventListener('click', () => {
        isEditing = true;
        document.body.classList.add('is-editing');
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';

        // 設定文字標籤
        document.querySelectorAll(textSelectors).forEach(el => {
            if (el.closest('#web-editor-ui')) return;
            el.classList.add('editable-text');
            el.addEventListener('click', handleTextClick);
        });

        // 設定圖片標籤
        document.querySelectorAll(imageSelectors).forEach(el => {
            if (el.closest('#web-editor-ui')) return;
            el.addEventListener('click', handleImageClick);
        });
        
        alert("🖌️ 高階編輯模式啟動！\n\n1. 點擊文字：支援 Markdown 語法輸入與顏色選擇\n2. 點擊圖片：可上傳自己的檔案並拖曳滑桿進行縮放\n3. 完成後請儲存頁面以保留變更！");
    });

    /* =======================================================
       文字編輯器邏輯 (Markdown & Color)
    ======================================================= */
    const textModal = document.getElementById('text-modal');
    const textInput = document.getElementById('text-md-input');
    const colorInput = document.getElementById('text-color-input');
    
    function handleTextClick(e) {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        
        currentTextTarget = e.currentTarget;
        
        // 嘗試取得原本的 Markdown 或反解原始文字
        let currentMd = currentTextTarget.dataset.markdown || currentTextTarget.innerHTML.trim();
        // 簡單清洗多餘的 html 標籤轉換為換行，以防沒有 dataset.markdown 時太難看
        if(!currentTextTarget.dataset.markdown) {
             currentMd = currentTextTarget.innerText.trim();
        }
        
        textInput.value = currentMd;
        
        // 取得顏色
        const computedStyle = window.getComputedStyle(currentTextTarget);
        // 將 rgb 轉 hex (簡單版)
        const rgb = computedStyle.color.match(/\d+/g);
        if(rgb && rgb.length >= 3) {
            const hex = "#" + ((1 << 24) + (+rgb[0] << 16) + (+rgb[1] << 8) + +rgb[2]).toString(16).slice(1);
            colorInput.value = hex;
        }
        
        textModal.style.display = 'flex';
    }

    document.getElementById('text-cancel').addEventListener('click', () => {
        textModal.style.display = 'none';
    });

    document.getElementById('text-confirm').addEventListener('click', () => {
        if(currentTextTarget && window.marked) {
            const rawMd = textInput.value;
            // 使用 marked 編譯 markdown
            let parsedHtml = marked.parse(rawMd);
            
            // 替換
            currentTextTarget.innerHTML = parsedHtml;
            currentTextTarget.dataset.markdown = rawMd; // 紀錄原始 markdown
            currentTextTarget.style.color = colorInput.value;
        } else if (!window.marked) {
            alert('Marked.js 找不到，請檢查網路連線。直接套用原始文字。');
            currentTextTarget.innerText = textInput.value;
            currentTextTarget.style.color = colorInput.value;
        }
        textModal.style.display = 'none';
    });


    /* =======================================================
       圖片編輯器邏輯 (Upload & Zoom)
    ======================================================= */
    const imgModal = document.getElementById('img-modal');
    const uploadTrigger = document.getElementById('img-upload-trigger');
    const hiddenUploader = document.getElementById('hidden-img-uploader');
    const imgPreview = document.getElementById('img-preview');
    const imgHint = document.getElementById('img-upload-hint');
    const scaleInput = document.getElementById('img-scale-input');
    const scaleValue = document.getElementById('img-scale-value');

    function handleImageClick(e) {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        
        currentImageTarget = e.currentTarget;
        
        // 重設 Modal 狀態
        tempImgDataUrl = null;
        scaleInput.value = currentImageTarget.dataset.scale || 1;
        scaleValue.innerText = scaleInput.value + 'x';
        
        if (currentImageTarget.tagName.toLowerCase() === 'img') {
            tempImgDataUrl = currentImageTarget.src;
            imgPreview.src = tempImgDataUrl;
            imgPreview.style.display = 'block';
            imgPreview.style.transform = \`scale(\${scaleInput.value})\`;
            imgHint.style.display = 'none';
        } else {
            imgPreview.style.display = 'none';
            imgHint.style.display = 'block';
        }

        imgModal.style.display = 'flex';
    }

    uploadTrigger.addEventListener('click', () => {
        hiddenUploader.click();
    });

    hiddenUploader.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            tempImgDataUrl = event.target.result;
            imgPreview.src = tempImgDataUrl;
            imgPreview.style.display = 'block';
            imgHint.style.display = 'none';
            
            // 重設縮放
            scaleInput.value = 1;
            scaleValue.innerText = "1.0x";
            imgPreview.style.transform = \`scale(1)\`;
        };
        reader.readAsDataURL(file);
        this.value = '';
    });

    scaleInput.addEventListener('input', (e) => {
        const val = e.target.value;
        scaleValue.innerText = val + 'x';
        if (imgPreview.style.display === 'block') {
            imgPreview.style.transform = \`scale(\${val})\`;
        }
    });

    document.getElementById('img-cancel').addEventListener('click', () => {
        imgModal.style.display = 'none';
    });

    document.getElementById('img-confirm').addEventListener('click', () => {
        if (currentImageTarget && tempImgDataUrl) {
            const scaleVal = scaleInput.value;
            
            if (currentImageTarget.classList.contains('card-placeholder')) {
                const img = document.createElement('img');
                img.src = tempImgDataUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.transform = \`scale(\${scaleVal})\`;
                img.dataset.scale = scaleVal;
                
                img.addEventListener('click', handleImageClick);
                currentImageTarget.parentNode.replaceChild(img, currentImageTarget);
            } else {
                currentImageTarget.src = tempImgDataUrl;
                currentImageTarget.style.transform = \`scale(\${scaleVal})\`;
                currentImageTarget.dataset.scale = scaleVal;
            }
        }
        imgModal.style.display = 'none';
    });

    /* =======================================================
       儲存網頁
    ======================================================= */
    saveBtn.addEventListener('click', async () => {
        isEditing = false;
        document.body.classList.remove('is-editing');
        
        document.querySelectorAll('.editable-text').forEach(el => {
            el.classList.remove('editable-text');
            el.removeEventListener('click', handleTextClick);
        });

        document.querySelectorAll(imageSelectors).forEach(el => {
            el.removeEventListener('click', handleImageClick);
        });

        // 隱藏工具準備輸出
        document.querySelector('.editor-bottom-tools').style.display = 'none';

        try {
            const htmlContent = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], { type: 'text/html' });

            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'index.html',
                    types: [{ description: 'HTML 網頁檔', accept: {'text/html': ['.html']} }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                alert("✅ 網站更新成功！檔案已完美儲存。");
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'index-已加強修改.html';
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error(err);
        } finally {
            document.querySelector('.editor-bottom-tools').style.display = 'flex';
            editBtn.style.display = 'block';
            saveBtn.style.display = 'none';
        }
    });
});

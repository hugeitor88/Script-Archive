import {
    getDatabase,
    ref,
    push,
    set,
    query,
    orderByChild,
    equalTo,
    get
} from 'firebase/database';

export class ScriptManager {
    constructor(user, firebaseServices, soundEffects) {
        this.user = user;
        this.db = firebaseServices.db;  // Firestore
        this.realtimeDb = firebaseServices.realtimeDb;  // Realtime Database
        this.soundEffects = soundEffects;
        
        // Double-check database initialization
        if (!this.realtimeDb) {
            console.error('Realtime Database not initialized');
            this.realtimeDb = getDatabase(); // Fallback initialization
        }
        
        this.setupEventListeners();
        this.loadScripts();
    }

    setupEventListeners() {
        const uploadScriptBtn = document.getElementById('upload-script-btn');
        const closeModalBtn = document.querySelector('#upload-modal .close-modal');
        const submitScriptBtn = document.getElementById('submit-script');
        const uploadModal = document.getElementById('upload-modal');

        if (uploadScriptBtn) {
            uploadScriptBtn.addEventListener('click', () => {
                this.clearUploadForm();
                uploadModal.style.display = 'flex';
                requestAnimationFrame(() => {
                    uploadModal.classList.add('visible');
                    document.body.style.overflow = 'hidden';
                });
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeUploadModal());
        }

        if (submitScriptBtn) {
            submitScriptBtn.addEventListener('click', this.uploadScript.bind(this));
        }

        // Close modal when clicking outside
        if (uploadModal) {
            uploadModal.addEventListener('click', (e) => {
                if (e.target === uploadModal) {
                    this.closeUploadModal();
                }
            });
        }
    }

    async uploadScript() {
        try {
            const nameInput = document.getElementById('script-name');
            const contentInput = document.getElementById('script-content');
            const languageSelect = document.getElementById('script-language');
            const submitButton = document.getElementById('submit-script');

            if (!nameInput || !contentInput || !languageSelect || !submitButton) {
                this.showUploadError('Form elements not found');
                return;
            }

            // Validate inputs with early return
            if (!this.validateScriptInputs(nameInput, contentInput, languageSelect)) {
                return;
            }

            // Prepare script data
            const scriptData = this.prepareScriptData(
                nameInput.value.trim(), 
                contentInput.value.trim(), 
                languageSelect.value
            );

            // Disable submit button and show loading state
            this.disableSubmitButton(submitButton);

            // Upload script to Realtime Database
            const savedScript = await this.saveScriptToDatabase(scriptData);

            // Handle successful upload
            this.handleSuccessfulUpload(savedScript);

            // Reset form and close modal
            this.clearUploadForm();
            this.closeUploadModal();

        } catch (error) {
            console.error("Script Upload Comprehensive Error:", error);
            this.showUploadError(`Upload failed: ${error.message || 'Unknown error'}`);
        } finally {
            const submitButton = document.getElementById('submit-script');
            this.enableSubmitButton(submitButton);
        }
    }

    validateScriptInputs(nameInput, contentInput, languageSelect) {
        const name = nameInput.value.trim();
        const content = contentInput.value.trim();
        const language = languageSelect.value;

        const validationChecks = [
            { 
                condition: !name || name.length < 3, 
                message: 'Script name must be at least 3 characters long',
                element: nameInput
            },
            { 
                condition: !content, 
                message: 'Please enter script content',
                element: contentInput
            },
            { 
                condition: !language, 
                message: 'Please select a script language',
                element: languageSelect
            }
        ];

        for (const check of validationChecks) {
            if (check.condition) {
                this.showUploadError(check.message);
                check.element.focus();
                return false;
            }
        }

        return true;
    }

    prepareScriptData(name, content, language) {
        if (!this.user) {
            throw new Error('User not authenticated');
        }

        return {
            name: name,
            content: content,
            language: language,
            userId: this.user.uid,
            username: this.user.displayName || 'Unknown User',
            timestamp: Date.now(),
            size: content.length,
            hash: this.generateScriptHash(content),
            metadata: {
                contentLines: content.split('\n').length,
                contentWords: content.split(/\s+/).length,
                contentCharacters: content.length
            }
        };
    }

    async saveScriptToDatabase(scriptData) {
        const database = this.realtimeDb;
        if (!database) {
            throw new Error('Realtime Database not initialized');
        }

        const scriptsRef = ref(database, `user_scripts/${this.user.uid}`);
        const newScriptRef = push(scriptsRef);
        
        try {
            await set(newScriptRef, scriptData);
            scriptData.id = newScriptRef.key; // Add generated key to script data
            return scriptData;
        } catch (error) {
            console.error("Database Save Error:", error);
            throw new Error("Failed to save script to database");
        }
    }

    disableSubmitButton(submitButton) {
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
    }

    enableSubmitButton(submitButton) {
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save Script';
            submitButton.disabled = false;
        }
    }

    handleSuccessfulUpload(scriptData) {
        console.log("Script added with ID: ", scriptData.id);

        // Improved UI update logic
        const scriptList = document.getElementById('script-list');
        if (scriptList) {
            const noScriptsMessage = scriptList.querySelector('p');
            if (noScriptsMessage && noScriptsMessage.textContent.includes('No scripts found')) {
                scriptList.innerHTML = '';
            }

            const newScriptCard = this.createScriptCard({...scriptData}, scriptData.id);
            scriptList.prepend(newScriptCard);

            requestAnimationFrame(() => {
                newScriptCard.classList.add('animate-in');
            });
        }

        // Play success sound
        if (this.soundEffects.playSuccessSound) {
            this.soundEffects.playSuccessSound();
        }
    }

    clearUploadForm() {
        const nameInput = document.getElementById('script-name');
        const contentInput = document.getElementById('script-content');
        const languageSelect = document.getElementById('script-language');
        
        if (nameInput) nameInput.value = '';
        if (contentInput) contentInput.value = '';
        if (languageSelect) languageSelect.value = '';
        
        // Remove any existing error messages
        const uploadModal = document.getElementById('upload-modal');
        if (uploadModal) {
            const existingError = uploadModal.querySelector('.upload-error-message');
            if (existingError) {
                existingError.remove();
            }
        }
    }

    closeUploadModal() {
        const uploadModal = document.getElementById('upload-modal');
        if (uploadModal) {
            uploadModal.classList.remove('visible');
            setTimeout(() => {
                uploadModal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
    }

    showUploadError(message) {
        const uploadModal = document.getElementById('upload-modal');
        if (!uploadModal) {
            console.error('Upload modal not found');
            return;
        }

        const modalContent = uploadModal.querySelector('.modal-content');
        if (!modalContent) {
            console.error('Modal content not found');
            return;
        }

        // Remove any existing error messages first
        const existingError = uploadModal.querySelector('.upload-error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorContainer = document.createElement('div');
        errorContainer.className = 'upload-error-message';
        errorContainer.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        `;
        
        errorContainer.style.cssText = `
            background-color: rgba(255, 51, 51, 0.1);
            color: #ff3333;
            border: 1px solid #ff3333;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            animation: shake 0.5s;
        `;
        
        // Insert the error message at the top of the modal content
        modalContent.insertBefore(errorContainer, modalContent.firstChild);
        
        // Remove error after 3 seconds
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.remove();
            }
        }, 3000);
    }

    generateScriptHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    createScriptCard(script, docId) {
        const card = document.createElement('div');
        // Don't add 'animate-in' here, add it after appending to the DOM
        card.className = 'script-card';

        const nameElement = document.createElement('div');
        nameElement.className = 'script-name';
        nameElement.textContent = script.name;

        // Display username associated with the script
        const authorElement = document.createElement('div');
        authorElement.className = 'script-author';
        authorElement.textContent = `by ${script.username || 'Unknown'}`;
        authorElement.style.cssText = `
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-top: 5px;
            margin-bottom: 10px;
        `;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'script-buttons';

        const generateKeyBtn = document.createElement('button');
        generateKeyBtn.textContent = 'Generate Key';
        generateKeyBtn.className = 'script-action-btn';
        generateKeyBtn.addEventListener('click', () => this.generateKey());

        const viewRawBtn = document.createElement('button');
        viewRawBtn.textContent = 'View Raw';
        viewRawBtn.className = 'script-action-btn';
        // Pass the script content to the viewRawScript method
        viewRawBtn.addEventListener('click', () => this.viewRawScript(script.content));

        buttonsContainer.appendChild(generateKeyBtn);
        buttonsContainer.appendChild(viewRawBtn);

        card.appendChild(nameElement);
        card.appendChild(authorElement); // Add author element
        card.appendChild(buttonsContainer);

        return card;
    }

    generateKey() {
        // Generate a more robust key (e.g., UUID-like or just longer random string)
        const key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        navigator.clipboard.writeText(key).then(() => {
            alert('Unique key generated and copied to clipboard: ' + key);
        }).catch(err => {
            console.error('Failed to copy key: ', err);
            alert('Failed to copy key. Please copy manually: ' + key);
        });
    }

    viewRawScript(content) {
        const masterKey = prompt('Enter master key to view script:');
        // The master key 'hugeitor22' is hardcoded as per user request.
        // In a real application, this would be a secure authentication mechanism.
        if (masterKey === 'hugeitor22') {
            navigator.clipboard.writeText(content).then(() => {
                alert('Script code copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy script: ', err);
                // Fallback for environments where clipboard.writeText is not supported
                const tempTextarea = document.createElement('textarea');
                tempTextarea.value = content;
                tempTextarea.style.position = 'fixed'; // Prevent scrolling to the element
                tempTextarea.style.top = '0';
                tempTextarea.style.left = '0';
                tempTextarea.style.width = '1px';
                tempTextarea.style.height = '1px';
                tempTextarea.style.opacity = '0';
                document.body.appendChild(tempTextarea);
                tempTextarea.focus();
                tempTextarea.select();
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        alert('Script code copied to clipboard (using fallback).');
                    } else {
                        alert('Failed to copy script code using fallback. Please copy manually.');
                        // Optionally display in a modal/alert for manual copy
                        console.log('Script Content:', content);
                    }
                } catch (copyErr) {
                    console.error('Fallback copy failed:', copyErr);
                    alert('Failed to copy script code. Please copy manually.');
                    // Optionally display in a modal/alert for manual copy
                    console.log('Script Content:', content);
                } finally {
                    document.body.removeChild(tempTextarea);
                }
            });

        } else {
            alert('Incorrect key');
        }
    }

    async loadScripts() {
        const scriptList = document.getElementById('script-list');
        scriptList.innerHTML = '';

        // Show loading message
        const loadingMessage = document.createElement('p');
        loadingMessage.style.cssText = 'grid-column: 1/-1; text-align: center; color: var(--text-secondary);';
        loadingMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading scripts...';
        scriptList.appendChild(loadingMessage);

        try {
            // Use Realtime Database query
            const scriptsRef = ref(this.realtimeDb, `user_scripts/${this.user.uid}`);
            const scriptsSnapshot = await get(scriptsRef);

            // Clear loading message
            scriptList.innerHTML = '';

            if (!scriptsSnapshot.exists()) {
                scriptList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No scripts found. Upload your first script!</p>';
                return;
            }

            // Convert snapshot to array of scripts
            const scriptsData = scriptsSnapshot.val();
            const scripts = Object.keys(scriptsData).map(key => ({
                ...scriptsData[key],
                id: key
            })).sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

            // Add each script card with animation delay
            scripts.forEach((script, index) => {
                const scriptCard = this.createScriptCard(script, script.id);
                scriptList.appendChild(scriptCard);

                // Add animation class with a delay
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        scriptCard.classList.add('animate-in');
                    }, index * 50); // Stagger animation slightly
                });
            });
        } catch (error) {
            console.error("Error loading scripts:", error);
            scriptList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ff6666;">Failed to load scripts. Please try again.</p>';
        }
    }
}
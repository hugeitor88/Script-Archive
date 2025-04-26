import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    setDoc,
    getDoc
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';

class SoundEffects {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.clickSoundBuffer = null;
        this.successSoundBuffer = null;
        this.loadSoundEffects();
    }

    loadSoundEffects() {
        fetch('https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3')
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.clickSoundBuffer = audioBuffer;
            })
            .catch(error => console.error('Error loading click sound effect:', error));

        fetch('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3')
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.successSoundBuffer = audioBuffer;
            })
            .catch(error => console.error('Error loading success sound effect:', error));
    }

    playSound(buffer) {
        if (!buffer) {
            console.warn('Audio buffer not loaded for playback.');
            return;
        }
        if (this.audioContext.state === 'suspended') {
            console.log('AudioContext suspended, attempting to resume.');
            this.audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully.');
                this._playBuffer(buffer);
            }).catch(e => console.error('Failed to resume AudioContext:', e));
        } else {
            this._playBuffer(buffer);
        }
    }

    _playBuffer(buffer) {
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
        } catch (e) {
            console.error('Error playing sound buffer:', e);
        }
    }

    playClickSound() {
        this.playSound(this.clickSoundBuffer);
    }

    playSuccessSound() {
        this.playSound(this.successSoundBuffer);
    }
}

export class AuthManager {
    constructor(firebaseServices, ScriptManagerClass) {
        this.db = firebaseServices.db;
        this.auth = firebaseServices.auth;
        this.storage = firebaseServices.storage;
        this.realtimeDb = firebaseServices.realtimeDb;
        this.ScriptManagerClass = ScriptManagerClass;
        this.scriptManager = null;
        this.soundEffects = new SoundEffects();
        
        this.setupAuthFormListeners();
    }

    setupAuthFormListeners() {
        // Setup login form handlers
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loginUser();
            });
        }

        // Setup register form handlers
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.registerUser();
            });
        }

        // Setup form switching
        const showRegisterBtn = document.getElementById('show-register');
        const showLoginBtn = document.getElementById('show-login');
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                this.showRegisterForm();
            });
        }

        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                this.showLoginForm();
            });
        }

        // Setup profile interactions
        const profileSection = document.getElementById('profile-section');
        if (profileSection) {
            profileSection.addEventListener('click', () => this.openProfileModal());
        }

        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeProfileModal());
        });

        const avatarUpload = document.getElementById('avatar-upload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        const saveProfileBtn = document.getElementById('save-profile');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveProfileChanges());
        }
    }

    showLoginForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showLoginBtn = document.getElementById('show-login');
        const showRegisterBtn = document.getElementById('show-register');

        if (loginForm && registerForm && showLoginBtn && showRegisterBtn) {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            
            showLoginBtn.classList.add('active');
            showRegisterBtn.classList.remove('active');
        }
    }

    showRegisterForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showLoginBtn = document.getElementById('show-login');
        const showRegisterBtn = document.getElementById('show-register');

        if (loginForm && registerForm && showLoginBtn && showRegisterBtn) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            
            showRegisterBtn.classList.add('active');
            showLoginBtn.classList.remove('active');
        }
    }

    async isUsernameTaken(username) {
        if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
             return false;
        }
        const usersRef = collection(this.db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    }

    async registerUser() {
        try {
            const usernameInput = document.getElementById('register-username');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const registerBtn = document.getElementById('register-btn');

            if (!usernameInput || !emailInput || !passwordInput || !registerBtn) {
                console.error('One or more registration form elements are missing');
                return;
            }

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!username) {
                alert('Username is required.');
                usernameInput.focus();
                return;
            }

            if (username.length < 3) {
                alert('Username must be at least 3 characters long.');
                usernameInput.focus();
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                alert('Username can only contain letters, numbers, and underscores.');
                usernameInput.focus();
                return;
            }

            if (!email) {
                alert('Email is required.');
                emailInput.focus();
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address.');
                emailInput.focus();
                return;
            }

            if (!password) {
                alert('Password is required.');
                passwordInput.focus();
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                passwordInput.focus();
                return;
            }

            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

            const usernameAvailable = !(await this.isUsernameTaken(username));
            
            if (!usernameAvailable) {
                alert('This username is already in use. Please choose another.');
                registerBtn.innerHTML = 'Register';
                registerBtn.disabled = false;
                usernameInput.focus();
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { 
                displayName: username 
            });

            const usersRef = collection(this.db, "users");
            await addDoc(usersRef, {
                uid: user.uid,
                username: username,
                email: email,
                avatarUrl: user.photoURL || '',
                createdAt: new Date()
            });

            this.soundEffects.playSuccessSound();
            this.showRegistrationSuccessAnimation();
            
            usernameInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';

        } catch (error) {
            console.error("Comprehensive Registration Error:", error);
            alert('An unexpected error occurred during registration. Please try again.');
        } finally {
            const registerBtn = document.getElementById('register-btn');
            if (registerBtn) {
                registerBtn.innerHTML = 'Register';
                registerBtn.disabled = false;
            }
        }
    }

    showRegistrationSuccessAnimation() {
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.5s;
        `;

        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = `
            <h1 style="color: white; text-align: center; font-size: 3rem; animation: fadeIn 1s;">
                Registration Successful!
            </h1>
            <p style="color: #6A11CB; text-align: center; font-size: 1.5rem; animation: fadeIn 1.5s;">
                Welcome to ScriptVault
            </p>
        `;

        messageDiv.style.cssText = `
            text-align: center;
            padding: 20px;
            border-radius: 15px;
        `;

        animationContainer.appendChild(messageDiv);
        document.body.appendChild(animationContainer);

        requestAnimationFrame(() => {
            animationContainer.style.opacity = '1';
        });

        setTimeout(() => {
            animationContainer.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(animationContainer);
            }, 500);
        }, 3000);
    }

    async loginUser() {
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const loginBtn = document.getElementById('login-btn');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

         if (!email) {
            alert('Please enter your email.');
            emailInput.focus();
            return;
        }
         if (!password) {
            alert('Please enter your password.');
            passwordInput.focus();
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';


        try {
            await signInWithEmailAndPassword(this.auth, email, password);
            this.soundEffects.playSuccessSound();
            this.showLoginSuccessEffect();

        } catch (error) {
            let errorMessage = this.getAuthErrorMessage(error);
            alert(errorMessage);
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
             console.error("Login Error:", error); 
        }
    }

    showLoginSuccessEffect() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(106, 17, 203, 0.3) 0%, rgba(0, 0, 0, 0) 70%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.5s;
            pointer-events: none; 
        `;

        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.style.opacity = '1';

            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 500);
            }, 1000);
        }, 10); 
    }

    showMainApp(user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';

        const avatar = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User') + '&background=6A11CB&color=fff';

        const userAvatarImg = document.getElementById('user-avatar');
        const currentAvatarImg = document.getElementById('current-avatar');
        const profileUsernameInput = document.getElementById('profile-username');

        if(userAvatarImg) userAvatarImg.src = avatar;
        if(currentAvatarImg) currentAvatarImg.src = avatar;
        if(profileUsernameInput) profileUsernameInput.value = user.displayName || '';


        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.remove('animate__animated', 'animate__fadeOut'); 
            appContainer.classList.add('animate__animated', 'animate__fadeIn');
        }

        if (!this.scriptManager && this.ScriptManagerClass) {
             this.scriptManager = new this.ScriptManagerClass(user, this.db, this);
        } else if (this.scriptManager) {
            this.scriptManager.user = user;
            this.scriptManager.loadScripts();
        } else {
             console.error("ScriptManagerClass not provided to AuthManager constructor.");
        }
    }

    showAuthForms() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        this.showLoginForm(); 

         if (this.scriptManager) {
             const scriptList = document.getElementById('script-list');
             if (scriptList) {
                  scriptList.innerHTML = ''; 
             }
             this.scriptManager = null; 
        }
    }

    openProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            profileModal.style.display = 'flex';
             profileModal.classList.remove('animate__animated', 'animate__fadeOutDown'); 
             profileModal.classList.add('animate__animated', 'animate__fadeInUp'); 
        }
    }

    closeProfileModal() {
        const profileModal = document.getElementById('profile-modal');
         if (profileModal) {
             profileModal.classList.remove('animate__animated', 'animate__fadeInUp');
             profileModal.classList.add('animate__animated', 'animate__fadeOutDown'); 
             profileModal.addEventListener('animationend', function handler() {
                 profileModal.style.display = 'none';
                 profileModal.classList.remove('animate__animated', 'animate__fadeOutDown');
                 profileModal.removeEventListener('animationend', handler);
             });
         }
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const user = this.auth.currentUser;
        if (!user) {
            alert('You must be logged in to change your avatar');
            return;
        }

        const avatarImg = document.getElementById('current-avatar');
        const avatarUploadStatus = document.getElementById('avatar-upload-status');
        const userAvatarImg = document.getElementById('user-avatar'); 

        try {
            // Validate file size and type
            if (file.size > 5 * 1024 * 1024) {  // 5MB limit
                alert('File is too large. Maximum size is 5MB.');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('Only JPEG, PNG, and GIF files are allowed.');
                return;
            }

            if (avatarImg) avatarImg.src = 'https://i.gifer.com/ZKZg.gif'; 
            if (userAvatarImg) userAvatarImg.src = 'https://i.gifer.com/ZKZg.gif'; 

            if (avatarUploadStatus) {
                 avatarUploadStatus.textContent = 'Uploading...';
                 avatarUploadStatus.style.color = '#A0A0A0';
            }

            // Use a more specific storage path
            const storageRef = ref(this.storage, `avatars/${user.uid}_${Date.now()}`);

            // Upload with metadata
            const metadata = {
                contentType: file.type,
            };

            // Upload with progress
            const uploadTask = uploadBytes(storageRef, file, metadata);

            // Wait for upload to complete
            const snapshot = await uploadTask;
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update Firebase Auth profile
            await updateProfile(user, { photoURL: downloadURL });

            // Update Realtime Database instead of Firestore
            const userRef = ref(this.realtimeDb, `users/${user.uid}`);
            await set(userRef, {
                uid: user.uid,
                username: user.displayName,
                email: user.email,
                avatarUrl: downloadURL,
                updatedAt: Date.now()
            });

            if (userAvatarImg) userAvatarImg.src = downloadURL;
            if (avatarImg) avatarImg.src = downloadURL; 

            if (avatarUploadStatus) {
                 avatarUploadStatus.textContent = 'Upload successful!';
                 avatarUploadStatus.style.color = '#4CAF50';
                 this.soundEffects.playSuccessSound();
            }

            // Close profile modal after successful upload
            this.closeProfileModal();

        } catch (error) {
            console.error('Avatar upload error:', error);
            if (avatarUploadStatus) {
                 avatarUploadStatus.textContent = 'Upload failed.';
                 avatarUploadStatus.style.color = '#ff3333';
            }
            alert('Failed to upload avatar: ' + (error.message || 'Unknown error'));
            
            // Restore previous avatar or use default
            const currentPhotoURL = this.auth.currentUser?.photoURL;
            const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User') + '&background=6A11CB&color=fff';
            if (userAvatarImg) userAvatarImg.src = currentPhotoURL || defaultAvatar;
            if (avatarImg) avatarImg.src = currentPhotoURL || defaultAvatar;
        } finally {
             setTimeout(() => {
                 if (avatarUploadStatus) avatarUploadStatus.textContent = '';
             }, 3000);
        }
    }

    async saveProfileChanges() {
        const user = this.auth.currentUser;
        if (!user) {
             alert('You must be logged in to save profile changes.');
             return;
        }

        const profileUsernameInput = document.getElementById('profile-username');
        const saveProfileBtn = document.getElementById('save-profile');

        const newUsername = profileUsernameInput.value.trim();
        const currentUsername = user.displayName;

        if (!newUsername || newUsername.length < 3 || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            alert('Username must be at least 3 characters and contain only letters, numbers, and underscores.');
            profileUsernameInput.focus();
            return;
        }

        // Check for username availability using Realtime Database
        const usersRef = ref(this.realtimeDb, 'users');
        const usernameQuery = query(usersRef, orderByChild('username'), equalTo(newUsername));
        const snapshot = await get(usernameQuery);

        if (snapshot.exists()) {
            // Check if the existing username is not the current user's
            const existingUsers = Object.values(snapshot.val());
            const isOwnUsername = existingUsers.some(u => u.uid === user.uid);
            
            if (!isOwnUsername) {
                alert('This username is already in use. Please choose another.');
                profileUsernameInput.focus();
                return;
            }
        }

        if (newUsername === currentUsername) {
            alert('No changes detected.');
            this.closeProfileModal();
            return;
        }

        saveProfileBtn.disabled = true;
        saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            await updateProfile(user, { displayName: newUsername });

            // Use Realtime Database to update user
            const userRef = ref(this.realtimeDb, `users/${user.uid}`);
            await set(userRef, {
                uid: user.uid,
                username: newUsername,
                email: user.email,
                avatarUrl: user.photoURL || '',
                updatedAt: Date.now()
            });

            this.soundEffects.playSuccessSound();
            alert('Profile updated successfully!');

            profileUsernameInput.value = user.displayName;

            const userAvatarImg = document.getElementById('user-avatar');
            if (userAvatarImg && !user.photoURL) {
                userAvatarImg.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User') + '&background=6A11CB&color=fff';
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile: ' + error.message);
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.innerHTML = 'Save Changes';
            this.closeProfileModal(); 
        }
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/weak-password':
                return 'Password too weak. Must be at least 6 characters';
            case 'auth/invalid-email':
                return 'Invalid email format';
            case 'auth/invalid-login-credentials':
                return 'Invalid email or password';
            case 'auth/user-not-found':
                return 'No user found with this email.';
            case 'auth/wrong-password':
                 return 'Incorrect password.';
            default:
                return error.message || 'Authentication failed';
        }
    }
}
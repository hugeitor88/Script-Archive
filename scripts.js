// Main entry point for the application
import { initializeFirebaseServices } from './modules/firebase-config.js';
import { AuthManager } from './modules/auth-manager.js';
import { ScriptManager } from './modules/script-manager.js';
import { MusicPlayer } from './modules/music-player.js'; 
import { onAuthStateChanged } from 'firebase/auth';

// Firebase configuration - Should be fetched from a secure source or environment variables
// For demonstration purposes, keeping it inline as in the original code
const firebaseConfig = {
    apiKey: "AIzaSyDja5QAlLu7k7Vy0ejxmKCGd7YSvTCT-dU",
    authDomain: "yeah-58a5c.firebaseapp.com",
    projectId: "yeah-58a5c",
    storageBucket: "yeah-58a5c.appspot.com",
    messagingSenderId: "337596579571",
    appId: "1:337596579571:web:9ae57689b528d9aa08c186",
    measurementId: "G-2PDCWW4WEB",
    databaseURL: "https://yeah-58a5c-default-rtdb.firebaseio.com/"  
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase services
    const firebaseServices = initializeFirebaseServices(firebaseConfig);

    if (firebaseServices) {
        const { auth, db, storage } = firebaseServices;

        // Initialize Music Player
        const musicPlayer = new MusicPlayer('/Trippie Redd  Danny Phantom Ft. XXXTENTACION (Official Music Video).mp3');

        // Initialize AuthManager and pass the ScriptManager class for lazy instantiation
        const authManager = new AuthManager(firebaseServices, ScriptManager);

        // Direct form switcher hooks - to ensure they work before auth state changes
        const showRegisterBtn = document.getElementById('show-register');
        const showLoginBtn = document.getElementById('show-login');
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('register-form').style.display = 'block';
                showRegisterBtn.classList.add('active');
                showLoginBtn.classList.remove('active');
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('register-form').style.display = 'none';
                showLoginBtn.classList.add('active');
                showRegisterBtn.classList.remove('active');
            });
        }

        // Auth state listener
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                console.log("User logged in:", user.uid, user.displayName);
                authManager.showMainApp(user);
            } else {
                // User is signed out
                console.log("User logged out.");
                authManager.showAuthForms();
            }
        });

    } else {
        console.error('Application initialization failed due to Firebase errors.');
    }
});
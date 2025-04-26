import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

export function initializeFirebaseServices(config) {
    const validateConfig = (config) => {
        const requiredFields = [
            'apiKey',
            'authDomain',
            'projectId',
            'storageBucket',
            'messagingSenderId',
            'appId',
            'databaseURL'
        ];

        const missingFields = requiredFields.filter(field =>
            !config[field] || config[field].trim() === ''
        );

        if (missingFields.length > 0) {
            console.error('Missing Firebase configuration fields:', missingFields);
            throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
        }

        return config;
    };

    try {
        const validConfig = validateConfig(config);

        const app = initializeApp(validConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        const storage = getStorage(app);
        const realtimeDb = getDatabase(app);

        // Enable offline persistence for Firestore
        enableIndexedDbPersistence(db)
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Multiple tabs open, offline persistence disabled');
                } else if (err.code === 'unimplemented') {
                    console.warn('Browser does not support offline persistence');
                }
            });

        if (!app) throw new Error('Failed to initialize Firebase App');
        if (!db) throw new Error('Failed to initialize Firestore');
        if (!auth) throw new Error('Failed to initialize Authentication');
        if (!storage) throw new Error('Failed to initialize Storage');
        if (!realtimeDb) throw new Error('Failed to initialize Realtime Database');

        return { 
            app, 
            db, 
            auth, 
            storage,
            realtimeDb 
        };

    } catch (error) {
        console.error('Firebase Initialization Error:', error);

        const errorMessage = `
            Firebase Setup Failed.
            Please check your configuration or contact support.
            Error Details: ${error.message}
        `;

        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background-color: #ff3333;
            color: white;
            padding: 20px;
            text-align: center;
            z-index: 1000;
        `;
        errorContainer.textContent = errorMessage;
        document.body.prepend(errorContainer);

        return null;
    }
}
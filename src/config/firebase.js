// src/config/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  databaseURL: 'https://atom-master-8f5fa-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'atom-master-8f5fa',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: '1:488843004199:android:65d7d2eaf6b9e5c2d78102'
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const database = getDatabase(app);

export { app, database };

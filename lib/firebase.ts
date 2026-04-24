import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCKjt9xHMcNLURPgjKQ8QiCu0X_ySYINXo",
  authDomain: "timetable-b7b4d.firebaseapp.com",
  projectId: "timetable-b7b4d",
  storageBucket: "timetable-b7b4d.firebasestorage.app",
  messagingSenderId: "910354178176",
  appId: "1:910354178176:web:7f788c73c6b77c11b30665"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export default app;

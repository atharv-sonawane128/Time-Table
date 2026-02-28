import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firestore persistence not supported in this browser');
  }
});

export default app;

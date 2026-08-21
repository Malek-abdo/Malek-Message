import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDWUjuz9K1vQ24O-oEvVD8loKzFTkn13Bk",
  authDomain: "malek-message.firebaseapp.com",
  projectId: "malek-message",
  storageBucket: "malek-message.firebasestorage.app",
  messagingSenderId: "572327933472",
  appId: "1:572327933472:web:5446e6681e2ba9a654ee45",
  measurementId: "G-ZSVP185PNV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  }
);
export const googleProvider = new GoogleAuthProvider();


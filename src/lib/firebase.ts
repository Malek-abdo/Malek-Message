import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCV_NMFO8O9rzIo8FhfRYM5HcHsXCPSJ6E",
  authDomain: "scientific-shine-267s8.firebaseapp.com",
  projectId: "scientific-shine-267s8",
  storageBucket: "scientific-shine-267s8.firebasestorage.app",
  messagingSenderId: "52598316377",
  appId: "1:52598316377:web:77635b3e9e4a084f130048",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  "ai-studio-malekmassege-7fcd9773-0923-4991-8cd5-64673a960783"
);
export const googleProvider = new GoogleAuthProvider();


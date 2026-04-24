import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvQZ8X2X2wmiGrtUUnfefkgOkYDbQ1zZA",
  authDomain: "health-assist-1f9c8.firebaseapp.com",
  projectId: "health-assist-1f9c8",
  storageBucket: "health-assist-1f9c8.firebasestorage.app",
  messagingSenderId: "933809150073",
  appId: "1:933809150073:web:87018e91de5c1dde211ca8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXBjNkNUxCsYupDx6Iqtr7LoKrCKx8hpg",
  authDomain: "healthcare-92dd8.firebaseapp.com",
  projectId: "healthcare-92dd8",
  storageBucket: "healthcare-92dd8.firebasestorage.app",
  messagingSenderId: "290923451140",
  appId: "1:290923451140:web:704cacb07746ef507b7651"
};

// Initialize Firebase
 export const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export { auth };
export const firestore = getFirestore(app);
export const storage = getStorage(app);
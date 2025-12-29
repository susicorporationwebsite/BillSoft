import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBUp9IwO0E2fVsMZIExa5J3e-GBIKeEMw8",
    authDomain: "susi-bill.firebaseapp.com",
    projectId: "susi-bill",
    storageBucket: "susi-bill.firebasestorage.app",
    messagingSenderId: "267000238728",
    appId: "1:267000238728:web:4554f1359c86d2b29ec53d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

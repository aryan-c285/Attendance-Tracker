// Firebase configuration file
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js';
import { getDatabase, ref, set, get, push, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-database.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCjVMLmIpU1FWgXo0cD3jiQawMWbuAJJFk",
  authDomain: "attendance-tracker-9da05.firebaseapp.com",
  databaseURL: "https://attendance-tracker-9da05-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "attendance-tracker-9da05",
  storageBucket: "attendance-tracker-9da05.firebasestorage.app",
  messagingSenderId: "427743884811",
  appId: "1:427743884811:web:1188715e2dcb3451f2b90e",
  measurementId: "G-C0SQNW988H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Create global firebaseApp object for access in other files
window.firebaseApp = {
  app: app,
  db: database,
  isConnected: true,
  getDatabase: () => database,
  databaseFunctions: {
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue
  }
};

console.log("Firebase initialized successfully");


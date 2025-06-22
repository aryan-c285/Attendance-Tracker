// Firebase configuration file
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js';
import { getDatabase, ref, set, get, push, update, remove, onValue, child } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-database.js';

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

// Initialize Firebase with error handling
let app, database;

try {
  console.log("Initializing Firebase...");
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  console.log("Firebase initialized successfully");
  
  // Test database connection
  const testRef = ref(database, '.info/connected');
  onValue(testRef, (snapshot) => {
    const connected = snapshot.val();
    console.log("Firebase connection state:", connected ? "connected" : "disconnected");
    if (window.firebaseApp) {
      window.firebaseApp.isConnected = !!connected;
    }
  });
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  app = null;
  database = null;
}

// Create global firebaseApp object for access in other files
window.firebaseApp = {
  app: app,
  db: database,
  isConnected: !!database,
  getDatabase: () => database,
  databaseFunctions: {
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    child
  }
};

console.log("Firebase initialized successfully");


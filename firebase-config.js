// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3-4zywDqaYY6klyFOU8GnkPKV3SFHhN0",
  authDomain: "digit-guess-de87d.firebaseapp.com",
  projectId: "digit-guess-de87d",
  storageBucket: "digit-guess-de87d.firebasestorage.app",
  messagingSenderId: "244588037662",
  appId: "1:244588037662:web:6f56dc53060ef22667500f",
  databaseURL: "https://digit-guess-de87d-default-rtdb.europe-west1.firebasedatabase.app" // Updated to europe-west1
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize Realtime Database with error handling
let rtdb = null;
try {
  rtdb = firebase.database();
  console.log('Realtime Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize Realtime Database:', error);
  console.log('Please enable Realtime Database in your Firebase console');
}

// Export for use in other files
window.FirebaseApp = {
  auth,
  db,
  rtdb,
  firebase
};
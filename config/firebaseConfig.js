// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy-GQUTzp2BW6BPoaziASqMr5Vi4Onq-U",
  authDomain: "classmeet-b859a.firebaseapp.com",
  projectId: "classmeet-b859a",
  storageBucket: "classmeet-b859a.firebasestorage.app",
  messagingSenderId: "721782099447",
  appId: "1:721782099447:web:724859df02ce6f578932f2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
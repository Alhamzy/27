import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBRMnP_1wnKE_DIUxzvwNLgWlNGkv97mrQ',
  authDomain: 'workout-93eb2.firebaseapp.com',
  projectId: 'workout-93eb2',
  storageBucket: 'workout-93eb2.firebasestorage.app',
  messagingSenderId: '310800965608',
  appId: '1:310800965608:web:ede40413e0c4d2f477ce5d',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);

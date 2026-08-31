import { getAuth } from 'firebase/auth';
import { app } from './firebase';

/** Admin-only. Kept out of ./firebase so the public bundle skips firebase/auth. */
export const auth = getAuth(app);

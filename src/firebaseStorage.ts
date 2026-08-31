import { getStorage } from 'firebase/storage';
import { app } from './firebase';

/** Admin-only. Kept out of ./firebase so the public bundle skips firebase/storage. */
export const storage = getStorage(app);

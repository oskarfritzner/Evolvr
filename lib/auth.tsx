import { useState, useEffect } from 'react';
import { auth } from '@/backend/config/firebase';
import { User } from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return auth.onAuthStateChanged(user => {
      setUser(user);
    });
  }, []);

  return { user };
}; 
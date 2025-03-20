import { FirebaseError } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  User,
} from "firebase/auth"
import { auth } from "@/backend/config/firebase"
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SignUpData {
  email: string
  password: string
}

interface SignInData {
  email: string
  password: string
}

export const signUp = async ({ email, password }: SignUpData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error) {
    if (error instanceof FirebaseError) {
      return { user: null, error: error.message }
    }
    return { user: null, error: 'An unexpected error occurred' }
  }
}

export const signIn = async ({ email, password }: SignInData) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error) {
    if (error instanceof FirebaseError) {
      return { user: null, error: error.message }
    }
    return { user: null, error: 'An unexpected error occurred' }
  }
}

export async function signOut() {
  try {
    await auth.signOut()
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

export const updateProfile = async (user: User, data: { displayName?: string; photoURL?: string }) => {
  try {
    await firebaseUpdateProfile(user, data)
    return { error: null }
  } catch (error) {
    if (error instanceof FirebaseError) {
      return { error: error.message }
    }
    return { error: 'An unexpected error occurred' }
  }
}

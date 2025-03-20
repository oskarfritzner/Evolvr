import { Timestamp } from "firebase/firestore";
import { Friend } from "./Friend";

export interface Post {
  id: string;
  userId: string;
  username: string;
  userPhotoURL?: string;
  title?: string;
  description?: string;
  imageURL?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  privacy: "public" | "friends" | "private";
  location?: string;
  hashtags?: string[];
  content: string;
  likedBy: string[];
  likedByDetails?: Friend[];
  comments?: Comment[];
  likes: number;
}

export interface Comment {
  id?: string;
  userId: string;
  username: string;
  userPhotoURL?: string;
  content: string;
  createdAt: Timestamp;
}

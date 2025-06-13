export async function logProgress(
  userId: string,
  routineId: string,
  taskId: string,
  progress: number
): Promise<void> {
  try {
    const progressRef = doc(db, "progress", `${userId}_${routineId}_${taskId}`);
    await setDoc(progressRef, {
      userId,
      routineId,
      taskId,
      progress,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(
      `Failed to log progress: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

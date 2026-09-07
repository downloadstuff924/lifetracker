export function errorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/email-already-in-use":
      "An account already exists with this email. Please sign in.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed":
      "Unable to connect. Check your internet connection.",
    "auth/operation-not-allowed":
      "Email/password sign-in needs to be enabled in Firebase Console.",
    "auth/configuration-not-found":
      "Firebase Authentication is not set up yet. Enable Authentication and the Email/Password provider in Firebase Console.",
    "permission-denied":
      "Access was denied. Check that the Firebase security rules have been published.",
    "storage/unauthorized":
      "Image access was denied. Check your Firebase Storage rules.",
  };
  return (
    (code && messages[code]) ||
    (error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.")
  );
}

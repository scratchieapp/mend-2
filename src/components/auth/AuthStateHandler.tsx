import { AuthCallback } from "./AuthCallback";
import { SessionManager } from "./SessionManager";

interface AuthStateHandlerProps {
  onProfileFetch: (userId: string) => Promise<any>;
}

export const AuthStateHandler = ({ onProfileFetch }: AuthStateHandlerProps) => {
  return (
    <>
      <AuthCallback />
      <SessionManager onProfileFetch={onProfileFetch} />
    </>
  );
};
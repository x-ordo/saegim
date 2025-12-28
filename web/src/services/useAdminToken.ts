const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Conditional import: only load Clerk when configured
// eslint-disable-next-line @typescript-eslint/no-var-requires
const useAuthReal = clerkPubKey ? require('@clerk/nextjs').useAuth : null;

// Mock auth hook for when Clerk is not configured
function useAuthMock() {
  return {
    isLoaded: true,
    isSignedIn: false,
    getToken: async () => null,
    orgId: null,
    orgRole: null,
  };
}

// Use the appropriate auth hook based on configuration
const useAuthHook = clerkPubKey ? useAuthReal : useAuthMock;

export function useAdminToken() {
  const auth = useAuthHook();

  // If Clerk is not configured, return mock values for local development
  if (!clerkPubKey) {
    return {
      isLoaded: true,
      isSignedIn: false,
      orgId: null,
      orgRole: null,
      getAdminToken: async (): Promise<string> => {
        throw new Error('Clerk not configured - please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
      },
    };
  }

  const { isLoaded, isSignedIn, getToken, orgId, orgRole } = auth;

  const getAdminToken = async (): Promise<string> => {
    if (!isLoaded) throw new Error('Auth not loaded');
    if (!isSignedIn) throw new Error('Not signed in');

    const template = process.env.NEXT_PUBLIC_AUTH_TOKEN_TEMPLATE;
    const token = template ? await getToken({ template }) : await getToken();

    if (!token) throw new Error('No auth token');
    return token;
  };

  return { isLoaded, isSignedIn, orgId, orgRole, getAdminToken };
}

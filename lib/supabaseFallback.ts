type NoopResponse = { data: any; error: null };

const noopResponse = async (): Promise<NoopResponse> => ({ data: null, error: null });

function createNoopQuery() {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    in: () => chain,
    or: () => chain,
    ilike: () => chain,
    contains: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: noopResponse,
    maybeSingle: noopResponse,
    insert: noopResponse,
    update: noopResponse,
    upsert: noopResponse,
    delete: noopResponse,
  };
  return chain;
}

export function createNoopSupabaseClient() {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  } as any;

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithOAuth: async () => ({ data: null, error: new Error("Supabase is not configured") }),
      signInWithOtp: async () => ({ data: null, error: new Error("Supabase is not configured") }),
      verifyOtp: async () => ({ data: { user: null }, error: new Error("Supabase is not configured") }),
      exchangeCodeForSession: async () => ({ data: { user: null }, error: new Error("Supabase is not configured") }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => createNoopQuery(),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error("Supabase is not configured") }),
        remove: async () => ({ data: null, error: null }),
        list: async () => ({ data: null, error: null }),
      }),
    },
    channel: () => channel,
    removeChannel: () => {},
  } as any;
}

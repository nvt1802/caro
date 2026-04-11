import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const user = await serverSupabaseUser(event);

  if (!user) {
    return { stats: [] };
  }

  const { data, error } = await client
    .from("user_stats")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { stats: data || [] };
});

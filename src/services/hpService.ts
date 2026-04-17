import { supabase } from './supabaseClient';

export interface UserProfile {
  wallet_address: string;
  hp_balance: number;
  last_active: string;
}

export async function awardHP(walletAddress: string, amount: number) {
  if (!walletAddress) return;

  try {
    // We use a custom RPC or just a direct update since we have RLS policies set up
    // However, to do an atomic increment in Supabase without a custom RPC function:
    // We fetch and then update, or use the postgrest syntax if available.
    // Given the user's RLS policy, we will fetch and then update:
    
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('hp_balance')
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('[HP_SERVICE] Error fetching profile:', fetchError);
      return;
    }

    const currentHP = profile?.hp_balance || 0;
    const newHP = currentHP + amount;

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        wallet_address: walletAddress,
        hp_balance: newHP,
        last_active: new Date().toISOString()
      }, { onConflict: 'wallet_address' });

    if (upsertError) {
      console.error('[HP_SERVICE] Error awarding HP:', upsertError);
    } else {
      console.log(`[HP_SERVICE] Awarded ${amount} HP to ${walletAddress}. New total: ${newHP}`);
    }
  } catch (error) {
    console.error('[HP_SERVICE] Unexpected error:', error);
  }
}

export async function getLeaderboard(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('hp_balance', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[HP_SERVICE] Error fetching leaderboard:', error);
    return [];
  }

  return data || [];
}

export async function getUserProfile(walletAddress: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[HP_SERVICE] Error fetching user profile:', error);
    }
    return null;
  }

  return data;
}

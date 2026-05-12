import { supabase } from './supabase';
import type { Category, Item, Poll, PollVote, PollDataEntry } from './types';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchItemsByCategory(categoryId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAllItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchPollVotes(pollId: string): Promise<PollVote[]> {
  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', pollId);

  if (error) throw error;
  return data || [];
}

export function buildSwiggyUrl(pollData: PollDataEntry[]): string {
  const encoded = encodeURIComponent(JSON.stringify(pollData));
  return `https://swiggy.com/instamart?poll_data=${encoded}`;
}

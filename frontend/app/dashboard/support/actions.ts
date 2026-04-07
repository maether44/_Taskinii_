'use server';

import { getTickets, updateTicketStatus } from '@/lib/supabase/queries/support';

export async function fetchTickets(status?: string) {
  return getTickets(status);
}

export async function changeTicketStatus(id: string, status: string) {
  return updateTicketStatus(id, status);
}

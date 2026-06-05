import { supabase } from './supabase.js';

export class PaymentStore {
  static async createPayment(merchant, amount, memo) {
    const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const payment = {
      id: paymentId,
      merchant: merchant.toLowerCase(),
      amount: parseFloat(amount),
      memo,
      status: 'pending',
      createdat: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single();

    if (error) {
      console.error('Failed to create payment in Supabase', error);
      throw error;
    }

    return data;
  }

  static async getPayment(id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Failed to fetch payment', error);
      return null;
    }
    return data;
  }

  static async getRecentPayments(merchant) {
    if (!merchant) return [];
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('merchant', merchant.toLowerCase())
      .order('createdat', { ascending: false });
      
    if (error) {
      console.error('Failed to fetch recent payments', error);
      return [];
    }
    
    return data;
  }

  static async updatePayment(id, merchant, updates) {
    // Only allow updating amount or status
    const allowedUpdates = {};
    if (updates.amount !== undefined) allowedUpdates.amount = parseFloat(updates.amount);
    if (updates.status !== undefined) allowedUpdates.status = updates.status;

    const { data, error } = await supabase
      .from('payments')
      .update(allowedUpdates)
      .eq('id', id)
      .eq('merchant', merchant.toLowerCase()) // Extra frontend safety
      .select()
      .single();

    if (error) {
      console.error('Failed to update payment', error);
      throw error;
    }
    return data;
  }
}

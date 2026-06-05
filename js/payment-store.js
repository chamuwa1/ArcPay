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
}

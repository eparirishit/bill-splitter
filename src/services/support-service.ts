import { getSupabaseClient } from '@/lib/supabase';

export interface SupportRequest {
  id: string;
  user_id: string;
  type: 'bug' | 'feature' | 'general' | 'support';
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  user_email?: string;
  user_name?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface CreateSupportRequestParams {
  user_id: string;
  type: 'bug' | 'feature' | 'general' | 'support';
  message: string;
  user_email?: string;
  user_name?: string;
  metadata?: Record<string, any>;
}

export class SupportService {
  /**
   * Submit a general feedback or support request
   */
  static async submitSupportRequest(
    params: CreateSupportRequestParams
  ): Promise<string> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: params.user_id,
          type: params.type,
          message: params.message.trim(),
          user_email: params.user_email,
          user_name: params.user_name,
          metadata: params.metadata || {},
          status: 'open'
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to submit support request: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Error submitting support request:', error);
      throw error;
    }
  }

  /**
   * Get support requests for a user
   */
  static async getUserSupportRequests(
    userId: string,
    limit: number = 50
  ): Promise<SupportRequest[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch support requests: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching support requests:', error);
      throw error;
    }
  }

  /**
   * Get all support requests (admin only)
   */
  static async getAllSupportRequests(
    filters?: {
      type?: 'bug' | 'feature' | 'general' | 'support';
      status?: 'open' | 'in_progress' | 'resolved' | 'closed';
      limit?: number;
    }
  ): Promise<SupportRequest[]> {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch support requests: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all support requests:', error);
      throw error;
    }
  }

  /**
   * Update support request status
   */
  static async updateSupportRequestStatus(
    requestId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_feedback')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        throw new Error(`Failed to update support request: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating support request:', error);
      throw error;
    }
  }

  /**
   * Get support request statistics
   */
  static async getSupportStats(): Promise<{
    total_requests: number;
    open_requests: number;
    resolved_requests: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_feedback')
        .select('type, status');

      if (error) {
        throw new Error(`Failed to fetch support stats: ${error.message}`);
      }

      const stats = {
        total_requests: data?.length || 0,
        open_requests: 0,
        resolved_requests: 0,
        by_type: {} as Record<string, number>,
        by_status: {} as Record<string, number>
      };

      data?.forEach(request => {
        // Count by type
        stats.by_type[request.type] = (stats.by_type[request.type] || 0) + 1;
        
        // Count by status
        stats.by_status[request.status] = (stats.by_status[request.status] || 0) + 1;
        
        // Count open/resolved
        if (request.status === 'open' || request.status === 'in_progress') {
          stats.open_requests++;
        } else if (request.status === 'resolved' || request.status === 'closed') {
          stats.resolved_requests++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching support stats:', error);
      throw error;
    }
  }
}


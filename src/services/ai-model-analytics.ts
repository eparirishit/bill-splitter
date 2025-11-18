import { getSupabaseClient } from '@/lib/supabase';

export interface AIModelStats {
  ai_provider: string;
  ai_model_name: string;
  total_requests: number;
  avg_processing_time_ms: number;
  avg_tokens_used: number;
  total_tokens_used: number;
  first_used: string;
  last_used: string;
}

export interface AIModelComparison {
  provider: string;
  model: string;
  requests: number;
  avgProcessingTime: number;
  avgTokens: number;
  successRate: number;
  costEstimate: number; // Estimated cost based on tokens
}

export class AIModelAnalyticsService {
  /**
   * Get AI model usage statistics
   */
  static async getModelStats(): Promise<AIModelStats[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('ai_model_analytics')
        .select('*')
        .order('total_requests', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch AI model stats: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching AI model stats:', error);
      throw error;
    }
  }

  /**
   * Get AI model performance comparison
   */
  static async getModelComparison(): Promise<AIModelComparison[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('receipt_processing_history')
        .select(`
          ai_provider,
          ai_model_name,
          ai_processing_time_ms,
          ai_tokens_used,
          feedback
        `)
        .not('ai_provider', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch AI model comparison data: ${error.message}`);
      }

      // Group by provider and model
      const grouped = data.reduce((acc, record) => {
        const key = `${record.ai_provider}-${record.ai_model_name}`;
        if (!acc[key]) {
          acc[key] = {
            provider: record.ai_provider,
            model: record.ai_model_name,
            processingTimes: [],
            tokensUsed: [],
            feedback: [],
          };
        }
        
        if (record.ai_processing_time_ms) {
          acc[key].processingTimes.push(record.ai_processing_time_ms);
        }
        if (record.ai_tokens_used) {
          acc[key].tokensUsed.push(record.ai_tokens_used);
        }
        if (record.feedback) {
          acc[key].feedback.push(record.feedback);
        }
        
        return acc;
      }, {} as Record<string, any>);

      // Calculate statistics
      const comparison: AIModelComparison[] = Object.values(grouped).map((group: any) => {
        const avgProcessingTime = group.processingTimes.length > 0 
          ? group.processingTimes.reduce((a: number, b: number) => a + b, 0) / group.processingTimes.length 
          : 0;
        
        const avgTokens = group.tokensUsed.length > 0 
          ? group.tokensUsed.reduce((a: number, b: number) => a + b, 0) / group.tokensUsed.length 
          : 0;
        
        const totalRequests = group.processingTimes.length;
        const successRate = group.feedback.length > 0 
          ? (group.feedback.filter((f: any) => f.overall_accuracy === 'thumbs_up').length / group.feedback.length) * 100
          : 0;

        // Rough cost estimation (this would need to be updated with actual pricing)
        const costEstimate = this.estimateCost(group.provider, avgTokens, totalRequests);

        return {
          provider: group.provider,
          model: group.model,
          requests: totalRequests,
          avgProcessingTime,
          avgTokens,
          successRate,
          costEstimate,
        };
      });

      return comparison.sort((a, b) => b.requests - a.requests);
    } catch (error) {
      console.error('Error fetching AI model comparison:', error);
      throw error;
    }
  }

  /**
   * Get provider-specific statistics
   */
  static async getProviderStats(provider: string): Promise<AIModelStats[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('ai_model_analytics')
        .select('*')
        .eq('ai_provider', provider)
        .order('total_requests', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch provider stats: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching provider stats:', error);
      throw error;
    }
  }

  /**
   * Get recent AI model usage
   */
  static async getRecentUsage(limit: number = 10): Promise<any[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('receipt_processing_history')
        .select(`
          id,
          user_id,
          ai_provider,
          ai_model_name,
          ai_processing_time_ms,
          ai_tokens_used,
          created_at
        `)
        .not('ai_provider', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent usage: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent usage:', error);
      throw error;
    }
  }

  /**
   * Estimate cost based on provider and tokens (rough estimation)
   */
  private static estimateCost(provider: string, avgTokens: number, requests: number): number {
    // These are rough estimates and should be updated with actual pricing
    const pricing = {
      'google-gemini': {
        input: 0.000125, // per 1K tokens
        output: 0.000375, // per 1K tokens
      },
      'openrouter': {
        input: 0.00015, // per 1K tokens (average)
        output: 0.0006, // per 1K tokens (average)
      },
    };

    const rates = pricing[provider as keyof typeof pricing] || pricing['google-gemini'];
    const totalTokens = avgTokens * requests;
    const estimatedCost = (totalTokens / 1000) * (rates.input + rates.output);

    return Math.round(estimatedCost * 100) / 100; // Round to 2 decimal places
  }
} 
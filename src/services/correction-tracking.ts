import { supabase } from '@/lib/supabase';
import { CorrectionData, CorrectionPattern, ExtractReceiptDataOutput } from '@/types/analytics';

export class CorrectionTrackingService {
  /**
   * Calculate correction data from original AI extraction and user modifications
   */
  static calculateCorrectionData(
    originalExtraction: ExtractReceiptDataOutput,
    userModifications: {
      items?: Array<{ name: string; price: number }>;
      taxes?: number;
      otherCharges?: number;
      totalCost?: number;
    }
  ): CorrectionData {
    const corrections = {
      items: [] as Array<{
        original: { name: string; price: number };
        corrected: { name: string; price: number };
        correction_type: 'name' | 'price' | 'both';
      }>,
      taxes: undefined as { original: number; corrected: number } | undefined,
      other_charges: undefined as { original: number; corrected: number } | undefined,
      total_cost: undefined as { original: number; corrected: number } | undefined
    };

    // Track item corrections
    if (userModifications.items) {
      userModifications.items.forEach((modifiedItem, index) => {
        const originalItem = originalExtraction.items[index];
        if (originalItem) {
          const nameChanged = originalItem.name !== modifiedItem.name;
          const priceChanged = Math.abs(originalItem.price - modifiedItem.price) > 0.01;

          if (nameChanged || priceChanged) {
            let correctionType: 'name' | 'price' | 'both' = 'name';
            if (nameChanged && priceChanged) {
              correctionType = 'both';
            } else if (priceChanged) {
              correctionType = 'price';
            }

            corrections.items.push({
              original: { name: originalItem.name, price: originalItem.price },
              corrected: { name: modifiedItem.name, price: modifiedItem.price },
              correction_type: correctionType
            });
          }
        }
      });
    }

    // Track tax corrections
    if (userModifications.taxes !== undefined && 
        Math.abs((originalExtraction.taxes || 0) - userModifications.taxes) > 0.01) {
      corrections.taxes = {
        original: originalExtraction.taxes || 0,
        corrected: userModifications.taxes
      };
    }

    // Track other charges corrections
    if (userModifications.otherCharges !== undefined && 
        Math.abs((originalExtraction.otherCharges || 0) - userModifications.otherCharges) > 0.01) {
      corrections.other_charges = {
        original: originalExtraction.otherCharges || 0,
        corrected: userModifications.otherCharges
      };
    }

    // Track total cost corrections
    if (userModifications.totalCost !== undefined && 
        Math.abs(originalExtraction.totalCost - userModifications.totalCost) > 0.01) {
      corrections.total_cost = {
        original: originalExtraction.totalCost,
        corrected: userModifications.totalCost
      };
    }

    const totalItems = originalExtraction.items.length;
    const correctedItems = corrections.items.length;
    const correctionCount = correctedItems + 
      (corrections.taxes ? 1 : 0) + 
      (corrections.other_charges ? 1 : 0) + 
      (corrections.total_cost ? 1 : 0);

    return {
      original_ai_extraction: originalExtraction,
      user_corrections: corrections,
      correction_count: correctionCount,
      correction_percentage: totalItems > 0 ? (correctedItems / totalItems) * 100 : 0
    };
  }

  /**
   * Store correction patterns for AI training
   */
  static async storeCorrectionPatterns(
    receiptId: string,
    correctionData: CorrectionData
  ): Promise<void> {
    try {
      const patterns: Array<{
        receipt_id: string;
        correction_type: string;
        original_value: string;
        corrected_value: string;
        confidence_score: number | null;
      }> = [];

      // Store item corrections
      correctionData.user_corrections.items.forEach(item => {
        if (item.correction_type === 'name' || item.correction_type === 'both') {
          patterns.push({
            receipt_id: receiptId,
            correction_type: 'item_name',
            original_value: item.original.name,
            corrected_value: item.corrected.name,
            confidence_score: null // Could be enhanced with AI confidence scores
          });
        }

        if (item.correction_type === 'price' || item.correction_type === 'both') {
          patterns.push({
            receipt_id: receiptId,
            correction_type: 'item_price',
            original_value: item.original.price.toString(),
            corrected_value: item.corrected.price.toString(),
            confidence_score: null
          });
        }
      });

      // Store tax corrections
      if (correctionData.user_corrections.taxes) {
        patterns.push({
          receipt_id: receiptId,
          correction_type: 'tax',
          original_value: correctionData.user_corrections.taxes.original.toString(),
          corrected_value: correctionData.user_corrections.taxes.corrected.toString(),
          confidence_score: null
        });
      }

      // Store other charges corrections
      if (correctionData.user_corrections.other_charges) {
        patterns.push({
          receipt_id: receiptId,
          correction_type: 'other_charges',
          original_value: correctionData.user_corrections.other_charges.original.toString(),
          corrected_value: correctionData.user_corrections.other_charges.corrected.toString(),
          confidence_score: null
        });
      }

      // Store total cost corrections
      if (correctionData.user_corrections.total_cost) {
        patterns.push({
          receipt_id: receiptId,
          correction_type: 'total_cost',
          original_value: correctionData.user_corrections.total_cost.original.toString(),
          corrected_value: correctionData.user_corrections.total_cost.corrected.toString(),
          confidence_score: null
        });
      }

      // Insert all patterns
      if (patterns.length > 0) {
        const { error } = await supabase
          .from('correction_patterns')
          .insert(patterns);

        if (error) {
          throw new Error(`Failed to store correction patterns: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error storing correction patterns:', error);
      throw error;
    }
  }

  /**
   * Get correction patterns for analysis
   */
  static async getCorrectionPatterns(
    correctionType?: string,
    limit: number = 100
  ): Promise<CorrectionPattern[]> {
    try {
      let query = supabase
        .from('correction_patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (correctionType) {
        query = query.eq('correction_type', correctionType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching correction patterns:', error);
        return [];
      }

      return data?.map(pattern => ({
        ...pattern,
        created_at: new Date(pattern.created_at)
      })) || [];
    } catch (error) {
      console.error('Error getting correction patterns:', error);
      return [];
    }
  }

  /**
   * Get correction statistics
   */
  static async getCorrectionStats(): Promise<{
    total_corrections: number;
    corrections_by_type: Record<string, number>;
    most_common_corrections: Array<{
      original_value: string;
      corrected_value: string;
      count: number;
    }>;
  }> {
    try {
      // Get total corrections
      const { count: totalCorrections } = await supabase
        .from('correction_patterns')
        .select('*', { count: 'exact', head: true });

      // Get corrections by type
      const { data: typeData } = await supabase
        .from('correction_patterns')
        .select('correction_type');

      const correctionsByType: Record<string, number> = {};
      typeData?.forEach(record => {
        correctionsByType[record.correction_type] = (correctionsByType[record.correction_type] || 0) + 1;
      });

      // Get most common corrections (simplified - could be enhanced with more complex queries)
      const { data: commonData } = await supabase
        .from('correction_patterns')
        .select('original_value, corrected_value')
        .limit(10);

      const mostCommonCorrections = commonData?.map(record => ({
        original_value: record.original_value || '',
        corrected_value: record.corrected_value || '',
        count: 1 // Simplified - could be enhanced with grouping
      })) || [];

      return {
        total_corrections: totalCorrections || 0,
        corrections_by_type: correctionsByType,
        most_common_corrections: mostCommonCorrections
      };
    } catch (error) {
      console.error('Error getting correction stats:', error);
      return {
        total_corrections: 0,
        corrections_by_type: {},
        most_common_corrections: []
      };
    }
  }

  /**
   * Get correction patterns for a specific receipt
   */
  static async getCorrectionsForReceipt(receiptId: string): Promise<CorrectionPattern[]> {
    try {
      const { data, error } = await supabase
        .from('correction_patterns')
        .select('*')
        .eq('receipt_id', receiptId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching corrections for receipt:', error);
        return [];
      }

      return data?.map(pattern => ({
        ...pattern,
        created_at: new Date(pattern.created_at)
      })) || [];
    } catch (error) {
      console.error('Error getting corrections for receipt:', error);
      return [];
    }
  }
} 
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger } from '@/lib/monitoring/errorLogger';

export function useReferenceTable(tableName: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tableName) {
      fetchData();
    }
  }, [tableName]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setData(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      errorLogger.error('Failed to fetch reference table data', err instanceof Error ? err : new Error(errorMessage), {
        tableName
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: any) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .insert([item]);

      if (error) throw error;
      
      await fetchData();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item';
      errorLogger.error('Failed to add reference table item', err instanceof Error ? err : new Error(errorMessage), {
        tableName,
        item
      });
      return { success: false, error: errorMessage };
    }
  };

  const updateItem = async (id: number, updates: any) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchData();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
      errorLogger.error('Failed to update reference table item', err instanceof Error ? err : new Error(errorMessage), {
        tableName,
        id,
        updates
      });
      return { success: false, error: errorMessage };
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchData();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
      errorLogger.error('Failed to delete reference table item', err instanceof Error ? err : new Error(errorMessage), {
        tableName,
        id
      });
      return { success: false, error: errorMessage };
    }
  };

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    addItem,
    updateItem,
    deleteItem
  };
}
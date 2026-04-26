// hooks/useAnalysisHistory.ts
import { useState, useEffect, useCallback } from 'react';

interface Filters {
    status: string;
    search: string;
    sort_by: string;
    sort_order: 'ASC' | 'DESC';
    page: number;
    limit: number;
}

export function useAnalysisHistory(apiRequest: any) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
    });

    const [filters, setFilters] = useState<Filters>({
        status: '',
        search: '',
        sort_by: 'created_at',
        sort_order: 'DESC',
        page: 1,
        limit: 10
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: filters.page.toString(),
                limit: filters.limit.toString(),
                ...(filters.status && { status: filters.status }),
                ...(filters.search && { search: filters.search }),
                sort_by: filters.sort_by,
                sort_order: filters.sort_order
            });
            const response = await apiRequest(`/api/analyses/my?${query}`);
            const json = await response.json();
            setData(json.data || []);
            setPagination(json.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, apiRequest]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateFilter = useCallback((key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    }, []);

    return { data, loading, pagination, filters, updateFilter };
}
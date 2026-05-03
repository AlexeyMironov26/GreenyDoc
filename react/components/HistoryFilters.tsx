import React from 'react';

interface HistoryFiltersProps {
    filters: {
        status: string;
        search: string;
        sort_by: string;
        sort_order: 'ASC' | 'DESC';
    };
    onFilterChange: (key: string, value: any) => void;
}

const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'disease_found', label: '🦠 Болезнь найдена' },
    { value: 'no_disease', label: '✅ Здоров' },
    { value: 'no_leaves', label: '🍂 Нет листьев' }
];

const sortOptions = [
    { value: 'created_at', label: 'По дате' },
    { value: 'disease_name', label: 'По названию болезни' },
    { value: 'status', label: 'По статусу' }
];

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({ filters, onFilterChange }) => {
    return (
        <div className="filters-bar" style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap', 
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px'
        }}>
            <input
                type="text"
                placeholder="🔍 Поиск по болезни или растению"
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                style={{ 
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    flex: 2,
                    minWidth: '200px'
                }}
            />
            
            <select
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
            >
                {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            
            <select
                value={filters.sort_by}
                onChange={(e) => onFilterChange('sort_by', e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
            >
                {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            
            <button
                onClick={() => onFilterChange('sort_order', filters.sort_order === 'DESC' ? 'ASC' : 'DESC')}
                style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none'
                }}
            >
                {filters.sort_order === 'DESC' ? '↓ По убыванию' : '↑ По возрастанию'}
            </button>
        </div>
    );
};
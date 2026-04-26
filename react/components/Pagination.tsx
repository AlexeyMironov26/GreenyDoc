import React from 'react';

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    return (
        <div className="pagination" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '1rem', 
            marginTop: '2rem',
            alignItems: 'center'
        }}>
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    background: page === 1 ? '#ccc' : '#3b82f6',
                    color: 'white',
                    cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
            >
                ← Назад
            </button>
            
            <span style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                Страница {page} из {totalPages}
            </span>
            
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    background: page === totalPages ? '#ccc' : '#3b82f6',
                    color: 'white',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer'
                }}
            >
                Вперёд →
            </button>
        </div>
    );
};
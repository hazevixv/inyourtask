'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface SearchableSelectProps {
  options: Array<{ value: string; label: string; subtitle?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxHeight?: number;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  maxHeight = 300
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    option.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: '1px solid rgba(226,232,240,0.7)',
          borderRadius: 10,
          background: 'white',
          fontSize: '0.875rem',
          fontFamily: 'DM Sans, sans-serif',
          color: value ? '#1F2937' : '#9CA3AF',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 120ms',
          outline: isOpen ? '2px solid rgba(124,58,237,0.3)' : 'none',
          outlineOffset: 0
        }}
        onMouseEnter={e => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)';
        }}
        onMouseLeave={e => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(226,232,240,0.7)';
        }}
      >
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {displayLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {value && (
            <X 
              size={14} 
              onClick={handleClear}
              style={{ color: '#9CA3AF', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
            />
          )}
          <ChevronDown 
            size={16} 
            style={{ 
              color: '#6B7280', 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms'
            }} 
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid rgba(226,232,240,0.7)',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeInScale 150ms ease'
          }}
        >
          {/* Search Input */}
          <div style={{ 
            padding: '10px 12px', 
            borderBottom: '1px solid rgba(226,232,240,0.5)',
            background: 'rgba(248,250,252,0.5)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '6px 10px',
              background: 'white',
              border: '1px solid rgba(226,232,240,0.7)',
              borderRadius: 8
            }}>
              <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.8125rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: '#1F2937',
                  background: 'transparent'
                }}
              />
              {search && (
                <X 
                  size={14} 
                  onClick={() => setSearch('')}
                  style={{ color: '#9CA3AF', cursor: 'pointer', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                />
              )}
            </div>
          </div>

          {/* Options List */}
          <div style={{ 
            maxHeight, 
            overflowY: 'auto',
            padding: '4px'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#9CA3AF',
                fontSize: '0.8125rem',
                fontFamily: 'DM Sans, sans-serif'
              }}>
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: value === option.value ? 'rgba(124,58,237,0.08)' : 'transparent',
                    borderRadius: 8,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontFamily: 'DM Sans, sans-serif',
                    color: '#1F2937',
                    transition: 'background 100ms',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                  onMouseEnter={e => {
                    if (value !== option.value) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(248,250,252,0.8)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (value !== option.value) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ 
                    fontWeight: value === option.value ? 600 : 400,
                    color: value === option.value ? '#7c3aed' : '#1F2937'
                  }}>
                    {option.label}
                  </div>
                  {option.subtitle && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#9CA3AF',
                      fontWeight: 400
                    }}>
                      {option.subtitle}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

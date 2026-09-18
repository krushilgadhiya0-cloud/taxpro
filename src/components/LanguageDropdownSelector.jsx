import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getActiveLanguage, setGlobalLanguage } from '../lib/languageHelper';

// Crisp rectangular flag icon matching user screenshot
export function FlagImage({ country = 'gb', fallbackEmoji = '🌐', className = 'w-5 h-3.5' }) {
  const [error, setError] = useState(false);

  if (error || !country) {
    return <span className="text-base leading-none select-none inline-block">{fallbackEmoji}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${country.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${country.toLowerCase()}.png 2x`}
      alt={country}
      loading="lazy"
      className={`${className} object-cover rounded-[2px] shadow-2xs border border-black/10 shrink-0 inline-block`}
      onError={() => setError(true)}
    />
  );
}

export default function LanguageDropdownSelector({ 
  onShowToast, 
  variant = 'pill', // 'pill' (header style) | 'compact'
  align = 'right'   // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeLang, setActiveLang] = useState(getActiveLanguage);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleLangChange = (e) => {
      setActiveLang(e.detail || getActiveLanguage());
    };
    window.addEventListener('taxpro_language_changed', handleLangChange);
    return () => window.removeEventListener('taxpro_language_changed', handleLangChange);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (lang) => {
    if (lang.code === activeLang.code) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    const updated = setGlobalLanguage(lang.code);
    setActiveLang(updated);

    if (onShowToast) {
      onShowToast(`✓ Language smoothly switched to ${lang.name} (${lang.nativeName})!`, 'success');
    }
  };

  return (
    <div className="relative inline-block text-left select-none z-40" ref={dropdownRef}>
      {/* Trigger Button - Matches exact user reference image pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'bg-[#ecfdf5] dark:bg-emerald-950/50 border-[#34d399] dark:border-emerald-500 ring-2 ring-emerald-400/20 text-[#065f46] dark:text-emerald-300'
            : 'bg-[#f0fdf4] dark:bg-slate-800/80 hover:bg-[#ecfdf5] dark:hover:bg-slate-800 border-[#6ee7b7] dark:border-emerald-800/60 text-[#065f46] dark:text-slate-200'
        }`}
        title={`Language: ${activeLang.name} (${activeLang.nativeName}) • Click to change`}
      >
        <FlagImage country={activeLang.country} fallbackEmoji={activeLang.flag} className="w-5 h-3.5" />
        <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {activeLang.name}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 stroke-[2.5]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 stroke-[2.5]" />
        )}
      </button>

      {/* Floating Dropdown Menu - Matches exact user screenshot with dark scrollbar */}
      {isOpen && (
        <div 
          className={`absolute z-50 mt-1.5 w-44 sm:w-48 rounded-2xl bg-white dark:bg-[#121727] border border-slate-100 dark:border-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-1.5 overflow-hidden animate-page-fade ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Scrollable Language List with Custom Dark Scrollbar */}
          <div 
            className="overflow-y-auto max-h-[290px] pr-1 space-y-1 taxpro-lang-scrollbar"
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = activeLang.code === lang.code;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#ecf7f6] dark:bg-teal-950/60 text-[#0f766e] dark:text-teal-300 font-bold'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <FlagImage country={lang.country} fallbackEmoji={lang.flag} className="w-5 h-3.5" />
                  <span className="text-xs">{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


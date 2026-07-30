import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  flag?: string;
  badge?: string;
  searchKeywords?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string, option?: SearchableOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean; // Allows user to submit custom typed text if not found in list (useful for City)
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option…",
  searchPlaceholder = "Search…",
  emptyText = "No matches found.",
  disabled = false,
  className = "",
  allowCustom = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value.toLowerCase() === value.toLowerCase());
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options.slice(0, 100); // return top 100 when search is empty for speed

    return options
      .filter((opt) => {
        const matchLabel = opt.label.toLowerCase().includes(q);
        const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false;
        const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
        const matchVal = opt.value.toLowerCase().includes(q);
        const matchKw = opt.searchKeywords ? opt.searchKeywords.toLowerCase().includes(q) : false;
        return matchLabel || matchSub || matchBadge || matchVal || matchKw;
      })
      .slice(0, 100); // cap results at 100 for fast rendering
  }, [options, search]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const handleSelect = (val: string, opt?: SearchableOption) => {
    onChange(val, opt);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value, filteredOptions[0]);
      } else if (allowCustom && search.trim()) {
        handleSelect(search.trim());
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between font-normal text-left h-9 px-3 border-input bg-transparent hover:border-accent/50 hover:text-foreground text-xs text-foreground font-sans transition-colors ${
            !value ? "text-muted-foreground" : ""
          } ${className}`}
        >
          <span className="truncate flex items-center gap-2">
            {selectedOption?.flag && <span className="text-sm shrink-0">{selectedOption.flag}</span>}
            <span className="truncate">
              {selectedOption ? selectedOption.label : value ? value : placeholder}
            </span>
            {selectedOption?.badge && (
              <span className="ml-1 text-[10px] font-semibold opacity-70 px-1.5 py-0.5 rounded bg-muted/60">
                {selectedOption.badge}
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[240px] p-0 z-[100] bg-popover border-border shadow-md rounded-xl"
        align="start"
        sideOffset={4}
      >
        <div className="p-2 border-b border-border flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="max-h-[220px] overflow-y-auto p-1 text-xs">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">
              {allowCustom && search.trim() ? (
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/10 hover:text-accent font-medium text-xs flex items-center justify-between transition-colors"
                >
                  <span>Use &quot;{search.trim()}&quot;</span>
                  <span className="text-[10px] text-muted-foreground">Press Enter</span>
                </button>
              ) : (
                emptyText
              )}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = value.toLowerCase() === opt.value.toLowerCase();
              return (
                <button
                  key={`${opt.value}-${opt.label}`}
                  type="button"
                  onClick={() => handleSelect(opt.value, opt)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-foreground text-background font-semibold"
                      : "hover:bg-accent/10 hover:text-accent font-medium text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.flag && <span className="text-base shrink-0">{opt.flag}</span>}
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className={`text-[11px] truncate ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                        ({opt.sublabel})
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {opt.badge && (
                      <span
                        className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                          isSelected
                            ? "bg-background/20 text-background"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

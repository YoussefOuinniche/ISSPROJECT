import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-border-subtle/20 bg-app-elevated px-3 text-sm text-text-primary placeholder:text-text-muted',
        'transition-all duration-normal focus-visible:border-brand/55 focus-visible:ring-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});

export function SearchInput({ className, inputClassName, inputRef, ...props }) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <Input ref={inputRef} className={cn('pl-9', inputClassName)} {...props} />
    </div>
  );
}

export default Input;

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold transition-all duration-normal ease-out border disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none';

const variants = {
  primary: 'bg-brand/90 text-app border-brand/60 hover:bg-brand hover:-translate-y-0.5 active:translate-y-0',
  secondary: 'bg-app-elevated text-text-primary border-border-subtle/25 hover:border-brand/45 hover:-translate-y-0.5',
  ghost: 'bg-transparent text-text-secondary border-border-subtle/20 hover:bg-white/[0.04] hover:text-text-primary hover:border-border-subtle/35',
  danger: 'bg-danger/12 text-red-200 border-danger/35 hover:bg-danger/20 hover:-translate-y-0.5',
};

export default function Button({
  variant = 'primary',
  className,
  children,
  loading = false,
  icon,
  iconClassName,
  ...props
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      whileHover={reduceMotion || props.disabled ? undefined : { y: -2 }}
      whileTap={reduceMotion || props.disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(baseClass, variants[variant], className)}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon ? <span className={cn('inline-flex', iconClassName)}>{icon}</span> : null}
      <span>{children}</span>
    </motion.button>
  );
}

export function IconButton({ ariaLabel, className, children, variant = 'ghost', ...props }) {
  return (
    <Button
      variant={variant}
      aria-label={ariaLabel}
      className={cn('h-10 w-10 min-w-10 rounded-xl p-0', className)}
      {...props}
    >
      {children}
    </Button>
  );
}

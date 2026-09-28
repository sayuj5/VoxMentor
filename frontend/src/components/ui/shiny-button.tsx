/**
 * ShinyButton — Premium button with shimmer, glow, and animated gradient border.
 * Adapted for Vite + React + TypeScript (no Next.js / style jsx).
 */
import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ShinyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function ShinyButton({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ShinyButtonProps) {
  const isDisabled = disabled || isLoading;

  const variantStyles = {
    primary: {
      wrapper: 'p-[1px] bg-gradient-to-r from-brand-600 via-cyan-500 to-brand-500',
      inner:   'bg-gradient-to-r from-brand-700 to-brand-600 hover:from-brand-600 hover:to-brand-500 text-white',
      glow:    'shadow-[0_0_20px_0px_rgba(77,110,245,0.35)] hover:shadow-[0_0_35px_4px_rgba(77,110,245,0.5)]',
    },
    danger: {
      wrapper: 'p-[1px] bg-gradient-to-r from-red-700 via-red-500 to-red-600',
      inner:   'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white',
      glow:    'shadow-[0_0_20px_0px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_4px_rgba(239,68,68,0.45)]',
    },
    ghost: {
      wrapper: 'p-[1px] bg-gradient-to-r from-surface-border via-brand-700/40 to-surface-border',
      inner:   'bg-surface-card hover:bg-surface-border text-surface-muted hover:text-white',
      glow:    '',
    },
  };

  const v = variantStyles[variant];

  return (
    <div
      className={[
        'relative rounded-xl overflow-hidden',
        fullWidth ? 'w-full' : 'inline-block',
        v.wrapper,
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      <button
        {...props}
        disabled={isDisabled}
        className={[
          'relative w-full rounded-[11px] px-6 py-3 font-semibold text-sm',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'active:scale-[0.97]',
          v.inner,
          v.glow,
          'overflow-hidden',
        ].join(' ')}
      >
        {/* Shimmer sweep */}
        {!isDisabled && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
              backgroundSize: '300% 100%',
              animation: 'shimmer-slide 2.8s linear infinite',
            }}
          />
        )}

        {/* Content */}
        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              {children}
            </>
          ) : (
            children
          )}
        </span>
      </button>
    </div>
  );
}

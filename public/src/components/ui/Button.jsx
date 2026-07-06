import clsx from 'clsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  as: Tag = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-body font-medium rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-ink text-paper hover:bg-stamp',
    secondary: 'bg-transparent text-ink border border-ink/30 hover:border-ink',
    ghost: 'bg-transparent text-ink/70 hover:text-ink underline underline-offset-4',
  };
  const sizes = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-6 py-3',
  };
  return (
    <Tag className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Tag>
  );
}

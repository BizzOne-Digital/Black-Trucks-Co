import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export default function CustomButton({
  children,
  variant = 'primary',
  href,
  onClick,
  className = '',
  type = 'button',
  disabled = false
}: ButtonProps) {
  const baseClasses = 'px-8 py-3 rounded-md font-medium transition-all duration-300 text-sm tracking-wide';
  const variantClasses =
    variant === 'primary'
      ? 'bg-black text-white hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed'
      : 'bg-white text-black hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed';

  const classes = `${baseClasses} ${variantClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

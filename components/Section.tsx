interface SectionProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export default function Section({
  children,
  className = '',
  fullHeight = false
}: SectionProps) {
  return (
    <section
      className={`${fullHeight ? 'min-h-screen' : 'py-20'} ${className}`}
    >
      {children}
    </section>
  );
}

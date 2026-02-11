interface PageHeaderProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  align = 'center',
  children,
}: PageHeaderProps) {
  void title;
  void subtitle;
  void align;
  void children;
  return null;
}

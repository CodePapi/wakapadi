import { Box, Typography } from '@mui/material';
import styles from './PageHeader.module.css';

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
  return (
    <section className={styles.headerSection}>
      <Box className={`${styles.headerInner} ${styles[align]}`}>
        <Typography variant="h1" className={styles.title}>
          {title}
        </Typography>
        {subtitle && (
          <Typography className={styles.subtitle}>{subtitle}</Typography>
        )}
        {children && <Box className={styles.actions}>{children}</Box>}
      </Box>
    </section>
  );
}

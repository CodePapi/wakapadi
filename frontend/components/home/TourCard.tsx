import { Card, CardContent, Typography, Button, Box, Skeleton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import styles from './TourCard.module.css';
import Image from 'next/image';
import { useState } from 'react';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { formatCityName } from '../../lib/cityFormat';

// Minimal Tour interface used by this component
interface Tour {
  title: string;
  image?: string | null;
  altText?: string | null;
  location: string;
  recurringSchedule?: string | null;
  sourceUrl?: string | null;
  externalPageUrl?: string | null;
}
const highlightText = (text: string = '', highlight: string = '') => {
  if (!highlight || !text) return text;

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className={styles.highlight}>
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const getSourceLabel = (sourceUrl?: string) => {
  if (!sourceUrl) return '';
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export default function TourCard({
  tour,
  highlight,
}: {
  tour: Tour;
  highlight?: string;
}) {
  const { t } = useTranslation('common');
  const [imageLoading, setImageLoading] = useState(true);

  const scheduleText =
    tour.recurringSchedule && tour.recurringSchedule !== 'Recurring'
      ? tour.recurringSchedule
      : t('tourScheduleRecurring');
  const sourceLabel = getSourceLabel(tour.sourceUrl ?? undefined);

  return (
    <article className={styles.cardWrapper}>
      <Card className={styles.card} elevation={2}>
        {tour.image ? (
          <div className={styles.imageContainer}>
            {imageLoading && (
              <Skeleton
                variant="rectangular"
                className={styles.imageSkeleton}
              />
            )}
            <Image
              src={tour.image}
              alt={tour.altText || tour.title}
              fill
              className={styles.cardImage}
              onLoad={() => setImageLoading(false)}
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              priority={false}
            />
          </div>
        ) : (
          <div className={styles.imagePlaceholder}>
            <LocationOnIcon className={styles.placeholderIcon} />
          </div>
        )}

        <CardContent className={styles.cardContent}>
          <Typography
            variant="h3"
            className={styles.cardTitle}
            component="h3"
          >
            {highlightText(tour.title, highlight)}
          </Typography>
          <div className={styles.keyRow}>
            <Typography
              className={styles.cardLocation}
              variant="body2"
            >
              <span className={styles.keyLabel}>{t('tourLocationLabel')}</span>
              <span className={styles.keyValue}>
                {highlightText(formatCityName(tour.location), highlight)}
              </span>
            </Typography>
          </div>

          <div className={styles.keyRow}>
            <Typography
              className={styles.cardSchedule}
              variant="body2"
            >
              <span className={styles.keyLabel}>{t('tourScheduleLabel')}</span>
              <span className={styles.keyValue}>{scheduleText}</span>
            </Typography>
          </div>

          <div className={styles.keyRow}>
            <Typography className={styles.cardSource} variant="body2">
              <span className={styles.keyLabel}>{t('tourSourceLabel')}</span>
              <span className={styles.keyValue}>
                {sourceLabel || t('tourSourceUnknown')}
              </span>
            </Typography>
          </div>

          <Box className={styles.buttonContainer}>
            {tour.externalPageUrl && (
              <Button
                variant="outlined"
                href={tour.externalPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardButton}
                aria-label={t('moreInfoAria', { title: tour.title })}
              >
                {t('tourOpenProvider')}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </article>
  );
}
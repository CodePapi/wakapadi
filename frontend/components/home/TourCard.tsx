// replaced MUI Skeleton with CSS-based placeholder
import { useTranslation } from 'next-i18next';
import styles from './TourCard.module.css';
import Image from 'next/image';
import { useState } from 'react';
import { LocationOn } from '../icons/LocationOn';
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
  blurDataURL?: string | null;
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

export default function TourCard({ tour, highlight }: { tour: Tour; highlight?: string }) {
  const { t } = useTranslation('common');
  const [imageLoading, setImageLoading] = useState(true);

  const scheduleText =
    tour.recurringSchedule && tour.recurringSchedule !== 'Recurring'
      ? tour.recurringSchedule
      : t('tourScheduleRecurring');
  const sourceLabel = getSourceLabel(tour.sourceUrl ?? undefined);

  return (
    <article className={styles.cardWrapper}>
      <div className={styles.card}>
        {tour.image ? (
          <div className={styles.imageContainer}>
            {imageLoading && <div className={styles.imageSkeleton} />}
            <Image
              src={tour.image}
              alt={tour.altText || tour.title}
              fill
              className={styles.cardImage}
              onLoadingComplete={() => setImageLoading(false)}
              style={{ objectFit: 'cover', objectPosition: 'center center' }}
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              loading="lazy"
              {...(tour.blurDataURL ? { placeholder: 'blur', blurDataURL: tour.blurDataURL } : {})}
            />
            <div className={styles.imageOverlay}>
              {sourceLabel && <span className={styles.sourceBadge}>{sourceLabel}</span>}
              {scheduleText && <span className={styles.scheduleBadge}>{scheduleText}</span>}
            </div>
          </div>
        ) : (
          <div className={styles.imagePlaceholder}>
            <LocationOn className={styles.placeholderIcon} />
          </div>
        )}

        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{highlightText(tour.title, highlight)}</h3>

          <div className={styles.keyRow}>
            <div className={styles.cardLocation}>
              <span className={styles.keyLabel}>{t('tourLocationLabel')}</span>
              <span className={styles.keyValue}>{highlightText(formatCityName(tour.location), highlight)}</span>
            </div>
          </div>

          <div className={styles.keyRow}>
            <div className={styles.cardSchedule}>
              <span className={styles.keyLabel}>{t('tourScheduleLabel')}</span>
              <span className={styles.keyValue}>{scheduleText}</span>
            </div>
          </div>

          <div className={styles.keyRow}>
            <div className={styles.cardSource}>
              <span className={styles.keyLabel}>{t('tourSourceLabel')}</span>
              <span className={styles.keyValue}>{sourceLabel || t('tourSourceUnknown')}</span>
            </div>
          </div>

          <div className={styles.buttonContainer}>
            {tour.externalPageUrl && (
              <a
                href={tour.externalPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardButton}
                aria-label={t('moreInfoAria', { title: tour.title })}
              >
                {t('tourOpenProvider')}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
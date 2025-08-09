import { Card, CardContent, Typography } from '@mui/material';
import { Tour } from '../../pages';
import styles from './TourCard.module.css';
import Image from 'next/image';
import { useMemo } from 'react';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import { formattedTime } from '../../utils/formatTime';
import { useRouter } from 'next/router';

export default function TourCard({ tour }: { tour: Tour; highlight?: string }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tourTime = useMemo(() => formattedTime(tour.recurringSchedule), []);
  const router = useRouter();

  return (
    <article className={styles.cardWrapper}>
      <Card
        className={styles.card}
        elevation={2}
        onClick={() => router.push(tour.externalPageUrl)}
        sx={{ cursor: 'pointer' }}
      >
        {tour.image ? (
          <div className={styles.imageContainer}>
            <Image
              unoptimized
              src={tour.image}
              alt={tour.altText || tour.title}
              fill
              className={styles.cardImage}
              style={{ objectFit: 'cover' }}
              sizes='(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw'
              priority={false}
            />
          </div>
        ) : (
          <div className={styles.imagePlaceholder}>
            <LocationOnIcon className={styles.placeholderIcon} />
          </div>
        )}

        <CardContent className={styles.cardContent}>
          <Typography className={styles.cardLocation} variant='body2'>
            {tour.location}
          </Typography>

          <Typography variant='h5' className={styles.cardTitle} component='h5'>
            {tour.title}
          </Typography>

          <Typography variant='body2' className={styles.cardTimeline}>
            <WatchLaterIcon width='1rem' height='1rem' />
            <span className={styles.cardTimelineText}>
              {tourTime.startDate}
            </span>
            {tourTime.endDate ? (
              <span className={styles.cardTimelineText}>
                {tourTime.endDate}
              </span>
            ) : null}
          </Typography>
        </CardContent>
      </Card>
    </article>
  );
}

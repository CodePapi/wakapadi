import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import { useTranslation } from 'next-i18next';

interface TourCardProps {
  title: string;
  location: string;
  rating?: number;
  url: string;
  shortDescription?: string;
}

const TourCard = ({
  title,
  location,
  rating,
  url,
  shortDescription,
}: TourCardProps) => {
  const { t } = useTranslation('common');
  return (
    <Card sx={{ mb: 2, maxWidth: 400 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          📍 {location}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ⭐ {rating ? `${rating.toFixed(1)} ★` : t('tourNotRated')}
        </Typography>
        {shortDescription && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {shortDescription}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('viewTour')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TourCard;

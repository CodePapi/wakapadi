import { Typography, Box } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import BlockIcon from '@mui/icons-material/Block';
import styles from '../../styles/components/tour.module.css';

export function NoToursAvailable() {
  return (
    <Box className={styles['no-tours']}>
      <BlockIcon style={{ fontSize: 64, color: '#9ca3af' }} />
      <Typography gutterBottom variant='h6' component='strong'>
        No Tours Available
      </Typography>
      <Typography variant='body1' component='p'>
        We currently don’t have any tours listed. Please check back later for
        new adventures!
      </Typography>
    </Box>
  );
}

export function NoToursFound() {
  return (
    <Box className={styles['no-tours']}>
      <SearchOffIcon style={{ fontSize: 64, color: '#9ca3af' }}>
        search
      </SearchOffIcon>
      <Typography gutterBottom variant='h6' component='strong'>
        No Results Found
      </Typography>
      <Typography variant='body1' component='p'>
        We couldn’t find any tours matching your search. Try adjusting your
        filters or explore all tours.
      </Typography>
    </Box>
  );
}

const NoTours = ({ search }: { search: string }) => {
  return search ? <NoToursFound /> : <NoToursAvailable />;
};

export default NoTours;

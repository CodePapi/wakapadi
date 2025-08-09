import { memo } from 'react';
import { Skeleton, Box, Pagination } from '@mui/material';
import { useTranslation } from 'next-i18next';
import TourCard from './TourCard';
import { Tour } from '../../pages';
import NoTours from './NoTours';
import styles from '../../styles/components/tour.module.css';

const Tours = ({
  loading,
  paginatedTours,
  search,
  totalPages,
  page,
  handlePageChange,
}: {
  loading: boolean;
  paginatedTours: Tour[] | [];
  search: string;
  totalPages: number;
  page: number;
  handlePageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
}) => {
  const { t } = useTranslation('common');
  const PER_PAGE = 12;

  return (
    <Box className={styles.tours}>
      {loading ? (
        Array.from({ length: PER_PAGE }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className={styles.gridItem}
            role='listitem'
          >
            <Skeleton
              variant='rectangular'
              className={styles.skeletonCard}
              height={380}
            />
          </div>
        ))
      ) : paginatedTours?.length > 0 ? (
        <>
          <h2>{t('availableTours')}</h2>
          <div className={styles.tourGrid} role='list'>
            {paginatedTours?.map((tour: Tour) => (
              <div key={tour._id} className={styles.gridItem} role='listitem'>
                <TourCard
                  tour={tour}
                  highlight={search}
                  aria-label={`Tour to ${tour.location}`}
                />
              </div>
            ))}
          </div>
          {!loading && totalPages > 1 && (
            <Box display='flex' justifyContent='center' mt='3rem'>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color='primary'
                shape='rounded'
                siblingCount={1}
                boundaryCount={1}
                showFirstButton
                showLastButton
                aria-label={t('paginationNavigation')}
                // className={styles.pagination}
                classes={{
                  root: styles.paginationRoot,
                  ul: styles.paginationList,
                }}
              />
            </Box>
          )}
        </>
      ) : (
        <NoTours search={search} />
      )}
    </Box>
  );
};

export default memo(Tours);

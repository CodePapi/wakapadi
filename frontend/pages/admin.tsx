import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Layout from '../components/Layout';
import { api } from '../lib/api/index';
import styles from '../styles/AdminDashboard.module.css';

const parseCities = (value: string) =>
  value
    .split(/[\n,]/g)
    .map((city) => city.trim())
    .filter(Boolean);

const getTodayIso = () => new Date().toISOString().slice(0, 10);

export default function AdminDashboardPage() {
  const apiBase = process.env.NEXT_PUBLIC_SOCKET_URL;
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [scrapeCityInput, setScrapeCityInput] = useState('');
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const [isAddingCities, setIsAddingCities] = useState(false);
  const [isScrapingCity, setIsScrapingCity] = useState(false);
  const [isSeedingUsers, setIsSeedingUsers] = useState(false);
  const [isSeedingWhois, setIsSeedingWhois] = useState(false);
  const [visitDate, setVisitDate] = useState(getTodayIso());
  const [dailyVisits, setDailyVisits] = useState<number | null>(null);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<{
    helpfulCount: number;
    unhelpfulCount: number;
    helpfulPercentage: number;
  } | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactTotal, setContactTotal] = useState(0);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const contactLimit = 20;
  const [tourCount, setTourCount] = useState<number | null>(null);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.localeCompare(b)),
    [cities]
  );

  const fetchCities = useCallback(async () => {
    if (!apiBase) {
      setNotice({
        type: 'error',
        message: 'Backend URL is not configured. Set NEXT_PUBLIC_SOCKET_URL.',
      });
      return;
    }
    const res = await api.get('/cities/all').catch((error) => {
      console.warn('Failed to load cities', error);
      setNotice({
        type: 'error',
        message:
          error?.message === 'Network Error'
            ? 'Backend is not reachable. Please start the API server.'
            : 'Unable to load cities. Please try again.',
      });
      return null;
    });

    if (!res) return;
    if (Array.isArray(res.data)) {
      setCities(res.data);
    }
  }, [apiBase]);

  useEffect(() => {
    void fetchCities().catch((error) => {
      console.error('Unhandled fetchCities error', error);
    });
  }, [fetchCities]);

  const fetchInsights = useCallback(async () => {
    if (!apiBase) {
      return;
    }
    setIsLoadingInsights(true);
    const results = await Promise.all([
      api.get('/tours').catch((error) => {
        console.warn('Failed to load tours', error);
        return null;
      }),
      api.get('/feedback', { params: { limit: 20 } }).catch((error) => {
        console.warn('Failed to load feedback', error);
        return null;
      }),
      api.get('/feedback/stats').catch((error) => {
        console.warn('Failed to load feedback stats', error);
        return null;
      }),
      api
        .get('/contact', { params: { page: 1, limit: contactLimit } })
        .catch((error) => {
          console.warn('Failed to load contact messages', error);
          return null;
        }),
      api.get('/users/reports').catch((error) => {
        console.warn('Failed to load reports', error);
        return null;
      }),
      api.get('/users/blocks').catch((error) => {
        console.warn('Failed to load blocks', error);
        return null;
      }),
    ]);

    const [toursRes, feedbackRes, statsRes, contactRes, reportRes, blockRes] = results;
    if (!toursRes && !feedbackRes && !statsRes && !contactRes && !reportRes && !blockRes) {
      setNotice({
        type: 'error',
        message: 'Backend is not reachable. Please start the API server.',
      });
      setIsLoadingInsights(false);
      return;
    }

    const toursCount = Array.isArray(toursRes?.data) ? toursRes?.data.length : null;
    setTourCount(toursCount);
    setFeedback(Array.isArray(feedbackRes?.data) ? feedbackRes?.data : []);
    setFeedbackStats(statsRes?.data || null);
    const contactItems = Array.isArray(contactRes?.data?.items)
      ? contactRes?.data?.items
      : [];
    setContactMessages(contactItems);
    setContactPage(contactRes?.data?.page || 1);
    setContactTotal(contactRes?.data?.total || 0);
    setReports(Array.isArray(reportRes?.data) ? reportRes?.data : []);
    setBlocks(Array.isArray(blockRes?.data) ? blockRes?.data : []);
    setIsLoadingInsights(false);
  }, [apiBase]);

  const handleLoadMoreContacts = useCallback(async () => {
    if (!apiBase || isLoadingContacts) return;
    const nextPage = contactPage + 1;
    const totalPages = Math.ceil(contactTotal / contactLimit) || 1;
    if (nextPage > totalPages) return;

    setIsLoadingContacts(true);
    const res = await api
      .get('/contact', { params: { page: nextPage, limit: contactLimit } })
      .catch((error) => {
        console.warn('Failed to load more contact messages', error);
        setNotice({
          type: 'error',
          message: 'Unable to load more contact messages.',
        });
        return null;
      });

    if (res?.data?.items) {
      setContactMessages((prev) => [...prev, ...res.data.items]);
      setContactPage(res.data.page || nextPage);
      setContactTotal(res.data.total || contactTotal);
    }
    setIsLoadingContacts(false);
  }, [apiBase, contactPage, contactTotal, isLoadingContacts]);

  useEffect(() => {
    void fetchInsights().catch((error) => {
      console.error('Unhandled fetchInsights error', error);
    });
  }, [fetchInsights]);

  const handleScrapeAll = useCallback(async () => {
    try {
      setIsScrapingAll(true);
      setNotice(null);
      const res = await api.post('/scraper/run');
      setNotice({
        type: 'success',
        message: res.data?.message || 'Scraping started for all cities.',
      });
    } catch (error) {
      console.error('Scrape all failed', error);
      setNotice({
        type: 'error',
        message: 'Scraping all cities failed. Please try again.',
      });
    } finally {
      setIsScrapingAll(false);
    }
  }, []);

  const handleScrapeCity = useCallback(async () => {
    const city = scrapeCityInput.trim();
    if (!city) {
      setNotice({ type: 'error', message: 'Enter a city to scrape.' });
      return;
    }

    try {
      setIsScrapingCity(true);
      setNotice(null);
      const res = await api.post('/scraper/run', { city });
      setNotice({
        type: 'success',
        message: res.data?.message || `Scraping started for ${city}.`,
      });
    } catch (error) {
      console.error('Scrape city failed', error);
      setNotice({
        type: 'error',
        message: `Scraping ${city} failed. Please try again.`,
      });
    } finally {
      setIsScrapingCity(false);
    }
  }, [scrapeCityInput]);

  const handleAddCities = useCallback(async () => {
    const payload = parseCities(cityInput);
    if (!payload.length) {
      setNotice({ type: 'error', message: 'Enter at least one city.' });
      return;
    }

    try {
      setIsAddingCities(true);
      setNotice(null);
      const res = await api.post('/cities/add', { cities: payload });
      setNotice({
        type: 'success',
        message:
          res.data?.added?.length
            ? `Added ${res.data.added.length} city(ies).`
            : 'Cities submitted successfully.',
      });
      setCityInput('');
      await fetchCities();
    } catch (error) {
      console.error('Add cities failed', error);
      setNotice({
        type: 'error',
        message: 'Adding cities failed. Please try again.',
      });
    } finally {
      setIsAddingCities(false);
    }
  }, [cityInput, fetchCities]);

  const handleSeedUsers = useCallback(async () => {
    try {
      setIsSeedingUsers(true);
      setNotice(null);
      await api.post('/seed/users');
      setNotice({
        type: 'success',
        message: 'User seed completed successfully.',
      });
    } catch (error) {
      console.error('Seed users failed', error);
      setNotice({
        type: 'error',
        message: 'Seeding users failed. Please try again.',
      });
    } finally {
      setIsSeedingUsers(false);
    }
  }, []);

  const handleSeedWhois = useCallback(async () => {
    try {
      setIsSeedingWhois(true);
      setNotice(null);
      const res = await api.post('/seed/whois');
      setNotice({
        type: 'success',
        message: res.data?.message || 'Whois seed completed successfully.',
      });
    } catch (error) {
      console.error('Seed whois failed', error);
      setNotice({
        type: 'error',
        message: 'Seeding whois failed. Please try again.',
      });
    } finally {
      setIsSeedingWhois(false);
    }
  }, []);

  const handleLoadVisits = useCallback(async () => {
    setIsLoadingVisits(true);
    const res = await api
      .get('/auth/visits/daily', {
        params: { day: visitDate },
      })
      .catch((error) => {
        console.warn('Failed to load daily visits', error);
        setNotice({
          type: 'error',
          message:
            error?.message === 'Network Error'
              ? 'Backend is not reachable. Please start the API server.'
              : 'Unable to load daily visits. Please try again.',
        });
        return null;
      });

    if (res) {
      setDailyVisits(res.data?.uniqueVisitors ?? null);
    }
    setIsLoadingVisits(false);
  }, [visitDate]);

  return (
    <Layout title="Admin Dashboard">
      <Head>
        <title>Admin Dashboard | Wakapadi</title>
        <meta
          name="description"
          content="Admin tools for managing cities, scraping, and data seeding."
        />
      </Head>

      <section className={styles.hero}>
        <Container maxWidth="lg" className={styles.heroInner}>
          <Box className={styles.heroCopy}>
            <Typography variant="h1" className={styles.heroTitle}>
              Admin Dashboard
            </Typography>
            <Typography className={styles.heroSubtitle}>
              Manage scraping, add cities, and run data utilities in one place.
            </Typography>
          </Box>
        </Container>
      </section>

      <Container maxWidth="lg" className={styles.container}>
        {notice && (
          <Alert severity={notice.type} className={styles.notice}>
            {notice.message}
          </Alert>
        )}

        <div className={styles.grid}>
          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Scraping controls</Typography>
            <Typography className={styles.cardSubtitle}>
              Trigger scrapes across the entire catalog or for a specific city.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <Button
                variant="contained"
                onClick={handleScrapeAll}
                disabled={isScrapingAll}
              >
                {isScrapingAll ? 'Scraping all cities…' : 'Scrape all cities'}
              </Button>

              <Box className={styles.inlineField}>
                <TextField
                  label="Scrape city"
                  value={scrapeCityInput}
                  onChange={(event) => setScrapeCityInput(event.target.value)}
                  placeholder="e.g. Berlin"
                  size="small"
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={handleScrapeCity}
                  disabled={isScrapingCity}
                >
                  {isScrapingCity ? 'Scraping…' : 'Scrape city'}
                </Button>
              </Box>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>City management</Typography>
            <Typography className={styles.cardSubtitle}>
              Add new destinations to the catalog and review the current list.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <TextField
                label="Add cities"
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
                placeholder="Add cities separated by commas or new lines"
                multiline
                minRows={3}
              />
              <Button
                variant="contained"
                onClick={handleAddCities}
                disabled={isAddingCities}
              >
                {isAddingCities ? 'Adding cities…' : 'Add cities'}
              </Button>

              <Box className={styles.cityList}>
                <Typography className={styles.sectionLabel}>
                  Existing cities
                </Typography>
                {sortedCities.length ? (
                  <div className={styles.cityChips}>
                    {sortedCities.map((city) => (
                      <Chip key={city} label={city} className={styles.cityChip} />
                    ))}
                  </div>
                ) : (
                  <Typography className={styles.emptyState}>
                    No cities added yet.
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Data utilities</Typography>
            <Typography className={styles.cardSubtitle}>
              Seed data for demos or QA testing environments.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <Button
                variant="outlined"
                onClick={handleSeedUsers}
                disabled={isSeedingUsers}
              >
                {isSeedingUsers ? 'Seeding users…' : 'Seed demo users'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleSeedWhois}
                disabled={isSeedingWhois}
              >
                {isSeedingWhois ? 'Seeding whois…' : 'Seed whois presence'}
              </Button>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Daily visits</Typography>
            <Typography className={styles.cardSubtitle}>
              Track unique visitors for any day.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <TextField
                label="Visit date"
                type="date"
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="outlined"
                onClick={handleLoadVisits}
                disabled={isLoadingVisits}
              >
                {isLoadingVisits ? 'Loading visits…' : 'Load visits'}
              </Button>
              <Typography className={styles.metricValue}>
                {dailyVisits === null
                  ? 'No data yet.'
                  : `${dailyVisits} unique visitors`}
              </Typography>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Tours inventory</Typography>
            <Typography className={styles.cardSubtitle}>
              Total number of tours available in the catalog.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <Typography className={styles.metricValue}>
                {tourCount === null ? 'No data yet.' : `${tourCount} tours`}
              </Typography>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Feedback overview</Typography>
            <Typography className={styles.cardSubtitle}>
              Review recent chatbot feedback and sentiment split.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <Box className={styles.metricRow}>
                <div>
                  <Typography className={styles.metricLabel}>Helpful</Typography>
                  <Typography className={styles.metricValue}>
                    {feedbackStats?.helpfulCount ?? 0}
                  </Typography>
                </div>
                <div>
                  <Typography className={styles.metricLabel}>Unhelpful</Typography>
                  <Typography className={styles.metricValue}>
                    {feedbackStats?.unhelpfulCount ?? 0}
                  </Typography>
                </div>
                <div>
                  <Typography className={styles.metricLabel}>Helpful %</Typography>
                  <Typography className={styles.metricValue}>
                    {Number.isFinite(feedbackStats?.helpfulPercentage)
                      ? `${feedbackStats!.helpfulPercentage.toFixed(1)}%`
                      : '0%'}
                  </Typography>
                </div>
              </Box>

              <div className={styles.listBox}>
                {feedback.length ? (
                  feedback.map((item) => (
                    <div key={item._id} className={styles.listItem}>
                      <div>
                        <Typography className={styles.listTitle}>
                          {item.isHelpful ? 'Helpful' : 'Unhelpful'}
                        </Typography>
                        <Typography className={styles.listBody}>
                          {item.feedbackText || item.message}
                        </Typography>
                      </div>
                      <Typography className={styles.listMeta}>
                        {new Date(item.timestamp).toLocaleString()}
                      </Typography>
                    </div>
                  ))
                ) : (
                  <Typography className={styles.emptyState}>
                    No feedback captured yet.
                  </Typography>
                )}
              </div>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Reported users</Typography>
            <Typography className={styles.cardSubtitle}>
              Monitor community reports and reasons.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <div className={styles.listBox}>
                {reports.length ? (
                  reports.map((report) => (
                    <div key={report._id} className={styles.listItem}>
                      <div>
                        <Typography className={styles.listTitle}>
                          {report.reportedId?.username || report.reportedId?.email || report.reportedId}
                        </Typography>
                        <Typography className={styles.listBody}>
                          Reason: {report.reason}
                        </Typography>
                        <Typography className={styles.listMeta}>
                          Reported by {report.reporterId?.username || report.reporterId?.email || report.reporterId}
                        </Typography>
                      </div>
                      <Typography className={styles.listMeta}>
                        {new Date(report.createdAt).toLocaleString()}
                      </Typography>
                    </div>
                  ))
                ) : (
                  <Typography className={styles.emptyState}>
                    No reports yet.
                  </Typography>
                )}
              </div>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Contact messages</Typography>
            <Typography className={styles.cardSubtitle}>
              Review incoming contact-us requests.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <div className={styles.listBox}>
                {contactMessages.length ? (
                  contactMessages.map((message) => (
                    <div key={message._id} className={styles.listItem}>
                      <div>
                        <Typography className={styles.listTitle}>
                          {message.name} · {message.email}
                        </Typography>
                        <Typography className={styles.listBody}>
                          {message.message}
                        </Typography>
                        <Typography className={styles.listMeta}>
                          Type: {message.type || 'general'}
                        </Typography>
                      </div>
                      <Typography className={styles.listMeta}>
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleString()
                          : ''}
                      </Typography>
                    </div>
                  ))
                ) : (
                  <Typography className={styles.emptyState}>
                    No contact messages yet.
                  </Typography>
                )}
              </div>
              {contactMessages.length < contactTotal && (
                <Button
                  variant="outlined"
                  onClick={handleLoadMoreContacts}
                  disabled={isLoadingContacts}
                >
                  {isLoadingContacts ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Blocked users</Typography>
            <Typography className={styles.cardSubtitle}>
              Track user blocks recorded in the system.
            </Typography>

            <Stack spacing={2} className={styles.cardContent}>
              <div className={styles.listBox}>
                {blocks.length ? (
                  blocks.map((block) => (
                    <div key={block._id} className={styles.listItem}>
                      <div>
                        <Typography className={styles.listTitle}>
                          {block.blockedId?.username || block.blockedId?.email || block.blockedId}
                        </Typography>
                        <Typography className={styles.listMeta}>
                          Blocked by {block.blockerId?.username || block.blockerId?.email || block.blockerId}
                        </Typography>
                      </div>
                      <Typography className={styles.listMeta}>
                        {new Date(block.createdAt).toLocaleString()}
                      </Typography>
                    </div>
                  ))
                ) : (
                  <Typography className={styles.emptyState}>
                    No blocks yet.
                  </Typography>
                )}
              </div>
            </Stack>
          </Paper>
        </div>
      </Container>
    </Layout>
  );
}

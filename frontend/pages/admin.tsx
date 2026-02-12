/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
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
  CircularProgress,
} from '@mui/material';
import Layout from '../components/Layout';
import { api } from '../lib/api/index';
import styles from '../styles/AdminDashboard.module.css';

// Interfaces to replace 'any'
interface User {
  _id: string;
  username?: string;
  email?: string;
  role: string;
}

interface Feedback {
  _id: string;
  isHelpful: boolean;
  feedbackText?: string;
  message?: string;
  timestamp: string;
}

interface Report {
  _id: string;
  reportedId: User | string;
  reporterId: User | string;
  reason: string;
  createdAt: string;
}

interface Block {
  _id: string;
  blockedId: User | string;
  blockerId: User | string;
  createdAt: string;
}

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  type?: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const parseCities = (value: string) =>
    value
      .split(/\n|,/g)
      .map((city) => city.trim())
      .filter(Boolean);

  const getTodayIso = () => new Date().toISOString().slice(0, 10);

  const apiBase = process.env.NEXT_PUBLIC_SOCKET_URL;

  const [cities, setCities] = useState<string[]>([]);
  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    open: boolean;
    userId: string | null;
    username: string | null;
    context: 'report' | 'block' | null;
  }>({ open: false, userId: null, username: null, context: null });

  const [isDeletingUser, setIsDeletingUser] = useState(false);
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

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<{
    helpfulCount: number;
    unhelpfulCount: number;
    helpfulPercentage: number;
  } | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactTotal, setContactTotal] = useState(0);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const contactLimit = 20;

  const [tourCount, setTourCount] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.get('/users/all');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    if (!apiBase) return;

    setIsLoadingInsights(true);

    const results = await Promise.all([
      api.get('/tours').catch(() => null),
      api.get('/feedback', { params: { limit: 20 } }).catch(() => null),
      api.get('/feedback/stats').catch(() => null),
      api.get('/contact', { params: { page: 1, limit: contactLimit } }).catch(() => null),
      api.get('/users/reports').catch(() => null),
      api.get('/users/blocks').catch(() => null),
    ]);

    const [toursRes, feedbackRes, statsRes, contactRes, reportRes, blockRes] = results;

    const toursCount = Array.isArray(toursRes?.data) ? toursRes.data.length : null;

    setTourCount(toursCount);
    setFeedback(Array.isArray(feedbackRes?.data) ? feedbackRes.data : []);
    setFeedbackStats(statsRes?.data || null);

    const contactItems = Array.isArray(contactRes?.data?.items) ? contactRes.data.items : [];

    setContactMessages(contactItems);
    setContactPage(contactRes?.data?.page || 1);
    setContactTotal(contactRes?.data?.total || 0);

    setReports(Array.isArray(reportRes?.data) ? reportRes.data : []);
    setBlocks(Array.isArray(blockRes?.data) ? blockRes.data : []);

    setIsLoadingInsights(false);
  }, [apiBase]);

  useEffect(() => {
    void fetchInsights().catch((error) => {
      console.error('Unhandled fetchInsights error', error);
    });
  }, [fetchInsights]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUserDialog.userId) return;

    setIsDeletingUser(true);
    setNotice(null);

    try {
      await api.delete(`/users/${deleteUserDialog.userId}`);
      setNotice({ type: 'success', message: `User deleted successfully.` });

      setDeleteUserDialog({
        open: false,
        userId: null,
        username: null,
        context: null,
      });

      await fetchInsights();
      await fetchUsers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && (error as any).response?.data?.message
          ? (error as any).response.data.message
          : 'Failed to delete user.';
      setNotice({ type: 'error', message: errorMessage });
    } finally {
      setIsDeletingUser(false);
    }
  }, [deleteUserDialog, fetchInsights, fetchUsers]);

  const handleLoadMoreContacts = useCallback(async () => {
    if (!apiBase || isLoadingContacts) return;

    const nextPage = contactPage + 1;
    const totalPages = Math.ceil(contactTotal / contactLimit) || 1;
    if (nextPage > totalPages) return;

    setIsLoadingContacts(true);

    const res = await api
      .get('/contact', { params: { page: nextPage, limit: contactLimit } })
      .catch(() => null);

    if (res?.data?.items) {
      setContactMessages((prev) => [...prev, ...res.data.items]);
      setContactPage(res.data.page || nextPage);
      setContactTotal(res.data.total || contactTotal);
    }

    setIsLoadingContacts(false);
  }, [apiBase, contactPage, contactTotal, isLoadingContacts]);

  const handleScrapeAll = useCallback(async () => {
    try {
      setIsScrapingAll(true);
      setNotice(null);
      const res = await api.post('/scraper/run');
      setNotice({
        type: 'success',
        message: res.data?.message || 'Scraping started for all cities.',
      });
    } catch {
      setNotice({ type: 'error', message: 'Scraping all cities failed.' });
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
    } catch {
      setNotice({ type: 'error', message: `Scraping ${city} failed.` });
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
        message: res.data?.added?.length
          ? `Added ${res.data.added.length} city(ies).`
          : 'Cities submitted successfully.',
      });

      setCityInput('');
      await fetchCities();
    } catch {
      setNotice({ type: 'error', message: 'Adding cities failed.' });
    } finally {
      setIsAddingCities(false);
    }
  }, [cityInput, fetchCities]);

  const handleSeedUsers = useCallback(async () => {
    try {
      setIsSeedingUsers(true);
      setNotice(null);
      await api.post('/seed/users');
      setNotice({ type: 'success', message: 'User seed completed.' });
    } catch {
      setNotice({ type: 'error', message: 'Seeding users failed.' });
    } finally {
      setIsSeedingUsers(false);
    }
  }, []);

  const handleSeedWhois = useCallback(async () => {
    try {
      setIsSeedingWhois(true);
      setNotice(null);
      const res = await api.post('/seed/whois');
      setNotice({ type: 'success', message: res.data?.message || 'Whois seed completed.' });
    } catch {
      setNotice({ type: 'error', message: 'Seeding whois failed.' });
    } finally {
      setIsSeedingWhois(false);
    }
  }, []);

  const handleLoadVisits = useCallback(async () => {
    setIsLoadingVisits(true);
    const res = await api
      .get('/auth/visits/daily', { params: { day: visitDate } })
      .catch(() => null);
    if (res) {
      setDailyVisits(res.data?.uniqueVisitors ?? null);
    }
    setIsLoadingVisits(false);
  }, [visitDate]);

  return (
    <Layout title="Admin Dashboard">
      <Head>
        <title>Admin Dashboard | Wakapadi</title>
      </Head>

      <section className={styles.hero}>
        <Container maxWidth="lg" className={styles.heroInner}>
          <Box className={styles.heroCopy}>
            <Typography variant="h1" className={styles.heroTitle}>
              Admin Dashboard
            </Typography>
            <Typography className={styles.heroSubtitle}>
              Manage scraping, add cities, and run data utilities.
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
            <Typography className={styles.cardTitle}>Users</Typography>
            <Stack spacing={2} className={styles.cardContent}>
              {isLoadingUsers ? (
                <CircularProgress size={24} />
              ) : users.length ? (
                <div className={styles.listBox}>
                  {users.map((user) => (
                    <div key={user._id} className={styles.listItem}>
                      <div>
                        <Typography className={styles.listTitle}>
                          {user.username || 'Anonymous'} · {user.email}
                        </Typography>
                        <Typography className={styles.listMeta}>Role: {user.role}</Typography>
                      </div>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() =>
                          setDeleteUserDialog({
                            open: true,
                            userId: user._id,
                            username: user.username || user.email || 'this user',
                            context: null,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Typography className={styles.emptyState}>No users found.</Typography>
              )}
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Scraping Controls</Typography>
            <Stack spacing={2} className={styles.cardContent}>
              <Button variant="contained" onClick={handleScrapeAll} disabled={isScrapingAll}>
                {isScrapingAll ? 'Scraping all...' : 'Scrape all cities'}
              </Button>
              <Box className={styles.inlineField}>
                <TextField
                  label="Scrape city"
                  value={scrapeCityInput}
                  onChange={(e) => setScrapeCityInput(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button variant="outlined" onClick={handleScrapeCity} disabled={isScrapingCity}>
                  Scrape
                </Button>
              </Box>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>City Management</Typography>
            <Stack spacing={2} className={styles.cardContent}>
              <TextField
                label="Add cities"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Comma separated cities"
                multiline
                minRows={2}
              />
              <Button variant="contained" onClick={handleAddCities} disabled={isAddingCities}>
                Add
              </Button>
              <Box className={styles.cityList}>
                <Typography className={styles.sectionLabel}>Existing</Typography>
                {sortedCities.map((city) => (
                  <Chip key={city} label={city} size="small" sx={{ m: 0.5 }} />
                ))}
              </Box>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Daily Visits</Typography>
            <Stack spacing={2} className={styles.cardContent}>
              <TextField
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
              <Button variant="outlined" onClick={handleLoadVisits} disabled={isLoadingVisits}>
                Load
              </Button>
              <Typography variant="h6">{dailyVisits ?? 0} unique visitors</Typography>
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Inventory & Feedback</Typography>
            <Stack spacing={1} className={styles.cardContent}>
              {isLoadingInsights ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <Typography>Tours: {tourCount ?? 0}</Typography>
                  <Typography>Helpful: {feedbackStats?.helpfulCount ?? 0}</Typography>
                  <Typography>Unhelpful: {feedbackStats?.unhelpfulCount ?? 0}</Typography>
                </>
              )}
            </Stack>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Reported Users</Typography>
            <div className={styles.listBox}>
              {reports.map((report) => (
                <div key={report._id} className={styles.listItem}>
                  <div>
                    <Typography variant="subtitle2">
                      {typeof report.reportedId === 'object' ? report.reportedId.username : 'Unknown'}
                    </Typography>
                    <Typography variant="body2">{report.reason}</Typography>
                  </div>
                  <Button
                    color="error"
                    size="small"
                    onClick={() =>
                      setDeleteUserDialog({
                        open: true,
                        userId: typeof report.reportedId === 'object' ? report.reportedId._id : (report.reportedId as string),
                        username: typeof report.reportedId === 'object'
                          ? report.reportedId.username ?? null
                          : 'User',
                        context: 'report',
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </Paper>

          <Paper className={styles.card} elevation={0}>
            <Typography className={styles.cardTitle}>Contact Messages</Typography>
            <div className={styles.listBox}>
              {contactMessages.map((msg) => (
                <div key={msg._id} className={styles.listItem}>
                  <Typography variant="body2">
                    <b>{msg.name}:</b> {msg.message}
                  </Typography>
                </div>
              ))}
              {contactMessages.length < contactTotal && (
                <Button onClick={handleLoadMoreContacts}>Load more</Button>
              )}
            </div>
          </Paper>
        </div>
      </Container>

      <Dialog
        open={deleteUserDialog.open}
        onClose={() => setDeleteUserDialog({ open: false, userId: null, username: null, context: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete user <b>{deleteUserDialog.username}</b>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUserDialog({ open: false, userId: null, username: null, context: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained" disabled={isDeletingUser}>
            {isDeletingUser ? 'Deleting...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
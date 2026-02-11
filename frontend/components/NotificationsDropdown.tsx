// components/NotificationsDropdown.tsx
import {
    Badge,
    IconButton,
    Menu,
    MenuItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Box,
    Button,
    Divider,
    Snackbar,
    Alert,
  } from '@mui/material';
  import ChatIcon from '@mui/icons-material/Chat';
  import { useEffect, useState } from 'react';
  import moment from 'moment';
  import { useRouter } from 'next/router';
  import { useNotifications } from '../hooks/useNotifications';
  import { useTranslation } from 'next-i18next';
  
  interface Props {
    currentUserId: string;
  }
  
  export default function NotificationsDropdown({ currentUserId }: Props) {
    const { t } = useTranslation('common');
    const {
      notifications,
      clearNotificationsFromUser,
      clearAllNotifications,
      lastNotification,
    } = useNotifications(currentUserId);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [toastOpen, setToastOpen] = useState(false);
    const router = useRouter();
  
    const totalUnread = notifications.reduce((sum, n) => sum + n.count, 0);
    const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    useEffect(() => {
      if (lastNotification) setToastOpen(true);
    }, [lastNotification]);
  
    const handleClickNotification = (userId: string) => {
      clearNotificationsFromUser(userId);
      router.push(`/chat/${userId}`);
      handleClose();
    };
  
    return (
      <>
        <IconButton onClick={handleOpen} color="inherit" aria-label={t('notificationsTitle')}>
          <Badge badgeContent={totalUnread} color="error">
            <ChatIcon />
          </Badge>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={700}>
                {t('notificationsTitle')}
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  clearAllNotifications();
                  handleClose();
                }}
                disabled={notifications.length === 0}
              >
                {t('notificationsMarkAll')}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t('notificationsSubtitle')}
            </Typography>
          </Box>
          <Divider />

          {notifications.length === 0 ? (
            <MenuItem disabled>
              <ListItemText primary={t('notificationsEmpty')} />
            </MenuItem>
          ) : (
            notifications.map((notif) => (
              <MenuItem
                key={notif.fromUserId}
                onClick={() => handleClickNotification(notif.fromUserId)}
                sx={{ whiteSpace: 'normal', alignItems: 'flex-start', gap: 1.5 }}
              >
                <ListItemAvatar>
                  <Avatar src={`https://i.pravatar.cc/40?u=${notif.fromUserId}`} />
                </ListItemAvatar>
                <ListItemText
                  primary={`${notif.fromUsername} (${notif.count})`}
                  secondary={
                    <>
                      <Typography variant="body2" noWrap>
                        {notif.messagePreview}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {moment(notif.createdAt).fromNow()}
                      </Typography>
                    </>
                  }
                />
              </MenuItem>
            ))
          )}
        </Menu>

        <Snackbar
          open={toastOpen}
          autoHideDuration={5000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {lastNotification ? (
            <Alert
              severity="info"
              onClose={() => setToastOpen(false)}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => handleClickNotification(lastNotification.fromUserId)}
                >
                  {t('notificationsViewChat')}
                </Button>
              }
            >
              {t('notificationsNewMessage', { name: lastNotification.fromUsername })}
            </Alert>
          ) : null}
        </Snackbar>
      </>
    );
  }
  
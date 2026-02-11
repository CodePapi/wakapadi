import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  ListItem,
  Popover,
  TextField,
  Typography,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material';
import Head from 'next/head';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Layout from '../../components/Layout';
import io, { Socket } from 'socket.io-client';
import { api } from '../../lib/api/index';
import moment from 'moment-timezone';
import dynamic from 'next/dynamic';
import ChatBubble from '../../components/ChatBubbles';
import { useNotifications } from '../../hooks/useNotifications';
import styles from '../../styles/chat.module.css';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { safeStorage } from '../../lib/storage';
import { ensureAnonymousSession } from '../../lib/anonymousAuth';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

interface Reaction {
  emoji: string;
  fromUserId: string;
}

interface Message {
  _id: string;
  message: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
  read: boolean;
  avatar?: string;
  username?: string;
  fromSelf?: boolean;
  reactions?: Reaction[];
  status?: 'sending' | 'sent' | 'failed';
  tempId?: string;
}

interface GroupedMessages {
  [key: string]: Message[];
}

const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export default function ChatPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { userId: otherUserIdParam } = router.query;
  const otherUserId =
    typeof otherUserIdParam === 'string' && isValidObjectId(otherUserIdParam)
      ? otherUserIdParam
      : '';

  const [currentUserId, setCurrentUserId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [messageOptionsAnchorEl, setMessageOptionsAnchorEl] =
    useState<null | HTMLElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [toName, setToName] = useState<string>('');
  const [toAvatar, setToAvatar] = useState<string>('');

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageDedupeMap = useRef<Set<string>>(new Set());
  const { clearNotificationsFromUser } = useNotifications(currentUserId);

  useEffect(() => {
    if (!router.isReady) return;

    const initAnonymous = async () => {
      try {
        const session = await ensureAnonymousSession();
        setAuthToken(session.token);
        setCurrentUserId(session.userId);
        setSessionReady(true);
      } catch (err) {
        console.error('Failed to start anonymous session:', err);
        setConnectionError(t('chatGuestError'));
        setSessionReady(false);
      }
    };

    initAnonymous();
  }, [router.isReady]);

  useEffect(() => {
    if (otherUserId) {
      clearNotificationsFromUser(otherUserId);
    }
  }, [otherUserId]);
  // Debug logs
  useEffect(() => {
    console.log('Current messages:', messages);
  }, [messages]);
  useEffect(() => {
    const unreadIds = messages
      .filter((msg) => !msg.read && msg.fromUserId === otherUserId)
      .map((msg) => msg._id);

    if (unreadIds.length > 0 && socketRef.current) {
      socketRef.current.emit('message:read', {
        toUserId: currentUserId,
        fromUserId: otherUserId,
        messageIds: unreadIds,
      });
    }
  }, [messages, currentUserId, otherUserId]);

  // Main socket effect
  useEffect(() => {
    if (!router.isReady || !sessionReady) {
      return;
    }

    if (!otherUserId) {
      setConnectionError(t('chatInvalidPartner'));
      setLoading(false);
      return;
    }

    if (socketRef.current?.connected) {
      setLoading(false);
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: authToken || safeStorage.getItem('token') || '' },
      withCredentials: true,
    });

    socketRef.current = socket;

    // Socket event handlers
    const onConnect = () => {
      setSocketConnected(true);
      setConnectionError(null);
      socket.emit('joinConversation', {
        userId1: currentUserId,
        userId2: otherUserId,
      });
      fetchMessages();
    };

    const onDisconnect = (reason: string) => {
      setSocketConnected(false);
      setConnectionError(t('chatDisconnected', { reason }));
      setLoading(false);
    };

    const onConnectError = (error: Error) => {
      console.error('Connection error:', error);
      setConnectionError(t('chatConnectError'));
      setLoading(false);
    };

    const onTyping = ({ fromUserId }: { fromUserId: string }) => {
      if (fromUserId !== currentUserId && fromUserId === otherUserId) {
        setTypingUsers((prev) => new Set(prev).add(fromUserId));
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(fromUserId);
            return newSet;
          });
        }, 2000);
      }
    };

    const onReadConfirm = ({ messageIds }: { messageIds: string[] }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg._id) && msg.fromSelf
            ? { ...msg, read: true, status: 'sent' }
            : msg
        )
      );
    };

    const onReaction = ({
      messageId,
      reaction,
    }: {
      messageId: string;
      reaction: Reaction;
    }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                reactions: msg.reactions
                  ? [
                      ...msg.reactions.filter(
                        (r) => r.fromUserId !== reaction.fromUserId
                      ),
                      reaction,
                    ]
                  : [reaction],
              }
            : msg
        )
      );
    };

    const onNewMessage = (msg: Message) => {
      // Deduplication check
      if (
        messageDedupeMap.current.has(msg._id) ||
        (msg.tempId && messageDedupeMap.current.has(msg.tempId))
      ) {
        console.log('Duplicate message detected, ignoring');
        return;
      }

      messageDedupeMap.current.add(msg._id);
      if (msg.tempId) messageDedupeMap.current.add(msg.tempId);

      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (m) => m._id === msg._id || (msg.tempId && m.tempId === msg.tempId)
        );

        if (existingIndex > -1) {
          // Update existing message
          const updated = [...prev];
          updated[existingIndex] = {
            _id: msg._id,
            message: msg.message,
            fromUserId: msg.fromUserId,
            toUserId: msg.toUserId,
            createdAt: msg.createdAt,
            read: msg.read,
            fromSelf: msg.fromUserId === currentUserId,
            username: msg.username,
            avatar:
              msg.avatar || `https://i.pravatar.cc/40?u=${msg.fromUserId}`,
            reactions: msg.reactions || [],
            status: 'sent',
          };
          return updated;
        } else {
          // Add new message
          const newMessage: Message = {
            _id: msg._id,
            message: msg.message,
            fromUserId: msg.fromUserId,
            toUserId: msg.toUserId,
            createdAt: msg.createdAt || new Date().toISOString(),
            read: msg.read,
            fromSelf: msg.fromUserId === currentUserId,
            username: msg.username,
            avatar:
              msg.avatar || `https://i.pravatar.cc/40?u=${msg.fromUserId}`,
            reactions: msg.reactions || [],
            status: 'sent',
          };
          console.log('new m', newMessage);
          if (newMessage.fromUserId === otherUserId && !newMessage.read) {
            socket.emit('message:read', {
              toUserId: currentUserId,
              fromUserId: otherUserId,
              messageIds: [newMessage._id],
            });
            return [...prev, newMessage];
            // if (newMessage.fromUserId === otherUserId && !newMessage.read) {
            //   return [...prev, newMessage]; // don't mark read immediately
          }

          // return [...prev, { ...newMessage, read: true }];

          return [...prev, newMessage];
        }
      });

      if (msg.fromUserId === currentUserId) {
        setText('');
      }
    };

    // Setup event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('typing', onTyping);
    socket.on('message:read:confirm', onReadConfirm);
    socket.on('message:reaction', onReaction);
    socket.on('message:new', onNewMessage);

    // Fetch messages function
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/whois/chat/${otherUserId}/${otherUserIdParam}`
        );
        const msgs = res.data.messages.map((msg: Message) => ({
          _id: msg._id,
          message: msg.message,
          fromUserId: msg.fromUserId,
          toUserId: msg.toUserId,
          createdAt: msg.createdAt,
          read: msg.read,
          fromSelf: msg.fromUserId === currentUserId,
          username: msg.username,
          avatar: msg.avatar || `https://i.pravatar.cc/40?u=${msg.fromUserId}`,
          reactions: msg.reactions || [],
          status: 'sent',
        }));
        setToName(res.data.otherUser.username);
        setToAvatar(res.data.otherUser.avatarUrl);
        // Add to dedupe map
        msgs.forEach((msg: Message) => messageDedupeMap.current.add(msg._id));

        setMessages(msgs);

        const unreadMessageIds = msgs
          .filter((msg: Message) => !msg.read && msg.fromUserId === otherUserId)
          .map((msg: Message) => msg._id);

        if (unreadMessageIds.length > 0) {
          socket.emit('message:read', {
            toUserId: currentUserId,
            fromUserId: otherUserId,
            messageIds: unreadMessageIds,
          });
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        setConnectionError(t('chatLoadMessagesError'));
      } finally {
        setLoading(false);
      }
    };

    return () => {
      if (socketRef.current) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onConnectError);
              setConnectionError(t('chatLoadMessagesError'));
        socket.off('message:read:confirm', onReadConfirm);
        socket.off('message:reaction', onReaction);
        socket.off('message:new', onNewMessage);
        socket.disconnect();
        socketRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      messageDedupeMap.current.clear();
    };
  }, [router.isReady, sessionReady, otherUserId, currentUserId, authToken]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.size]);

  // Handlers
  const handleSend = useCallback(async () => {
    if (!text.trim() || !socketRef.current || !otherUserId) return;

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    // const messageToSend: Message = {
    //   _id: tempId,
    //   message: text,
    //   fromUserId: currentUserId,
    //   toUserId: otherUserId,
    //   createdAt: new Date().toISOString(),
    //   read: false,
    //   fromSelf: true,
    //   username: 'You',
    //   avatar: `https://i.pravatar.cc/40?u=${currentUserId}`,
    //   status: 'sending',
    //   tempId,
    // };

    // setMessages(prev => [...prev, messageToSend]);
    messageDedupeMap.current.add(tempId);

    socketRef.current.emit('message', {
      to: otherUserId,
      message: text,
      tempId,
    });

    // Clear typing status
    setTypingUsers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentUserId);
      return newSet;
    });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [text, currentUserId, otherUserId]);

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value);
      if (!socketRef.current || !otherUserId) return;

      socketRef.current.emit('typing', { to: otherUserId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stoppedTyping', { to: otherUserId });
        typingTimeoutRef.current = null;
      }, 2000);
    },
    [otherUserId]
  );

  const handleEmojiClick = (e: React.MouseEvent<HTMLElement>) => {
    setEmojiAnchorEl(e.currentTarget);
  };

  const handleEmojiSelect = (emoji: { native: boolean }) => {
    setText((prev) => prev + emoji.native);
    setEmojiAnchorEl(null);
  };

  const handleMessageOptionsClick = (
    event: React.MouseEvent<HTMLElement>,
    messageId: string
  ) => {
    setMessageOptionsAnchorEl(event.currentTarget);
    setSelectedMessageId(messageId);
  };

  const handleMessageOptionsClose = () => {
    setMessageOptionsAnchorEl(null);
    setSelectedMessageId(null);
  };

  const handleReaction = useCallback(
    (emoji: string) => {
      if (selectedMessageId && socketRef.current && otherUserId) {
        socketRef.current.emit('message:reaction', {
          messageId: selectedMessageId,
          emoji,
          toUserId: otherUserId,
        });
        handleMessageOptionsClose();
      }
    },
    [selectedMessageId, otherUserId]
  );

  // Group messages by date
  const groupedMessages = messages.reduce((groups: GroupedMessages, msg) => {
    const date = moment(msg.createdAt).format('LL');
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const getReadStatusText = (message: Message) => {
    if (message.fromSelf) {
      if (message.status === 'sending') return t('chatStatusSending');
      if (message.status === 'failed') return t('chatStatusFailed');
      if (message.read) return t('chatStatusRead');
      return t('chatStatusSent');
    }
    return null;
  };

  // Render loading/error states
  return (
    <Layout title={t('chatPageTitle', { name: toName })}>
      <Head>
        <title>{t('chatPageTitleMeta', { name: toName })}</title>
        <meta name="description" content={t('chatMetaDescription', { name: toName })} />
      </Head>

      <Container className={styles.chatContainer}>
        {/* Header Section */}
        <Box className={styles.chatHeader}>
          <Avatar className={styles.chatAvatar} src={toAvatar} alt={toName} />
          <Box className={styles.chatHeaderInfo}>
            <Typography variant="h6" className={styles.chatTitle}>
              {t('chatWithName', { name: toName })}
            </Typography>
            <Typography variant="body2" className={styles.chatSubtitle}>
              {socketConnected ? t('chatOnline') : t('chatOffline')}
            </Typography>
          </Box>
        </Box>

        {/* Safety Alert */}
        <Alert severity="warning" className={styles.safetyAlert}>
          {t('chatSafetyWarning')}
        </Alert>

        {/* Connection Error */}
        {connectionError && (
          <Alert severity="error" className={styles.errorAlert}>
            {connectionError}
          </Alert>
        )}

        {/* Messages Area */}
        <Box className={styles.messagesContainer}>
          {loading ? (
            <Box className={styles.loadingContainer}>
              <CircularProgress />
              <Typography variant="body2" className={styles.loadingText}>
                {t('chatLoadingMessages')}
              </Typography>
            </Box>
          ) : (
            <>
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <Box key={date} className={styles.messageGroup}>
                  <Divider className={styles.dateDivider}>
                    <Chip label={date} className={styles.dateChip} />
                  </Divider>
                  {msgs.map((msg) => (
                    <ListItem
                      key={msg._id}
                      className={`${styles.messageItem} ${
                        msg.fromSelf
                          ? styles.messageItemSelf
                          : styles.messageItemOther
                      }`}
                    >
                      <ChatBubble
                        message={msg.message}
                        fromSelf={msg.fromSelf!}
                        avatar={msg.avatar!}
                        username={msg.username}
                        createdAt={msg.createdAt}
                        reactions={msg.reactions}
                        readStatus={getReadStatusText(msg)}
                      />
                      <IconButton
                        className={styles.messageOptionsButton}
                        onClick={(e) => handleMessageOptionsClick(e, msg._id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </Box>
              ))}
              {typingUsers.size > 0 && (
                <Box className={styles.typingIndicator}>
                  <Typography variant="caption">
                    {t('chatTyping', { name: toName })}
                  </Typography>
                </Box>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </Box>

        {/* Message Options Menu */}
        <Menu
          anchorEl={messageOptionsAnchorEl}
          open={Boolean(messageOptionsAnchorEl)}
          onClose={handleMessageOptionsClose}
          className={styles.messageOptionsMenu}
        >
          <MenuItem onClick={() => handleReaction('👍')}>👍 {t('chatReactionLike')}</MenuItem>
          <MenuItem onClick={() => handleReaction('❤️')}>❤️ {t('chatReactionLove')}</MenuItem>
          <MenuItem onClick={() => handleReaction('😂')}>😂 {t('chatReactionLaugh')}</MenuItem>
          <MenuItem onClick={() => handleReaction('😮')}>😮 {t('chatReactionWow')}</MenuItem>
          <MenuItem onClick={() => handleReaction('😢')}>😢 {t('chatReactionSad')}</MenuItem>
          <MenuItem onClick={() => handleReaction('😡')}>😡 {t('chatReactionAngry')}</MenuItem>
        </Menu>

        {/* Input Area */}
        <Box className={styles.inputContainer}>
          <IconButton
            className={styles.emojiButton}
            onClick={handleEmojiClick}
            aria-label={t('chatAddEmoji')}
          >
            <InsertEmoticonIcon />
          </IconButton>
          <Popover
            open={!!emojiAnchorEl}
            anchorEl={emojiAnchorEl}
            onClose={() => setEmojiAnchorEl(null)}
            className={styles.emojiPicker}
          >
            <Picker onEmojiSelect={handleEmojiSelect} />
          </Popover>
          <TextField
            fullWidth
            placeholder={t('chatPlaceholder')}
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            multiline
            maxRows={4}
            disabled={!socketConnected || loading || !otherUserId}
            className={styles.messageInput}
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={
              !text.trim() || !socketConnected || loading || !otherUserId
            }
            className={styles.sendButton}
          >
            {t('chatSend')}
          </Button>
        </Box>
      </Container>
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

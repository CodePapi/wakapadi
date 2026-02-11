import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import {
  Box,
  Button,
  Container,
  IconButton,
  Popover,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import dynamic from 'next/dynamic';
import io, { Socket } from 'socket.io-client';
import styles from '../styles/bot.module.css';
import TourCard from '../components/ChatTourCard';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { safeStorage } from '../lib/storage';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });
interface Result {
  payload: {
    title: string;
    location: string;
    rating: number;
    externalPageUrl: string;
    description: string;
  };
}
interface ChatMessage {
  text: string;
  fromSelf: boolean;
  timestamp?: Date;
  followUp?: boolean;
  results?: Result[];
}

interface BotResponse {
  text: string;
  results?: Result[];
  followUp?: boolean;
}

const ChatBubble = ({
  message,
  fromSelf,
  avatar,
  createdAt,
  followUp,
  onFeedback,
}: {
  message: ReactNode;
  fromSelf: boolean;
  avatar: string;
  createdAt: string;
  followUp?: boolean;
  onFeedback?: (helpful: boolean) => void;
}) => {
  const { t } = useTranslation('common');
  return (
    <div
      className={`${styles.messageItem} ${
        fromSelf ? styles.messageItemSelf : styles.messageItemOther
      }`}
    >
      {!fromSelf && avatar && (
        <img src={avatar} className={styles.avatar} alt={t('chatbotAvatarAlt')} />
      )}
      <div
        className={`${styles.messageBubble} ${
          fromSelf ? styles.messageBubbleSelf : styles.messageBubbleOther
        }`}
      >
        <div className={styles.messageText}>{message}</div>
        <div className={styles.messageMeta}>
          <span className={styles.messageTime}>
            {createdAt
              ? new Date(createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </span>
        </div>
        {followUp && !fromSelf && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption">{t('chatbotHelpfulPrompt')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              {onFeedback && (
                <Button size="small" onClick={() => onFeedback(true)}>
                  {t('chatbotHelpfulYes')}
                </Button>
              )}
              {onFeedback && (
                <Button size="small" onClick={() => onFeedback(false)}>
                  {t('chatbotHelpfulNo')}
                </Button>
              )}
            </Box>
          </Box>
        )}
      </div>
    </div>
  );
};

export default function ChatBotPage() {
  const { t } = useTranslation('common');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = safeStorage.getItem('chatHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch {
        console.warn('Could not parse saved chat history');
      }
    } else {
      setMessages([
        {
          text: t('chatbotWelcomeMessage'),
          fromSelf: false,
          timestamp: new Date(),
        },
      ]);
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: safeStorage.getItem('token') || '' },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', (err: Error) => {
      console.error('Connection error:', err);
      setError(t('chatbotConnectError'));
    });

    socket.on('bot:response', (response: string | BotResponse) => {
      let messageText: string;
      let followUp = false;
      let results: Result[] = [];

      if (typeof response === 'string') {
        messageText = response;
      } else {
        messageText = response.text;
        followUp = response.followUp || false;
        results = response.results || [];
      }

      setMessages((prev) => {
        const updated = [
          ...prev,
          {
            text: messageText,
            fromSelf: false,
            timestamp: new Date(),
            followUp,
            results,
          },
        ];
        return updated.slice(-100);
      });

      setIsBotTyping(false);

      if (followUp) {
        setSuggestedFollowUps([
          t('chatbotFollowUpMoreOptions'),
          t('chatbotFollowUpCheaper'),
          t('chatbotFollowUpPopular'),
        ]);
      }
    });

    socket.on('bot:typing', (typing: boolean) => {
      setIsBotTyping(typing);
    });

    return () => {
      socket.disconnect();
    };
  }, [t]);

  useEffect(() => {
    const trimmed = [...messages].slice(-100);
    safeStorage.setItem('chatHistory', JSON.stringify(trimmed));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  const handleSend = useCallback(() => {
    if (!text.trim() || !socketRef.current) return;

    const newMessage: ChatMessage = {
      text,
      fromSelf: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage].slice(-100));
    setText('');
    setSuggestedFollowUps([]);
    setIsBotTyping(true);

    socketRef.current.emit(
      'bot:message',
      {
        message: text,
        context: {
          lastMessages: messages.slice(-3).map((m) => m.text),
        },
      },
      (err: Error) => {
        if (err) {
          // setError('Failed to send message');
          setIsBotTyping(false);
        }
      }
    );
  }, [text, messages]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleEmojiClick = (e: React.MouseEvent<HTMLElement>) => {
    setEmojiAnchorEl(e.currentTarget);
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setText((prev) => prev + emoji.native);
    setEmojiAnchorEl(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout title={t('chatbotPageTitle')}>
      <PageHeader
        title={t('chatbotTitle')}
        subtitle={t('chatbotSubtitle')}
      />
      <Container className={styles.chatContainer}>
        <Box className={styles.chatHeader}>
          <Typography variant="h6" className={styles.chatTitle}>
            {t('chatbotChatTitle')}
          </Typography>
          <Box display="flex" alignItems="center">
            <Box
              width={10}
              height={10}
              bgcolor={socketConnected ? 'success.main' : 'error.main'}
              borderRadius="50%"
              mr={1}
            />
            <Typography variant="body2" className={styles.chatSubtitle}>
              {socketConnected ? t('chatbotOnline') : t('chatbotOffline')}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box className={styles.messagesContainer}>
          {messages.map((msg, i) => (
            <Box key={i} className={styles.messageItem}>
              <ChatBubble
                message={msg.text}
                fromSelf={msg.fromSelf}
                avatar={msg.fromSelf ? '' : '/bot_avatar.png'}
                createdAt={msg.timestamp!.toString()}
                followUp={msg.followUp}
                onFeedback={(helpful: boolean) => {
                  if (socketRef.current) {
                    socketRef.current.emit('bot:feedback', {
                      isHelpful: Boolean(helpful), // Ensures it's a real boolean
                      response: helpful ? 'helpful' : 'not helpful',
                      messageId: msg.text,
                    });
                  }
                }}
              />
              {msg.results && msg.results.length > 0 && (
                <Box sx={{ ml: msg.fromSelf ? 0 : 6 }}>
                  {msg.results?.map((tour, idx) => (
                    <TourCard
                      key={idx}
                      title={tour.payload.title}
                      location={tour.payload.location}
                      rating={tour.payload.rating}
                      url={tour.payload.externalPageUrl}
                      shortDescription={tour.payload.description?.slice(0, 150)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ))}

          {isBotTyping && (
            <Box className={styles.messageItem}>
              <ChatBubble
                message={<span className={styles.typingDots}>...</span>}
                fromSelf={false}
                avatar="/bot_avatar.png"
                createdAt={new Date().toISOString()}
              />
            </Box>
          )}

          <div ref={bottomRef} />
        </Box>

        {suggestedFollowUps.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, p: 1, flexWrap: 'wrap' }}>
            {suggestedFollowUps.map((suggestion, i) => (
              <Button
                key={i}
                variant="outlined"
                size="small"
                onClick={() => {
                  setText(suggestion);
                  handleSend();
                }}
              >
                {suggestion}
              </Button>
            ))}
          </Box>
        )}

        <Box className={styles.inputContainer}>
          <IconButton onClick={handleEmojiClick} disabled={!socketConnected}>
            <InsertEmoticonIcon />
          </IconButton>

          <Popover
            open={!!emojiAnchorEl}
            anchorEl={emojiAnchorEl}
            onClose={() => setEmojiAnchorEl(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Picker
              onEmojiSelect={handleEmojiSelect}
              theme="light"
              previewPosition="none"
            />
          </Popover>

          <TextField
            fullWidth
            placeholder={
              socketConnected ? t('chatbotPlaceholderConnected') : t('chatbotPlaceholderConnecting')
            }
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            disabled={!socketConnected || isBotTyping}
            multiline
            maxRows={4}
          />

          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!text.trim() || !socketConnected || isBotTyping}
            className={styles.sendButton}
          >
            {t('chatbotSend')}
          </Button>
        </Box>
      </Container>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

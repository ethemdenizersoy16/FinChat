import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ReactMarkdown from 'react-markdown';

interface CoinGeckoPoint {
  timestamp: number;
  price: number;
}

interface ChartItem {
  coinName: string;
  data: { time: string; Price: string }[];
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  charts?: ChartItem[];
  timestamp: Date;
}

// Single neon-green accent, single dark-gray background — no other colors.
const NEON = '#39FF14';
const BG = '#1a1a1a';
const BG_BUBBLE_USER = '#2d2d2d';
const BG_BUBBLE_ASSISTANT = '#242424';
const BG_HEADER = '#0f0f0f';
const BG_INPUT = '#2a2a2a';
const TEXT = '#ffffff';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const BORDER = '#333333';

function App() {
  const [sessionId] = useState<string>(() => {
    // Check if they already have an ID from a previous visit
    const existingId = localStorage.getItem('finchat_session_id');
    if (existingId) {
      return existingId;
    }

    // If not, generate a new one. 
    // Fallback included just in case they are on an ancient browser.
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `user-${Math.random().toString(36).substring(2, 15)}`;
    
    // Save it for next time
    localStorage.setItem('finchat_session_id', newId);
    return newId;
  });
  
  
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      text: "Hey! I'm FinChat 👋 Ask me about crypto prices, charts, or anything finance-related.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(280);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`https://finchat-zui4.onrender.com/api/history?session_id=${sessionId}`);
        const data = await response.json();

        if (data.history && data.history.length > 0) {
          const loadedMessages: Message[] = data.history.map((msg: any) => {
            
            // 1. Transform historical chart data if it exists
            let historicalCharts: ChartItem[] = [];
            if (msg.chart_data && typeof msg.chart_data === 'object') {
              historicalCharts = Object.keys(msg.chart_data).map((coinKey) => {
                const formattedArray = msg.chart_data[coinKey].map((item: any) => ({
                  time: new Date(item.timestamp).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }),
                  Price: item.price.toFixed(2)
                }));
                return { coinName: coinKey.toUpperCase(), data: formattedArray };
              });
            }

            // 2. Return the fully hydrated message object
            return {
              id: msg.id,
              role: msg.role,
              text: msg.chart_string ? msg.chart_string : msg.content,
              charts: historicalCharts.length > 0 ? historicalCharts : undefined,
              timestamp: new Date(msg.created_at + 'Z'), // 'Z' ensures UTC parsing
            };
          });
          
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    fetchHistory();
  }, []);
  // Measure container for responsive chart width
  useEffect(() => {
    const updateWidth = () => {
      const containerW = containerRef.current?.clientWidth ?? 480;
      const available = Math.floor(containerW * 0.85) - 40;
      // Raised cap from 360 -> 600 so charts scale nicely on desktop
      setChartWidth(Math.max(240, Math.min(available, 600)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const trimmed = input.trim();
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch("https://finchat-zui4.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_message: trimmed, session_id: sessionId })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            text: `Error: ${data.detail}`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      let allCharts: ChartItem[] = [];
      if (data.chart_data && typeof data.chart_data === 'object') {
        // ---- PRESERVED CHART FORMATTING LOGIC ----
        allCharts = Object.keys(data.chart_data).map((coinKey) => {
          // Format the array for this specific coin
          const formattedArray = data.chart_data[coinKey].map((item: CoinGeckoPoint) => {
            return {
              time: new Date(item.timestamp).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              }),
              Price: item.price.toFixed(2)
            };
          });

          // Return a structured object containing the coin's name and its formatted data
          return {
            coinName: coinKey.toUpperCase(),
            data: formattedArray
          };
        });
        // ---- END PRESERVED LOGIC ----
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: data.message,
          charts: allCharts.length > 0 ? allCharts : undefined,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: "Failed to connect to Python backend.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div ref={containerRef} style={styles.appContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.avatar}>💹</div>
        <div style={styles.headerText}>
          <div style={styles.headerTitle}>FinChat</div>
          <div style={styles.headerSubtitle}>
            {isLoading ? 'typing…' : 'AI Financial Assistant'}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main style={styles.messagesContainer}>
        <div style={styles.messagesInner}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const hasCharts = !!msg.charts && msg.charts.length > 0;
            return (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    background: isUser ? BG_BUBBLE_USER : BG_BUBBLE_ASSISTANT,
                    borderBottomRightRadius: isUser ? 2 : 8,
                    borderBottomLeftRadius: isUser ? 8 : 2,
                    width: hasCharts ? chartWidth + 32 : 'auto',
                  }}
                >
                  <div style={styles.messageText}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {/* ---- PRESERVED CHART RENDERING MAP ---- */}
                  {msg.charts && msg.charts.map((chartItem, index) => (
                    <div key={index} style={styles.chartContainer}>
                      <div style={styles.chartTitle}>{chartItem.coinName}</div>
                      <div style={{ ...styles.chartWrapper, width: chartWidth, height: 180 }}>
                        <LineChart
                          width={chartWidth -14}
                          height={180}
                          data={chartItem.data}
                          margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                          <XAxis dataKey="time" minTickGap={50} stroke={TEXT_MUTED} tick={{ fontSize: 9, fill: TEXT_MUTED }} />
                          <YAxis domain={['auto', 'auto']} stroke={TEXT_MUTED} tick={{ fontSize: 9, fill: TEXT_MUTED }} width={45} />
                          <Tooltip
                            contentStyle={{
                              fontSize: 11,
                              borderRadius: 6,
                              backgroundColor: BG_BUBBLE_USER,
                              border: `1px solid ${BORDER}`,
                              color: TEXT,
                            }}
                            labelStyle={{ color: TEXT }}
                            itemStyle={{ color: NEON }}
                          />
                          <Line type="monotone" dataKey="Price" stroke={NEON} strokeWidth={2} dot={false} />
                        </LineChart>
                      </div>
                    </div>
                  ))}
                  {/* ---- END PRESERVED CHART RENDERING MAP ---- */}

                  <div style={styles.timestamp}>{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
              <div
                style={{
                  ...styles.messageBubble,
                  background: BG_BUBBLE_ASSISTANT,
                  padding: '12px 16px',
                  borderBottomLeftRadius: 2,
                }}
              >
                <div style={styles.typingIndicator}>
                  <span style={{ ...styles.typingDot, animationDelay: '0s' }} />
                  <span style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
                  <span style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Bar */}
      <footer style={styles.inputBar}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about crypto prices…"
          style={styles.input}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            ...styles.sendButton,
            opacity: isLoading || !input.trim() ? 0.4 : 1,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
          aria-label="Send message"
        >
          ➤
        </button>
      </footer>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        html, body, #root { height: 100%; margin: 0; padding: 0; background: ${BG}; }
        * { box-sizing: border-box; }
        main::-webkit-scrollbar { width: 6px; }
        main::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        input::placeholder { color: ${TEXT_MUTED}; }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: BG,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    background: BG_HEADER,
    color: TEXT,
    flexShrink: 0,
    borderBottom: `1px solid ${BORDER}`,
    zIndex: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: BG_INPUT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    marginRight: 12,
    flexShrink: 0,
  },
  headerText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  headerTitle: { fontWeight: 600, fontSize: 16, lineHeight: 1.2, color: TEXT },
  headerSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 12px',
    background: BG,
  },
  messagesInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    margin: '0 auto',
    width: '100%',
  },
  messageRow: { display: 'flex', width: '100%', padding: '2px 4px' },
  messageBubble: {
    maxWidth: 'min(85%, 700px)',
  padding: '8px 12px 6px 12px',
  borderRadius: 10,
  wordBreak: 'break-word',
  border: `1px solid ${BORDER}`,
  },
  messageText: {
    fontSize: 14.5,
    color: TEXT,
    lineHeight: 1.4,
  },
  timestamp: {
    fontSize: 10.5,
    color: TEXT_MUTED,
    textAlign: 'right',
    marginTop: 2,
  },
  chartContainer: {
    marginTop: 8,
    padding: '8px 6px 4px 6px',
    background: BG,
    borderRadius: 6,
    border: `1px solid ${BORDER}`,
    display: 'inline-block',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: TEXT,
    marginBottom: 4,
    paddingLeft: 4,
  },
  chartWrapper: {
    overflow: 'hidden',
  },
  typingIndicator: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    height: 16,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: NEON,
    display: 'inline-block',
    animation: 'typingBounce 1.4s infinite ease-in-out',
  },
  inputBar: {
    display: 'flex',
    padding: '12px 16px',
    background: BG_HEADER,
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
    borderTop: `1px solid ${BORDER}`,
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    border: `1px solid ${BORDER}`,
    borderRadius: 24,
    fontSize: 16,
    outline: 'none',
    background: BG_INPUT,
    color: TEXT,
    minWidth: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: BG_INPUT,
    color: NEON,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },
};

export default App;
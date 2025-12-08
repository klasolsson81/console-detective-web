import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { chatAPI } from '../services/api';
import { ChatMessage } from '../types';
import { ArrowLeft, Send, AlertTriangle, Loader, Sparkles } from 'lucide-react';

// Helper för bilder (samma som i CasePage)
const getImagePath = (name: string) => {
  const normalizedName = name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o');
  return `/images/suspects/${normalizedName}.png`;
};

const InterrogationPage = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [suspectName, setSuspectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;
      try {
        const sessionData = await chatAPI.getSession(sessionId);
        setSuspectName(sessionData.suspectName);
        setMessages(sessionData.messages || []);

        // Fetch initial suggestions
        await fetchSuggestions();
      } catch (error) {
        console.error("Kunde inte ladda förhör:", error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSuggestions = async () => {
    if (!sessionId) return;
    setLoadingSuggestions(true);
    try {
      const suggestions = await chatAPI.getSuggestedQuestions(sessionId);
      setSuggestedQuestions(suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestedQuestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInputMessage(question);
  };

  const handleSendMessage = async (e?: React.FormEvent, directMessage?: string) => {
    if (e) e.preventDefault();

    const messageToSend = directMessage || inputMessage;
    if (!messageToSend.trim() || sending) return;

    setInputMessage('');
    setSending(true);

    const tempId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: tempId,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await chatAPI.sendMessage(sessionId!, messageToSend);
      const aiMessage: ChatMessage = {
        id: response.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        emotionalTone: response.emotionalTone,
        timestamp: response.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Fetch new suggestions after suspect responds
      await fetchSuggestions();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const getEmotionalToneColor = (tone?: string) => {
    switch (tone) {
      case 'nervous':
      case 'defensive':
      case 'evasive': return 'text-red-400';
      case 'calm':
      case 'confident': return 'text-green-400';
      case 'irritated':
      case 'tense': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-noir-darkest flex items-center justify-center">
        <Loader className="animate-spin text-noir-accent" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/dashboard-office.jpg)' }}
      />
      <div className="fixed inset-0 bg-black/80" />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Banner with Texture */}
        <div className="py-6 px-4 mb-6">
          <div className="container mx-auto max-w-4xl">
            <div
              className="relative px-8 py-6 rounded-2xl shadow-2xl"
              style={{
                backgroundImage: 'url(/images/case_ui/header_texture.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '3px solid rgba(212, 175, 55, 0.4)',
              }}
            >
              <div className="absolute inset-0 bg-black/40 rounded-2xl" />
              <div className="relative z-10 flex items-center justify-between">
                <button
                  onClick={() => navigate(-1)}
                  className="text-gray-300 hover:text-noir-accent transition-colors flex items-center gap-2 text-sm"
                >
                  <ArrowLeft size={20} />
                  <span className="hidden sm:inline">Tillbaka</span>
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-noir-accent shadow-lg">
                    <img
                      src={getImagePath(suspectName)}
                      alt={suspectName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-noir text-white tracking-wider uppercase"
                      style={{ textShadow: '0 4px 8px rgba(0,0,0,0.9)' }}>
                    <span className="text-noir-accent">FÖRHÖR:</span> {suspectName}
                  </h1>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="hidden sm:block text-xs px-4 py-2 border border-noir-accent/50 text-noir-accent hover:bg-noir-accent hover:text-noir-darkest transition-all rounded"
                >
                  Avsluta
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto container mx-auto px-4 py-4 max-w-4xl">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-noir-accent mx-auto mb-6 shadow-xl">
                <img
                  src={getImagePath(suspectName)}
                  alt={suspectName}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-gray-300 text-lg font-detective">
                Du står öga mot öga med {suspectName}.
              </p>
              <p className="text-gray-400 mt-2">Ställ din första fråga...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center shadow-lg ${
                      message.role === 'user' ? 'border-noir-accent' : 'border-gray-600'
                    }`}>
                    <img
                      src={message.role === 'user' ? '/images/logga.png' : getImagePath(suspectName)}
                      alt={message.role}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>

                  <div className={`flex-1 max-w-2xl ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block px-6 py-4 rounded-xl shadow-lg ${
                        message.role === 'user'
                          ? 'bg-noir-accent text-noir-darkest font-semibold'
                          : 'bg-noir-darker/90 border border-gray-700/50 text-gray-100 backdrop-blur-sm'
                      }`}>
                      <p className="leading-relaxed whitespace-pre-wrap text-left">{message.content}</p>
                    </div>
                    {message.emotionalTone && message.role === 'assistant' && (
                      <div className={`mt-2 text-sm flex items-center gap-1 ${getEmotionalToneColor(message.emotionalTone)}`}>
                         {message.emotionalTone === 'nervous' || message.emotionalTone === 'defensive' ? <AlertTriangle size={12} /> : null}
                         Tonläge: {message.emotionalTone}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
              {sending && (
                 <div className="text-gray-400 text-sm italic ml-16 flex items-center gap-2">
                   <div className="w-2 h-2 bg-noir-accent rounded-full animate-bounce" />
                   <div className="w-2 h-2 bg-noir-accent rounded-full animate-bounce delay-75" />
                   <div className="w-2 h-2 bg-noir-accent rounded-full animate-bounce delay-150" />
                   {suspectName} skriver...
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-noir-darker/95 backdrop-blur-md border-t border-gray-700/50 py-4 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* AI Suggested Questions */}
            {suggestedQuestions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-noir-accent" />
                  <span className="text-sm text-gray-400 font-detective">Föreslagna frågor:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleSuggestionClick(question)}
                      disabled={sending}
                      className="px-4 py-2 bg-noir-darker border border-noir-accent/40 text-gray-300 text-sm rounded-lg hover:bg-noir-accent/20 hover:border-noir-accent transition-all disabled:opacity-50 text-left"
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {loadingSuggestions && suggestedQuestions.length === 0 && (
              <div className="mb-4 flex items-center gap-2 text-gray-500 text-sm">
                <Loader size={14} className="animate-spin" />
                <span>Genererar frågeförslag...</span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Fråga ${suspectName} något...`}
                className="input-noir flex-1 text-base rounded-lg bg-noir-dark/80 border-gray-600 focus:border-noir-accent"
                disabled={sending}
                autoFocus
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50 rounded-lg"
              >
                <Send size={18} />
                <span className="hidden sm:inline">Skicka</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterrogationPage;
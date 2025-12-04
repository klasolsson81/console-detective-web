import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { chatAPI } from '../services/api';
import { ChatMessage } from '../types';
import { ArrowLeft, Send, User, Bot, AlertTriangle, Loader } from 'lucide-react';

const InterrogationPage = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [suspectName, setSuspectName] = useState('');
  const [loading, setLoading] = useState(true); // Ny loading state
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === NY LOGIK: Ladda sessionen på riktigt ===
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;
      try {
        const sessionData = await chatAPI.getSession(sessionId);
        setSuspectName(sessionData.suspectName);
        setMessages(sessionData.messages || []);
      } catch (error) {
        console.error("Kunde inte ladda förhör:", error);
        // Om sessionen inte finns, gå tillbaka
        navigate('/dashboard'); 
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, navigate]);
  // ============================================

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessageContent = inputMessage;
    setInputMessage('');
    setSending(true);

    // Optimistisk uppdatering: Visa användarens meddelande direkt
    const tempId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: tempId,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      // Skicka till backend
      const response = await chatAPI.sendMessage(sessionId!, userMessageContent);

      // Backend returnerar nu AI-svaret direkt
      const aiMessage: ChatMessage = {
        id: response.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        emotionalTone: response.emotionalTone,
        timestamp: response.timestamp || new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Ta bort meddelandet om det misslyckades, eller visa fel
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
    <div className="min-h-screen bg-noir-darkest flex flex-col">
      {/* Header */}
      <div className="bg-noir-darker border-b border-gray-800 py-4 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2">
            <ArrowLeft size={20} /> {t('common.back')}
          </button>
          <h1 className="text-2xl font-noir text-noir-accent">
            {t('interrogation.title')} <span className="text-gray-100">{suspectName}</span>
          </h1>
          <button onClick={() => navigate(-1)} className="btn-secondary text-sm px-4 py-2">
            {t('interrogation.endInterrogation')}
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto container mx-auto px-4 py-8 max-w-4xl">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <User className="text-gray-600 mx-auto mb-4" size={64} />
            <p className="text-gray-400 text-lg">
              Du står öga mot öga med {suspectName}.
            </p>
            <p className="text-gray-500 mt-2">Ställ din första fråga...</p>
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
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    message.role === 'user' ? 'bg-noir-accent' : 'bg-noir-dark border border-gray-700'
                  }`}>
                  {message.role === 'user' ? 
                    <User size={24} className="text-noir-darkest" /> : 
                    <Bot size={24} className="text-gray-400" />}
                </div>

                <div className={`flex-1 max-w-2xl ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-6 py-4 rounded-lg ${
                      message.role === 'user' ? 'bg-noir-accent text-noir-darkest' : 'bg-noir-dark border border-gray-700 text-gray-100'
                    }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.emotionalTone && message.role === 'assistant' && (
                    <div className={`mt-2 text-sm ${getEmotionalToneColor(message.emotionalTone)}`}>
                       Tonläge: {message.emotionalTone}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
            {sending && (
               <div className="text-gray-500 text-sm italic ml-16">
                 {suspectName} tänker...
               </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-noir-darker border-t border-gray-800 py-4 px-4">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Fråga ${suspectName} något...`}
              className="input-noir flex-1 text-lg"
              disabled={sending}
              autoFocus
            />
            <button
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className="btn-primary flex items-center gap-2 px-8 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InterrogationPage;
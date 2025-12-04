import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { chatAPI } from '../services/api';
import { ChatMessage } from '../types';
import { ArrowLeft, Send, AlertTriangle, Loader } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;
      try {
        const sessionData = await chatAPI.getSession(sessionId);
        setSuspectName(sessionData.suspectName);
        setMessages(sessionData.messages || []);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessageContent = inputMessage;
    setInputMessage('');
    setSending(true);

    const tempId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: tempId,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await chatAPI.sendMessage(sessionId!, userMessageContent);
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
          <div className="flex items-center gap-3">
             {/* Liten avatar i headern */}
             <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-600">
                <img 
                  src={getImagePath(suspectName)} 
                  alt={suspectName}
                  className="w-full h-full object-cover"
                />
             </div>
             <h1 className="text-2xl font-noir text-noir-accent">
               Förhör: <span className="text-gray-100">{suspectName}</span>
             </h1>
          </div>
          <button onClick={() => navigate(-1)} className="btn-secondary text-sm px-4 py-2">
            {t('interrogation.endInterrogation')}
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto container mx-auto px-4 py-8 max-w-4xl">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-noir-accent mx-auto mb-6">
                <img 
                  src={getImagePath(suspectName)} 
                  alt={suspectName}
                  className="w-full h-full object-cover"
                />
            </div>
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
                {/* AVATARER I CHATTEN */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border flex items-center justify-center ${
                    message.role === 'user' ? 'border-noir-accent' : 'border-gray-700'
                  }`}>
                  <img 
                    src={message.role === 'user' ? '/images/logga.png' : getImagePath(suspectName)} 
                    alt={message.role}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} // Dölj om bild saknas
                  />
                </div>

                <div className={`flex-1 max-w-2xl ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-6 py-4 rounded-lg ${
                      message.role === 'user' ? 'bg-noir-accent text-noir-darkest' : 'bg-noir-dark border border-gray-700 text-gray-100'
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
               <div className="text-gray-500 text-sm italic ml-16 flex items-center gap-2">
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75" />
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150" />
                 {suspectName} skriver...
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
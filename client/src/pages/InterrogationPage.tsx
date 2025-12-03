import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { chatAPI } from '../services/api';
import { ChatMessage } from '../types';
import { ArrowLeft, Send, User, Bot, AlertTriangle } from 'lucide-react';

const InterrogationPage = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [suspectName, setSuspectName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // TODO: Load session and messages from API
    // För nu använder vi mock data
    setSuspectName('Anna');
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setSending(true);

    // Add user message
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await chatAPI.sendMessage(sessionId!, userMessage);

      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        emotionalTone: response.emotionalTone,
        timestamp: new Date().toISOString(),
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
      case 'evasive':
        return 'text-red-400';
      case 'calm':
      case 'confident':
        return 'text-green-400';
      case 'irritated':
      case 'tense':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getEmotionalToneIcon = (tone?: string) => {
    switch (tone) {
      case 'nervous':
      case 'defensive':
      case 'evasive':
      case 'tense':
        return <AlertTriangle size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-noir-darkest flex flex-col">
      {/* Header */}
      <div className="bg-noir-darker border-b border-gray-800 py-4 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <h1 className="text-2xl font-noir text-noir-accent">
            {t('interrogation.title')} <span className="text-gray-100">{suspectName}</span>
          </h1>

          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
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
              {t('interrogation.title')} {suspectName}
            </p>
            <p className="text-gray-500 mt-2">
              Ställ din första fråga...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-noir-accent'
                      : 'bg-noir-dark border border-gray-700'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User size={24} className="text-noir-darkest" />
                  ) : (
                    <Bot size={24} className="text-gray-400" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`flex-1 max-w-2xl ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block px-6 py-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-noir-accent text-noir-darkest'
                        : 'bg-noir-dark border border-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Emotional Tone Indicator */}
                  {message.emotionalTone && message.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className={`flex items-center gap-1 ${getEmotionalToneColor(message.emotionalTone)}`}>
                        {getEmotionalToneIcon(message.emotionalTone)}
                        {t(`interrogation.emotionalTones.${message.emotionalTone}`) || message.emotionalTone}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
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
              placeholder={t('interrogation.askQuestion')}
              className="input-noir flex-1 text-lg"
              disabled={sending}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className="btn-primary flex items-center gap-2 px-8"
            >
              <Send size={20} />
              {t('interrogation.send')}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InterrogationPage;
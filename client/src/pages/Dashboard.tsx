import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { caseAPI } from '../services/api';
import { Case } from '../types';
import {
  Eye,
  Plus,
  Trophy,
  FolderOpen,
  Target,
  LogOut,
  Languages,
  Skull,
  Briefcase,
  Home,
  Heart
} from 'lucide-react';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isGuest, logout } = useAuth();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [creatingCase, setCreatingCase] = useState(false);

  const categories = [
    { key: 'Mord', icon: Skull, color: 'text-noir-blood' },
    { key: 'Bankrån', icon: Briefcase, color: 'text-noir-amber' },
    { key: 'Inbrott', icon: Home, color: 'text-gray-400' },
    { key: 'Otrohet', icon: Heart, color: 'text-pink-400' },
  ];

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await caseAPI.getMyCases();
      setCases(data);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!selectedCategory) return;

    setCreatingCase(true);
    try {
      const newCase = await caseAPI.createCase(selectedCategory);
      navigate(`/case/${newCase.id}`);
    } catch (error) {
      console.error('Failed to create case:', error);
    } finally {
      setCreatingCase(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sv' ? 'en' : 'sv';
    i18n.changeLanguage(newLang);
  };

  const activeCases = cases.filter(c => !c.isCompleted);
  const solvedCases = cases.filter(c => c.isCompleted && c.isSolved);
  const totalPoints = isGuest ? 0 : (user?.points || 0);

  return (
    <div className="min-h-screen bg-noir-darkest">
      {/* Header */}
      <header className="bg-noir-darker border-b border-gray-800 sticky top-0 z-40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Eye className="text-noir-accent" size={32} />
            <h1 className="text-2xl font-noir text-noir-accent">Console Detective</h1>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            {/* Language */}
            <button
              onClick={toggleLanguage}
              className="btn-ghost flex items-center gap-2"
            >
              <Languages size={18} />
              {i18n.language === 'sv' ? '🇸🇪' : '🇬🇧'}
            </button>

            {/* User/Guest Badge */}
            {isGuest ? (
              <div className="px-4 py-2 bg-noir-dark border border-gray-700 rounded text-gray-400">
                🎭 {t('dashboard.guestWelcome')}
              </div>
            ) : (
              <div className="px-4 py-2 bg-noir-dark border border-noir-accent/50 rounded text-noir-accent">
                {user?.username || 'Detective'}
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="btn-ghost flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <LogOut size={18} />
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h2 className="text-5xl font-noir text-gray-100 mb-4">
            {isGuest ? t('dashboard.guestWelcome') : t('dashboard.welcome')}
          </h2>
          <p className="text-xl text-gray-400 font-detective">
            {i18n.language === 'sv'
              ? 'Mörkret väntar. Vilken sanning kommer du avslöja idag?'
              : 'Darkness awaits. What truth will you reveal today?'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-noir p-6 flex items-center gap-4"
          >
            <Trophy className="text-noir-accent" size={40} />
            <div>
              <p className="text-gray-400 text-sm">{t('dashboard.points')}</p>
              <p className="text-3xl font-noir text-gray-100">{totalPoints}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-noir p-6 flex items-center gap-4"
          >
            <Target className="text-green-400" size={40} />
            <div>
              <p className="text-gray-400 text-sm">{t('dashboard.solved')}</p>
              <p className="text-3xl font-noir text-gray-100">{solvedCases.length}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-noir p-6 flex items-center gap-4"
          >
            <FolderOpen className="text-blue-400" size={40} />
            <div>
              <p className="text-gray-400 text-sm">{t('dashboard.active')}</p>
              <p className="text-3xl font-noir text-gray-100">{activeCases.length}</p>
            </div>
          </motion.div>
        </div>

        {/* Create New Case Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNewCaseModal(true)}
            className="btn-primary flex items-center gap-2 mx-auto text-lg"
          >
            <Plus size={24} />
            {t('dashboard.createCase')}
          </motion.button>
        </motion.div>

        {/* Cases Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-noir-accent mx-auto mb-4"></div>
            {t('common.loading')}
          </div>
        ) : cases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <FolderOpen className="text-gray-600 mx-auto mb-4" size={64} />
            <p className="text-gray-400 text-lg">{t('dashboard.noCases')}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ y: -5 }}
                onClick={() => navigate(`/case/${caseItem.id}`)}
                className="card-noir p-6 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-noir text-gray-100 group-hover:text-noir-accent transition-colors">
                    {caseItem.title}
                  </h3>
                  {caseItem.isCompleted && (
                    <span className={`px-2 py-1 text-xs ${caseItem.isSolved ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'} rounded`}>
                      {caseItem.isSolved ? '✓' : '✗'}
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{caseItem.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-noir-accent">{caseItem.category}</span>
                  <span className="text-gray-500">{caseItem.location}</span>
                </div>

                {!caseItem.isCompleted && (
                  <button className="btn-secondary w-full mt-4">
                    {t('dashboard.continueCase')} →
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-noir p-8 max-w-2xl w-full"
          >
            <h2 className="text-3xl font-noir text-noir-accent mb-6 text-center">
              {t('case.newCase')}
            </h2>
            <p className="text-gray-400 text-center mb-8">{t('case.selectCategory')}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {categories.map(({ key, icon: Icon, color }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(key)}
                  className={`p-6 border-2 rounded transition-all ${
                    selectedCategory === key
                      ? 'border-noir-accent bg-noir-accent/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <Icon className={`mx-auto mb-3 ${color}`} size={40} />
                  <p className="text-gray-100 font-noir text-lg">{key}</p>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="btn-ghost flex-1"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateCase}
                disabled={!selectedCategory || creatingCase}
                className="btn-primary flex-1"
              >
                {creatingCase ? t('case.generating') : t('common.confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

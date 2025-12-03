import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, Mail, Lock, User, AlertCircle, Languages } from 'lucide-react';

const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sv' ? 'en' : 'sv';
    i18n.changeLanguage(newLang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(i18n.language === 'sv' ? 'Lösenorden matchar inte' : 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError(i18n.language === 'sv' ? 'Lösenordet måste vara minst 6 tecken' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-noir-darkest flex items-center justify-center px-4 relative overflow-hidden py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-noir-accent rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-noir-blood rounded-full blur-[120px]" />
      </div>

      {/* Language Switcher */}
      <button
        onClick={toggleLanguage}
        className="absolute top-8 right-8 btn-ghost flex items-center gap-2"
      >
        <Languages size={18} />
        {i18n.language === 'sv' ? '🇸🇪' : '🇬🇧'}
      </button>

      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-8 left-8 text-gray-400 hover:text-noir-accent transition-colors"
      >
        ← {t('common.back')}
      </Link>

      {/* Register Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="card-noir p-8 md:p-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Eye className="text-noir-accent" size={50} />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-noir text-center mb-2 text-noir-accent">
            {t('auth.registerTitle')}
          </h1>
          <p className="text-center text-gray-400 mb-8 font-detective">
            {i18n.language === 'sv' ? 'Bli en detektiv' : 'Become a detective'}
          </p>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-noir-blood/20 border border-noir-blood text-red-300 px-4 py-3 rounded mb-6 flex items-center gap-2"
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-gray-300 mb-2 font-detective">
                {t('auth.username')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-noir w-full pl-12"
                  placeholder="detective_noir"
                  required
                  minLength={3}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-300 mb-2 font-detective">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-noir w-full pl-12"
                  placeholder="detective@noir.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-300 mb-2 font-detective">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-noir w-full pl-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-gray-300 mb-2 font-detective">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-noir w-full pl-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg mt-6"
            >
              {loading ? t('common.loading') : t('auth.registerButton')}
            </motion.button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-400">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-noir-accent hover:underline">
                {t('auth.loginButton')}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;

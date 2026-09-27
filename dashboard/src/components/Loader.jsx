import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const Loader = ({ message }) => {
  const { lang } = useLanguage();
  const defaultMessage = lang === 'HI' ? 'लोड हो रहा है...' : 'Loading...';

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="flex space-x-2 mb-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
      <p className="text-gray-600 text-sm">{message || defaultMessage}</p>
    </div>
  );
};

export default Loader;
import React from 'react';
import { LanguageContext } from '../context/LanguageContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <LanguageContext.Consumer>
          {(langCtx) => {
            const lang = langCtx?.lang || localStorage.getItem('stms_lang') || 'EN';
            return (
              <div className="error-boundary">
                <h2>{lang === 'HI' ? 'कुछ गलत हो गया।' : 'Something went wrong.'}</h2>
                <button onClick={() => window.location.reload()}>
                  {lang === 'HI' ? 'एप्लिकेशन पुनः लोड करें' : 'Reload Application'}
                </button>
              </div>
            );
          }}
        </LanguageContext.Consumer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
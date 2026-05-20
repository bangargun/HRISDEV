import { useState } from 'react';
import Login from './Login';
import Register from './Register';
import AuthChoice from './AuthChoice';

type AuthView = 'choice' | 'login' | 'register';

export default function AuthGate() {
  const [view, setView] = useState<AuthView>('choice');

  if (view === 'login') {
    return <Login />;
  }

  if (view === 'register') {
    return <Register onBackToChoice={() => setView('choice')} />;
  }

  return (
    <AuthChoice
      onSelectLogin={() => setView('login')}
      onSelectRegister={() => setView('register')}
    />
  );
}

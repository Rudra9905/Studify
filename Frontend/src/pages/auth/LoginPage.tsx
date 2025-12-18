import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      login(res.user, res.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Sign in</h2>
      <p className="mb-6 text-sm text-slate-500">
        Enter your email and password to access your classes.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" /> Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
          Create an account
        </Link>
      </p>
    </div>
  );
};

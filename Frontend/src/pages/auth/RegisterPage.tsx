import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import type { UserRole } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({ name, email, password, role });
      login(res.user, res.token);
      toast.success('Account created');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Create account</h2>
      <p className="mb-6 text-sm text-slate-500">
        Join Studify as a teacher or student.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Role</label>
          <select
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="TEACHER">Teacher</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" /> Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </div>
  );
};

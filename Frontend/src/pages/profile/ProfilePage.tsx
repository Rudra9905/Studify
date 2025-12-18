import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { userApi } from '../../services/userApi';
import { fileApi } from '../../services/fileApi';

type FormState = {
  name: string;
  phoneNumber: string;
  dateOfBirth: string;
  profileImageUrl: string;
};

export const ProfilePage: React.FC = () => {
  const { user, login, token } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: user?.name ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
    profileImageUrl: user?.profileImageUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load profile data only once when component mounts or user ID changes
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const syncProfile = async () => {
      setLoadingProfile(true);
      try {
        const fresh = await userApi.getById(user.id);
        if (!cancelled) {
          setForm({
            name: fresh.name ?? '',
            phoneNumber: fresh.phoneNumber ?? '',
            dateOfBirth: fresh.dateOfBirth ?? '',
            profileImageUrl: fresh.profileImageUrl ?? '',
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error('Unable to load profile details.');
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    syncProfile();
    
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // Only depend on user ID, not the entire user object

  if (!user) return null;

  const handleChange =
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (PNG, JPG, JPEG, GIF, or WEBP)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await fileApi.upload(file);
      setForm((prev) => ({ ...prev, profileImageUrl: url }));
      toast.success('Photo updated');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
      // reset input so the same file can be reselected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber?.trim() || undefined,
        dateOfBirth: form.dateOfBirth?.trim() && form.dateOfBirth.trim() !== '' 
          ? form.dateOfBirth.trim() 
          : undefined,
        profileImageUrl: form.profileImageUrl?.trim() || undefined,
      };
      const updated = await userApi.updateProfile(user.id, payload);
      setForm({
        name: updated.name ?? '',
        phoneNumber: updated.phoneNumber ?? '',
        dateOfBirth: updated.dateOfBirth ?? '',
        profileImageUrl: updated.profileImageUrl ?? '',
      });
      login(updated, token ?? '');
      toast.success('Profile updated');
    } catch (err) {
      console.error(err);
      toast.error('Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Keep your contact details and photo up to date.
        </p>
      </div>

      <Card className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-3 md:w-56">
          <Avatar name={form.name || user.name} imageUrl={form.profileImageUrl} size="lg" />
          <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto || loadingProfile}
            >
              {uploadingPhoto ? 'Uploading...' : 'Change photo'}
            </Button>
            {form.profileImageUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setForm((prev) => ({ ...prev, profileImageUrl: '' }))}
                disabled={uploadingPhoto || saving}
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        <form className="flex-1 space-y-4" onSubmit={handleSave}>
          <Input
            label="Full name"
            value={form.name}
            onChange={handleChange('name')}
            required
          />
          <Input label="Email" value={user.email} disabled />
          <Input
            label="Phone number"
            value={form.phoneNumber}
            onChange={handleChange('phoneNumber')}
            placeholder="e.g. +1 555 123 4567"
          />
          <Input
            type="date"
            label="Date of birth"
            value={form.dateOfBirth ?? ''}
            onChange={handleChange('dateOfBirth')}
          />

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={saving || loadingProfile || uploadingPhoto}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

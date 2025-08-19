import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Eye, 
  EyeOff,
  Save,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
  Camera,
  Settings,
  Bell,
  Lock
} from 'lucide-react';
import { Button, Input, Card } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors }
  } = useForm();

  const newPassword = watch('newPassword');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.users.getProfile();
      setProfile(data.data);
      reset(data.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setError('');
      setSuccess('');

      const result = await apiService.users.updateProfile(data);
      setProfile(result.data);
      setIsEditing(false);
      setSuccess('Profile updated successfully');
      updateUser(result.data);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.error || error.message || 'Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      setError('');
      setSuccess('');

      await apiService.users.changePassword(data);
      setShowPasswordForm(false);
      resetPassword();
      setSuccess('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.response?.data?.error || error.message || 'Failed to change password');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.subtitle}>
            Manage your account information and settings
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className={styles.errorContainer}>
          <AlertCircle className={styles.errorIcon} />
          <span className={styles.errorText}>{error}</span>
        </div>
      )}

      {success && (
        <div className={styles.successContainer}>
          <CheckCircle className={styles.successIcon} />
          <span className={styles.successText}>{success}</span>
        </div>
      )}

      <div className={styles.profileGrid}>
        {/* Profile Information */}
        <Card className={styles.profileCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <User className={styles.cardIcon} />
              <h3>Personal Information</h3>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="small"
                onClick={() => setIsEditing(true)}
              >
                <Edit className={styles.icon} />
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>First Name</label>
                  <Input
                    type="text"
                    placeholder="Enter first name"
                    {...register('firstName', {
                      required: 'First name is required',
                      minLength: { value: 2, message: 'First name must be at least 2 characters' }
                    })}
                    error={errors.firstName?.message}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Last Name</label>
                  <Input
                    type="text"
                    placeholder="Enter last name"
                    {...register('lastName', {
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'Last name must be at least 2 characters' }
                    })}
                    error={errors.lastName?.message}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Email</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  error={errors.email?.message}
                />
              </div>
              
              <div className={styles.formActions}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    reset(profile);
                  }}
                >
                  <X className={styles.icon} />
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  <Save className={styles.icon} />
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className={styles.profileInfo}>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <User className={styles.infoIcon} />
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Full Name</span>
                    <span className={styles.infoValue}>
                      {profile?.firstName} {profile?.lastName}
                    </span>
                  </div>
                </div>
                
                <div className={styles.infoItem}>
                  <Mail className={styles.infoIcon} />
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{profile?.email}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <Shield className={styles.infoIcon} />
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Role</span>
                    <span className={styles.infoValue}>
                      {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className={styles.infoItem}>
                  <Calendar className={styles.infoIcon} />
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Member Since</span>
                    <span className={styles.infoValue}>
                      {formatDate(profile?.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              {profile?.lastLoginAt && (
                <div className={styles.infoRow}>
                  <div className={styles.infoItem}>
                    <Calendar className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.infoLabel}>Last Login</span>
                      <span className={styles.infoValue}>
                        {formatDate(profile?.lastLoginAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Security Settings */}
        <Card className={styles.securityCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Lock className={styles.cardIcon} />
              <h3>Security</h3>
            </div>
          </div>
          
          <div className={styles.securityActions}>
            <div className={styles.securityItem}>
              <div className={styles.securityInfo}>
                <h4>Password</h4>
                <p>Change your account password</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </Button>
            </div>
            
            <div className={styles.securityItem}>
              <div className={styles.securityInfo}>
                <h4>Two-Factor Authentication</h4>
                <p>Add an extra layer of security</p>
              </div>
              <Button
                variant="outline"
                disabled
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Settings className={styles.cardIcon} />
              <h3>Account Settings</h3>
            </div>
          </div>
          
          <div className={styles.settingsList}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h4>Email Notifications</h4>
                <p>Manage your email preferences</p>
              </div>
              <Button
                variant="outline"
                disabled
              >
                Coming Soon
              </Button>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h4>Privacy Settings</h4>
                <p>Control your privacy preferences</p>
              </div>
              <Button
                variant="outline"
                disabled
              >
                Coming Soon
              </Button>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h4>Account Deletion</h4>
                <p>Permanently delete your account</p>
              </div>
              <Button
                variant="outline"
                disabled
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Password Change Modal */}
      {showPasswordForm && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordForm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Change Password</h3>
              <Button
                variant="ghost"
                onClick={() => setShowPasswordForm(false)}
              >
                ×
              </Button>
            </div>
            
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className={styles.passwordForm}>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <div className={styles.passwordContainer}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    {...registerPassword('currentPassword', {
                      required: 'Current password is required'
                    })}
                    error={passwordErrors.currentPassword?.message}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className={styles.toggleIcon} /> : <Eye className={styles.toggleIcon} />}
                  </button>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>New Password</label>
                <div className={styles.passwordContainer}>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    {...registerPassword('newPassword', {
                      required: 'New password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                      }
                    })}
                    error={passwordErrors.newPassword?.message}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className={styles.toggleIcon} /> : <Eye className={styles.toggleIcon} />}
                  </button>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  {...registerPassword('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === newPassword || 'Passwords do not match'
                  })}
                  error={passwordErrors.confirmPassword?.message}
                />
              </div>
              
              <div className={styles.formActions}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    resetPassword();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Change Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage; 
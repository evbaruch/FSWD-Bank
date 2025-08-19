import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { Button, Input, Card } from "../../components/common";
import styles from "./RegisterPage.module.css";

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [],
  });

  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm({
    mode: "onChange",
  });

  const watchedPassword = watch("password", "");
  const watchedConfirmPassword = watch("confirmPassword", "");

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("At least 8 characters");
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one lowercase letter");
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one uppercase letter");
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one number");
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one special character");
    }

    return { score, feedback };
  };

  // Update password strength when password changes
  React.useEffect(() => {
    if (watchedPassword) {
      setPasswordStrength(checkPasswordStrength(watchedPassword));
    }
  }, [watchedPassword]);

  // Check if passwords match
  React.useEffect(() => {
    if (watchedConfirmPassword && watchedPassword !== watchedConfirmPassword) {
      setError("confirmPassword", {
        type: "manual",
        message: "Passwords do not match",
      });
    } else if (
      watchedConfirmPassword &&
      watchedPassword === watchedConfirmPassword
    ) {
      clearErrors("confirmPassword");
    }
  }, [watchedPassword, watchedConfirmPassword, setError, clearErrors]);

  const getPasswordStrengthColor = (score) => {
    if (score <= 2) return "danger";
    if (score <= 3) return "warning";
    if (score <= 4) return "info";
    return "success";
  };

  const getPasswordStrengthText = (score) => {
    if (score <= 2) return "Weak";
    if (score <= 3) return "Fair";
    if (score <= 4) return "Good";
    return "Strong";
  };

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      console.log("[REGISTER] Submitting registration data:", data);
      const result = await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: "customer", // Default role for new registrations
      });

      console.log("[REGISTER] Registration result:", result);
      if (result.success) {
        // Registration creates a pending account; direct user to login
        navigate("/login");
      }
    } catch (error) {
      console.error("[REGISTER] Registration error:", error);
      console.error("[REGISTER] Error response:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);

    try {
      const response = await authService.getGoogleAuthUrl();
      if (response.data.success) {
        // Redirect to Google OAuth
        window.location.href = response.data.data.url;
      } else {
        console.error("Failed to get Google OAuth URL");
      }
    } catch (error) {
      console.error("Google OAuth error:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <img
              src="/shield.png"
              alt="FSWD Bank Logo"
              className={styles.logoImg}
            />
          </div>
          <h1 className={styles.brandName}>FSWD Bank</h1>
          <h2 className={styles.title}>Create Your Account</h2>
          <p className={styles.subtitle}>
            Join thousands of customers who trust FSWD Bank with their financial
            future.
          </p>
        </div>

        <Card className={styles.formCard}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.nameRow}>
              <div className={styles.nameField}>
                <Input
                  label="First Name"
                  type="text"
                  placeholder="Enter your first name"
                  error={errors.firstName?.message}
                  {...register("firstName", {
                    required: "First name is required",
                    minLength: {
                      value: 2,
                      message: "First name must be at least 2 characters",
                    },
                    pattern: {
                      value: /^[a-zA-Z\s]+$/,
                      message: "First name can only contain letters",
                    },
                  })}
                />
              </div>
              <div className={styles.nameField}>
                <Input
                  label="Last Name"
                  type="text"
                  placeholder="Enter your last name"
                  error={errors.lastName?.message}
                  {...register("lastName", {
                    required: "Last name is required",
                    minLength: {
                      value: 2,
                      message: "Last name must be at least 2 characters",
                    },
                    pattern: {
                      value: /^[a-zA-Z\s]+$/,
                      message: "Last name can only contain letters",
                    },
                  })}
                />
              </div>
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email address"
              error={errors.email?.message}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Please enter a valid email address",
                },
              })}
            />

            <div className={styles.passwordField}>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                error={errors.password?.message}
                icon={
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                  validate: (value) => {
                    const strength = checkPasswordStrength(value);
                    if (strength.score < 3) {
                      return "Password is too weak. Please choose a stronger password.";
                    }
                    return true;
                  },
                })}
              />

              {watchedPassword && (
                <div className={styles.passwordStrength}>
                  <div className={styles.strengthHeader}>
                    <span className={styles.strengthLabel}>
                      Password Strength:
                    </span>
                    <span
                      className={`${styles.strengthText} ${styles[getPasswordStrengthColor(passwordStrength.score)]}`}
                    >
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  <div className={styles.strengthBar}>
                    <div
                      className={`${styles.strengthFill} ${styles[getPasswordStrengthColor(passwordStrength.score)]}`}
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                      }}
                    />
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className={styles.strengthFeedback}>
                      {passwordStrength.feedback.map((item, index) => (
                        <div key={index} className={styles.feedbackItem}>
                          <AlertCircle size={14} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              error={errors.confirmPassword?.message}
              icon={
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              }
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => {
                  if (value !== watchedPassword) {
                    return "Passwords do not match";
                  }
                  return true;
                },
              })}
            />

            <div className={styles.termsSection}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  {...register("terms", {
                    required: "You must accept the terms and conditions",
                  })}
                />
                <span className={styles.checkboxText}>
                  I agree to the{" "}
                  <Link to="/terms" className={styles.termsLink}>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className={styles.termsLink}>
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <p className={styles.errorText}>{errors.terms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          <div className={styles.socialSection}>
            <Button
              variant="outline"
              size="large"
              className={styles.socialButton}
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <div className={styles.googleSpinner}></div>
              ) : (
                <svg className={styles.googleIcon} viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {isGoogleLoading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </Button>
          </div>
        </Card>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account?{" "}
            <Link to="/login" className={styles.footerLink}>
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

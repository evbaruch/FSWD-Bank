import React, { forwardRef } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const inputClasses = [
    styles.input,
    error && styles.error,
    fullWidth && styles.fullWidth,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <input
        ref={ref} // Pass the ref to the real HTML input
        className={inputClasses}
        {...props}
      />
      {(error || helperText) && (
        <div className={`${styles.helperText} ${error ? styles.error : ''}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

export default Input;

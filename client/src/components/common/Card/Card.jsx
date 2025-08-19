import React from 'react';
import styles from './Card.module.css';

const Card = ({
  children,
  header,
  footer,
  padding = 'normal',
  className = '',
  ...props
}) => {
  const cardClasses = [
    styles.card,
    styles[padding],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {header && (
        <div className={styles.header}>
          {header}
        </div>
      )}
      <div className={styles.body}>
        {children}
      </div>
      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Lock, 
  Globe,
  ArrowRight,
  CheckCircle,
  Star,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { Button } from '../components/common';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  const features = [
    {
      icon: Shield,
      title: 'Secure Banking',
      description: 'Bank-level security with encryption and fraud protection'
    },
    {
      icon: CreditCard,
      title: 'Multiple Accounts',
      description: 'Manage checking, savings, and business accounts in one place'
    },
    {
      icon: TrendingUp,
      title: 'Smart Investments',
      description: 'Grow your wealth with our investment and loan services'
    },
    {
      icon: Users,
      title: '24/7 Support',
      description: 'Round-the-clock customer support and financial guidance'
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'Your data is protected with industry-leading privacy measures'
    },
    {
      icon: Globe,
      title: 'Global Access',
      description: 'Access your accounts from anywhere in the world'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Small Business Owner',
      content: 'FSWD Bank has transformed how I manage my business finances. The interface is intuitive and the support team is incredibly helpful.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Software Engineer',
      content: 'I love the real-time notifications and the ability to track all my transactions. It\'s made budgeting so much easier.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Freelance Designer',
      content: 'The loan application process was smooth and transparent. I got approved quickly and the rates are competitive.',
      rating: 5
    }
  ];

  const stats = [
    { number: '50K+', label: 'Happy Customers' },
    { number: '$2B+', label: 'Assets Managed' },
    { number: '99.9%', label: 'Uptime' },
    { number: '24/7', label: 'Support' }
  ];

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.navigation}>
        <div className={styles.navContainer}>
          <div className={styles.navContent}>
            <div className={styles.logoContainer}>
              <img src="/shield.png" alt="FSWD Bank Logo" className={styles.logoImg} />
              <span className={styles.brandName}>FSWD Bank</span>
            </div>
            
            <div className={styles.navLinks}>
              <a href="#features" className={styles.navLink}>Features</a>
              <a href="#about" className={styles.navLink}>About</a>
              <a href="#contact" className={styles.navLink}>Contact</a>
            </div>
            
            <div className={styles.navActions}>
              <Link to="/login" className={styles.signInLink}>
                Sign In
              </Link>
              <Link to="/register">
                <Button variant="primary">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                Your Trusted
                <span className={styles.heroHighlight}>Financial Partner</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Experience modern banking with FSWD Bank. Secure, fast, and designed for your financial success. 
                Join thousands of satisfied customers who trust us with their money.
              </p>
              <div className={styles.heroButtons}>
                <Link to="/register">
                  <Button variant="secondary" size="large" className={styles.primaryButton}>
                    Open Account
                    <ArrowRight className={styles.buttonIcon} />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="large" className={styles.secondaryButton}>
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className={styles.heroCard}>
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardBrand}>FSWD Bank</span>
                  <div className={styles.cardChip}></div>
                </div>
                <div className={styles.cardNumber}>**** **** **** 1234</div>
                <div className={styles.cardFooter}>
                  <div>
                    <div className={styles.cardLabel}>Card Holder</div>
                    <div className={styles.cardValue}>JOHN DOE</div>
                  </div>
                  <div>
                    <div className={styles.cardLabel}>Expires</div>
                    <div className={styles.cardValue}>12/25</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsContainer}>
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statItem}>
                <div className={styles.statNumber}>
                  {stat.number}
                </div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Why Choose FSWD Bank?
            </h2>
            <p className={styles.sectionSubtitle}>
              We combine cutting-edge technology with traditional banking values to provide you with the best financial experience.
            </p>
          </div>
          
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  {React.createElement(feature.icon, { className: styles.icon })}
                </div>
                <h3 className={styles.featureTitle}>
                  {feature.title}
                </h3>
                <p className={styles.featureDescription}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={styles.testimonialsSection}>
        <div className={styles.testimonialsContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              What Our Customers Say
            </h2>
            <p className={styles.sectionSubtitle}>
              Don't just take our word for it. Here's what our customers have to say about their experience.
            </p>
          </div>
          
          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className={styles.testimonialCard}>
                <div className={styles.testimonialRating}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className={styles.star} />
                  ))}
                </div>
                <p className={styles.testimonialContent}>
                  "{testimonial.content}"
                </p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.authorName}>{testimonial.name}</div>
                  <div className={styles.authorRole}>{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>
              Ready to Get Started?
            </h2>
            <p className={styles.ctaSubtitle}>
              Join thousands of customers who trust FSWD Bank with their financial future.
            </p>
            <div className={styles.ctaButtons}>
              <Link to="/register">
                <Button variant="primary" size="large">
                  Open Your Account
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="large">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <div className={styles.footerLogo}>
                <img src="/shield.png" alt="FSWD Bank Logo" className={styles.logoImg} />
                <span className={styles.brandName}>FSWD Bank</span>
              </div>
              <p className={styles.footerDescription}>
                Your trusted financial partner for modern banking solutions.
              </p>
            </div>
            
            <div className={styles.footerLinks}>
              <div className={styles.footerColumn}>
                <h3 className={styles.footerTitle}>Products</h3>
                <a href="#" className={styles.footerLink}>Checking</a>
                <a href="#" className={styles.footerLink}>Savings</a>
                <a href="#" className={styles.footerLink}>Loans</a>
                <a href="#" className={styles.footerLink}>Investments</a>
              </div>
              
              <div className={styles.footerColumn}>
                <h3 className={styles.footerTitle}>Support</h3>
                <a href="#" className={styles.footerLink}>Help Center</a>
                <a href="#" className={styles.footerLink}>Contact Us</a>
                <a href="#" className={styles.footerLink}>Security</a>
                <a href="#" className={styles.footerLink}>Privacy</a>
              </div>
              
              <div className={styles.footerColumn}>
                <h3 className={styles.footerTitle}>Company</h3>
                <a href="#" className={styles.footerLink}>About</a>
                <a href="#" className={styles.footerLink}>Careers</a>
                <a href="#" className={styles.footerLink}>Press</a>
                <a href="#" className={styles.footerLink}>Blog</a>
              </div>
            </div>
          </div>
          
          <div className={styles.footerBottom}>
            <p className={styles.copyright}>
              © 2024 FSWD Bank. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 
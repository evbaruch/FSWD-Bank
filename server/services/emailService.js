const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Welcome to FSWD Bank!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to FSWD Bank!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your trusted financial partner</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for choosing FSWD Bank! We're excited to have you as part of our banking family.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>Your account is currently under review</li>
                <li>You'll receive an email once your account is approved</li>
                <li>After approval, you can log in and start banking</li>
                <li>Our team will guide you through the setup process</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any questions, please don't hesitate to contact our support team.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.CLIENT_URL}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Our Website</a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 FSWD Bank. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This email was sent to ${email}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Password Reset Request - FSWD Bank",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">FSWD Bank Security</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your FSWD Bank account.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Security Note:</strong> This link will expire in 1 hour for your security.
              </p>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 FSWD Bank. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This email was sent to ${email}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Send account approval email
const sendAccountApprovalEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Account Approved - FSWD Bank",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Account Approved!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Welcome to FSWD Bank</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Congratulations ${firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your FSWD Bank account has been approved and is now active.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">You can now:</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>Log in to your account</li>
                <li>View your account dashboard</li>
                <li>Set up your banking preferences</li>
                <li>Start using our banking services</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.CLIENT_URL}/login" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Your Account</a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 FSWD Bank. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This email was sent to ${email}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Account approval email sent to ${email}`);
  } catch (error) {
    console.error("Error sending account approval email:", error);
    throw error;
  }
};

// Send transaction notification email
const sendTransactionNotification = async (
  email,
  firstName,
  transactionData
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Transaction ${transactionData.type} - FSWD Bank`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Transaction Notification</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">FSWD Bank</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              A transaction has been processed on your account.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Transaction Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Type:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                    transactionData.type
                  }</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">$${transactionData.amount.toFixed(
                    2
                  )}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Account:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                    transactionData.accountNumber
                  }</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${new Date(
                    transactionData.date
                  ).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Reference:</strong></td>
                  <td style="padding: 8px 0;">${transactionData.reference}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${
                process.env.CLIENT_URL
              }/transactions" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Transactions</a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 FSWD Bank. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This email was sent to ${email}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Transaction notification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending transaction notification email:", error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAccountApprovalEmail,
  sendTransactionNotification,
};

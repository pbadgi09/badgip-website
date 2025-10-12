/**
 * Contact API Routes
 * Handle contact form submissions and email notifications
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const router = express.Router();

/**
 * Email configuration
 * Configure your email service here
 */
const createEmailTransporter = () => {
  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
  
  return nodemailer.createTransporter(emailConfig);
};

/**
 * Helper function to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Generate HTML email template
 */
const generateEmailTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #fff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 10px 10px;
          font-size: 14px;
          color: #6b7280;
        }
        .field {
          margin-bottom: 20px;
          padding: 15px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #6366f1;
        }
        .field-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
        }
        .field-value {
          color: #1f2937;
        }
        .message-field {
          background: #fef3c7;
          border-left-color: #f59e0b;
        }
        .timestamp {
          font-size: 12px;
          color: #9ca3af;
          text-align: right;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📧 New Contact Form Submission</h1>
        <p>You have received a new message from your portfolio website</p>
      </div>
      
      <div class="content">
        <div class="field">
          <div class="field-label">👤 Name:</div>
          <div class="field-value">${data.name}</div>
        </div>
        
        <div class="field">
          <div class="field-label">📧 Email:</div>
          <div class="field-value">${data.email}</div>
        </div>
        
        <div class="field">
          <div class="field-label">📝 Subject:</div>
          <div class="field-value">${data.subject}</div>
        </div>
        
        <div class="field message-field">
          <div class="field-label">💬 Message:</div>
          <div class="field-value">${data.message.replace(/\n/g, '<br>')}</div>
        </div>
        
        <div class="timestamp">
          Submitted on: ${new Date().toLocaleString()}
        </div>
      </div>
      
      <div class="footer">
        <p>This email was sent from the contact form on your portfolio website.</p>
        <p><strong>Reply directly to this email to respond to ${data.name}</strong></p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate auto-reply email template
 */
const generateAutoReplyTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for your message</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #fff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 10px 10px;
          font-size: 14px;
          color: #6b7280;
        }
        .social-links {
          margin: 20px 0;
        }
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          color: #6366f1;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🙏 Thank You, ${name}!</h1>
        <p>Your message has been received</p>
      </div>
      
      <div class="content">
        <p>Hi ${name},</p>
        
        <p>Thank you for reaching out! I've received your message and will get back to you as soon as possible, typically within 24-48 hours.</p>
        
        <p>In the meantime, feel free to:</p>
        <ul>
          <li>Check out my latest projects on the website</li>
          <li>Follow me on social media for updates</li>
          <li>Subscribe to my blog for tech insights</li>
        </ul>
        
        <p>I appreciate your interest and look forward to connecting with you!</p>
        
        <p>Best regards,<br>
        <strong>Pranav Badgi</strong><br>
        Full Stack Developer</p>
        
        <div class="social-links">
          <a href="#">LinkedIn</a> |
          <a href="#">GitHub</a> |
          <a href="#">YouTube</a>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an automated response. Please don't reply to this email.</p>
        <p>Visit my website: <a href="#">pranavbadgi.com</a></p>
      </div>
    </body>
    </html>
  `;
};

/**
 * @route   POST /api/contact
 * @desc    Submit contact form
 * @access  Public
 */
router.post('/', [
  body('name')
    .isLength({ min: 2, max: 100 })
    .trim()
    .escape()
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('subject')
    .isLength({ min: 5, max: 200 })
    .trim()
    .escape()
    .withMessage('Subject must be between 5 and 200 characters'),
  
  body('message')
    .isLength({ min: 10, max: 2000 })
    .trim()
    .escape()
    .withMessage('Message must be between 10 and 2000 characters')
    
], handleValidationErrors, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Create email transporter
    const transporter = createEmailTransporter();
    
    // Prepare email data
    const emailData = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim()
    };
    
    // Email to admin (you)
    const adminMailOptions = {
      from: {
        name: 'Portfolio Contact Form',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      replyTo: {
        name: emailData.name,
        address: emailData.email
      },
      subject: `Portfolio Contact: ${emailData.subject}`,
      html: generateEmailTemplate(emailData),
      text: `
        New contact form submission:
        
        Name: ${emailData.name}
        Email: ${emailData.email}
        Subject: ${emailData.subject}
        
        Message:
        ${emailData.message}
        
        Submitted on: ${new Date().toLocaleString()}
      `
    };
    
    // Auto-reply email to sender
    const autoReplyOptions = {
      from: {
        name: 'Pranav Badgi',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: {
        name: emailData.name,
        address: emailData.email
      },
      subject: 'Thank you for your message - Pranav Badgi',
      html: generateAutoReplyTemplate(emailData.name),
      text: `
        Hi ${emailData.name},
        
        Thank you for reaching out! I've received your message and will get back to you as soon as possible, typically within 24-48 hours.
        
        I appreciate your interest and look forward to connecting with you!
        
        Best regards,
        Pranav Badgi
        Full Stack Developer
        
        This is an automated response. Please don't reply to this email.
      `
    };
    
    // Send emails
    const emailPromises = [
      transporter.sendMail(adminMailOptions)
    ];
    
    // Only send auto-reply if enabled
    if (process.env.SEND_AUTO_REPLY !== 'false') {
      emailPromises.push(transporter.sendMail(autoReplyOptions));
    }
    
    await Promise.all(emailPromises);
    
    // Log the contact submission (you might want to store this in database)
    console.log(`📧 Contact form submission from ${emailData.name} (${emailData.email})`);
    
    res.json({
      success: true,
      message: 'Message sent successfully! I\'ll get back to you soon.',
      data: {
        timestamp: new Date().toISOString(),
        name: emailData.name
      }
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    
    // Handle specific email errors
    if (error.code === 'EAUTH') {
      console.error('Email authentication failed. Check your email credentials.');
    } else if (error.code === 'ECONNECTION') {
      console.error('Failed to connect to email server. Check your email configuration.');
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later or contact me directly.',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : undefined
    });
  }
});

/**
 * @route   GET /api/contact/test
 * @desc    Test email configuration (Development only)
 * @access  Private (Admin only)
 */
router.get('/test', async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  }
  
  try {
    const transporter = createEmailTransporter();
    
    // Verify email configuration
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Email configuration is valid',
      config: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER ? '***' : 'Not set',
        from: process.env.EMAIL_FROM || 'Not set',
        to: process.env.EMAIL_TO || 'Not set'
      }
    });
    
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Email configuration test failed',
      error: {
        message: error.message,
        code: error.code
      }
    });
  }
});

module.exports = router;
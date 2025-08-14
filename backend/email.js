require('dotenv').config();
const nodemailer = require('nodemailer');
const logger = require('./logger');
const { sendNtfy } = require('./notifications');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  // Port 587 should use STARTTLS (secure: false + requireTLS)
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"FixMy.Site Support" <${process.env.EMAIL_FROM || 'help@fixmy.site'}>`,
      // Use the authenticated account for the SMTP envelope sender
      envelope: {
        from: process.env.EMAIL_USER,
        to,
      },
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}`);
    try {
      const alertAddresses = ['william@fixmy.site', 'help@fixmy.site'];
      const recipients = String(to).toLowerCase();
      if (typeof sendNtfy === 'function' && alertAddresses.some(addr => recipients.includes(addr))) {
        const title = 'Email Sent';
        const msg = `To: ${to}\nSubject: ${subject}`;
        sendNtfy(msg, { title, tags: ['email'], priority: 3 });
      }
    } catch (_) {}
  } catch (error) {
    logger.error('Error sending email:', error);
  }
};

module.exports = {
  sendEmail,
};

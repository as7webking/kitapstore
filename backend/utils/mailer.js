const nodemailer = require("nodemailer");

// Support account notifications and the existing contact-form call signature.
async function sendEmail(recipient, subject, text, options = {}) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email transport is not configured");
  }
  const contact = typeof recipient === "object" ? recipient : null;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 465),
    secure: Number(process.env.EMAIL_PORT || 465) === 465,
    requireTLS: Number(process.env.EMAIL_PORT || 465) !== 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
    transactionLog: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: contact ? process.env.EMAIL_TO : recipient,
    replyTo: contact?.email,
    subject: contact ? "New contact form message" : subject,
    messageId: contact ? undefined : options.messageId,
    text: contact ? `Name: ${contact.name}\nEmail: ${contact.email}\n\n${contact.message}` : text,
  });
}

module.exports = sendEmail;

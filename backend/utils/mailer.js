const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "mail.ahmedsultanline.com", // ⚠️ важно!
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ name, email, message }) => {
  await transporter.sendMail({
    from: `"KitapStore" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: "New contact form message",
    html: `
      <h3>New message from website</h3>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Message:</b><br/>${message}</p>
    `,
  });
};

module.exports = sendEmail;

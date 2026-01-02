// lib/sendMail.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function sendMail({ subject, text }) {
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
    subject,
    text
  });
};
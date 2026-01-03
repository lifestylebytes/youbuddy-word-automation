// lib/sendMail.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function sendMail({ subject, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.log("📭 RESEND_API_KEY 없음 → 메일 스킵");
    return;
  }

  await resend.emails.send({
    from: "YouBuddy <onboarding@resend.dev>", // 테스트용
    to: process.env.MAIL_TO || process.env.MAIL_FROM,
    subject,
    text
  });

  console.log("📩 메일 발송 완료");
};
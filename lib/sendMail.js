const { Resend } = require("resend");

module.exports = async function sendMail({ subject, text }) {
  console.log("📧 sendMail ENV CHECK:", {
    hasKey: !!process.env.RESEND_API_KEY,
    to: process.env.MAIL_TO,
    from: process.env.MAIL_FROM,
  });

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY missing");
  }

  if (!process.env.MAIL_TO && !process.env.MAIL_FROM) {
    throw new Error("MAIL_TO / MAIL_FROM missing");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: "YouBuddy <onboarding@resend.dev>",
      to: process.env.MAIL_TO || process.env.MAIL_FROM,
      subject,
      text,
    });

    console.log("📩 메일 발송 성공:", result);
  } catch (err) {
    console.error("❌ Resend 메일 실패:", err);
    throw err; // 🔥 이게 핵심
  }
};

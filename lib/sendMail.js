const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

module.exports = async function sendMail(subject, html) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Youbuddy Bot <onboarding@resend.dev>",
      to: [process.env.MAIL_TO],
      subject,
      html
    })
  });
};
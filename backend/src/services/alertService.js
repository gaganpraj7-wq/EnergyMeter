const nodemailer = require("nodemailer");

exports.sendAlert = async (current) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "your@gmail.com",
      pass: "app_password"
    }
  });

  await transporter.sendMail({
    to: "receiver@gmail.com",
    subject: "Overload Alert ⚠️",
    text: `High current detected: ${current}A`
  });
};
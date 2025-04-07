import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({
  path: "../../.env",
});

const sendMail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task manager",
      link: "https://mailgen.js/",
    },
  });

  const emailText = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailBody = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "mail.taskmanager@example.com", // sender address
    to: options.email, // list of receivers
    subject: options.subject, // Subject line
    text: emailText, // plain text body
    html: emailBody, // html body
  };

  try {
    const mailInfo = await transporter.sendMail(mail);
    console.log("Mail sent", mailInfo.messageId);
  } catch (error) {
    console.error("Email failed", error);
  }
};

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to App! We're very excited to have you on board.",
      action: {
        instructions: "To get started with App, please click here:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request reset your password",
      action: {
        instructions: "To change your password click the button:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export {
  sendMail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
};

// sendMail({
//   email: user.email,
//   subject:"aaaa",
//   mailGenContent: emailVerificationMailgenContent(
//     username ,
//     ""
//   )
// });

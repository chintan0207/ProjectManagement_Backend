import Mailgen from "mailgen";
import nodemailer from "nodemailer";

import dotenv from "dotenv";
dotenv.config();

const sendMail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Project Build",
      link: "https://mailgen.js/",
    },
  });

  const emailText = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailBody = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log(process.env.EMAIL_USER);
  console.log(process.env.EMAIL_HOST); // should be smtp.gmail.com
  console.log(process.env.EMAIL_PORT); // should be 587
  console.log(options);
  const mail = {
    from: "mail.codewithcm@gmail.com", // sender address
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
      outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
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
      outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export { sendMail, emailVerificationMailgenContent, forgotPasswordMailgenContent };

// sendMail({
//   email: user.email,
//   subject:"aaaa",
//   mailGenContent: emailVerificationMailgenContent(
//     username ,
//     ""
//   )
// });

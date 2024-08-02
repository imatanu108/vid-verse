import nodemailer from 'nodemailer'

const transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: process.env.NODEMAILER_MAIL_USER,
        pass: process.env.NODEMAILER_MAIL_PASS
    }
});

const sendVerificationMail = async (email, token) => {
    const url = `http://localhost:${process.env.PORT}/verify-email?token=${token}`;
    try {
        await transport.sendMail({
            from: process.env.NODEMAILER_MAIL_SENDER,
            to: email,
            subject: 'Verify your Email',
            html: `Click <a href="${url}">here</a> to verify your email.`,
        });
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending verification email to ${email}:`, error);
    }
};

const sendForgotPasswordMail = async (email, token, username) => {
    const url = `http://localhost:${process.env.PORT}/verify-email?token=${token}&username=${username}`;
    try {
        await transport.sendMail({
            from: process.env.NODEMAILER_MAIL_SENDER,
            to: email,
            subject: `Reset your password ${username}`,
            html: `Click <a href="${url}">here</a> to reset your password.`,
        });
        console.log(`Password reset email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending password reset email to ${email}:`, error);
    }
};


export {
    sendVerificationMail,
    sendForgotPasswordMail
}
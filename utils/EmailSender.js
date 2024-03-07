const nodemailer = require('nodemailer');

class EmailSender {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'outlook',
            auth: {
                user: 'no-reply.biosetlab@outlook.com',
                pass: 'Selim12345'
            }
        });
    }

    async sendEmail(to, subject, text) {
        try {
            const mailOptions = {
                from: 'no-reply.biosetlab@outlook.com',
                to: to,
                subject: subject,
                text: text
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent: ' + info.response);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }
}

module.exports = EmailSender;

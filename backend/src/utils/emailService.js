const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter works
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email service is ready to send emails');
  }
});

const sendOTPEmail = async (email, otp, username) => {
  try {
    const mailOptions = {
      from: `"Chat App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your OTP for Chat App Verification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px;">
              <h1 style="color: white; margin: 0;">Chat App</h1>
            </div>
            
            <h2>Hello ${username}!</h2>
            
            <p>Thank you for registering with Chat App. Please use the following OTP to verify your email address:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h1 style="font-size: 42px; letter-spacing: 10px; color: #667eea; margin: 0;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>.</p>
            
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated message, please do not reply.<br>
              &copy; 2024 Chat App. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    return false;
  }
};

module.exports = { sendOTPEmail };
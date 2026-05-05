require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('📧 Testing email configuration...');
  console.log('Email user:', process.env.EMAIL_USER);
  console.log('Password length:', process.env.EMAIL_PASS?.length);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid!');
    
    // Send test email to yourself
    const info = await transporter.sendMail({
      from: `"Chat App" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: '✅ Chat App Email Working!',
      text: 'Your OTP email system is configured correctly!'
    });
    
    console.log('✅ Test email sent! Check your inbox/spam folder.');
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
}

testEmail();
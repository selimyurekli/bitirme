const User = require('../models/user');
const bcrypt = require('bcrypt');
const EmailSender = require('../utils/EmailSender');
const TokenManager = require('../utils/TokenManager');

const emailSender = new EmailSender();
const tokenManger = new TokenManager();

const login = async function(req,res,next){
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
        if(!user.verified || user.blocked){
            return res.status(400).json({ message: 'User should verify or unblock account.' });
        }

        const token = tokenManager.generateToken(user._id);
        res.cookie('token', token, { httpOnly: true });
        res.json({ message: 'Login successful', token });
        
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
      }
    }

const signup = async function(req,res,next){
    try {
        const { email, password, phone, name, surname, address } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        let user = await User.findOne({email});
        if (user) {
          return res.status(400).json({ message: 'User already exists' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000); // Generate verification code

        user = new User({email, password, name, phone, surname, address, verificationCode});
        const isSuccess = emailSender.sendEmail(email, "Verification", "Your verification code is " + verificationCode + ".")
        if(!isSuccess){
            throw new Error("Error when sending email.");
        };
    
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
      }
}

const verifyUser = async function(req, res, next) {
    try {
        const { email, verificationCode } = req.body;

        const user = await User.findOne({ email, verificationCode });
        if (!user) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        user.verified = true;
        await user.save();

        res.json({ message: 'User verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}


module.exports = {login, signup, verifyUser}
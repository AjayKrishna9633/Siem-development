import nodemailer from 'nodemailer';
import {env} from './env.js';

export const createTransporter = ()=>{
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: env.OTP_EMAIL,
            pass: env.OTP_PASSWORD
        }
    })
}
export interface IOtpGenerator{
    generateOtp():Promise<string>;
}
export interface IOtpVerifier{
    verifyOtp():Promise<boolean>;
}
export interface IEmailSender{
    sendOtpMail(email:string,otp:string):Promise<void>;
}
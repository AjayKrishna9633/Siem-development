export interface SendOtpInput {
    email: string;
    type: 'signup' | 'reset';
}

import { z } from "zod";

export const PiUserSchema = z.object({
  uid: z.string(),
  username: z.string()
});

export type PiUser = z.infer<typeof PiUserSchema>;

let piInitialized = false;

export const initPi = () => {
  if (typeof window === 'undefined' || piInitialized) return;
  const Pi = (window as any).Pi;
  if (Pi) {
    Pi.init({ version: "2.0", sandbox: true });
    piInitialized = true;
  }
};

export const loginWithPi = async (): Promise<PiUser | null> => {
  initPi();
  const Pi = (window as any).Pi;
  if (!Pi) return null;
  
  try {
    const scopes = ['username'];
    function onIncompletePaymentFound(payment: any) {
      console.log('Incomplete payment found', payment);
    }
    const authResults = await Pi.authenticate(scopes, onIncompletePaymentFound);
    const user = { uid: authResults.user.uid, username: authResults.user.username };
    localStorage.setItem('pi_user', JSON.stringify(user));
    return user;
  } catch (err) {
    console.error('Pi auth error', err);
    return null;
  }
};

export const getCurrentUser = (): PiUser | null => {
  try {
    const data = localStorage.getItem('pi_user');
    if (data) {
      return PiUserSchema.parse(JSON.parse(data));
    }
  } catch (err) {
    // ignore
  }
  return null;
};

export const logoutPi = () => {
  localStorage.removeItem('pi_user');
};

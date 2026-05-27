import { z } from "zod";

export const PiUserSchema = z.object({
  uid: z.string(),
  username: z.string(),
});

export type PiUser = z.infer<typeof PiUserSchema>;

let piInitPromise: Promise<void> | null = null;

export const initPi = (): Promise<void> => {
  if (piInitPromise) return piInitPromise;
  const Pi = (window as any).Pi;
  if (!Pi) return Promise.resolve();
  piInitPromise = Promise.resolve(Pi.init({ version: "2.0", sandbox: true }));
  return piInitPromise;
};

export const loginWithPi = async (): Promise<PiUser | null> => {
  await initPi();

  const Pi = (window as any).Pi;
  if (!Pi) return null;

  try {
    const authResult: { accessToken: string; user: { uid: string; username: string } } =
      await Pi.authenticate(["username"], (_payment: unknown) => {
      });

    const response = await fetch("/api/auth/pi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: authResult.accessToken }),
    });

    if (!response.ok) {
      const fallback: PiUser = {
        uid: authResult.user.uid,
        username: authResult.user.username,
      };
      localStorage.setItem("pi_user", JSON.stringify(fallback));
      return fallback;
    }

    const user = PiUserSchema.parse(await response.json());
    localStorage.setItem("pi_user", JSON.stringify(user));
    return user;
  } catch (err) {
    console.error("Pi auth error", err);
    return null;
  }
};

export const getCurrentUser = (): PiUser | null => {
  try {
    const data = localStorage.getItem("pi_user");
    if (data) return PiUserSchema.parse(JSON.parse(data));
  } catch {
    // ignore
  }
  return null;
};

export const logoutPi = () => {
  localStorage.removeItem("pi_user");
};

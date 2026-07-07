import logoImg from "@/assets/branding/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
  rounded?: string;
  glow?: boolean;
}

export function Logo({ size = 40, className = "", rounded = "rounded-2xl", glow = false }: LogoProps) {
  return (
    <img
      src={logoImg}
      alt="S.S.C"
      className={`${rounded} object-cover flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: glow ? "0 0 40px rgba(124,58,237,0.5)" : undefined,
      }}
    />
  );
}

export default Logo;

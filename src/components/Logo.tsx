import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: number;
  linked?: boolean;
  showText?: boolean;
}

export default function Logo({ size = 40, linked = true, showText = true }: LogoProps) {
  const logo = (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="AGNT"
        width={size}
        height={size}
        className="object-contain"
      />
      {showText && (
        <span className="font-display text-2xl text-black tracking-tight">AGNT</span>
      )}
    </div>
  );

  if (linked) {
    return (
      <Link href="/" className="hover:opacity-70 transition-opacity">
        {logo}
      </Link>
    );
  }

  return logo;
}

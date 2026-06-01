import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link className="relative block h-10 w-[150px]" href="/" aria-label="Ojaboy home">
      <Image
        src="/logo/ojaboy-logo.svg"
        alt="Ojaboy"
        fill
        priority
        className="object-contain object-left"
        sizes="150px"
      />
    </Link>
  );
}

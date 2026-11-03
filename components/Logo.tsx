import { Repeat2 } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
        <Repeat2 className="h-4.5 w-4.5" aria-hidden />
      </span>
      LendLoop
    </Link>
  );
}

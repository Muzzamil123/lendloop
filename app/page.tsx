import { CalendarRange, HandHelping, ShieldCheck } from "lucide-react";
import { HeaderAuth, HeroAuth } from "@/components/AuthActions";
import { Logo } from "@/components/Logo";
import { PublicToolList } from "@/components/PublicToolList";
import { SiteFooter } from "@/components/SiteFooter";

const STEPS = [
  { icon: HandHelping, title: "List what you own", text: "Add tools you're happy to lend to neighbours." },
  { icon: CalendarRange, title: "Request dates", text: "Ask to borrow for a date range. The owner approves." },
  { icon: ShieldCheck, title: "Get reminders", text: "Automatic notifications and return reminders." },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <HeaderAuth />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-12 sm:py-16">
          <p className="mb-3 text-sm font-medium text-teal-700">Neighbourhood tool lending</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Borrow what you need. Lend what you don&apos;t.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            LendLoop helps neighbours share drills, ladders, tents and more, with requests, approvals and
            reminders handled for you.
          </p>
          <div className="mt-8">
            <HeroAuth />
          </div>
        </section>

        <section className="grid gap-4 border-y border-stone-200 py-10 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-stone-500">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="py-12">
          <h2 className="mb-1 text-xl font-semibold tracking-tight">Available now</h2>
          <p className="mb-6 text-sm text-stone-500">Sign in to see details and request a tool.</p>
          <PublicToolList />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

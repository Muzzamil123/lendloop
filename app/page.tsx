import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { EnsureUser } from "@/components/EnsureUser";
import { PublicToolList } from "@/components/PublicToolList";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-lg font-semibold">LendLoop</span>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>

      <section className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Borrow what you need. Lend what you don&apos;t.
        </h1>
        <div className="mt-6">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-md bg-stone-900 px-4 py-2 text-white hover:bg-stone-700">
                Sign in to lend or borrow
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <EnsureUser />
          </Show>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Available tools</h2>
        <PublicToolList />
      </section>
    </main>
  );
}

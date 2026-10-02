import { WishForm } from "@/components/wish-form";

export default function NewWishPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Neuer Wunsch</h1>
      <WishForm />
    </div>
  );
}

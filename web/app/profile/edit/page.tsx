import { getProfile } from "@/lib/data";
import { ProfileForm } from "@/components/profile-form";

export default async function EditProfilePage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Profil bearbeiten</h1>
      <ProfileForm data={profile.data} body={profile.body} />
    </div>
  );
}

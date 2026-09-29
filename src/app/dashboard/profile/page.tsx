import type { Metadata } from "next";
import { CreatorProfileForm } from "@/components/creator/creator-profile-form";
import { Card, PageHeader } from "@/components/ui/misc";
import { requireCreator } from "@/lib/auth";
import { creatorFormDefaults } from "@/lib/creator-defaults";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user, profile, creator } = await requireCreator();
  return (
    <>
      <PageHeader title="Profile" description="What supporters see on your public page." />
      <Card className="p-6 sm:p-8">
        <CreatorProfileForm userId={user.id} defaults={creatorFormDefaults(profile, creator)} submitLabel="Save changes" />
      </Card>
    </>
  );
}

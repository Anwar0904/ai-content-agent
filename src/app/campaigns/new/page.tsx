import { PageHeader } from "@/components/shared/PageHeader";
import { CampaignForm } from "@/components/campaigns/CampaignForm";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        description="Set the brief and creative direction for a new content series."
        title="Create campaign"
      />

      <CampaignForm />
    </>
  );
}
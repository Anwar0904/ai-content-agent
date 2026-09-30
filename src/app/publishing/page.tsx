import { PublishingWorkspace } from "@/components/publishing/PublishingWorkspace";
import { getPublishingWorkspace } from "@/services/publishing/workspaceData";

export const dynamic = "force-dynamic";

export default async function PublishingPage() {
  return <PublishingWorkspace data={await getPublishingWorkspace()} />;
}

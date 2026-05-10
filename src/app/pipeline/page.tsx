"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ContextDrawer } from "@/components/context-drawer";
import { ListDrawerV1Content } from "@/components/list-drawer-v1";
import { ListsIndexV1 } from "@/components/lists-index-v1";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { usePipelines } from "@/lib/use-pipelines";
import { AmendListModal } from "@/components/amend-list-modal";
import { useRelationships } from "@/components/relationships-provider";
import { toast } from "sonner";

export default function PipelinePage() {
  const router = useRouter();
  const { ready } = useRequireSession();
  const { relationships } = useRelationships();
  const { activeFundId } = useFunds();
  const { pipelines, resetToMock, updatePipeline, ready: pipelinesReady } = usePipelines(activeFundId);

  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  /** Opens amend modal; drawer closes so the modal is the only focus */
  const [amendPipelineId, setAmendPipelineId] = useState<string | null>(null);

  const handlePipelineClick = (id: string) => {
    setActivePipelineId(id);
  };

  const handleDrawerClose = () => {
    setActivePipelineId(null);
  };

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const drawerOpen = activePipelineId !== null;

  const listContent = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ListsIndexV1
        pipelines={pipelines}
        relationships={relationships}
        selectedId={activePipelineId}
        onSelect={handlePipelineClick}
        onResetDemo={() => {
          resetToMock();
          setActivePipelineId(null);
          toast.success("Reset to 3 demo lists");
        }}
      />
    </div>
  );

  if (!ready || !pipelinesReady) return null;

  return (
    <>
      <AppShell
        section="pipeline"
        listContent={listContent}
        detailContent={null}
        detailVisible={false}
        contextTitle={activePipeline?.name}
        assistantChips={["Suggest filters", "Who should be added", "Tighten this list"]}
      />

      <ContextDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={activePipeline?.name ?? "List"}
        hideHeaderTitle
        drawerAriaLabel={activePipeline?.name ?? "List"}
        panelMaxWidthClassName="max-w-[min(760px,100vw)]"
        listContextDrawerLayout
        section1PaddingClassName="p-0"
        section1Content={
          activePipeline ? (
            <ListDrawerV1Content
              pipeline={activePipeline}
              relationships={relationships}
              router={router}
              onClose={handleDrawerClose}
              onOpenAmend={() => {
                setAmendPipelineId(activePipeline.id);
                handleDrawerClose();
              }}
            />
          ) : (
            <p className="px-6 py-4 text-sm text-[color:var(--tomo-mute)]">No list selected</p>
          )
        }
        hideSection2
        section3Entries={[]}
      />

      <AmendListModal
        open={amendPipelineId !== null}
        pipeline={pipelines.find((p) => p.id === amendPipelineId) ?? null}
        relationships={relationships}
        onClose={() => setAmendPipelineId(null)}
        onConfirm={(excludedIds, addedIds) => {
          if (!amendPipelineId) return;
          updatePipeline(amendPipelineId, {
            excludedRelationshipIds: excludedIds,
            addedRelationshipIds: addedIds,
          });
          toast.success("List updated");
          setAmendPipelineId(null);
        }}
      />
    </>
  );
}

"use client";

import { DrawerSection2TomoChat } from "./drawer-section-2-tomo-chat";

const PIPELINE_STAGE_SUGGESTIONS = [
  "Move to next stage",
  "Who needs follow-up?",
  "Draft batch outreach",
  "Set reminders for this stage",
];

type PipelineStageTomoChatProps = {
  pipelineId: string;
  pipelineName: string;
  stage: string;
  relationshipIds: string[];
};

/**
 * Tomo chat for a list funnel stage. Wraps DrawerSection2TomoChat with pipeline_stage selection
 * so the orchestrator receives relationshipIds for the selected stage.
 */
export function PipelineStageTomoChat({
  pipelineId,
  pipelineName,
  stage,
  relationshipIds,
}: PipelineStageTomoChatProps) {
  return (
    <DrawerSection2TomoChat
      entityKey={`${pipelineId}-${stage}`}
      suggestions={PIPELINE_STAGE_SUGGESTIONS}
      contextLabel={`${pipelineName} — ${stage}`}
      selection={{
        type: "pipeline_stage",
        pipelineId,
        stage,
        relationshipIds,
      }}
    />
  );
}

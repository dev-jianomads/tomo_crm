import { formatDailyBriefBlocksAsEmailHtml } from "@/lib/dailyBriefEmailHtml";
import { getDailyBriefBlocksForSend } from "@/lib/dailyBriefForSend";
import { sendDailyBriefEmail, type LoopsSendResult } from "@/lib/loops";

/** Builds HTML and sends the daily brief to one recipient via Loops. */
export async function sendDailyBriefToEmail(to: string): Promise<LoopsSendResult> {
  const blocks = getDailyBriefBlocksForSend();
  const html = formatDailyBriefBlocksAsEmailHtml(blocks);
  return sendDailyBriefEmail(to, html);
}

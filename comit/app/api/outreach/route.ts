import { NextResponse } from "next/server";
import { getSessionUser, isApprover, requireAdminDb, sendApprovedEmail, AMAL_EMAIL, AADIL_EMAIL } from "@/lib/outreach";
import { buildSalesDraft, salesContextFromProspect } from "@/lib/sales-engine";
import { evaluateSalesArtifact } from "@/lib/agent-evaluation";

const ORG_ID = "acda1757-1698-405a-8451-5674316ceeaf";

async function createFollowups(db:any, approval:any, sentAt:string) {
  const cadence = [
    { sequence_no: 1, label: "Mini-audit", days: 3 },
    { sequence_no: 2, label: "Proof / example", days: 7 },
    { sequence_no: 3, label: "Decision-process check", days: 12 },
    { sequence_no: 4, label: "Respectful close", days: 21 },
  ];
  const rows = cadence.map(item => ({
    organization_id: approval.organization_id || ORG_ID,
    prospect_id: approval.prospect_id,
    source_approval_id: approval.id,
    sequence_no: item.sequence_no,
    label: item.label,
    due_at: new Date(new Date(sentAt).getTime() + item.days * 86400000).toISOString(),
  }));
  const { error } = await db.from("outreach_followups").upsert(rows, { onConflict: "source_approval_id,sequence_no", ignoreDuplicates: true });
  if (error) throw error;
}

export async function POST(req: Request) {
  const user = getSessionUser(req);
  if (!user || !isApprover(user)) return NextResponse.json({ ok: false, error: "Only Amal or Aadil can approve outreach." }, { status: 403 });

  try {
    const { prospectId, action, approvalId } = await req.json();
    const db = await requireAdminDb();

    if (action === "prepare") {
      const { data: prospect, error: prospectError } = await db.from("prospects").select("*, companies(name,website,industry,location)").eq("id", prospectId).single();
      if (prospectError || !prospect) return NextResponse.json({ ok: false, error: "Prospect not found." }, { status: 404 });
      if (!prospect.email) return NextResponse.json({ ok: false, error: "This prospect has no verified public business email yet." }, { status: 400 });

      const context = salesContextFromProspect(prospect);
      const draft = buildSalesDraft(context, "initial");
      const quality = evaluateSalesArtifact(draft.body, context);

      if (draft.strategy.score.total < 55) {
        return NextResponse.json({
          ok: false,
          error: "This account needs more research before outreach.",
          score: draft.strategy.score,
          missing: draft.strategy.score.missing,
          next_action: draft.strategy.nextAction
        }, { status: 409 });
      }
      if (!quality.pass) {
        return NextResponse.json({
          ok: false,
          error: "The sales quality gate recommends revision before outreach.",
          quality,
          score: draft.strategy.score
        }, { status: 409 });
      }

      const cc = [AMAL_EMAIL, AADIL_EMAIL];
      const { data, error } = await db.from("outreach_approvals").insert({
        organization_id: prospect.organization_id,
        prospect_id: prospect.id,
        status: "pending",
        message_type: "initial",
        requested_by: user.email,
        to_email: prospect.email,
        cc_emails: cc,
        subject: draft.subject,
        body: draft.body
      }).select().single();
      if (error) throw error;

      await db.from("events").insert({
        organization_id: prospect.organization_id || ORG_ID,
        event_type: "sales.outreach.prepared",
        aggregate_type: "prospect",
        aggregate_id: prospect.id,
        payload: {
          approval_id: data.id,
          opportunity_score: draft.strategy.score.total,
          opportunity_band: draft.strategy.score.band,
          quality_score: quality.score,
          quality_grade: quality.grade,
          requested_by: user.email
        }
      });

      return NextResponse.json({ ok: true, approval: data, quality, strategy: draft.strategy });
    }

    if (action === "approve") {
      if (!approvalId) return NextResponse.json({ ok: false, error: "approvalId is required." }, { status: 400 });
      const { data: approval, error: approvalError } = await db.from("outreach_approvals").select("*").eq("id", approvalId).single();
      if (approvalError || !approval) return NextResponse.json({ ok: false, error: "Approval request not found." }, { status: 404 });
      if (approval.status !== "pending") return NextResponse.json({ ok: false, error: "This approval has already been processed." }, { status: 409 });

      const approvedAt = new Date().toISOString();
      const { error: approveError } = await db.from("outreach_approvals").update({
        status: "approved", approved_by: user.email, approved_at: approvedAt, updated_at: approvedAt
      }).eq("id", approval.id).eq("status", "pending");
      if (approveError) throw approveError;

      try {
        const sent = await sendApprovedEmail({
          to: approval.to_email,
          cc: approval.cc_emails || [AMAL_EMAIL, AADIL_EMAIL],
          subject: approval.subject,
          body: approval.body,
          threadId: approval.gmail_thread_id || null,
        });

        const sentAt = new Date().toISOString();
        const approvalUpdate = await db.from("outreach_approvals").update({
          status: "sent",
          gmail_message_id: sent.id || null,
          gmail_thread_id: sent.threadId || approval.gmail_thread_id || null,
          updated_at: sentAt
        }).eq("id", approval.id);
        if (approvalUpdate.error) throw approvalUpdate.error;

        const prospectUpdate = await db.from("prospects").update({ stage: "contacted", updated_at: sentAt })
          .eq("id", approval.prospect_id).eq("organization_id", approval.organization_id || ORG_ID)
          .select("id,stage").maybeSingle();

        if ((approval.message_type || "initial") === "initial") {
          await createFollowups(db, approval, sentAt);
        } else if (approval.followup_id) {
          await db.from("outreach_followups").update({ status: "sent", updated_at: sentAt }).eq("id", approval.followup_id);
        }

        await db.from("audit_logs").insert({
          organization_id: approval.organization_id,
          action: approval.message_type === "followup" ? "outreach_followup_sent" : "outreach_email_sent",
          entity_type: "outreach_approval",
          entity_id: approval.id,
          metadata: {
            approved_by: user.email,
            to: approval.to_email,
            cc: approval.cc_emails,
            gmail_message_id: sent.id || null,
            gmail_thread_id: sent.threadId || approval.gmail_thread_id || null,
            prospect_stage_synced: Boolean(prospectUpdate.data),
            prospect_stage_error: prospectUpdate.error?.message || null
          }
        });

        await db.from("events").insert({
          organization_id: approval.organization_id || ORG_ID,
          event_type: "sales.outreach.sent",
          aggregate_type: "prospect",
          aggregate_id: approval.prospect_id,
          payload: {
            approval_id: approval.id,
            approved_by: user.email,
            stage_synced: Boolean(prospectUpdate.data),
            message_type: approval.message_type || "initial"
          }
        });

        return NextResponse.json({
          ok: true,
          status: "sent",
          gmailMessageId: sent.id || null,
          stageSynced: Boolean(prospectUpdate.data),
          stageSyncWarning: prospectUpdate.error?.message || null
        });
      } catch (sendError:any) {
        await db.from("outreach_approvals").update({ status: "failed", error: sendError?.message || "Gmail send failed", updated_at: new Date().toISOString() }).eq("id", approval.id);
        if (approval.followup_id) await db.from("outreach_followups").update({ status: "pending", notes: sendError?.message || "Gmail send failed", updated_at: new Date().toISOString() }).eq("id", approval.followup_id);
        return NextResponse.json({ ok: false, status: "failed", error: sendError?.message || "Gmail send failed" }, { status: 502 });
      }
    }

    if (action === "reject") {
      if (!approvalId) return NextResponse.json({ ok: false, error: "approvalId is required." }, { status: 400 });
      const rejectedAt = new Date().toISOString();
      const { data:approval, error } = await db.from("outreach_approvals").update({
        status: "rejected", approved_by: user.email, approved_at: rejectedAt, updated_at: rejectedAt
      }).eq("id", approvalId).eq("status", "pending").select("followup_id").single();
      if (error) throw error;
      if (approval?.followup_id) await db.from("outreach_followups").update({ status: "pending", prepared_approval_id: null, updated_at: rejectedAt }).eq("id", approval.followup_id);
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (error:any) {
    return NextResponse.json({ ok: false, error: error?.message || "Outreach operation failed" }, { status: 500 });
  }
}

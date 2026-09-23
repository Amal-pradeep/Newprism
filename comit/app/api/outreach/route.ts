import { NextResponse } from "next/server";
import { getSessionUser, isApprover, outreachBody, requireAdminDb, sendApprovedEmail, AMAL_EMAIL, AADIL_EMAIL } from "@/lib/outreach";

export async function POST(req: Request) {
  const user = getSessionUser(req);
  if (!isApprover(user)) return NextResponse.json({ ok: false, error: "Only Amal or Aadil can approve outreach." }, { status: 403 });
  try {
    const { prospectId, action, approvalId } = await req.json();
    const db = await requireAdminDb();

    if (action === "prepare") {
      const { data: prospect, error: prospectError } = await db.from("prospects").select("*, companies(name,website,industry,location)").eq("id", prospectId).single();
      if (prospectError || !prospect) return NextResponse.json({ ok: false, error: "Prospect not found." }, { status: 404 });
      if (!prospect.email) return NextResponse.json({ ok: false, error: "This prospect has no verified public business email yet." }, { status: 400 });

      const subject = "A practical growth idea for " + prospect.name;
      const body = outreachBody(prospect);
      const cc = [AMAL_EMAIL, AADIL_EMAIL];
      const { data, error } = await db.from("outreach_approvals").insert({
        organization_id: prospect.organization_id,
        prospect_id: prospect.id,
        status: "pending",
        requested_by: user.email,
        to_email: prospect.email,
        cc_emails: cc,
        subject,
        body
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, approval: data });
    }

    if (action === "approve") {
      if (!approvalId) return NextResponse.json({ ok: false, error: "approvalId is required." }, { status: 400 });
      const { data: approval, error } = await db.from("outreach_approvals").select("*").eq("id", approvalId).single();
      if (error || !approval) return NextResponse.json({ ok: false, error: "Approval request not found." }, { status: 404 });
      if (approval.status !== "pending") return NextResponse.json({ ok: false, error: "This approval has already been processed." }, { status: 409 });

      const approvedAt = new Date().toISOString();
      await db.from("outreach_approvals").update({ status: "approved", approved_by: user.email, approved_at: approvedAt, updated_at: approvedAt }).eq("id", approval.id);

      try {
        const sent = await sendApprovedEmail({
          to: approval.to_email,
          cc: approval.cc_emails || [AMAL_EMAIL, AADIL_EMAIL],
          subject: approval.subject,
          body: approval.body
        });
        await db.from("outreach_approvals").update({ status: "sent", gmail_message_id: sent.id || null, updated_at: new Date().toISOString() }).eq("id", approval.id);
        await db.from("prospects").update({ stage: "contacted", updated_at: new Date().toISOString() }).eq("id", approval.prospect_id);
        await db.from("audit_logs").insert({
          organization_id: approval.organization_id,
          action: "outreach_email_sent",
          entity_type: "outreach_approval",
          entity_id: approval.id,
          metadata: { approved_by: user.email, to: approval.to_email, cc: approval.cc_emails, gmail_message_id: sent.id || null }
        });
        return NextResponse.json({ ok: true, status: "sent", gmailMessageId: sent.id || null });
      } catch (sendError: any) {
        await db.from("outreach_approvals").update({ status: "failed", error: sendError?.message || "Gmail send failed", updated_at: new Date().toISOString() }).eq("id", approval.id);
        return NextResponse.json({ ok: false, status: "failed", error: sendError?.message || "Gmail send failed" }, { status: 502 });
      }
    }

    if (action === "reject") {
      if (!approvalId) return NextResponse.json({ ok: false, error: "approvalId is required." }, { status: 400 });
      const { error } = await db.from("outreach_approvals").update({ status: "rejected", approved_by: user.email, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", approvalId).eq("status", "pending");
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Outreach operation failed" }, { status: 500 });
  }
}

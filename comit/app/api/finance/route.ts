import {NextResponse} from "next/server";
import {AADIL_EMAIL,AMAL_EMAIL,getSessionUser,requireAdminDb,sendApprovedEmail} from "@/lib/outreach";
import {buildPaymentReminder,financeSummary} from "@/lib/finance-ai";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";

function isFinanceUser(user:{email:string}|null){
  if(!user)return false;
  return [AADIL_EMAIL,AMAL_EMAIL].includes(user.email.toLowerCase());
}
function clean(value:unknown,limit=500){
  return typeof value==="string"?value.trim().slice(0,limit):"";
}
function validEmail(value:string){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
async function financeData(db:any){
  const [clients,invoices,approvals,payments]=await Promise.all([
    db.from("finance_clients").select("*").eq("organization_id",ORG_ID).eq("active",true).order("name"),
    db.from("finance_invoices").select("*").eq("organization_id",ORG_ID).order("created_at",{ascending:false}),
    db.from("finance_email_approvals").select("*").eq("organization_id",ORG_ID).order("created_at",{ascending:false}).limit(100),
    db.from("finance_payment_events").select("*").eq("organization_id",ORG_ID).order("recorded_at",{ascending:false}).limit(100)
  ]);
  if(clients.error)throw clients.error;
  if(invoices.error)throw invoices.error;
  if(approvals.error)throw approvals.error;
  if(payments.error)throw payments.error;
  const clientMap=new Map<string,any>((clients.data||[]).map((c:any)=>[String(c.id),c]));
  const rows=(invoices.data||[]).map((invoice:any)=>({
    ...invoice,
    client_name:clientMap.get(String(invoice.client_id))?.name||"Unknown client",
    billing_email:clientMap.get(String(invoice.client_id))?.billing_email||null,
    client_notes:clientMap.get(String(invoice.client_id))?.notes||null,
    approvals:(approvals.data||[]).filter((a:any)=>a.invoice_id===invoice.id),
    payments:(payments.data||[]).filter((p:any)=>p.invoice_id===invoice.id)
  }));
  const summary=financeSummary(rows);
  return {
    clients:clients.data||[],
    invoices:summary.attention,
    summary
  };
}
async function logEvent(db:any,type:string,invoiceId:string,payload:Record<string,unknown>){
  await db.from("events").insert({
    organization_id:ORG_ID,
    event_type:type,
    aggregate_type:"finance_invoice",
    aggregate_id:invoiceId,
    payload
  });
}

export async function GET(req:Request){
  const user=await getSessionUser(req);
  if(!isFinanceUser(user))return NextResponse.json({ok:false,error:"Finance access is limited to Amal and Aadil."},{status:403});
  try{
    const db=await requireAdminDb();
    const data=await financeData(db);
    return NextResponse.json({
      ok:true,
      user,
      owner:{name:"Aadil",role:"Founder · Finance & Compliance",email:AADIL_EMAIL},
      ...data
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Finance workspace unavailable"},{status:503});
  }
}

export async function POST(req:Request){
  const user=await getSessionUser(req);
  if(!isFinanceUser(user))return NextResponse.json({ok:false,error:"Finance access is limited to Amal and Aadil."},{status:403});
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");
  try{
    const db=await requireAdminDb();

    if(action==="update_client"){
      const clientId=String(body.clientId||"");
      const billingEmail=clean(body.billingEmail,320).toLowerCase();
      if(billingEmail&&!validEmail(billingEmail))return NextResponse.json({ok:false,error:"Enter a valid billing email."},{status:400});
      const notes=clean(body.notes,1000);
      const updated=await db.from("finance_clients").update({
        billing_email:billingEmail||null,
        notes:notes||null,
        updated_at:new Date().toISOString()
      }).eq("organization_id",ORG_ID).eq("id",clientId).select("*").single();
      if(updated.error)throw updated.error;
      return NextResponse.json({ok:true,client:updated.data});
    }

    if(action==="add_invoice"){
      const clientId=String(body.clientId||"");
      const amount=Number(body.amount);
      const currency=clean(body.currency,3).toUpperCase()||"AED";
      const period=clean(body.periodLabel,160);
      const dueDate=clean(body.dueDate,10)||null;
      if(!clientId||!Number.isFinite(amount)||amount<=0)return NextResponse.json({ok:false,error:"Client and positive invoice amount are required."},{status:400});
      const created=await db.from("finance_invoices").insert({
        organization_id:ORG_ID,
        client_id:clientId,
        external_key:"manual-"+crypto.randomUUID(),
        period_label:period||null,
        amount,
        paid_amount:0,
        currency,
        due_date:dueDate,
        status:"pending",
        notes:clean(body.notes,1000)||null,
        created_by:user!.email,
        updated_by:user!.email
      }).select("*").single();
      if(created.error)throw created.error;
      await logEvent(db,"finance.invoice.created",created.data.id,{by:user!.email,amount,currency});
      return NextResponse.json({ok:true,invoice:created.data});
    }

    if(action==="set_due_date"){
      const invoiceId=String(body.invoiceId||"");
      const dueDate=clean(body.dueDate,10)||null;
      const updated=await db.from("finance_invoices").update({
        due_date:dueDate,
        updated_by:user!.email,
        updated_at:new Date().toISOString()
      }).eq("organization_id",ORG_ID).eq("id",invoiceId).select("*").single();
      if(updated.error)throw updated.error;
      await logEvent(db,"finance.due_date.updated",invoiceId,{by:user!.email,due_date:dueDate});
      return NextResponse.json({ok:true,invoice:updated.data});
    }

    if(action==="record_payment"){
      const invoiceId=String(body.invoiceId||"");
      const amount=Number(body.amount);
      if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({ok:false,error:"Payment amount must be positive."},{status:400});
      const invoice=await db.from("finance_invoices").select("*").eq("organization_id",ORG_ID).eq("id",invoiceId).single();
      if(invoice.error||!invoice.data)return NextResponse.json({ok:false,error:"Invoice not found."},{status:404});
      const remaining=Math.max(0,Number(invoice.data.amount)-Number(invoice.data.paid_amount));
      if(amount>remaining)return NextResponse.json({ok:false,error:"Payment amount is greater than the outstanding balance."},{status:400});
      const nextPaid=Number(invoice.data.paid_amount)+amount;
      const nextStatus=nextPaid>=Number(invoice.data.amount)?"paid":"partially_paid";
      const now=new Date().toISOString();
      const payment=await db.from("finance_payment_events").insert({
        organization_id:ORG_ID,
        invoice_id:invoiceId,
        amount,
        currency:invoice.data.currency,
        payment_method:clean(body.paymentMethod,100)||null,
        reference:clean(body.reference,200)||null,
        note:clean(body.note,500)||null,
        recorded_by:user!.email
      }).select("*").single();
      if(payment.error)throw payment.error;
      const updated=await db.from("finance_invoices").update({
        paid_amount:nextPaid,
        status:nextStatus,
        paid_at:nextStatus==="paid"?now:null,
        updated_by:user!.email,
        updated_at:now
      }).eq("id",invoiceId).select("*").single();
      if(updated.error)throw updated.error;
      await logEvent(db,"finance.payment.recorded",invoiceId,{by:user!.email,amount,status:nextStatus});
      return NextResponse.json({ok:true,payment:payment.data,invoice:updated.data});
    }

    if(action==="prepare_reminder"){
      const invoiceId=String(body.invoiceId||"");
      const invoiceResult=await db.from("finance_invoices").select("*").eq("organization_id",ORG_ID).eq("id",invoiceId).single();
      if(invoiceResult.error||!invoiceResult.data)return NextResponse.json({ok:false,error:"Invoice not found."},{status:404});
      const clientResult=await db.from("finance_clients").select("*").eq("organization_id",ORG_ID).eq("id",invoiceResult.data.client_id).single();
      if(clientResult.error||!clientResult.data)return NextResponse.json({ok:false,error:"Finance client not found."},{status:404});
      if(!clientResult.data.billing_email)return NextResponse.json({ok:false,error:"Add and verify the client billing email before preparing a reminder."},{status:409});
      const balance=Math.max(0,Number(invoiceResult.data.amount)-Number(invoiceResult.data.paid_amount));
      if(balance<=0||invoiceResult.data.status==="paid")return NextResponse.json({ok:false,error:"This invoice is already fully paid."},{status:409});

      const enriched={...invoiceResult.data,client_name:clientResult.data.name};
      const draft=buildPaymentReminder(enriched);
      const existing=await db.from("finance_email_approvals").select("id").eq("organization_id",ORG_ID).eq("invoice_id",invoiceId).eq("status","pending").maybeSingle();
      if(existing.data)return NextResponse.json({ok:true,status:"already_pending",approvalId:existing.data.id,draft});

      const approval=await db.from("finance_email_approvals").insert({
        organization_id:ORG_ID,
        invoice_id:invoiceId,
        status:"pending",
        to_email:clientResult.data.billing_email,
        subject:draft.subject,
        body:draft.body,
        requested_by:user!.email
      }).select("*").single();
      if(approval.error)throw approval.error;
      await logEvent(db,"finance.reminder.prepared",invoiceId,{by:user!.email,approval_id:approval.data.id,risk:draft.risk});
      return NextResponse.json({ok:true,approval:approval.data,draft});
    }

    if(action==="approve_and_send"){
      const approvalId=String(body.approvalId||"");
      const approval=await db.from("finance_email_approvals").select("*").eq("organization_id",ORG_ID).eq("id",approvalId).single();
      if(approval.error||!approval.data)return NextResponse.json({ok:false,error:"Reminder approval not found."},{status:404});
      if(approval.data.status!=="pending")return NextResponse.json({ok:false,error:"This reminder has already been processed."},{status:409});
      const now=new Date().toISOString();
      await db.from("finance_email_approvals").update({
        status:"approved",
        approved_by:user!.email,
        approved_at:now,
        updated_at:now
      }).eq("id",approvalId).eq("status","pending");

      const gmailConfigured=Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.ORBIT_GMAIL_REFRESH_TOKEN);
      if(!gmailConfigured){
        const mailto="mailto:"+encodeURIComponent(approval.data.to_email)+"?subject="+encodeURIComponent(approval.data.subject)+"&body="+encodeURIComponent(approval.data.body);
        await logEvent(db,"finance.reminder.approved_manual",approval.data.invoice_id,{by:user!.email,approval_id:approvalId});
        return NextResponse.json({ok:true,status:"approved_manual",mailtoUrl:mailto});
      }

      try{
        const sent=await sendApprovedEmail({
          to:approval.data.to_email,
          subject:approval.data.subject,
          body:approval.data.body
        });
        await db.from("finance_email_approvals").update({
          status:"sent",
          gmail_message_id:sent.id||null,
          gmail_thread_id:sent.threadId||null,
          updated_at:new Date().toISOString()
        }).eq("id",approvalId);
        const countResult=await db.from("finance_invoices").select("reminder_count").eq("id",approval.data.invoice_id).single();
        const reminderCount=Number(countResult.data?.reminder_count||0)+1;
        await db.from("finance_invoices").update({
          reminder_count:reminderCount,
          last_reminder_at:new Date().toISOString(),
          updated_by:user!.email,
          updated_at:new Date().toISOString()
        }).eq("id",approval.data.invoice_id);
        await logEvent(db,"finance.reminder.sent",approval.data.invoice_id,{by:user!.email,approval_id:approvalId,gmail_message_id:sent.id||null});
        return NextResponse.json({ok:true,status:"sent",gmailMessageId:sent.id||null});
      }catch(error:any){
        await db.from("finance_email_approvals").update({status:"failed",error:error?.message||"Gmail send failed",updated_at:new Date().toISOString()}).eq("id",approvalId);
        return NextResponse.json({ok:false,status:"failed",error:error?.message||"Gmail send failed"},{status:502});
      }
    }

    if(action==="reject_reminder"){
      const approvalId=String(body.approvalId||"");
      const updated=await db.from("finance_email_approvals").update({
        status:"rejected",
        approved_by:user!.email,
        approved_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }).eq("organization_id",ORG_ID).eq("id",approvalId).eq("status","pending").select("*").single();
      if(updated.error)throw updated.error;
      return NextResponse.json({ok:true,approval:updated.data});
    }

    return NextResponse.json({ok:false,error:"Unknown finance action."},{status:400});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Finance operation failed"},{status:503});
  }
}

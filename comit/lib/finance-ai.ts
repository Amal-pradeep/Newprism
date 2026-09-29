export type FinanceInvoiceLike={
  id:string;
  client_name:string;
  period_label?:string|null;
  amount:number;
  paid_amount:number;
  currency:string;
  due_date?:string|null;
  status:string;
  reminder_count?:number|null;
  last_reminder_at?:string|null;
};

export type CollectionRisk={
  balance:number;
  overdueDays:number|null;
  band:"paid"|"due-date-missing"|"due-soon"|"due"|"overdue-1-7"|"overdue-8-30"|"overdue-31-plus";
  priority:"none"|"low"|"medium"|"high"|"critical";
  nextAction:string;
};

function money(amount:number,currency:string){
  return new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:2}).format(amount);
}
function dateOnly(value:string){
  return new Date(value+"T00:00:00Z");
}
function todayUtc(){
  const d=new Date();
  return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
}
export function invoiceBalance(invoice:FinanceInvoiceLike){
  return Math.max(0,Number(invoice.amount||0)-Number(invoice.paid_amount||0));
}
export function collectionRisk(invoice:FinanceInvoiceLike):CollectionRisk{
  const balance=invoiceBalance(invoice);
  if(balance<=0||invoice.status==="paid"){
    return {balance:0,overdueDays:0,band:"paid",priority:"none",nextAction:"No collection action needed."};
  }
  if(!invoice.due_date){
    return {balance,overdueDays:null,band:"due-date-missing",priority:"medium",nextAction:"Set the agreed due date before classifying this payment as delayed."};
  }
  const due=dateOnly(invoice.due_date);
  const diff=Math.floor((todayUtc().getTime()-due.getTime())/86400000);
  if(diff<0){
    const days=Math.abs(diff);
    return {balance,overdueDays:0,band:"due-soon",priority:days<=3?"medium":"low",nextAction:days<=3?"Send a friendly pre-due reminder if appropriate.":"Monitor until the due date."};
  }
  if(diff===0)return {balance,overdueDays:0,band:"due",priority:"medium",nextAction:"Payment is due today. Prepare a polite reminder if not received."};
  if(diff<=7)return {balance,overdueDays:diff,band:"overdue-1-7",priority:"high",nextAction:"Send a friendly overdue reminder and ask for the expected payment date."};
  if(diff<=30)return {balance,overdueDays:diff,band:"overdue-8-30",priority:"high",nextAction:"Send a firmer reminder, request a confirmed payment date and record any reason for delay."};
  return {balance,overdueDays:diff,band:"overdue-31-plus",priority:"critical",nextAction:"Escalate internally, request immediate payment/plan confirmation, and pause further escalation until a founder reviews the client context."};
}

function greeting(client:string){return "Hi "+client+" team,";}
function signature(){
  return ["Regards,","Aadil Sudhir","Founder · Finance & Compliance","Prism of Stories"].join("\n");
}

export function buildPaymentReminder(invoice:FinanceInvoiceLike){
  const risk=collectionRisk(invoice);
  const due=invoice.due_date?new Date(invoice.due_date+"T00:00:00Z").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):null;
  const period=invoice.period_label?(" for "+invoice.period_label):"";
  const balanceText=money(risk.balance,invoice.currency);
  const subject=(risk.overdueDays&&risk.overdueDays>0?"Payment reminder":"Payment follow-up")+" – "+invoice.client_name+" – "+balanceText+" outstanding";

  let middle:string[];
  if(risk.band==="overdue-31-plus"){
    middle=[
      "This is a follow-up regarding the outstanding payment of "+balanceText+period+".",
      due?"Our records show this payment was due on "+due+" and is now "+risk.overdueDays+" days overdue.":"Our records still show this amount as outstanding.",
      "Could you please arrange the payment or confirm a specific payment date? If there is any billing issue holding this up, please let me know so we can resolve it promptly."
    ];
  }else if(risk.band==="overdue-8-30"){
    middle=[
      "I’m following up on the outstanding payment of "+balanceText+period+".",
      due?"The agreed due date was "+due+" and our records still show the payment as pending.":"Our records still show the payment as pending.",
      "Please let me know the expected payment date. If the transfer has already been completed, kindly share the payment reference so I can update our accounts."
    ];
  }else{
    middle=[
      "Hope you’re doing well.",
      "This is a gentle reminder regarding the outstanding payment of "+balanceText+period+".",
      due?"The payment "+(risk.band==="due-soon"?"is due on ":"was due on ")+due+".":"The due date is not currently recorded in our system.",
      "Could you please confirm the expected payment date? If payment has already been processed, kindly share the reference so I can update our records."
    ];
  }

  const body=[greeting(invoice.client_name),"",...middle,"","Thank you for your support and cooperation.","",signature()].join("\n");
  return {subject,body,risk};
}

export function financeSummary(invoices:FinanceInvoiceLike[]){
  let billed=0,paid=0,outstanding=0,overdue=0;
  const attention=invoices.map(invoice=>{
    billed+=Number(invoice.amount||0);
    paid+=Number(invoice.paid_amount||0);
    const risk=collectionRisk(invoice);
    outstanding+=risk.balance;
    if((risk.overdueDays||0)>0)overdue+=risk.balance;
    return {...invoice,risk};
  }).sort((a,b)=>{
    const rank:any={critical:4,high:3,medium:2,low:1,none:0};
    return rank[b.risk.priority]-rank[a.risk.priority];
  });
  const collectionRate=billed>0?Math.round((paid/billed)*1000)/10:0;
  return {billed,paid,outstanding,overdue,collectionRate,attention};
}

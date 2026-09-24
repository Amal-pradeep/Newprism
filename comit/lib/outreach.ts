import {supabaseAdmin} from "@/lib/supabase";
import {createHmac,timingSafeEqual} from "crypto";
export const AMAL_EMAIL="amalpradeep25@gmail.com";
export const AADIL_EMAIL="aadil.sudhir279@gmail.com";
// Prefer an authenticated business-domain mailbox (for example outreach@prismofstories.com)
// rather than a free @gmail.com From address for prospect outreach.
export const SENDER_EMAIL=process.env.COMIT_OUTREACH_FROM||process.env.ORBIT_GMAIL_EMAIL||"prismofstories25@gmail.com";
export const REPLY_TO_EMAIL=process.env.COMIT_OUTREACH_REPLY_TO||SENDER_EMAIL;
export type CometUser={email:string;name?:string};
const JISHNU_EMAIL=process.env.COMIT_JISHNU_EMAIL||"jishnu.01010011@gmail.com";
function sessionSecret(){return process.env.COMIT_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.GOOGLE_CLIENT_SECRET||""}
function validSignature(payload:string,signature:string){const secret=sessionSecret();if(!secret)return false;const expected=createHmac("sha256",secret).update(payload).digest("base64url");try{return expected.length===signature.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(signature))}catch{return false}}
export function getSessionUser(req:Request):CometUser|null{const raw=req.headers.get("cookie")||"";const match=raw.match(/(?:^|;\s*)comit_session=([^;]+)/);if(!match)return null;try{const token=decodeURIComponent(match[1]);const [payload,signature]=token.split(".");if(!payload||!signature||!validSignature(payload,signature))return null;const decoded=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));const issued=Number(decoded.iat||0);if(!issued||Date.now()-issued>604800000)return null;const email=String(decoded.email||"").toLowerCase();if(![AMAL_EMAIL,AADIL_EMAIL,"msaneeshnath@gmail.com",JISHNU_EMAIL].includes(email))return null;return{email,name:decoded.name}}catch{return null}}
export function isApprover(user:CometUser|null){return!!user&&[AMAL_EMAIL,AADIL_EMAIL].includes(user.email.toLowerCase())}
export function isRestaurantProspect(prospect:any){const industry=String(prospect?.metadata?.industry||prospect?.companies?.industry||"").toLowerCase();return /restaurant|hospitality|cafe|f&b|food/.test(industry)}
export function outreachBody(prospect:any){
const fit=prospect.metadata?.fit_reason||"digital growth, content and performance marketing";
const industry=String(prospect.metadata?.industry||"").toLowerCase();
const restaurant=/restaurant|hospitality|cafe|f&b|food/.test(industry);
if(restaurant)return [
`Hi ${prospect.name} team,`,"",
`I was researching ${prospect.name} and your work in ${prospect.metadata?.location||"the UAE"}.`,"",
"Prism of Stories has a restaurant-focused AI creative and growth workflow: recurring promotional posters, campaign concepts, social content, local discovery/SEO, paid-campaign support and lead/customer follow-up.",
"We are currently running this kind of workflow for a Dubai restaurant, including ongoing promotional creative, so we understand the speed and consistency restaurants need from marketing.",
"",
`For ${prospect.name}, one area worth exploring is ${fit}.`,"",
"I can send a short restaurant growth audit with 3 practical opportunities covering creative, local discovery and conversion.","",
"Would you be open to a 15-minute conversation this week?","","Regards,","Amal Pradeep","Prism of Stories","Digital Marketing · AI · Web Development","https://prismofstories.com","WhatsApp: https://wa.me/919745643726","Instagram: https://instagram.com/prismofstories","","P.S. If this isn't relevant, just let us know and we won't follow up."
].join("\n");
return [
`Hi ${prospect.name} team,`,"",
`We came across ${prospect.name} while researching businesses in ${prospect.metadata?.location||"the UAE"} and noticed the work you are doing in ${prospect.metadata?.industry||"your sector"}.`,"",
`Prism of Stories helps brands improve ${fit} through digital marketing, AI and web solutions.`,"",
"We can share a short, no-obligation growth audit with 3–5 practical opportunities specific to your brand.","",
"Would you be open to a 15-minute conversation this week?","","Regards,","Amal Pradeep","Prism of Stories","Digital Marketing · AI · Web Development","https://prismofstories.com","WhatsApp: https://wa.me/919745643726","Instagram: https://instagram.com/prismofstories","","P.S. If this isn't relevant, just let us know and we won't follow up."
].join("\n")
}
export function followupBody(prospect:any,sequenceNo:number){
const restaurant=isRestaurantProspect(prospect),name=prospect.name;
const opening=restaurant?`I wanted to follow up on the restaurant growth idea I sent for ${name}.`:`I wanted to follow up on the growth idea I sent for ${name}.`;
const steps:Record<number,string[]>={1:[opening,"If useful, I can send a mini-audit with 3 concrete opportunities we would test first."],2:[opening,restaurant?"We can also share a relevant restaurant creative example and explain how we would turn it into a repeatable campaign system.":"We can also share a relevant example and explain how we would turn it into a repeatable growth workflow."],3:[opening,"A quick question: who normally owns the decision for marketing, growth or digital improvements on your side?"],4:[opening,"I’ll close the loop after this message. If improving growth or marketing execution becomes a priority later, I’d be happy to reconnect."]};
return [`Hi ${name} team,` ,"",...(steps[sequenceNo]||steps[1]),"",sequenceNo===4?"No pressure either way.":"Would a 15-minute conversation this week be useful?","","Regards,","Amal Pradeep","Prism of Stories","Digital Marketing · AI · Web Development","https://prismofstories.com","", "If this isn't relevant, just let us know and we won't follow up."].join("\n")}
function base64Url(input:string){return Buffer.from(input).toString("base64url")}
function rawMail(p:{to:string;subject:string;body:string}){const headers=["MIME-Version: 1.0",'Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 8bit","From: "+SENDER_EMAIL,"To: "+p.to,"Reply-To: "+REPLY_TO_EMAIL,"Subject: "+p.subject];return base64Url(headers.join("\r\n")+"\r\n\r\n"+p.body)}
export async function googleAccessToken(){const clientId=process.env.GOOGLE_CLIENT_ID,clientSecret=process.env.GOOGLE_CLIENT_SECRET,refreshToken=process.env.ORBIT_GMAIL_REFRESH_TOKEN;if(!clientId||!clientSecret||!refreshToken)throw new Error("Gmail sending is not configured in COMIT. Connect Prism Gmail OAuth credentials first.");const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"})});const data=await response.json();if(!response.ok)throw new Error(data.error_description||data.error||"Google OAuth failed");return data.access_token as string}
export async function sendApprovedEmail(p:{to:string;cc?:string[];subject:string;body:string;threadId?:string|null}){const accessToken=await googleAccessToken();const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({raw:rawMail(p),...(p.threadId?{threadId:p.threadId}:{})})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Gmail API send failed");return data as{id?:string;threadId?:string}}
export async function requireAdminDb(){const admin=supabaseAdmin();if(!admin)throw new Error("Supabase server credentials are not configured.");return admin}

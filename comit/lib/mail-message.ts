type Message={to:string;cc?:string[];subject:string;body:string};
export function encodeMail(message:Message,sender:string,replyTo:string){
  const recipients=[message.to,...(message.cc||[])];
  if(recipients.some(value=>!value||/[\r\n]/.test(value)||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))throw new Error("A valid recipient email is required.");
  if([sender,replyTo,message.subject].some(value=>/[\r\n]/.test(value)))throw new Error("Email headers cannot contain new lines.");
  const subject="=?UTF-8?B?"+Buffer.from(message.subject).toString("base64")+"?=";
  const headers=["MIME-Version: 1.0",'Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 8bit","From: "+sender,"To: "+message.to,
    ...(message.cc?.length?["Cc: "+message.cc.join(", ")]:[]),"Reply-To: "+replyTo,"Subject: "+subject];
  return Buffer.from(headers.join("\r\n")+"\r\n\r\n"+message.body).toString("base64url");
}

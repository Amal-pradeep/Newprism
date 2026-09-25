"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

export default function AuthCallback(){
  const [message,setMessage]=useState("Verifying your sign-in link…");
  const router=useRouter();
  useEffect(()=>{
    const hash=new URLSearchParams(window.location.hash.slice(1));
    const token=hash.get("access_token");
    window.history.replaceState(null,"",window.location.pathname);
    if(!token){setMessage("The sign-in link is invalid or expired. Please request a new one.");return}
    fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accessToken:token})})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Sign-in failed.");router.replace("/");router.refresh()})
      .catch(error=>setMessage(error.message||"Sign-in failed. Please request a new link."));
  },[router]);
  return <main className="grid min-h-screen place-items-center p-6"><div role="status" className="text-center">{message}<p className="mt-4"><a href="/login" className="underline">Back to sign in</a></p></div></main>;
}

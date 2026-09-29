import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export function supabaseAdmin() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !adminKey) return null;
  return createClient(url, adminKey, { auth: { persistSession: false } });
}

export function supabaseForAccessToken(accessToken:string){
  if(!url||!key||!accessToken)return null;
  return createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:"Bearer "+accessToken}}
  });
}

export async function supabaseFromSession(){
  if(!url||!key)return null;
  const store=await cookies();
  const access=store.get("comit_access_token")?.value||"";
  const refresh=store.get("comit_refresh_token")?.value||"";
  if(!access)return null;

  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(refresh){
    const {data,error}=await client.auth.setSession({access_token:access,refresh_token:refresh});
    if(error||!data.session)return null;
    const nextAccess=data.session.access_token;
    const nextRefresh=data.session.refresh_token;
    if(nextAccess&&nextAccess!==access){
      store.set("comit_access_token",nextAccess,{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:2592000});
    }
    if(nextRefresh&&nextRefresh!==refresh){
      store.set("comit_refresh_token",nextRefresh,{httpOnly:true,sameSite:"strict",secure:true,path:"/",maxAge:2592000});
    }
    return client;
  }

  const {data,error}=await client.auth.getUser(access);
  if(error||!data.user)return null;
  return supabaseForAccessToken(access);
}

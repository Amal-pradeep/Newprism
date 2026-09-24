import {NextResponse} from "next/server";
import {supabaseAdmin} from "@/lib/supabase";
import {getSessionUser} from "@/lib/outreach";

export const dynamic="force-dynamic";
const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
const BUCKET="comit-creative-library";
const CATEGORIES=["shoot-footage","production","edit","spot-edit","ai-reference","final-delivery","other"];
const MAX_BYTES=500*1024*1024;
const ALLOWED=new Set(["video/mp4","video/quicktime","video/webm","image/jpeg","image/png","image/webp","application/pdf"]);

export async function GET(req:Request){
 const user=getSessionUser(req);if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const db=supabaseAdmin();if(!db)return NextResponse.json({error:"Cloud storage is not configured"},{status:503});
 const {data,error}=await db.from("creative_library_items").select("id,title,category,mime_type,file_size,notes,tags,created_by,created_at,object_path").eq("organization_id",ORG_ID).order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:"Creative library is not ready. Apply migration 0008 and configure Supabase."},{status:503});
 const items=await Promise.all((data||[]).map(async item=>{const {data:signed}=await db.storage.from(BUCKET).createSignedUrl(item.object_path,3600);const {object_path,...safe}=item;return {...safe,url:signed?.signedUrl||null}}));
 return NextResponse.json({items});
}

export async function POST(req:Request){
 const user=getSessionUser(req);if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const db=supabaseAdmin();if(!db)return NextResponse.json({error:"Cloud storage is not configured"},{status:503});
 const form=await req.formData();const file=form.get("file");const title=String(form.get("title")||"").trim();const category=String(form.get("category")||"other");const notes=String(form.get("notes")||"").trim();const tags=String(form.get("tags")||"").split(",").map(t=>t.trim()).filter(Boolean).slice(0,20);
 if(!(file instanceof File)||!file.size||file.size>MAX_BYTES||!ALLOWED.has(file.type))return NextResponse.json({error:"Choose a supported video, image or PDF under 500 MB."},{status:400});
 if(!title||!CATEGORIES.includes(category))return NextResponse.json({error:"A title and valid library category are required."},{status:400});
 const safeName=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-").slice(-120)||"asset";
 const objectPath=`${ORG_ID}/${crypto.randomUUID()}-${safeName}`;
 const {error:uploadError}=await db.storage.from(BUCKET).upload(objectPath,Buffer.from(await file.arrayBuffer()),{contentType:file.type,upsert:false});
 if(uploadError)return NextResponse.json({error:"Upload failed. Check the private COMIT storage bucket configuration."},{status:502});
 const {data,error}=await db.from("creative_library_items").insert({organization_id:ORG_ID,title,category,object_path:objectPath,mime_type:file.type,file_size:file.size,notes,tags,created_by:user.email}).select("id").single();
 if(error){await db.storage.from(BUCKET).remove([objectPath]);return NextResponse.json({error:"Could not save library details."},{status:500})}
 return NextResponse.json({ok:true,id:data.id}, {status:201});
}

import {NextResponse} from "next/server";
import {supabaseAdmin} from "@/lib/supabase";
import {getSessionUser} from "@/lib/outreach";

export const dynamic="force-dynamic";
const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
const SPACE_SLUG="shahid-video-creative";
const BUCKET="comit-creative-library";
const ASSET_TYPES=["raw_ideas","shoot_briefs","footage_refs","edits","spot_edits","creative_briefs","thumbnails","scripts","reference_assets"];
const MAX_BYTES=500*1024*1024;
const ALLOWED=new Set(["video/mp4","video/quicktime","video/webm","image/jpeg","image/png","image/webp","application/pdf"]);

export async function GET(req:Request){
 const user=getSessionUser(req);if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const db=supabaseAdmin();if(!db)return NextResponse.json({error:"Cloud storage is not configured"},{status:503});
 const {data:space,error:spaceError}=await db.from("creative_library_spaces").select("id,name,slug,asset_types,ai_adaptation_enabled,evolution_mode").eq("organization_id",ORG_ID).eq("slug",SPACE_SLUG).single();
 if(spaceError||!space)return NextResponse.json({error:"Creative library space is not ready."},{status:503});
 const {data,error}=await db.from("creative_library_assets").select("id,title,asset_type,storage_path,source_url,tags,metadata,uploaded_by_email,created_at").eq("space_id",space.id).order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:"Could not load creative library assets."},{status:503});
 const items=await Promise.all((data||[]).map(async item=>{const {data:signed}=item.storage_path?await db.storage.from(BUCKET).createSignedUrl(item.storage_path,3600):{data:null};return {...item,url:signed?.signedUrl||item.source_url||null}}));
 return NextResponse.json({space,items});
}

export async function POST(req:Request){
 const user=getSessionUser(req);if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const db=supabaseAdmin();if(!db)return NextResponse.json({error:"Cloud storage is not configured"},{status:503});
 const {data:space,error:spaceError}=await db.from("creative_library_spaces").select("id,asset_types").eq("organization_id",ORG_ID).eq("slug",SPACE_SLUG).single();
 if(spaceError||!space)return NextResponse.json({error:"Creative library space is not ready."},{status:503});
 const form=await req.formData();const file=form.get("file");const title=String(form.get("title")||"").trim();const assetType=String(form.get("asset_type")||"");
 const notes=String(form.get("notes")||"").trim();const tags=String(form.get("tags")||"").split(",").map(t=>t.trim()).filter(Boolean).slice(0,20);
 if(!(file instanceof File)||!file.size||file.size>MAX_BYTES||!ALLOWED.has(file.type))return NextResponse.json({error:"Choose a supported video, image or PDF under 500 MB."},{status:400});
 if(!title||!ASSET_TYPES.includes(assetType)||!(space.asset_types||[]).includes(assetType))return NextResponse.json({error:"A title and valid library asset type are required."},{status:400});
 const safeName=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-").slice(-120)||"asset";
 const objectPath=`${ORG_ID}/${SPACE_SLUG}/${crypto.randomUUID()}-${safeName}`;
 const {error:uploadError}=await db.storage.from(BUCKET).upload(objectPath,Buffer.from(await file.arrayBuffer()),{contentType:file.type,upsert:false});
 if(uploadError)return NextResponse.json({error:"Upload failed. Check the private COMIT storage bucket."},{status:502});
 const {data,error}=await db.from("creative_library_assets").insert({
  space_id:space.id,uploaded_by_email:user.email,asset_type:assetType,title,storage_path:objectPath,
  tags,metadata:{mime_type:file.type,file_size:file.size,original_name:file.name,notes,learning_status:"new"}
 }).select("id").single();
 if(error){await db.storage.from(BUCKET).remove([objectPath]);return NextResponse.json({error:"Could not save library asset details."},{status:500})}
 return NextResponse.json({ok:true,id:data.id},{status:201});
}

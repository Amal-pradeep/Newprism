const GRAPH_VERSION=process.env.META_GRAPH_API_VERSION||"v26.0";
const GRAPH_ROOT="https://graph.facebook.com/"+GRAPH_VERSION;


export const metaPermissionPlan={
  ads:{
    minimum:["ads_management","pages_read_engagement","pages_show_list"],
    reporting:["ads_read"],
    optionalAgentMcp:["ads_mcp_management"],
    note:"Managing client ad accounts can require Meta App Review/Advanced Access and Business Verification."
  },
  facebookOrganic:{
    minimum:["pages_manage_posts","pages_read_engagement","pages_show_list"],
    note:"Page publishing access should be requested only when the product actually publishes Page content."
  },
  instagramFacebookLogin:{
    minimum:["instagram_basic","instagram_content_publish"],
    note:"For Instagram professional accounts connected through Facebook Login; page dependencies may also apply."
  },
  instagramBusinessLogin:{
    minimum:["instagram_business_basic","instagram_business_content_publish"],
    note:"Business Login for Instagram offers a separate permission chain for professional-account publishing."
  }
} as const;

export type MetaConfigStatus={
  configured:boolean;
  externalWritesEnabled:boolean;
  graphVersion:string;
  adAccountConfigured:boolean;
  pageConfigured:boolean;
  instagramConfigured:boolean;
};

function token(){return process.env.META_ACCESS_TOKEN||""}
function pageId(){return process.env.META_PAGE_ID||""}
function igId(){return process.env.META_INSTAGRAM_ACCOUNT_ID||""}
function adAccountId(){return process.env.META_AD_ACCOUNT_ID||""}

export function metaConfigStatus():MetaConfigStatus{
  return {
    configured:Boolean(token()),
    externalWritesEnabled:process.env.META_EXTERNAL_WRITES_ENABLED==="true",
    graphVersion:GRAPH_VERSION,
    adAccountConfigured:Boolean(adAccountId()),
    pageConfigured:Boolean(pageId()),
    instagramConfigured:Boolean(igId())
  };
}

function requireWriteConfig(){
  if(process.env.META_EXTERNAL_WRITES_ENABLED!=="true")throw new Error("Meta external writes are disabled in COMIT.");
  if(!token())throw new Error("META_ACCESS_TOKEN is not configured.");
}

async function graphRequest(path:string,method:"GET"|"POST",params:Record<string,unknown>={}){
  if(!token())throw new Error("Meta access token is not configured.");
  const url=new URL(GRAPH_ROOT+"/"+path.replace(/^\/+/,""));
  const body=new URLSearchParams();
  const all={...params,access_token:token()};
  for(const [key,value] of Object.entries(all)){
    if(value===undefined||value===null||value==="")continue;
    const serialized=typeof value==="string"?value:JSON.stringify(value);
    if(method==="GET")url.searchParams.set(key,serialized);
    else body.set(key,serialized);
  }
  const response=await fetch(url.toString(),{
    method,
    headers:method==="POST"?{"Content-Type":"application/x-www-form-urlencoded"}:undefined,
    body:method==="POST"?body:undefined,
    cache:"no-store",
    signal:AbortSignal.timeout(15000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||"Meta Graph API request failed.");
  return data;
}

export async function getMetaIdentity(){
  const status=metaConfigStatus();
  if(!status.configured)return {ok:false,status};
  const me=await graphRequest("me","GET",{fields:"id,name"});
  return {ok:true,status,me};
}

export async function createInstagramContainer(input:{
  mediaUrl:string;
  mediaType:"image"|"video";
  caption:string;
  altText?:string;
}){
  requireWriteConfig();
  if(!igId())throw new Error("META_INSTAGRAM_ACCOUNT_ID is not configured.");
  const params:Record<string,unknown>={caption:input.caption};
  if(input.mediaType==="video"){
    params.video_url=input.mediaUrl;
    params.media_type="REELS";
  }else{
    params.image_url=input.mediaUrl;
    if(input.altText)params.alt_text=input.altText;
  }
  const created=await graphRequest(igId()+"/media","POST",params);
  return {containerId:String(created.id||"")};
}

export async function getInstagramContainerStatus(containerId:string){
  const data=await graphRequest(containerId,"GET",{fields:"status_code,status"});
  return {statusCode:String(data.status_code||""),status:String(data.status||"")};
}

export async function publishInstagramContainer(containerId:string){
  requireWriteConfig();
  if(!igId())throw new Error("META_INSTAGRAM_ACCOUNT_ID is not configured.");
  const data=await graphRequest(igId()+"/media_publish","POST",{creation_id:containerId});
  return {mediaId:String(data.id||"")};
}

export async function publishFacebookOrganic(input:{
  mediaType:"image"|"video";
  mediaUrl?:string;
  message:string;
  link?:string;
}){
  requireWriteConfig();
  if(!pageId())throw new Error("META_PAGE_ID is not configured.");
  if(input.mediaType==="video")throw new Error("Facebook organic video publishing is not enabled in this COMIT adapter yet.");
  if(input.mediaUrl){
    const data=await graphRequest(pageId()+"/photos","POST",{url:input.mediaUrl,caption:input.message,published:true});
    return {postId:String(data.post_id||data.id||"")};
  }
  const data=await graphRequest(pageId()+"/feed","POST",{message:input.message,link:input.link||undefined});
  return {postId:String(data.id||"")};
}

function enhancementSpec(flags:{text_generation?:boolean;image_uncrop?:boolean;image_background_gen?:boolean}){
  const creative_features_spec:Record<string,unknown>={};
  if(flags.text_generation)creative_features_spec.text_generation={enroll_status:"OPT_IN"};
  if(flags.image_uncrop)creative_features_spec.image_uncrop={enroll_status:"OPT_IN"};
  if(flags.image_background_gen)creative_features_spec.image_background_gen={enroll_status:"OPT_IN"};
  return Object.keys(creative_features_spec).length?{creative_features_spec}:null;
}

export async function createPausedMetaAd(input:{
  name:string;
  adSetId:string;
  message:string;
  headline:string;
  description?:string;
  destinationUrl:string;
  sourceAssetUrl?:string;
  imageHash?:string;
  videoId?:string;
  thumbnailUrl?:string;
  existingPostId?:string;
  cta:string;
  enhancements?:{text_generation?:boolean;image_uncrop?:boolean;image_background_gen?:boolean};
}){
  requireWriteConfig();
  if(!adAccountId())throw new Error("META_AD_ACCOUNT_ID is not configured.");
  if(!pageId())throw new Error("META_PAGE_ID is not configured.");
  if(!input.adSetId)throw new Error("A Meta ad set ID is required.");

  let objectStorySpec:Record<string,unknown>|undefined;
  let creativeParams:Record<string,unknown>;

  if(input.existingPostId){
    creativeParams={name:input.name,object_story_id:input.existingPostId};
  }else if(input.videoId){
    if(!input.destinationUrl)throw new Error("A destination URL is required for a new video ad.");
    objectStorySpec={
      page_id:pageId(),
      ...(igId()?{instagram_user_id:igId()}:{}),
      video_data:{
        video_id:input.videoId,
        title:input.headline,
        message:input.message,
        link_description:input.description||undefined,
        image_url:input.thumbnailUrl||undefined,
        call_to_action:{type:input.cta,value:{link:input.destinationUrl}}
      }
    };
    creativeParams={name:input.name,object_story_spec:objectStorySpec};
  }else{
    if(!input.destinationUrl)throw new Error("A destination URL is required for a new link ad.");
    if(!input.sourceAssetUrl&&!input.imageHash)throw new Error("A source asset URL or Meta image hash is required.");
    const linkData:Record<string,unknown>={
      link:input.destinationUrl,
      message:input.message,
      name:input.headline,
      description:input.description||undefined,
      call_to_action:{type:input.cta,value:{link:input.destinationUrl}}
    };
    if(input.imageHash)linkData.image_hash=input.imageHash;
    else linkData.picture=input.sourceAssetUrl;
    objectStorySpec={
      page_id:pageId(),
      ...(igId()?{instagram_user_id:igId()}:{}),
      link_data:linkData
    };
    creativeParams={name:input.name,object_story_spec:objectStorySpec};
  }

  const enhancement=enhancementSpec(input.enhancements||{});
  if(enhancement)creativeParams.degrees_of_freedom_spec=enhancement;

  const creative=await graphRequest("act_"+adAccountId()+"/adcreatives","POST",creativeParams);
  const creativeId=String(creative.id||"");
  if(!creativeId)throw new Error("Meta did not return an ad creative ID.");

  const ad=await graphRequest("act_"+adAccountId()+"/ads","POST",{
    name:input.name,
    adset_id:input.adSetId,
    creative:{creative_id:creativeId},
    status:"PAUSED"
  });
  return {adId:String(ad.id||""),creativeId};
}

export async function getMetaAdPreview(adId:string){
  const data=await graphRequest(adId,"GET",{
    fields:"id,name,status,effective_status,preview_shareable_link,issues_info,creative{asset_feed_spec,status,thumbnail_url}"
  });
  return data;
}

export async function activateMetaAd(adId:string){
  requireWriteConfig();
  const data=await graphRequest(adId,"POST",{status:"ACTIVE"});
  return {success:Boolean(data.success??true),adId};
}

export async function pauseMetaAd(adId:string){
  requireWriteConfig();
  const data=await graphRequest(adId,"POST",{status:"PAUSED"});
  return {success:Boolean(data.success??true),adId};
}

export async function getMetaInsights(objectId:string){
  const data=await graphRequest(objectId+"/insights","GET",{
    fields:"impressions,reach,clicks,spend,cpm,cpc,ctr,actions,cost_per_action_type",
    date_preset:"last_7d"
  });
  return data;
}

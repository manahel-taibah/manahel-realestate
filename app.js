import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.MANAHEL_CONFIG||{};
const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);
const db=configured?createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
const $=id=>document.getElementById(id);
const sample=[{id:'demo1',title:'أرض سكنية في الرذايا',property_type:'أرض',city:'المدينة المنورة',district:'الرذايا',price:10000000,area:65691,description:'على طريق المدينة القصيم القديم — عرض توضيحي، يرجى التأكد من التوفر.',image_url:null,is_published:true},{id:'demo2',title:'دور في حي الرانوناء',property_type:'دور',city:'المدينة المنورة',district:'الرانوناء',price:1400000,area:418,description:'سبع غرف وتأسيس مصعد — عرض توضيحي، يرجى التأكد من التوفر.',image_url:null,is_published:true},{id:'demo3',title:'فيلا وثلاث شقق مستقلة',property_type:'فيلا',city:'المدينة المنورة',district:'الدفاع',price:2300000,area:524.44,description:'فيلا مع شقق مستقلة — عرض توضيحي، يرجى التأكد من التوفر.',image_url:null,is_published:true}];
let listings=[],requests=[],session=null,authorized=false;
let imageRows=[],galleryItems=[],galleryIndex=0;
const detailFields=['bedrooms','living_rooms','bathrooms','floors','street_width','property_age','facing','furnishing','features'];
const detailNumbers=['bedrooms','living_rooms','bathrooms','floors','street_width','property_age'];
function renderPropertyDetails(x){
 const items=[['غرف النوم',x.bedrooms],['الصالات',x.living_rooms],['دورات المياه',x.bathrooms],['الأدوار',x.floors],['عرض الشارع',x.street_width!=null?x.street_width+' م':null],['عمر العقار',x.property_age!=null?x.property_age+' سنة':null],['الواجهة',x.facing],['التأثيث',x.furnishing]];
 if(x.has_elevator)items.push(['المصعد','متوفر']);if(x.has_parking)items.push(['موقف سيارات','متوفر']);
 const populated=items.filter(([,v])=>v!==null&&v!==undefined&&v!=='');
 if(!populated.length&&!x.features)return null;
 const details=el('details','property-details'),summary=el('summary','','المواصفات التفصيلية');details.append(summary);
 const grid=el('div','details-grid');for(const [label,value] of populated){const cell=el('div','detail-cell');cell.append(el('small','',label),el('strong','',String(value)));grid.append(cell)}details.append(grid);
 if(x.features){const feature=el('p','detail-features',x.features);details.append(feature)}return details;
}
const format=n=>n===null||n===undefined||n===''?'السعر عند التواصل':new Intl.NumberFormat('ar-SA').format(n)+' ريال';
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const validHttp=u=>{try{return ['https:','http:'].includes(new URL(u).protocol)}catch{return false}};
function setStatus(id,msg,error=false){const node=$(id);node.textContent=msg;node.className='status '+(error?'error':'success')}

async function loadImages(){
  if(!db){imageRows=[];return}
  const {data,error}=await db.from('property_images').select('id,property_id,image_url,storage_path,sort_order').order('sort_order',{ascending:true});
  if(error){console.error('Gallery loading:',error);imageRows=[];return}
  imageRows=data||[];
}
function photosFor(x){
  const arr=[];
  if(x.image_url&&validHttp(x.image_url))arr.push({url:x.image_url,id:null});
  for(const r of imageRows.filter(r=>r.property_id===x.id))if(validHttp(r.image_url)&&!arr.some(p=>p.url===r.image_url))arr.push({url:r.image_url,id:r.id,storage_path:r.storage_path});
  return arr;
}
function galleryRender(){
  if(!galleryItems.length)return;
  const photo=galleryItems[galleryIndex];$('galleryMain').src=photo.url;$('galleryMain').alt='صورة '+(galleryIndex+1);
  $('galleryCounter').textContent=(galleryIndex+1)+' / '+galleryItems.length;
  $('galleryPrev').hidden=$('galleryNext').hidden=galleryItems.length<2;
  const thumbs=$('galleryThumbs');thumbs.replaceChildren();
  galleryItems.forEach((p,i)=>{const b=el('button',i===galleryIndex?'active':'');b.type='button';b.setAttribute('aria-label','عرض الصورة '+(i+1));const im=el('img');im.src=p.url;im.alt='صورة مصغرة '+(i+1);im.loading='lazy';b.append(im);b.onclick=()=>{galleryIndex=i;galleryRender()};thumbs.append(b)});
}
function openGallery(x){galleryItems=photosFor(x);if(!galleryItems.length)return;galleryIndex=0;$('galleryTitle').textContent=x.title;galleryRender();$('galleryDialog').showModal()}
$('galleryClose').onclick=()=>$('galleryDialog').close();
$('galleryPrev').onclick=()=>{galleryIndex=(galleryIndex-1+galleryItems.length)%galleryItems.length;galleryRender()};
$('galleryNext').onclick=()=>{galleryIndex=(galleryIndex+1)%galleryItems.length;galleryRender()};
$('galleryDialog').addEventListener('click',e=>{if(e.target===$('galleryDialog'))$('galleryDialog').close()});
document.addEventListener('keydown',e=>{if(!$('galleryDialog').open)return;if(e.key==='ArrowLeft')$('galleryNext').click();if(e.key==='ArrowRight')$('galleryPrev').click()});
function previewSelected(){const root=$('galleryPreview');root.replaceChildren();const files=Array.from($('galleryFiles').files);files.forEach(file=>{const node=el('div','preview-item'),img=el('img'),url=URL.createObjectURL(file);img.src=url;img.alt=file.name;img.onload=()=>URL.revokeObjectURL(url);node.append(img,el('span','',file.name));root.append(node)})}
$('galleryFiles').addEventListener('change',previewSelected);
async function renderExistingImages(x){
 const root=$('existingImages');root.replaceChildren();if(!x)return;
 const rows=imageRows.filter(r=>r.property_id===x.id);
 if(rows.length)root.append(el('p','','الصور الإضافية الحالية (حذف الصورة نهائي):'));
 for(const r of rows){const item=el('div','preview-item'),img=el('img'),btn=el('button','','حذف الصورة');img.src=r.image_url;img.alt='صورة إضافية';btn.type='button';btn.onclick=async()=>{if(!confirm('حذف هذه الصورة من العقار نهائيًا؟'))return;btn.disabled=true;const {error}=await db.from('property_images').delete().eq('id',r.id);if(error){alert('تعذر حذف الصورة');btn.disabled=false;return}if(r.storage_path){const {error:storageError}=await db.storage.from('property-images').remove([r.storage_path]);if(storageError)console.warn('تعذر إزالة الملف من التخزين',storageError)}await loadImages();renderExistingImages(x);await loadPublic()};item.append(img,btn);root.append(item)}
}

function renderListings(){const city=$('filterCity').value,type=$('filterType').value,max=Number($('filterMax').value),q=$('filterText').value.trim().toLowerCase();const filtered=listings.filter(x=>(!city||x.city===city)&&(!type||x.property_type===type)&&(!$('filterMax').value||(x.price!==null&&Number(x.price)<=max))&&(!q||[x.title,x.district,x.city,x.description].join(' ').toLowerCase().includes(q)));const root=$('listingsGrid');root.replaceChildren();$('listingCount').textContent=filtered.length+' عرض';$('emptyListings').hidden=filtered.length>0;for(const x of filtered){const card=el('article','property-card'),pic=el('div','property-image');if(x.image_url&&validHttp(x.image_url)){const img=el('img');img.src=x.image_url;img.alt=x.title;img.loading='lazy';img.referrerPolicy='no-referrer';pic.append(img)}else pic.append(el('span','placeholder','⌂'));const photos=photosFor(x);if(photos.length){pic.tabIndex=0;pic.setAttribute('role','button');pic.setAttribute('aria-label','عرض صور '+x.title);pic.onclick=()=>openGallery(x);pic.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGallery(x)}};pic.append(el('span','photo-count',photos.length+' صورة'))}card.append(pic);const body=el('div','property-body');body.append(el('span','tag',x.property_type),el('h3','',x.title),el('p','',x.city+(x.district?' · '+x.district:'')));const meta=el('div','property-meta');if(x.area)meta.append(el('span','',new Intl.NumberFormat('ar-SA').format(x.area)+' م²'));if(x.ad_license)meta.append(el('span','','ترخيص إعلان: '+x.ad_license));body.append(meta,el('div','price',format(x.price)));if(x.description)body.append(el('p','',x.description.slice(0,160)));const detailView=renderPropertyDetails(x);if(detailView)body.append(detailView);const actions=el('div','property-actions'),wa=el('a','', 'استفسر عبر واتساب');wa.href='https://wa.me/'+cfg.whatsapp+'?text='+encodeURIComponent('مرحبًا، أرغب بالاستفسار عن العقار: '+x.title);wa.target='_blank';wa.rel='noopener';actions.append(wa);if(photos.length){const g=el('button','ghost','عرض الصور ('+photos.length+')');g.type='button';g.onclick=()=>openGallery(x);actions.append(g)}if(x.map_url&&validHttp(x.map_url)){const map=el('a','','عرض الموقع');map.href=x.map_url;map.target='_blank';map.rel='noopener';actions.append(map)}body.append(actions);card.append(body);root.append(card)}}
async function loadPublic(){if(!db){listings=sample;renderListings();return}const {data,error}=await db.from('properties').select('*').eq('is_published',true).order('created_at',{ascending:false});if(error){console.error(error);$('emptyListings').textContent='تعذر تحميل العروض حاليًا.';listings=[]}else listings=data||[];await loadImages();renderListings()}
['filterCity','filterType','filterMax','filterText'].forEach(id=>$(id).addEventListener('input',renderListings));
$('requestForm').addEventListener('submit',async e=>{e.preventDefault();if(!db){setStatus('requestStatus','الموقع في وضع المعاينة. اربط Supabase لتفعيل حفظ الطلبات.',true);return}const f=e.currentTarget,data=Object.fromEntries(new FormData(f));if(!/^\+?\d[\d\s-]{7,17}$/.test(data.phone.trim())){setStatus('requestStatus','يرجى إدخال رقم جوال صحيح.',true);return}const payload={full_name:data.full_name.trim(),phone:data.phone.trim(),property_type:data.property_type,city:data.city,district:data.district||null,budget:data.budget?Number(data.budget):null,notes:data.notes||null};const btn=f.querySelector('[type=submit]');btn.disabled=true;const {error}=await db.from('property_requests').insert(payload);btn.disabled=false;if(error)setStatus('requestStatus','تعذر إرسال الطلب، حاول مرة أخرى لاحقًا.',true);else{f.reset();setStatus('requestStatus','تم استلام طلبك بنجاح. شكرًا لتواصلك.')}});
function showAdmin(open){$('publicView').hidden=open;$('adminView').hidden=!open;window.scrollTo(0,0);if(open)checkAuth()}
$('adminToggle').onclick=()=>showAdmin(true);$('backPublic').onclick=()=>showAdmin(false);
async function checkAuth(){if(!db){$('loginPanel').hidden=false;$('adminPanel').hidden=true;setStatus('loginStatus','لتفعيل لوحة التحكم، أضف إعدادات Supabase في config.js.',true);return}const {data}=await db.auth.getSession();session=data.session;authorized=false;if(session){const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();authorized=!!admin} $('loginPanel').hidden=authorized;$('adminPanel').hidden=!authorized;if(authorized)await loadAdmin();else if(session)setStatus('loginStatus','هذا الحساب غير مخوّل بإدارة الموقع.',true)}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!db)return;const data=Object.fromEntries(new FormData(e.currentTarget));setStatus('loginStatus','جارٍ التحقق...');const {error}=await db.auth.signInWithPassword({email:data.email,password:data.password});if(error){setStatus('loginStatus','بيانات الدخول غير صحيحة أو تعذر تسجيل الدخول.',true);return}await checkAuth()});
$('logoutBtn').onclick=async()=>{await db.auth.signOut();session=null;authorized=false;$('adminPanel').hidden=true;$('loginPanel').hidden=false};
async function loadAdmin(){if(!authorized)return;const [p,r]=await Promise.all([db.from('properties').select('*').order('created_at',{ascending:false}),db.from('property_requests').select('*').order('created_at',{ascending:false})]);if(p.error||r.error){setStatus('editorStatus','تعذر تحميل البيانات. تحقق من صلاحيات قاعدة البيانات.',true);return}listings=p.data||[];requests=r.data||[];await loadImages();$('statListings').textContent=listings.length;$('statRequests').textContent=requests.length;renderAdmin();}
function renderAdmin(){const lp=$('adminListings');lp.replaceChildren();for(const x of listings){const item=el('div','admin-item');item.append(el('strong','',x.title),el('small','',x.city+' · '+format(x.price)+' · '+(x.is_published?'منشور':'مخفي')));const actions=el('div','actions'),edit=el('button','','تعديل'),del=el('button','danger','حذف');edit.onclick=()=>editListing(x);del.onclick=()=>deleteListing(x);actions.append(edit,del);item.append(actions);lp.append(item)}if(!listings.length)lp.append(el('p','','لا توجد عروض بعد.'));const rr=$('adminRequests');rr.replaceChildren();for(const x of requests){const item=el('div','admin-item');item.append(el('strong','',x.full_name+' — '+x.phone),el('small','',x.property_type+' · '+x.city+(x.district?' · '+x.district:'')),el('p','',`الميزانية: ${format(x.budget)} | ${x.notes||'لا توجد ملاحظات'}`));const status=el('select');for(const val of ['جديد','قيد المتابعة','مكتمل']){const op=el('option','',val);op.value=val;status.append(op)}status.value=x.status||'جديد';status.onchange=async()=>{const {error}=await db.from('property_requests').update({status:status.value}).eq('id',x.id);if(error)alert('تعذر تحديث الحالة')};item.append(status);rr.append(item)}if(!requests.length)rr.append(el('p','','لا توجد طلبات بعد.'))}
function editListing(x){const f=$('listingForm');for(const key of ['id','title','property_type','city','district','price','area','ad_license','description','map_url','image_url'])f.elements[key].value=x[key]??'';for(const key of detailFields)f.elements[key].value=x[key]??'';f.elements.has_elevator.checked=!!x.has_elevator;f.elements.has_parking.checked=!!x.has_parking;f.elements.is_published.checked=!!x.is_published;$('editorTitle').textContent='تعديل العرض العقاري';$('galleryFiles').value='';$('galleryPreview').replaceChildren();renderExistingImages(x);f.scrollIntoView({behavior:'smooth',block:'start'})}
function clearEditor(){const f=$('listingForm');f.reset();f.elements.id.value='';$('editorTitle').textContent='إضافة عرض عقاري';$('galleryPreview').replaceChildren();$('existingImages').replaceChildren();setStatus('editorStatus','')}$('clearEditor').onclick=clearEditor;
async function deleteListing(x){if(!confirm('هل تريد حذف العرض: '+x.title+'؟'))return;const {error}=await db.from('properties').delete().eq('id',x.id);if(error)alert('تعذر حذف العرض');else{await loadAdmin();await loadPublic()}}
$('listingForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!authorized)return;
 const f=e.currentTarget,raw=Object.fromEntries(new FormData(f)),id=raw.id;
 const payload={title:raw.title.trim(),property_type:raw.property_type,city:raw.city.trim(),district:raw.district||null,price:raw.price?Number(raw.price):null,area:raw.area?Number(raw.area):null,ad_license:raw.ad_license||null,description:raw.description||null,map_url:raw.map_url||null,image_url:raw.image_url||null,is_published:f.elements.is_published.checked};
 for(const key of detailNumbers)payload[key]=raw[key]===''||raw[key]===undefined?null:Number(raw[key]);for(const key of ['facing','furnishing','features'])payload[key]=raw[key]?.trim()||null;payload.has_elevator=f.elements.has_elevator.checked;payload.has_parking=f.elements.has_parking.checked;
 const cover=$('imageFile').files[0],extras=Array.from($('galleryFiles').files);
 const btn=f.querySelector('[type=submit]');btn.disabled=true;setStatus('editorStatus','جارٍ حفظ العرض...');
 try{
  const files=[...(cover?[cover]:[]),...extras];
  for(const file of files)if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('الصور يجب أن تكون JPG أو PNG أو WebP، وبحجم لا يتجاوز 5MB للصورة');
  if(cover){const ext=cover.type==='image/png'?'png':cover.type==='image/webp'?'webp':'jpg';const path=crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('property-images').upload(path,cover,{contentType:cover.type,upsert:false});if(error)throw error;payload.image_url=db.storage.from('property-images').getPublicUrl(path).data.publicUrl}
  const result=id?await db.from('properties').update(payload).eq('id',id).select('id').single():await db.from('properties').insert(payload).select('id').single();
  if(result.error)throw result.error;
  const propertyId=result.data.id;
  let nextOrder=Math.max(-1,...imageRows.filter(r=>r.property_id===propertyId).map(r=>Number(r.sort_order)||0))+1;
  let uploaded=0;
  for(const file of extras){
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=propertyId+'/'+crypto.randomUUID()+'.'+ext;
   const {error:uploadError}=await db.storage.from('property-images').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw new Error('حُفظ العقار، لكن تعذر رفع الصورة '+(uploaded+1)+': '+uploadError.message);
   const imageUrl=db.storage.from('property-images').getPublicUrl(path).data.publicUrl;
   const {error:rowError}=await db.from('property_images').insert({property_id:propertyId,image_url:imageUrl,storage_path:path,sort_order:nextOrder++});
   if(rowError){await db.storage.from('property-images').remove([path]);throw new Error('حُفظ العقار، لكن تعذر تسجيل صورة: '+rowError.message)}
   uploaded++;setStatus('editorStatus','تم رفع '+uploaded+' من '+extras.length+' صورة إضافية...');
  }
  clearEditor();setStatus('editorStatus','تم حفظ العرض والصور بنجاح');await loadAdmin();await loadPublic();
 }catch(err){console.error(err);setStatus('editorStatus',err.message||'تعذر حفظ العرض',true);await loadAdmin();await loadPublic()}finally{btn.disabled=false}
});

loadPublic();
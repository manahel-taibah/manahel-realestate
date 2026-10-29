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

function renderListings(){const city=$('filterCity').value,type=$('filterType').value,max=Number($('filterMax').value),q=$('filterText').value.trim().toLowerCase();const filtered=listings.filter(x=>(!city||x.city===city)&&(!type||x.property_type===type)&&(!$('filterMax').value||(x.price!==null&&Number(x.price)<=max))&&(!q||[x.title,x.district,x.city,x.description].join(' ').toLowerCase().includes(q)));const root=$('listingsGrid');root.replaceChildren();$('listingCount').textContent=filtered.length+' عرض';$('emptyListings').hidden=filtered.length>0;for(const x of filtered){const card=el('article','property-card'),pic=el('div','property-image');if(x.image_url&&validHttp(x.image_url)){const img=el('img');img.src=x.image_url;img.alt=x.title;img.loading='lazy';img.referrerPolicy='no-referrer';pic.append(img)}else pic.append(el('span','placeholder','⌂'));const photos=photosFor(x);if(photos.length){pic.tabIndex=0;pic.setAttribute('role','button');pic.setAttribute('aria-label','عرض صور '+x.title);pic.onclick=()=>openGallery(x);pic.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGallery(x)}};pic.append(el('span','photo-count',photos.length+' صورة'))}card.append(pic);const body=el('div','property-body');body.append(el('span','tag',x.property_type),el('h3','',x.title),el('p','',x.city+(x.district?' · '+x.district:'')));const meta=el('div','property-meta');if(x.area)meta.append(el('span','',new Intl.NumberFormat('ar-SA').format(x.area)+' م²'));if(x.ad_license)meta.append(el('span','','ترخيص إعلان: '+x.ad_license));body.append(meta,el('div','price',format(x.price)));if(x.description)body.append(el('p','',x.description.slice(0,160)));const detailView=renderPropertyDetails(x);if(detailView)body.append(detailView);const actions=el('div','property-actions');const detailButton=el('button','ghost','عرض التفاصيل');detailButton.type='button';detailButton.onclick=()=>navigateProperty(x.id);actions.append(detailButton);const wa=el('a','', 'استفسر عبر واتساب');wa.href='https://wa.me/'+cfg.whatsapp+'?text='+encodeURIComponent('مرحبًا، أرغب بالاستفسار عن العقار: '+x.title);wa.target='_blank';wa.rel='noopener';actions.append(wa);const shareCard=el('a','','مشاركة العقار');shareCard.href='https://wa.me/?text='+encodeURIComponent(x.title+'\n'+propertyLink(x.id));shareCard.target='_blank';shareCard.rel='noopener';shareCard.setAttribute('aria-label','مشاركة '+x.title+' عبر واتساب');actions.append(shareCard);if(photos.length){const g=el('button','ghost','عرض الصور ('+photos.length+')');g.type='button';g.onclick=()=>openGallery(x);actions.append(g)}if(x.map_url&&validHttp(x.map_url)){const map=el('a','','عرض الموقع');map.href=x.map_url;map.target='_blank';map.rel='noopener';actions.append(map)}body.append(actions);card.append(body);root.append(card)}}
async function loadPublic(){if(!db){listings=sample;renderListings();return}const {data,error}=await db.from('properties').select('*').eq('is_published',true).order('created_at',{ascending:false});if(error){console.error(error);$('emptyListings').textContent='تعذر تحميل العروض حاليًا.';listings=[]}else listings=data||[];await loadImages();renderListings();renderPropertyRoute()}
['filterCity','filterType','filterMax','filterText'].forEach(id=>$(id).addEventListener('input',renderListings));
$('requestForm').addEventListener('submit',async e=>{e.preventDefault();if(!db){setStatus('requestStatus','الموقع في وضع المعاينة. اربط Supabase لتفعيل حفظ الطلبات.',true);return}const f=e.currentTarget,data=Object.fromEntries(new FormData(f));if(!/^\+?\d[\d\s-]{7,17}$/.test(data.phone.trim())){setStatus('requestStatus','يرجى إدخال رقم جوال صحيح.',true);return}const payload={full_name:data.full_name.trim(),phone:data.phone.trim(),property_type:data.property_type,city:data.city,district:data.district||null,budget:data.budget?Number(data.budget):null,notes:data.notes||null};const btn=f.querySelector('[type=submit]');btn.disabled=true;const {error}=await db.from('property_requests').insert(payload);btn.disabled=false;if(error)setStatus('requestStatus','تعذر إرسال الطلب، حاول مرة أخرى لاحقًا.',true);else{f.reset();setStatus('requestStatus','تم استلام طلبك بنجاح. شكرًا لتواصلك.')}});
function showAdmin(open){$('publicView').hidden=open;$('adminView').hidden=!open;window.scrollTo(0,0);if(open)checkAuth()}
$('adminToggle').onclick=()=>showAdmin(true);$('backPublic').onclick=()=>showAdmin(false);
async function checkAuth(){if(!db){$('loginPanel').hidden=false;$('adminPanel').hidden=true;setStatus('loginStatus','لتفعيل لوحة التحكم، أضف إعدادات Supabase في config.js.',true);return}const {data}=await db.auth.getSession();session=data.session;authorized=false;if(session){const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();authorized=!!admin} $('loginPanel').hidden=authorized;$('adminPanel').hidden=!authorized;if(authorized)await loadAdmin();else if(session)setStatus('loginStatus','هذا الحساب غير مخوّل بإدارة الموقع.',true)}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!db)return;const data=Object.fromEntries(new FormData(e.currentTarget));setStatus('loginStatus','جارٍ التحقق...');const {error}=await db.auth.signInWithPassword({email:data.email,password:data.password});if(error){setStatus('loginStatus','بيانات الدخول غير صحيحة أو تعذر تسجيل الدخول.',true);return}await checkAuth()});
$('logoutBtn').onclick=async()=>{await db.auth.signOut();session=null;authorized=false;$('adminPanel').hidden=true;$('loginPanel').hidden=false};
async function loadAdmin(){if(!authorized)return;const [p,r]=await Promise.all([db.from('properties').select('*').order('created_at',{ascending:false}),db.from('property_requests').select('*').order('created_at',{ascending:false})]);if(p.error||r.error){setStatus('editorStatus','تعذر تحميل البيانات. تحقق من صلاحيات قاعدة البيانات.',true);return}listings=p.data||[];requests=r.data||[];await loadImages();$('statListings').textContent=listings.length;$('statRequests').textContent=requests.length;renderDashboard();renderAdmin();setupAdminNavigation();await loadCrmContacts();}

// Admin navigation is created only after authorization; existing forms remain untouched.
function setupAdminNavigation(){
 const panel=$('adminPanel');if(!panel||!authorized)return;
 let nav=$('manahelAdminNav');
 if(!nav){
  const content=el('div','manahel-admin-content');content.id='manahelAdminContent';
  while(panel.firstChild)content.append(panel.firstChild);
  nav=el('nav','manahel-admin-nav');nav.id='manahelAdminNav';nav.setAttribute('aria-label','التنقل في لوحة الإدارة');
  const heading=el('strong','manahel-admin-nav-title','إدارة مناهل طيبة');nav.append(heading);
  const items=[['الإحصائيات','manahelDashboard'],['إضافة عقار','listingForm'],['إدارة العروض','adminListings'],['طلبات العملاء','adminRequests'],['سجل العملاء','crmContactsSection']];
  for(const [label,id] of items){const button=el('button','manahel-admin-nav-link',label);button.type='button';button.onclick=()=>{const target=$(id);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));button.classList.add('active')}};nav.append(button)}
  const newRequests=el('div','manahel-new-requests');newRequests.id='manahelNewRequests';nav.append(newRequests);
  panel.classList.add('manahel-admin-layout');panel.append(nav,content);
 }
 const count=requests.filter(x=>!x.status||x.status==='جديد').length;
 const indicator=$('manahelNewRequests');if(indicator){indicator.textContent='الطلبات الجديدة: '+count;indicator.classList.toggle('has-new',count>0)}
}

// Read-only dashboard: uses the same authorized data already loaded for the admin panel.
function renderDashboard(){
 const panel=$('adminPanel');if(!panel||!authorized)return;
 let dash=$('manahelDashboard');
 if(!dash){dash=el('section','manahel-dashboard');dash.id='manahelDashboard';dash.setAttribute('aria-label','ملخص لوحة التحكم');
 const toolbar=panel.querySelector('.admin-toolbar');if(toolbar)toolbar.insertAdjacentElement('afterend',dash);else panel.prepend(dash)}
 dash.replaceChildren();
 const heading=el('div','dash-heading');heading.append(el('h3','','نظرة عامة على النشاط'),el('p','','إحصائيات مباشرة من العقارات والطلبات المسجلة'));dash.append(heading);
 const published=listings.filter(x=>x.is_published===true).length;
 const statuses=[['جديد',requests.filter(x=>!x.status||x.status==='جديد').length],['قيد المتابعة',requests.filter(x=>x.status==='قيد المتابعة').length],['مكتمل',requests.filter(x=>x.status==='مكتمل').length]];
 const cards=el('div','dash-cards');
 for(const [label,value] of [['إجمالي العقارات',listings.length],['العقارات المنشورة',published],['العقارات غير المنشورة',listings.length-published],['إجمالي الطلبات',requests.length],['الطلبات الجديدة',statuses[0][1]],['قيد المتابعة',statuses[1][1]]]){
  const card=el('div','dash-stat');card.append(el('span','dash-stat-label',label),el('strong','dash-stat-value',String(value)));cards.append(card)}
 dash.append(cards);
 const sections=el('div','dash-sections');
 const statusBox=el('div','dash-panel');statusBox.append(el('h4','','حالات الطلبات'));
 for(const [name,count] of statuses){const line=el('div','dash-status-row');line.append(el('span','',name),el('b','',String(count)));const track=el('div','dash-track');const fill=el('div','dash-fill');fill.style.width=(requests.length?Math.round(count/requests.length*100):0)+'%';track.append(fill);statusBox.append(line,track)}
 const latest=el('div','dash-panel');latest.append(el('h4','','أحدث العقارات المضافة'));
 const recent=listings.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,5);
 if(!recent.length)latest.append(el('p','dash-empty','لا توجد عقارات مسجلة بعد.'));
 for(const x of recent){const line=el('div','dash-recent');line.append(el('strong','',x.title||'عقار بدون عنوان'),el('span','',x.is_published?'منشور':'غير منشور'));latest.append(line)}
 sections.append(statusBox,latest);dash.append(sections);
}
function renderRequestItems(){
 const rr=$('adminRequests');if(!rr)return;
 const tools=rr.previousElementSibling;
 const search=tools?.querySelector('.request-search')?.value.trim().toLocaleLowerCase('ar')||'';
 const filter=tools?.querySelector('.request-filter')?.value||'';
 const shown=requests.filter(x=>(!filter||(x.status||'جديد')===filter)&&(!search||String(x.full_name||'').toLocaleLowerCase('ar').includes(search)||String(x.phone||'').includes(search)));
 rr.replaceChildren();
 const count=tools?.querySelector('.request-result-count');if(count)count.textContent=`النتائج: ${shown.length} من ${requests.length}`;
 for(const x of shown){
  const item=el('div','admin-item request-item');
  item.append(el('strong','',`${x.full_name} — ${x.phone}`),el('small','',`${x.property_type||''} · ${x.city||''}${x.district?' · '+x.district:''}`),el('p','',`الميزانية: ${format(x.budget)} | ${x.notes||'لا توجد ملاحظات من العميل'}`));
  if(x.created_at){const d=new Date(x.created_at);if(!Number.isNaN(d.getTime()))item.append(el('small','',`تاريخ الاستلام: ${d.toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}`))}
  const actions=el('div','request-actions');
  const status=el('select');status.setAttribute('aria-label','حالة طلب '+x.full_name);
  for(const val of ['جديد','قيد المتابعة','مكتمل']){const op=el('option','',val);op.value=val;status.append(op)}status.value=x.status||'جديد';
  status.onchange=async()=>{status.disabled=true;const stamp=new Date().toISOString();const {error}=await db.from('property_requests').update({status:status.value,updated_at:stamp}).eq('id',x.id);status.disabled=false;if(error){alert('تعذر تحديث الحالة: تحقق من صلاحيات التعديل');status.value=x.status||'جديد'}else{x.status=status.value;x.updated_at=stamp;renderDashboard();setupAdminNavigation();renderRequestItems()}};
  actions.append(status);
  const phone=String(x.phone||'').replace(/[^\d]/g,'');const normalized=phone.startsWith('0')?'966'+phone.slice(1):phone;
  if(normalized.length>=9&&normalized.length<=15){const wa=el('a','request-whatsapp','واتساب العميل');wa.href='https://wa.me/'+encodeURIComponent(normalized);wa.target='_blank';wa.rel='noopener noreferrer';actions.append(wa)}
  item.append(actions);
  const notesLabel=el('label','request-note-label','ملاحظات المتابعة الداخلية');const memo=el('textarea','request-memo');memo.rows=2;memo.value=x.follow_up_notes||'';memo.placeholder='سجل تفاصيل التواصل والخطوة القادمة';
  const save=el('button','request-save','حفظ الملاحظات');save.type='button';const feedback=el('small','request-feedback');
   // Keep the button state in sync with the current textarea and the last saved value.
   let savedMemo=String(x.follow_up_notes||'');
   let saving=false;
   const updateSaveState=()=>{
     const changed=memo.value!==savedMemo;
     save.disabled=saving||!changed;
     save.setAttribute('aria-disabled',String(save.disabled));
     // Explicit visual state avoids inherited muted/disabled styles on mobile.
     save.style.opacity=save.disabled?'0.5':'1';
     save.style.cursor=save.disabled?'not-allowed':'pointer';
     save.style.backgroundColor=save.disabled?'#e9edf3':'#0b2444';
     save.style.color=save.disabled?'#6b7280':'#ffffff';
     if(!saving)feedback.textContent=changed?'توجد تعديلات لم تُحفظ':'';
   };
   memo.addEventListener('input',updateSaveState);
   memo.addEventListener('change',updateSaveState);
   save.addEventListener('click',async()=>{
     if(saving||memo.value===savedMemo)return;
     saving=true;updateSaveState();feedback.textContent='جارٍ الحفظ...';
     const value=memo.value,stamp=new Date().toISOString();
     try{
       const {data,error}=await db.from('property_requests')
         .update({follow_up_notes:value,updated_at:stamp})
         .eq('id',x.id).select('id,follow_up_notes,updated_at').maybeSingle();
       if(error)throw error;
       if(!data)throw new Error('لم يتم تأكيد حفظ الطلب. تحقق من صلاحيات التعديل.');
       savedMemo=String(data.follow_up_notes||'');
       x.follow_up_notes=savedMemo;x.updated_at=data.updated_at;
       feedback.textContent='تم حفظ الملاحظات بنجاح';
     }catch(err){feedback.textContent='تعذر حفظ الملاحظات: '+(err?.message||'خطأ في الاتصال');}
     finally{
       saving=false;updateSaveState();
       if(memo.value===savedMemo)feedback.textContent='تم حفظ الملاحظات بنجاح';
     }
   });
   updateSaveState();
  item.append(notesLabel,memo,save,feedback);
  if(x.updated_at){const d=new Date(x.updated_at);if(!Number.isNaN(d.getTime()))item.append(el('small','',`آخر تحديث: ${d.toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}`))}
  rr.append(item);
 }
 if(!shown.length)rr.append(el('p','','لا توجد طلبات مطابقة للبحث.'));
}

// CRM: isolated admin-only module; does not change public listing or request flows.
let crmContacts=[],crmLinks=[];
const crmRoles=['مالك عقار','وسيط عقاري','مطور عقاري','مشترٍ','مستثمر','أخرى'];
function crmOption(value,label){const o=el('option','',label);o.value=value;return o}
function crmPhone(v){let x=String(v||'').replace(/[^\d]/g,'');if(x.startsWith('00'))x=x.slice(2);if(x.startsWith('0'))x='966'+x.slice(1);return x}
async function loadCrmContacts(){
 if(!authorized||!db)return;
 const root=ensureCrmSection();
 const [c,l]=await Promise.all([db.from('crm_contacts').select('*').order('created_at',{ascending:false}),db.from('crm_links').select('*')]);
 if(c.error||l.error){root.querySelector('.crm-status').textContent='تعذر تحميل سجل العملاء. نفّذ ملف crm_database.sql في Supabase أولًا وتحقق من الصلاحيات.';return}
 crmContacts=c.data||[];crmLinks=l.data||[];renderCrm();
}
function ensureCrmSection(){
 let root=$('crmContactsSection');if(root)return root;
 root=el('section','form-card crm-section');root.id='crmContactsSection';
 root.append(el('h3','','سجل العملاء العقاريين'),el('p','crm-intro','إدارة الملاك والوسطاء والمطورين والمشترين والمستثمرين. البيانات خاصة بالمسؤولين.'));
 const form=el('form','crm-form');form.id='crmContactForm';
 const id=el('input');id.type='hidden';id.name='id';form.append(id);
 const fields=el('div','crm-fields');
 const addField=(title,name,required=false)=>{const label=el('label','',title);const input=el('input');input.name=name;input.maxLength=name==='notes'?2000:160;input.required=required;label.append(input);fields.append(label);return input};
 addField('اسم العميل *','full_name',true);addField('رقم الجوال *','phone',true);
 const roleLabel=el('label','','تصنيف العميل *'),role=el('select');role.name='role';crmRoles.forEach(x=>role.append(crmOption(x,x)));roleLabel.append(role);fields.append(roleLabel);
 addField('المدينة','city');addField('الحي','district');
 const notesLabel=el('label','crm-notes-label','ملاحظات العميل الداخلية'),notes=el('textarea');notes.name='notes';notes.rows=3;notes.maxLength=2000;notesLabel.append(notes);
 const actions=el('div','crm-actions'),save=el('button','btn navy','حفظ العميل');save.type='submit';const cancel=el('button','ghost','إلغاء التعديل');cancel.type='button';cancel.onclick=()=>{form.reset();form.elements.id.value='';save.textContent='حفظ العميل'};actions.append(save,cancel);
 form.append(fields,notesLabel,actions);form.onsubmit=async e=>{
 e.preventDefault();if(!authorized)return;
 const fd=new FormData(form),key=String(fd.get('id')||'');const data={full_name:String(fd.get('full_name')||'').trim(),phone:String(fd.get('phone')||'').trim(),role:String(fd.get('role')),city:String(fd.get('city')||'').trim()||null,district:String(fd.get('district')||'').trim()||null,notes:String(fd.get('notes')||'').trim()||null};
 if(!data.full_name||!/^\+?[\d\s-]{8,20}$/.test(data.phone)){alert('تحقق من اسم العميل ورقم الجوال');return}
 save.disabled=true;const q=key?db.from('crm_contacts').update(data).eq('id',key):db.from('crm_contacts').insert(data);const {error}=await q;save.disabled=false;
 if(error){alert('تعذر حفظ العميل: '+error.message);return}form.reset();form.elements.id.value='';save.textContent='حفظ العميل';await loadCrmContacts();
 };
 const tools=el('div','crm-tools'),search=el('input');search.type='search';search.placeholder='بحث بالاسم أو الجوال';search.id='crmSearch';const filter=el('select');filter.id='crmRoleFilter';filter.append(crmOption('','جميع التصنيفات'));crmRoles.forEach(x=>filter.append(crmOption(x,x)));search.oninput=renderCrm;filter.onchange=renderCrm;tools.append(search,filter);
 const count=el('small','crm-count');count.id='crmCount';const items=el('div','crm-list');items.id='crmList';const status=el('p','crm-status');root.append(form,tools,count,items,status);
 const panel=$('manahelAdminContent')||$('adminPanel');panel.append(root);
 ensureCrmImporter(root);
 return root;
}

// Local-only contact import: preview first; no upload until the admin confirms.
let crmImportRows=[];
function crmParseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 text=String(text||'').replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
 else if(c===','&&!quoted){row.push(field);field=''}
 else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field=''}
 else field+=c;
 }
 if(quoted)throw new Error('ملف CSV يحتوي على علامات اقتباس غير مكتملة');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 if(!rows.length)return [];
 const norm=s=>String(s||'').trim().toLowerCase().replace(/[\s_\-]/g,'');
 const headers=rows[0].map(norm);
 const find=(names)=>headers.findIndex(h=>names.includes(h));
 const nameCol=find(['name','fullname','displayname','الاسم','اسمالعميل','الاسمالكامل','الاسمبالكامل']);
 const phoneCol=find(['phone','phonenumber','mobile','mobilenumber','telephone','رقمالجوال','الجوال','الهاتف','رقمالهاتف','رقمالموبايل']);
 if(nameCol<0||phoneCol<0)throw new Error('يجب أن يحتوي CSV على عمود الاسم وعمود رقم الجوال (Name, Phone)');
 const cityCol=find(['city','المدينة']),districtCol=find(['district','الحي']),roleCol=find(['role','category','التصنيف','الصفة']);
 return rows.slice(1).map(r=>({full_name:r[nameCol]||'',phone:r[phoneCol]||'',city:r[cityCol]||'',district:r[districtCol]||'',role:r[roleCol]||''}));
}
function crmParseVCF(text){
 const unfolded=String(text||'').replace(/\r\n[ \t]|\n[ \t]/g,'');const cards=unfolded.split(/BEGIN:VCARD/i).slice(1),out=[];
 for(const card of cards){const body=card.split(/END:VCARD/i)[0],lines=body.split(/\r?\n/);let name='',phone='';
  for(const line of lines){const pos=line.indexOf(':');if(pos<0)continue;const key=line.slice(0,pos).split(';')[0].toUpperCase(),val=line.slice(pos+1).trim();if(key==='FN'&&!name)name=val.replace(/\\n/gi,' ').replace(/\\,/g,',');if(key==='TEL'&&!phone)phone=val.replace(/^tel:/i,'')}
  if(name||phone)out.push({full_name:name,phone,city:'',district:'',role:''});
 }
 return out;
}
function ensureCrmImporter(root){
 if(root.querySelector('#crmImportPanel'))return;
 const panel=el('section','crm-import-panel');panel.id='crmImportPanel';panel.append(el('h4','','استيراد جهات الاتصال من الجوال'));
 panel.append(el('p','', 'اختر ملف VCF من جهات اتصال أندرويد، أو CSV يحتوي على عمودي Name وPhone. ستراجع البيانات قبل حفظها.'));
 const picker=el('input');picker.type='file';picker.accept='.vcf,.csv,text/vcard,text/csv';picker.setAttribute('aria-label','ملف جهات الاتصال');
 const role=el('select');role.setAttribute('aria-label','التصنيف الافتراضي');crmRoles.forEach(r=>role.append(crmOption(r,r)));
 const summary=el('p','crm-import-summary','لم يتم اختيار ملف بعد');const preview=el('div','crm-import-preview');
 const go=el('button','btn navy','استيراد السجلات الجديدة');go.type='button';go.disabled=true;
 const controls=el('div','crm-import-controls');controls.append(picker,role,go);panel.append(controls,summary,preview);
 root.querySelector('.crm-form').insertAdjacentElement('afterend',panel);
 let pending=[];
 function prepare(){
  const seen=new Set(crmContacts.map(c=>crmPhone(c.phone)).filter(Boolean));const local=new Set();let invalid=0,duplicate=0;
  pending=[];
  for(const r of crmImportRows){const name=String(r.full_name||'').trim().slice(0,160),phone=crmPhone(r.phone);if(!name||phone.length<9||phone.length>15){invalid++;continue}
   if(seen.has(phone)||local.has(phone)){duplicate++;continue}local.add(phone);
   pending.push({full_name:name,phone,role:crmRoles.includes(r.role)?r.role:role.value,city:String(r.city||'').trim().slice(0,160)||null,district:String(r.district||'').trim().slice(0,160)||null});
  }
  summary.textContent=`إجمالي السجلات: ${crmImportRows.length} | جاهزة للاستيراد: ${pending.length} | مكررة: ${duplicate} | غير مكتملة: ${invalid}`;
  preview.replaceChildren();for(const r of pending.slice(0,15)){preview.append(el('div','crm-import-preview-row',`${r.full_name} — ${r.phone} — ${r.role}`))}
  if(pending.length>15)preview.append(el('small','',`و${pending.length-15} سجلًا إضافيًا`));go.disabled=!pending.length;
 }
 picker.onchange=async()=>{
  crmImportRows=[];pending=[];go.disabled=true;preview.replaceChildren();const file=picker.files?.[0];if(!file){summary.textContent='لم يتم اختيار ملف';return}
  if(file.size>5*1024*1024){summary.textContent='الملف كبير جدًا (الحد 5 ميجابايت)';return}
  try{const data=await file.text();crmImportRows=/\.vcf$/i.test(file.name)?crmParseVCF(data):crmParseCSV(data);if(crmImportRows.length>5000)throw new Error('الحد الأقصى 5000 جهة اتصال في الملف الواحد');prepare()}
  catch(e){summary.textContent='تعذر قراءة الملف: '+e.message;crmImportRows=[]}
 };
 role.onchange=()=>{if(crmImportRows.length)prepare()};
 go.onclick=async()=>{
  if(!authorized||!pending.length)return;
  if(!confirm(`هل تريد حفظ ${pending.length} جهة اتصال جديدة في سجل العملاء؟`))return;
  go.disabled=true;picker.disabled=true;role.disabled=true;let saved=0;let failed=0;
  // One-by-one inserts avoid partial batch ambiguity and report exact progress.
  for(const record of pending){const {error}=await db.from('crm_contacts').insert(record);if(error){failed++;console.error('CRM import error:',error)}else saved++;summary.textContent=`جارٍ الاستيراد: تم حفظ ${saved}، تعذر ${failed}`}
  picker.disabled=false;role.disabled=false;crmImportRows=[];picker.value='';preview.replaceChildren();await loadCrmContacts();summary.textContent=`انتهى الاستيراد: ${saved} محفوظ، ${failed} تعذر حفظه. ${failed?'تحقق من صلاحيات قاعدة البيانات أو صحة السجلات.':''}`;
 };
}

function renderCrm(){
 const root=ensureCrmSection(),list=$('crmList'),search=($('crmSearch')?.value||'').trim().toLowerCase(),role=$('crmRoleFilter')?.value||'';list.replaceChildren();
 const found=crmContacts.filter(x=>(!role||x.role===role)&&(!search||[x.full_name,x.phone,x.city,x.district].join(' ').toLowerCase().includes(search)));
 $('crmCount').textContent=`النتائج: ${found.length} من ${crmContacts.length}`;
 for(const x of found){const card=el('article','crm-card');card.append(el('strong','',x.full_name+' — '+x.role),el('small','',x.phone+' · '+[x.city,x.district].filter(Boolean).join(' / ')));if(x.notes)card.append(el('p','',x.notes));
 const actions=el('div','crm-actions'),edit=el('button','ghost','تعديل');edit.type='button';edit.onclick=()=>{const form=$('crmContactForm');for(const k of ['id','full_name','phone','role','city','district','notes'])form.elements[k].value=x[k]||'';form.querySelector('[type=submit]').textContent='تحديث العميل';form.scrollIntoView({behavior:'smooth',block:'start'})};actions.append(edit);
 const number=crmPhone(x.phone);if(number.length>=9&&number.length<=15){const wa=el('a','crm-whatsapp','واتساب');wa.href='https://wa.me/'+number;wa.target='_blank';wa.rel='noopener noreferrer';actions.append(wa)}
 const del=el('button','ghost','حذف');del.type='button';del.onclick=async()=>{if(!confirm('هل تريد حذف سجل العميل وروابطه بالعقارات والطلبات؟'))return;const {error}=await db.from('crm_contacts').delete().eq('id',x.id);if(error)alert('تعذر الحذف: '+error.message);else await loadCrmContacts()};actions.append(del);card.append(actions);
 const links=el('div','crm-links'),heading=el('strong','','الربط بالعقارات والطلبات');links.append(heading);
 const existing=crmLinks.filter(z=>z.contact_id===x.id);for(const z of existing){const record=z.property_id?listings.find(p=>p.id===z.property_id):requests.find(r=>r.id===z.request_id);const line=el('div','crm-linked-row');line.append(el('span','',(z.property_id?'عقار: ':'طلب: ')+(record?.title||record?.full_name||'سجل مرتبط')));const remove=el('button','ghost','فك الربط');remove.type='button';remove.onclick=async()=>{const {error}=await db.from('crm_links').delete().eq('id',z.id);if(error)alert(error.message);else await loadCrmContacts()};line.append(remove);links.append(line)}
 const linkRow=el('div','crm-link-add'),kind=el('select');kind.append(crmOption('property','ربط بعقار'),crmOption('request','ربط بطلب'));const target=el('select');const fill=()=>{target.replaceChildren();const rows=kind.value==='property'?listings:requests;target.append(crmOption('','اختر السجل'));for(const r of rows)target.append(crmOption(r.id,r.title||r.full_name||r.id))};kind.onchange=fill;fill();const add=el('button','ghost','ربط');add.type='button';add.onclick=async()=>{if(!target.value)return;const payload={contact_id:x.id,property_id:kind.value==='property'?target.value:null,request_id:kind.value==='request'?target.value:null};const {error}=await db.from('crm_links').insert(payload);if(error)alert('تعذر الربط: '+error.message);else await loadCrmContacts()};linkRow.append(kind,target,add);links.append(linkRow);card.append(links);list.append(card)}
 if(!found.length)list.append(el('p','','لا توجد سجلات مطابقة.'));
}

function renderAdmin(){const lp=$('adminListings');lp.replaceChildren();for(const x of listings){const item=el('div','admin-item');item.append(el('strong','',x.title),el('small','',x.city+' · '+format(x.price)+' · '+(x.is_published?'منشور':'مخفي')));const actions=el('div','actions'),edit=el('button','','تعديل'),del=el('button','danger','حذف');edit.onclick=()=>editListing(x);del.onclick=()=>deleteListing(x);actions.append(edit,del);item.append(actions);lp.append(item)}if(!listings.length)lp.append(el('p','','لا توجد عروض بعد.'));const rr=$('adminRequests');
  if(!rr.dataset.enhanced){
    rr.dataset.enhanced='1';
    const tools=el('div','request-tools');
    const search=el('input','request-search');search.type='search';search.placeholder='بحث باسم العميل أو رقم الجوال';search.setAttribute('aria-label','بحث في الطلبات');
    const filter=el('select','request-filter');filter.setAttribute('aria-label','تصفية حسب حالة الطلب');
    for(const [value,label] of [['','كل الحالات'],['جديد','جديد'],['قيد المتابعة','قيد المتابعة'],['مكتمل','مكتمل']]){const op=el('option','',label);op.value=value;filter.append(op)}
    const count=el('small','request-result-count');
    tools.append(search,filter,count);
    rr.before(tools);
    search.addEventListener('input',()=>renderRequestItems());
    filter.addEventListener('change',()=>renderRequestItems());
  }
  renderRequestItems();}
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


// صفحات مستقلة للعقارات مع روابط قابلة للمشاركة، دون تغيير قاعدة البيانات.
function propertyLink(id){const u=new URL(window.location.href);u.searchParams.set('property',id);u.hash='';return u.href}
function navigateProperty(id){const u=new URL(window.location.href);u.searchParams.set('property',id);u.hash='';history.pushState({},'',u);showAdmin(false);renderPropertyRoute();window.scrollTo({top:0,behavior:'smooth'})}
function leaveProperty(){const u=new URL(window.location.href);u.searchParams.delete('property');u.hash='listings';history.pushState({},'',u);renderPropertyRoute();document.getElementById('listings').scrollIntoView({behavior:'smooth'})}
let propertyRouteVersion=0;
async function renderPropertyRoute(){
 const version=++propertyRouteVersion;
 const root=$('propertyPage');if(!root)return;
 const id=new URLSearchParams(window.location.search).get('property');
 const listingSection=$('listings');
 if(!id){root.hidden=true;listingSection.hidden=false;return}
 root.hidden=false;listingSection.hidden=true;root.replaceChildren();
 const back=el('button','ghost','← العودة لجميع العروض');back.type='button';back.onclick=leaveProperty;root.append(back);
 const notice=el('p','empty','جارٍ تحميل بيانات العقار...');root.append(notice);
 let x=listings.find(p=>String(p.id)===id);
 // A shared link must work without relying on the listings cache or an admin session.
 if(db){
  const {data,error}=await db.from('properties').select('*').eq('id',id).eq('is_published',true).maybeSingle();
  if(version!==propertyRouteVersion)return;
  if(error){
   console.error('Property detail query failed:',error);
   notice.textContent='تعذر تحميل تفاصيل العقار. تحقق من الاتصال وصلاحيات عرض العقارات المنشورة.';
   return;
  }
  x=data;
  if(x){
   const {data:photos,error:photosError}=await db.from('property_images').select('*').eq('property_id',id).order('sort_order',{ascending:true});
   if(version!==propertyRouteVersion)return;
   if(photosError)console.warn('Could not load additional images:',photosError);
   else imageRows=[...imageRows.filter(r=>r.property_id!==id),...(photos||[])];
  }
 }
 if(version!==propertyRouteVersion)return;
 notice.remove();
 if(!x){root.append(el('h2','','العقار غير متاح حاليًا'),el('p','','لم نعثر على عرض منشور بهذا الرابط. تحقق من الرابط أو حالة نشر العقار.'));return}
 const header=el('div','property-page-heading');header.append(el('span','tag',x.property_type),el('h1','',x.title),el('p','',x.city+(x.district?' · '+x.district:'')),el('div','price',format(x.price)));root.append(header);
 const photos=photosFor(x),visual=el('div','property-page-visual');
 if(photos.length){
  const grid=el('div','property-all-photos');
  photos.forEach((photo,i)=>{
   const button=el('button','property-photo-item');
   button.type='button';button.setAttribute('aria-label','تكبير صورة العقار '+(i+1)+' من '+photos.length);
   const img=el('img');img.src=photo.url;img.alt=x.title+' - صورة '+(i+1);img.loading=i===0?'eager':'lazy';
   button.append(img);
   button.onclick=()=>{openGallery(x);galleryIndex=i;galleryRender()};
   grid.append(button);
  });
  visual.append(grid);
  const hint=el('p','property-photos-hint','صور العقار ('+photos.length+') — اضغط على أي صورة لتكبيرها والتنقل بينها');
  visual.append(hint);
 } else visual.append(el('p','empty','لا توجد صور متاحة لهذا العقار.'));
 root.append(visual);
 const content=el('div','property-page-content'),main=el('div','property-page-main'),aside=el('aside','property-page-aside');
 main.append(el('h2','','تفاصيل العقار'));
 const facts=el('div','property-page-facts');for(const [label,value] of [['النوع',x.property_type],['المدينة',x.city],['الحي',x.district],['المساحة',x.area!=null?new Intl.NumberFormat('ar-SA').format(x.area)+' م²':null],['ترخيص الإعلان',x.ad_license]]){if(value!==null&&value!==undefined&&value!==''){const fact=el('div','property-page-fact');fact.append(el('small','',label),el('strong','',String(value)));facts.append(fact)}}main.append(facts);
 if(x.description){main.append(el('h3','','وصف العقار'),el('p','property-page-description',x.description))}
 const specs=renderPropertyDetails(x);if(specs){specs.open=true;main.append(specs)}
 const wa=el('a','btn navy full','الاستفسار عبر واتساب');wa.href='https://wa.me/'+cfg.whatsapp+'?text='+encodeURIComponent('مرحبًا، أرغب بالاستفسار عن العقار: '+x.title+'\n'+propertyLink(x.id));wa.target='_blank';wa.rel='noopener';aside.append(wa);
 const share=el('a','btn gold full','مشاركة العقار عبر واتساب');share.href='https://wa.me/?text='+encodeURIComponent(x.title+'\n'+propertyLink(x.id));share.target='_blank';share.rel='noopener';aside.append(share);
 const copy=el('button','ghost full','نسخ رابط العقار');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(propertyLink(x.id));copy.textContent='تم نسخ الرابط'}catch{window.prompt('انسخ رابط العقار:',propertyLink(x.id))}};aside.append(copy);
 if(x.map_url&&validHttp(x.map_url)){const map=el('a','ghost full','عرض الموقع على الخريطة');map.href=x.map_url;map.target='_blank';map.rel='noopener';aside.append(map)}
 content.append(main,aside);root.append(content);
}
window.addEventListener('popstate',()=>{renderPropertyRoute();window.scrollTo(0,0)});

loadPublic();
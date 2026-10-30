import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.MANAHEL_CONFIG||{};
const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);
const db=configured?createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
const $=id=>document.getElementById(id);
const sample=[{id:'demo1',title:'أرض سكنية في الرذايا',property_type:'أرض',city:'المدينة المنورة',district:'الرذايا',price:10000000,area:65691,description:'على طريق المدينة القصيم القديم — عرض توضيحي، يرجى التأكد من التوفر.',image_url:null,is_published:true},{id:'demo2',title:'دور في حي الرانوناء',property_type:'دور',city:'المدينة المنورة',district:'الرانوناء',price:1400000,area:418,description:'سبع غرف وتأسيس مصعد — عرض توضيحي، يرجى التأكد من التوفر.',image_url:null,is_published:true},{id:'demo3',title:'فيلا وثلاث شقق مستقلة',property_type:'فيلا',city:'المدينة المنورة',district:'الدفاع',price:2300000,area:524.44,description:'فيلا مع شقق مستقلة — عرض توضيحي، يرجى التأكد من التوفر.',image_url:null,is_published:true}];
let listings=[],requests=[],session=null,authorized=false;
let requestMatches=[];
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
async function loadAdmin(){if(!authorized)return;const [p,r]=await Promise.all([db.from('properties').select('*').order('created_at',{ascending:false}),db.from('property_requests').select('*').order('created_at',{ascending:false})]);if(p.error||r.error){setStatus('editorStatus','تعذر تحميل البيانات. تحقق من صلاحيات قاعدة البيانات.',true);return}listings=p.data||[];requests=r.data||[];await loadImages();$('statListings').textContent=listings.length;$('statRequests').textContent=requests.length;renderDashboard();renderAdmin();setupAdminNavigation();await loadCrmContacts();ensureRequestManager();await loadRequestMatches();await loadDeals();renderStage9Reports();renderStage10Backup();}

// Admin navigation is created only after authorization; existing forms remain untouched.
function setupAdminNavigation(){
 const panel=$('adminPanel');if(!panel||!authorized)return;
 let nav=$('manahelAdminNav');
 if(!nav){
  const content=el('div','manahel-admin-content');content.id='manahelAdminContent';
  while(panel.firstChild)content.append(panel.firstChild);
  nav=el('nav','manahel-admin-nav');nav.id='manahelAdminNav';nav.setAttribute('aria-label','التنقل في لوحة الإدارة');
  const heading=el('strong','manahel-admin-nav-title','إدارة مناهل طيبة');nav.append(heading);
  const items=[['الإحصائيات','manahelDashboard'],['إضافة عقار','listingForm'],['إدارة العروض','adminListings'],['طلبات العملاء','adminRequests'],['سجل العملاء','crmContactsSection'],['إدارة الصفقات','manahelDealsSection'],['التقارير والإحصائيات','manahelReportsSection'],['النسخ الاحتياطي','manahelBackupSection']];
  for(const [label,id] of items){const button=el('button','manahel-admin-nav-link',label);button.type='button';button.onclick=()=>{const target=$(id);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));button.classList.add('active')}};nav.append(button)}
  const newRequests=el('div','manahel-new-requests');newRequests.id='manahelNewRequests';nav.append(newRequests);
  panel.classList.add('manahel-admin-layout');panel.append(nav,content);
 }
 const count=requests.filter(x=>!x.status||x.status==='جديد').length;
 const indicator=$('manahelNewRequests');if(indicator){indicator.textContent='الطلبات الجديدة: '+count;indicator.classList.toggle('has-new',count>0)}
}

// Read-only dashboard: uses the same authorized data already loaded for the admin panel.
// Stage 11: administrative overview. All figures are derived from already authorized records.
let dashboardPeriod='all';
function renderDashboard(){
 const panel=$('adminPanel');if(!panel||!authorized)return;
 let dash=$('manahelDashboard');
 if(!dash){dash=el('section','manahel-dashboard stage11-dashboard');dash.id='manahelDashboard';dash.setAttribute('aria-label','لوحة مؤشرات الأعمال');
 const toolbar=panel.querySelector('.admin-toolbar');if(toolbar)toolbar.insertAdjacentElement('afterend',dash);else panel.prepend(dash)}
 dash.replaceChildren();
 const heading=el('div','dash-heading');
 const title=el('div');title.append(el('h3','','لوحة مؤشرات مناهل طيبة'),el('p','','ملخص تشغيلي من السجلات المحمّلة والمسموح بعرضها للمدير'));
 const actions=el('div','stage11-actions');
 const period=el('select','stage11-period');period.setAttribute('aria-label','الفترة الزمنية');
 for(const [value,label] of [['all','جميع الفترات'],['30','آخر 30 يومًا'],['90','آخر 90 يومًا'],['365','آخر سنة']]){
  const op=el('option','',label);op.value=value;period.append(op)}
 period.value=dashboardPeriod;period.onchange=()=>{dashboardPeriod=period.value;renderDashboard()};
 const refresh=el('button','ghost','تحديث البيانات');refresh.type='button';refresh.onclick=async()=>{refresh.disabled=true;refresh.textContent='جارٍ التحديث…';try{await loadAdmin()}finally{refresh.disabled=false}};
 actions.append(period,refresh);heading.append(title,actions);dash.append(heading);
 const since=dashboardPeriod==='all'?null:Date.now()-Number(dashboardPeriod)*86400000;
 const within=x=>{if(since===null)return true;const d=Date.parse(x.created_at||'');return Number.isFinite(d)&&d>=since};
 const p=listings.filter(within),r=requests.filter(within),c=crmContacts.filter(within),d=dealRows.filter(within);
 const published=p.filter(x=>x.is_published===true).length;
 const newRequests=r.filter(x=>!x.status||x.status==='جديد').length;
 const followups=r.filter(x=>x.status==='قيد المتابعة').length;
 const completed=d.filter(x=>x.stage==='مكتملة').length;
 const active=d.filter(x=>!['مكتملة','ملغاة'].includes(x.stage)).length;
 const cards=el('div','dash-cards stage11-cards');
 for(const [label,value,hint] of [
  ['جهات الاتصال',c.length,'سجل العملاء'],['العقارات',p.length,`${published} منشور`],
  ['طلبات العملاء',r.length,`${newRequests} جديد`],['الصفقات',d.length,`${active} نشطة`],
  ['الصفقات المكتملة',completed,'حسب مرحلة الصفقة'],['طلبات قيد المتابعة',followups,'تحتاج متابعة']]){
  const card=el('div','dash-stat stage11-stat');card.append(el('span','dash-stat-label',label),el('strong','dash-stat-value',String(value)),el('small','stage11-hint',hint));cards.append(card)}
 dash.append(cards);
 const sections=el('div','dash-sections stage11-sections');
 const makePanel=title=>{const box=el('div','dash-panel');box.append(el('h4','',title));return box};
 const barPanel=(title,rows,total)=>{const box=makePanel(title);if(!rows.length){box.append(el('p','dash-empty','لا توجد بيانات لهذه الفترة.'));return box}
  for(const [name,count] of rows){const line=el('div','dash-status-row');line.append(el('span','',name),el('b','',String(count)));const track=el('div','dash-track');const fill=el('div','dash-fill');fill.style.width=(total?Math.round(count/total*100):0)+'%';track.append(fill);box.append(line,track)}return box};
 const group=(items,key)=>{const counts=new Map();for(const x of items){const name=String(x[key]||'غير محدد').trim()||'غير محدد';counts.set(name,(counts.get(name)||0)+1)}return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)};
 sections.append(barPanel('العقارات حسب النوع',group(p,'property_type'),p.length));
 sections.append(barPanel('حالات طلبات العملاء',group(r,'status'),r.length));
 sections.append(barPanel('مراحل الصفقات',group(d,'stage'),d.length));
 sections.append(barPanel('المدن الأكثر نشاطًا',group(p,'city'),p.length));
 const recent=makePanel('أحدث العقارات المضافة');
 const latest=p.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,5);
 if(!latest.length)recent.append(el('p','dash-empty','لا توجد عقارات مسجلة لهذه الفترة.'));
 for(const x of latest){const line=el('div','dash-recent');line.append(el('strong','',x.title||'عقار بدون عنوان'),el('span','',x.is_published?'منشور':'غير منشور'));recent.append(line)}
 sections.append(recent);dash.append(sections);
 const note=el('p','stage11-note','تعكس المؤشرات السجلات المحمّلة في لوحة الإدارة وفق صلاحيات الدخول؛ وقد تختلف عن إجمالي قاعدة البيانات إذا تجاوزت النتائج حدود جلب Supabase. الفلترة بحسب تاريخ إنشاء السجل.');
 dash.append(note);
}
function renderRequestItems(){
 const rr=$('adminRequests');if(!rr)return;
 const tools=rr.previousElementSibling;
 const search=tools?.querySelector('.request-search')?.value.trim().toLocaleLowerCase('ar')||'';
 const filter=tools?.querySelector('.request-filter')?.value||'';
 const shown=requests.filter(x=>(!filter||(x.status||'جديد')===filter)&&(!search||String(x.full_name||'').toLocaleLowerCase('ar').includes(search)||String(x.phone||'').includes(search)||[x.city,x.district,x.property_type,x.request_details].join(' ').toLocaleLowerCase('ar').includes(search)));
 rr.replaceChildren();
 const count=tools?.querySelector('.request-result-count');if(count)count.textContent=`النتائج: ${shown.length} من ${requests.length}`;
 for(const x of shown){
  const item=el('div','admin-item request-item');
  item.append(el('strong','',`${x.full_name} — ${x.phone}`),el('small','',`${x.property_type||''} · ${x.city||''}${x.district?' · '+x.district:''}`),el('p','',`الميزانية: ${format(x.budget)} | ${x.notes||'لا توجد ملاحظات من العميل'}`));
  if(x.created_at){const d=new Date(x.created_at);if(!Number.isNaN(d.getTime()))item.append(el('small','',`تاريخ الاستلام: ${d.toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}`))}
  const actions=el('div','request-actions');
  const status=el('select');status.setAttribute('aria-label','حالة طلب '+x.full_name);
  for(const val of ['جديد','قيد المتابعة','مكتمل','ملغى']){const op=el('option','',val);op.value=val;status.append(op)}status.value=x.status||'جديد';
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
  item.append(renderRequestMatches(x));
  if(x.updated_at){const d=new Date(x.updated_at);if(!Number.isNaN(d.getTime()))item.append(el('small','',`آخر تحديث: ${d.toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}`))}
  rr.append(item);
 }
 if(!shown.length)rr.append(el('p','','لا توجد طلبات مطابقة للبحث.'));
}

// Stage 7: matching uses only authorized admin data; no public customer information.
function matchProperty(request,property){
 const type=String(request.property_type||'').trim(),city=String(request.city||'').trim();
 const ptype=String(property.property_type||'').trim(),pcity=String(property.city||'').trim();
 // Incompatible property type or city is not a candidate.
 if(type&&ptype!==type)return null;
 if(city&&pcity!==city)return null;
 const budget=Number(request.budget),price=Number(property.price);
 if(request.budget!=null&&request.budget!==''&&property.price!=null&&price>budget)return null;
 const min=request.min_area==null||request.min_area===''?null:Number(request.min_area);
 const max=request.max_area==null||request.max_area===''?null:Number(request.max_area);
 const area=property.area==null?null:Number(property.area);
 if(area!==null&&((min!==null&&area<min)||(max!==null&&area>max)))return null;
 let score=45,checks=[];
 if(type){score+=15;checks.push('النوع مطابق')}
 if(city){score+=15;checks.push('المدينة مطابقة')}
 const district=String(request.district||'').trim();
 if(district&&String(property.district||'').trim()===district){score+=15;checks.push('الحي مطابق')}
 else if(district)checks.push('الحي مختلف أو غير محدد');
 if(request.budget!=null&&property.price!=null){score+=5;checks.push('ضمن الميزانية')}
 if((min!==null||max!==null)&&area!==null){score+=5;checks.push('المساحة مناسبة')}
 return {property,score:Math.min(100,score),checks};
}
async function loadRequestMatches(){
 if(!authorized||!db)return;
 const {data,error}=await db.from('request_property_matches').select('id,request_id,property_id,notes,created_at');
 if(error){console.warn('Stage 7 matching records unavailable:',error);requestMatches=[];}
 else requestMatches=data||[];
 renderRequestItems();
}
function renderRequestMatches(request){
 const box=el('details','request-matching');
 const saved=requestMatches.filter(m=>m.request_id===request.id);
 const heading=el('summary','',`مطابقة العقارات المناسبة (${saved.length} محفوظة)`);box.append(heading);
 const help=el('p','', 'النتائج تقديرية بناءً على النوع والمدينة والحي والميزانية والمساحة؛ راجع تفاصيل العقار قبل الإرسال.');box.append(help);
 const candidates=listings.filter(p=>p.is_published===true).map(p=>matchProperty(request,p)).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,20);
 if(!candidates.length)box.append(el('p','','لا توجد عقارات منشورة مطابقة للشروط الأساسية حاليًا.'));
 const rows=el('div','match-results');
 for(const m of candidates){
  const card=el('div','match-card');const p=m.property;
  card.append(el('strong','',p.title||'عقار بدون عنوان'),el('small','',`${m.score}% توافق مبدئي · ${p.district||p.city||''} · ${format(p.price)} · ${p.area||'—'} م²`),el('small','',m.checks.join(' · ')));
  const actions=el('div','match-actions');
  const view=el('a','','عرض العقار');view.href=propertyLink(p.id);view.target='_blank';view.rel='noopener';actions.append(view);
  const digits=crmPhone(request.phone);
  if(digits.length>=9&&digits.length<=15){const wa=el('a','','إرسال عبر واتساب');wa.href=`https://wa.me/${digits}?text=${encodeURIComponent('مرحبًا، هذا عرض عقاري قد يناسب طلبكم:\n'+p.title+'\n'+propertyLink(p.id))}`;wa.target='_blank';wa.rel='noopener noreferrer';actions.append(wa)}
  const record=saved.find(x=>x.property_id===p.id),button=el('button','ghost',record?'إزالة من المحفوظات':'حفظ المطابقة');button.type='button';
  button.onclick=async()=>{
   if(!authorized)return;button.disabled=true;
   const result=record?await db.from('request_property_matches').delete().eq('id',record.id):await db.from('request_property_matches').insert({request_id:request.id,property_id:p.id});
   if(result.error){alert('تعذر حفظ المطابقة. تأكد من تنفيذ stage7_database.sql: '+result.error.message);button.disabled=false;return}
   await loadRequestMatches();
  };actions.append(button);card.append(actions);rows.append(card);
 }
 box.append(rows);
 const missing=saved.filter(m=>!candidates.some(c=>c.property.id===m.property_id));
 if(missing.length){const old=el('div','match-saved');old.append(el('strong','', 'مطابقات محفوظة خارج النتائج الحالية'));
 for(const record of missing){const p=listings.find(x=>x.id===record.property_id);const line=el('div','match-card');line.append(el('span','',p?.title||'عقار غير متاح'),el('small','','قد يكون العقار مخفيًا أو تغيرت شروط الطلب'));const remove=el('button','ghost','إزالة');remove.type='button';remove.onclick=async()=>{const {error}=await db.from('request_property_matches').delete().eq('id',record.id);if(error)alert(error.message);else await loadRequestMatches()};line.append(remove);old.append(line)}box.append(old)}
 return box;
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
 crmContacts=c.data||[];crmLinks=l.data||[];renderCrm();renderDashboard();
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
function crmDecodeVcardValue(raw,meta=''){
 const params=String(meta).toUpperCase();
 let value=String(raw||'');
 if(/(?:^|;)ENCODING=QUOTED-PRINTABLE(?:;|$)/i.test(params)||/(?:=[0-9A-F]{2}){2,}/i.test(value)){
  const bytes=[];
  for(let i=0;i<value.length;){
   if(value[i]==='='&&/^[0-9a-f]{2}$/i.test(value.slice(i+1,i+3))){bytes.push(parseInt(value.slice(i+1,i+3),16));i+=3;continue}
   const cp=value.codePointAt(i);bytes.push(...new TextEncoder().encode(String.fromCodePoint(cp)));i+=cp>0xffff?2:1;
  }
  value=new TextDecoder('utf-8',{fatal:false}).decode(new Uint8Array(bytes));
 }else if(/(?:^|;)ENCODING=(?:B|BASE64)(?:;|$)/i.test(params)){
  try{const binary=atob(value.replace(/\s/g,''));value=new TextDecoder('utf-8').decode(Uint8Array.from(binary,c=>c.charCodeAt(0)))}catch(e){console.warn('VCF base64 decode failed',e)}
 }
 return value.replace(/\\[nN]/g,' ').replace(/\\([,;\\])/g,'$1').trim();
}
function crmParseVCF(text){
 // VCF allows folded lines (leading whitespace) and quoted-printable soft line breaks.
 const physical=String(text||'').replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);
 const lines=[];
 for(const part of physical){
  if(lines.length&&/^[ \t]/.test(part)){lines[lines.length-1]+=part.slice(1);continue}
  if(lines.length&&/=$/.test(lines[lines.length-1])&&/ENCODING=QUOTED-PRINTABLE/i.test(lines[lines.length-1].split(':')[0])){
   lines[lines.length-1]=lines[lines.length-1].slice(0,-1)+part;continue
  }
  lines.push(part);
 }
 const out=[];let active=false,name='',structured='',phone='';
 const finish=()=>{if(active&&(name||structured||phone))out.push({full_name:name||structured,phone,city:'',district:'',role:''})};
 for(const line of lines){
  if(/^BEGIN:VCARD\s*$/i.test(line)){finish();active=true;name='';structured='';phone='';continue}
  if(/^END:VCARD\s*$/i.test(line)){finish();active=false;continue}
  if(!active)continue;
  const pos=line.indexOf(':');if(pos<0)continue;
  const meta=line.slice(0,pos),key=meta.split(';')[0].split('.').pop().toUpperCase();
  const val=crmDecodeVcardValue(line.slice(pos+1),meta);
  if(key==='FN'&&!name)name=val;
  if(key==='N'&&!structured)structured=val.split(';').filter(Boolean).join(' ');
  if(key==='TEL'&&!phone)phone=val.replace(/^tel:/i,'');
 }
 finish();return out;
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
  for(const r of crmImportRows){const name=String(r.full_name||'').trim().slice(0,160),phone=crmPhone(r.phone);if(!name||phone.length<9||phone.length>15||/(?:=[0-9A-F]{2}){2,}/i.test(name)||name.includes(' ')){invalid++;continue}
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

// Stage 6: administrator-only request editor, using the existing requests table.
function ensureRequestManager(){
 if(!authorized)return;
 let form=$('adminRequestForm');if(form){fillRequestContacts();return}
 const anchor=$('adminRequests');if(!anchor)return;
 const section=el('section','form-card request-manager');section.id='requestManager';
 section.append(el('h3','','إضافة أو تعديل طلب عقاري'),el('p','','طلبات داخلية مرتبطة بسجل العملاء، ولا تظهر بيانات المتابعة للزوار.'));
 form=el('form','request-manager-form');form.id='adminRequestForm';
 const hidden=el('input');hidden.type='hidden';hidden.name='id';form.append(hidden);
 const fields=el('div','request-manager-fields');
 function field(label,name,type='text',required=false){const wrap=el('label','',label),input=el('input');input.name=name;input.type=type;input.required=required;if(type==='number'){input.min='0';input.step='any'}wrap.append(input);fields.append(wrap);return input}
 const contactLabel=el('label','','ربط بعميل مسجل'),contact=el('select');contact.name='contact_id';contact.id='requestContactSelect';contactLabel.append(contact);fields.append(contactLabel);
 field('اسم العميل *','full_name','text',true);field('رقم الجوال *','phone','tel',true);
 const typeLabel=el('label','','نوع العقار'),type=el('select');type.name='property_type';type.required=true;for(const v of ['','أرض','شقة','دور','فيلا','عمارة','مزرعة','مستودع','محل تجاري','أخرى'])type.append(crmOption(v,v||'اختر النوع'));typeLabel.append(type);fields.append(typeLabel);
 field('المدينة *','city','text',true);field('الحي','district');field('الميزانية القصوى (ريال)','budget','number');field('المساحة من (م²)','min_area','number');field('المساحة إلى (م²)','max_area','number');
 const detailsLabel=el('label','','المواصفات المطلوبة'),details=el('textarea');details.name='request_details';details.rows=3;detailsLabel.append(details);
 const notesLabel=el('label','','ملاحظات العميل'),notes=el('textarea');notes.name='notes';notes.rows=2;notesLabel.append(notes);
 const actions=el('div','crm-actions'),submit=el('button','btn navy','حفظ الطلب');submit.type='submit';const reset=el('button','ghost','طلب جديد');reset.type='button';reset.onclick=()=>{form.reset();form.elements.id.value='';submit.textContent='حفظ الطلب'};actions.append(submit,reset);
 form.append(fields,detailsLabel,notesLabel,actions);section.append(form);anchor.parentElement.insertBefore(section,anchor);
 contact.onchange=()=>{const c=crmContacts.find(x=>x.id===contact.value);if(c){form.elements.full_name.value=c.full_name||'';form.elements.phone.value=c.phone||'';form.elements.city.value=c.city||'';form.elements.district.value=c.district||''}};
 form.onsubmit=async e=>{
  e.preventDefault();if(!authorized||!db)return;
  const f=e.currentTarget,id=f.elements.id.value,contactId=f.elements.contact_id.value;
  const val=k=>String(f.elements[k].value||'').trim();
  const payload={full_name:val('full_name'),phone:val('phone'),property_type:val('property_type')||null,city:val('city')||null,district:val('district')||null,budget:val('budget')?Number(val('budget')):null,min_area:val('min_area')?Number(val('min_area')):null,max_area:val('max_area')?Number(val('max_area')):null,request_details:val('request_details')||null,notes:val('notes')||null,updated_at:new Date().toISOString()};
  if(!payload.full_name||!payload.property_type||!payload.city||!/^[+\d\s-]{8,20}$/.test(payload.phone)){alert('يرجى إدخال اسم العميل ورقم جوال صحيح');return}
  if(payload.min_area!=null&&payload.max_area!=null&&payload.min_area>payload.max_area){alert('المساحة الدنيا أكبر من المساحة العليا');return}
  submit.disabled=true;
  try{
   const result=id?await db.from('property_requests').update(payload).eq('id',id).select('id').single():await db.from('property_requests').insert({...payload,status:'جديد'}).select('id').single();
   if(result.error)throw result.error;
   const requestId=result.data.id;
   const existing=crmLinks.filter(x=>x.request_id===requestId);
   if(contactId&&!existing.some(x=>x.contact_id===contactId)){
    const {error}=await db.from('crm_links').insert({contact_id:contactId,request_id:requestId});if(error)throw new Error('تم حفظ الطلب لكن تعذر ربط العميل: '+error.message);
   }
   for(const link of existing.filter(x=>x.contact_id!==contactId)){
    const {error}=await db.from('crm_links').delete().eq('id',link.id);if(error)throw new Error('تم حفظ الطلب لكن تعذر تحديث ارتباط العميل: '+error.message);
   }
   form.reset();form.elements.id.value='';submit.textContent='حفظ الطلب';await loadAdmin();alert('تم حفظ الطلب بنجاح');
  }catch(err){alert('تعذر إكمال العملية: '+(err?.message||'خطأ غير معروف'))}finally{submit.disabled=false}
 };
 fillRequestContacts();
}
function fillRequestContacts(){const select=$('requestContactSelect');if(!select)return;const current=select.value;select.replaceChildren(crmOption('','بدون ربط بعميل'));for(const c of crmContacts)select.append(crmOption(c.id,`${c.full_name} — ${c.phone}`));select.value=current;}

function renderAdmin(){const lp=$('adminListings');lp.replaceChildren();for(const x of listings){const item=el('div','admin-item');item.append(el('strong','',x.title),el('small','',x.city+' · '+format(x.price)+' · '+(x.is_published?'منشور':'مخفي')));const actions=el('div','actions'),edit=el('button','','تعديل'),del=el('button','danger','حذف');edit.onclick=()=>editListing(x);del.onclick=()=>deleteListing(x);actions.append(edit,del);item.append(actions);lp.append(item)}if(!listings.length)lp.append(el('p','','لا توجد عروض بعد.'));const rr=$('adminRequests');
  if(!rr.dataset.enhanced){
    rr.dataset.enhanced='1';
    const tools=el('div','request-tools');
    const search=el('input','request-search');search.type='search';search.placeholder='بحث باسم العميل أو رقم الجوال';search.setAttribute('aria-label','بحث في الطلبات');
    const filter=el('select','request-filter');filter.setAttribute('aria-label','تصفية حسب حالة الطلب');
    for(const [value,label] of [['','كل الحالات'],['جديد','جديد'],['قيد المتابعة','قيد المتابعة'],['مكتمل','مكتمل'],['ملغى','ملغى']]){const op=el('option','',label);op.value=value;filter.append(op)}
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

// Stage 8: private deal pipeline, commission tracking and collections.
let dealRows=[];
const dealStages=['عرض العقار','معاينة','تفاوض','اتفاق مبدئي','إفراغ','مكتملة','ملغاة'];
const dealMoney=n=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Number(n)||0)+' ريال';
function dealField(label,name,type='text',value=''){
 const wrap=el('label','');wrap.append(el('span','',label));
 const input=el(type==='select'?'select':'input','');
 input.name=name;
 if(type!=='select')input.type=type;
 if(value!==undefined&&type!=='select')input.value=value;
 wrap.append(input);return [wrap,input];
}
function dealOptions(select,rows,placeholder){
 select.append(new Option(placeholder,''));
 for(const [id,label] of rows)select.append(new Option(label,String(id)));
}
async function loadDeals(){
 if(!authorized||!db)return;
 const root=ensureDealsSection();
 const {data,error}=await db.from('real_estate_deals').select('*').order('created_at',{ascending:false});
 const msg=root.querySelector('.deals-feedback');
 if(error){msg.textContent='تعذر تحميل الصفقات: '+error.message+' — نفّذ ملف stage8_database.sql أولًا.';return}
 msg.textContent='';dealRows=data||[];renderDeals();renderStage9Reports();renderDashboard();
}
function ensureDealsSection(){
 let root=$('manahelDealsSection');if(root)return root;
 root=el('section','form-card deals-section');root.id='manahelDealsSection';
 root.append(el('h3','','إدارة الصفقات والعمولات'),el('p','','ربط العقار بالعميل والطلب، متابعة مراحل الصفقة والسعي والمبالغ المحصلة. النسبة قابلة للتعديل حسب الاتفاق.'));
 const form=el('form','deals-form');form.id='manahelDealForm';
 const grid=el('div','deals-grid');
 const fields={};
 function field(label,name,type='text',value=''){const [wrap,input]=dealField(label,name,type,value);grid.append(wrap);fields[name]=input;return input}
 field('رقم الصفقة (للتعديل فقط)','id','hidden');
 field('العقار','property_id','select');
 field('العميل','contact_id','select');
 field('الطلب المرتبط (اختياري)','request_id','select');
 field('مرحلة الصفقة','stage','select');
 field('سعر العرض (ريال)','asking_price','number');
 field('السعر المتفق عليه (ريال)','agreed_price','number');
 field('نسبة السعي %','commission_rate','number','2.5');
 field('قيمة السعي المتفق عليها (ريال) — اختيارية','commission_override','number');
 field('المبلغ المحصل (ريال)','collected_amount','number','0');
 field('موعد المتابعة','next_follow_up','date');
 field('ملاحظات المتابعة','notes');
 fields.property_id.required=true;
 fields.stage.required=true;
 fields.agreed_price.min='0';fields.asking_price.min='0';
 fields.commission_rate.min='0';fields.commission_rate.step='0.01';
 fields.collected_amount.min='0';fields.collected_amount.step='0.01';
 fields.commission_override.min='0';fields.commission_override.step='0.01';
 fields.agreed_price.step='0.01';fields.asking_price.step='0.01';
 dealOptions(fields.stage,dealStages.map(x=>[x,x]),'اختر المرحلة');
 fields.stage.value='عرض العقار';
 const actions=el('div','deals-actions'),save=el('button','','حفظ الصفقة'),reset=el('button','ghost','إلغاء التعديل');
 save.type='submit';reset.type='button';reset.onclick=()=>{form.reset();fields.id.value='';fields.stage.value='عرض العقار';fields.commission_rate.value='2.5';save.textContent='حفظ الصفقة'};
 actions.append(save,reset);form.append(grid,actions);
 const preview=el('p','deals-preview');
 function updatePreview(){const base=Number(fields.agreed_price.value)||0;const rate=Number(fields.commission_rate.value)||0;const override=fields.commission_override.value.trim();const commission=override!==''?Number(override):base*rate/100;const collected=Number(fields.collected_amount.value)||0;preview.textContent='السعي المتوقع: '+dealMoney(commission)+' | المحصل: '+dealMoney(collected)+' | المتبقي: '+dealMoney(Math.max(0,commission-collected))}
 form.addEventListener('input',updatePreview);updatePreview();form.append(preview);
 const feedback=el('p','deals-feedback');const summary=el('div','deals-summary'),list=el('div','deals-list');
 root.append(form,feedback,summary,list);
 const target=$('crmContactsSection')||$('adminRequests')||$('adminPanel');target.insertAdjacentElement('afterend',root);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!authorized)return;
  const f=new FormData(form),id=String(f.get('id')||'');
  const num=(key)=>{const v=String(f.get(key)||'').trim();return v===''?null:Number(v)};
  const payload={property_id:f.get('property_id'),contact_id:f.get('contact_id')||null,request_id:f.get('request_id')||null,stage:f.get('stage'),asking_price:num('asking_price'),agreed_price:num('agreed_price'),commission_rate:num('commission_rate')??0,commission_override:num('commission_override'),collected_amount:num('collected_amount')??0,next_follow_up:f.get('next_follow_up')||null,notes:String(f.get('notes')||'').trim()||null};
  if(!payload.property_id){feedback.textContent='اختر العقار أولًا';return}
  if(payload.commission_override!==null&&payload.collected_amount>payload.commission_override){feedback.textContent='المبلغ المحصل أكبر من قيمة السعي المحددة';return}
  save.disabled=true;feedback.textContent='جارٍ الحفظ...';
  const {error}=id?await db.from('real_estate_deals').update(payload).eq('id',id):await db.from('real_estate_deals').insert(payload);
  save.disabled=false;
  if(error){feedback.textContent='تعذر الحفظ: '+error.message;return}
  reset.click();feedback.textContent='تم حفظ الصفقة بنجاح';await loadDeals();
 });
 root._dealFields=fields;root._dealPreview=updatePreview;return root;
}
function renderDeals(){
 const root=ensureDealsSection(),fields=root._dealFields,form=$('manahelDealForm');
 const selected={property:fields.property_id.value,contact:fields.contact_id.value,request:fields.request_id.value};
 for(const key of ['property_id','contact_id','request_id'])fields[key].replaceChildren();
 dealOptions(fields.property_id,listings.map(x=>[x.id,x.title||'عقار بدون عنوان']),'اختر العقار');
 dealOptions(fields.contact_id,crmContacts.map(x=>[x.id,x.name||x.full_name||x.phone||'عميل']),'بدون ربط عميل');
 dealOptions(fields.request_id,requests.map(x=>[x.id,(x.full_name||'طلب')+' — '+(x.property_type||'')]),'بدون ربط طلب');
 fields.property_id.value=selected.property;fields.contact_id.value=selected.contact;fields.request_id.value=selected.request;
 const summary=root.querySelector('.deals-summary'),list=root.querySelector('.deals-list');summary.replaceChildren();list.replaceChildren();
 const active=dealRows.filter(x=>!['مكتملة','ملغاة'].includes(x.stage)).length;
 const completed=dealRows.filter(x=>x.stage==='مكتملة').length;
 const collected=dealRows.reduce((sum,x)=>sum+(Number(x.collected_amount)||0),0);
 summary.append(el('strong','',`إجمالي الصفقات: ${dealRows.length}`),el('strong','',`النشطة: ${active}`),el('strong','',`المكتملة: ${completed}`),el('strong','',`المحصل: ${dealMoney(collected)}`));
 for(const x of dealRows){
  const property=listings.find(p=>p.id===x.property_id),contact=crmContacts.find(c=>c.id===x.contact_id);
  const base=Number(x.agreed_price)||0,commission=x.commission_override==null?base*(Number(x.commission_rate)||0)/100:Number(x.commission_override),paid=Number(x.collected_amount)||0;
  const card=el('article','deal-card');
  card.append(el('strong','',property?.title||'عقار غير متاح'),el('small','',`المرحلة: ${x.stage} | العميل: ${contact?.name||contact?.full_name||'غير محدد'}`),el('p','',`السعر المتفق عليه: ${dealMoney(base)} | السعي: ${dealMoney(commission)} | المحصل: ${dealMoney(paid)} | المتبقي: ${dealMoney(Math.max(0,commission-paid))}`));
  if(x.next_follow_up)card.append(el('small','',`المتابعة القادمة: ${x.next_follow_up}`));
  if(x.notes)card.append(el('p','',x.notes));
  const actions=el('div','deals-actions'),edit=el('button','ghost','تعديل'),del=el('button','ghost','حذف');
  edit.type='button';del.type='button';
  edit.onclick=()=>{for(const [key,input] of Object.entries(fields))input.value=x[key]??'';fields.id.value=x.id;form.querySelector('button[type=submit]').textContent='تحديث الصفقة';root._dealPreview();root.scrollIntoView({behavior:'smooth',block:'start'})};
  del.onclick=async()=>{if(!confirm('هل تريد حذف الصفقة نهائيًا؟'))return;const {error}=await db.from('real_estate_deals').delete().eq('id',x.id);if(error)alert(error.message);else await loadDeals()};
  actions.append(edit,del);
  const phone=crmPhone(contact?.phone||'');if(phone.length>=9&&phone.length<=15){const wa=el('a','deal-whatsapp','واتساب العميل');wa.href='https://wa.me/'+phone;wa.target='_blank';wa.rel='noopener noreferrer';actions.append(wa)}
  card.append(actions);list.append(card);
 }
 if(!dealRows.length)list.append(el('p','','لا توجد صفقات بعد. أضف أول صفقة من النموذج أعلاه.'));
}


// Stage 9 — admin-only reports. Existing tables remain unchanged.
const stage9Money=v=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Number(v)||0)+' ريال';
const stage9Esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stage9Within(row,start,end){
 const stamp=row.created_at;if(!stamp)return !start&&!end;
 const d=new Date(stamp);if(Number.isNaN(d.getTime()))return false;
 const day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 return (!start||day>=start)&&(!end||day<=end);
}
function stage9Metrics(){
 const root=$('manahelReportsSection'),start=root?.querySelector('[name=stage9Start]')?.value||'',end=root?.querySelector('[name=stage9End]')?.value||'';
 const p=listings.filter(x=>stage9Within(x,start,end)),r=requests.filter(x=>stage9Within(x,start,end)),c=crmContacts.filter(x=>stage9Within(x,start,end)),d=dealRows.filter(x=>stage9Within(x,start,end));
 const commission=x=>x.commission_override!=null?Number(x.commission_override)||0:(Number(x.agreed_price)||0)*(Number(x.commission_rate)||0)/100;
 const total=d.reduce((n,x)=>n+commission(x),0),collected=d.reduce((n,x)=>n+(Number(x.collected_amount)||0),0);
 const group=(rows,field,fallback)=>Object.entries(rows.reduce((acc,x)=>{const key=String(x[field]||fallback);acc[key]=(acc[key]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]);
 return {start,end,p,r,c,d,total,collected,remaining:Math.max(0,total-collected),propertyTypes:group(p,'property_type','غير محدد'),requestStatuses:group(r,'status','جديد'),dealStages:group(d,'stage','غير محدد')};
}
function stage9BarChart(parent,title,items){
 const section=el('section','stage9-chart'),h=el('h4','',title);section.append(h);
 if(!items.length){section.append(el('p','stage9-muted','لا توجد بيانات ضمن الفترة المحددة.'));parent.append(section);return}
 const max=Math.max(...items.map(x=>x[1]),1);
 for(const [label,count] of items){const line=el('div','stage9-chart-line'),top=el('div','stage9-chart-caption');top.append(el('span','',label),el('strong','',String(count)));const track=el('div','stage9-track'),bar=el('div','stage9-bar');bar.style.width=(count/max*100)+'%';track.append(bar);line.append(top,track);section.append(line)}
 parent.append(section);
}
function stage9ExportRows(m){
 const rows=[['القسم','البيان','القيمة','التاريخ']];
 for(const x of m.p)rows.push(['العقارات',x.title||'',x.property_type||'',x.created_at||'']);
 for(const x of m.r)rows.push(['الطلبات',x.full_name||'',x.status||'جديد',x.created_at||'']);
 for(const x of m.c)rows.push(['العملاء',x.full_name||'',x.role||'',x.created_at||'']);
 for(const x of m.d){const name=m.p.find(p=>p.id===x.property_id)?.title||listings.find(p=>p.id===x.property_id)?.title||'عقار غير متاح';const fee=x.commission_override!=null?Number(x.commission_override)||0:(Number(x.agreed_price)||0)*(Number(x.commission_rate)||0)/100;rows.push(['الصفقات',name+' | '+x.stage,'السعي: '+fee+' | المحصل: '+(Number(x.collected_amount)||0),x.created_at||''])}
 return rows;
}
function stage9ExportCsv(){
 const m=stage9Metrics(),rows=stage9ExportRows(m),csv='\ufeff'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='manahel-reports-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function stage9Print(){
 const m=stage9Metrics(),win=window.open('','_blank');if(!win){alert('اسمح بفتح النافذة المنبثقة لطباعة التقرير.');return}
 const fields=[['العقارات',m.p.length],['العملاء الجدد ضمن الفترة',m.c.length],['الطلبات',m.r.length],['الصفقات',m.d.length],['إجمالي السعي',stage9Money(m.total)],['المحصل',stage9Money(m.collected)],['المتبقي',stage9Money(m.remaining)]];
 const rowHtml=fields.map(([label,value])=>'<tr><th>'+stage9Esc(label)+'</th><td>'+stage9Esc(value)+'</td></tr>').join('');
 const dist=(title,items)=>'<h2>'+stage9Esc(title)+'</h2><table><tbody>'+items.map(([label,n])=>'<tr><th>'+stage9Esc(label)+'</th><td>'+stage9Esc(n)+'</td></tr>').join('')+'</tbody></table>';
 const html='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير مناهل طيبة</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#152743;padding:32px}h1{font-size:22px}h2{font-size:17px;margin-top:28px}table{border-collapse:collapse;width:100%;margin-top:14px}th,td{padding:11px;border:1px solid #cbd5e1;text-align:right}th{background:#f2f5f9;width:55%}p{color:#52627b}@media print{body{padding:0}}</style></head><body><h1>مؤسسة مناهل طيبة — التقرير العقاري</h1><p>الفترة: '+stage9Esc(m.start||'البداية')+' إلى '+stage9Esc(m.end||'اليوم / دون حد')+'</p><p>التصفية بتاريخ إنشاء السجلات؛ مبالغ السعي والتحصيل هي القيم الحالية للصفقات التي أُنشئت ضمن الفترة.</p><table><tbody>'+rowHtml+'</tbody></table>'+dist('أنواع العقارات',m.propertyTypes)+dist('حالات الطلبات',m.requestStatuses)+dist('مراحل الصفقات',m.dealStages)+'<p>للحفظ بصيغة PDF اختر «حفظ كملف PDF» من نافذة الطباعة.</p></body></html>';
 win.document.open();win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),350);
}
function renderStage9Reports(){
 if(!authorized)return;
 let root=$('manahelReportsSection');
 if(!root){root=el('section','form-card stage9-reports');root.id='manahelReportsSection';root.append(el('h3','','التقارير والإحصائيات العقارية'),el('p','stage9-muted','تعتمد الأرقام على السجلات الموجودة في النظام. التصفية حسب تاريخ إنشاء السجل، وليست تاريخ تحصيل الدفعات.'));
  const controls=el('div','stage9-controls');for(const [label,name] of [['من تاريخ','stage9Start'],['إلى تاريخ','stage9End']]){const wrap=el('label','');wrap.append(el('span','',label));const input=el('input','');input.type='date';input.name=name;input.addEventListener('change',renderStage9Reports);wrap.append(input);controls.append(wrap)}
  const clear=el('button','ghost','إظهار جميع الفترات');clear.type='button';clear.onclick=()=>{root.querySelectorAll('input[type=date]').forEach(x=>x.value='');renderStage9Reports()};
  const csv=el('button','ghost','تصدير Excel (CSV)');csv.type='button';csv.onclick=stage9ExportCsv;
  const pdf=el('button','ghost','طباعة / حفظ PDF');pdf.type='button';pdf.onclick=stage9Print;
  controls.append(clear,csv,pdf);root.append(controls);
  const cards=el('div','stage9-cards');cards.id='stage9Cards';const charts=el('div','stage9-charts');charts.id='stage9Charts';root.append(cards,charts);
  const target=$('manahelDealsSection')||$('crmContactsSection')||$('manahelAdminContent');target?.insertAdjacentElement('afterend',root);
 }
 const m=stage9Metrics(),cards=$('stage9Cards'),charts=$('stage9Charts');if(!cards||!charts)return;cards.replaceChildren();charts.replaceChildren();
 const stats=[['العقارات',m.p.length],['العقارات المنشورة',m.p.filter(x=>x.is_published).length],['العملاء',m.c.length],['الطلبات',m.r.length],['الصفقات',m.d.length],['الصفقات النشطة',m.d.filter(x=>!['مكتملة','ملغاة'].includes(x.stage)).length],['الصفقات المكتملة',m.d.filter(x=>x.stage==='مكتملة').length],['السعي الإجمالي',stage9Money(m.total)],['المحصل',stage9Money(m.collected)],['المتبقي',stage9Money(m.remaining)]];
 for(const [label,value] of stats){const card=el('div','stage9-stat');card.append(el('span','',label),el('strong','',String(value)));cards.append(card)}
 stage9BarChart(charts,'العقارات حسب النوع',m.propertyTypes);stage9BarChart(charts,'الطلبات حسب الحالة',m.requestStatuses);stage9BarChart(charts,'الصفقات حسب المرحلة',m.dealStages);
}

// Stage 10: manual, read-only export of admin-accessible public business tables.
// No database credentials or authentication secrets are exported.
const stage10Tables=['properties','property_images','property_requests','crm_contacts','crm_links','request_property_matches','real_estate_deals'];
function renderStage10Backup(){
 if(!authorized||!db)return;
 let root=$('manahelBackupSection');if(root)return;
 root=el('section','form-card stage10-backup');root.id='manahelBackupSection';
 root.append(el('h3','','النسخ الاحتياطي وحماية البيانات'),el('p','','تنزيل نسخة JSON من بيانات الأعمال التي يستطيع المدير قراءتها. لا تشمل هذه النسخة كلمات المرور أو مستخدمي المصادقة أو ملفات الصور المخزنة في Storage. احتفظ بالنسخة في مكان آمن، ولا ترفعها إلى GitHub العام.'));
 const button=el('button','','تنزيل نسخة احتياطية يدوية (JSON)');button.type='button';
 const feedback=el('p','stage10-feedback','');
 const help=el('p','','النسخ التلقائي يعمل بصورة مستقلة عبر GitHub Actions في مستودع خاص، بعد إعداد بيانات الاتصال الآمنة. تنزيل JSON لا يعني أن استعادة البيانات مفعلة تلقائيًا.');
 button.onclick=async()=>{
  if(!authorized||!session){feedback.textContent='يرجى تسجيل دخول المدير.';return}
  button.disabled=true;let total=0;
  const payload={format:'manahel-public-business-backup',version:1,created_at:new Date().toISOString(),tables:{},counts:{}};
  try{
   for(const table of stage10Tables){
    let rows=[],offset=0;
    while(true){
     const {data,error}=await db.from(table).select('*').range(offset,offset+499);
     if(error)throw new Error('تعذر قراءة جدول '+table+': '+error.message);
     const page=data||[];rows.push(...page);offset+=page.length;
     feedback.textContent='جارٍ نسخ '+table+' — '+rows.length+' سجل';
     if(page.length<500)break;
     if(offset>500000)throw new Error('تم إيقاف التصدير بسبب تجاوز الحد الآمن للسجلات.');
    }
    payload.tables[table]=rows;payload.counts[table]=rows.length;total+=rows.length;
   }
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='manahel-manual-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   feedback.textContent='تم تجهيز نسخة '+total+' سجل. تأكد من ظهور الملف في التنزيلات واحفظه في مكان خاص.';
  }catch(err){feedback.textContent='لم تكتمل النسخة، ولم يتم تنزيل ملف جزئي: '+err.message}
  finally{button.disabled=false}
 };
 root.append(button,feedback,help);
 const target=$('manahelReportsSection')||$('manahelDealsSection')||$('manahelAdminContent');target?.insertAdjacentElement('afterend',root);
}

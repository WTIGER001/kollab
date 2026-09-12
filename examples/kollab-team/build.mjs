#!/usr/bin/env node
// Deterministic content generation; no server, account, or network access.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const requireFrontend = createRequire(path.join(root, 'frontend/package.json'));
const { marked } = await import(pathToFileURL(requireFrontend.resolve('marked')).href);
const deckManifest=JSON.parse(fs.readFileSync(path.join(here,'generated/deck-manifest.json')));
for(const [file,expected] of Object.entries(deckManifest)){if(crypto.createHash('sha256').update(fs.readFileSync(path.join(here,file))).digest('hex')!==expected)throw Error(`Stale deck source or output: ${file}; run build-slides.mjs.`);}
const catalog = JSON.parse(fs.readFileSync(path.join(here, 'catalog.json')));
const generated = path.join(here, 'generated');
fs.mkdirSync(generated, { recursive: true });
const stamp = '2026-09-12T12:00:00Z';
const userID = 'kollab-demo-admin';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export function id(key) {
  const bytes = crypto.createHash('sha256').update(`kollab-handbook-v1:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
const text = value => ({ type:'text', text:value });
const p = value => ({type:'paragraph', ...(value ? {content:[text(value)]} : {})});
const macro = (type,config={}) => ({type:'macroBlock',attrs:{type,config}});
const callout = (title, value, type='note') => ({type:'calloutPanel',attrs:{type,title},content:[p(value)]});
const pages=[]; const sourceMap=new Map(); const sourceHashes={};
function read(relative) {
  const value=fs.readFileSync(path.join(root,relative),'utf8'); sourceHashes[relative]=hash(value); return value;
}
function add(key, project, parent, markdown, source, tags=['handbook']) {
  if(pages.some(x=>x.key===key)) throw Error(`Duplicate page key ${key}`);
  const title = markdown.match(/^# (.+)$/m)?.[1] ?? key;
  const page={key,project,parent,title,markdown,source,tags}; pages.push(page);
  if(source) sourceMap.set(source,page);
  return page;
}
const authored=[
 ['welcome',null,null],['maintenance',null,'welcome'],
 ['features-home','features',null],['technical-home','technical',null],['training-home','training',null],
 ['authoring-demo','features','features-home'],['knowledge-directory','features','features-home'],
 ['reuse-demo','features','features-home'],['collaboration-demo','features','features-home'],
 ['planning-demo','features','features-home'],['integrations-demo','features','features-home'],
 ['architecture','technical','technical-home'],['document-model','technical','technical-home'],['consistency','technical','technical-home'],
 ['training-materials','training','training-home'],['workshop-authoring','training','training-home'],
 ['workshop-recovery','training','training-home'],['workshop-technical','training','training-home'],['assessment','training','training-home']
];
for(const [key,project,parent] of authored) {
  const source=`examples/kollab-team/pages/${key}.md`;
  add(key,project,parent,read(source),source,['handbook', project ?? 'orientation', key.includes('demo')?'demonstration':'guide']);
}
for(const group of catalog.referenceGroups) {
  add(group.key,group.project,`${group.project}-home`,`# ${group.title}\n\nThis chapter collects the maintained repository references for ${group.title.toLowerCase()}. Open a child page for focused instructions and design details.\n\n\`\`\`kollab\n${JSON.stringify(macro('children-display',{depth:'all',displayType:'titles',sortBy:'title'}))}\n\`\`\``,null,[group.project,'reference']);
  for(const source of group.files) {
    const key=`ref-${source.replace(/\.md$/,'').replaceAll('/','-')}`;
    add(key,group.project,group.key,read(source),source,[group.project,'reference',group.key.split('-').at(-1)]);
  }
}
const byKey=new Map(pages.map(x=>[x.key,x]));
function url(key) {
  const page=byKey.get(key); if(!page)throw Error(`Unknown page: ${key}`);
  const base=`/teams/${id('team:kollab')}`;
  return `${base}${page.project?`/p/${id(`project:${page.project}`)}`:''}/docs/${id(`page:${key}`)}`;
}
const assetDefs=[
 {key:'cover',source:'assets/course-cover.png',name:'Course cover.png',mime:'image/png',page:'training-materials'},
 {key:'pptx',source:'assets/Kollab Capabilities.pptx',name:'Kollab Capabilities.pptx',mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation',page:'training-materials'},
 {key:'instructor',source:'generated/instructor-guide.md',name:'Instructor guide.md',mime:'text/markdown',page:'training-materials'},
 {key:'catalog',source:'catalog.json',name:'Handbook catalog.json',mime:'application/json',page:'maintenance'}
];
function resolveDeep(value) {
  if(typeof value==='string') {
    if(value==='image:cover')return id('image:cover');
    if(value==='image-url:cover')return `/api/images/${id('image:cover')}/O`;
    if(value.startsWith('page:')) return url(value.slice(5));
    if(value.startsWith('id:')) {if(!byKey.has(value.slice(3)))throw Error(`Unknown ID: ${value}`); return id(`page:${value.slice(3)}`);}
    if(value.startsWith('asset:')) {if(!assetDefs.some(x=>x.key===value.slice(6)))throw Error(`Unknown asset ${value}`);return id(value);}
    return value;
  }
  if(Array.isArray(value))return value.map(resolveDeep);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveDeep(v)]));
  return value;
}
function linkTarget(href,source) {
  if(href.startsWith('page:'))return url(href.slice(5));
  if(/^https?:|^mailto:/.test(href))return href;
  if(href.startsWith('#'))return null; // No invented heading IDs.
  let local=decodeURIComponent(href.split('#')[0]);
  if(local.startsWith('file:'))return null;
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(source??''),local));
  return sourceMap.has(resolved)?url(sourceMap.get(resolved).key):null;
}
function inline(tokens=[],source,marks=[]) {
  return tokens.flatMap(t=>{
    const child=(more=[])=>inline(t.tokens??[{type:'text',text:t.text??''}],source,[...marks,...more]);
    switch(t.type){
      case 'strong':return child([{type:'bold'}]);
      case 'em':return child([{type:'italic'}]);
      case 'del':return child([{type:'strike'}]);
      case 'link': {const href=linkTarget(t.href,source);return child(href?[{type:'link',attrs:{href,target:href.startsWith('/')?'_self':'_blank',rel:'noopener noreferrer'}}]:[]);}
      case 'codespan':return [{...text(t.text),marks:marks.some(m=>m.type==='link')?marks:[{type:'code'}]}];
      case 'br':return [{type:'hardBreak'}];
      case 'image':return [text(`[Image reference: ${t.text || t.href}]`)];
      case 'html':return t.text.replace(/<[^>]*>/g,'').trim()?[text(t.text.replace(/<[^>]*>/g,''))]:[];
      case 'escape':case 'text':
        if(t.tokens)return child();
        return t.text?[{...text(t.text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')), ...(marks.length?{marks}: {})}]:[];
      default:return t.text?[text(t.text)]:[];
    }
  });
}
function blocks(tokens,source) {
  return tokens.flatMap(t=>{
    switch(t.type){
      case 'space':case 'checkbox':return [];
      case 'heading':return [{type:'heading',attrs:{level:Math.min(t.depth,6)},content:inline(t.tokens,source)}];
      case 'paragraph':case 'text':return [{type:'paragraph',content:inline(t.tokens??[{type:'text',text:t.text}],source)}];
      case 'hr':return [{type:'horizontalRule'}];
      case 'code':
        if(t.lang==='kollab')return [resolveDeep(JSON.parse(t.text))];
        if(t.lang==='mermaid')return [macro('mermaid',{code:'---\nconfig:\n  htmlLabels: false\n  flowchart:\n    htmlLabels: false\n---\n'+t.text,theme:'auto'})];
        return [{type:'codeBlock',attrs:{language:t.lang||null},...(t.text?{content:[text(t.text)]}:{})}];
      case 'blockquote': {
        const nodes=blocks(t.tokens,source); const match=t.text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);
        if(match){const cleaned=blocks(marked.lexer(t.text.slice(match[0].length)),source); return [{type:'calloutPanel',attrs:{type:{NOTE:'note',TIP:'tip',IMPORTANT:'info',WARNING:'warning',CAUTION:'warning'}[match[1]],title:match[1]},content:cleaned.length?cleaned:[p('')]}];}
        return [{type:'blockquote',content:nodes.length?nodes:[p('')]}];
      }
      case 'list': {
        // Preserve mixed task/ordinary lists by emitting contiguous list groups.
        const groups=[];
        for(const item of t.items){
          const type=item.task?'taskList':t.ordered?'orderedList':'bulletList';
          let group=groups.at(-1);if(!group||group.type!==type){group={type,...(type==='orderedList'?{attrs:{start:t.start||1}}:{}),content:[]};groups.push(group);}
          let content=blocks(item.tokens,source);if(content[0]?.type!=='paragraph')content.unshift(p(''));
          group.content.push({type:item.task?'taskItem':'listItem',...(item.task?{attrs:{checked:!!item.checked}}:{}),content});
        }
        return groups;
      }
      case 'table':return [{type:'table',content:[{type:'tableRow',content:t.header.map(cell=>({type:'tableHeader',content:[{type:'paragraph',content:inline(cell.tokens,source)}]}))},...t.rows.map(row=>({type:'tableRow',content:row.map(cell=>({type:'tableCell',content:[{type:'paragraph',content:inline(cell.tokens,source)}]}))}))]}];
      case 'html': {const cleaned=t.text.replace(/<[^>]*>/g,'').trim();return cleaned?[p(cleaned)]:[];}
      case 'def':return [];
      default:throw Error(`Unsupported Markdown token ${t.type} in ${source}`);
    }
  });
}
const tables={teams:[{id:id('team:kollab'),name:catalog.team.name,abbreviation:catalog.team.abbreviation,description:catalog.team.description,logo_url:''}],projects:catalog.projects.map(x=>({id:id(`project:${x.key}`),name:x.name,team_id:id('team:kollab'),abbreviation:x.abbreviation,description:x.description,logo_url:''})),team_members:[{team_id:id('team:kollab'),user_id:userID}],documents:[],document_versions:[],document_properties:[],document_reviews:[],tags:[],document_tags:[],comments:[],tasks:[],attachments:[],templates:[],images:[],library_images:[]};
const counts={}; const macroPages={}; const links=[];
function walk(node,fn){fn(node);for(const child of node.content??[])walk(child,fn);}
for(const page of pages){
  const nodes=blocks(marked.lexer(page.markdown),page.source);
  if(nodes[0]?.type==='heading')nodes.shift(); // The editor header already displays the title.
  const area=page.project==='technical'?'Engineering':page.project==='training'?'Training':'Product';
  const props=[{key:'Area',value:area,type:'text'},{key:'Audience',value:page.project==='technical'?'Developers and operators':'Authors and reviewers',type:'text'},{key:'Availability',value:page.tags.includes('reference')?'Reference; see section status':'Demonstration',type:'text'}];
  const prefix=[macro('page-properties',{properties:props})];
  if(page.source?.startsWith('design/'))prefix.push(callout('Design reference', 'This page follows the repository design document. Some sections retain proposed or historical behavior. Check the curated Architecture walkthrough and current source code before treating a planned capability as available.'));
  if(page.source==='user_guide/editor_macros.md')prefix.push(callout('Current availability clarification','Draw.io loads its external diagrams.net editor. A design description of an offline canvas does not make that editor launch network-independent. Excalidraw is bundled; Mermaid diagrams are source-driven.','info'));
  const doc={type:'doc',content:[...prefix,...nodes,p(`Source: ${page.source??'examples/kollab-team/catalog.json'}`)]};
  walk(doc,n=>{
    const kind=n.type==='macroBlock'?`macro:${n.attrs.type}`:n.type;
    counts[kind]=(counts[kind]??0)+1;(macroPages[kind]??=new Set()).add(page.key);
    for(const m of n.marks??[])if(m.type==='link')links.push(m.attrs.href);
  });
  page.ast=doc;
  const docID=id(`page:${page.key}`);
  tables.documents.push({id:docID,title:page.title,content:JSON.stringify(doc),team_id:id('team:kollab'),project_id:page.project?id(`project:${page.project}`):null,parent_id:page.parent?id(`page:${page.parent}`):null,created_at:stamp,updated_at:stamp,created_by:userID,updated_by:userID,slug:`kollab-handbook-${page.key}`,classification:'internal',inheritance_broken:false});
  tables.document_versions.push({id:id(`version:${page.key}`),document_id:docID,content:JSON.stringify(doc),version_number:1,created_by:userID,change_summary:'Training baseline',created_at:stamp});
  for(const prop of props)tables.document_properties.push({document_id:docID,property_key:prop.key,property_value:prop.value,value_type:prop.type,updated_at:stamp});
  tables.document_reviews.push({document_id:docID,review_status:page.key==='collaboration-demo'?'in_review':'draft',next_review_at:null,updated_by:userID,updated_at:stamp});
  for(const tag of page.tags){const tagID=id(`tag:${tag}`);if(!tables.tags.some(x=>x.id===tagID))tables.tags.push({id:tagID,name:tag,description:'Kollab handbook category',color:'var(--primary-color)',created_at:stamp});tables.document_tags.push({document_id:docID,tag_id:tagID});}
}
const commentID=id('comment:question');
tables.comments.push({id:commentID,document_id:id('page:collaboration-demo'),parent_id:null,anchor_id:null,content:'Training example: Does changing an inline status also change the page review state?',created_by:userID,created_name:'Kollab Demo Administrator',created_at:stamp,updated_at:stamp},{id:id('comment:reply'),document_id:id('page:collaboration-demo'),parent_id:commentID,anchor_id:null,content:'Training example: No. The status is editor content; the content-review macro reads and updates separate lifecycle metadata.',created_by:userID,created_name:'Kollab Demo Administrator',created_at:stamp,updated_at:stamp});
tables.tasks.push({id:id('task:training-attachment'),document_id:id('page:collaboration-demo'),content:'Verify the training attachment and report whether it opens. @kollab-demo Example due date: ',assignee:'kollab-demo',due_date:'2026-09-19',completed:false,created_at:stamp,updated_at:stamp});
const templateDoc={type:'doc',content:[{type:'heading',attrs:{level:2},content:[text('Context')]},p('Describe the problem and who it affects.'),{type:'heading',attrs:{level:2},content:[text('Decision')]},p('State the selected approach and the reason.'),{type:'heading',attrs:{level:2},content:[text('Validation and recovery')]},p('Record meaningful checks and explain how to recover.') ]};
for(const [key,title,type,content] of [['decision','Technical decision','page',templateDoc],['validation','Validation note','block',{type:'doc',content:[callout('Validation','Describe the observable result and link the relevant evidence.','check')]}]])tables.templates.push({id:id(`template:${key}`),title,description:'Reusable starting content from the Kollab handbook.',content:JSON.stringify(content),scope:'team',template_type:type,team_id:id('team:kollab'),user_id:userID,created_at:stamp});
const assets=[];
for(const a of assetDefs){
 const filename=path.join(here,a.source);
 if(!fs.existsSync(filename))throw Error(`Missing asset ${a.source}; build the slides first.`);
 const bytes=fs.readFileSync(filename);const assetID=id(`asset:${a.key}`);const storageKey=`attachments/${assetID}_${a.name}`;
 tables.attachments.push({id:assetID,document_id:id(`page:${a.page}`),filename:a.name,mime_type:a.mime,file_size:bytes.length,storage_key:storageKey,uploaded_by:userID,uploaded_at:stamp});
 assets.push({source:a.source,storageKey,sha256:hash(bytes),size:bytes.length});
}
const cover=fs.readFileSync(path.join(here,'assets/course-cover.png'));
tables.images.push({id:id('image:cover'),filename:'Course cover.png',mime_type:'image/png',original_width:1280,original_height:720,created_at:stamp});
tables.library_images.push({id:id('library:cover'),image_id:id('image:cover'),display_name:'Kollab course cover',scope:'team',team_id:id('team:kollab'),project_id:null,user_id:userID,size_bytes:cover.length,created_at:stamp});
assets.push({source:'assets/course-cover.png',storageKey:`${id('image:cover')}_original.png`,sha256:hash(cover),size:cover.length});
const pageSummary=pages.map(x=>({key:x.key,id:id(`page:${x.key}`),project:x.project,title:x.title,parent:x.parent,url:url(x.key),source:x.source}));
const inventory=Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)).map(([type,count])=>({type,count,pages:[...macroPages[type]].sort()}));
sourceHashes['examples/kollab-team/catalog.json']=hash(fs.readFileSync(path.join(here,'catalog.json')));
sourceHashes['examples/kollab-team/build.mjs']=hash(fs.readFileSync(fileURLToPath(import.meta.url)));
sourceHashes['examples/kollab-team/slides.json']=hash(fs.readFileSync(path.join(here,'slides.json')));
const result={format:'kollab.showcase.content.v1',timestamp:stamp,admin:{id:userID,username:'kollab-demo',displayName:'Kollab Demo Administrator'},tables,assets,pages:pageSummary};
fs.writeFileSync(path.join(generated,'content.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(generated,'manifest.json'),JSON.stringify({format:result.format,timestamp:stamp,pageCount:pages.length,projects:catalog.projects.map(x=>x.name),nodeInventory:inventory,sourceHashes,assets,contentSha256:hash(JSON.stringify(result))},null,2)+'\n');
fs.writeFileSync(path.join(generated,'CONTENTS.md'),'# Generated handbook contents\n\n'+pageSummary.map(x=>`- ${x.project??'Team'}: **${x.title}** (\`${x.key}\`)`).join('\n')+'\n\n## Editor coverage\n\n| Node or macro | Instances |\n| --- | ---: |\n'+inventory.map(x=>`| ${x.type} | ${x.count} |`).join('\n')+'\n');
console.log(`Generated ${pages.length} pages, ${catalog.projects.length} projects, ${inventory.filter(x=>x.type.startsWith('macro:')).length} macro variants, ${tables.attachments.length} attachments and ${tables.images.length} library image.`);

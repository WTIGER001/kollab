#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const runtime=process.env.RUNTIME_NODE_MODULES;
const skill=process.env.PRESENTATIONS_SKILL_DIR;
if(!runtime||!skill||!process.env.RUNTIME_PYTHON)throw Error('Set RUNTIME_NODE_MODULES, PRESENTATIONS_SKILL_DIR, and RUNTIME_PYTHON to the installed presentation runtime.');
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const {resolvePresentationFont,finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const font=resolvePresentationFont();
const slides=JSON.parse(await fs.readFile(path.join(here,'slides.json'),'utf8'));
const work=path.join(here,'.build',`slides-${Date.now()}`);await fs.mkdir(work,{recursive:true});
const output=path.join(work,'output');await fs.mkdir(output,{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const colors={bg:'#F8F7F3',ink:'#232330',muted:'#555361',accent:'#6243B7',dark:'#252035',white:'#F8F7F3'};
function textbox(slide,content,x,y,w,h,size=30,color=colors.ink,bold=false){
 const s=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 s.text=content;s.text.style={typeface:font,fontSize:size,color,bold,autoFit:'none'};return s;
}
const tableOwners=[];
for(const [i,data] of slides.entries()){
 const s=p.slides.add();const dark=['cover','closing'].includes(data.kind);
 s.background.fill=dark?colors.dark:colors.bg;
 if(data.kind==='cover'){
  textbox(s,data.title,78,136,1110,120,100,colors.white,true);
  textbox(s,data.subtitle,82,294,1100,65,44,colors.white);
  textbox(s,data.body[0],84,459,940,90,28,'#DAD4E9');
 }else{
  const ink=dark?colors.white:colors.ink;
  textbox(s,data.title,74,58,1132,118,48,ink,true);
  if(data.kind==='comparison'){
   textbox(s,data.leftTitle,78,220,530,50,31,colors.accent,true);
   textbox(s,data.rightTitle,684,220,516,50,31,colors.accent,true);
   data.left.forEach((v,j)=>textbox(s,v,78,294+j*96,515,84,29));
   data.right.forEach((v,j)=>textbox(s,v,684,294+j*96,505,84,29));
  }else if(data.kind==='table'){
   tableOwners.push(i+1);const values=[data.headers,...data.rows];
   const table=s.tables.add({rows:values.length,columns:data.headers.length,left:76,top:212,width:1128,height:Math.min(382,values.length*74),values,columnTracks:data.headers.map(()=>({mode:'fr',value:1}))});
   table.borders.assign({fill:'#D9D5E2',width:1,style:'solid'});
   for(let r=0;r<values.length;r++)for(let c=0;c<data.headers.length;c++){
    const cell=table.getCell(r,c);cell.fill=r===0?colors.dark:colors.bg;
    cell.text.style={typeface:font,fontSize:r===0?25:25,color:r===0?colors.white:colors.ink,bold:r===0,autoFit:'none'};
   }
  }else if(data.kind==='code'){
   textbox(s,data.code,80,216,570,363,data.code.length>130?25:32,colors.accent);
   data.body.forEach((v,j)=>textbox(s,v,714,230+j*114,485,99,28));
  }else{
   const start=data.kind==='agenda'?215:240;
   (data.body??[]).forEach((v,j)=>{
    if(data.kind==='agenda')textbox(s,String(j+1).padStart(2,'0'),80,start+j*96,86,65,41,colors.accent,true);
    textbox(s,v,data.kind==='agenda'?184:82,start+j*(data.kind==='agenda'?96:105),data.kind==='agenda'?1010:1100,91,data.kind==='closing'?38:34,ink);
   });
  }
  if(data.demo)textbox(s,data.demo,80,633,1050,42,21,colors.accent);
 }
 textbox(s,String(i+1).padStart(2,'0'),1170,653,55,35,18,dark?'#DAD4E9':colors.muted);
 s.speakerNotes.textFrame.setText(`${data.notes}\n\nRepository sources:\n${data.sources.join('\n')}`);
}
const draft=path.join(work,'candidate.pptx');await (await PresentationFile.exportPptx(p)).save(draft);
const final=path.join(output,'Kollab Capabilities.pptx');
await finalizePresentation({workspaceDir:here,candidatePath:draft,finalPath:final,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit',...tableOwners.flatMap(n=>['--require-native-table-slide',String(n)])],requiredNativeTableOwnerSlides:tableOwners,fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(work,'validation.json')});
await fs.copyFile(final,path.join(here,'assets/Kollab Capabilities.pptx'));
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(work,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
await fs.copyFile(path.join(work,'slide-01.png'),path.join(here,'assets/course-cover.png'));
await fs.mkdir(path.join(here,'generated'),{recursive:true});
await fs.writeFile(path.join(here,'generated/instructor-guide.md'),'# Kollab capabilities — instructor guide\n\n'+slides.map((x,i)=>`## ${i+1}. ${x.title}\n\n${x.notes}\n\nSources: ${x.sources.map(s=>'`'+s+'`').join(', ')}\n`).join('\n'));
const digest=async file=>crypto.createHash('sha256').update(await fs.readFile(path.join(here,file))).digest('hex');
const provenance={};for(const name of ['slides.json','build-slides.mjs','assets/Kollab Capabilities.pptx','assets/course-cover.png','generated/instructor-guide.md'])provenance[name]=await digest(name);
await fs.writeFile(path.join(here,'generated/deck-manifest.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({slides:slides.length,font,pptx:path.join(here,'assets/Kollab Capabilities.pptx'),previews:work}));

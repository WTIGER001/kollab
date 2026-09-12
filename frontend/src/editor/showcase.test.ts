import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getSchema, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import { MacroBlock } from './extensions/MacroBlock';
import { CalloutPanel } from './extensions/CalloutPanel';
import { InlineStatus } from './extensions/InlineStatus';
import { InlineDate } from './extensions/InlineDate';
import { Details, DetailsSummary, DetailsContent } from './extensions/Details';
import { CardsGrid, CardItem, TabsContainer, TabItem } from './extensions/LayoutNodes';
import { LayoutSection } from './extensions/LayoutSection';
import { LayoutColumn } from './extensions/LayoutColumn';
import { Excerpt } from './extensions/Excerpt';
import { Mention } from './extensions/Mention';
import { NoFormatPanel } from './extensions/NoFormatPanel';
import { TableOfContents } from './extensions/TableOfContents';
import { CustomTableCell, CustomTableHeader } from './extensions/CustomTableExtensions';
import { CustomImage } from './extensions/CustomImage';

vi.mock('../components/MacroBlockView', () => ({ MacroBlockView: () => null }));
const directory=path.resolve(import.meta.dirname,'../../../examples/kollab-team');
const data=JSON.parse(fs.readFileSync(path.join(directory,'generated/content.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'generated/manifest.json'),'utf8'));
const schema=getSchema([StarterKit,TaskList,TaskItem,Table,TableRow,CustomTableCell,CustomTableHeader,MacroBlock,CalloutPanel,InlineStatus,InlineDate,Details,DetailsSummary,DetailsContent,CardsGrid,CardItem,TabsContainer,TabItem,LayoutSection,LayoutColumn,Excerpt,Mention,NoFormatPanel,TableOfContents,CustomImage]);
const docs=new Map<string,JSONContent>(data.tables.documents.map((d:{id:string;content:string})=>[d.id,JSON.parse(d.content)]));
function walk(node:JSONContent, visit:(node:JSONContent)=>void){visit(node);node.content?.forEach(child=>walk(child,visit));}

describe('maintained Kollab handbook',()=>{
 it('accepts every page and template in the real editor schema without dropping nodes',()=>{
  expect(docs.size).toBeGreaterThanOrEqual(50);
  for(const [id,doc] of docs){
   const loaded=schema.nodeFromJSON(doc);expect(()=>loaded.check(),id).not.toThrow();
   const before:string[]=[];const after:string[]=[];walk(doc,n=>{if(n.type!=='text')before.push(n.type??'');});walk(loaded.toJSON(),n=>{if(n.type!=='text')after.push(n.type??'');});expect(after,id).toEqual(before);
   const words=(value:JSONContent)=>{let result='';walk(value,n=>{if(n.text)result+=n.text;});return result;};expect(words(loaded.toJSON()),id).toBe(words(doc));
  }
  for(const row of data.tables.templates)expect(()=>schema.nodeFromJSON(JSON.parse(row.content)).check()).not.toThrow();
 });
 it('resolves page links, excerpts, attachments, hierarchy, and macro types',()=>{
  const urls=new Set(data.pages.map((p:{url:string})=>p.url));
  const attachments=new Map(data.tables.attachments.map((a:{id:string;document_id:string})=>[a.id,a.document_id]));
  const implementation=fs.readFileSync(path.resolve(import.meta.dirname,'../components/MacroBlockView.tsx'),'utf8');
  for(const row of data.tables.documents){
   if(row.parent_id)expect(docs.has(row.parent_id),row.title).toBe(true);
   walk(docs.get(row.id)!,node=>{
    for(const mark of node.marks??[])if(mark.type==='link'&&String(mark.attrs?.href).startsWith('/'))expect(urls.has(mark.attrs?.href),`${row.title}: ${mark.attrs?.href}`).toBe(true);
    if(node.type!=='macroBlock')return;
    const type=node.attrs?.type;expect(implementation.includes(`type === "${type}"`),`renderer: ${type}`).toBe(true);
    const c=node.attrs?.config??{};
    for(const key of ['primaryCtaUrl','secondaryCtaUrl'])if(c[key])expect(urls.has(c[key])).toBe(true);
    if(type==='single-attachment')expect(attachments.get(c.attachmentId)).toBe(row.id);
    if(type==='excerpt-include'){
     const source=docs.get(c.pageId);expect(source).toBeDefined();let found=false;
     walk(source!,n=>{if(n.type==='excerpt'&&n.attrs?.excerptId===c.excerptId)found=true;});expect(found,`excerpt ${c.excerptId}`).toBe(true);
    }
   });
  }
  expect(manifest.nodeInventory.filter((x:{type:string})=>x.type.startsWith('macro:')).length).toBeGreaterThanOrEqual(20);
 });
 it('parses every Mermaid diagram with the installed renderer',async()=>{
  const {default:mermaid}=await import('mermaid');mermaid.initialize({startOnLoad:false,securityLevel:'strict'});
  const failures:string[]=[];
  for(const [id,doc] of docs){const codes:string[]=[];walk(doc,n=>{if(n.type==='macroBlock'&&n.attrs?.type==='mermaid')codes.push(n.attrs.config.code);});for(const code of codes){try{await mermaid.parse(code);}catch(error){failures.push(`${data.tables.documents.find((row:{id:string})=>row.id===id).title}: ${String(error)}`);}}}
  expect(failures).toEqual([]);
 });
 it('keeps source and attachment hashes current',()=>{
  const root=path.resolve(directory,'../..');
  for(const [file,expected] of Object.entries(manifest.sourceHashes)){
   const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');expect(actual,`${file}: run build.mjs`).toBe(expected);
  }
  for(const asset of data.assets){const bytes=fs.readFileSync(path.join(directory,asset.source));expect(bytes.length).toBe(asset.size);expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);}
 });
 it('populates queryable properties and creates no credentials or external connections in source',()=>{
  for(const [id,doc] of docs)walk(doc,n=>{if(n.type==='macroBlock'&&n.attrs?.type==='page-properties')for(const prop of n.attrs.config.properties)expect(data.tables.document_properties).toContainEqual(expect.objectContaining({document_id:id,property_key:prop.key,property_value:prop.value}));});
  expect(data.tables.users).toBeUndefined();expect(data.tables.integrations).toBeUndefined();expect(data.tables.system_settings).toBeUndefined();
  expect(new Set(data.tables.projects.map((x:{name:string})=>x.name))).toEqual(new Set(['Features','Technical Implementation','Training & Workshops']));
 });
});

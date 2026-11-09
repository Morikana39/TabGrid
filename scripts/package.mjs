import { readFile, readdir, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url));
const destination=resolve(root,'dist/TabGrid');
const files=new Map();
async function add(name) {
    name=relative(root,resolve(root,name)).replaceAll('\\','/');
    if(name.startsWith('../'))throw Error(`Dependency leaves project: ${name}`);
    if(files.has(name))return;
    const data=await readFile(resolve(root,name));files.set(name,data);
    if(!['.js','.mjs','.css','.html'].includes(extname(name)))return;
    const text=data.toString();
    const patterns=extname(name)==='.css'?[/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g]:extname(name)==='.html'?[/\b(?:src|href)="([^"]+)"/g]:[/\b(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g];
    for(const pattern of patterns)for(const match of text.matchAll(pattern)){
        const ref=match[1];if(/^(?:data:|https?:|#|chrome)/.test(ref))continue;
        await add(resolve(dirname(resolve(root,name)),decodeURI(ref.split(/[?#]/)[0])));
    }
}
async function tree(path) { for(const item of await readdir(resolve(root,path),{withFileTypes:true}))if(!item.name.startsWith('.')){const name=`${path}/${item.name}`;if(item.isDirectory())await tree(name);else await add(name);} }
for(const entry of ['LICENSE','manifest.json','grid.html','background.js','preview-activity.js','tileIcon.png'])await add(entry);
for(const path of ['assets','_locales','locales'])await tree(path);
for(const notice of ['node_modules/sortablejs/LICENSE','node_modules/@formkit/auto-animate/LICENSE','node_modules/@liquid-dom/layout/LICENSE','docs/chrome-grid-interaction-research.md','docs/chrome-action-terminology.md'])await add(notice);
const readme=(await readFile(resolve(root,'README.md'),'utf8')).replace(/\r\n/g,'\n');
files.set('CREDITS.md',Buffer.from('# TabGrid — third-party credits\n\n'+readme.split('## Credits\n')[1].split('## Development')[0]));
// Rebuild only this generated package directory. Source and user data are untouched.
await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
for(const [name,data]of files){await mkdir(dirname(resolve(destination,name)),{recursive:true});await writeFile(resolve(destination,name),data);}
// Standard ZIP, using only Node built-ins; no platform-specific zip program needed.
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=data=>{let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
const local=[],central=[];let offset=0;
for(const [path,data]of [...files].sort(([a],[b])=>a.localeCompare(b))){
    const name=Buffer.from(path),compressed=deflateRawSync(data,{level:9}),crc=crc32(data);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
    local.push(header,name,compressed);
    const dir=Buffer.alloc(46);dir.writeUInt32LE(0x02014b50);dir.writeUInt16LE(20,4);header.copy(dir,6,4,30);dir.writeUInt32LE(offset,42);central.push(dir,name);offset+=header.length+name.length+compressed.length;
}
const index=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.size,8);end.writeUInt16LE(files.size,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
const archive=resolve(root,'dist/TabGrid.zip');await writeFile(archive,Buffer.concat([...local,index,end]));
const bytes=[...files.values()].reduce((n,b)=>n+b.length,0);
console.log(`${files.size} files · ${(bytes/1048576).toFixed(2)} MiB unpacked · ${((await stat(archive)).size/1048576).toFixed(2)} MiB ZIP\n${archive}`);

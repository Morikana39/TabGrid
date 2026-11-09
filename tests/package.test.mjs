import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, copyFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

test('release packaging preserves credits and project license with Unix or Windows line endings',async()=>{
    for(const newline of ['\n','\r\n']){
        const root=await mkdtemp(join(tmpdir(),'TabGrid package test '));
        try{
            async function write(name,text){const path=join(root,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,text);}
            for(const directory of ['assets','_locales','locales','scripts'])await mkdir(join(root,directory),{recursive:true});
            await copyFile(new URL('../scripts/package.mjs',import.meta.url),join(root,'scripts/package.mjs'));
            for(const name of ['grid.html','background.js','preview-activity.js','tileIcon.png','node_modules/sortablejs/LICENSE','node_modules/@formkit/auto-animate/LICENSE','node_modules/@liquid-dom/layout/LICENSE','docs/chrome-grid-interaction-research.md','docs/chrome-action-terminology.md'])await write(name,'fixture');
            await write('manifest.json','{}');await write('LICENSE','MIT License\nFixture copyright\n');
            await write('README.md',['# Fixture','','## Credits','','Original attribution.','','## Development','','Development-only content.'].join(newline));
            const result=spawnSync(process.execPath,[join(root,'scripts/package.mjs')],{encoding:'utf8'});
            assert.equal(result.status,0,result.stderr);
            assert.equal(await readFile(join(root,'dist/TabGrid/CREDITS.md'),'utf8'),'# TabGrid — third-party credits\n\n\nOriginal attribution.\n\n');
            assert.equal(await readFile(join(root,'dist/TabGrid/LICENSE'),'utf8'),'MIT License\nFixture copyright\n');
        }finally{await rm(root,{recursive:true,force:true});}
    }
});

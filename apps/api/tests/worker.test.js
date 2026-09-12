import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const req=(path,opts)=>new Request('https://example.test'+path,opts);

test('health',async()=>{const r=await worker.fetch(req('/api/health')); assert.equal(r.status,200); assert.equal((await r.json()).ok,true);});

test('autonomous selection respects threshold',async()=>{const r=await worker.fetch(req('/api/products')); const x=await r.json(); assert.ok(x.selected.every(p=>p.score>=80&&p.margin>=.25));});

test('financial transfer is blocked',async()=>{const r=await worker.fetch(req('/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'transfer_money'})})); assert.equal(r.status,403);});

test('dashboard exposes API-backed initial metrics',async()=>{const r=await worker.fetch(req('/api/dashboard')); const x=await r.json(); assert.equal(r.status,200); assert.equal(x.kpis.salesToday,0); assert.equal(x.kpis.revenueToday,0); assert.equal(x.kpis.leadsToday,0); assert.equal(x.pipeline.researched,4); assert.equal(x.pipeline.selected,2);});

test('finance exposes gateway state without fictitious balances',async()=>{const r=await worker.fetch(req('/api/finance')); const x=await r.json(); assert.equal(r.status,200); assert.equal(x.sandbox,true); assert.equal(x.available,0); assert.equal(x.pending,0);});

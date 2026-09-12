import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const req=(path,opts)=>new Request('https://example.test'+path,opts);

test('health',async()=>{const r=await worker.fetch(req('/api/health')); assert.equal(r.status,200); assert.equal((await r.json()).ok,true);});

test('products no longer contain hard-coded sample opportunities',async()=>{const r=await worker.fetch(req('/api/products')); const x=await r.json(); assert.equal(r.status,200); assert.deepEqual(x.products,[]); assert.deepEqual(x.selected,[]); assert.equal(x.source,'d1');});

test('dashboard reports empty real-data state instead of fictitious opportunities',async()=>{const r=await worker.fetch(req('/api/dashboard')); const x=await r.json(); assert.equal(r.status,200); assert.equal(x.kpis.salesToday,0); assert.equal(x.kpis.revenueToday,0); assert.equal(x.kpis.leadsToday,0); assert.equal(x.pipeline.researched,0); assert.equal(x.pipeline.selected,0);});

test('Mercado Livre ingestion requires real credentials and D1',async()=>{const r=await worker.fetch(req('/api/research/mercadolivre',{method:'POST'})); const x=await r.json(); assert.equal(r.status,503); assert.equal(x.ok,false); assert.ok(['MELI_ACCESS_TOKEN_NOT_CONFIGURED','D1_NOT_CONFIGURED'].includes(x.error));});

test('financial transfer is blocked',async()=>{const r=await worker.fetch(req('/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'transfer_money'})})); assert.equal(r.status,403);});

test('finance exposes gateway state without fictitious balances',async()=>{const r=await worker.fetch(req('/api/finance')); const x=await r.json(); assert.equal(r.status,200); assert.equal(x.sandbox,true); assert.equal(x.available,0); assert.equal(x.pending,0);});

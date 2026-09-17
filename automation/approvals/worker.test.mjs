import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, eventCard, validSignature } from './worker.mjs';
const input = {event_name:'Test <script>alert(1)</script>',event_date:'2026-09-24',event_location:'Cork',event_type:'show',event_description:'A & B',contact_name:'Private Name',_replyto:'private@example.com'};
test('Private submitter details do not enter public event data',()=> {
  const event = normalize(input);
  assert.ok(!JSON.stringify(event).includes('private@example'));
  assert.ok(!JSON.stringify(event).includes('Private Name'));
});
test('HTML is escaped before website publication',()=> {
  const card = eventCard('a'.repeat(64),normalize(input));
  assert.ok(!card.includes('<script>'));
  assert.ok(card.includes('&lt;script&gt;'));
  assert.ok(card.includes('A &amp; B'));
});
test('Reject impossible dates and script URLs',()=> {
  assert.throws(()=>normalize({...input,event_date:'2026-02-31'}));
  assert.throws(()=>normalize({...input,event_website:'javascript:alert(1)'}));
  assert.throws(()=>normalize({...input,event_type:'show" onclick="alert(1)'}));
});
test('Webhook signature rejects forgery and verifies authentic request',async()=> {
  const bytes=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',bytes.encode('secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes.encode('{}')))].map(x=>x.toString(16).padStart(2,'0')).join('');
  assert.equal(await validSignature('{}','sha256='+sig,'secret'),true);
  assert.equal(await validSignature('{"tampered":true}','sha256='+sig,'secret'),false);
  assert.equal(await validSignature('{}',null,'secret'),false);
});

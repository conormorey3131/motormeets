const enc = new TextEncoder();
const text = (value, max, required = false) => {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw new Error('Invalid field type');
  value = value.trim();
  if (value.length > max || (required && !value)) throw new Error('Invalid field length');
  return value;
};
export function normalize(input) {
  const event = {
    name: text(input.event_name, 180, true),
    date: text(input.event_date, 10, true),
    county: text(input.event_location, 40, true),
    venue: text(input.venue_name, 250),
    description: text(input.event_description, 3000, true),
    type: text(input.event_type, 20, true).toLowerCase(),
    url: text(input.event_website, 1000),
    listing: text(input.listing_type || 'free', 20)
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
      Number.isNaN(Date.parse(event.date)) || new Date(event.date).toISOString().slice(0,10) !== event.date)
    throw new Error('Invalid event date');
  if (!['rally','show','run','trackday','drift','ids','dr','bee','sd','other'].includes(event.type))
    throw new Error('Invalid event type');
  if (event.url) {
    const url = new URL(event.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid event URL');
  }
  // Contact details are deliberately not copied into public website records.
  return event;
}
export const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function eventCard(id, e) {
  const date = new Date(e.date + 'T12:00:00Z');
  const month = date.toLocaleString('en-IE', {month:'long', timeZone:'UTC'});
  const display = date.toLocaleDateString('en-IE', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  return `\n<!-- approved-submission:${id} -->\n<div class="event" data-type="${escapeHTML(e.type)}" data-location="${escapeHTML(e.county)}" data-month="${month}" data-date="${e.date}">
  <div class="event-date-circle ${escapeHTML(e.type)}">${date.getUTCDate()} ${month.slice(0,3)}</div>
  <h3>${escapeHTML(e.name)}</h3><p class="event-date">${display}</p>
  <p>Location: ${escapeHTML(e.venue || e.county)}</p>
  <p>Description: ${escapeHTML(e.description)}</p>
  ${e.url ? `<p>Website: <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer">Event Page</a></p>` : ''}
</div>\n`;
}
async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function validSignature(body, signature, secret) {
  if (!secret || !/^sha256=[0-9a-f]{64}$/.test(signature || '')) return false;
  const bytes = new Uint8Array(signature.slice(7).match(/../g).map(x=>parseInt(x,16)));
  const key = await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,bytes,enc.encode(body));
}
async function sendReview(row, env) {
  const e = JSON.parse(row.event_json);
  // The approved utility template must have six body variables and two quick replies.
  const body = [e.name,e.date,e.venue || e.county,e.description.slice(0,450),
    e.listing === 'free' ? 'Free listing' : `${e.listing}: payment NOT verified; approval adds a free calendar entry`, e.url || 'No organiser link supplied'];
  const payload = {messaging_product:'whatsapp',to:env.WA_RECIPIENT,type:'template',template:{
    name:env.WA_APPROVAL_TEMPLATE,language:{code:env.WA_LANGUAGE || 'en'},components:[
      {type:'body',parameters:body.map(t=>({type:'text',text:t.replace(/\s+/g,' ')}))},
      ...['approve','deny'].map((action,index)=>({type:'button',sub_type:'quick_reply',index:String(index),
        parameters:[{type:'payload',payload:`${action}:${row.id}`}]}))
    ]}};
  const r = await fetch(`https://graph.facebook.com/${env.WA_VERSION}/${env.WA_PHONE_ID}/messages`,{
    method:'POST',headers:{Authorization:`Bearer ${env.WA_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (!r.ok) throw new Error(`WhatsApp HTTP ${r.status}`);
  const result = await r.json();
  if (!result.messages?.length) throw new Error('WhatsApp did not acknowledge review');
  await env.DB.prepare('UPDATE submissions SET notified=1, last_error=NULL WHERE id=?').bind(row.id).run();
}
async function publish(row, env) {
  const e = JSON.parse(row.event_json);
  const url = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/index.html`;
  const headers = {Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','User-Agent':'MotorMeets-Approvals'};
  const response = await fetch(`${url}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,{headers});
  if (!response.ok) throw new Error(`GitHub read HTTP ${response.status}`);
  const file = await response.json();
  const source = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  const marker = `<div id="calendar-view" class="calendar-container">`;
  if (!source.includes(`<!-- approved-submission:${row.id} -->`)) {
    if (source.split(marker).length !== 2) throw new Error('Calendar insertion point changed');
    const updated = source.replace(marker,marker + eventCard(row.id,e));
    // Escape UTF-8 without spreading the full website into function arguments.
    let binary = '';
    for (const byte of enc.encode(updated)) binary += String.fromCharCode(byte);
    const write = await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({
      message:`Publish approved event ${row.id.slice(0,12)}`,content:btoa(binary),sha:file.sha,branch:env.GITHUB_BRANCH
    })});
    // Conflicting edits are retried from a fresh file by the scheduled job.
    if (!write.ok) throw new Error(`GitHub write HTTP ${write.status}`);
  }
  await env.DB.prepare("UPDATE submissions SET status='published',published_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=? AND status='approved'").bind(row.id).run();
}
export async function processQueue(env) {
  const rows = await env.DB.prepare("SELECT * FROM submissions WHERE (status='pending' AND notified=0) OR status='approved' ORDER BY created_at LIMIT 20").all();
  for (const row of rows.results) {
    try {
      if (row.status === 'pending') await sendReview(row, env);
      else await publish(row, env);
    } catch(error) {
      await env.DB.prepare('UPDATE submissions SET last_error=? WHERE id=?').bind(error.message,row.id).run();
      console.error('Submission processing failed',row.id,error.message);
    }
  }
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/webhooks/whatsapp' && request.method === 'GET') {
      if (env.META_VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === env.META_VERIFY_TOKEN && url.searchParams.get('hub.mode') === 'subscribe')
        return new Response(url.searchParams.get('hub.challenge'));
      return new Response('Forbidden',{status:403});
    }
    if (request.method !== 'POST') return new Response('Not found',{status:404});
    const body = await request.text();
    if (body.length > 64000) return new Response('Payload too large',{status:413});
    if (env.INTAKE_SECRET && url.pathname === `/intake/${env.INTAKE_SECRET}`) {
      let event;
      try { event = normalize(JSON.parse(body)); }
      catch { return new Response('Invalid event submission',{status:400}); }
      const id = await digest(JSON.stringify(event));
      await env.DB.prepare('INSERT OR IGNORE INTO submissions(id,event_json) VALUES (?,?)').bind(id,JSON.stringify(event)).run();
      ctx.waitUntil(processQueue(env));
      return Response.json({accepted:true});
    }
    if (url.pathname === '/webhooks/whatsapp') {
      if (!await validSignature(body,request.headers.get('x-hub-signature-256'),env.META_APP_SECRET))
        return new Response('Forbidden',{status:403});
      let data;
      try { data = JSON.parse(body); } catch {return new Response('Invalid JSON',{status:400});}
      for (const entry of data.entry || []) for (const change of entry.changes || []) {
        if (change.value?.metadata?.phone_number_id !== env.WA_PHONE_ID) continue;
        for (const msg of change.value?.messages || []) {
          if (msg.from !== env.WA_RECIPIENT.replace(/^\+/,'')) continue;
          const value = msg.button?.payload || msg.interactive?.button_reply?.id || '';
          const match = /^(approve|deny):([0-9a-f]{64})$/.exec(value);
          if (!match) continue;
          await env.DB.prepare("UPDATE submissions SET status=?,decided_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'")
            .bind(match[1] === 'approve' ? 'approved' : 'denied',match[2]).run();
        }
      }
      ctx.waitUntil(processQueue(env));
      return new Response('OK');
    }
    return new Response('Not found',{status:404});
  },
  async scheduled(_event, env, ctx) { ctx.waitUntil(processQueue(env)); }
};

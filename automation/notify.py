"""Send a pre-approved WhatsApp utility template when configured in GitHub secrets."""
import json
import os
import sys
import urllib.request

names = ['WA_TOKEN', 'WA_PHONE_ID', 'WA_RECIPIENT', 'WA_VERSION', 'WA_PACK_TEMPLATE']
missing = [n for n in names if not os.environ.get(n)]
if missing:
    print('WhatsApp delivery is not configured. The content pack is available in GitHub Releases.')
    sys.exit(0)
data = dict(messaging_product='whatsapp', to=os.environ['WA_RECIPIENT'], type='template',
            template=dict(name=os.environ['WA_PACK_TEMPLATE'], language=dict(code='en'),
                          components=[dict(type='body', parameters=[dict(type='text', text=sys.argv[1])])]))
req = urllib.request.Request(
    f"https://graph.facebook.com/{os.environ['WA_VERSION']}/{os.environ['WA_PHONE_ID']}/messages",
    data=json.dumps(data).encode(), headers={'Authorization': 'Bearer '+os.environ['WA_TOKEN'],
                                            'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=30) as response:
    result = json.load(response)
    if not result.get('messages'):
        raise RuntimeError('WhatsApp did not acknowledge the message.')
print('WhatsApp accepted the pack notification.')
